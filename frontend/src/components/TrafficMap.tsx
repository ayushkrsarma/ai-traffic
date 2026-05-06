import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Cpu, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

interface Vehicle {
  id: string;
  lane: 'North' | 'South' | 'East' | 'West';
  position: number;
  speed: number;
  type: 'car' | 'truck' | 'emergency';
  targetSpeed: number;
}

interface TrafficMapProps {
  lat?: number;
  lon?: number;
  city?: string;
  systemMode?: 'auto' | 'manual' | 'emergency';
  theme?: 'dark' | 'light';
  realDensity?: number;
  forceLane?: 'NS' | 'EW';
}

const LANES = ['North', 'South', 'East', 'West'] as const;
const STOP_LINE      = 35;
const INTERSECT_IN   = 28; // entering conflict zone
const INTERSECT_OUT  = 52; // cleared conflict zone
const MAX_SPEED      = 2.5;
const ACCEL          = 0.05;
const DECEL          = 0.15;
const MIN_PHASE_SECS = 3;   // minimum green before an early switch is allowed
const MAX_PHASE_SECS = 40;  // hard cap on a single phase

// Small direction badge shown on the compass HUD
const DirBadge = ({
  dir, go, count, arrow,
}: { dir: string; go: boolean; count: number; arrow: string }) => (
  <div className={cn(
    'flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-[10px] font-bold transition-all duration-300',
    go
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
      : 'bg-red-500/10 border-red-500/30 text-red-400',
  )}>
    <span className="text-[13px] leading-none">{arrow}</span>
    <span className="tracking-widest mt-0.5">{dir}</span>
    <span className={cn('text-[9px] font-black mt-0.5 tracking-widest', go ? 'text-emerald-400' : 'text-red-500')}>
      {go ? 'GO' : 'WAIT'}
    </span>
    {count > 0 && (
      <span className="text-[8px] text-zinc-400 font-mono">{count}▪</span>
    )}
  </div>
);

const TrafficMap = ({
  lat = 28.6139,
  lon = 77.2090,
  city = 'New Delhi',
  systemMode = 'auto',
  theme = 'dark',
  realDensity = 50,
  forceLane,
}: TrafficMapProps) => {
  const [vehicles,          setVehicles]          = useState<Vehicle[]>([]);
  const [activeLane,        setActiveLane]         = useState<'NS' | 'EW'>('NS');
  const [timer,             setTimer]              = useState(12);
  const [densities,         setDensities]          = useState({ North: 0, South: 0, East: 0, West: 0 });
  const [isEmergency,       setIsEmergency]        = useState(false);
  const [intersectionClear, setIntersectionClear]  = useState(true);

  const requestRef          = useRef<number>(0);
  const activeLaneRef       = useRef<'NS' | 'EW'>('NS');
  const densitiesRef        = useRef({ North: 0, South: 0, East: 0, West: 0 });
  const systemModeRef       = useRef(systemMode);
  const realDensityRef      = useRef(realDensity);
  const phaseStartRef       = useRef(12);        // timer value when phase began
  const intersectionClearRef = useRef(true);

  useEffect(() => { systemModeRef.current  = systemMode;  }, [systemMode]);
  useEffect(() => { realDensityRef.current = realDensity; }, [realDensity]);

  // ── Spawn vehicles ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const density   = realDensityRef.current;
      const mode      = systemModeRef.current;
      const spawnProb = mode === 'emergency' ? 0.85 : 0.15 + (density / 100) * 0.60;
      if (Math.random() > spawnProb) return;

      const lane      = LANES[Math.floor(Math.random() * LANES.length)];
      const typeRoll  = Math.random();
      const speedMult = mode === 'emergency' ? 1.5 : Math.max(0.35, 1 - density / 130);

      setVehicles(prev => [...prev, {
        id:          Math.random().toString(36).substr(2, 9),
        lane,
        position:    -10,
        speed:       0,
        type:        typeRoll > 0.98 ? 'emergency' : typeRoll > 0.85 ? 'truck' : 'car',
        targetSpeed: typeRoll > 0.98
          ? MAX_SPEED * 1.5
          : typeRoll > 0.85
            ? MAX_SPEED * 0.7 * speedMult
            : MAX_SPEED * speedMult,
      }]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // ── Mode transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (systemMode === 'emergency') {
      setIsEmergency(true);
      activeLaneRef.current = 'NS';
      setActiveLane('NS');
      setTimer(99);
    } else if (systemMode === 'auto') {
      setIsEmergency(false);
      phaseStartRef.current = 12;
      setTimer(12);
    } else {
      setIsEmergency(false);
    }
  }, [systemMode]);

  // ── Manual: apply forced lane ─────────────────────────────────────────────
  useEffect(() => {
    if (systemMode === 'manual' && forceLane) {
      activeLaneRef.current = forceLane;
      setActiveLane(forceLane);
      setTimer(99);
    }
  }, [forceLane, systemMode]);

  // ── 60 fps loop ───────────────────────────────────────────────────────────
  const animate = () => {
    setVehicles(prev => {
      const nextVehicles = prev.map(v => {
        const isNS    = v.lane === 'North' || v.lane === 'South';
        const isGreen = isNS ? activeLaneRef.current === 'NS' : activeLaneRef.current === 'EW';
        const ahead   = prev.find(o =>
          o.lane === v.lane && o.position > v.position && o.position - v.position < 12,
        );
        const distToStop  = STOP_LINE - v.position;
        const shouldStop  = !isGreen && distToStop > 0 && distToStop < 15;

        let newSpeed = v.speed;
        if (v.type === 'emergency') {
          newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        } else if (shouldStop || ahead) {
          newSpeed = Math.max(0, newSpeed - DECEL);
        } else {
          newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        }
        return { ...v, position: v.position + newSpeed, speed: newSpeed };
      }).filter(v => v.position < 110);

      // Queues: vehicles waiting before the stop line
      const newDensities = { North: 0, South: 0, East: 0, West: 0 };
      nextVehicles.forEach(v => { if (v.position < STOP_LINE) newDensities[v.lane]++; });
      densitiesRef.current = newDensities;
      setDensities(newDensities);

      // Intersection clear: no green-direction vehicles inside the conflict zone
      const curNS = activeLaneRef.current === 'NS';
      const inZone = nextVehicles.some(v => {
        const isGreenDir = curNS
          ? v.lane === 'North' || v.lane === 'South'
          : v.lane === 'East'  || v.lane === 'West';
        return isGreenDir && v.position >= INTERSECT_IN && v.position <= INTERSECT_OUT;
      });
      intersectionClearRef.current = !inZone;
      setIntersectionClear(!inZone);

      return nextVehicles;
    });

    // ── Signal control ────────────────────────────────────────────────────────
    setTimer(t => {
      if (systemModeRef.current !== 'auto') return t;

      const nd  = densitiesRef.current;
      const nsQ = nd.North + nd.South;
      const ewQ = nd.East  + nd.West;
      const cur = activeLaneRef.current;
      const oppositeQ    = cur === 'NS' ? ewQ   : nsQ;
      const phaseElapsed = phaseStartRef.current - t;   // seconds into current phase

      // ── Smart (gap-based) switch ─────────────────────────────────────────
      // Conditions: intersection is clear of green vehicles, opposite direction
      // has vehicles waiting, and the minimum phase time has been served.
      const gapSwitch =
        intersectionClearRef.current &&
        oppositeQ >= 1 &&
        phaseElapsed >= MIN_PHASE_SECS;

      // Hard switch when phase timer expires
      const forceSwitch = t <= 0.1;

      if (!gapSwitch && !forceSwitch) return t - 0.016;

      // ── Execute switch ───────────────────────────────────────────────────
      const nextLane    = cur === 'NS' ? 'EW' : 'NS';
      activeLaneRef.current = nextLane;
      setActiveLane(nextLane);

      // Give the next direction green time proportional to its queue size
      const nextQ    = nextLane === 'EW' ? ewQ : nsQ;
      const nextPhase = Math.max(MIN_PHASE_SECS + 2, Math.min(MAX_PHASE_SECS, nextQ * 4));
      phaseStartRef.current = nextPhase;
      return nextPhase;
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const modeLabel = isEmergency ? 'EMERGENCY' : systemMode === 'manual' ? 'MANUAL' : 'AI OPTIMIZE';
  const modeColor = isEmergency ? 'text-red-500' : systemMode === 'manual' ? 'text-amber-400' : 'text-blue-400';
  const modeBorder = isEmergency
    ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
    : systemMode === 'manual'
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-blue-500/10 border-blue-500/20';

  return (
    <div className={cn(
      'relative w-full h-[600px] rounded-3xl overflow-hidden border shadow-2xl',
      theme === 'dark' ? 'bg-[#0a0a0c] border-white/5' : 'bg-zinc-100 border-zinc-200',
    )}>

      {/* ── Compass direction HUD ────────────────────────────────────────── */}
      <div className="absolute top-6 left-6 z-30">
        <div className="grid grid-cols-3 gap-1.5 w-36">
          {/* Row 1: _, N, _ */}
          <div />
          <DirBadge dir="N" go={activeLane === 'NS'} count={densities.North} arrow="↑" />
          <div />
          {/* Row 2: W, intersection dot, E */}
          <DirBadge dir="W" go={activeLane === 'EW'} count={densities.West} arrow="←" />
          <div className={cn(
            'flex items-center justify-center rounded-lg border text-[9px] font-black transition-all duration-300',
            intersectionClear
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400',
          )}>
            {intersectionClear ? 'CLR' : 'OCC'}
          </div>
          <DirBadge dir="E" go={activeLane === 'EW'} count={densities.East} arrow="→" />
          {/* Row 3: _, S, _ */}
          <div />
          <DirBadge dir="S" go={activeLane === 'NS'} count={densities.South} arrow="↓" />
          <div />
        </div>
      </div>

      {/* ── Timer / mode badge ────────────────────────────────────────────── */}
      <div className="absolute top-6 right-6 z-30">
        <div className={`px-6 py-4 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${modeBorder}`}>
          <div className="flex items-center gap-3">
            {isEmergency
              ? <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              : <Cpu className={`w-5 h-5 ${modeColor} animate-pulse`} />}
            <span className={`text-xs font-black uppercase tracking-tighter ${modeColor}`}>{modeLabel}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-mono font-black text-white">
              {Math.ceil(timer).toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-zinc-500 font-bold">
              {systemMode === 'manual' ? 'HELD' : 'SEC'}
            </span>
          </div>
          {systemMode === 'auto' && (
            <div className={cn(
              'mt-1 text-[9px] font-bold uppercase tracking-widest',
              intersectionClear ? 'text-emerald-400' : 'text-amber-400',
            )}>
              {intersectionClear ? '● Intersection clear' : '● Vehicles in zone'}
            </div>
          )}
        </div>
      </div>

      {/* ── Road background ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <div className={cn('w-full h-40 relative', theme === 'dark' ? 'bg-[#151518]' : 'bg-zinc-300')}>
          <div className={cn('absolute top-1/2 w-full h-px border-t-2 border-dashed -translate-y-1/2', theme === 'dark' ? 'border-zinc-700' : 'border-zinc-400')} />
        </div>
        <div className={cn('absolute w-40 h-full', theme === 'dark' ? 'bg-[#151518]' : 'bg-zinc-300')}>
          <div className={cn('absolute left-1/2 h-full w-px border-l-2 border-dashed -translate-x-1/2', theme === 'dark' ? 'border-zinc-700' : 'border-zinc-400')} />
        </div>
        <div className={cn('absolute w-40 h-40 border-4 z-10', theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-400/50')} />
      </div>

      {/* ── Traffic signals ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { cls: 'absolute top-[28%] left-1/2 -translate-x-1/2', go: activeLane === 'NS' },
          { cls: 'absolute bottom-[28%] left-1/2 -translate-x-1/2', go: activeLane === 'NS' },
          { cls: 'absolute right-[28%] top-1/2 -translate-y-1/2', go: activeLane === 'EW' },
          { cls: 'absolute left-[28%] top-1/2 -translate-y-1/2', go: activeLane === 'EW' },
        ].map((s, i) => (
          <div key={i} className={`${s.cls} w-8 h-8 rounded-full border-2 transition-all duration-300 ${s.go ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
        ))}
      </div>

      {/* ── Vehicles ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {vehicles.map(vehicle => {
          let style: React.CSSProperties = {};
          if (vehicle.lane === 'North') style = { top:    `${vehicle.position}%`, left:   '46%' };
          if (vehicle.lane === 'South') style = { bottom: `${vehicle.position}%`, left:   '54%' };
          if (vehicle.lane === 'East')  style = { right:  `${vehicle.position}%`, top:    '46%' };
          if (vehicle.lane === 'West')  style = { left:   `${vehicle.position}%`, top:    '54%' };

          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', ...style, zIndex: 20,
                transform: `translate(-50%,-50%) ${
                  vehicle.lane === 'North' ? 'rotate(180deg)' :
                  vehicle.lane === 'East'  ? 'rotate(-90deg)' :
                  vehicle.lane === 'West'  ? 'rotate(90deg)'  : 'none'
                }`,
              }}
            >
              <div className={`p-1.5 rounded-md shadow-lg ${vehicle.type === 'emergency' ? 'bg-red-600 animate-pulse ring-4 ring-red-500/50' : vehicle.type === 'truck' ? 'bg-zinc-700' : 'bg-blue-600'}`}>
                <Car className={`w-5 h-5 text-white ${vehicle.type === 'emergency' ? 'animate-bounce' : ''}`} />
                {vehicle.type === 'emergency' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Bottom info bar ───────────────────────────────────────────────── */}
      <div className={cn(
        'absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-2xl backdrop-blur-md border font-mono text-[10px] uppercase tracking-widest',
        theme === 'dark' ? 'bg-black/40 border-white/5 text-zinc-500' : 'bg-white/80 border-zinc-200 text-zinc-500',
      )}>
        <span className="text-blue-400 font-bold">{city}</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LAT: {lat.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LON: {lon.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className={isEmergency ? 'text-red-400' : systemMode === 'manual' ? 'text-amber-400' : 'text-emerald-400'}>
          {isEmergency ? 'Emergency' : systemMode === 'manual' ? 'Manual Hold' : 'AI Active'}
        </span>
      </div>

      <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
    </div>
  );
};

export default TrafficMap;

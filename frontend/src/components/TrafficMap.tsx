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
  realDensity?: number;   // 0–100 from HERE API; drives spawn rate & speed
  forceLane?: 'NS' | 'EW'; // manual mode: which lane to hold green
}

const LANES = ['North', 'South', 'East', 'West'] as const;
const STOP_LINE = 35;
const MAX_SPEED = 2.5;
const ACCEL = 0.05;
const DECEL = 0.15;

const TrafficMap = ({
  lat = 28.6139,
  lon = 77.2090,
  city = 'New Delhi',
  systemMode = 'auto',
  theme = 'dark',
  realDensity = 50,
  forceLane,
}: TrafficMapProps) => {
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [activeLane,  setActiveLane]  = useState<'NS' | 'EW'>('NS');
  const [timer,       setTimer]       = useState(30);
  const [densities,   setDensities]   = useState({ North: 0, South: 0, East: 0, West: 0 });
  const [isEmergency, setIsEmergency] = useState(false);

  const requestRef      = useRef<number>(0);
  const activeLaneRef   = useRef<'NS' | 'EW'>('NS');
  const densitiesRef    = useRef({ North: 0, South: 0, East: 0, West: 0 });
  const systemModeRef   = useRef(systemMode);
  const realDensityRef  = useRef(realDensity);

  useEffect(() => { systemModeRef.current  = systemMode;  }, [systemMode]);
  useEffect(() => { realDensityRef.current = realDensity; }, [realDensity]);

  // ── Spawn vehicles ────────────────────────────────────────────────────────
  // Spawn rate scales with real density (more congested = more vehicles queued)
  useEffect(() => {
    const interval = setInterval(() => {
      const density  = realDensityRef.current;
      const mode     = systemModeRef.current;

      // spawnProb: 0.15 at 0% density → 0.75 at 100%; boosted in emergency
      const spawnProb = mode === 'emergency'
        ? 0.85
        : 0.15 + (density / 100) * 0.60;

      if (Math.random() > spawnProb) return;

      const lane     = LANES[Math.floor(Math.random() * LANES.length)];
      const typeRoll = Math.random();

      // Vehicle speed scales inversely with real density (slower when congested)
      const speedMult = mode === 'emergency'
        ? 1.5
        : Math.max(0.35, 1 - density / 130);

      const newVehicle: Vehicle = {
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
      };
      setVehicles(prev => [...prev, newVehicle]);
    }, 800);
    return () => clearInterval(interval);
  }, []); // all values read via refs

  // ── Emergency / auto mode state ───────────────────────────────────────────
  useEffect(() => {
    if (systemMode === 'emergency') {
      setIsEmergency(true);
      activeLaneRef.current = 'NS';
      setActiveLane('NS');
      setTimer(99);
    } else {
      setIsEmergency(false);
    }
  }, [systemMode]);

  // ── Manual mode: apply forced lane ───────────────────────────────────────
  useEffect(() => {
    if (systemMode === 'manual' && forceLane) {
      activeLaneRef.current = forceLane;
      setActiveLane(forceLane);
      setTimer(99); // hold until user changes it
    }
  }, [forceLane, systemMode]);

  // ── 60 fps animation loop ─────────────────────────────────────────────────
  const animate = () => {
    setVehicles(prev => {
      const nextVehicles = prev.map(v => {
        const isNS   = v.lane === 'North' || v.lane === 'South';
        const isGreen = isNS ? activeLaneRef.current === 'NS' : activeLaneRef.current === 'EW';

        let newSpeed    = v.speed;
        const ahead     = prev.find(o => o.lane === v.lane && o.position > v.position && o.position - v.position < 12);
        const distToStop = STOP_LINE - v.position;
        const shouldStop = !isGreen && distToStop > 0 && distToStop < 15;

        if (v.type === 'emergency') {
          newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        } else if (shouldStop || ahead) {
          newSpeed = Math.max(0, newSpeed - DECEL);
        } else {
          newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        }

        return { ...v, position: v.position + newSpeed, speed: newSpeed };
      }).filter(v => v.position < 110);

      const newDensities = { North: 0, South: 0, East: 0, West: 0 };
      nextVehicles.forEach(v => { if (v.position < STOP_LINE) newDensities[v.lane]++; });
      densitiesRef.current = newDensities;
      setDensities(newDensities);

      return nextVehicles;
    });

    // Auto: adapt signal phase to simulated queue lengths (AI optimisation)
    // Manual / Emergency: timer is held — don't auto-switch
    setTimer(t => {
      if (systemModeRef.current !== 'auto') return t;
      if (t > 0.1) return t - 0.016;

      const nsDensity = densitiesRef.current.North + densitiesRef.current.South;
      const ewDensity = densitiesRef.current.East  + densitiesRef.current.West;
      const nextLane  = activeLaneRef.current === 'NS' ? 'EW' : 'NS';
      activeLaneRef.current = nextLane;
      setActiveLane(nextLane);
      return nextLane === 'EW'
        ? Math.max(10, Math.min(40, ewDensity * 5))
        : Math.max(10, Math.min(40, nsDensity * 5));
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className={cn("relative w-full h-[600px] rounded-3xl overflow-hidden border shadow-2xl", theme === 'dark' ? "bg-[#0a0a0c] border-white/5" : "bg-zinc-100 border-zinc-200")}>

      {/* Corridor HUD */}
      <div className="absolute top-6 left-6 z-30 space-y-3">
        {(['NS', 'EW'] as const).map(dir => {
          const active = activeLane === dir;
          const count  = dir === 'NS'
            ? densities.North + densities.South
            : densities.East  + densities.West;
          return (
            <div key={dir} className={`flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md border ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-zinc-700'}`} />
              <span className="text-xs font-bold uppercase tracking-widest">{dir === 'NS' ? 'N-S' : 'E-W'} CORRIDOR</span>
              <span className="text-[10px] opacity-50 ml-auto font-mono">DENSITY: {count}</span>
            </div>
          );
        })}
      </div>

      {/* Timer / mode badge */}
      <div className="absolute top-6 right-6 z-30">
        <div className={`px-6 py-4 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${isEmergency ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : systemMode === 'manual' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <div className="flex items-center gap-3">
            {isEmergency
              ? <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              : <Cpu className={`w-5 h-5 ${systemMode === 'manual' ? 'text-amber-400' : 'text-blue-400'} animate-pulse`} />
            }
            <span className={`text-xs font-black uppercase tracking-tighter ${isEmergency ? 'text-red-500' : systemMode === 'manual' ? 'text-amber-400' : 'text-blue-400'}`}>
              {isEmergency ? 'EMERGENCY PREEMPTION' : systemMode === 'manual' ? 'MANUAL OVERRIDE' : 'AI ADAPTIVE SIGNAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-mono font-black text-white">{Math.ceil(timer).toString().padStart(2, '0')}</span>
            <span className="text-xs text-zinc-500 font-bold">{systemMode === 'manual' ? 'HELD' : 'SEC'}</span>
          </div>
        </div>
      </div>

      {/* Road background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <div className={cn("w-full h-40 relative", theme === 'dark' ? "bg-[#151518]" : "bg-zinc-300")}>
          <div className={cn("absolute top-1/2 w-full h-px border-t-2 border-dashed -translate-y-1/2", theme === 'dark' ? "border-zinc-700" : "border-zinc-400")} />
        </div>
        <div className={cn("absolute w-40 h-full", theme === 'dark' ? "bg-[#151518]" : "bg-zinc-300")}>
          <div className={cn("absolute left-1/2 h-full w-px border-l-2 border-dashed -translate-x-1/2", theme === 'dark' ? "border-zinc-700" : "border-zinc-400")} />
        </div>
        <div className={cn("absolute w-40 h-40 border-4 z-10", theme === 'dark' ? "border-zinc-800/50" : "border-zinc-400/50")} />
      </div>

      {/* Traffic signals */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { cls: 'absolute top-[28%] left-1/2 -translate-x-1/2', active: activeLane === 'NS' },
          { cls: 'absolute bottom-[28%] left-1/2 -translate-x-1/2', active: activeLane === 'NS' },
          { cls: 'absolute right-[28%] top-1/2 -translate-y-1/2', active: activeLane === 'EW' },
          { cls: 'absolute left-[28%] top-1/2 -translate-y-1/2', active: activeLane === 'EW' },
        ].map((s, i) => (
          <div key={i} className={`${s.cls} w-8 h-8 rounded-full border-2 ${s.active ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
        ))}
      </div>

      {/* Vehicles */}
      <AnimatePresence>
        {vehicles.map(vehicle => {
          let style: React.CSSProperties = {};
          if (vehicle.lane === 'North') style = { top: `${vehicle.position}%`, left: '46%' };
          if (vehicle.lane === 'South') style = { bottom: `${vehicle.position}%`, left: '54%' };
          if (vehicle.lane === 'East')  style = { right: `${vehicle.position}%`, top: '46%' };
          if (vehicle.lane === 'West')  style = { left: `${vehicle.position}%`, top: '54%' };

          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', ...style, zIndex: 20,
                transform: `translate(-50%, -50%) ${vehicle.lane === 'North' ? 'rotate(180deg)' : vehicle.lane === 'East' ? 'rotate(-90deg)' : vehicle.lane === 'West' ? 'rotate(90deg)' : 'none'}`
              }}
            >
              <div className={`p-1.5 rounded-md shadow-lg transition-colors duration-300 ${vehicle.type === 'emergency' ? 'bg-red-600 animate-pulse ring-4 ring-red-500/50' : vehicle.type === 'truck' ? 'bg-zinc-700' : 'bg-blue-600'}`}>
                <Car className={`w-5 h-5 text-white ${vehicle.type === 'emergency' ? 'animate-bounce' : ''}`} />
                {vehicle.type === 'emergency' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Bottom info bar */}
      <div className={cn("absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-2xl backdrop-blur-md border font-mono text-[10px] uppercase tracking-widest", theme === 'dark' ? "bg-black/40 border-white/5 text-zinc-500" : "bg-white/80 border-zinc-200 text-zinc-500")}>
        <span className="text-blue-400 font-bold">{city}</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LAT: {lat.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LON: {lon.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className={cn(isEmergency ? 'text-red-400' : systemMode === 'manual' ? 'text-amber-400' : 'text-emerald-400')}>
          {isEmergency ? 'Emergency' : systemMode === 'manual' ? 'Manual' : 'AI Active'}
        </span>
      </div>

      <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
    </div>
  );
};

export default TrafficMap;

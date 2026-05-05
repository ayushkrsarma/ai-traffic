import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Cpu, AlertTriangle, FastForward } from 'lucide-react';

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
}

const TrafficMap = ({ 
  lat = 28.6139, 
  lon = 77.2090, 
  city = 'New Delhi',
  systemMode = 'auto'
}: TrafficMapProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeLane, setActiveLane] = useState<'NS' | 'EW'>('NS');
  const [timer, setTimer] = useState(30);
  const [densities, setDensities] = useState({ North: 0, South: 0, East: 0, West: 0 });
  const [isEmergency, setIsEmergency] = useState(false);

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Constants
  const STOP_LINE = 35; // Position where vehicles stop
  const MAX_SPEED = 2.5;
  const ACCEL = 0.05;
  const DECEL = 0.15;

  // Simulation: Add random vehicles based on density
  useEffect(() => {
    const interval = setInterval(() => {
      const lanes: ('North' | 'South' | 'East' | 'West')[] = ['North', 'South', 'East', 'West'];
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      
      // Higher chance for N-S during peak
      if (Math.random() > 0.3) {
        const typeRoll = Math.random();
        const newVehicle: Vehicle = {
          id: Math.random().toString(36).substr(2, 9),
          lane,
          position: -10,
          speed: 0,
          type: typeRoll > 0.98 ? 'emergency' : (typeRoll > 0.85 ? 'truck' : 'car'),
          targetSpeed: typeRoll > 0.98 ? MAX_SPEED * 1.5 : (typeRoll > 0.85 ? MAX_SPEED * 0.7 : MAX_SPEED),
        };
        setVehicles(prev => [...prev, newVehicle]);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (systemMode === 'emergency') {
      setIsEmergency(true);
      setActiveLane('NS'); // Force one lane green for emergency
      setTimer(99);
    } else if (systemMode === 'auto') {
      setIsEmergency(false);
    }
  }, [systemMode]);

  // Handle signal timing
  useEffect(() => {
    if (systemMode === 'manual') return; // Pause timer in manual mode
    
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          setActiveLane(prev => prev === 'NS' ? 'EW' : 'NS');
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [systemMode]);

  const activeLaneRef = useRef<'NS' | 'EW'>('NS');
  const densitiesRef = useRef({ North: 0, South: 0, East: 0, West: 0 });

  // Realistic Movement Logic
  const animate = (time: number) => {
    setVehicles(prev => {
      const nextVehicles = prev.map(v => {
        const isNS = v.lane === 'North' || v.lane === 'South';
        const isGreen = isNS ? activeLaneRef.current === 'NS' : activeLaneRef.current === 'EW';
        
        let newSpeed = v.speed;
        let newPosition = v.position;

        // Detect vehicles ahead
        const ahead = prev.find(other => 
          other.lane === v.lane && 
          other.position > v.position && 
          other.position - v.position < 12
        );

        const distanceToStop = STOP_LINE - v.position;
        const shouldStop = !isGreen && distanceToStop > 0 && distanceToStop < 15;

        if (v.type === 'emergency') {
           newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        } else if (shouldStop || ahead) {
          newSpeed = Math.max(0, newSpeed - DECEL);
        } else {
          newSpeed = Math.min(v.targetSpeed, newSpeed + ACCEL);
        }

        newPosition += newSpeed;
        return { ...v, position: newPosition, speed: newSpeed };
      }).filter(v => v.position < 110);

      // Update densities ref
      const newDensities = { North: 0, South: 0, East: 0, West: 0 };
      nextVehicles.forEach(v => {
         if (v.position < STOP_LINE) newDensities[v.lane]++;
      });
      densitiesRef.current = newDensities;
      setDensities(newDensities);

      return nextVehicles;
    });
    
    setTimer(t => {
        if (t <= 0.1) {
            const nsDensity = densitiesRef.current.North + densitiesRef.current.South;
            const ewDensity = densitiesRef.current.East + densitiesRef.current.West;
            
            const nextLane = activeLaneRef.current === 'NS' ? 'EW' : 'NS';
            activeLaneRef.current = nextLane;
            setActiveLane(nextLane);

            return nextLane === 'EW' 
                ? Math.max(10, Math.min(40, ewDensity * 5))
                : Math.max(10, Math.min(40, nsDensity * 5));
        }
        return t - 0.016; // Approx 60fps
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Only start loop once on mount

  return (
    <div className="relative w-full h-[600px] bg-[#0a0a0c] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
      {/* HUD Overlays */}
      <div className="absolute top-6 left-6 z-30 space-y-3">
         <div className={`flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md border ${activeLane === 'NS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${activeLane === 'NS' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-zinc-700'}`} />
            <span className="text-xs font-bold uppercase tracking-widest">N-S CORRIDOR</span>
            <span className="text-[10px] opacity-50 ml-auto font-mono">DENSITY: {densities.North + densities.South}</span>
         </div>
         <div className={`flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md border ${activeLane === 'EW' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${activeLane === 'EW' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-zinc-700'}`} />
            <span className="text-xs font-bold uppercase tracking-widest">E-W CORRIDOR</span>
            <span className="text-[10px] opacity-50 ml-auto font-mono">DENSITY: {densities.East + densities.West}</span>
         </div>
      </div>

      <div className="absolute top-6 right-6 z-30">
        <div className={`px-6 py-4 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${isEmergency ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-blue-500/10 border-blue-500/20'}`}>
           <div className="flex items-center gap-3">
              {isEmergency ? (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              ) : (
                <Cpu className="w-5 h-5 text-blue-400 animate-pulse" />
              )}
              <span className={`text-xs font-black uppercase tracking-tighter ${isEmergency ? 'text-red-500' : 'text-blue-400'}`}>
                {isEmergency ? 'EMERGENCY PREEMPTION ACTIVE' : 'AI ADAPTIVE SIGNAL'}
              </span>
           </div>
           <div className="flex items-baseline gap-1 mt-1">
             <span className="text-4xl font-mono font-black text-white">{Math.ceil(timer).toString().padStart(2, '0')}</span>
             <span className="text-xs text-zinc-500 font-bold">SEC</span>
           </div>
        </div>
      </div>

      {/* Realistic Map Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
         <div className="w-full h-40 bg-[#151518] relative">
            <div className="absolute top-1/2 w-full h-px border-t-2 border-dashed border-zinc-700 -translate-y-1/2" />
         </div>
         <div className="absolute w-40 h-full bg-[#151518]">
            <div className="absolute left-1/2 h-full w-px border-l-2 border-dashed border-zinc-700 -translate-x-1/2" />
         </div>
         {/* Intersection Markings */}
         <div className="absolute w-40 h-40 border-4 border-zinc-800/50 z-10" />
      </div>

      {/* Traffic Signals Visuals */}
      <div className="absolute inset-0 pointer-events-none">
          {/* North Signal */}
          <div className={`absolute top-[28%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 ${activeLane === 'NS' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
          {/* South Signal */}
          <div className={`absolute bottom-[28%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 ${activeLane === 'NS' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
          {/* East Signal */}
          <div className={`absolute right-[28%] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 ${activeLane === 'EW' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
          {/* West Signal */}
          <div className={`absolute left-[28%] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 ${activeLane === 'EW' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_#10b981]' : 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]'}`} />
      </div>

      {/* Vehicles */}
      <AnimatePresence>
        {vehicles.map(vehicle => {
            let style = {};
            if (vehicle.lane === 'North') style = { top: `${vehicle.position}%`, left: '46%' };
            if (vehicle.lane === 'South') style = { bottom: `${vehicle.position}%`, left: '54%' };
            if (vehicle.lane === 'East') style = { right: `${vehicle.position}%`, top: '46%' };
            if (vehicle.lane === 'West') style = { left: `${vehicle.position}%`, top: '54%' };

            return (
            <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ 
                    position: 'absolute', 
                    ...style,
                    zIndex: 20,
                    transform: `translate(-50%, -50%) ${
                        vehicle.lane === 'North' ? 'rotate(180deg)' : 
                        vehicle.lane === 'East' ? 'rotate(-90deg)' : 
                        vehicle.lane === 'West' ? 'rotate(90deg)' : 'none'
                    }`
                }}
            >
                <div className={`
                p-1.5 rounded-md shadow-lg transition-colors duration-300
                ${vehicle.type === 'emergency' ? 'bg-red-600 animate-pulse ring-4 ring-red-500/50' : 
                    vehicle.type === 'truck' ? 'bg-zinc-700' : 'bg-blue-600'}
                `}>
                <Car className={`w-5 h-5 text-white ${vehicle.type === 'emergency' ? 'animate-bounce' : ''}`} />
                {vehicle.type === 'emergency' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                )}
                </div>
            </motion.div>
            );
        })}
      </AnimatePresence>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
        <span className="text-blue-400 font-bold">{city}</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LAT: {lat.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>LON: {lon.toFixed(4)}°</span>
        <div className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>Status: Nominal</span>
      </div>
      
      <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
    </div>
  );
};

export default TrafficMap;


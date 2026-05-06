import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';

interface TrafficChartProps {
  systemMode?: 'auto' | 'manual' | 'emergency';
  theme?: 'dark' | 'light';
}

const TrafficChart = ({ systemMode = 'auto', theme = 'dark' }: TrafficChartProps) => {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReal, setIsReal]   = useState(false);
  const dataRef               = useRef<any[]>([]);
  const liveStatsRef          = useRef<any>(null);
  const systemModeRef         = useRef(systemMode);

  useEffect(() => { systemModeRef.current = systemMode; }, [systemMode]);

  const axisColor = theme === 'dark' ? '#52525b' : '#a1a1aa';
  const gridColor = theme === 'dark' ? '#27272a' : '#e4e4e7';

  // Poll real stats from HERE (via backend)
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch('http://localhost:5000/api/monitor/stats');
        const d    = await res.json();
        liveStatsRef.current = d;
        setIsReal(d.source === 'here');
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  // Seed the chart with a baseline history
  useEffect(() => {
    const initial = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const time = new Date(now - i * 5000);
      initial.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        flow:  500 + Math.random() * 100,
        delay: 25  + Math.random() * 10,
        timestamp: now - i * 5000
      });
    }
    dataRef.current = initial;
    setData(initial);
    setLoading(false);
  }, []);

  // Drive chart from real HERE stats; fall back to simulation
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const now    = Date.now();
      const stats  = liveStatsRef.current;
      const mode   = systemModeRef.current;
      const last   = dataRef.current[dataRef.current.length - 1];

      let targetFlow: number;
      let targetDelay: number;

      if (stats?.source === 'here') {
        const density   = parseFloat(stats.trafficDensity)    || 50;  // 0-100
        const waitRatio = Math.min(60, parseFloat(stats.waitTimeReduction) || 30) / 60; // 0-1

        // Higher density → lower throughput; lower speed ratio → more delay
        const baseFlow  = (1 - density / 100) * 850;
        const baseDelay = (1 - waitRatio) * 90;

        if (mode === 'emergency') {
          targetFlow  = Math.min(980, baseFlow * 1.4);
          targetDelay = baseDelay * 0.15;
        } else if (mode === 'manual') {
          targetFlow  = baseFlow * 0.82;
          targetDelay = baseDelay * 1.35;
        } else {
          targetFlow  = baseFlow;
          targetDelay = baseDelay;
        }
      } else {
        // Fallback: pure simulation
        targetFlow = mode === 'emergency' ? 850 + Math.random() * 100
                   : mode === 'manual'    ? 380 + Math.random() * 100
                   :                        450 + Math.random() * 200;
        const df   = mode === 'emergency' ? 0.01 : mode === 'manual' ? 0.14 : 0.08;
        targetDelay = targetFlow * df;
      }

      const nextPoint = {
        time:      new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        flow:      Math.max(0, Math.min(1000, Math.round(last.flow  * 0.75 + targetFlow  * 0.25 + (Math.random() - 0.5) * 18))),
        delay:     Math.max(0,               Math.round(last.delay * 0.75 + targetDelay * 0.25 + (Math.random() - 0.5) * 4)),
        timestamp: now
      };

      const newData = [...dataRef.current.slice(1), nextPoint];
      dataRef.current = newData;
      setData(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]); // intentionally excludes systemMode — handled via ref

  if (loading) {
    return (
      <div className={cn("glass-card p-6 h-[300px] min-h-[300px] border flex flex-col justify-center items-center", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-zinc-500 text-sm">Connecting to HERE Traffic API…</p>
      </div>
    );
  }

  return (
    <div id="traffic-chart-container" className={cn("glass-card p-6 h-[300px] min-h-[300px] overflow-hidden border", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className={cn("font-semibold uppercase text-xs tracking-widest", theme === 'dark' ? "text-zinc-100" : "text-zinc-800")}>Live Telemetry Stream</h3>
            <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", isReal ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-zinc-500 border-zinc-700 bg-zinc-800/50")}>
              {isReal ? 'HERE' : 'SIM'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Real-time node throughput &amp; latency</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] text-zinc-400 font-mono">FLOW: {Math.round(data[data.length - 1]?.flow)} v/m</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] text-zinc-400 font-mono">DELAY: {Math.round(data[data.length - 1]?.delay)}s</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="colorDelay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="time" hide={true} />
            <YAxis stroke={axisColor} fontSize={9} tickLine={false} axisLine={false} domain={[0, 1000]} />
            <Tooltip
              contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(9,9,11,0.95)' : '#fff', border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', backdropFilter: 'blur(8px)' }}
              itemStyle={{ padding: '2px 0' }}
              labelStyle={{ color: '#71717a', marginBottom: '4px' }}
              cursor={{ stroke: axisColor, strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="flow"  stroke="#3b82f6" fillOpacity={1} fill="url(#colorFlow)"  strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="delay" stroke="#10b981" fillOpacity={1} fill="url(#colorDelay)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrafficChart;

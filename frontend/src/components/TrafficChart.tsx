import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrafficChartProps {
    systemMode?: 'auto' | 'manual' | 'emergency';
}

const TrafficChart = ({ systemMode = 'auto' }: TrafficChartProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef<any[]>([]);

  const axisColor = 'red';
  const gridColor = 'green';
  const theme = 'dark'

  // Initialize with some historical data
  useEffect(() => {
    const initData = () => {
      const initial = [];
      const now = Date.now();
      for (let i = 20; i >= 0; i--) {
        const time = new Date(now - i * 5000);
        initial.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          flow: 400 + Math.random() * 100,
          delay: 30 + Math.random() * 10,
          timestamp: now - i * 5000
        });
      }
      dataRef.current = initial;
      setData(initial);
      setLoading(false);
    };
    initData();
  }, []);

  // Simulation Logic: Update every 2 seconds
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastPoint = dataRef.current[dataRef.current.length - 1];
      
      // Calculate next values based on systemMode
      let targetFlow = 400 + Math.random() * 200;
      let delayFactor = 0.08;

      if (systemMode === 'emergency') {
        targetFlow = 800 + Math.random() * 100;
        delayFactor = 0.01;
      } else if (systemMode === 'manual') {
        delayFactor = 0.15;
      }

      const nextPoint = {
        time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        flow: Math.round(lastPoint.flow * 0.8 + targetFlow * 0.2), // Smooth transition
        delay: Math.round(targetFlow * delayFactor + Math.random() * 5),
        timestamp: now
      };

      const newData = [...dataRef.current.slice(1), nextPoint];
      dataRef.current = newData;
      setData(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, systemMode]);

  if (loading) {
    return (
      <div className="glass-card p-6 h-[300px] min-h-[300px] border-zinc-800 flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-zinc-500 text-sm">Initializing Simulator Stream...</p>
      </div>
    );
  }

  return (
    <div id="traffic-chart-container" className="glass-card p-6 h-[300px] min-h-[300px] border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-zinc-100 font-semibold uppercase text-xs tracking-widest">Live Telemetry Stream</h3>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Real-time Node throughput & Latency Simulator</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[10px] text-zinc-400 font-mono">FLOW: {Math.round(data[data.length-1]?.flow)} v/m</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] text-zinc-400 font-mono">DELAY: {Math.round(data[data.length-1]?.delay)}s</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDelay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="time" hide={true} />
            <YAxis 
              stroke={axisColor} 
              fontSize={9} 
              tickLine={false} 
              axisLine={false}
              domain={[0, 1000]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme === 'dark' ? 'rgba(9, 9, 11, 0.95)' : '#ffffff', 
                border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e2e8f0', 
                borderRadius: '8px', 
                fontSize: '10px',
                backdropFilter: 'blur(8px)'
              }}
              itemStyle={{ padding: '2px 0' }}
              labelStyle={{ color: '#71717a', marginBottom: '4px' }}
              cursor={{ stroke: axisColor, strokeWidth: 1 }}
            />
            <Area 
              type="monotone" 
              dataKey="flow" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorFlow)" 
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="delay" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorDelay)" 
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrafficChart;

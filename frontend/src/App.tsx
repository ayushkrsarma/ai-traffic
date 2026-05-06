import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Map as MapIcon, 
  Settings, 
  Bell,
  User,
  Zap, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Save,
  MapPin
} from 'lucide-react';
import TrafficMap from './components/TrafficMap';
import LiveTrafficMap from './components/LiveTrafficMap';
import StatusCard from './components/StatusCard';
import TrafficChart from './components/TrafficChart';
import { CITY_PRESETS, Intersection } from './utils/locations';
import { exportTrafficReport } from './utils/exportPdf';
import html2canvas from 'html2canvas';
import { cn } from './utils/cn';

function App() {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Monitor' | 'Settings'>('Overview');
  const [stats, setStats] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Selection helpers
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableIntersections, setAvailableIntersections] = useState<Intersection[]>([]);

  const handleExport = async () => {
    if (!stats || !appSettings) {
      alert('Data not loaded yet.');
      return;
    }

    setIsExporting(true);
    try {
      const chartElement = document.getElementById('traffic-chart-container');
      let chartImage = undefined;
      
      if (chartElement) {
        // Force element into view briefly to ensure it's rendered
        chartElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        
        // Use a timeout for html2canvas capture (5 seconds)
        const capturePromise = html2canvas(chartElement, {
            backgroundColor: '#09090b',
            scale: 2,
            logging: false,
            useCORS: true
        });

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Capture Timeout')), 5000)
        );

        try {
            const canvas = await Promise.race([capturePromise, timeoutPromise]) as HTMLCanvasElement;
            chartImage = canvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Chart capture timed out or failed, generating text-only report.', e);
        }
      }
      
      await exportTrafficReport(stats, appSettings.city, appSettings.lat, appSettings.lon, chartImage);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await fetch('http://localhost:5000/api/monitor/stats');
        const statsData = await statsRes.json();
        setStats(statsData);
      } catch (e) {
        console.error('Error polling stats:', e);
      }
    };

    const fetchData = async () => {
      try {
        await fetchStats();

        const settingsRes = await fetch('http://localhost:5000/api/settings');
        const settingsData = await settingsRes.json();
        setAppSettings(settingsData);
        setSelectedCity(settingsData.city);
        
        const cityData = CITY_PRESETS.find(c => c.name === settingsData.city);
        if (cityData) setAvailableIntersections(cityData.intersections);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const [systemMode, setSystemMode] = useState<'auto' | 'manual' | 'emergency'>('auto');
  const [manualActiveLane, setManualActiveLane] = useState<'NS' | 'EW'>('NS');
  const [notifications, setNotifications] = useState<any[]>([
    { id: Date.now(), time: new Date().toLocaleTimeString(), event: 'System Boot', detail: 'Intelligent Traffic Simulator Online', priority: 'low' }
  ]);

  const addNotification = (event: string, detail: string, priority: 'high' | 'medium' | 'low') => {
    const newNotif = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      event,
      detail,
      priority
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep last 10
  };

  const handleControl = async (mode: 'auto' | 'manual' | 'emergency') => {
    try {
      setSystemMode(mode);
      const labels = { auto: 'AI Optimization', manual: 'Manual Override', emergency: 'Emergency Priority' };
      const priorities = { auto: 'low', manual: 'medium', emergency: 'high' } as const;
      
      addNotification('Mode Switch', `System switched to ${labels[mode]}`, priorities[mode]);

      await fetch('http://localhost:5000/api/monitor/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    const cityData = CITY_PRESETS.find(c => c.name === cityName);
    if (cityData) {
      setAvailableIntersections(cityData.intersections);
      // Auto-select first intersection
      const first = cityData.intersections[0];
      setAppSettings({
        ...appSettings,
        city: cityName,
        lat: first.lat,
        lon: first.lon,
        intersectionId: first.id
      });
    } else {
      setAvailableIntersections([]);
      setAppSettings({...appSettings, city: cityName});
    }
  };

  const handleIntersectionChange = (intersectionName: string) => {
    const intersection = availableIntersections.find(i => i.name === intersectionName);
    if (intersection) {
      setAppSettings({
        ...appSettings,
        lat: intersection.lat,
        lon: intersection.lon,
        intersectionId: intersection.id
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings),
      });
      alert('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (loading || !stats || !appSettings) {
    return (
      <div className={cn(
        "flex h-screen items-center justify-center flex-col gap-4",
        theme === 'dark' ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"
      )}>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold tracking-widest uppercase animate-pulse">Initializing Simulator...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors duration-500",
      theme === 'dark' ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r flex flex-col transition-colors",
        theme === 'dark' ? "border-zinc-800 bg-zinc-900/30" : "border-zinc-200 bg-white"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Intelligent <br/><span className="text-blue-500">Traffic Simulator</span></h1>
          </div>
        </div>

        <nav className="flex-grow px-4 space-y-1">
          <NavItem 
            icon={LayoutDashboard} 
            label="Overview" 
            active={activeTab === 'Overview'} 
            onClick={() => setActiveTab('Overview')}
            theme={theme}
          />
          <NavItem 
            icon={MapIcon} 
            label="Monitor" 
            active={activeTab === 'Monitor'} 
            onClick={() => setActiveTab('Monitor')}
            theme={theme}
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === 'Settings'} 
            onClick={() => setActiveTab('Settings')}
            theme={theme}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto scrollbar-hide">
        {/* Header */}
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-8 backdrop-blur-md sticky top-0 z-30 transition-colors",
          theme === 'dark' ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-200 bg-white/70"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={cn(
              "text-xs font-mono uppercase tracking-widest",
              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
            )}>System Online: {appSettings?.city || 'Sector 42'}</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "p-2 rounded-lg border transition-all",
                theme === 'dark' ? "border-zinc-800 hover:bg-zinc-800 text-amber-400" : "border-zinc-200 hover:bg-zinc-100 text-indigo-600"
              )}
            >
              {theme === 'dark' ? <Zap className="w-4 h-4 fill-current" /> : <Zap className="w-4 h-4" />}
            </button>
            <NotificationPanel 
                notifications={notifications} 
                onClear={() => setNotifications([])} 
                theme={theme}
            />
            <div className={cn("h-8 w-px", theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200")} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold">Admin Panel</p>
                <p className={cn("text-[10px]", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>ID: 8842-X</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'Overview' && (
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
                <p className="text-zinc-400 mt-1">Autonomous intersection management at Sector 42 Grid.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={cn(
                    "text-sm font-medium px-4 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                    theme === 'dark' ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800" : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700"
                  )}
                >
                  {isExporting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Export Data'
                  )}
                </button>
                <button className="bg-blue-600 hover:bg-blue-500 text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  Manual Override
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard 
                title="Avg. Traffic Density" 
                value={stats?.trafficDensity || "0%"} 
                icon={Activity} 
                trend={stats?.trends?.density} 
                trendUp={stats?.trends?.density?.startsWith('+')} 
                theme={theme}
              />
              <StatusCard 
                title="Wait Time Reduction" 
                value={stats?.waitTimeReduction || "0 min/hr"} 
                icon={Clock} 
                trend={stats?.trends?.waitTime} 
                trendUp={stats?.trends?.waitTime?.startsWith('+')} 
                color="green"
                theme={theme}
              />
              <StatusCard 
                title="AI Confidence" 
                value={stats?.aiConfidence || "0%"} 
                icon={ShieldCheck} 
                color="purple"
                theme={theme}
              />
              <StatusCard 
                title="Active Incidents" 
                value={stats?.activeIncidents?.toString().padStart(2, '0') || "00"} 
                icon={AlertCircle} 
                trend="Live" 
                color="red"
                theme={theme}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-8">
                 <div className={cn(
                   "glass-card p-6 border transition-all h-[400px]",
                   theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                 )}>
                   <TrafficMap
                      lat={appSettings?.lat}
                      lon={appSettings?.lon}
                      city={appSettings?.city}
                      systemMode={systemMode}
                      theme={theme}
                      realDensity={parseFloat(stats?.trafficDensity) || 50}
                      forceLane={systemMode === 'manual' ? manualActiveLane : undefined}
                   />
                 </div>
                 <div className={cn(
                   "glass-card p-8 border transition-all",
                   theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                 )}>
                   <TrafficChart theme={theme} systemMode={systemMode} />
                 </div>
              </div>

              <div className="space-y-6">
                 <div className={cn(
                   "glass-card p-6 border transition-all",
                   theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                 )}>
                    <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                      <Zap className="w-4 h-4 text-amber-500" />
                      Quick Controls
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => handleControl('auto')}
                        className={cn(
                          "w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 border flex items-center justify-center gap-3",
                          systemMode === 'auto'
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30"
                            : theme === 'dark' 
                              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-blue-500/50" 
                              : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-blue-400 hover:bg-zinc-100"
                        )}
                      >
                        <Activity className="w-4 h-4" />
                        Auto-Optimize
                      </button>
                      <button 
                        onClick={() => handleControl('manual')}
                        className={cn(
                          "w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 border flex items-center justify-center gap-3",
                          systemMode === 'manual'
                            ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/30"
                            : theme === 'dark' 
                              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50" 
                              : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-amber-400 hover:bg-zinc-100"
                        )}
                      >
                        <User className="w-4 h-4" />
                        Manual
                      </button>
                      <button
                        onClick={() => handleControl('emergency')}
                        className={cn(
                          "w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 border flex items-center justify-center gap-3",
                          systemMode === 'emergency'
                            ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse"
                            : theme === 'dark'
                              ? "bg-zinc-900 border-zinc-800 text-rose-500/60 hover:border-rose-500/50"
                              : "bg-zinc-50 border-zinc-200 text-rose-500/70 hover:border-rose-400 hover:bg-zinc-100"
                        )}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Emergency
                      </button>
                    </div>

                    {/* Manual signal control — visible only in manual mode */}
                    {systemMode === 'manual' && (
                      <div className={cn("mt-4 pt-4 border-t", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Signal Control</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setManualActiveLane('NS')}
                            className={cn(
                              "py-3 rounded-xl text-xs font-bold border transition-all",
                              manualActiveLane === 'NS'
                                ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                : theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-emerald-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-emerald-400"
                            )}
                          >
                            N↕S Green
                          </button>
                          <button
                            onClick={() => setManualActiveLane('EW')}
                            className={cn(
                              "py-3 rounded-xl text-xs font-bold border transition-all",
                              manualActiveLane === 'EW'
                                ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                : theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-emerald-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-emerald-400"
                            )}
                          >
                            E↔W Green
                          </button>
                        </div>
                      </div>
                    )}
                 </div>

                 <div className={cn(
                   "glass-card p-6 border transition-all",
                   theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                 )}>
                    <h3 className={cn("text-[10px] font-bold uppercase tracking-wider mb-4", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Live Insights</h3>
                    <div className="space-y-4">
                      <div className={cn("p-3 rounded-lg border", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Peak Direction</p>
                        <p className={cn("text-xs font-bold mt-1", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>North-South Lane</p>
                      </div>
                      <div className={cn("p-3 rounded-lg border", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">AI Recommendation</p>
                        <p className={cn("text-xs font-bold mt-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>Extend Phase by 8s</p>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Monitor' && (
          <div className="p-8 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Live Traffic Monitor</h2>
                <p className={cn("mt-1 text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                  Real-time road conditions powered by HERE Traffic API
                </p>
              </div>
              <div className={cn("flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-mono", theme === 'dark' ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-emerald-500/30 bg-emerald-50 text-emerald-600")}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                HERE API · Refreshes every 30s
              </div>
            </div>
            <LiveTrafficMap
              lat={appSettings?.lat}
              lon={appSettings?.lon}
              city={appSettings?.city}
              theme={theme}
            />
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">System Configuration</h2>
                <p className={cn("mt-2", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Manage deployment nodes, AI parameters, and global simulator settings.
                </p>
              </div>
              <button 
                onClick={handleSaveSettings}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 whitespace-nowrap"
              >
                <Save className="w-5 h-5" />
                Apply Changes
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Deployment & Personalization */}
              <div className="space-y-6">
                <div className={cn(
                  "glass-card p-6 border transition-all",
                  theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                )}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold">Deployment Node</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-bold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Target Region</label>
                      <input 
                        list="cities" 
                        value={selectedCity}
                        onChange={(e) => handleCityChange(e.target.value)}
                        placeholder="Search city..."
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500/50",
                          theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                        )}
                      />
                      <datalist id="cities">
                        {CITY_PRESETS.map(city => <option key={city.name} value={city.name} />)}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className={cn("text-[10px] font-bold uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Active Intersection</label>
                      <select 
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500/50",
                          theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                        )}
                        onChange={(e) => handleIntersectionChange(e.target.value)}
                        value={appSettings?.name}
                      >
                        <option value="">-- Select Intersection --</option>
                        {availableIntersections.map(inter => (
                          <option key={inter.name} value={inter.name}>{inter.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "glass-card p-6 border transition-all",
                  theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                )}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold">Personalization</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                        theme === 'dark' ? "bg-zinc-900 border-blue-600 shadow-lg text-white" : "bg-zinc-50 border-zinc-100 text-zinc-400"
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">Dark Theme</span>
                    </button>
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                        theme === 'light' ? "bg-white border-blue-600 shadow-md text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">Light Theme</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: AI & Global Params */}
              <div className="space-y-6">
                <div className={cn(
                  "glass-card p-6 border transition-all",
                  theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                )}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold">Intelligent Parameters</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                      <div>
                        <p className="text-sm font-semibold">Autonomous Phase Control</p>
                        <p className="text-[10px] text-zinc-500">AI adjusts signal duration based on node density.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={appSettings?.aiOptimization}
                        onChange={(e) => setAppSettings({...appSettings, aiOptimization: e.target.checked})}
                        className="w-5 h-5 accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
                      <div>
                        <p className="text-sm font-semibold">Emergency Preemption</p>
                        <p className="text-[10px] text-zinc-500">Force green phases for detected emergency vehicles.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={appSettings?.emergencyPriority}
                        onChange={(e) => setAppSettings({...appSettings, emergencyPriority: e.target.checked})}
                        className="w-5 h-5 accent-rose-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "glass-card p-6 border transition-all",
                  theme === 'dark' ? "border-zinc-800" : "border-zinc-200 bg-white shadow-sm"
                )}>
                  <h3 className="font-bold mb-4">Node Coordinates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">LAT</label>
                      <div className={cn("p-2 rounded-lg border font-mono text-xs", theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-blue-400" : "bg-zinc-50 border-zinc-200 text-blue-600")}>
                        {appSettings?.lat.toFixed(4)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">LON</label>
                      <div className={cn("p-2 rounded-lg border font-mono text-xs", theme === 'dark' ? "bg-zinc-950 border-zinc-800 text-blue-400" : "bg-zinc-50 border-zinc-200 text-blue-600")}>
                        {appSettings?.lon.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-4 italic">Note: These coordinates are auto-synced with the target deployment city.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const NavItem = ({ icon: Icon, label, active, onClick, theme = 'dark' }: { icon: any, label: string, active: boolean, onClick: () => void, theme?: 'dark' | 'light' }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
        : theme === 'dark'
          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
    )}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const NotificationPanel = ({ notifications, onClear, theme = 'dark' }: { notifications: any[], onClear: () => void, theme?: 'dark' | 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn("relative p-2 transition-colors", theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900")}
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className={cn("absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 animate-pulse", theme === 'dark' ? "border-zinc-950" : "border-white")} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn("absolute right-0 mt-2 w-80 glass-card border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200", theme === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
            <div className={cn("p-4 border-b flex justify-between items-center", theme === 'dark' ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-zinc-50")}>
              <h3 className="text-sm font-bold">System Alerts</h3>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono">{notifications.length} ACTIVE</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs italic">
                  No active system alerts.
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={cn("p-4 border-b last:border-0 transition-colors group", theme === 'dark' ? "border-zinc-800 hover:bg-white/5" : "border-zinc-100 hover:bg-zinc-50")}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                        n.priority === 'high' ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" :
                        n.priority === 'medium' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                        "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                      )}>
                        {n.event}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{n.time}</span>
                    </div>
                    <p className={cn("text-xs leading-relaxed", theme === 'dark' ? "text-zinc-300" : "text-zinc-600")}>{n.detail}</p>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={onClear}
              className={cn("w-full p-3 text-[10px] transition-colors border-t uppercase tracking-widest font-bold", theme === 'dark' ? "text-zinc-500 hover:text-zinc-300 bg-zinc-900/30 border-zinc-800" : "text-zinc-400 hover:text-zinc-600 bg-zinc-50 border-zinc-200")}
            >
              Clear All Logs
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../utils/cn';

interface FlowResult {
  location: { shape: { links: { points: { lat: number; lng: number }[]; functionalClass?: number }[] } };
  currentFlow: { jamFactor: number; speed: number; freeFlow: number; confidence: number };
}

interface IncidentResult {
  location: { shape: { links: { points: { lat: number; lng: number }[] }[] } };
  incidentDetails: {
    id: string;
    type: string;
    criticality: string;
    description?: { value: string };
    summary?: { value: string };
    roadClosed?: boolean;
    startTime?: string;
  };
}

const jamColor = (jf: number) => {
  if (jf < 2) return '#22c55e';
  if (jf < 4) return '#84cc16';
  if (jf < 6) return '#f59e0b';
  if (jf < 8) return '#ef4444';
  return '#7c3aed';
};

const jamLabel = (jf: number) => {
  if (jf < 2) return 'Free Flow';
  if (jf < 4) return 'Light';
  if (jf < 6) return 'Moderate';
  if (jf < 8) return 'Heavy';
  return 'Standstill';
};

const criticalityColor = (c: string) =>
  c === 'critical' ? '#ef4444' : c === 'major' ? '#f59e0b' : '#3b82f6';

// Re-center map when location changes
const MapFlyTo = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], 14); }, [lat, lon]);
  return null;
};

interface LiveTrafficMapProps {
  lat: number;
  lon: number;
  city: string;
  theme?: 'dark' | 'light';
}

const LiveTrafficMap = ({ lat, lon, city, theme = 'dark' }: LiveTrafficMapProps) => {
  const [flowData,  setFlowData]  = useState<FlowResult[]>([]);
  const [incidents, setIncidents] = useState<IncidentResult[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const fetchData = async () => {
    try {
      const [flowRes, incRes] = await Promise.all([
        fetch(`http://localhost:5000/api/traffic/flow?lat=${lat}&lon=${lon}`),
        fetch(`http://localhost:5000/api/traffic/incidents?lat=${lat}&lon=${lon}`),
      ]);
      const flow = await flowRes.json();
      const inc  = await incRes.json();
      setFlowData(flow.results  || []);
      setIncidents(inc.results  || []);
      setUpdatedAt(new Date().toLocaleTimeString());
      setError('');
    } catch {
      setError('Failed to load HERE traffic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [lat, lon]);

  // Only render functional class 1-3 (motorways → secondary) for performance
  const polylines = useMemo(() =>
    flowData.flatMap((result, i) =>
      result.location.shape.links
        .filter(link => (link.functionalClass ?? 3) <= 3)
        .map((link, j) => ({
          key: `${i}-${j}`,
          positions: link.points.map(p => [p.lat, p.lng] as [number, number]),
          color: jamColor(result.currentFlow?.jamFactor ?? 0),
          jf: result.currentFlow?.jamFactor ?? 0,
          speed: result.currentFlow?.speed ?? 0,
          freeFlow: result.currentFlow?.freeFlow ?? 0,
        }))
    ), [flowData]);

  const incidentMarkers = useMemo(() =>
    incidents
      .map(inc => {
        const pt = inc.location?.shape?.links?.[0]?.points?.[0];
        if (!pt) return null;
        return { key: inc.incidentDetails.id, lat: pt.lat, lng: pt.lng, details: inc.incidentDetails };
      })
      .filter(Boolean) as { key: string; lat: number; lng: number; details: IncidentResult['incidentDetails'] }[],
    [incidents]);

  if (loading) {
    return (
      <div className="h-[520px] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest animate-pulse">Loading HERE Traffic Data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[520px] flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
        <MapContainer
          center={[lat, lon]}
          zoom={14}
          style={{ height: '520px', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <MapFlyTo lat={lat} lon={lon} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a> | Traffic: HERE'
            subdomains={['a', 'b', 'c']}
          />

          {/* Flow polylines */}
          {polylines.map(pl => (
            <Polyline key={pl.key} positions={pl.positions} pathOptions={{ color: pl.color, weight: 4, opacity: 0.85 }}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[140px]">
                  <p className="font-bold" style={{ color: pl.color }}>{jamLabel(pl.jf)}</p>
                  <p>Jam factor: <b>{pl.jf.toFixed(1)}</b>/10</p>
                  <p>Speed: {(pl.speed * 3.6).toFixed(0)} km/h</p>
                  <p>Free-flow: {(pl.freeFlow * 3.6).toFixed(0)} km/h</p>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Incident markers */}
          {incidentMarkers.map(m => (
            <CircleMarker
              key={m.key}
              center={[m.lat, m.lng]}
              radius={8}
              pathOptions={{ color: '#fff', fillColor: criticalityColor(m.details.criticality), fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[160px]">
                  <p className="font-bold capitalize">{m.details.type.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p style={{ color: criticalityColor(m.details.criticality) }} className="font-semibold capitalize">{m.details.criticality}</p>
                  <p>{m.details.description?.value || m.details.summary?.value}</p>
                  {m.details.roadClosed && <p className="font-bold text-red-600">⚠ Road Closed</p>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-950/80 backdrop-blur-md text-white text-[10px] rounded-xl px-4 py-3 border border-zinc-800">
          <p className="font-bold uppercase tracking-widest text-zinc-400 mb-2">Traffic Flow</p>
          {([['#22c55e','Free Flow'],['#84cc16','Light'],['#f59e0b','Moderate'],['#ef4444','Heavy'],['#7c3aed','Standstill']] as [string,string][]).map(([col, lbl]) => (
            <div key={lbl} className="flex items-center gap-2 mb-1">
              <div style={{ background: col }} className="w-5 h-1.5 rounded-full" />
              <span className="text-zinc-300">{lbl}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
            <span className="text-zinc-300">Incident</span>
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-4 right-4 z-[1000] bg-zinc-950/80 backdrop-blur-md text-[10px] rounded-xl px-3 py-2 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-400 uppercase tracking-widest">Live — HERE API</span>
          </div>
          <p className="text-zinc-400 font-mono">{city}</p>
          <p className="text-zinc-500">{polylines.length} road segments</p>
          <p className="text-zinc-500">{incidentMarkers.length} active incidents</p>
          {updatedAt && <p className="text-zinc-600">Updated {updatedAt}</p>}
        </div>
      </div>

      {/* Incident list */}
      {incidentMarkers.length > 0 && (
        <div className={cn("rounded-2xl border p-5", theme === 'dark' ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-white shadow-sm")}>
          <h4 className={cn("text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Active Incidents ({incidentMarkers.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {incidentMarkers.map(m => (
              <div key={m.key} className={cn("flex items-start gap-3 p-3 rounded-lg border text-xs", theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
                <div style={{ background: criticalityColor(m.details.criticality) }} className="w-2 h-2 rounded-full mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <p className={cn("font-semibold capitalize", theme === 'dark' ? "text-zinc-200" : "text-zinc-800")}>
                    {m.details.type.replace(/([A-Z])/g, ' $1').trim()}
                    {m.details.roadClosed && <span className="ml-2 text-red-500 font-bold">· Road Closed</span>}
                  </p>
                  <p className="text-zinc-500 truncate">{m.details.description?.value || m.details.summary?.value}</p>
                </div>
                <span className={cn("ml-auto text-[10px] capitalize px-2 py-0.5 rounded-full border flex-shrink-0",
                  m.details.criticality === 'critical' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  m.details.criticality === 'major' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                  "bg-blue-500/10 text-blue-400 border-blue-500/30"
                )}>{m.details.criticality}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTrafficMap;

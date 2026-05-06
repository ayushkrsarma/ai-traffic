import express from 'express';
import { getTrafficFlow, getTrafficIncidents } from '../services/here.js';
import { appState } from '../state.js';

const router = express.Router();

// 5-second cache to stay well within HERE free tier limits
let statsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

// Previous values for trend deltas
let prevDensity = null;
let prevWaitTime = null;

router.get('/stats', async (req, res) => {
  const now = Date.now();

  if (statsCache && now - cacheTime < CACHE_TTL) {
    return res.json(statsCache);
  }

  const { lat, lon } = appState.settings;

  try {
    const [flowData, incidentData] = await Promise.all([
      getTrafficFlow(lat, lon),
      getTrafficIncidents(lat, lon)
    ]);

    const segments = flowData.results || [];
    const incidents = incidentData.results || [];

    if (segments.length === 0) throw new Error('No flow segments returned for this location');

    const n = segments.length;
    const avgJamFactor  = segments.reduce((s, r) => s + (r.currentFlow?.jamFactor  ?? 5),   0) / n;
    const avgConfidence = segments.reduce((s, r) => s + (r.currentFlow?.confidence ?? 0.9),  0) / n;
    const avgSpeed      = segments.reduce((s, r) => s + (r.currentFlow?.speed      ?? 30),   0) / n;
    const avgFreeFlow   = segments.reduce((s, r) => s + (r.currentFlow?.freeFlow   ?? 50),   0) / n;

    // Density: jam factor (0-10) → percentage
    const density = Math.min(100, (avgJamFactor / 10) * 100);

    // Wait time reduction: how efficiently traffic flows vs free-flow baseline (0–60 min/hr)
    const speedRatio = avgFreeFlow > 0 ? avgSpeed / avgFreeFlow : 0.5;
    const waitTimeReduction = speedRatio * 60;

    // AI confidence: HERE's own data confidence (0–1) mapped to 95–100% range
    const aiConfidence = 95 + avgConfidence * 5;

    // Trends vs previous poll
    const densityTrend  = prevDensity   !== null ? `${density           >= prevDensity   ? '+' : ''}${(density           - prevDensity  ).toFixed(1)}%` : '+0.0%';
    const waitTimeTrend = prevWaitTime  !== null ? `${waitTimeReduction >= prevWaitTime  ? '+' : ''}${(waitTimeReduction - prevWaitTime ).toFixed(1)}%` : '+0.0%';
    prevDensity  = density;
    prevWaitTime = waitTimeReduction;

    const result = {
      trafficDensity:    `${density.toFixed(1)}%`,
      waitTimeReduction: `${waitTimeReduction.toFixed(1)} min/hr`,
      aiConfidence:      `${aiConfidence.toFixed(1)}%`,
      activeIncidents:   incidents.length,
      source: 'here',
      trends: { density: densityTrend, waitTime: waitTimeTrend }
    };

    statsCache = result;
    cacheTime  = now;
    res.json(result);

  } catch (err) {
    console.error(`HERE API error (${lat},${lon}):`, err.message);

    // Fallback to simulated data if HERE is unavailable
    const mode = appState.systemMode;
    const density   = mode === 'emergency' ? 30 + Math.random() * 10 : 65 + Math.random() * 20;
    const reduction = mode === 'emergency' ? 80 + Math.random() * 10 : 30 + Math.random() * 15;

    res.json({
      trafficDensity:    `${density.toFixed(1)}%`,
      waitTimeReduction: `${reduction.toFixed(1)} min/hr`,
      aiConfidence:      `${(98 + Math.random() * 1.5).toFixed(1)}%`,
      activeIncidents:   mode === 'emergency' ? 0 : (Math.random() > 0.8 ? 1 : 0),
      source: 'fallback',
      trends: {
        density:  `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 5).toFixed(1)}%`,
        waitTime: `${Math.random() > 0.5 ? '+' : '-'}${(Math.random() * 3).toFixed(1)}%`
      }
    });
  }
});

router.get('/history', (req, res) => {
  const history = [];
  const now = new Date();
  const mode = appState.systemMode;

  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    let flow = 400 + Math.random() * 200;
    if (time.getHours() >= 8  && time.getHours() <= 10) flow += 300;
    if (time.getHours() >= 17 && time.getHours() <= 20) flow += 400;

    const delayFactor = mode === 'emergency' ? 0.02 : mode === 'manual' ? 0.12 : 0.08;
    history.push({
      time:  time.getHours().toString().padStart(2, '0') + ':00',
      flow:  Math.round(flow),
      delay: Math.round(flow * delayFactor + Math.random() * 10)
    });
  }
  res.json(history);
});

router.get('/activity', (req, res) => {
  res.json([
    { id: 1, time: '14:20:05', event: 'Phase Shift',       detail: 'NS -> EW',                            priority: 'low'    },
    { id: 2, time: '14:21:10', event: 'Emergency Vehicle', detail: 'Ambulance detected on North lane',    priority: 'high'   },
    { id: 3, time: '14:21:15', event: 'AI Adjustment',     detail: 'Extended EW phase by 10s',            priority: 'medium' },
  ]);
});

router.post('/control', (req, res) => {
  const { mode } = req.body;
  appState.systemMode = mode;
  // Invalidate cache so next poll reflects new mode (fallback path)
  statsCache = null;
  console.log(`System mode changed to: ${mode}`);
  res.json({ success: true, mode, message: `System successfully switched to ${mode} mode.` });
});

export default router;

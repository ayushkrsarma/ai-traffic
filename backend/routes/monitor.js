import express from 'express';

const router = express.Router();

let systemMode = 'auto';

// Mock data for monitoring
router.get('/stats', (req, res) => {
  // Generate slightly dynamic values for a "live" feel
  const density = systemMode === 'emergency' ? 30 + Math.random() * 10 : 65 + Math.random() * 20;
  const reduction = systemMode === 'emergency' ? 80 + Math.random() * 10 : 30 + Math.random() * 15;
  const confidence = 98 + Math.random() * 1.5;
  const incidents = systemMode === 'emergency' ? 0 : (Math.random() > 0.8 ? 1 : 0);

  res.json({
    trafficDensity: `${density.toFixed(1)}%`,
    waitTimeReduction: `${reduction.toFixed(1)} min/hr`,
    aiConfidence: `${confidence.toFixed(1)}%`,
    activeIncidents: incidents,
    trends: {
      density: `${(Math.random() > 0.5 ? '+' : '-')}${(Math.random() * 5).toFixed(1)}%`,
      waitTime: `${(Math.random() > 0.5 ? '+' : '-')}${(Math.random() * 3).toFixed(1)}%`
    }
  });
});

router.get('/history', (req, res) => {
  const history = [];
  const now = new Date();
  
  for (let i = 12; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours().toString().padStart(2, '0') + ':00';
    
    // Simulate realistic traffic patterns (peak hours)
    let flow = 400 + Math.random() * 200;
    if (time.getHours() >= 8 && time.getHours() <= 10) flow += 300;
    if (time.getHours() >= 17 && time.getHours() <= 20) flow += 400;
    
    // Impact of system mode on history data
    let delayFactor = 0.08;
    if (systemMode === 'emergency') delayFactor = 0.02;
    if (systemMode === 'manual') delayFactor = 0.12;

    history.push({
      time: hour,
      flow: Math.round(flow),
      delay: Math.round(flow * delayFactor + Math.random() * 10)
    });
  }
  
  res.json(history);
});

router.get('/activity', (req, res) => {
  res.json([
    { id: 1, time: '14:20:05', event: 'Phase Shift', detail: 'NS -> EW', priority: 'low' },
    { id: 2, time: '14:21:10', event: 'Emergency Vehicle', detail: 'Ambulance detected on North lane', priority: 'high' },
    { id: 3, time: '14:21:15', event: 'AI Adjustment', detail: 'Extended EW phase by 10s', priority: 'medium' },
  ]);
});

router.post('/control', (req, res) => {
  const { mode } = req.body;
  systemMode = mode;
  console.log(`System mode changed to: ${mode}`);
  // In a real system, this would interface with the signal hardware
  res.json({ success: true, mode, message: `System successfully switched to ${mode} mode.` });
});

export default router;

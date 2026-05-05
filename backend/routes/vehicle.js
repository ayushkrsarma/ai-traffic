import express from 'express';
import { getTrafficFlow } from '../services/tomtom.js';

const router = express.Router();

router.post('/control', async (req, res) => {
  const { vehicleId, lat, lon, currentSpeed } = req.body;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Vehicle coordinates are required' });
  }

  try {
    // 1. Get traffic flow at vehicle location
    const flowData = await getTrafficFlow(lat, lon);
    const trafficSpeed = flowData.flowSegmentData.currentSpeed;
    const freeFlowSpeed = flowData.flowSegmentData.freeFlowSpeed;

    // 2. Control Logic
    let command = 'KEEP_SPEED';
    let recommendation = 'No action needed.';
    let targetSpeed = trafficSpeed;

    if (currentSpeed > trafficSpeed + 5) {
      command = 'REDUCE_SPEED';
      recommendation = `Traffic ahead is slower (${trafficSpeed} KMPH). Please reduce speed.`;
    } else if (trafficSpeed < freeFlowSpeed * 0.5) {
      command = 'HEAVY_TRAFFIC_WARNING';
      recommendation = 'Heavy traffic detected. Consider alternate route.';
    } else if (currentSpeed < trafficSpeed - 10) {
      command = 'INCREASE_SPEED';
      recommendation = `Traffic is moving faster (${trafficSpeed} KMPH). You can safely increase speed.`;
    }

    res.json({
      vehicleId,
      trafficData: {
        currentTrafficSpeed: trafficSpeed,
        freeFlowSpeed: freeFlowSpeed,
        roadClosure: flowData.flowSegmentData.roadClosure
      },
      control: {
        command,
        recommendation,
        targetSpeed
      }
    });
  } catch (error) {
    console.error('Vehicle control error:', error);
    res.status(500).json({ error: 'Internal logic error' });
  }
});

export default router;

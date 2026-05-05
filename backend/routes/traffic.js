import express from 'express';
import { getTrafficFlow, getTrafficIncidents } from '../services/tomtom.js';

const router = express.Router();

router.get('/flow', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const data = await getTrafficFlow(lat, lon);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traffic flow' });
  }
});

router.get('/incidents', async (req, res) => {
  const { bbox } = req.query; // Expecting comma separated values
  if (!bbox) {
    return res.status(400).json({ error: 'Bounding box (bbox) is required' });
  }

  try {
    const bboxArray = bbox.split(',').map(Number);
    const data = await getTrafficIncidents(bboxArray);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traffic incidents' });
  }
});

export default router;

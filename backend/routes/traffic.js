import express from 'express';
import { getTrafficFlow, getTrafficIncidents } from '../services/here.js';

const router = express.Router();

router.get('/flow', async (req, res) => {
  const { lat, lon, radius = 500 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  try {
    const data = await getTrafficFlow(Number(lat), Number(lon), Number(radius));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch traffic flow', detail: err.message });
  }
});

router.get('/incidents', async (req, res) => {
  const { lat, lon, radius = 2000 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  try {
    const data = await getTrafficIncidents(Number(lat), Number(lon), Number(radius));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch traffic incidents', detail: err.message });
  }
});

export default router;

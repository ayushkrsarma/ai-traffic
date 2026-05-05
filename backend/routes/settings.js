import express from 'express';

const router = express.Router();

// In-memory settings for demo purposes
let appSettings = {
  aiOptimization: true,
  emergencyPriority: true,
  refreshRate: 5000,
  theme: 'dark',
  notifications: {
    email: true,
    push: false
  },
  intersectionId: 'NODE_A12',
  city: 'New Delhi',
  lat: 28.6139,
  lon: 77.2090
};

router.get('/', (req, res) => {
  res.json(appSettings);
});

router.patch('/', (req, res) => {
  const newSettings = req.body;
  appSettings = { ...appSettings, ...newSettings };
  res.json({ message: 'Settings updated successfully', settings: appSettings });
});

export default router;

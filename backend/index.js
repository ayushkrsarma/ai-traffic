import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import trafficRoutes from './routes/traffic.js';
import vehicleRoutes from './routes/vehicle.js';
import monitorRoutes from './routes/monitor.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/traffic', trafficRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Traffic Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

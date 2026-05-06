import express from 'express';
import { appState } from '../state.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(appState.settings);
});

router.patch('/', (req, res) => {
  appState.settings = { ...appState.settings, ...req.body };
  res.json({ message: 'Settings updated successfully', settings: appState.settings });
});

export default router;

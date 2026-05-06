import axios from 'axios';

const BASE = 'https://data.traffic.hereapi.com/v7';

// ~0.05° ≈ 5.5 km box around a point
const toBbox = (lat, lon, delta = 0.05) =>
  `bbox:${(lon - delta).toFixed(4)},${(lat - delta).toFixed(4)},${(lon + delta).toFixed(4)},${(lat + delta).toFixed(4)}`;

// Read lazily so dotenv has time to populate process.env before first call
const params = (lat, lon) => ({
  in: toBbox(lat, lon),
  locationReferencing: 'shape',
  apiKey: process.env.HERE_API_KEY
});

export const getTrafficFlow = async (lat, lon) => {
  const { data } = await axios.get(`${BASE}/flow`, { params: params(lat, lon), timeout: 8000 });
  return data; // { results: [ { currentFlow: { speed, freeFlow, jamFactor, confidence } } ] }
};

export const getTrafficIncidents = async (lat, lon) => {
  const { data } = await axios.get(`${BASE}/incidents`, { params: params(lat, lon), timeout: 8000 });
  return data; // { results: [...] }
};

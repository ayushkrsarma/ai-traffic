import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.TOMTOM_API_KEY;
const BASE_URL = 'https://api.tomtom.com/traffic/services/4';

export const getTrafficFlow = async (lat, lon, zoom = 12) => {
  try {
    const response = await axios.get(`${BASE_URL}/flowSegmentData/relative0/${zoom}/json`, {
      params: {
        point: `${lat},${lon}`,
        unit: 'KMPH',
        key: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching traffic flow:', error.response?.data || error.message);
    throw error;
  }
};

export const getTrafficIncidents = async (bbox) => {
  // bbox: [minLon, minLat, maxLon, maxLat]
  try {
    const response = await axios.get(`${BASE_URL}/incidentDetails/s3/${bbox.join(',')}/10/-1/json`, {
      params: {
        key: API_KEY,
        contentType: 'json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching traffic incidents:', error.response?.data || error.message);
    throw error;
  }
};

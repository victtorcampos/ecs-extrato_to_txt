import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

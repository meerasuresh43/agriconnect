import axios from 'axios';

// Base URL configured from environment variable (VITE_API_BASE_URL) or fallback to '/api'
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL
});

// Automatically inject JWT bearer token into every outgoing API request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agri_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

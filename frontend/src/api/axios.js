import axios from 'axios';

// Check if the application is running inside a Capacitor native mobile wrapper
const isCapacitor = window.hasOwnProperty('Capacitor') || navigator.userAgent.includes('Capacitor');

// Set the API base URL dynamically
const BASE_URL = isCapacitor 
  ? 'http://192.168.1.6:5000/api'   // Your PC's Local IP for mobile debugging
  : 'http://localhost:5000/api';     // Localhost fallback for browser web debugging

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true // Ensures cookies/sessions are handled properly across local domains
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
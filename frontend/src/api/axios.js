import axios from 'axios';
import { API_URL } from './config'; // Make sure this path correctly matches your folder structure!

const API = axios.create({
  baseURL: API_URL 
});

// Automatically attach the JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
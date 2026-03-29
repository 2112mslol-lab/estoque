/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api',
});

// Interceptor para adicionar o Token automaticamente em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

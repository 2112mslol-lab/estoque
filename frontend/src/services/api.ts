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

// Interceptor para detectar token expirado (401) e fazer logout automático
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        // Token existe mas é inválido/expirado — limpa e redireciona
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

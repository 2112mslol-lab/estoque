import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Erro na requisição';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default api;

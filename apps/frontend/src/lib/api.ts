import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic error handling
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

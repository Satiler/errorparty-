import axios from 'axios';

/**
 * Определяем базовый URL API в зависимости от окружения
 * - В Tauri: используем полный URL продакшн сервера
 * - В браузере: используем относительный путь (проксируется через Nginx)
 */
const getApiUrl = () => {
  // Проверяем, запущено ли приложение в Tauri
  const isTauri = window.__TAURI__ !== undefined;
  
  if (isTauri) {
    // В Tauri приложении используем полный URL
    return import.meta.env.VITE_API_URL || 'https://errorparty.ru/api';
  }
  
  // В браузере используем относительный путь
  return import.meta.env.VITE_API_URL || '/api';
};

const API_URL = getApiUrl();

console.log('API URL:', API_URL, '| Tauri:', window.__TAURI__ !== undefined);

/**
 * Централизованный API клиент с interceptors для авторизации и обработки ошибок
 */
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor - автоматически добавляем токен авторизации
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - централизованная обработка ошибок
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 401 Unauthorized - токен истек или невалиден
    if (error.response?.status === 401) {
      console.warn('Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Редирект на страницу логина (если не на ней уже)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // 403 Forbidden - доступ запрещен
    if (error.response?.status === 403) {
      console.error('Access denied');
    }
    
    // 404 Not Found
    if (error.response?.status === 404) {
      console.warn('Resource not found:', error.config?.url);
    }
    
    // 500+ Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
    }
    
    // Network errors
    if (!error.response) {
      console.error('Network error - no response from server');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * API конфигурация для определения базового URL
 * Используется для fetch-запросов (для axios см. apiClient.js)
 */

/**
 * Определяем базовый URL API в зависимости от окружения
 * - В Tauri: используем полный URL продакшн сервера
 * - В браузере: используем относительный путь (проксируется через Nginx)
 */
export const getApiUrl = () => {
  // Проверяем, запущено ли приложение в Tauri
  const isTauri = window.__TAURI__ !== undefined;
  
  if (isTauri) {
    // В Tauri приложении используем полный URL
    return import.meta.env.VITE_API_URL || 'https://errorparty.ru/api';
  }
  
  // В браузере используем относительный путь
  return import.meta.env.VITE_API_URL || '/api';
};

/**
 * Получить полный URL для API endpoint
 * @param {string} path - Путь к endpoint (например, '/auth/profile')
 * @returns {string} Полный URL
 */
export const getApiEndpoint = (path) => {
  const baseUrl = getApiUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Проверка, запущено ли приложение в Tauri
 */
export const isTauriApp = () => {
  return window.__TAURI__ !== undefined;
};

/**
 * Wrapper для fetch с автоматической подстановкой базового URL
 * @param {string} path - Путь к API endpoint
 * @param {RequestInit} options - Опции fetch
 * @returns {Promise<Response>}
 */
export const apiFetch = async (path, options = {}) => {
  const url = getApiEndpoint(path);
  
  // Автоматически добавляем токен авторизации
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};

export default {
  getApiUrl,
  getApiEndpoint,
  isTauriApp,
  apiFetch
};

/**
 * Хелперы для работы с ресурсами в Tauri приложении
 */

import { getApiUrl, isTauriApp } from './apiConfig';

/**
 * Конвертирует относительный URL в абсолютный для Tauri
 * @param {string} url - Относительный или абсолютный URL
 * @returns {string} Полный URL для загрузки ресурса
 */
export const getResourceUrl = (url) => {
  if (!url) return '';
  
  // Если уже абсолютный URL, возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Если Tauri приложение, используем полный URL сервера
  if (isTauriApp()) {
    const baseUrl = 'https://errorparty.ru';
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }
  
  // В браузере используем относительный путь
  return url;
};

/**
 * Получить URL аудио файла
 * @param {object} track - Объект трека с информацией об аудио
 * @returns {string} URL для воспроизведения
 */
export const getAudioUrl = (track) => {
  if (!track) return '';
  
  // Если есть прямой streamUrl
  if (track.streamUrl) {
    return getResourceUrl(track.streamUrl);
  }
  
  // Если есть audioUrl
  if (track.audioUrl) {
    return getResourceUrl(track.audioUrl);
  }
  
  // Если есть путь к файлу
  if (track.filePath) {
    return getResourceUrl(track.filePath);
  }
  
  return '';
};

/**
 * Получить URL изображения
 * @param {string|object} source - URL изображения или объект с полями coverUrl/imageUrl/image
 * @returns {string} URL изображения
 */
export const getImageUrl = (source) => {
  if (!source) return '';
  
  // Если передана строка
  if (typeof source === 'string') {
    return getResourceUrl(source);
  }
  
  // Если передан объект
  if (typeof source === 'object') {
    const url = source.coverUrl || source.imageUrl || source.image || source.avatar;
    return getResourceUrl(url);
  }
  
  return '';
};

export default {
  getResourceUrl,
  getAudioUrl,
  getImageUrl
};

/**
 * Audio Decoder Service - Мульти-сервисный декодер для аудио URL
 * Поддерживает KissVK, VK, Yandex Music и другие популярные сервисы
 */

const crypto = require('crypto');
const axios = require('axios');

class AudioDecoderService {
  constructor() {
    this.decoders = {
      kissvk: this.decodeKissVK.bind(this),
      vk: this.decodeVK.bind(this),
      yandex: this.decodeYandex.bind(this),
      generic: this.decodeGeneric.bind(this)
    };
  }

  /**
   * Универсальный декодер - автоматически определяет сервис
   */
  async decode(url, metadata = {}) {
    try {
      // Определяем сервис по URL
      const service = this.detectService(url);
      
      // Выбираем соответствующий декодер
      const decoder = this.decoders[service] || this.decoders.generic;
      
      return await decoder(url, metadata);
    } catch (error) {
      console.error('[AudioDecoder] Decode error:', error.message);
      return { success: false, error: error.message, url: null };
    }
  }

  /**
   * Определение сервиса по URL
   */
  detectService(url) {
    if (!url) return 'generic';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('kissvk') || urlLower.includes('kiss-vk')) {
      return 'kissvk';
    }
    if (urlLower.includes('vk.com') || urlLower.includes('vk.me')) {
      return 'vk';
    }
    if (urlLower.includes('music.yandex') || urlLower.includes('yandex.ru/music')) {
      return 'yandex';
    }
    
    return 'generic';
  }

  /**
   * KissVK декодер - улучшенная версия с поддержкой нескольких алгоритмов
   */
  async decodeKissVK(url, metadata = {}) {
    try {
      // KissVK уже предоставляет прямые ссылки, но иногда они зашифрованы
      if (!url || url.startsWith('http://') || url.startsWith('https://')) {
        return { success: true, url, decoded: false };
      }

      // Попытка декодирования base64
      if (this.isBase64(url)) {
        const decoded = Buffer.from(url, 'base64').toString('utf-8');
        if (this.isValidUrl(decoded)) {
          return { success: true, url: decoded, decoded: true, method: 'base64' };
        }
      }

      // Попытка декодирования hex
      if (this.isHex(url)) {
        const decoded = Buffer.from(url, 'hex').toString('utf-8');
        if (this.isValidUrl(decoded)) {
          return { success: true, url: decoded, decoded: true, method: 'hex' };
        }
      }

      // Если не удалось декодировать, возвращаем как есть
      return { success: true, url, decoded: false, method: 'none' };
      
    } catch (error) {
      console.error('[KissVK Decoder] Error:', error.message);
      return { success: false, error: error.message, url };
    }
  }

  /**
   * VK декодер - поддержка VK Audio API
   */
  async decodeVK(url, metadata = {}) {
    try {
      // VK использует сложный алгоритм шифрования на основе user_id и audio_id
      // Для расшифровки нужен VK access token
      
      const { userId, audioId, actionHash } = metadata;
      
      if (!userId || !audioId) {
        return { success: false, error: 'Missing userId or audioId', url };
      }

      // Извлекаем зашифрованный URL
      const encryptedUrl = url.split('?extra=')[1];
      if (!encryptedUrl) {
        return { success: true, url, decoded: false };
      }

      // VK декодирование (упрощенная версия)
      const decoded = this.vkDecryptUrl(encryptedUrl, userId, audioId);
      
      return { 
        success: true, 
        url: decoded, 
        decoded: true, 
        method: 'vk-crypto',
        format: 'mp3'
      };
      
    } catch (error) {
      console.error('[VK Decoder] Error:', error.message);
      return { success: false, error: error.message, url };
    }
  }

  /**
   * Yandex Music декодер
   */
  async decodeYandex(url, metadata = {}) {
    try {
      // Yandex использует подписанные URL с таймстампами
      if (!url.includes('storage.yandexcloud.net')) {
        return { success: true, url, decoded: false };
      }

      // URL уже валиден, проверяем срок действия подписи
      const urlObj = new URL(url);
      const expires = urlObj.searchParams.get('expires');
      
      if (expires) {
        const expiryTime = parseInt(expires);
        const now = Date.now() / 1000;
        
        if (expiryTime < now) {
          return { 
            success: false, 
            error: 'URL expired', 
            url,
            expired: true 
          };
        }
      }

      return { 
        success: true, 
        url, 
        decoded: false,
        format: 'mp3',
        expires: expires ? new Date(parseInt(expires) * 1000) : null
      };
      
    } catch (error) {
      console.error('[Yandex Decoder] Error:', error.message);
      return { success: false, error: error.message, url };
    }
  }

  /**
   * Универсальный декодер для неизвестных сервисов
   */
  async decodeGeneric(url, metadata = {}) {
    try {
      // Попытка HEAD запроса для проверки доступности
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const contentType = response.headers['content-type'] || '';
      const isAudio = contentType.includes('audio') || 
                     contentType.includes('mpeg') ||
                     contentType.includes('mp3');

      return {
        success: response.status === 200,
        url,
        decoded: false,
        available: response.status === 200,
        contentType,
        isAudio,
        size: response.headers['content-length']
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url,
        available: false
      };
    }
  }

  /**
   * VK URL декодирование (базовый алгоритм)
   */
  vkDecryptUrl(encrypted, userId, audioId) {
    // Это упрощенная версия - реальный алгоритм VK более сложный
    try {
      const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
      
      // Применяем трансформации на основе userId и audioId
      const key = `${userId}_${audioId}`;
      const hash = crypto.createHash('md5').update(key).digest('hex');
      
      // Простая XOR операция для примера
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
          decoded.charCodeAt(i) ^ hash.charCodeAt(i % hash.length)
        );
      }
      
      return result;
    } catch (error) {
      console.error('[VK Decrypt] Error:', error.message);
      return encrypted;
    }
  }

  /**
   * Batch декодирование нескольких URL
   */
  async decodeBatch(tracks) {
    const results = [];
    
    for (const track of tracks) {
      const result = await this.decode(track.url, track.metadata || {});
      results.push({
        ...track,
        decodedUrl: result.url,
        decodeSuccess: result.success,
        decodeMethod: result.method,
        decodeError: result.error
      });
    }
    
    return results;
  }

  /**
   * Проверка валидности URL
   */
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Проверка base64
   */
  isBase64(str) {
    if (!str || str.length < 4) return false;
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(str);
  }

  /**
   * Проверка hex
   */
  isHex(str) {
    if (!str || str.length < 4) return false;
    const hexRegex = /^[0-9A-Fa-f]+$/;
    return hexRegex.test(str) && str.length % 2 === 0;
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new AudioDecoderService();
  }
  return instance;
}

module.exports = {
  AudioDecoderService,
  getInstance
};

/**
 * KissVK Service - Оптимизированный сервис для импорта музыки
 * 
 * Возможности:
 * - HTTP-only парсинг (без Puppeteer)
 * - Расшифровка VK Audio URL
 * - Кеширование с TTL
 * - Rate limiting
 * - Поиск треков и альбомов
 */

const axios = require('axios');
const cheerio = require('cheerio');
const VKAudioDecoder = require('../utils/vk-audio-decoder-v3');
const { getInstance: getMultiDecoder } = require('../utils/multi-decoder');

class KissVKService {
  constructor() {
    this.baseUrl = 'https://kissvk.top';
    this.multiDecoder = getMultiDecoder();
    
    // Кеш расшифрованных URL (TTL 1 час)
    this.urlCache = new Map();
    this.cacheTTL = 60 * 60 * 1000;
    
    // Rate limiting
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestDelay = 1000; // 1 секунда между запросами
    this.maxConcurrent = 2;
    this.activeRequests = 0;
    
    // Статистика
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }

  /**
   * Добавить запрос в очередь с rate limiting
   */
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Обработка очереди запросов
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      this.activeRequests++;
      this.stats.requests++;

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        this.stats.errors++;
        reject(error);
      } finally {
        this.activeRequests--;
        
        if (this.requestQueue.length > 0) {
          await new Promise(r => setTimeout(r, this.requestDelay));
        }
      }
    }

    this.isProcessing = false;
    
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Получить HTML страницы с rate limiting
   */
  async fetchPage(url) {
    return this.queueRequest(async () => {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': this.baseUrl
        },
        timeout: 15000
      });
      return response.data;
    });
  }

  /**
   * Парсинг треков из HTML
   */
  async extractTracks(url, limit = 50) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      const html = await this.fetchPage(fullUrl);
      const $ = cheerio.load(html);
      
      const tracks = [];

      $('.audio[data-id]').each((index, element) => {
        if (limit && tracks.length >= limit) return false;

        try {
          const $el = $(element);
          const trackId = $el.attr('data-id');
          
          // Artist
          const $author = $el.find('.author');
          let artist = 'Unknown Artist';
          if ($author.length) {
            const artistLinks = $author.find('a');
            artist = artistLinks.length > 0
              ? artistLinks.map((i, a) => $(a).text().trim()).get().join(', ')
              : $author.text().trim();
          }

          // Title
          const title = $el.find('.title').text().trim() || 'Unknown Track';

          // Duration
          const $duration = $el.find('.duration[data-duration]');
          const duration = $duration.length ? parseInt($duration.attr('data-duration')) || 0 : 0;

          // Cover
          const coverUrl = $el.attr('data-cover') || null;

          // Encrypted URL
          const encryptedUrl = $el.attr('data-audio');
          
          if (trackId && title && artist && encryptedUrl) {
            tracks.push({
              trackId,
              title,
              artist,
              duration,
              coverUrl,
              encryptedUrl,
              source: 'kissvk.top',
              pageUrl: fullUrl
            });
          }
        } catch (error) {
          console.error('[KissVK] Error parsing track:', error.message);
        }
      });

      return {
        success: true,
        tracks,
        total: tracks.length,
        url: fullUrl
      };

    } catch (error) {
      console.error('[KissVK] Error extracting tracks:', error.message);
      return {
        success: false,
        error: error.message,
        tracks: [],
        total: 0
      };
    }
  }

  /**
   * Расшифровать URL трека с кешированием и множественными алгоритмами
   */
  async decryptTrackUrl(encryptedUrl, trackId) {
    const cacheKey = `${trackId}:${encryptedUrl}`;
    const cached = this.urlCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.stats.cacheHits++;
      return cached.url;
    }

    this.stats.cacheMisses++;
    
    try {
      // Попытка 1: Использовать старый декодер v3
      const decryptedUrl = VKAudioDecoder.decode(encryptedUrl);
      
      if (decryptedUrl && (decryptedUrl.startsWith('http://') || decryptedUrl.startsWith('https://'))) {
        this.urlCache.set(cacheKey, {
          url: decryptedUrl,
          timestamp: Date.now()
        });
        return decryptedUrl;
      }

      // Попытка 2: Использовать multi-decoder с множественными алгоритмами
      const multiResult = await this.multiDecoder.decode(encryptedUrl, 'kissvk');
      
      if (multiResult.success) {
        this.urlCache.set(cacheKey, {
          url: multiResult.url,
          timestamp: Date.now()
        });
        console.log(`[KissVK] ✓ Decoded with ${multiResult.method}`);
        return multiResult.url;
      }
      
      return null;
      
    } catch (error) {
      console.error(`[KissVK] Decryption error for track ${trackId}:`, error.message);
      return null;
    }
  }

  /**
   * Расшифровать все треки
   */
  async decryptTracks(tracks) {
    const decrypted = await Promise.all(
      tracks.map(async (track) => {
        try {
          const streamUrl = await this.decryptTrackUrl(track.encryptedUrl, track.trackId);
          return {
            ...track,
            streamUrl,
            isDecrypted: !!streamUrl
          };
        } catch (error) {
          return {
            ...track,
            streamUrl: null,
            isDecrypted: false
          };
        }
      })
    );

    const successCount = decrypted.filter(t => t.isDecrypted).length;
    console.log(`[KissVK] Decrypted ${successCount}/${tracks.length} tracks`);
    
    return decrypted;
  }

  /**
   * Получить треки с главной страницы
   */
  async getHomeTracks(limit = 50) {
    const result = await this.extractTracks('/', limit);
    if (result.success) {
      result.tracks = await this.decryptTracks(result.tracks);
    }
    return result;
  }

  /**
   * Получить новые треки (с главной страницы)
   */
  async getNewTracks(limit = 50) {
    const result = await this.extractTracks('/', limit);
    if (result.success) {
      result.tracks = await this.decryptTracks(result.tracks);
    }
    return result;
  }

  /**
   * Получить чарт треков (с главной страницы)
   */
  async getChartTracks(limit = 50) {
    const result = await this.extractTracks('/', limit);
    if (result.success) {
      result.tracks = await this.decryptTracks(result.tracks);
    }
    return result;
  }

  /**
   * Получить треки плейлиста/альбома
   */
  async getPlaylistTracks(playlistUrl, limit = 100) {
    const result = await this.extractTracks(playlistUrl, limit);
    if (result.success) {
      result.tracks = await this.decryptTracks(result.tracks);
    }
    return result;
  }

  /**
   * Поиск треков
   */
  async searchTracks(query, limit = 20) {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const result = await this.extractTracks(searchUrl, limit);
      
      if (result.success) {
        result.tracks = await this.decryptTracks(result.tracks);
      }
      
      return result;
    } catch (error) {
      console.error('[KissVK] Search error:', error.message);
      return {
        success: false,
        error: error.message,
        tracks: [],
        total: 0
      };
    }
  }

  /**
   * Получить альбомы
   */
  async extractAlbums(url, limit = 50) {
    try {
      const html = await this.fetchPage(`${this.baseUrl}${url}`);
      const $ = cheerio.load(html);
      const albums = [];

      $('a[href*="/album-"], a[href*="/playlist-"]').each((i, el) => {
        if (albums.length >= limit) return false;
        
        const href = $(el).attr('href');
        if (href && (href.startsWith('/album-') || href.startsWith('/playlist-'))) {
          const title = $(el).find('.title').text().trim() || 'Unknown Album';
          const author = $(el).find('.author').text().trim() || 'Unknown Artist';
          
          albums.push({
            url: href,
            title,
            author,
            type: href.startsWith('/album-') ? 'album' : 'playlist'
          });
        }
      });

      return {
        success: true,
        albums,
        total: albums.length
      };

    } catch (error) {
      console.error('[KissVK] Error extracting albums:', error.message);
      return {
        success: false,
        error: error.message,
        albums: [],
        total: 0
      };
    }
  }

  /**
   * Получить новые альбомы
   */
  async getNewAlbums(limit = 50) {
    return this.extractAlbums('/new_albums', limit);
  }

  /**
   * Получить чарт альбомов
   */
  async getChartAlbums(limit = 50) {
    return this.extractAlbums('/albums_chart', limit);
  }

  /**
   * Очистить устаревший кеш
   */
  cleanCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.urlCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.urlCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[KissVK] Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.urlCache.size,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
    };
  }

  /**
   * Сбросить статистику
   */
  resetStats() {
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }

  /**
   * Закрыть сервис
   */
  async close() {
    this.urlCache.clear();
    this.requestQueue = [];
    console.log('[KissVK] Service closed');
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new KissVKService();
      // Автоочистка кеша каждые 10 минут
      setInterval(() => instance.cleanCache(), 10 * 60 * 1000);
    }
    return instance;
  },
  KissVKService
};

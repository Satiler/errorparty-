/**
 * Download Manager Service
 * Управление загрузкой треков с retry, валидацией и кешированием
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

class DownloadManager {
  constructor() {
    this.downloadDir = process.env.MUSIC_DOWNLOAD_DIR || path.join(__dirname, '../../../uploads/music');
    this.maxRetries = 3;
    this.timeout = 60000; // 60 секунд
    this.minFileSize = 100 * 1024; // Минимум 100KB
    this.maxFileSize = 50 * 1024 * 1024; // Максимум 50MB
    
    // Статистика
    this.stats = {
      downloads: 0,
      successful: 0,
      failed: 0,
      retries: 0,
      totalBytes: 0
    };

    // Кеш загрузок
    this.downloadCache = new Map();
    
    this.initializeDownloadDir();
  }

  /**
   * Инициализация директории загрузок
   */
  async initializeDownloadDir() {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
      console.log(`[DownloadManager] Download directory: ${this.downloadDir}`);
    } catch (error) {
      console.error('[DownloadManager] Error creating download dir:', error);
    }
  }

  /**
   * Загрузить трек с retry и валидацией
   */
  async downloadTrack(trackData) {
    const { streamUrl, trackId, title, artist, source } = trackData;

    if (!streamUrl) {
      return { success: false, error: 'No stream URL provided' };
    }

    // Проверка кеша
    const cacheKey = this.getCacheKey(trackId, streamUrl);
    if (this.downloadCache.has(cacheKey)) {
      const cached = this.downloadCache.get(cacheKey);
      if (await this.fileExists(cached.filePath)) {
        console.log(`[DownloadManager] ✓ Cache hit: ${trackId}`);
        return cached;
      } else {
        this.downloadCache.delete(cacheKey);
      }
    }

    this.stats.downloads++;

    // Попытки загрузки с retry
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[DownloadManager] Downloading ${trackId} (attempt ${attempt}/${this.maxRetries})...`);
        
        const result = await this._downloadWithValidation(trackData, attempt);
        
        if (result.success) {
          this.stats.successful++;
          this.stats.totalBytes += result.fileSize;
          
          // Сохраняем в кеш
          this.downloadCache.set(cacheKey, result);
          
          return result;
        }

      } catch (error) {
        console.error(`[DownloadManager] Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          this.stats.retries++;
          await this.sleep(2000 * attempt); // Exponential backoff
        }
      }
    }

    this.stats.failed++;
    return { 
      success: false, 
      error: `Failed after ${this.maxRetries} attempts`,
      trackId 
    };
  }

  /**
   * Внутренний метод загрузки с валидацией
   */
  async _downloadWithValidation(trackData, attempt) {
    const { streamUrl, trackId, title, artist, source } = trackData;
    
    // Генерируем безопасное имя файла
    const filename = this.sanitizeFilename(`${artist} - ${title}`, trackId);
    const filePath = path.join(this.downloadDir, filename);

    // Скачивание файла
    const response = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      timeout: this.timeout,
      maxContentLength: this.maxFileSize,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/mpeg,audio/*,*/*',
        'Referer': this.getReferer(source)
      }
    });

    // Проверка Content-Type
    const contentType = response.headers['content-type'] || '';
    if (!this.isValidAudioType(contentType)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    // Проверка размера
    const contentLength = parseInt(response.headers['content-length'] || '0');
    if (contentLength > 0) {
      if (contentLength < this.minFileSize) {
        throw new Error(`File too small: ${contentLength} bytes`);
      }
      if (contentLength > this.maxFileSize) {
        throw new Error(`File too large: ${contentLength} bytes`);
      }
    }

    // Сохранение файла
    const writer = require('fs').createWriteStream(filePath);
    await pipeline(response.data, writer);

    // Валидация сохраненного файла
    const stats = await fs.stat(filePath);
    if (stats.size < this.minFileSize) {
      await fs.unlink(filePath);
      throw new Error(`Downloaded file too small: ${stats.size} bytes`);
    }

    // Проверка MP3 заголовка
    const isValidMP3 = await this.validateMP3(filePath);
    if (!isValidMP3) {
      await fs.unlink(filePath);
      throw new Error('Invalid MP3 file');
    }

    console.log(`[DownloadManager] ✓ Downloaded: ${filename} (${this.formatBytes(stats.size)})`);

    return {
      success: true,
      trackId,
      filePath,
      filename,
      fileSize: stats.size,
      contentType,
      downloadedAt: new Date(),
      attempt
    };
  }

  /**
   * Массовая загрузка треков
   */
  async downloadMany(tracks, concurrency = 3) {
    const results = [];
    const queue = [...tracks];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(track => this.downloadTrack(track))
      );
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    console.log(`[DownloadManager] Batch complete: ${successful}/${tracks.length} successful`);

    return results;
  }

  /**
   * Валидация MP3 файла по magic bytes
   */
  async validateMP3(filePath) {
    try {
      const fd = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(4);
      await fd.read(buffer, 0, 4, 0);
      await fd.close();

      // ID3v2 tag (49 44 33)
      if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        return true;
      }

      // MP3 frame sync (FF FB, FF F3, FF F2)
      if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DownloadManager] MP3 validation error:', error.message);
      return false;
    }
  }

  /**
   * Проверка типа контента
   */
  isValidAudioType(contentType) {
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/x-mpeg',
      'audio/mpeg3',
      'audio/x-mpeg-3',
      'application/octet-stream'
    ];
    
    return validTypes.some(type => contentType.toLowerCase().includes(type));
  }

  /**
   * Безопасное имя файла
   */
  sanitizeFilename(name, trackId) {
    // Удаляем опасные символы
    let safe = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    
    // Ограничиваем длину
    if (safe.length > 200) {
      safe = safe.substring(0, 200);
    }

    // Добавляем уникальный ID и расширение
    const hash = crypto.createHash('md5').update(trackId.toString()).digest('hex').substring(0, 8);
    return `${safe}_${hash}.mp3`;
  }

  /**
   * Получить referer для источника
   */
  getReferer(source) {
    const referers = {
      'kissvk': 'https://kissvk.top/',
      'hitmo': 'https://eu.hitmo-top.com/',
      'musify': 'https://musify.club/',
      'promodj': 'https://promodj.me/',
      'default': 'https://google.com/'
    };
    
    return referers[source] || referers.default;
  }

  /**
   * Генерация ключа кеша
   */
  getCacheKey(trackId, url) {
    return crypto.createHash('md5').update(`${trackId}:${url}`).digest('hex');
  }

  /**
   * Проверка существования файла
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Форматирование размера
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Задержка
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить статистику
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.downloadCache.size,
      successRate: this.stats.downloads > 0 
        ? (this.stats.successful / this.stats.downloads * 100).toFixed(2) + '%'
        : '0%',
      totalSize: this.formatBytes(this.stats.totalBytes)
    };
  }

  /**
   * Очистка кеша
   */
  clearCache() {
    this.downloadCache.clear();
    console.log('[DownloadManager] Cache cleared');
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new DownloadManager();
    }
    return instance;
  },
  DownloadManager
};

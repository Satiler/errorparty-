/**
 * Audio Downloader Service - Менеджер загрузки аудио файлов в Docker окружении
 * Поддерживает retry, валидацию, метаданные и работу с volume
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

class AudioDownloaderService {
  constructor() {
    // Docker volume path - монтируется в docker-compose.yml
    this.downloadPath = process.env.AUDIO_DOWNLOAD_PATH || '/app/uploads/audio';
    this.maxRetries = 3;
    this.timeout = 30000; // 30 секунд
    this.maxFileSize = 50 * 1024 * 1024; // 50 MB
  }

  /**
   * Инициализация - создание директорий
   */
  async init() {
    try {
      await fs.mkdir(this.downloadPath, { recursive: true });
      console.log(`[AudioDownloader] Initialized: ${this.downloadPath}`);
    } catch (error) {
      console.error('[AudioDownloader] Init error:', error.message);
      throw error;
    }
  }

  /**
   * Скачивание аудио файла с retry
   */
  async download(url, options = {}) {
    const {
      filename = this.generateFilename(url),
      retries = this.maxRetries,
      metadata = {},
      validate = true
    } = options;

    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[AudioDownloader] Attempt ${attempt}/${retries}: ${filename}`);
        
        const result = await this.downloadFile(url, filename, metadata);
        
        if (validate) {
          const isValid = await this.validateAudioFile(result.filepath);
          if (!isValid) {
            throw new Error('Downloaded file is not a valid audio file');
          }
        }

        console.log(`[AudioDownloader] ✅ Success: ${filename}`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`[AudioDownloader] ❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          console.log(`[AudioDownloader] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Основная функция скачивания
   */
  async downloadFile(url, filename, metadata) {
    await this.init();

    const filepath = path.join(this.downloadPath, filename);
    const tempPath = `${filepath}.tmp`;

    try {
      // Проверка существования файла
      try {
        await fs.access(filepath);
        console.log(`[AudioDownloader] File already exists: ${filename}`);
        
        const stats = await fs.stat(filepath);
        return {
          success: true,
          filepath,
          filename,
          size: stats.size,
          cached: true,
          url: `/uploads/audio/${filename}` // Public URL для frontend
        };
      } catch {
        // Файл не существует, продолжаем скачивание
      }

      // Скачивание с потоковой записью
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: this.timeout,
        maxContentLength: this.maxFileSize,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/*,*/*'
        }
      });

      // Проверка Content-Type
      const contentType = response.headers['content-type'] || '';
      if (!this.isAudioContentType(contentType)) {
        console.warn(`[AudioDownloader] Warning: Unexpected content-type: ${contentType}`);
      }

      // Записываем во временный файл
      const writer = require('fs').createWriteStream(tempPath);
      await pipeline(response.data, writer);

      // Получаем размер файла
      const stats = await fs.stat(tempPath);
      
      // Переименовываем из .tmp в финальное имя
      await fs.rename(tempPath, filepath);

      // Сохраняем метаданные
      if (Object.keys(metadata).length > 0) {
        await this.saveMetadata(filepath, metadata);
      }

      return {
        success: true,
        filepath,
        filename,
        size: stats.size,
        contentType,
        cached: false,
        url: `/uploads/audio/${filename}`
      };

    } catch (error) {
      // Очистка временного файла при ошибке
      try {
        await fs.unlink(tempPath);
      } catch {}

      throw error;
    }
  }

  /**
   * Batch скачивание нескольких файлов
   */
  async downloadBatch(tracks, options = {}) {
    const {
      concurrency = 3, // Ограничение одновременных загрузок
      continueOnError = true
    } = options;

    const results = [];
    const queue = [...tracks];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(track => 
          this.download(track.url, {
            filename: track.filename || this.generateFilename(track.url, track),
            metadata: track.metadata || {}
          })
        )
      );

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const track = batch[i];

        if (result.status === 'fulfilled') {
          results.push({
            ...track,
            download: result.value,
            success: true
          });
        } else {
          results.push({
            ...track,
            error: result.reason?.message,
            success: false
          });

          if (!continueOnError) {
            throw result.reason;
          }
        }
      }
    }

    return results;
  }

  /**
   * Валидация аудио файла
   */
  async validateAudioFile(filepath) {
    try {
      const stats = await fs.stat(filepath);
      
      // Проверка минимального размера (исключаем битые файлы)
      if (stats.size < 1024) { // Меньше 1KB
        return false;
      }

      // Проверка магических байтов для MP3
      const buffer = Buffer.alloc(3);
      const fd = await fs.open(filepath, 'r');
      await fd.read(buffer, 0, 3, 0);
      await fd.close();

      // MP3 magic bytes: FF FB или FF F3 или FF F2 или ID3
      const isMP3 = (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) ||
                    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33); // ID3

      return isMP3;
      
    } catch (error) {
      console.error('[AudioDownloader] Validation error:', error.message);
      return false;
    }
  }

  /**
   * Генерация имени файла
   */
  generateFilename(url, metadata = {}) {
    const { artist, title } = metadata;
    
    if (artist && title) {
      // Очистка от запрещенных символов
      const clean = (str) => str.replace(/[^a-zA-Z0-9а-яА-Я\s-]/g, '').trim();
      const filename = `${clean(artist)}_-_${clean(title)}`.substring(0, 100);
      return `${filename}_${Date.now()}.mp3`;
    }

    // Генерация на основе URL
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `audio_${hash}.mp3`;
  }

  /**
   * Сохранение метаданных файла
   */
  async saveMetadata(filepath, metadata) {
    const metaPath = `${filepath}.meta.json`;
    
    try {
      await fs.writeFile(metaPath, JSON.stringify({
        ...metadata,
        downloadedAt: new Date().toISOString(),
        filepath
      }, null, 2));
    } catch (error) {
      console.error('[AudioDownloader] Metadata save error:', error.message);
    }
  }

  /**
   * Чтение метаданных файла
   */
  async readMetadata(filepath) {
    const metaPath = `${filepath}.meta.json`;
    
    try {
      const data = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Получение информации о файле
   */
  async getFileInfo(filename) {
    const filepath = path.join(this.downloadPath, filename);
    
    try {
      const stats = await fs.stat(filepath);
      const metadata = await this.readMetadata(filepath);
      
      return {
        exists: true,
        filepath,
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        metadata,
        url: `/uploads/audio/${filename}`
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Удаление файла
   */
  async deleteFile(filename) {
    const filepath = path.join(this.downloadPath, filename);
    const metaPath = `${filepath}.meta.json`;
    
    try {
      await fs.unlink(filepath);
      
      // Удаление метаданных
      try {
        await fs.unlink(metaPath);
      } catch {}
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Список скачанных файлов
   */
  async listFiles() {
    try {
      await this.init();
      
      const files = await fs.readdir(this.downloadPath);
      const audioFiles = files.filter(f => f.endsWith('.mp3'));
      
      const filesInfo = await Promise.all(
        audioFiles.map(filename => this.getFileInfo(filename))
      );
      
      return filesInfo.filter(f => f.exists);
      
    } catch (error) {
      console.error('[AudioDownloader] List files error:', error.message);
      return [];
    }
  }

  /**
   * Очистка старых файлов
   */
  async cleanup(olderThanDays = 30) {
    try {
      const files = await this.listFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deleted = 0;
      
      for (const file of files) {
        if (file.createdAt < cutoffDate) {
          await this.deleteFile(file.filename);
          deleted++;
        }
      }
      
      console.log(`[AudioDownloader] Cleanup: deleted ${deleted} files`);
      return { deleted };
      
    } catch (error) {
      console.error('[AudioDownloader] Cleanup error:', error.message);
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * Проверка типа контента
   */
  isAudioContentType(contentType) {
    const audioTypes = [
      'audio/',
      'application/octet-stream',
      'application/x-mpegurl',
      'video/mp2t' // HLS segments
    ];
    
    return audioTypes.some(type => contentType.includes(type));
  }

  /**
   * Утилита задержки
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new AudioDownloaderService();
  }
  return instance;
}

module.exports = {
  AudioDownloaderService,
  getInstance
};

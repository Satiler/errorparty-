/**
 * Local Provider
 * Провайдер для локальных аудио файлов
 */

const MusicProvider = require('./base-provider');
const fs = require('fs').promises;
const path = require('path');

class LocalProvider extends MusicProvider {
  constructor() {
    super('local');
    // Use absolute path from app root
    this.uploadsDir = path.join(process.cwd(), 'uploads/music');
  }

  /**
   * Поиск локальных треков
   * (В данном случае используется БД, но провайдер предоставляет интерфейс)
   */
  async search(query, options = {}) {
    // Локальный провайдер обычно не используется для поиска
    // Поиск происходит через БД напрямую
    return [];
  }

  /**
   * Получить информацию о локальном треке
   */
  async getTrack(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        return null;
      }

      return {
        filePath: fullPath,
        fileSize: stats.size,
        provider: this.name,
        isLocal: true
      };
    } catch (error) {
      console.error('[LocalProvider] getTrack error:', error.message);
      return null;
    }
  }

  /**
   * Получить прямую ссылку (для локальных файлов - это путь к файлу)
   */
  async getDirectUrl(track) {
    if (track.filePath && !track.filePath.startsWith('http')) {
      return track.filePath;
    }
    return null;
  }

  /**
   * Проверить доступность локального файла
   */
  async isAvailable(track) {
    if (!track || !track.filePath || track.filePath.startsWith('http')) {
      return false;
    }

    try {
      const fullPath = this.resolveFilePath(track.filePath);
      await fs.access(fullPath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Скачать и сохранить трек локально
   */
  async downloadAndSave(trackId, sourceUrl) {
    const axios = require('axios');
    const fileName = `track_${trackId}.mp3`;
    const filePath = path.join(this.uploadsDir, fileName);

    try {
      // Создать директорию если не существует
      await fs.mkdir(this.uploadsDir, { recursive: true });

      // Скачать файл
      const response = await axios({
        method: 'GET',
        url: sourceUrl,
        responseType: 'stream',
        timeout: 60000,
        headers: {
          'User-Agent': 'ErrorParty/1.0'
        }
      });

      // Сохранить в файл
      const writer = require('fs').createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`[LocalProvider] Downloaded track ${trackId} to ${fileName}`);

      return {
        filePath: `/uploads/music/${fileName}`,
        fileSize: (await fs.stat(filePath)).size,
        provider: this.name
      };

    } catch (error) {
      console.error('[LocalProvider] Download error:', error.message);
      // Удалить частично скачанный файл
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // Игнорировать ошибку удаления
      }
      throw error;
    }
  }

  /**
   * Удалить локальный файл
   */
  async deleteFile(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      await fs.unlink(fullPath);
      console.log(`[LocalProvider] Deleted file: ${filePath}`);
      return true;
    } catch (error) {
      console.error('[LocalProvider] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Получить размер файла
   */
  async getFileSize(filePath) {
    try {
      const fullPath = this.resolveFilePath(filePath);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Преобразовать относительный путь в абсолютный
   */
  resolveFilePath(filePath) {
    // Если путь уже абсолютный
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Если путь относительный от /uploads/music/
    if (filePath.startsWith('/uploads/music/')) {
      return path.join(process.cwd(), filePath);
    }

    // Если путь относительный от корня uploads
    if (filePath.startsWith('uploads/')) {
      return path.join(process.cwd(), filePath);
    }

    // Иначе считаем что это файл в директории music
    return path.join(this.uploadsDir, path.basename(filePath));
  }

  /**
   * Получить статистику локального хранилища
   */
  async getStorageStats() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        if (file.endsWith('.mp3') || file.endsWith('.flac') || file.endsWith('.wav')) {
          const filePath = path.join(this.uploadsDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          fileCount++;
        }
      }

      return {
        fileCount,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        directory: this.uploadsDir
      };
    } catch (error) {
      console.error('[LocalProvider] Storage stats error:', error.message);
      return {
        fileCount: 0,
        totalSize: 0,
        totalSizeMB: '0',
        directory: this.uploadsDir,
        error: error.message
      };
    }
  }
}

module.exports = new LocalProvider();

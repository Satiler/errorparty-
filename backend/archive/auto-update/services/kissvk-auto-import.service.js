const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/kissvk-config');
const db = require('../config/database');

class KissVKAutoImportService {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.stats = {
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0
    };
  }

  /**
   * Автоматический импорт новых релизов
   */
  async importNewReleases() {
    logger.info('Начало импорта новых релизов с kissvk...');
    
    try {
      const releases = await this.fetchNewReleases();
      logger.info(`Найдено ${releases.length} новых релизов`);

      for (const release of releases) {
        try {
          // Проверка дубликатов
          if (await this.isDuplicate(release)) {
            this.stats.duplicates++;
            logger.debug(`Пропуск дубликата: ${release.artist} - ${release.title}`);
            continue;
          }

          // Скачивание трека
          const filePath = await this.downloadTrack(release);
          
          if (filePath) {
            // Сохранение в БД
            await this.saveToDatabase(release, filePath);
            this.stats.imported++;
            logger.info(`✓ Импортирован: ${release.artist} - ${release.title}`);
          } else {
            this.stats.skipped++;
          }

          // Задержка между загрузками
          await this.delay(config.scraping.requestDelay);
        } catch (error) {
          this.stats.errors++;
          logger.error(`Ошибка импорта трека ${release.title}:`, error.message);
        }
      }

      logger.info('Импорт завершён:', this.stats);
      return this.stats;
    } catch (error) {
      logger.error('Ошибка импорта новых релизов:', error);
      throw error;
    }
  }

  /**
   * Получить список новых релизов с kissvk
   */
  async fetchNewReleases() {
    try {
      const url = `${this.baseUrl}/new`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': config.scraping.userAgent
        },
        timeout: config.scraping.requestTimeout
      });

      const $ = cheerio.load(response.data);
      const releases = [];

      // Парсинг страницы новинок
      $('.track-item, .music-item, .song-item').each((index, element) => {
        const $el = $(element);
        
        const title = $el.find('.track-title, .song-title').text().trim();
        const artist = $el.find('.track-artist, .artist-name').text().trim();
        const duration = $el.find('.track-duration, .duration').text().trim();
        const downloadUrl = $el.find('a[data-download], .download-link').attr('href');
        const coverUrl = $el.find('img').attr('src');

        if (title && artist && downloadUrl) {
          releases.push({
            title,
            artist,
            duration: this.parseDuration(duration),
            downloadUrl: downloadUrl.startsWith('http') ? downloadUrl : `${this.baseUrl}${downloadUrl}`,
            coverUrl: coverUrl ? (coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`) : null,
            source: 'kissvk',
            fetchedAt: new Date()
          });
        }
      });

      return releases.slice(0, config.importCategories.newReleases.maxItems);
    } catch (error) {
      logger.error('Ошибка получения новых релизов:', error);
      throw error;
    }
  }

  /**
   * Получить топ-чарты
   */
  async fetchTopCharts() {
    try {
      const url = `${this.baseUrl}/charts`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': config.scraping.userAgent
        },
        timeout: config.scraping.requestTimeout
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.chart-item, .top-track').each((index, element) => {
        const $el = $(element);
        
        const position = $el.find('.position, .rank').text().trim();
        const title = $el.find('.track-title').text().trim();
        const artist = $el.find('.track-artist').text().trim();
        const downloadUrl = $el.find('a[data-download]').attr('href');

        if (title && artist && downloadUrl) {
          tracks.push({
            position: parseInt(position) || index + 1,
            title,
            artist,
            downloadUrl: downloadUrl.startsWith('http') ? downloadUrl : `${this.baseUrl}${downloadUrl}`,
            source: 'kissvk',
            fetchedAt: new Date()
          });
        }
      });

      return tracks.slice(0, config.importCategories.topCharts.maxItems);
    } catch (error) {
      logger.error('Ошибка получения топ-чартов:', error);
      throw error;
    }
  }

  /**
   * Скачать трек
   */
  async downloadTrack(release) {
    try {
      // Создание директории
      const artistDir = path.join(
        config.storage.localPath,
        this.sanitizeFilename(release.artist)
      );
      await fs.mkdir(artistDir, { recursive: true });

      // Имя файла
      const filename = config.storage.filenamePattern
        .replace('{artist}', release.artist)
        .replace('{title}', release.title);
      const filePath = path.join(artistDir, `${this.sanitizeFilename(filename)}.mp3`);

      // Проверка существования файла
      try {
        await fs.access(filePath);
        logger.debug(`Файл уже существует: ${filePath}`);
        return filePath;
      } catch {
        // Файл не существует, продолжаем загрузку
      }

      // Загрузка файла
      const response = await axios.get(release.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: config.storage.maxFileSize,
        headers: {
          'User-Agent': config.scraping.userAgent
        }
      });

      // Проверка размера
      if (response.data.length > config.storage.maxFileSize) {
        logger.warn(`Файл слишком большой: ${release.title}`);
        return null;
      }

      // Сохранение файла
      await fs.writeFile(filePath, response.data);
      logger.info(`Файл сохранён: ${filePath}`);

      // Загрузка обложки
      if (release.coverUrl) {
        await this.downloadCover(release.coverUrl, artistDir, release.title);
      }

      return filePath;
    } catch (error) {
      logger.error(`Ошибка загрузки трека ${release.title}:`, error.message);
      return null;
    }
  }

  /**
   * Скачать обложку
   */
  async downloadCover(coverUrl, directory, trackTitle) {
    try {
      const response = await axios.get(coverUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: config.metadata.coverMaxSize * 1024
      });

      const ext = path.extname(coverUrl).split('?')[0] || '.jpg';
      const coverPath = path.join(directory, `${this.sanitizeFilename(trackTitle)}${ext}`);
      
      await fs.writeFile(coverPath, response.data);
      return coverPath;
    } catch (error) {
      logger.error('Ошибка загрузки обложки:', error.message);
      return null;
    }
  }

  /**
   * Сохранить в базу данных
   */
  async saveToDatabase(release, filePath) {
    try {
      const cdnUrl = filePath.replace(
        config.storage.localPath,
        config.storage.cdnUrl
      ).replace(/\\/g, '/');

      const query = `
        INSERT INTO tracks (title, artist, duration, file_path, stream_url, cover_url, source, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;

      const values = [
        release.title,
        release.artist,
        release.duration || 0,
        filePath,
        cdnUrl,
        release.coverUrl,
        'kissvk'
      ];

      const result = await db.query(query, values);
      logger.info(`Трек сохранён в БД с ID: ${result.rows[0].id}`);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Ошибка сохранения в БД:', error);
      throw error;
    }
  }

  /**
   * Проверка дубликатов
   */
  async isDuplicate(release) {
    if (!config.deduplication.enabled) {
      return false;
    }

    try {
      const query = `
        SELECT id FROM tracks
        WHERE LOWER(title) = LOWER($1)
        AND LOWER(artist) = LOWER($2)
        AND source = 'kissvk'
        LIMIT 1
      `;

      const result = await db.query(query, [release.title, release.artist]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Ошибка проверки дубликатов:', error);
      return false;
    }
  }

  /**
   * Парсинг длительности из строки (например, "3:45")
   */
  parseDuration(durationStr) {
    if (!durationStr) return 0;
    
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }

  /**
   * Очистка имени файла
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить статистику импорта
   */
  getStats() {
    return this.stats;
  }

  /**
   * Сброс статистики
   */
  resetStats() {
    this.stats = {
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0
    };
  }
}

module.exports = new KissVKAutoImportService();

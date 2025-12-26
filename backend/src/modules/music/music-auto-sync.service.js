const axios = require('axios');
const cheerio = require('cheerio');
const { Track, Album } = require('../../models');
const { Sequelize } = require('sequelize');
const lmusicKzService = require('./lmusic-kz.service');

/**
 * Сервис автоматической синхронизации музыки
 * - Импорт новинок и популярных треков
 * - Дедупликация по названию + исполнителю
 * - Анализ типа контента (новинки, чарты, классика)
 */
class MusicAutoSyncService {
  constructor() {
    this.baseUrl = 'https://lmusic.kz';
    this.importedToday = new Set();
  }

  /**
   * Нормализация строки для сравнения (убираем спецсимволы, лишние пробелы)
   */
  normalizeString(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s\u0400-\u04FF]/g, '') // Только буквы, цифры, пробелы (включая кириллицу)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Извлечение основного исполнителя (первый в списке)
   */
  extractMainArtist(artistString) {
    if (!artistString) return 'Unknown';
    
    // Убираем дубликаты
    const artists = artistString.split(',').map(a => a.trim()).filter(Boolean);
    const unique = [...new Set(artists)];
    
    // Возвращаем первого
    return unique[0] || 'Unknown';
  }

  /**
   * Проверка существования трека в базе (по нормализованным название + исполнитель)
   */
  async checkDuplicate(title, artist) {
    const normalizedTitle = this.normalizeString(title);
    const normalizedArtist = this.normalizeString(artist);

    const existing = await Track.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', 
          Sequelize.fn('REGEXP_REPLACE', 
            Sequelize.col('title'), 
            '[^A-Za-z0-9А-Яа-яЁё\\s]', 
            '', 
            'g'
          )
        ),
        normalizedTitle
      ),
      attributes: ['id', 'title', 'artist', 'externalSource']
    });

    if (!existing) return null;

    // Дополнительная проверка исполнителя
    const existingArtist = this.normalizeString(existing.artist);
    if (existingArtist === normalizedArtist) {
      return existing;
    }

    return null;
  }

  /**
   * Анализ типа трека на основе метаданных
   */
  analyzeTrackType(track, pageContext = {}) {
    const now = new Date();
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
    
    // Проверяем наличие слов "новинка", "премьера", "2025" в названии
    const title = track.title.toLowerCase();
    const isNewRelease = 
      title.includes('2025') ||
      title.includes('2024') ||
      title.includes('премьера') ||
      title.includes('новинка') ||
      pageContext.type === 'new';

    const isChart = pageContext.type === 'chart' || pageContext.isTopPage;
    const isClassic = track.year && parseInt(track.year) < 2020;

    return {
      isNew: isNewRelease,
      isChart,
      isClassic,
      category: isNewRelease ? 'premiere' : isChart ? 'chart' : 'catalog'
    };
  }

  /**
   * Парсинг страницы чартов/новинок
   */
  async parseChartPage(url, pageType = 'chart') {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Ищем треки на странице (множественные селекторы)
      const trackSelectors = [
        '.track-item',
        '.song-item', 
        '.music-track',
        'article.track',
        '.track-list .item'
      ];

      let $tracks = $();
      for (const selector of trackSelectors) {
        $tracks = $(selector);
        if ($tracks.length > 0) break;
      }

      console.log(`[Chart Parser] Found ${$tracks.length} tracks on ${url}`);

      $tracks.each((i, elem) => {
        const $track = $(elem);

        // Пробуем разные селекторы для названия
        const title = $track.find('.track-title, .song-title, .title, h3, h4').first().text().trim()
          || $track.find('a[href*="/track/"]').first().text().trim();

        // Пробуем найти исполнителя
        const artist = $track.find('.track-artist, .artist, .author').first().text().trim()
          || $track.find('a[href*="/artist/"]').first().text().trim()
          || 'Unknown';

        // Ссылка на скачивание
        const downloadUrl = $track.find('a[href*="/api/download/"], a[download]').attr('href')
          || $track.find('button[data-url]').attr('data-url');

        if (title && downloadUrl) {
          const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${this.baseUrl}${downloadUrl}`;
          
          tracks.push({
            title,
            artist: this.extractMainArtist(artist),
            downloadUrl: fullUrl,
            sourceUrl: url,
            pageType
          });
        }
      });

      return tracks;
    } catch (error) {
      console.error(`[Chart Parser] Error parsing ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Импорт треков из чартов
   */
  async importFromCharts(limit = 50) {
    console.log('\n🎵 === ИМПОРТ ИЗ ЧАРТОВ ===');
    
    const chartUrls = [
      { url: 'https://lmusic.kz/charts/top-100', type: 'chart', name: 'Top 100' },
      { url: 'https://lmusic.kz/genres/pop-music/rus', type: 'chart', name: 'Russian Pop' },
      { url: 'https://lmusic.kz/genres/hip-hop/rus', type: 'chart', name: 'Russian Hip-Hop' }
    ];

    const results = {
      imported: [],
      skipped: [],
      errors: []
    };

    for (const chart of chartUrls) {
      console.log(`\n📊 Парсинг чарта: ${chart.name}`);
      const tracks = await this.parseChartPage(chart.url, chart.type);

      let imported = 0;
      for (const trackData of tracks.slice(0, limit)) {
        if (imported >= limit) break;

        try {
          // Проверка дубликата
          const duplicate = await this.checkDuplicate(trackData.title, trackData.artist);
          if (duplicate) {
            console.log(`⏭️  Пропуск дубликата: ${trackData.title} - ${trackData.artist}`);
            results.skipped.push({ title: trackData.title, reason: 'duplicate' });
            continue;
          }

          // Анализ типа трека
          const analysis = this.analyzeTrackType(trackData, { type: chart.type, isTopPage: true });

          // Создание трека
          const track = await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            filePath: trackData.downloadUrl,
            externalSource: 'lmusic.kz',
            externalUrl: trackData.downloadUrl,
            sourceType: 'external',
            sourceUrl: trackData.sourceUrl,
            genre: chart.name,
            features: {
              category: analysis.category,
              isNew: analysis.isNew,
              isChart: analysis.isChart,
              importedAt: new Date().toISOString()
            }
          });

          console.log(`✅ Импортирован: ${track.title} - ${track.artist} [${analysis.category}]`);
          results.imported.push(track);
          imported++;

        } catch (error) {
          console.error(`❌ Ошибка импорта ${trackData.title}:`, error.message);
          results.errors.push({ title: trackData.title, error: error.message });
        }
      }
    }

    console.log(`\n📈 Итого импортировано: ${results.imported.length}`);
    console.log(`⏭️  Пропущено дубликатов: ${results.skipped.length}`);
    console.log(`❌ Ошибок: ${results.errors.length}`);

    return results;
  }

  /**
   * Импорт только новинок (треки с 2024-2025 в названии или со страницы новинок)
   */
  async importNewReleases(limit = 30) {
    console.log('\n🆕 === ИМПОРТ НОВИНОК ===');
    
    const newReleasesUrls = [
      'https://lmusic.kz/new/rus',
      'https://lmusic.kz/new/world'
    ];

    const results = {
      imported: [],
      skipped: [],
      errors: []
    };

    for (const url of newReleasesUrls) {
      const tracks = await this.parseChartPage(url, 'new');

      let imported = 0;
      for (const trackData of tracks.slice(0, limit)) {
        if (imported >= limit) break;

        try {
          const duplicate = await this.checkDuplicate(trackData.title, trackData.artist);
          if (duplicate) {
            results.skipped.push({ title: trackData.title, reason: 'duplicate' });
            continue;
          }

          const track = await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            filePath: trackData.downloadUrl,
            externalSource: 'lmusic.kz',
            externalUrl: trackData.downloadUrl,
            sourceType: 'external',
            sourceUrl: trackData.sourceUrl,
            features: {
              category: 'premiere',
              isNew: true,
              importedAt: new Date().toISOString()
            }
          });

          console.log(`✅ Новинка: ${track.title} - ${track.artist}`);
          results.imported.push(track);
          imported++;

        } catch (error) {
          console.error(`❌ Ошибка: ${error.message}`);
          results.errors.push({ title: trackData.title, error: error.message });
        }
      }
    }

    console.log(`\n🆕 Импортировано новинок: ${results.imported.length}`);
    return results;
  }

  /**
   * Полная синхронизация (чарты + новинки)
   */
  async fullSync(options = {}) {
    const {
      chartsLimit = 50,
      newReleasesLimit = 30
    } = options;

    console.log('\n🔄 === ПОЛНАЯ СИНХРОНИЗАЦИЯ МУЗЫКИ ===');
    console.log(`Лимиты: чарты=${chartsLimit}, новинки=${newReleasesLimit}`);

    const results = {
      charts: await this.importFromCharts(chartsLimit),
      newReleases: await this.importNewReleases(newReleasesLimit),
      timestamp: new Date().toISOString()
    };

    const totalImported = results.charts.imported.length + results.newReleases.imported.length;
    const totalSkipped = results.charts.skipped.length + results.newReleases.skipped.length;

    console.log('\n✨ === СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА ===');
    console.log(`✅ Всего импортировано: ${totalImported}`);
    console.log(`⏭️  Всего пропущено: ${totalSkipped}`);

    return results;
  }

  /**
   * Получение статистики библиотеки
   */
  async getLibraryStats() {
    const total = await Track.count();
    const external = await Track.count({ where: { sourceType: 'external' } });
    const local = await Track.count({ where: { sourceType: 'local' } });
    
    const newReleases = await Track.count({
      where: {
        features: {
          [Sequelize.Op.contains]: { isNew: true }
        }
      }
    });

    const charts = await Track.count({
      where: {
        features: {
          [Sequelize.Op.contains]: { isChart: true }
        }
      }
    });

    return {
      total,
      bySource: { external, local },
      categories: { newReleases, charts },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new MusicAutoSyncService();

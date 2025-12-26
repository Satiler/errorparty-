const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const config = require('../config/charts-config');

class BillboardChartsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: config.cache.ttl });
    this.baseUrl = config.billboard.baseUrl;
  }

  /**
   * Задержка между запросами
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить чарт Billboard
   */
  async getChart(chartName = 'hot-100', limit = 100) {
    const cacheKey = `billboard_${chartName}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const chartConfig = config.billboard.charts.find(c => c.name === chartName);
      if (!chartConfig) {
        throw new Error(`Неизвестный чарт: ${chartName}`);
      }

      const response = await axios.get(`${this.baseUrl}${chartConfig.url}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Парсинг структуры Billboard
      $('.o-chart-results-list-row-container').each((index, element) => {
        if (tracks.length >= limit) return false;

        const $element = $(element);
        
        const position = $element.find('.c-label.a-font-primary-bold-l').first().text().trim();
        const title = $element.find('#title-of-a-story').text().trim();
        const artist = $element.find('.c-label.a-no-trucate').first().text().trim();
        
        // Дополнительная информация
        const $stats = $element.find('.c-label.a-font-primary-s');
        const lastWeek = $stats.eq(0).text().trim() || '-';
        const peak = $stats.eq(1).text().trim() || '-';
        const weeksOnChart = $stats.eq(2).text().trim() || '-';

        if (title && artist) {
          tracks.push({
            position: parseInt(position) || index + 1,
            title: title,
            artist: artist,
            lastWeek: lastWeek !== '-' ? parseInt(lastWeek) : null,
            peakPosition: peak !== '-' ? parseInt(peak) : null,
            weeksOnChart: weeksOnChart !== '-' ? parseInt(weeksOnChart) : null,
            source: 'billboard',
            chart: chartName,
            fetchedAt: new Date()
          });
        }
      });

      // Альтернативный парсер, если основной не сработал
      if (tracks.length === 0) {
        $('.chart-list-item').each((index, element) => {
          if (tracks.length >= limit) return false;

          const $element = $(element);
          const position = $element.attr('data-rank');
          const title = $element.find('.chart-list-item__title-text').text().trim();
          const artist = $element.find('.chart-list-item__artist').text().trim();

          if (title && artist) {
            tracks.push({
              position: parseInt(position) || index + 1,
              title: title,
              artist: artist,
              source: 'billboard',
              chart: chartName,
              fetchedAt: new Date()
            });
          }
        });
      }

      this.cache.set(cacheKey, tracks);
      logger.info(`Получено ${tracks.length} треков из Billboard ${chartName}`);

      return tracks;
    } catch (error) {
      logger.error(`Ошибка получения Billboard ${chartName}:`, error.message);
      throw error;
    }
  }

  /**
   * Получить Hot 100
   */
  async getHot100(limit = 100) {
    return this.getChart('hot-100', limit);
  }

  /**
   * Получить Billboard 200
   */
  async getBillboard200(limit = 100) {
    return this.getChart('billboard-200', limit);
  }

  /**
   * Получить Global 200
   */
  async getGlobal200(limit = 100) {
    return this.getChart('global-200', limit);
  }

  /**
   * Получить все доступные чарты
   */
  async getAllCharts(limit = 50) {
    const results = {};

    for (const chart of config.billboard.charts) {
      try {
        results[chart.name] = await this.getChart(chart.name, limit);
        await this.delay(config.billboard.requestDelay);
      } catch (error) {
        logger.error(`Ошибка получения чарта ${chart.name}:`, error.message);
        results[chart.name] = [];
      }
    }

    return results;
  }

  /**
   * Поиск трека в текущих чартах
   */
  async findTrackInCharts(artist, title) {
    try {
      const charts = await this.getAllCharts(100);
      const results = [];

      for (const [chartName, tracks] of Object.entries(charts)) {
        const found = tracks.find(track => 
          track.title.toLowerCase().includes(title.toLowerCase()) &&
          track.artist.toLowerCase().includes(artist.toLowerCase())
        );

        if (found) {
          results.push({
            chart: chartName,
            position: found.position,
            ...found
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Ошибка поиска трека в Billboard:', error);
      return [];
    }
  }
}

module.exports = new BillboardChartsService();

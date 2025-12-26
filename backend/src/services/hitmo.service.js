/**
 * Hitmo-top.com Integration Service
 * Парсинг и получение треков с eu.hitmo-top.com
 */
const axios = require('axios');
const cheerio = require('cheerio');

class HitmoService {
  constructor() {
    this.baseURL = 'https://eu.hitmo-top.com';
  }

  /**
   * Поиск треков на Hitmo
   */
  async searchTracks(query, limit = 20) {
    try {
      console.log(`🔍 Searching Hitmo: "${query}"`);

      // Hitmo требует более сложные заголовки для обхода защиты
      const searchURL = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Referer': this.baseURL
        },
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 500
      });

      // Проверяем статус ответа
      if (response.status === 403 || response.status === 503) {
        console.log(`  ⚠️ Hitmo защищен CloudFlare/WAF (${response.status})`);
        return [];
      }

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Парсим результаты
      $('.track-item, .song-item, [data-track-id]').slice(0, limit).each((i, elem) => {
        try {
          const $track = $(elem);
          
          // Ищем название и артиста
          const title = $track.find('.track-title, .song-title, h3, h4').first().text().trim();
          const artist = $track.find('.track-artist, .song-artist, .artist').first().text().trim();
          
          // Ищем ссылку на скачивание/стрим
          const downloadLink = $track.find('a[href*="download"], a[href*=".mp3"]').first().attr('href');
          const trackId = $track.attr('data-track-id') || Date.now() + i;

          if (title && downloadLink) {
            tracks.push({
              id: trackId,
              title: title,
              artist: artist || 'Unknown Artist',
              streamUrl: downloadLink.startsWith('http') ? downloadLink : `${this.baseURL}${downloadLink}`,
              downloadUrl: downloadLink.startsWith('http') ? downloadLink : `${this.baseURL}${downloadLink}`,
              source: 'hitmo-top.com'
            });
          }
        } catch (error) {
          // Пропускаем проблемные элементы
        }
      });

      console.log(`  ✅ Found ${tracks.length} tracks on Hitmo`);
      return tracks;

    } catch (error) {
      console.error('Hitmo search error:', error.message);
      return [];
    }
  }

  /**
   * Получить топ треков
   */
  async getTopTracks(limit = 50) {
    try {
      console.log(`🎵 Fetching Hitmo Top ${limit}...`);

      const response = await axios.get(`${this.baseURL}/top`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track-item, .song-item').slice(0, limit).each((i, elem) => {
        try {
          const $track = $(elem);
          const title = $track.find('.track-title, .song-title').first().text().trim();
          const artist = $track.find('.track-artist, .song-artist').first().text().trim();
          const downloadLink = $track.find('a[href*="download"]').first().attr('href');

          if (title && downloadLink) {
            tracks.push({
              position: i + 1,
              title,
              artist: artist || 'Unknown Artist',
              streamUrl: downloadLink.startsWith('http') ? downloadLink : `${this.baseURL}${downloadLink}`,
              source: 'hitmo-top.com'
            });
          }
        } catch (error) {
          // Пропускаем
        }
      });

      console.log(`✅ Found ${tracks.length} tracks in Hitmo Top`);
      return tracks;

    } catch (error) {
      console.error('Hitmo top tracks error:', error.message);
      return [];
    }
  }
}

module.exports = new HitmoService();

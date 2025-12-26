/**
 * PromoDJ.me Integration Service
 * Парсинг и получение треков с promodj.me
 */
const axios = require('axios');
const cheerio = require('cheerio');

class PromodjService {
  constructor() {
    this.baseURL = 'https://promodj.me';
  }

  /**
   * Поиск треков на PromoDJ
   */
  async searchTracks(query, limit = 20) {
    try {
      console.log(`🔍 Searching PromoДJ: "${query}"`);

      // Сначала пробуем парсить HTML со страницы поиска
      const searchURL = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Парсим ссылки на треки из результатов поиска
      $('a[href*="/song/"]').slice(0, limit).each((i, elem) => {
        try {
          const $link = $(elem);
          const href = $link.attr('href');
          const match = href.match(/\/song\/(\d+)/);
          
          if (match) {
            const trackId = match[1];
            const $parent = $link.closest('div, li, tr');
            
            // Название трека
            const title = $link.text().trim();
            
            // Ищем артиста рядом
            const artistLink = $parent.find('a[href*="/artist/"]').first();
            const artist = artistLink.length ? artistLink.text().trim() : 'Unknown Artist';

            if (title && title.length > 2) {
              tracks.push({
                id: trackId,
                title: title,
                artist: artist,
                streamUrl: `${this.baseURL}/download/${trackId}`,
                downloadUrl: `${this.baseURL}/download/${trackId}`,
                source: 'promodj.me'
              });
            }
          }
        } catch (error) {
          // Пропускаем проблемные элементы
        }
      });

      console.log(`  ✅ Found ${tracks.length} tracks on PromoДJ`);
      return tracks;

    } catch (error) {
      console.error('PromoДJ search error:', error.message);
      return [];
    }
  }

  /**
   * Получить популярные треки
   */
  async getPopularTracks(limit = 50) {
    try {
      console.log(`🎵 Fetching PromoДJ Popular ${limit}...`);

      const response = await axios.get(`${this.baseURL}/popular`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track, .music-track').slice(0, limit).each((i, elem) => {
        try {
          const $track = $(elem);
          const title = $track.find('.track__title, .music-title').first().text().trim();
          const artist = $track.find('.track__artist, .music-artist').first().text().trim();
          const streamUrl = $track.find('a[href*=".mp3"]').first().attr('href');

          if (title && streamUrl) {
            tracks.push({
              position: i + 1,
              title,
              artist: artist || 'Unknown Artist',
              streamUrl: streamUrl.startsWith('http') ? streamUrl : `${this.baseURL}${streamUrl}`,
              source: 'promodj.me'
            });
          }
        } catch (error) {
          // Пропускаем
        }
      });

      console.log(`✅ Found ${tracks.length} popular tracks on PromoДJ`);
      return tracks;

    } catch (error) {
      console.error('PromoДJ popular tracks error:', error.message);
      return [];
    }
  }

  /**
   * Получить треки по жанру
   */
  async getTracksByGenre(genre = 'house', limit = 30) {
    try {
      console.log(`🎵 Fetching PromoДJ ${genre} tracks...`);

      const response = await axios.get(`${this.baseURL}/genre/${genre}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track, .music-track').slice(0, limit).each((i, elem) => {
        try {
          const $track = $(elem);
          const title = $track.find('.track__title').first().text().trim();
          const artist = $track.find('.track__artist').first().text().trim();
          const streamUrl = $track.find('a[href*=".mp3"]').first().attr('href');

          if (title && streamUrl) {
            tracks.push({
              title,
              artist: artist || 'Unknown Artist',
              streamUrl: streamUrl.startsWith('http') ? streamUrl : `${this.baseURL}${streamUrl}`,
              genre,
              source: 'promodj.me'
            });
          }
        } catch (error) {
          // Пропускаем
        }
      });

      console.log(`✅ Found ${tracks.length} ${genre} tracks`);
      return tracks;

    } catch (error) {
      console.error(`PromoДJ ${genre} error:`, error.message);
      return [];
    }
  }
}

module.exports = new PromodjService();

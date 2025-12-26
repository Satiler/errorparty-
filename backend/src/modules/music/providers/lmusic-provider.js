/**
 * Lmusic.kz Provider
 * Провайдер для получения музыки с lmusic.kz
 */

const MusicProvider = require('./base-provider');
const axios = require('axios');
const cheerio = require('cheerio');

class LmusicProvider extends MusicProvider {
  constructor() {
    super('lmusic');
    this.baseURL = 'https://lmusic.kz';
    this.apiURL = 'https://api.lmusic.kz';
  }

  /**
   * Поиск треков на Lmusic.kz
   */
  async search(query, options = {}) {
    const { limit = 10 } = options;

    try {
      // Пробуем API
      const response = await axios.get(`${this.apiURL}/api/search`, {
        params: { q: query, limit },
        timeout: 10000,
        headers: {
          'User-Agent': 'ErrorParty/1.0'
        }
      });

      if (response.data && response.data.tracks) {
        return response.data.tracks.map(track => this.normalizeTrack({
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: track.genre,
          duration: track.duration,
          streamUrl: track.url || track.downloadUrl,
          coverUrl: track.cover || track.coverUrl,
          id: track.id
        }));
      }

      // Fallback на парсинг HTML
      return await this.searchByHtml(query, limit);

    } catch (error) {
      console.error('[LmusicProvider] Search error:', error.message);
      
      // Попытка парсинга HTML при ошибке API
      try {
        return await this.searchByHtml(query, limit);
      } catch (htmlError) {
        console.error('[LmusicProvider] HTML search failed:', htmlError.message);
        return [];
      }
    }
  }

  /**
   * Поиск через парсинг HTML (резервный метод)
   */
  async searchByHtml(query, limit = 10) {
    const searchUrl = `${this.baseURL}/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const tracks = [];

    $('.track-item, .song-item').slice(0, limit).each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('.track-title, .song-title').text().trim();
      const artist = $elem.find('.track-artist, .artist').text().trim();
      const downloadUrl = $elem.find('a[data-download], a.download-btn').attr('href') || 
                          $elem.find('a[data-url]').attr('data-url');

      if (title && artist && downloadUrl) {
        tracks.push(this.normalizeTrack({
          title,
          artist,
          streamUrl: downloadUrl.startsWith('http') ? downloadUrl : `${this.baseURL}${downloadUrl}`,
          coverUrl: $elem.find('img').attr('src'),
          id: downloadUrl.split('/').pop()
        }));
      }
    });

    return tracks;
  }

  /**
   * Получить информацию о треке
   */
  async getTrack(id) {
    try {
      const response = await axios.get(`${this.apiURL}/api/track/${id}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ErrorParty/1.0'
        }
      });

      if (response.data) {
        return this.normalizeTrack({
          title: response.data.title,
          artist: response.data.artist,
          album: response.data.album,
          genre: response.data.genre,
          duration: response.data.duration,
          streamUrl: response.data.url || response.data.downloadUrl,
          coverUrl: response.data.cover,
          id: response.data.id
        });
      }

      return null;
    } catch (error) {
      console.error('[LmusicProvider] getTrack error:', error.message);
      return null;
    }
  }

  /**
   * Получить прямую ссылку на скачивание
   */
  async getDirectUrl(track) {
    if (track.streamUrl) {
      // Проверяем, что ссылка рабочая
      const isAvailable = await this.isAvailable(track);
      if (isAvailable) {
        return track.streamUrl;
      }
    }

    // Попытка получить новую ссылку
    if (track.providerTrackId) {
      const freshTrack = await this.getTrack(track.providerTrackId);
      return freshTrack?.streamUrl || null;
    }

    return null;
  }

  /**
   * Проверить доступность с учетом специфики Lmusic.kz
   */
  async isAvailable(track) {
    if (!track || !track.streamUrl) {
      return false;
    }

    try {
      const response = await axios.head(track.streamUrl, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'ErrorParty/1.0',
          'Referer': this.baseURL
        }
      });

      return response.status >= 200 && response.status < 400;
    } catch (error) {
      // Lmusic.kz иногда не отвечает на HEAD, пробуем GET с Range
      try {
        const response = await axios.get(track.streamUrl, {
          timeout: 5000,
          headers: {
            'Range': 'bytes=0-1024',
            'User-Agent': 'ErrorParty/1.0',
            'Referer': this.baseURL
          },
          validateStatus: (status) => status < 400
        });
        return response.status === 206 || response.status === 200;
      } catch (rangeError) {
        return false;
      }
    }
  }

  /**
   * Получить треки по жанру
   */
  async getByGenre(genre, limit = 20) {
    try {
      const response = await axios.get(`${this.baseURL}/genre/${genre}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track-item').slice(0, limit).each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.track-title').text().trim();
        const artist = $elem.find('.track-artist').text().trim();
        const downloadUrl = $elem.find('a[data-download]').attr('href');

        if (title && artist && downloadUrl) {
          tracks.push(this.normalizeTrack({
            title,
            artist,
            genre,
            streamUrl: downloadUrl.startsWith('http') ? downloadUrl : `${this.baseURL}${downloadUrl}`,
            coverUrl: $elem.find('img').attr('src'),
            id: downloadUrl.split('/').pop()
          }));
        }
      });

      return tracks;
    } catch (error) {
      console.error('[LmusicProvider] getByGenre error:', error.message);
      return [];
    }
  }
}

module.exports = new LmusicProvider();

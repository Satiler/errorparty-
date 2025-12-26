const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const config = require('../config/charts-config');

class ShazamChartsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: config.cache.ttl });
    this.apiKey = config.shazam.apiKey;
    this.baseUrl = 'https://shazam.p.rapidapi.com';
  }

  /**
   * Получить топ-треки Shazam
   */
  async getTopTracks(region = 'world', limit = 50) {
    const cacheKey = `shazam_top_${region}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/charts/track`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        },
        params: {
          locale: region === 'world' ? 'en-US' : `en-${region}`,
          pageSize: Math.min(limit, 200),
          startFrom: 0
        }
      });

      if (!response.data || !response.data.tracks) {
        return [];
      }

      const tracks = response.data.tracks.map((track, index) => ({
        position: index + 1,
        title: track.title,
        artist: track.subtitle,
        shazamId: track.key,
        shazamUrl: track.url,
        coverUrl: track.images?.coverart || track.images?.background,
        genre: track.genres?.primary,
        label: track.label,
        isrc: track.isrc,
        releaseDate: track.releasedate,
        source: 'shazam',
        region: region,
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, tracks);
      logger.info(`Получено ${tracks.length} треков из Shazam Charts (${region})`);

      return tracks;
    } catch (error) {
      logger.error(`Ошибка получения Shazam Charts (${region}):`, error.message);
      throw error;
    }
  }

  /**
   * Получить детали трека
   */
  async getTrackDetails(trackId) {
    try {
      const response = await axios.get(`${this.baseUrl}/songs/get-details`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        },
        params: {
          key: trackId,
          locale: 'en-US'
        }
      });

      const track = response.data;
      return {
        title: track.title,
        artist: track.subtitle,
        album: track.sections?.[0]?.metadata?.find(m => m.title === 'Album')?.text,
        releaseDate: track.sections?.[0]?.metadata?.find(m => m.title === 'Released')?.text,
        label: track.sections?.[0]?.metadata?.find(m => m.title === 'Label')?.text,
        genre: track.genres?.primary,
        isrc: track.isrc,
        shazamUrl: track.url,
        coverUrl: track.images?.coverart,
        appleMusicUrl: track.hub?.providers?.find(p => p.type === 'APPLEMUSIC')?.actions?.[0]?.uri,
        spotifyUrl: track.hub?.providers?.find(p => p.type === 'SPOTIFY')?.actions?.[0]?.uri
      };
    } catch (error) {
      logger.error('Ошибка получения деталей трека Shazam:', error);
      throw error;
    }
  }

  /**
   * Поиск трека в Shazam
   */
  async searchTrack(query) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        },
        params: {
          term: query,
          locale: 'en-US',
          limit: 5
        }
      });

      if (!response.data || !response.data.tracks) {
        return [];
      }

      return response.data.tracks.hits.map(hit => ({
        title: hit.track.title,
        artist: hit.track.subtitle,
        shazamId: hit.track.key,
        shazamUrl: hit.track.url,
        coverUrl: hit.track.images?.coverart
      }));
    } catch (error) {
      logger.error('Ошибка поиска в Shazam:', error);
      return [];
    }
  }

  /**
   * Получить связанные треки
   */
  async getRelatedTracks(trackId, limit = 20) {
    try {
      const response = await axios.get(`${this.baseUrl}/songs/list-recommendations`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        },
        params: {
          key: trackId,
          locale: 'en-US'
        }
      });

      if (!response.data || !response.data.tracks) {
        return [];
      }

      return response.data.tracks.slice(0, limit).map(track => ({
        title: track.title,
        artist: track.subtitle,
        shazamId: track.key,
        shazamUrl: track.url,
        coverUrl: track.images?.coverart
      }));
    } catch (error) {
      logger.error('Ошибка получения связанных треков Shazam:', error);
      return [];
    }
  }

  /**
   * Получить топ по жанру
   */
  async getTopByGenre(genre, region = 'world', limit = 50) {
    const cacheKey = `shazam_genre_${genre}_${region}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/charts/genre-world`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        },
        params: {
          genre_code: genre,
          locale: 'en-US',
          pageSize: Math.min(limit, 200)
        }
      });

      if (!response.data || !response.data.tracks) {
        return [];
      }

      const tracks = response.data.tracks.map((track, index) => ({
        position: index + 1,
        title: track.title,
        artist: track.subtitle,
        shazamId: track.key,
        genre: genre,
        source: 'shazam',
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, tracks);
      return tracks;
    } catch (error) {
      logger.error(`Ошибка получения Shazam топ по жанру ${genre}:`, error);
      throw error;
    }
  }
}

module.exports = new ShazamChartsService();

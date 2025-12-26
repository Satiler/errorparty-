const axios = require('axios');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const config = require('../config/charts-config');

class AppleMusicChartsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: config.cache.ttl });
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Генерация JWT токена для Apple Music API
   */
  generateToken() {
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    try {
      const privateKey = config.appleMusic.privateKey.replace(/\\n/g, '\n');
      
      const token = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '180d',
        issuer: config.appleMusic.teamId,
        header: {
          alg: 'ES256',
          kid: config.appleMusic.keyId
        }
      });

      this.token = token;
      this.tokenExpiry = Date.now() + (180 * 24 * 60 * 60 * 1000); // 180 дней

      return token;
    } catch (error) {
      logger.error('Ошибка генерации Apple Music токена:', error);
      throw error;
    }
  }

  /**
   * Получить топ-треки из Apple Music Charts
   */
  async getTopTracks(storefront = 'us', limit = 50) {
    const cacheKey = `apple_top_${storefront}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const token = this.generateToken();
      
      const response = await axios.get(
        `https://api.music.apple.com/v1/catalog/${storefront}/charts`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            types: 'songs',
            limit: Math.min(limit, 100)
          }
        }
      );

      const charts = response.data.results.songs?.[0];
      if (!charts || !charts.data) {
        return [];
      }

      const tracks = charts.data.map((item, index) => ({
        position: index + 1,
        title: item.attributes.name,
        artist: item.attributes.artistName,
        album: item.attributes.albumName,
        duration: Math.floor(item.attributes.durationInMillis / 1000),
        releaseDate: item.attributes.releaseDate,
        appleMusicId: item.id,
        appleMusicUrl: item.attributes.url,
        coverUrl: item.attributes.artwork?.url
          ?.replace('{w}', '640')
          ?.replace('{h}', '640'),
        previewUrl: item.attributes.previews?.[0]?.url,
        isrc: item.attributes.isrc,
        source: 'appleMusic',
        storefront: storefront,
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, tracks);
      logger.info(`Получено ${tracks.length} треков из Apple Music Charts (${storefront})`);

      return tracks;
    } catch (error) {
      logger.error(`Ошибка получения Apple Music Charts (${storefront}):`, error);
      throw error;
    }
  }

  /**
   * Получить топ-альбомы
   */
  async getTopAlbums(storefront = 'us', limit = 50) {
    const cacheKey = `apple_albums_${storefront}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const token = this.generateToken();
      
      const response = await axios.get(
        `https://api.music.apple.com/v1/catalog/${storefront}/charts`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            types: 'albums',
            limit: Math.min(limit, 100)
          }
        }
      );

      const charts = response.data.results.albums?.[0];
      if (!charts || !charts.data) {
        return [];
      }

      const albums = charts.data.map((item, index) => ({
        position: index + 1,
        albumName: item.attributes.name,
        artists: item.attributes.artistName,
        releaseDate: item.attributes.releaseDate,
        totalTracks: item.attributes.trackCount,
        appleMusicId: item.id,
        appleMusicUrl: item.attributes.url,
        coverUrl: item.attributes.artwork?.url
          ?.replace('{w}', '640')
          ?.replace('{h}', '640'),
        genre: item.attributes.genreNames?.[0],
        source: 'appleMusic',
        storefront: storefront,
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, albums);
      logger.info(`Получено ${albums.length} альбомов из Apple Music Charts (${storefront})`);

      return albums;
    } catch (error) {
      logger.error(`Ошибка получения Apple Music альбомов (${storefront}):`, error);
      throw error;
    }
  }

  /**
   * Поиск трека в Apple Music
   */
  async searchTrack(artist, title, storefront = 'us') {
    try {
      const token = this.generateToken();
      const query = `${artist} ${title}`;
      
      const response = await axios.get(
        `https://api.music.apple.com/v1/catalog/${storefront}/search`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            term: query,
            types: 'songs',
            limit: 1
          }
        }
      );

      if (response.data.results.songs?.data?.length > 0) {
        const track = response.data.results.songs.data[0];
        return {
          found: true,
          appleMusicId: track.id,
          appleMusicUrl: track.attributes.url,
          previewUrl: track.attributes.previews?.[0]?.url,
          isrc: track.attributes.isrc
        };
      }

      return { found: false };
    } catch (error) {
      logger.error('Ошибка поиска трека в Apple Music:', error);
      return { found: false, error: error.message };
    }
  }

  /**
   * Получить детали трека по ID
   */
  async getTrackDetails(trackId, storefront = 'us') {
    try {
      const token = this.generateToken();
      
      const response = await axios.get(
        `https://api.music.apple.com/v1/catalog/${storefront}/songs/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const track = response.data.data[0];
      return {
        title: track.attributes.name,
        artist: track.attributes.artistName,
        album: track.attributes.albumName,
        duration: Math.floor(track.attributes.durationInMillis / 1000),
        releaseDate: track.attributes.releaseDate,
        genre: track.attributes.genreNames?.[0],
        isrc: track.attributes.isrc
      };
    } catch (error) {
      logger.error('Ошибка получения деталей трека Apple Music:', error);
      throw error;
    }
  }
}

module.exports = new AppleMusicChartsService();

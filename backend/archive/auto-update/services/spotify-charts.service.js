const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const config = require('../config/charts-config');

class SpotifyChartsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: config.cache.ttl });
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Получить токен доступа Spotify
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('Ошибка получения Spotify токена:', error);
      throw error;
    }
  }

  /**
   * Получить топ-треки из Spotify Charts
   */
  async getTopTracks(region = 'global', limit = 50) {
    const cacheKey = `spotify_top_${region}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const token = await this.getAccessToken();
      
      // Получаем плейлист Top 50
      const playlistId = this.getPlaylistIdByRegion(region);
      
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            limit: Math.min(limit, 100),
            fields: 'items(track(id,name,artists,album,duration_ms,popularity,external_urls))'
          }
        }
      );

      const tracks = response.data.items.map((item, index) => ({
        position: index + 1,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        duration: Math.floor(item.track.duration_ms / 1000),
        popularity: item.track.popularity,
        spotifyId: item.track.id,
        spotifyUrl: item.track.external_urls.spotify,
        coverUrl: item.track.album.images?.[0]?.url,
        source: 'spotify',
        region: region,
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, tracks);
      logger.info(`Получено ${tracks.length} треков из Spotify Charts (${region})`);

      return tracks;
    } catch (error) {
      logger.error(`Ошибка получения Spotify Charts (${region}):`, error);
      throw error;
    }
  }

  /**
   * Получить новые релизы
   */
  async getNewReleases(region = 'US', limit = 50) {
    const cacheKey = `spotify_new_releases_${region}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        'https://api.spotify.com/v1/browse/new-releases',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            country: region,
            limit: Math.min(limit, 50)
          }
        }
      );

      const releases = response.data.albums.items.map(album => ({
        albumName: album.name,
        artists: album.artists.map(a => a.name).join(', '),
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        spotifyId: album.id,
        spotifyUrl: album.external_urls.spotify,
        coverUrl: album.images?.[0]?.url,
        source: 'spotify',
        type: album.album_type,
        fetchedAt: new Date()
      }));

      this.cache.set(cacheKey, releases);
      logger.info(`Получено ${releases.length} новых релизов из Spotify (${region})`);

      return releases;
    } catch (error) {
      logger.error(`Ошибка получения новых релизов Spotify (${region}):`, error);
      throw error;
    }
  }

  /**
   * Поиск трека в Spotify
   */
  async searchTrack(artist, title) {
    try {
      const token = await this.getAccessToken();
      const query = `artist:${artist} track:${title}`;
      
      const response = await axios.get(
        'https://api.spotify.com/v1/search',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            q: query,
            type: 'track',
            limit: 1
          }
        }
      );

      if (response.data.tracks.items.length > 0) {
        const track = response.data.tracks.items[0];
        return {
          found: true,
          spotifyId: track.id,
          spotifyUrl: track.external_urls.spotify,
          popularity: track.popularity,
          previewUrl: track.preview_url
        };
      }

      return { found: false };
    } catch (error) {
      logger.error('Ошибка поиска трека в Spotify:', error);
      return { found: false, error: error.message };
    }
  }

  /**
   * Получить ID плейлиста по региону
   */
  getPlaylistIdByRegion(region) {
    const playlists = {
      'global': '37i9dQZEVXbMDoHDwVN2tF',
      'us': '37i9dQZEVXbLRQDuF5jeBp',
      'ru': '37i9dQZEVXbL8l7ra5vVdB',
      'gb': '37i9dQZEVXbLnolsZ8PSNw'
    };

    return playlists[region.toLowerCase()] || playlists['global'];
  }

  /**
   * Получить рекомендации на основе треков
   */
  async getRecommendations(seedTracks, limit = 20) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        'https://api.spotify.com/v1/recommendations',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            seed_tracks: seedTracks.slice(0, 5).join(','), // Максимум 5 seed треков
            limit: Math.min(limit, 100)
          }
        }
      );

      return response.data.tracks.map(track => ({
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        spotifyId: track.id,
        spotifyUrl: track.external_urls.spotify,
        popularity: track.popularity
      }));
    } catch (error) {
      logger.error('Ошибка получения рекомендаций Spotify:', error);
      throw error;
    }
  }
}

module.exports = new SpotifyChartsService();

/**
 * Yandex Music Service
 * Поиск треков в Яндекс.Музыке и получение метаданных
 * Использует неофициальный API: https://github.com/acherkashin/yandex-music-open-api
 */
const axios = require('axios');
const { Track, Album } = require('../../models');

class YandexMusicService {
  constructor() {
    this.baseURL = 'https://api.music.yandex.net:443';
    // Альтернатива с CORS proxy
    this.proxyURL = 'https://yandex-music-cors-proxy.onrender.com/https://api.music.yandex.net:443';
    this.token = null;
  }

  /**
   * Установить токен авторизации
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Получить headers для запросов
   */
  getHeaders() {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `OAuth ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Поиск треков в Яндекс.Музыке
   */
  async searchTracks(query, limit = 10) {
    try {
      console.log(`🔍 Searching Yandex.Music: "${query}"`);

      const response = await axios.get(`${this.proxyURL}/search`, {
        params: {
          text: query,
          type: 'track',
          page: 0,
          'page-count': limit
        },
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (!response.data || !response.data.result || !response.data.result.tracks) {
        console.log('  ⚠️  No results from Yandex.Music API');
        return [];
      }

      const tracks = response.data.result.tracks.results.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.albums && track.albums[0] ? track.albums[0].title : 'Unknown Album',
        albumId: track.albums && track.albums[0] ? track.albums[0].id : null,
        duration: track.durationMs ? Math.round(track.durationMs / 1000) : 0,
        coverUri: track.coverUri ? `https://${track.coverUri.replace('%%', '400x400')}` : null,
        year: track.albums && track.albums[0] ? track.albums[0].year : null,
        genre: track.albums && track.albums[0] && track.albums[0].genre ? track.albums[0].genre : null,
        explicit: track.contentWarning === 'explicit',
        available: track.available,
        yandexUrl: `https://music.yandex.ru/album/${track.albums[0]?.id}/track/${track.id}`
      }));

      console.log(`  ✅ Found ${tracks.length} tracks on Yandex.Music`);
      return tracks;

    } catch (error) {
      console.error('Yandex.Music search error:', error.message);
      return [];
    }
  }

  /**
   * Получить информацию о треке
   */
  async getTrackInfo(trackId) {
    try {
      console.log(`📀 Getting track info from Yandex.Music: ${trackId}`);

      const response = await axios.get(`${this.proxyURL}/tracks/${trackId}`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (!response.data || !response.data.result || !response.data.result[0]) {
        console.log('  ⚠️  Track not found');
        return null;
      }

      const track = response.data.result[0];

      return {
        id: track.id,
        title: track.title,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.albums && track.albums[0] ? track.albums[0].title : 'Unknown Album',
        albumId: track.albums && track.albums[0] ? track.albums[0].id : null,
        duration: track.durationMs ? Math.round(track.durationMs / 1000) : 0,
        coverUri: track.coverUri ? `https://${track.coverUri.replace('%%', '400x400')}` : null,
        year: track.albums && track.albums[0] ? track.albums[0].year : null,
        genre: track.albums && track.albums[0] && track.albums[0].genre ? track.albums[0].genre : null,
        explicit: track.contentWarning === 'explicit',
        available: track.available,
        yandexUrl: `https://music.yandex.ru/album/${track.albums[0]?.id}/track/${track.id}`,
        lyricsAvailable: track.lyricsAvailable
      };

    } catch (error) {
      console.error('Yandex.Music track info error:', error.message);
      return null;
    }
  }

  /**
   * Поиск альбома
   */
  async searchAlbums(query, limit = 10) {
    try {
      console.log(`🔍 Searching albums on Yandex.Music: "${query}"`);

      const response = await axios.get(`${this.proxyURL}/search`, {
        params: {
          text: query,
          type: 'album',
          page: 0,
          'page-count': limit
        },
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (!response.data || !response.data.result || !response.data.result.albums) {
        console.log('  ⚠️  No albums found');
        return [];
      }

      const albums = response.data.result.albums.results.map(album => ({
        id: album.id,
        title: album.title,
        artist: album.artists.map(a => a.name).join(', '),
        year: album.year,
        trackCount: album.trackCount,
        genre: album.genre,
        coverUri: album.coverUri ? `https://${album.coverUri.replace('%%', '400x400')}` : null,
        available: album.available,
        yandexUrl: `https://music.yandex.ru/album/${album.id}`
      }));

      console.log(`  ✅ Found ${albums.length} albums`);
      return albums;

    } catch (error) {
      console.error('Yandex.Music album search error:', error.message);
      return [];
    }
  }

  /**
   * Найти воспроизводимую версию трека через альтернативные источники
   * Яндекс.Музыка не предоставляет прямые ссылки на аудио без подписки,
   * поэтому ищем похожий трек в Jamendo или других открытых источниках
   */
  async findPlayableVersion(yandexTrack) {
    try {
      console.log(`🎵 Searching playable version for: ${yandexTrack.artist} - ${yandexTrack.title}`);

      // Пытаемся найти в нашей базе
      const existingTrack = await Track.findOne({
        where: {
          title: yandexTrack.title,
          artist: yandexTrack.artist
        }
      });

      if (existingTrack && existingTrack.filePath) {
        console.log('  ✅ Found in local database');
        return {
          source: 'local',
          trackId: existingTrack.id,
          url: `/api/music/tracks/${existingTrack.id}/stream`
        };
      }

      // Ищем в Jamendo
      const searchQuery = `${yandexTrack.artist} ${yandexTrack.title}`;
      const jamendoTracks = await jamendoImportService.searchTracks(searchQuery, 5);

      if (jamendoTracks.length > 0) {
        console.log(`  ✅ Found ${jamendoTracks.length} similar tracks on Jamendo`);
        
        // Возвращаем лучшее совпадение
        const bestMatch = jamendoTracks[0];
        return {
          source: 'jamendo',
          track: bestMatch,
          similarity: this.calculateSimilarity(yandexTrack, bestMatch)
        };
      }

      console.log('  ⚠️  No playable version found');
      return null;

    } catch (error) {
      console.error('Error finding playable version:', error.message);
      return null;
    }
  }

  /**
   * Вычислить похожесть треков (простая эвристика)
   */
  calculateSimilarity(track1, track2) {
    const title1 = track1.title.toLowerCase().replace(/[^\w\s]/g, '');
    const title2 = track2.title.toLowerCase().replace(/[^\w\s]/g, '');
    const artist1 = track1.artist.toLowerCase().replace(/[^\w\s]/g, '');
    const artist2 = track2.artist.toLowerCase().replace(/[^\w\s]/g, '');

    let score = 0;

    // Сравнение названий
    if (title1 === title2) score += 50;
    else if (title1.includes(title2) || title2.includes(title1)) score += 30;

    // Сравнение исполнителей
    if (artist1 === artist2) score += 50;
    else if (artist1.includes(artist2) || artist2.includes(artist1)) score += 30;

    return score;
  }

  /**
   * Импортировать трек из Яндекс.Музыки (только метаданные)
   * Сохраняем информацию о треке, но без аудиофайла
   */
  async importTrackMetadata(yandexTrack, userId = null) {
    try {
      console.log(`💾 Importing metadata: ${yandexTrack.artist} - ${yandexTrack.title}`);

      // Проверяем, не существует ли уже
      const existing = await Track.findOne({
        where: {
          externalSource: 'yandex-music',
          externalId: `yandex_${yandexTrack.id}`
        }
      });

      if (existing) {
        console.log('  ⏭️  Track already exists in database');
        return existing;
      }

      // Создаём или находим альбом
      let album = null;
      if (yandexTrack.albumId) {
        [album] = await Album.findOrCreate({
          where: {
            externalSource: 'yandex-music',
            externalId: `yandex_${yandexTrack.albumId}`
          },
          defaults: {
            title: yandexTrack.album,
            artist: yandexTrack.artist,
            releaseYear: yandexTrack.year,
            genre: yandexTrack.genre || 'Various',
            coverPath: yandexTrack.coverUri,
            externalSource: 'yandex-music',
            externalId: `yandex_${yandexTrack.albumId}`,
            isPublic: true
          }
        });
      }

      // Создаём трек
      const track = await Track.create({
        title: yandexTrack.title,
        artist: yandexTrack.artist,
        album: yandexTrack.album,
        albumId: album ? album.id : null,
        genre: yandexTrack.genre || 'Various',
        year: yandexTrack.year,
        duration: yandexTrack.duration,
        coverPath: yandexTrack.coverUri,
        externalSource: 'yandex-music',
        externalId: `yandex_${yandexTrack.id}`,
        externalUrl: yandexTrack.yandexUrl,
        sourceType: 'external',
        isPublic: true,
        allowDownload: false, // Нельзя скачать с Яндекс.Музыки
        uploadedBy: userId
      });

      console.log(`  ✅ Metadata imported: ${track.id}`);
      return track;

    } catch (error) {
      console.error('Error importing track metadata:', error.message);
      throw error;
    }
  }

  /**
   * Получить рекомендации от Яндекс.Музыки
   */
  async getRecommendations(limit = 20) {
    try {
      console.log('🎯 Getting recommendations from Yandex.Music');

      // Для рекомендаций нужен токен авторизации
      if (!this.token) {
        console.log('  ⚠️  Authorization token required for recommendations');
        return [];
      }

      const response = await axios.get(`${this.proxyURL}/feed`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (!response.data || !response.data.result) {
        return [];
      }

      // Собираем треки из различных разделов ленты
      const tracks = [];
      const days = response.data.result.days || [];

      for (const day of days) {
        for (const event of day.events || []) {
          if (event.tracks) {
            tracks.push(...event.tracks);
          }
        }
      }

      console.log(`  ✅ Found ${tracks.length} recommendations`);
      return tracks.slice(0, limit);

    } catch (error) {
      console.error('Yandex.Music recommendations error:', error.message);
      return [];
    }
  }

  /**
   * Получить популярные треки
   */
  async getPopularTracks(limit = 20) {
    try {
      console.log('📊 Getting popular tracks from Yandex.Music');

      const response = await axios.get(`${this.proxyURL}/landing/popular`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (!response.data || !response.data.result) {
        return [];
      }

      const tracks = response.data.result.popular?.tracks || [];
      console.log(`  ✅ Found ${tracks.length} popular tracks`);
      
      return tracks.slice(0, limit);

    } catch (error) {
      console.error('Yandex.Music popular tracks error:', error.message);
      return [];
    }
  }
}

module.exports = new YandexMusicService();

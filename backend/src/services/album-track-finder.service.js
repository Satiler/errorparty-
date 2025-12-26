/**
 * Album Track Finder Service
 * Автоматический поиск и загрузка треков для альбомов
 */
const { Album, Track } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const cheerio = require('cheerio');

class AlbumTrackFinderService {
  constructor() {
    this.sources = [
      { name: 'lmusic.kz', search: this.searchLmusic.bind(this) },
      { name: 'Musify', search: this.searchMusify.bind(this) },
      { name: 'Hitmo', search: this.searchHitmo.bind(this) },
      { name: 'PromoДJ', search: this.searchPromoДJ.bind(this) }
    ];
  }

  /**
   * Найти и загрузить треки для альбома
   */
  async findTracksForAlbum(album) {
    console.log(`\n🔍 Поиск треков для альбома: "${album.title}" - ${album.artist}`);

    const query = `${album.artist} ${album.title}`;
    let foundTracks = [];

    // Пробуем каждый источник по очереди
    for (const source of this.sources) {
      try {
        console.log(`  📡 Поиск в ${source.name}...`);
        const tracks = await source.search(query, album);
        
        if (tracks && tracks.length > 0) {
          console.log(`  ✅ Найдено ${tracks.length} треков в ${source.name}`);
          foundTracks = tracks;
          break; // Нашли треки, останавливаемся
        }
      } catch (error) {
        console.error(`  ❌ Ошибка в ${source.name}:`, error.message);
      }
    }

    if (foundTracks.length === 0) {
      console.log(`  ⚠️  Треки не найдены ни в одном источнике`);
      return { success: false, tracksAdded: 0 };
    }

    // Сохраняем треки в базу
    let tracksAdded = 0;
    for (const trackData of foundTracks) {
      try {
        // Проверяем, не существует ли уже такой трек
        const existing = await Track.findOne({
          where: {
            title: trackData.title,
            artist: trackData.artist,
            albumId: album.id
          }
        });

        if (existing) {
          console.log(`  ⏭️  Трек уже существует: ${trackData.title}`);
          continue;
        }

        // Создаём трек
        await Track.create({
          ...trackData,
          albumId: album.id,
          isPublic: true
        });

        tracksAdded++;
        console.log(`  💾 Добавлен: ${trackData.title}`);
      } catch (error) {
        console.error(`  ❌ Ошибка добавления трека: ${error.message}`);
      }
    }

    // Обновляем количество треков в альбоме
    if (tracksAdded > 0) {
      const totalTracks = await Track.count({ where: { albumId: album.id } });
      console.log(`  ✅ Добавлено ${tracksAdded} новых треков (всего ${totalTracks})`);
    }

    return { success: tracksAdded > 0, tracksAdded };
  }

  /**
   * Поиск на lmusic.kz
   */
  async searchLmusic(query, album) {
    try {
      const searchUrl = `https://lmusic.kz/search/${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      // Ищем треки на странице
      $('.track-item, .song-item, .music-item').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.track-title, .song-title').text().trim();
        const artist = $elem.find('.track-artist, .song-artist').text().trim() || album.artist;
        const streamUrl = $elem.find('a[data-url], a[href*=".mp3"]').attr('data-url') || $elem.find('a[href*=".mp3"]').attr('href');

        if (title && streamUrl) {
          tracks.push({
            title,
            artist,
            streamUrl: streamUrl.startsWith('http') ? streamUrl : `https://lmusic.kz${streamUrl}`,
            duration: 0,
            genre: album.genre || 'Unknown',
            trackNumber: i + 1
          });
        }
      });

      return tracks;
    } catch (error) {
      console.error('Lmusic search error:', error.message);
      return [];
    }
  }

  /**
   * Поиск на Musify
   */
  async searchMusify(query, album) {
    try {
      const searchUrl = `https://musify.club/search?searchText=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.playlist__item, .track-item').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.playlist__item-title, .track__title').text().trim();
        const artist = $elem.find('.playlist__item-artist, .track__artist').text().trim() || album.artist;
        const streamUrl = $elem.find('[data-src], [data-url]').attr('data-src') || $elem.find('[data-src], [data-url]').attr('data-url');

        if (title && streamUrl) {
          tracks.push({
            title,
            artist,
            streamUrl: streamUrl.startsWith('http') ? streamUrl : `https://musify.club${streamUrl}`,
            duration: 0,
            genre: album.genre || 'Unknown',
            trackNumber: i + 1
          });
        }
      });

      return tracks;
    } catch (error) {
      console.error('Musify search error:', error.message);
      return [];
    }
  }

  /**
   * Поиск на Hitmo
   */
  async searchHitmo(query, album) {
    try {
      const searchUrl = `https://hitmo.me/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track, .song-item').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.track-name, .song-name').text().trim();
        const artist = $elem.find('.track-artist, .artist-name').text().trim() || album.artist;
        const streamUrl = $elem.find('[data-mp3], a[href*=".mp3"]').attr('data-mp3') || $elem.find('a[href*=".mp3"]').attr('href');

        if (title && streamUrl) {
          tracks.push({
            title,
            artist,
            streamUrl: streamUrl.startsWith('http') ? streamUrl : `https://hitmo.me${streamUrl}`,
            duration: 0,
            genre: album.genre || 'Unknown',
            trackNumber: i + 1
          });
        }
      });

      return tracks;
    } catch (error) {
      console.error('Hitmo search error:', error.message);
      return [];
    }
  }

  /**
   * Поиск на PromoДJ
   */
  async searchPromoДJ(query, album) {
    try {
      const searchUrl = `https://promodj.com/search?query=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const tracks = [];

      $('.track-item, .playlist-item').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('.trackName, .track-title').text().trim();
        const artist = $elem.find('.artistName, .track-artist').text().trim() || album.artist;
        const streamUrl = $elem.find('[data-stream], [data-url]').attr('data-stream') || $elem.find('[data-stream], [data-url]').attr('data-url');

        if (title && streamUrl) {
          tracks.push({
            title,
            artist,
            streamUrl: streamUrl.startsWith('http') ? streamUrl : `https://promodj.com${streamUrl}`,
            duration: 0,
            genre: album.genre || 'Unknown',
            trackNumber: i + 1
          });
        }
      });

      return tracks;
    } catch (error) {
      console.error('PromoДJ search error:', error.message);
      return [];
    }
  }

  /**
   * Обработать все альбомы без треков
   */
  async processEmptyAlbums(limit = 10) {
    console.log('\n🚀 === АВТОМАТИЧЕСКАЯ ЗАГРУЗКА ТРЕКОВ В АЛЬБОМЫ ===\n');

    // Находим альбомы без треков через JOIN
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false,
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']],
      limit: limit * 3 // Берём больше, т.к. некоторые могут иметь треки
    });

    // Фильтруем только альбомы без треков
    const emptyAlbums = allAlbums
      .filter(album => !album.tracks || album.tracks.length === 0)
      .slice(0, limit);

    console.log(`📊 Найдено ${emptyAlbums.length} альбомов без треков\n`);

    let processed = 0;
    let successful = 0;
    let totalTracksAdded = 0;

    for (const album of emptyAlbums) {
      processed++;
      console.log(`\n[${processed}/${emptyAlbums.length}] Обработка: "${album.title}" - ${album.artist}`);

      const result = await this.findTracksForAlbum(album);
      
      if (result.success) {
        successful++;
        totalTracksAdded += result.tracksAdded;
      }

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 === ИТОГИ ===');
    console.log(`✅ Обработано альбомов: ${processed}`);
    console.log(`✅ Успешно заполнено: ${successful}`);
    console.log(`✅ Всего треков добавлено: ${totalTracksAdded}\n`);

    return {
      processed,
      successful,
      totalTracksAdded
    };
  }
}

module.exports = new AlbumTrackFinderService();

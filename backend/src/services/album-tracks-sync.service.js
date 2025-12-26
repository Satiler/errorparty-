/**
 * Album Tracks Auto-Sync Service
 * Автоматическая проверка и загрузка треков для альбомов
 */
const { Album, Track } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

class AlbumTracksService {
  /**
   * Проверяет новые альбомы и загружает для них треки
   */
  async syncNewAlbums() {
    try {
      console.log('🔄 Проверка новых альбомов без треков...');
      
      // Находим альбомы без треков (созданные за последние 7 дней)
      const newAlbums = await Album.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // За последние 7 дней
          }
        },
        include: [{
          model: Track,
          as: 'tracks',
          required: false
        }]
      });
      
      const albumsWithoutTracks = newAlbums.filter(a => !a.tracks || a.tracks.length === 0);
      
      console.log(`📊 Найдено новых альбомов без треков: ${albumsWithoutTracks.length}`);
      
      for (const album of albumsWithoutTracks) {
        await this.findAndLinkTracks(album);
      }
      
      return {
        checked: newAlbums.length,
        processed: albumsWithoutTracks.length
      };
    } catch (error) {
      console.error('Error syncing new albums:', error);
      throw error;
    }
  }
  
  /**
   * Находит и связывает треки для конкретного альбома
   */
  async findAndLinkTracks(album) {
    try {
      console.log(`\n🔍 Обработка: ${album.artist} - ${album.title}`);
      
      // 1. Поиск треков в базе по исполнителю и названию альбома
      const existingTracks = await Track.findAll({
        where: {
          artist: { [Op.iLike]: `%${album.artist}%` },
          [Op.or]: [
            { album: { [Op.iLike]: `%${album.title}%` } },
            { title: { [Op.iLike]: `%${album.title}%` } }
          ],
          albumId: null
        }
      });
      
      if (existingTracks.length > 0) {
        await Track.update(
          { albumId: album.id },
          { where: { id: existingTracks.map(t => t.id) } }
        );
        console.log(`  ✅ Найдено и связано ${existingTracks.length} треков из базы`);
        return existingTracks.length;
      }
      
      // 2. Если не найдено в базе - ищем на lmusic.kz
      const searchResults = await this.searchTracksOnLmusic(album.artist, album.title);
      
      if (searchResults.length > 0) {
        console.log(`  🎵 Найдено ${searchResults.length} треков на lmusic.kz`);
        
        // Импортируем найденные треки
        for (const trackData of searchResults) {
          try {
            const track = await Track.create({
              ...trackData,
              albumId: album.id,
              album: album.title,
              genre: album.genre || trackData.genre
            });
            console.log(`    ➕ Добавлен: ${track.title}`);
          } catch (err) {
            console.error(`    ❌ Ошибка добавления трека:`, err.message);
          }
        }
        
        return searchResults.length;
      }
      
      console.log(`  ⚠️  Треки не найдены`);
      return 0;
      
    } catch (error) {
      console.error(`Error finding tracks for album ${album.id}:`, error);
      return 0;
    }
  }
  
  /**
   * Поиск треков на lmusic.kz
   */
  async searchTracksOnLmusic(artist, albumTitle) {
    try {
      const query = `${artist} ${albumTitle}`;
      const response = await axios.get('https://api.lmusic.kz/api/search', {
        params: {
          q: query,
          limit: 20
        },
        timeout: 5000
      });
      
      if (response.data && response.data.tracks) {
        return response.data.tracks.map(t => ({
          title: t.title,
          artist: t.artist || artist,
          duration: t.duration || 0,
          streamUrl: t.url || t.streamUrl,
          coverUrl: t.cover || t.coverUrl,
          genre: t.genre || 'Unknown'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching lmusic.kz:', error.message);
      return [];
    }
  }
  
  /**
   * Запускает полную синхронизацию всех альбомов
   */
  async syncAllAlbums() {
    try {
      console.log('\n🔄 === ПОЛНАЯ СИНХРОНИЗАЦИЯ ВСЕХ АЛЬБОМОВ ===\n');
      
      const albums = await Album.findAll({
        include: [{
          model: Track,
          as: 'tracks',
          required: false
        }]
      });
      
      console.log(`📊 Всего альбомов: ${albums.length}`);
      
      const albumsWithoutTracks = albums.filter(a => !a.tracks || a.tracks.length === 0);
      console.log(`📊 Альбомов без треков: ${albumsWithoutTracks.length}\n`);
      
      let processed = 0;
      let tracksAdded = 0;
      
      for (const album of albumsWithoutTracks) {
        const count = await this.findAndLinkTracks(album);
        if (count > 0) {
          processed++;
          tracksAdded += count;
        }
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`\n📊 === ИТОГО ===`);
      console.log(`✅ Обработано альбомов: ${processed}`);
      console.log(`🎵 Добавлено треков: ${tracksAdded}\n`);
      
      return {
        total: albums.length,
        processed,
        tracksAdded
      };
    } catch (error) {
      console.error('Error syncing all albums:', error);
      throw error;
    }
  }
}

module.exports = new AlbumTracksService();

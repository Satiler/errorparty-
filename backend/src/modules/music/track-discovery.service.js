/**
 * Track Discovery Service
 * Автоматический поиск и загрузка популярных треков из различных источников
 */
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { Track } = require('../../models');
const { Op } = require('sequelize');

class TrackDiscoveryService {
  constructor() {
    // Jamendo API - бесплатная музыка (Creative Commons)
    this.jamendoClientId = process.env.JAMENDO_CLIENT_ID || 'f531a9ea';
    this.jamendoApiUrl = 'https://api.jamendo.com/v3.0';
    
    // Free Music Archive API (альтернативный источник)
    this.fmaApiUrl = 'https://freemusicarchive.org/api';
    
    // Папка для загрузки треков
    this.uploadDir = path.join(__dirname, '../../../uploads/music');
    
    // ID системного пользователя для автозагруженных треков
    this.systemUserId = process.env.SYSTEM_USER_ID || 1;
  }

  /**
   * Основной метод для загрузки новых популярных треков
   */
  async discoverAndImportTracks(options = {}) {
    const {
      limit = 20,
      genres = ['pop', 'electronic', 'rock', 'jazz', 'ambient'],
      minRating = 7.0
    } = options;

    console.log('🎵 Starting track discovery...');
    console.log(`📊 Parameters: limit=${limit}, genres=${genres.join(',')}, minRating=${minRating}`);

    const importedTracks = [];
    
    try {
      // Загружаем треки из Jamendo
      const jamendoTracks = await this.fetchJamendoTracks({ limit, genres, minRating });
      console.log(`🎶 Found ${jamendoTracks.length} tracks from Jamendo`);
      
      // Импортируем каждый трек
      for (const trackData of jamendoTracks) {
        try {
          const imported = await this.importTrack(trackData);
          if (imported) {
            importedTracks.push(imported);
            console.log(`✅ Imported: ${trackData.artist} - ${trackData.title}`);
          }
        } catch (error) {
          console.error(`❌ Failed to import ${trackData.title}:`, error.message);
        }
      }
      
      console.log(`🎉 Successfully imported ${importedTracks.length} new tracks`);
      return {
        success: true,
        imported: importedTracks.length,
        tracks: importedTracks
      };
    } catch (error) {
      console.error('❌ Track discovery error:', error);
      return {
        success: false,
        error: error.message,
        imported: importedTracks.length,
        tracks: importedTracks
      };
    }
  }

  /**
   * Получить популярные треки из Jamendo API
   */
  async fetchJamendoTracks(options = {}) {
    const { limit = 20, genres = ['pop'], minRating = 7.0 } = options;
    
    try {
      const response = await axios.get(`${this.jamendoApiUrl}/tracks`, {
        params: {
          client_id: this.jamendoClientId,
          format: 'json',
          limit,
          order: 'popularity_week', // Популярные за неделю
          include: 'musicinfo',
          audiodlformat: 'mp32', // MP3 320kbps
          tags: genres.join('+'),
          boost: 'popularity_week'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.results) {
        console.log('⚠️ No results from Jamendo API');
        return [];
      }

      // Преобразуем в наш формат
      return response.data.results.map(track => ({
        title: track.name,
        artist: track.artist_name,
        album: track.album_name || 'Single',
        genre: track.musicinfo?.tags?.genres?.[0] || genres[0],
        year: parseInt(track.releasedate?.split('-')[0]) || new Date().getFullYear(),
        duration: track.duration,
        downloadUrl: track.audio || track.audiodownload,
        coverUrl: track.image || track.album_image,
        externalSource: 'jamendo',
        externalId: track.id.toString(),
        externalUrl: track.shareurl,
        license: track.license_ccurl || 'CC BY-SA',
        features: {
          acousticness: track.musicinfo?.vocalinstrumental === 'instrumental' ? 0.9 : 0.3,
          danceability: 0.6,
          energy: 0.7,
          popularity: Math.round((track.listens || 1000) / 1000)
        }
      }));
    } catch (error) {
      console.error('Jamendo API error:', error.message);
      return [];
    }
  }

  /**
   * Импортировать трек в систему
   */
  async importTrack(trackData) {
    try {
      // Проверяем, не существует ли уже этот трек
      const existing = await Track.findOne({
        where: {
          [Op.or]: [
            {
              externalSource: trackData.externalSource,
              externalId: trackData.externalId
            },
            {
              title: trackData.title,
              artist: trackData.artist
            }
          ]
        }
      });

      if (existing) {
        console.log(`⏭️ Track already exists: ${trackData.title}`);
        return null;
      }

      // Создаём запись без скачивания файла (используем внешнюю ссылку)
      const track = await Track.create({
        title: trackData.title,
        artist: trackData.artist,
        album: trackData.album,
        genre: trackData.genre,
        year: trackData.year,
        duration: trackData.duration,
        filePath: trackData.downloadUrl, // Используем внешнюю ссылку напрямую
        coverPath: trackData.coverUrl,
        fileFormat: 'mp3',
        fileSize: 0, // Неизвестен заранее
        bitrate: 320,
        uploadedBy: this.systemUserId,
        isPublic: true,
        allowDownload: true,
        externalSource: trackData.externalSource,
        externalId: trackData.externalId,
        externalUrl: trackData.externalUrl,
        features: trackData.features,
        playCount: 0,
        likeCount: 0,
        downloadCount: 0
      });

      return track;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }

  /**
   * Получить популярные треки из Free Music Archive
   */
  async fetchFMATracks(options = {}) {
    // TODO: Реализовать интеграцию с FMA API
    // Требуется API ключ: https://freemusicarchive.org/api-agreement
    return [];
  }

  /**
   * Очистка старых/непопулярных треков
   */
  async cleanupUnpopularTracks(options = {}) {
    const {
      maxAge = 90, // дней
      minPlays = 10
    } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      const deleted = await Track.destroy({
        where: {
          externalSource: { [Op.ne]: null }, // Только автозагруженные
          createdAt: { [Op.lt]: cutoffDate },
          playCount: { [Op.lt]: minPlays }
        }
      });

      console.log(`🧹 Cleaned up ${deleted} unpopular tracks`);
      return deleted;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Получить статистику автозагруженных треков
   */
  async getDiscoveryStats() {
    try {
      const total = await Track.count({
        where: { externalSource: { [Op.ne]: null } }
      });

      const bySource = await Track.findAll({
        attributes: [
          'externalSource',
          [Track.sequelize.fn('COUNT', Track.sequelize.col('id')), 'count'],
          [Track.sequelize.fn('SUM', Track.sequelize.col('playCount')), 'totalPlays']
        ],
        where: { externalSource: { [Op.ne]: null } },
        group: ['externalSource']
      });

      return {
        total,
        sources: bySource.map(s => ({
          source: s.externalSource,
          count: parseInt(s.get('count')),
          plays: parseInt(s.get('totalPlays') || 0)
        }))
      };
    } catch (error) {
      console.error('Stats error:', error);
      return { total: 0, sources: [] };
    }
  }
}

module.exports = new TrackDiscoveryService();

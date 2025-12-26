/**
 * Smart Playlists Scheduler
 * Автоматическое обновление умных подборок по расписанию
 */

const cron = require('node-cron');
const { Playlist, PlaylistTrack } = require('../models');
const smartPlaylistGenerator = require('../services/smart-playlist-generator.service');

class SmartPlaylistsScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Запуск всех планировщиков
   */
  start() {
    console.log('🤖 Starting Smart Playlists Scheduler...');

    // Ежедневные подборки (обновляются каждый день в 4:00)
    this.scheduleDailyPlaylists();

    // Еженедельные подборки (обновляются по понедельникам в 3:00)
    this.scheduleWeeklyPlaylists();

    // Обновление "Звуковой дорожки дня" каждые 6 часов
    this.scheduleDailySoundtrack();

    console.log('✅ Smart Playlists Scheduler started successfully');
  }

  /**
   * Остановка всех планировщиков
   */
  stop() {
    console.log('🛑 Stopping Smart Playlists Scheduler...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('✅ Smart Playlists Scheduler stopped');
  }

  /**
   * Планировщик ежедневных подборок (4:00 AM)
   */
  scheduleDailyPlaylists() {
    const job = cron.schedule('0 4 * * *', async () => {
      console.log('⏰ Running daily playlists update...');
      try {
        await this.updateTopTracks();
        await this.updateWeeklyDiscovery();
        await this.updateMoodPlaylists();
        console.log('✅ Daily playlists updated successfully');
      } catch (error) {
        console.error('❌ Error updating daily playlists:', error);
      }
    });

    this.jobs.push(job);
    console.log('📅 Daily playlists job scheduled (4:00 AM)');
  }

  /**
   * Планировщик еженедельных подборок (Monday 3:00 AM)
   */
  scheduleWeeklyPlaylists() {
    const job = cron.schedule('0 3 * * 1', async () => {
      console.log('⏰ Running weekly playlists update...');
      try {
        await this.updateRetroPlaylist();
        await this.updateGenrePlaylists();
        await this.updateActivityPlaylists();
        console.log('✅ Weekly playlists updated successfully');
      } catch (error) {
        console.error('❌ Error updating weekly playlists:', error);
      }
    });

    this.jobs.push(job);
    console.log('📅 Weekly playlists job scheduled (Monday 3:00 AM)');
  }

  /**
   * Обновление "Звуковой дорожки дня" каждые 6 часов
   */
  scheduleDailySoundtrack() {
    const job = cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ Running daily soundtrack update...');
      try {
        await this.updateDailySoundtrack();
        console.log('✅ Daily soundtrack updated successfully');
      } catch (error) {
        console.error('❌ Error updating daily soundtrack:', error);
      }
    });

    this.jobs.push(job);
    console.log('📅 Daily soundtrack job scheduled (every 6 hours)');
  }

  /**
   * Обновление топ треков
   */
  async updateTopTracks() {
    console.log('🔄 Updating Top Tracks...');
    
    const result = await smartPlaylistGenerator.generateTopTracks(100);
    if (result.tracks.length === 0) return;

    await this.updateOrCreatePlaylist({
      name: '🔥 Топ треки',
      description: result.description,
      tracks: result.tracks,
      type: 'editorial',
      metadata: { algorithm: 'top-tracks', priority: 1 }
    });
  }

  /**
   * Обновление открытий недели
   */
  async updateWeeklyDiscovery() {
    console.log('🔄 Updating Weekly Discovery...');
    
    const result = await smartPlaylistGenerator.generateWeeklyDiscovery(30);
    if (result.tracks.length === 0) return;

    await this.updateOrCreatePlaylist({
      name: '🔥 Открытия недели',
      description: result.description,
      tracks: result.tracks,
      type: 'editorial',
      metadata: { algorithm: 'weekly-discovery', priority: 2, tags: result.tags }
    });
  }

  /**
   * Обновление подборок по настроению
   */
  async updateMoodPlaylists() {
    console.log('🔄 Updating Mood Playlists...');
    
    const moods = [
      { mood: 'happy', name: '😊 Настроение: Веселое', priority: 10 },
      { mood: 'energetic', name: '⚡ Настроение: Энергичное', priority: 11 },
      { mood: 'calm', name: '😌 Настроение: Спокойное', priority: 12 },
      { mood: 'party', name: '🎉 Настроение: Вечеринка', priority: 13 }
    ];

    for (const { mood, name, priority } of moods) {
      const result = await smartPlaylistGenerator.generateByMood(mood, 50);
      if (result.tracks.length === 0) continue;

      await this.updateOrCreatePlaylist({
        name,
        description: result.description,
        tracks: result.tracks,
        type: 'editorial',
        metadata: { algorithm: 'mood-based', mood, priority }
      });
    }
  }

  /**
   * Обновление ретро подборки
   */
  async updateRetroPlaylist() {
    console.log('🔄 Updating Retro Playlist...');
    
    const result = await smartPlaylistGenerator.generateRetroPlaylist(50);
    if (result.tracks.length === 0) return;

    await this.updateOrCreatePlaylist({
      name: '📻 Ретро хиты',
      description: result.description,
      tracks: result.tracks,
      type: 'editorial',
      metadata: { algorithm: 'retro', priority: 20, tags: result.tags }
    });
  }

  /**
   * Обновление подборок по активностям
   */
  async updateActivityPlaylists() {
    console.log('🔄 Updating Activity Playlists...');
    
    const activities = [
      { 
        method: 'generateWorkoutPlaylist', 
        name: '💪 Тренировка', 
        priority: 30,
        limit: 40 
      },
      { 
        method: 'generateFocusPlaylist', 
        name: '🎯 Концентрация', 
        priority: 31,
        limit: 50 
      },
      { 
        method: 'generateSleepPlaylist', 
        name: '😴 Для сна', 
        priority: 32,
        limit: 30 
      },
      { 
        method: 'generateEveningPlaylist', 
        name: '🌆 Вечерний чилл', 
        priority: 33,
        limit: 40 
      }
    ];

    for (const { method, name, priority, limit } of activities) {
      const result = await smartPlaylistGenerator[method](limit);
      if (result.tracks.length === 0) continue;

      await this.updateOrCreatePlaylist({
        name,
        description: result.description,
        tracks: result.tracks,
        type: 'editorial',
        metadata: { algorithm: result.algorithm, priority, tags: result.tags }
      });
    }
  }

  /**
   * Обновление жанровых подборок
   */
  async updateGenrePlaylists() {
    console.log('🔄 Updating Genre Playlists...');
    
    const genres = ['rock', 'pop', 'hip-hop', 'electronic', 'jazz', 'classical'];
    let priority = 40;

    for (const genre of genres) {
      const result = await smartPlaylistGenerator.generateGenrePlaylist(genre, 50);
      if (result.tracks.length === 0) continue;

      await this.updateOrCreatePlaylist({
        name: result.name,
        description: result.description,
        tracks: result.tracks,
        type: 'editorial',
        metadata: { algorithm: 'genre-based', genre, priority: priority++ }
      });
    }
  }

  /**
   * Обновление звуковой дорожки дня
   */
  async updateDailySoundtrack() {
    console.log('🔄 Updating Daily Soundtrack...');
    
    const result = await smartPlaylistGenerator.generateDailySoundtrack(null, 60);
    if (result.tracks.length === 0) return;

    await this.updateOrCreatePlaylist({
      name: '🎵 Звуковая дорожка дня',
      description: result.description,
      tracks: result.tracks,
      type: 'editorial',
      metadata: { algorithm: 'daily-soundtrack', timeOfDay: result.timeOfDay, priority: 3 }
    });
  }

  /**
   * Обновить или создать плейлист
   */
  async updateOrCreatePlaylist({ name, description, tracks, type, metadata }) {
    try {
      // Ищем системного пользователя
      const { User } = require('../models');
      let systemUser = await User.findOne({ where: { username: 'system' } });
      
      if (!systemUser) {
        systemUser = await User.create({
          username: 'system',
          email: 'system@errorparty.local',
          password: 'system',
          isAdmin: true
        });
      }

      // Ищем существующий плейлист
      let playlist = await Playlist.findOne({
        where: { name, type: 'editorial' }
      });

      if (playlist) {
        // Обновляем существующий
        await playlist.update({
          description,
          metadata: JSON.stringify(metadata)
        });

        // Удаляем старые треки
        await PlaylistTrack.destroy({
          where: { playlistId: playlist.id }
        });
      } else {
        // Создаем новый
        playlist = await Playlist.create({
          userId: systemUser.id,
          name,
          description,
          type,
          isPublic: true,
          metadata: JSON.stringify(metadata)
        });
      }

      // Добавляем треки
      for (let i = 0; i < tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i + 1
        });
      }

      console.log(`✅ Updated: ${name} (${tracks.length} tracks)`);
    } catch (error) {
      console.error(`❌ Error updating playlist "${name}":`, error);
    }
  }

  /**
   * Запуск обновления вручную (для тестирования)
   */
  async runManualUpdate() {
    console.log('🔄 Running manual update of all playlists...');
    
    try {
      await this.updateTopTracks();
      await this.updateWeeklyDiscovery();
      await this.updateMoodPlaylists();
      await this.updateRetroPlaylist();
      await this.updateGenrePlaylists();
      await this.updateActivityPlaylists();
      await this.updateDailySoundtrack();
      
      console.log('✅ Manual update completed successfully');
    } catch (error) {
      console.error('❌ Error during manual update:', error);
      throw error;
    }
  }
}

module.exports = new SmartPlaylistsScheduler();

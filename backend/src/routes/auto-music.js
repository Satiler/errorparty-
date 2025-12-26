/**
 * 🤖 API роуты для автоматической музыкальной системы
 */

const express = require('express');
const router = express.Router();
const { getInstance: getAutoMusicSystem } = require('../services/auto-music-system.service');
const { getInstance: getScheduler } = require('../schedulers/auto-music-system.scheduler');

/**
 * GET /api/music/auto/status
 * Получить статус автоматической системы
 */
router.get('/status', (req, res) => {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/auto/run/:task
 * Ручной запуск задачи
 * 
 * Доступные задачи:
 * - import: Импорт новых треков
 * - playlists: Обновление плейлистов
 * - recommendations: Персональные рекомендации
 * - full: Полное обновление
 * - popularity: Обновление популярности
 */
router.post('/run/:task', async (req, res) => {
  try {
    const { task } = req.params;
    const validTasks = ['import', 'playlists', 'recommendations', 'full', 'popularity'];
    
    if (!validTasks.includes(task)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task. Valid tasks: ' + validTasks.join(', ')
      });
    }

    const scheduler = getScheduler();
    
    // Запускаем задачу асинхронно
    scheduler.runManualTask(task).then(() => {
      console.log(`✅ Task ${task} completed`);
    }).catch(error => {
      console.error(`❌ Task ${task} failed:`, error);
    });

    res.json({
      success: true,
      message: `Task '${task}' started`,
      task: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/auto/stats
 * Получить статистику работы системы
 */
router.get('/stats', (req, res) => {
  try {
    const autoMusicSystem = getAutoMusicSystem();
    const stats = autoMusicSystem.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/auto/configure
 * Изменить конфигурацию источников
 * 
 * Body:
 * {
 *   "russian": { "enabled": true, "weight": 0.5 },
 *   "foreign": { "enabled": true, "weight": 0.5 }
 * }
 */
router.post('/configure', (req, res) => {
  try {
    const { russian, foreign } = req.body;
    
    if (!russian && !foreign) {
      return res.status(400).json({
        success: false,
        error: 'Provide russian or foreign configuration'
      });
    }

    const autoMusicSystem = getAutoMusicSystem();
    const config = {};
    
    if (russian) config.russian = russian;
    if (foreign) config.foreign = foreign;
    
    autoMusicSystem.configureSources(config);
    
    res.json({
      success: true,
      message: 'Configuration updated',
      config: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/auto/start
 * Запустить планировщик
 */
router.post('/start', (req, res) => {
  try {
    const scheduler = getScheduler();
    scheduler.start();
    
    res.json({
      success: true,
      message: 'Scheduler started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/auto/stop
 * Остановить планировщик
 */
router.post('/stop', (req, res) => {
  try {
    const scheduler = getScheduler();
    scheduler.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/auto/personal/:userId
 * Получить персональный плейлист пользователя
 */
router.get('/personal/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { Playlist, PlaylistTrack, Track } = require('../models');
    
    const playlist = await Playlist.findOne({
      where: {
        userId: userId,
        name: '❤️ МНЕ ПОНРАВИТСЯ'
      },
      include: [{
        model: PlaylistTrack,
        as: 'tracks',
        include: [{
          model: Track,
          as: 'track'
        }]
      }]
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Personal playlist not found. System will create it during next run.'
      });
    }

    res.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.length,
        tracks: playlist.tracks.map(pt => ({
          id: pt.track.id,
          title: pt.track.title,
          artist: pt.track.artist,
          genre: pt.track.genre,
          duration: pt.track.duration,
          coverUrl: pt.track.coverUrl,
          position: pt.position
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/auto/generate-personal/:userId
 * Вручную создать персональный плейлист для пользователя
 */
router.post('/generate-personal/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const autoMusicSystem = getAutoMusicSystem();
    
    // Генерируем плейлист
    const playlist = await autoMusicSystem.generatePersonalPlaylistForUser(userId);
    
    if (!playlist) {
      return res.status(400).json({
        success: false,
        error: 'User has insufficient likes (minimum 5 required)'
      });
    }

    res.json({
      success: true,
      message: 'Personal playlist generated',
      playlistId: playlist.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

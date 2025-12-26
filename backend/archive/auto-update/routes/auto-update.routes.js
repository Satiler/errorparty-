const express = require('express');
const router = express.Router();
const playlistActualizationService = require('../services/playlist-actualization.service');
const kissvkAutoImportService = require('../services/kissvk-auto-import.service');
const recommendationService = require('../services/recommendation.service');
const autoUpdateScheduler = require('../scheduler/auto-update.scheduler');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/auto-update/status
 * @desc    Получить статус системы автообновления
 * @access  Admin
 */
router.get('/status', async (req, res) => {
  try {
    const status = autoUpdateScheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Ошибка получения статуса:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/playlists/:id/actualize
 * @desc    Запустить актуализацию конкретного плейлиста
 * @access  Admin
 */
router.post('/playlists/:id/actualize', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await playlistActualizationService.actualizePlaylist(id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Ошибка актуализации плейлиста:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auto-update/pending-changes
 * @desc    Получить список изменений, ожидающих модерации
 * @access  Admin
 */
router.get('/pending-changes', async (req, res) => {
  try {
    const db = require('../../config/database');
    
    const query = `
      SELECT 
        pc.id,
        pc.playlist_id,
        p.name as playlist_name,
        pc.changes_data,
        pc.status,
        pc.created_at
      FROM playlist_pending_changes pc
      JOIN playlists p ON pc.playlist_id = p.id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at DESC
      LIMIT 50
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Ошибка получения pending changes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/pending-changes/:id/approve
 * @desc    Одобрить изменения
 * @access  Admin
 */
router.post('/pending-changes/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../../config/database');

    // Получение изменений
    const getQuery = `
      SELECT playlist_id, changes_data
      FROM playlist_pending_changes
      WHERE id = $1 AND status = 'pending'
    `;
    const getResult = await db.query(getQuery, [id]);

    if (getResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Изменения не найдены'
      });
    }

    const { playlist_id, changes_data } = getResult.rows[0];
    const changes = JSON.parse(changes_data);

    // Применение изменений
    await playlistActualizationService.applyChanges(playlist_id, changes);

    // Обновление статуса
    await db.query(
      `UPDATE playlist_pending_changes 
       SET status = 'approved', approved_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Изменения одобрены и применены'
    });
  } catch (error) {
    logger.error('Ошибка одобрения изменений:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/pending-changes/:id/reject
 * @desc    Отклонить изменения
 * @access  Admin
 */
router.post('/pending-changes/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../../config/database');

    await db.query(
      `UPDATE playlist_pending_changes 
       SET status = 'rejected', rejected_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Изменения отклонены'
    });
  } catch (error) {
    logger.error('Ошибка отклонения изменений:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/kissvk/import
 * @desc    Запустить импорт с kissvk
 * @access  Admin
 */
router.post('/kissvk/import', async (req, res) => {
  try {
    const stats = await kissvkAutoImportService.importNewReleases();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Ошибка импорта с kissvk:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auto-update/recommendations/:userId
 * @desc    Получить персональные рекомендации
 * @access  Public
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const recommendations = await recommendationService.getPersonalizedRecommendations(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Ошибка получения рекомендаций:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auto-update/recommendations/track/:trackId/similar
 * @desc    Получить похожие треки
 * @access  Public
 */
router.get('/recommendations/track/:trackId/similar', async (req, res) => {
  try {
    const { trackId } = req.params;
    const { limit = 10 } = req.query;

    const similar = await recommendationService.getSimilarTracks(
      trackId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: similar
    });
  } catch (error) {
    logger.error('Ошибка получения похожих треков:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/tasks/:taskName/run
 * @desc    Ручной запуск задачи
 * @access  Admin
 */
router.post('/tasks/:taskName/run', async (req, res) => {
  try {
    const { taskName } = req.params;
    const result = await autoUpdateScheduler.runTask(taskName);

    res.json({
      success: true,
      data: result,
      message: `Задача "${taskName}" выполнена`
    });
  } catch (error) {
    logger.error(`Ошибка выполнения задачи ${req.params.taskName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/scheduler/start
 * @desc    Запустить планировщик
 * @access  Admin
 */
router.post('/scheduler/start', (req, res) => {
  try {
    autoUpdateScheduler.start();
    res.json({
      success: true,
      message: 'Планировщик запущен'
    });
  } catch (error) {
    logger.error('Ошибка запуска планировщика:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auto-update/scheduler/stop
 * @desc    Остановить планировщик
 * @access  Admin
 */
router.post('/scheduler/stop', (req, res) => {
  try {
    autoUpdateScheduler.stop();
    res.json({
      success: true,
      message: 'Планировщик остановлен'
    });
  } catch (error) {
    logger.error('Ошибка остановки планировщика:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

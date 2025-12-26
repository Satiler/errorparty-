/**
 * KissVK Routes - Минимальные роуты для работы с kissvk
 */

const express = require('express');
const router = express.Router();
const kissvkController = require('../../controllers/kissvk.controller');
const { getInstance: getKissVKScheduler } = require('../../schedulers/kissvk-auto-import.scheduler');

// Превью треков (без импорта)
router.get('/preview', kissvkController.preview);

// Поиск треков
router.get('/search', kissvkController.search);

// Импорт треков в БД
router.post('/import', kissvkController.importTracks);

// Новые альбомы
router.get('/albums/new', kissvkController.getNewAlbums);

// Чарт альбомов
router.get('/albums/chart', kissvkController.getChartAlbums);

// Статистика
router.get('/stats', kissvkController.getStats);

// Очистить кеш
router.post('/cache/clear', kissvkController.clearCache);

// Scheduler endpoints
router.post('/scheduler/run', async (req, res) => {
  try {
    const scheduler = getKissVKScheduler();
    const result = await scheduler.runImport();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/scheduler/stats', (req, res) => {
  try {
    const scheduler = getKissVKScheduler();
    res.json(scheduler.getStats());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;


/**
 * Unified Music Routes
 * Маршруты для работы с множественными музыкальными источниками
 */

const express = require('express');
const router = express.Router();
const unifiedMusicController = require('../../controllers/unified-music.controller');

/**
 * @route   GET /api/music/unified/search
 * @desc    Поиск по всем источникам
 * @query   q - поисковый запрос
 * @query   limit - максимальное количество результатов (default: 20)
 * @query   sources - список источников через запятую (kissvk,musify,hitmo,promodj)
 * @query   includeStreamUrl - декодировать URL (default: true)
 * @query   downloadTracks - скачать треки (default: false)
 */
router.get('/search', unifiedMusicController.searchAll);

/**
 * @route   GET /api/music/unified/smart-search
 * @desc    Умный поиск с автоматическим переключением источников
 * @query   q - поисковый запрос
 * @query   minResults - минимальное количество результатов (default: 10)
 * @query   maxSources - максимальное количество источников (default: 3)
 */
router.get('/smart-search', unifiedMusicController.smartSearch);

/**
 * @route   GET /api/music/unified/top
 * @desc    Получить топ треки со всех источников
 * @query   limit - максимальное количество (default: 50)
 * @query   sources - список источников через запятую
 */
router.get('/top', unifiedMusicController.getTopTracks);

/**
 * @route   POST /api/music/unified/download
 * @desc    Скачать треки
 * @body    tracks - массив треков для скачивания
 * @body    concurrency - количество параллельных загрузок (default: 3)
 */
router.post('/download', unifiedMusicController.downloadTracks);

/**
 * @route   POST /api/music/unified/import
 * @desc    Импорт треков в БД
 * @body    tracks - массив треков
 * @body    createAlbum - создать альбом (default: false)
 * @body    albumTitle - название альбома
 * @body    albumArtist - исполнитель альбома
 */
router.post('/import', unifiedMusicController.importTracks);

/**
 * @route   GET /api/music/unified/stats
 * @desc    Получить статистику
 */
router.get('/stats', unifiedMusicController.getStats);

/**
 * @route   POST /api/music/unified/reset-stats
 * @desc    Сбросить статистику
 */
router.post('/reset-stats', unifiedMusicController.resetStats);

/**
 * @route   GET /api/music/unified/sources
 * @desc    Получить список доступных источников
 */
router.get('/sources', unifiedMusicController.getSources);

module.exports = router;

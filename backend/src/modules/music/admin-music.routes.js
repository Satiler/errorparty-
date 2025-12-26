/**
 * Admin Music Routes
 * Роуты для управления музыкой в админ панели
 */

const express = require('express');
const router = express.Router();
const adminMusicController = require('./admin-music.controller');
const { authenticateToken, isAdmin } = require('../../middleware/auth');

// Все роуты требуют аутентификации и админских прав
router.use(authenticateToken);
router.use(isAdmin);

/**
 * @route   POST /api/admin/music/import
 * @desc    Импорт музыки из внешнего API
 * @body    { source, query, limit, genres, withTracks }
 */
router.post('/import', adminMusicController.triggerImport);

/**
 * @route   GET /api/admin/music/stats
 * @desc    Получить статистику музыкальной библиотеки
 */
router.get('/stats', adminMusicController.getStats);

/**
 * @route   DELETE /api/admin/music/albums/:id
 * @desc    Удалить альбом
 */
router.delete('/albums/:id', adminMusicController.deleteAlbum);

/**
 * @route   POST /api/admin/music/auto-import
 * @desc    Запустить автоматический импорт свежих альбомов
 * @body    { limit }
 */
router.post('/auto-import', adminMusicController.runAutoImport);

/**
 * @route   GET /api/admin/music/auto-import/stats
 * @desc    Получить статистику автоматического импорта
 */
router.get('/auto-import/stats', adminMusicController.getAutoImportStats);

/**
 * @route   POST /api/admin/music/zaycev/import-top
 * @desc    Импорт топ треков с Zaycev.net
 * @body    { limit }
 */
router.post('/zaycev/import-top', adminMusicController.importZaycevTop);

/**
 * @route   POST /api/admin/music/zaycev/import-genre
 * @desc    Импорт треков по жанру с Zaycev.net
 * @body    { genre, limit }
 */
router.post('/zaycev/import-genre', adminMusicController.importZaycevGenre);

/**
 * @route   POST /api/admin/music/zaycev/search-import
 * @desc    Поиск и импорт треков с Zaycev.net
 * @body    { query, limit }
 */
router.post('/zaycev/search-import', adminMusicController.importZaycevSearch);

/**
 * @route   POST /api/admin/music/zaycev/import-albums
 * @desc    Импорт популярных альбомов с Zaycev.net
 * @body    { limit }
 */
router.post('/zaycev/import-albums', adminMusicController.importZaycevAlbums);

/**
 * @route   POST /api/admin/music/zaycev/import-real-tracks
 * @desc    Импорт реальных треков с прямыми ссылками для воспроизведения
 * @body    { queries, limit }
 */
router.post('/zaycev/import-real-tracks', adminMusicController.importZaycevRealTracks);

/**
 * @route   POST /api/admin/music/jamendo/import-tracks
 * @desc    Импорт треков с Jamendo по поисковым запросам
 * @body    { queries, limit }
 */
router.post('/jamendo/import-tracks', adminMusicController.importJamendoTracks);

/**
 * @route   POST /api/admin/music/jamendo/import-popular
 * @desc    Импорт популярных треков с Jamendo
 * @body    { limit }
 */
router.post('/jamendo/import-popular', adminMusicController.importJamendoPopular);

/**
 * @route   POST /api/admin/music/lmusic/import
 * @desc    Импорт треков с Lmusic.kz
 * @body    { genre, language, limit, maxPages }
 */
router.post('/lmusic/import', adminMusicController.importLmusicTracks);

/**
 * @route   POST /api/admin/music/itunes-to-lmusic/import-tracks
 * @desc    Импорт популярных треков: iTunes Charts → Lmusic.kz
 * @body    { countries: ['us', 'ru', 'gb'], limitPerCountry: 50 }
 */
router.post('/itunes-to-lmusic/import-tracks', adminMusicController.importItunesTracksToLmusic);

/**
 * @route   POST /api/admin/music/itunes-to-lmusic/import-albums
 * @desc    Импорт популярных альбомов: iTunes Charts → Lmusic.kz
 * @body    { countries: ['us', 'ru'], limitPerCountry: 20 }
 */
router.post('/itunes-to-lmusic/import-albums', adminMusicController.importItunesAlbumsToLmusic);

/**
 * @route   POST /api/admin/music/itunes-to-lmusic/update-playlist
 * @desc    Обновить плейлист "Мировые хиты"
 */
router.post('/itunes-to-lmusic/update-playlist', adminMusicController.updateGlobalHitsPlaylist);

module.exports = router;

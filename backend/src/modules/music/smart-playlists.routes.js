/**
 * Smart Playlists Routes
 * Роуты для умных музыкальных подборок
 */

const express = require('express');
const router = express.Router();
const smartPlaylistsController = require('./smart-playlists.controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');

// Список доступных подборок
router.get('/available', smartPlaylistsController.getAvailable);

// Подборки по настроению
router.get('/mood/:mood', smartPlaylistsController.getByMood);

// Тематические подборки
router.get('/workout', smartPlaylistsController.getWorkout);
router.get('/focus', smartPlaylistsController.getFocus);
router.get('/sleep', smartPlaylistsController.getSleep);
router.get('/evening', smartPlaylistsController.getEvening);
router.get('/retro', smartPlaylistsController.getRetro);
router.get('/weekly-discovery', smartPlaylistsController.getWeeklyDiscovery);
router.get('/top', smartPlaylistsController.getTop);

// Подборки на основе данных
router.get('/similar/:trackId', smartPlaylistsController.getSimilar);
router.get('/genre/:genre', smartPlaylistsController.getByGenre);
router.get('/bpm/:min/:max', smartPlaylistsController.getByBPM);

// Персональные подборки (требуют авторизации или опциональной)
router.get('/daily-soundtrack', optionalAuth, smartPlaylistsController.getDailySoundtrack);
router.get('/personal-radar', authenticateToken, smartPlaylistsController.getPersonalRadar);

// Сохранение подборки как плейлиста
router.post('/save', authenticateToken, smartPlaylistsController.saveAsPlaylist);

module.exports = router;

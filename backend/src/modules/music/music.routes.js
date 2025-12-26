/**
 * Music Routes
 * API endpoints для музыкального модуля
 */
const express = require('express');
const router = express.Router();
const musicController = require('./music.controller');
const albumsController = require('./albums.controller');
const playlistsController = require('./playlists.controller');
const personalPlaylistsController = require('./personal-playlists.controller');
// const yandexMusicController = require('./yandex-music.controller'); // Закомментировано - используем только lmusic.kz
const lmusicKzController = require('./lmusic-kz.controller');
const smartPlaylistsService = require('./smart-playlists.service');
const musicAutoSyncService = require('./music-auto-sync.service');
const musicScheduler = require('./music-scheduler');
const musicSystemAdminController = require('./music-system-admin.controller');
const advancedSearchController = require('./advanced-search.controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { uploadTrack, uploadCover } = require('./music.middleware');
const { uploadAlbum } = require('../../shared/middleware/music-upload');

// ============ ТРЕКИ ============

/**
 * @route   GET /api/music/tracks/search
 * @desc    Поиск треков (базовый с фильтрами)
 * @access  Public
 */
router.get('/tracks/search', musicController.searchTracks);

/**
 * @route   POST /api/music/tracks/advanced-search
 * @desc    Расширенный поиск треков (локальные + внешние источники)
 * @access  Public
 */
router.post('/tracks/advanced-search', advancedSearchController.advancedSearch);

/**
 * @route   GET /api/music/tracks/suggestions
 * @desc    Подсказки для автодополнения поиска
 * @access  Public
 */
router.get('/tracks/suggestions', advancedSearchController.getSuggestions);

/**
 * @route   POST /api/music/tracks/import-from-search
 * @desc    Импорт трека из внешнего источника
 * @access  Private (Admin)
 */
router.post('/tracks/import-from-search', authenticateToken, advancedSearchController.importFromSearch);

/**
 * @route   GET /api/music/tracks/popular
 * @desc    Получить популярные треки
 * @access  Public
 */
router.get('/tracks/popular', musicController.getPopularTracks);

/**
 * @route   GET /api/music/tracks
 * @desc    Получить список треков с фильтрацией
 * @access  Public (optionalAuth для проверки лайков)
 */
router.get('/tracks', optionalAuth, musicController.getTracks);

/**
 * @route   GET /api/music/tracks/:id/stream
 * @desc    Стриминг трека
 * @access  Public
 */
router.get('/tracks/:id/stream', musicController.streamTrack);

/**
 * @route   GET /api/music/hls-segment
 * @desc    Прокси для HLS сегментов (внутреннее использование)
 * @access  Public
 */
router.get('/hls-segment', musicController.proxyHlsSegment);

/**
 * @route   GET /api/music/tracks/:id/download
 * @desc    Скачать трек
 * @access  Private
 */
router.get('/tracks/:id/download', authenticateToken, musicController.downloadTrack);

/**
 * @route   GET /api/music/tracks/:id
 * @desc    Получить информацию о треке
 * @access  Public
 */
router.get('/tracks/:id', musicController.getTrack);

/**
 * @route   POST /api/music/tracks/upload
 * @desc    Загрузить трек
 * @access  Private
 */
router.post('/tracks/upload', authenticateToken, uploadTrack, musicController.uploadTrack);

/**
 * @route   DELETE /api/music/tracks/:id
 * @desc    Удалить трек (только владелец)
 * @access  Private
 */
router.delete('/tracks/:id', authenticateToken, musicController.deleteTrack);

// ============ ИЗБРАННОЕ ============

/**
 * @route   POST /api/music/tracks/:id/like
 * @desc    Добавить трек в избранное
 * @access  Private
 */
router.post('/tracks/:id/like', authenticateToken, musicController.likeTrack);

/**
 * @route   DELETE /api/music/tracks/:id/like
 * @desc    Убрать трек из избранного
 * @access  Private
 */
router.delete('/tracks/:id/like', authenticateToken, musicController.unlikeTrack);

/**
 * @route   GET /api/music/favorites
 * @desc    Получить избранные треки пользователя
 * @access  Private
 */
router.get('/favorites', authenticateToken, musicController.getFavorites);

// ============ ИСТОРИЯ ПРОСЛУШИВАНИЙ ============

/**
 * @route   POST /api/music/tracks/:id/listen
 * @desc    Записать прослушивание трека
 * @access  Private
 */
router.post('/tracks/:id/listen', authenticateToken, musicController.recordListen);

/**
 * @route   GET /api/music/history
 * @desc    История прослушиваний пользователя
 * @access  Private
 */
router.get('/history', authenticateToken, musicController.getHistory);

// ============ МОЯ ВОЛНА ============

/**
 * @route   GET /api/music/my-wave
 * @desc    Получить персональную волну (бесконечный поток музыки)
 * @access  Private
 */
router.get('/my-wave', authenticateToken, musicController.getMyWave);

/**
 * @route   POST /api/music/my-wave/dislike
 * @desc    Отметить трек как "не нравится" для волны
 * @access  Private
 */
router.post('/my-wave/dislike', authenticateToken, musicController.dislikeWaveTrack);

// ============ ПЛЕЙЛИСТЫ ============

/**
 * @route   GET /api/music/playlists
 * @desc    Получить плейлисты (с search - публично, без - требует авторизацию)
 * @access  Public/Private
 */
router.get('/playlists', optionalAuth, musicController.getPlaylists);

/**
 * @route   GET /api/music/playlists/featured
 * @desc    Получить editorial плейлисты для главной страницы
 * @access  Public
 */
router.get('/playlists/featured', musicController.getFeaturedPlaylists);

/**
 * @route   POST /api/music/playlists/upload-cover
 * @desc    Загрузить обложку плейлиста
 * @access  Private (Admin)
 */
router.post('/playlists/upload-cover', authenticateToken, uploadCover.single('cover'), musicController.uploadPlaylistCover);

/**
 * @route   POST /api/music/playlists
 * @desc    Создать плейлист
 * @access  Private
 */
router.post('/playlists', authenticateToken, musicController.createPlaylist);

/**
 * @route   PUT /api/music/playlists/:id
 * @desc    Обновить плейлист
 * @access  Private
 */
router.put('/playlists/:id', authenticateToken, musicController.updatePlaylist);

/**
 * @route   GET /api/music/playlists/editorial
 * @desc    Получить редакционные подборки
 * @access  Public
 */
router.get('/playlists/editorial', playlistsController.getEditorialPlaylists);

/**
 * @route   GET /api/music/personal-playlists
 * @desc    Получить личные плейлисты пользователя (Моя волна, Премьера и т.д.)
 * @access  Public/Private
 */
router.get('/personal-playlists', personalPlaylistsController.getPersonalPlaylists);

/**
 * @route   GET /api/music/personal-playlists/:slug
 * @desc    Получить личный плейлист с треками
 * @access  Private
 */
router.get('/personal-playlists/:slug', authenticateToken, personalPlaylistsController.getPersonalPlaylist);

/**
 * @route   POST /api/music/playlists/generate
 * @desc    Запустить генерацию всех автоматических плейлистов (Admin)
 * @access  Private (Admin)
 */
router.post('/playlists/generate', authenticateToken, async (req, res) => {
  try {
    const playlistGenerator = require('./playlist-generator.service');
    const { type } = req.body; // 'all', 'genres', 'decades', 'moods', 'trending'

    let result;
    switch (type) {
      case 'genres':
        result = await playlistGenerator.generateGenrePlaylists();
        break;
      case 'decades':
        result = await playlistGenerator.generateDecadePlaylists();
        break;
      case 'moods':
        result = await playlistGenerator.generateMoodPlaylists();
        break;
      case 'trending':
        result = await playlistGenerator.generateTrendingPlaylist();
        break;
      default:
        result = await playlistGenerator.generateAllPlaylists();
    }

    res.json(result);
  } catch (error) {
    console.error('Playlist generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/playlists/discover-weekly
 * @desc    Получить персональный плейлист Discover Weekly
 * @access  Private
 */
router.get('/playlists/discover-weekly', authenticateToken, async (req, res) => {
  try {
    const discoverWeekly = require('./discover-weekly.service');
    const result = await discoverWeekly.generateDiscoverWeekly(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Discover Weekly error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/radio/track/:id
 * @desc    Генерация радио на основе трека
 * @access  Public
 */
router.get('/radio/track/:id', async (req, res) => {
  try {
    const trackRadio = require('./track-radio.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await trackRadio.generateRadio(req.params.id, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Track radio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/music/radio/mix
 * @desc    Генерация радио на основе нескольких треков
 * @access  Public
 */
router.post('/radio/mix', async (req, res) => {
  try {
    const trackRadio = require('./track-radio.service');
    const userId = req.user?.id || null;
    const { trackIds, limit = 50 } = req.body;
    
    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return res.status(400).json({ success: false, error: 'trackIds array is required' });
    }
    
    const result = await trackRadio.generateMixRadio(trackIds, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Mix radio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/radio/genre/:genre
 * @desc    Генерация радио на основе жанра
 * @access  Public
 */
router.get('/radio/genre/:genre', async (req, res) => {
  try {
    const trackRadio = require('./track-radio.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await trackRadio.generateGenreRadio(req.params.genre, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Genre radio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/radio/artist/:artist
 * @desc    Генерация радио на основе исполнителя
 * @access  Public
 */
router.get('/radio/artist/:artist', async (req, res) => {
  try {
    const trackRadio = require('./track-radio.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await trackRadio.generateArtistRadio(req.params.artist, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Artist radio error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SMART MIXES ============

/**
 * @route   GET /api/music/mixes/smart
 * @desc    Список всех доступных умных миксов
 * @access  Public
 */
router.get('/mixes/smart', async (req, res) => {
  try {
    const smartMixes = require('./smart-mixes.service');
    const mixes = smartMixes.getAvailableMixes();
    res.json({ success: true, mixes });
  } catch (error) {
    console.error('Get smart mixes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/mixes/auto
 * @desc    Автоматический выбор микса по времени суток
 * @access  Public (персонализация если авторизован)
 */
router.get('/mixes/auto', async (req, res) => {
  try {
    const smartMixes = require('./smart-mixes.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await smartMixes.getAutoMix(userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Auto mix error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/mixes/:type
 * @desc    Генерация умного микса по типу
 * @access  Public (персонализация если авторизован)
 */
router.get('/mixes/:type', async (req, res) => {
  try {
    const smartMixes = require('./smart-mixes.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await smartMixes.generateSmartMix(req.params.type, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Smart mix generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/music/mixes/personalized
 * @desc    Генерация всех персонализированных миксов для пользователя
 * @access  Private
 */
router.post('/mixes/personalized', authenticateToken, async (req, res) => {
  try {
    const smartMixes = require('./smart-mixes.service');
    const limit = parseInt(req.body.limit) || 30;
    
    const result = await smartMixes.generateAllMixesForUser(req.user.id, limit);
    res.json(result);
  } catch (error) {
    console.error('Personalized mixes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/playlists/user/:userId
 * @desc    Получить публичные подборки пользователя
 * @access  Public
 */
router.get('/playlists/user/:userId', playlistsController.getUserPublicPlaylists);

/**
 * @route   GET /api/music/playlists/subscriptions
 * @desc    Получить подписки на подборки
 * @access  Private
 */
router.get('/playlists/subscriptions', authenticateToken, playlistsController.getSubscribedPlaylists);

/**
 * @route   GET /api/music/playlists/my
 * @desc    Получить плейлисты текущего пользователя
 * @access  Private
 */
router.get('/playlists/my', authenticateToken, musicController.getPlaylists);

/**
 * @route   GET /api/music/playlists/:id
 * @desc    Получить треки плейлиста
 * @access  Public (with optional auth for private playlists)
 */
router.get('/playlists/:id', optionalAuth, musicController.getPlaylist);

/**
 * @route   POST /api/music/playlists/:id/tracks
 * @desc    Добавить трек в плейлист
 * @access  Private
 */
router.post('/playlists/:id/tracks', authenticateToken, musicController.addTrackToPlaylist);

/**
 * @route   DELETE /api/music/playlists/:id/tracks/:trackId
 * @desc    Удалить трек из плейлиста
 * @access  Private
 */
router.delete('/playlists/:id/tracks/:trackId', authenticateToken, musicController.removeTrackFromPlaylist);

/**
 * @route   DELETE /api/music/playlists/:id
 * @desc    Удалить плейлист
 * @access  Private
 */
router.delete('/playlists/:id', authenticateToken, musicController.deletePlaylist);

// ============ РЕКОМЕНДАЦИИ (ML) ============

/**
 * @route   GET /api/music/recommendations
 * @desc    Персональные рекомендации на основе ML
 * @access  Private
 */
router.get('/recommendations', authenticateToken, musicController.getRecommendations);

/**
 * @route   GET /api/music/recommendations/similar/:trackId
 * @desc    Похожие треки
 * @access  Public
 */
router.get('/recommendations/similar/:trackId', musicController.getSimilarTracks);

// ============ COLLABORATIVE FILTERING ============

/**
 * @route   GET /api/music/recommendations/cf/user
 * @desc    Рекомендации на основе User-User CF
 * @access  Private
 */
router.get('/recommendations/cf/user', authenticateToken, async (req, res) => {
  try {
    const cf = require('./collaborative-filtering.service');
    const limit = parseInt(req.query.limit) || 20;
    const result = await cf.getUserRecommendations(req.user.id, limit);
    res.json(result);
  } catch (error) {
    console.error('User CF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/recommendations/cf/item/:trackId
 * @desc    Рекомендации на основе Item-Item CF
 * @access  Public (персонализация если авторизован)
 */
router.get('/recommendations/cf/item/:trackId', async (req, res) => {
  try {
    const cf = require('./collaborative-filtering.service');
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 20;
    const result = await cf.getItemRecommendations(req.params.trackId, userId, limit);
    res.json(result);
  } catch (error) {
    console.error('Item CF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/music/recommendations/hybrid
 * @desc    Гибридные рекомендации (User-User + Item-Item + Content-Based)
 * @access  Private
 */
router.get('/recommendations/hybrid', authenticateToken, async (req, res) => {
  try {
    const cf = require('./collaborative-filtering.service');
    const limit = parseInt(req.query.limit) || 30;
    const result = await cf.getHybridRecommendations(req.user.id, limit);
    res.json(result);
  } catch (error) {
    console.error('Hybrid recommendations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ПОИСК ============

/**
 * @route   GET /api/music/search
 * @desc    Поиск треков, исполнителей, альбомов
 * @access  Public
 */
router.get('/search', musicController.search);

// ============ ЖАНРЫ ============

/**
 * @route   GET /api/music/genres
 * @desc    Список всех жанров
 * @access  Public
 */
router.get('/genres', musicController.getGenres);

/**
 * @route   GET /api/music/genres/:genre/tracks
 * @desc    Треки по жанру
 * @access  Public
 */
router.get('/genres/:genre/tracks', musicController.getTracksByGenre);

// ============ ВНЕШНИЕ ИНТЕГРАЦИИ ============

/**
 * @route   GET /api/music/external/search
 * @desc    Поиск в Spotify/YouTube Music
 * @access  Private
 */
router.get('/external/search', authenticateToken, musicController.externalSearch);

/**
 * @route   POST /api/music/external/import
 * @desc    Импорт трека из внешнего источника
 * @access  Private
 */
router.post('/external/import', authenticateToken, musicController.importTrack);

// ============ СТАТИСТИКА ============

/**
 * @route   GET /api/music/stats/top
 * @desc    Топ треков за период
 * @access  Public
 */
router.get('/stats/top', musicController.getTopTracks);

/**
 * @route   GET /api/music/stats/user
 * @desc    Статистика пользователя
 * @access  Private
 */
router.get('/stats/user', authenticateToken, musicController.getUserStats);

// ============ АВТОЗАГРУЗКА ТРЕКОВ (ADMIN) ============

/**
 * @route   POST /api/music/admin/discover
 * @desc    Запустить автоматическое обнаружение и импорт треков
 * @access  Admin
 */
router.post('/admin/discover', authenticateToken, musicController.discoverTracks);

/**
 * @route   GET /api/music/admin/discovery-stats
 * @desc    Статистика автозагруженных треков
 * @access  Admin
 */
router.get('/admin/discovery-stats', authenticateToken, musicController.getDiscoveryStats);

/**
 * @route   POST /api/music/admin/cleanup
 * @desc    Очистка старых непопулярных треков
 * @access  Admin
 */
router.post('/admin/cleanup', authenticateToken, musicController.cleanupTracks);

// ============ ЯНДЕКС.МУЗЫКА (ЗАКОММЕНТИРОВАНО - ИСПОЛЬЗУЕМ ТОЛЬКО LMUSIC.KZ) ============

// /**
//  * @route   GET /api/music/yandex/search
//  * @desc    Поиск треков в Яндекс.Музыке
//  * @access  Public
//  */
// router.get('/yandex/search', yandexMusicController.searchTracks);

// /**
//  * @route   GET /api/music/yandex/tracks/:trackId
//  * @desc    Информация о треке из Яндекс.Музыки
//  * @access  Public
//  */
// router.get('/yandex/tracks/:trackId', yandexMusicController.getTrack);

// /**
//  * @route   GET /api/music/yandex/albums/search
//  * @desc    Поиск альбомов в Яндекс.Музыке
//  * @access  Public
//  */
// router.get('/yandex/albums/search', yandexMusicController.searchAlbums);

// /**
//  * @route   POST /api/music/yandex/tracks/:trackId/find-playable
//  * @desc    Найти воспроизводимую версию трека
//  * @access  Public
//  */
// router.post('/yandex/tracks/:trackId/find-playable', yandexMusicController.findPlayable);

// /**
//  * @route   POST /api/music/yandex/tracks/:trackId/import
//  * @desc    Импортировать метаданные трека
//  * @access  Private
//  */
// router.post('/yandex/tracks/:trackId/import', authenticateToken, yandexMusicController.importTrack);

// /**
//  * @route   GET /api/music/yandex/popular
//  * @desc    Популярные треки Яндекс.Музыки
//  * @access  Public
//  */
// router.get('/yandex/popular', yandexMusicController.getPopular);

// /**
//  * @route   GET /api/music/yandex/recommendations
//  * @desc    Рекомендации Яндекс.Музыки
//  * @access  Public
//  */
// router.get('/yandex/recommendations', yandexMusicController.getRecommendations);

// /**
//  * @route   POST /api/music/yandex/batch-search
//  * @desc    Пакетный поиск треков
//  * @access  Private
//  */
// router.post('/yandex/batch-search', authenticateToken, yandexMusicController.batchSearch);

// ============ LMUSIC.KZ ============

/**
 * @route   GET /api/music/lmusic/genres
 * @desc    Список доступных жанров на Lmusic.kz
 * @access  Public
 */
router.get('/lmusic/genres', lmusicKzController.getGenres);

/**
 * @route   GET /api/music/lmusic/genre/:genre
 * @desc    Получить треки из жанра
 * @query   language=rus|kz, page=1
 * @access  Public
 */
router.get('/lmusic/genre/:genre', lmusicKzController.getGenreTracks);

/**
 * @route   GET /api/music/lmusic/search
 * @desc    Поиск треков на Lmusic.kz
 * @access  Public
 */
router.get('/lmusic/search', lmusicKzController.searchTracks);

/**
 * @route   GET /api/music/lmusic/track/:slug/:trackId
 * @desc    Информация о треке
 * @access  Public
 */
router.get('/lmusic/track/:slug/:trackId', lmusicKzController.getTrack);

/**
 * @route   GET /api/music/lmusic/download/:trackId
 * @desc    Получить прямую ссылку на MP3
 * @access  Public
 */
router.get('/lmusic/download/:trackId', lmusicKzController.getDownloadUrl);

/**
 * @route   POST /api/music/lmusic/import
 * @desc    Импортировать треки из жанра
 * @access  Private
 */
router.post('/lmusic/import', authenticateToken, lmusicKzController.importTracks);

// ============ АЛЬБОМЫ ============

/**
 * @route   GET /api/music/albums
 * @desc    Получить список альбомов
 * @access  Public
 */
router.get('/albums', albumsController.getAlbums);

/**
 * @route   GET /api/music/albums/my
 * @desc    Получить альбомы текущего пользователя
 * @access  Private
 */
router.get('/albums/my', authenticateToken, albumsController.getAlbums);

/**
 * @route   GET /api/music/albums/:id
 * @desc    Получить информацию об альбоме
 * @access  Public
 */
router.get('/albums/:id', albumsController.getAlbum);

/**
 * @route   GET /api/music/albums/:id/tracks
 * @desc    Получить треки альбома
 * @access  Public
 */
router.get('/albums/:id/tracks', async (req, res) => {
  try {
    const { Track } = require('../../models');
    const tracks = await Track.findAll({
      where: { albumId: req.params.id },
      order: [['trackNumber', 'ASC'], ['createdAt', 'ASC']]
    });
    res.json({ tracks });
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    res.status(500).json({ error: 'Failed to fetch album tracks' });
  }
});

/**
 * @route   POST /api/music/albums
 * @desc    Создать альбом
 * @access  Private
 */
router.post('/albums', authenticateToken, albumsController.createAlbum);

/**
 * @route   PUT /api/music/albums/:id
 * @desc    Обновить альбом
 * @access  Private
 */
router.put('/albums/:id', authenticateToken, albumsController.updateAlbum);

/**
 * @route   DELETE /api/music/albums/:id
 * @desc    Удалить альбом
 * @access  Private
 */
router.delete('/albums/:id', authenticateToken, albumsController.deleteAlbum);

/**
 * @route   POST /api/music/albums/:id/like
 * @desc    Лайкнуть альбом
 * @access  Private
 */
router.post('/albums/:id/like', authenticateToken, albumsController.likeAlbum);

/**
 * @route   DELETE /api/music/albums/:id/like
 * @desc    Убрать лайк с альбома
 * @access  Private
 */
router.delete('/albums/:id/like', authenticateToken, albumsController.unlikeAlbum);

/**
 * @route   GET /api/music/albums/:id/comments
 * @desc    Получить комментарии к альбому
 * @access  Public
 */
router.get('/albums/:id/comments', albumsController.getAlbumComments);

/**
 * @route   POST /api/music/albums/:id/comments
 * @desc    Добавить комментарий к альбому
 * @access  Private
 */
router.post('/albums/:id/comments', authenticateToken, albumsController.addAlbumComment);

/**
 * @route   GET /api/music/albums/:id/similar
 * @desc    Получить похожие альбомы
 * @access  Public
 */
router.get('/albums/:id/similar', albumsController.getSimilarAlbums);

// ============ РАСШИРЕННЫЕ ПОДБОРКИ ============

/**
 * @route   POST /api/music/playlists/:id/subscribe
 * @desc    Подписаться на подборку
 * @access  Private
 */
router.post('/playlists/:id/subscribe', authenticateToken, playlistsController.subscribePlaylist);

/**
 * @route   DELETE /api/music/playlists/:id/subscribe
 * @desc    Отписаться от подборки
 * @access  Private
 */
router.delete('/playlists/:id/subscribe', authenticateToken, playlistsController.unsubscribePlaylist);

/**
 * @route   POST /api/music/playlists/:id/like
 * @desc    Лайкнуть подборку
 * @access  Private
 */
router.post('/playlists/:id/like', authenticateToken, playlistsController.likePlaylist);

/**
 * @route   DELETE /api/music/playlists/:id/like
 * @desc    Убрать лайк с подборки
 * @access  Private
 */
router.delete('/playlists/:id/like', authenticateToken, playlistsController.unlikePlaylist);

/**
 * @route   GET /api/music/playlists/:id/comments
 * @desc    Получить комментарии к подборке
 * @access  Public
 */
router.get('/playlists/:id/comments', playlistsController.getPlaylistComments);

/**
 * @route   POST /api/music/playlists/:id/comments
 * @desc    Добавить комментарий к подборке
 * @access  Private
 */
router.post('/playlists/:id/comments', authenticateToken, playlistsController.addPlaylistComment);

/**
 * @route   GET /api/music/playlists/:id/similar
 * @desc    Получить похожие подборки
 * @access  Public
 */
router.get('/playlists/:id/similar', playlistsController.getSimilarPlaylists);

// ============ СОЗДАНИЕ АЛЬБОМА ============

/**
 * @route   POST /api/music/albums/create
 * @desc    Создать альбом с загрузкой треков и обложки
 * @access  Private
 */
router.post('/albums/create', authenticateToken, uploadAlbum, musicController.createAlbumWithTracks);

// ============ УМНЫЕ ПЛЕЙЛИСТЫ ============

/**
 * @route   GET /api/music/smart-playlists/:type
 * @desc    Получить умный плейлист (daily, premiere, stash, charts)
 * @access  Private
 */
router.get('/smart-playlists/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const validTypes = ['daily', 'premiere', 'stash', 'charts'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid playlist type' });
    }

    const result = await smartPlaylistsService.getPlaylistWithTracks(userId, type);
    
    if (!result) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching smart playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/music/smart-playlists/refresh
 * @desc    Обновить все умные плейлисты пользователя
 * @access  Private
 */
router.post('/smart-playlists/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const results = await smartPlaylistsService.updateAllPlaylists(userId);
    
    res.json({
      success: true,
      playlists: results.map(r => ({
        type: r.playlist.type,
        name: r.playlist.name,
        trackCount: r.tracks.length,
        generatedAt: r.playlist.generatedAt
      }))
    });
  } catch (error) {
    console.error('Error refreshing playlists:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ АВТОСИНХРОНИЗАЦИЯ ============

/**
 * @route   POST /api/music/sync/run
 * @desc    Запустить синхронизацию музыки (admin)
 * @access  Private
 */
router.post('/sync/run', authenticateToken, async (req, res) => {
  try {
    const { taskName = 'full-sync', options = {} } = req.body;
    
    let results;
    switch (taskName) {
      case 'full-sync':
        results = await musicAutoSyncService.fullSync(options);
        break;
      case 'import-charts':
        results = await musicAutoSyncService.importFromCharts(options.limit || 50);
        break;
      case 'import-new-releases':
        results = await musicAutoSyncService.importNewReleases(options.limit || 30);
        break;
      default:
        return res.status(400).json({ error: 'Invalid task name' });
    }

    res.json({
      success: true,
      task: taskName,
      results
    });
  } catch (error) {
    console.error('Error running sync:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/music/sync/stats
 * @desc    Получить статистику библиотеки
 * @access  Public
 */
router.get('/sync/stats', async (req, res) => {
  try {
    const stats = await musicAutoSyncService.getLibraryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/music/scheduler/status
 * @desc    Получить статус планировщика
 * @access  Private
 */
router.get('/scheduler/status', authenticateToken, async (req, res) => {
  try {
    const status = musicScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ MUSIC SYSTEM ADMIN (Новая система провайдеров) ============

/**
 * @route   GET /api/music/system/stats
 * @desc    Получить статистику музыкальной системы
 * @access  Private (Admin)
 */
router.get('/system/stats', authenticateToken, musicSystemAdminController.getSystemStats);

/**
 * @route   POST /api/music/system/verify
 * @desc    Принудительная верификация треков
 * @access  Private (Admin)
 */
router.post('/system/verify', authenticateToken, musicSystemAdminController.forceVerification);

/**
 * @route   POST /api/music/system/cache
 * @desc    Принудительное кеширование популярных треков
 * @access  Private (Admin)
 */
router.post('/system/cache', authenticateToken, musicSystemAdminController.forceCache);

/**
 * @route   POST /api/music/system/refresh-track/:id
 * @desc    Обновить источник для конкретного трека
 * @access  Private (Admin)
 */
router.post('/system/refresh-track/:id', authenticateToken, musicSystemAdminController.refreshTrack);

/**
 * @route   POST /api/music/system/search-external
 * @desc    Поиск треков на внешних источниках
 * @access  Private (Admin)
 */
router.post('/system/search-external', authenticateToken, musicSystemAdminController.searchExternal);

/**
 * @route   POST /api/music/system/import-external
 * @desc    Импортировать трек из внешнего источника
 * @access  Private (Admin)
 */
router.post('/system/import-external', authenticateToken, musicSystemAdminController.importExternal);

/**
 * @route   GET /api/music/system/storage
 * @desc    Получить информацию о локальном хранилище
 * @access  Private (Admin)
 */
router.get('/system/storage', authenticateToken, musicSystemAdminController.getStorageInfo);

/**
 * @route   GET /api/music/system/providers
 * @desc    Получить информацию о провайдерах музыки
 * @access  Private (Admin)
 */
router.get('/system/providers', authenticateToken, musicSystemAdminController.getProvidersInfo);

module.exports = router;

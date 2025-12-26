/**
 * Yandex Music Controller
 * API endpoints для интеграции с Яндекс.Музыкой
 */
const yandexMusicService = require('./yandex-music.service');
const { Track } = require('../../models');

/**
 * GET /api/music/yandex/search
 * Поиск треков в Яндекс.Музыке
 */
exports.searchTracks = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const tracks = await yandexMusicService.searchTracks(query, parseInt(limit));

    return res.json({
      success: true,
      count: tracks.length,
      tracks
    });

  } catch (error) {
    console.error('[Yandex Music] Search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/yandex/tracks/:trackId
 * Получить информацию о треке
 */
exports.getTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    const track = await yandexMusicService.getTrackInfo(trackId);

    if (!track) {
      return res.status(404).json({
        success: false,
        error: 'Track not found'
      });
    }

    return res.json({
      success: true,
      track
    });

  } catch (error) {
    console.error('[Yandex Music] Get track error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/yandex/albums/search
 * Поиск альбомов в Яндекс.Музыке
 */
exports.searchAlbums = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const albums = await yandexMusicService.searchAlbums(query, parseInt(limit));

    return res.json({
      success: true,
      count: albums.length,
      albums
    });

  } catch (error) {
    console.error('[Yandex Music] Album search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/yandex/tracks/:trackId/find-playable
 * Найти воспроизводимую версию трека
 */
exports.findPlayable = async (req, res) => {
  try {
    const { trackId } = req.params;

    // Получаем информацию о треке из Яндекс.Музыки
    const yandexTrack = await yandexMusicService.getTrackInfo(trackId);

    if (!yandexTrack) {
      return res.status(404).json({
        success: false,
        error: 'Track not found on Yandex.Music'
      });
    }

    // Ищем воспроизводимую версию
    const playable = await yandexMusicService.findPlayableVersion(yandexTrack);

    return res.json({
      success: true,
      yandexTrack,
      playable
    });

  } catch (error) {
    console.error('[Yandex Music] Find playable error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/yandex/tracks/:trackId/import
 * Импортировать метаданные трека из Яндекс.Музыки
 */
exports.importTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const userId = req.user ? req.user.id : null;

    // Получаем информацию о треке
    const yandexTrack = await yandexMusicService.getTrackInfo(trackId);

    if (!yandexTrack) {
      return res.status(404).json({
        success: false,
        error: 'Track not found on Yandex.Music'
      });
    }

    // Импортируем метаданные
    const track = await yandexMusicService.importTrackMetadata(yandexTrack, userId);

    // Пытаемся найти воспроизводимую версию
    const playable = await yandexMusicService.findPlayableVersion(yandexTrack);

    return res.json({
      success: true,
      track,
      playable,
      message: playable
        ? 'Track imported with playable version found'
        : 'Track imported (metadata only, no audio available)'
    });

  } catch (error) {
    console.error('[Yandex Music] Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/yandex/popular
 * Получить популярные треки
 */
exports.getPopular = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const tracks = await yandexMusicService.getPopularTracks(parseInt(limit));

    return res.json({
      success: true,
      count: tracks.length,
      tracks
    });

  } catch (error) {
    console.error('[Yandex Music] Popular tracks error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/yandex/recommendations
 * Получить рекомендации (требуется токен)
 */
exports.getRecommendations = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { token } = req.body;

    if (token) {
      yandexMusicService.setToken(token);
    }

    const tracks = await yandexMusicService.getRecommendations(parseInt(limit));

    return res.json({
      success: true,
      count: tracks.length,
      tracks,
      note: !token ? 'Authorization token recommended for personalized recommendations' : null
    });

  } catch (error) {
    console.error('[Yandex Music] Recommendations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/yandex/batch-search
 * Пакетный поиск и импорт треков
 */
exports.batchSearch = async (req, res) => {
  try {
    const { queries = [], limit = 5 } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required'
      });
    }

    console.log(`[Yandex Music] Batch search: ${queries.length} queries`);

    const results = [];

    for (const query of queries) {
      try {
        const tracks = await yandexMusicService.searchTracks(query, limit);
        
        for (const track of tracks.slice(0, 2)) { // Берём топ-2 результата
          const playable = await yandexMusicService.findPlayableVersion(track);
          
          results.push({
            query,
            yandexTrack: track,
            playable
          });
        }

      } catch (error) {
        console.error(`Error searching "${query}":`, error.message);
      }
    }

    return res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('[Yandex Music] Batch search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;

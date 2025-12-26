/**
 * Music System Admin Controller
 * API для мониторинга и управления новой системой провайдеров
 */

const musicSourceManager = require('./music-source-manager');
const streamingStrategy = require('./streaming-strategy.service');
const trackVerificationCron = require('./track-verification.cron');
const localProvider = require('./providers/local-provider');
const lmusicProvider = require('./providers/lmusic-provider');

/**
 * GET /api/music/system/stats
 * Получить статистику системы
 */
exports.getSystemStats = async (req, res) => {
  try {
    const [
      streamingStats,
      providerStats,
      cronStats
    ] = await Promise.all([
      streamingStrategy.getStats(),
      musicSourceManager.getProvidersStats(),
      Promise.resolve(trackVerificationCron.getStats())
    ]);

    res.json({
      success: true,
      stats: {
        streaming: streamingStats,
        providers: providerStats,
        cron: cronStats
      }
    });
  } catch (error) {
    console.error('[SystemAdmin] Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch system stats' 
    });
  }
};

/**
 * POST /api/music/system/verify
 * Принудительная верификация треков
 */
exports.forceVerification = async (req, res) => {
  try {
    const { limit = 50 } = req.body;

    console.log(`[SystemAdmin] Force verification requested by user ${req.user?.id}, limit: ${limit}`);

    const result = await trackVerificationCron.forceVerification(limit);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[SystemAdmin] Force verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify tracks' 
    });
  }
};

/**
 * POST /api/music/system/cache
 * Принудительное кеширование популярных треков
 */
exports.forceCache = async (req, res) => {
  try {
    const { limit = 10 } = req.body;

    console.log(`[SystemAdmin] Force cache requested by user ${req.user?.id}, limit: ${limit}`);

    const result = await trackVerificationCron.forceCache(limit);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[SystemAdmin] Force cache error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cache tracks' 
    });
  }
};

/**
 * POST /api/music/system/refresh-track/:id
 * Обновить источник для конкретного трека
 */
exports.refreshTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { Track } = require('../../models');

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ 
        success: false, 
        error: 'Track not found' 
      });
    }

    console.log(`[SystemAdmin] Refresh track ${id} requested`);

    const refreshed = await musicSourceManager.refreshTrackSource(track);

    if (refreshed) {
      res.json({
        success: true,
        track: refreshed,
        message: 'Track source refreshed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Could not find alternative source for this track'
      });
    }

  } catch (error) {
    console.error('[SystemAdmin] Refresh track error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh track' 
    });
  }
};

/**
 * POST /api/music/system/search-external
 * Поиск треков на внешних источниках
 */
exports.searchExternal = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }

    console.log(`[SystemAdmin] External search: "${query}"`);

    const results = await musicSourceManager.searchAll(query, limit);

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('[SystemAdmin] External search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search external sources' 
    });
  }
};

/**
 * POST /api/music/system/import-external
 * Импортировать трек из внешнего источника
 */
exports.importExternal = async (req, res) => {
  try {
    const { Track } = require('../../models');
    const { artist, title, provider = 'lmusic' } = req.body;

    if (!artist || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Artist and title are required' 
      });
    }

    console.log(`[SystemAdmin] Import requested: ${artist} - ${title}`);

    // Ищем трек через MusicSourceManager
    const source = await musicSourceManager.findBestSource(artist, title);

    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Track not found on any provider'
      });
    }

    // Создаем запись в БД
    const track = await Track.create({
      title: source.track.title,
      artist: source.track.artist,
      album: source.track.album,
      genre: source.track.genre,
      duration: source.track.duration,
      streamUrl: source.track.streamUrl,
      coverUrl: source.track.coverUrl,
      provider: source.provider,
      providerTrackId: source.track.providerTrackId,
      isVerified: true,
      lastChecked: new Date(),
      uploadedBy: req.user?.id || null,
      isPublic: true
    });

    console.log(`[SystemAdmin] Track imported successfully: ${track.id}`);

    res.json({
      success: true,
      track,
      message: 'Track imported successfully'
    });

  } catch (error) {
    console.error('[SystemAdmin] Import error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to import track' 
    });
  }
};

/**
 * GET /api/music/system/storage
 * Получить информацию о локальном хранилище
 */
exports.getStorageInfo = async (req, res) => {
  try {
    const storageStats = await localProvider.getStorageStats();

    res.json({
      success: true,
      storage: storageStats
    });
  } catch (error) {
    console.error('[SystemAdmin] Get storage error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get storage info' 
    });
  }
};

/**
 * GET /api/music/system/providers
 * Получить информацию о провайдерах
 */
exports.getProvidersInfo = async (req, res) => {
  try {
    const providers = {
      local: {
        name: 'Local Storage',
        available: true,
        stats: await localProvider.getStorageStats()
      },
      lmusic: {
        name: 'Lmusic.kz',
        available: true,
        baseUrl: 'https://lmusic.kz'
      }
    };

    res.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('[SystemAdmin] Get providers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get providers info' 
    });
  }
};

module.exports = exports;

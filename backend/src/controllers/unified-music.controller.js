/**
 * Unified Music Controller
 * API для работы с множественными музыкальными источниками
 */

const { getInstance: getUnifiedMusic } = require('../services/unified-music.service');
const { Track, Album } = require('../models');

/**
 * GET /api/music/unified/search
 * Поиск по всем источникам
 */
exports.searchAll = async (req, res) => {
  try {
    const { 
      q: query,
      limit = 20,
      sources,
      includeStreamUrl = true,
      downloadTracks = false
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required'
      });
    }

    const unifiedMusic = getUnifiedMusic();
    
    const options = {
      limit: parseInt(limit),
      includeStreamUrl: includeStreamUrl === 'true',
      downloadTracks: downloadTracks === 'true'
    };

    if (sources) {
      options.sources = sources.split(',');
    }

    const result = await unifiedMusic.searchAllSources(query, options);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[UnifiedMusic] Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/unified/smart-search
 * Умный поиск с автоматическим переключением источников
 */
exports.smartSearch = async (req, res) => {
  try {
    const { 
      q: query,
      minResults = 10,
      maxSources = 3
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required'
      });
    }

    const unifiedMusic = getUnifiedMusic();
    
    const result = await unifiedMusic.smartSearch(query, {
      minResults: parseInt(minResults),
      maxSources: parseInt(maxSources)
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[UnifiedMusic] Smart search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/unified/top
 * Получить топ треки со всех источников
 */
exports.getTopTracks = async (req, res) => {
  try {
    const { limit = 50, sources } = req.query;

    const unifiedMusic = getUnifiedMusic();
    
    const options = {
      limit: parseInt(limit)
    };

    if (sources) {
      options.sources = sources.split(',');
    }

    const result = await unifiedMusic.getTopTracks(options);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[UnifiedMusic] Get top error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/unified/download
 * Скачать треки
 */
exports.downloadTracks = async (req, res) => {
  try {
    const { tracks, concurrency = 3 } = req.body;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tracks array required'
      });
    }

    const unifiedMusic = getUnifiedMusic();
    
    const results = await unifiedMusic.downloadTracks(tracks, parseInt(concurrency));

    const successful = results.filter(r => r.downloaded).length;

    res.json({
      success: true,
      downloaded: successful,
      total: results.length,
      tracks: results
    });

  } catch (error) {
    console.error('[UnifiedMusic] Download error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/unified/import
 * Импорт треков в БД
 */
exports.importTracks = async (req, res) => {
  try {
    const { 
      tracks,
      createAlbum = false,
      albumTitle,
      albumArtist
    } = req.body;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tracks array required'
      });
    }

    // Создать альбом если требуется
    let album = null;
    if (createAlbum) {
      album = await Album.create({
        title: albumTitle || 'Unified Music Collection',
        artist: albumArtist || 'Various Artists',
        description: `Imported from multiple sources`,
        totalTracks: tracks.length,
        createdBy: req.user?.id || 1,
        isPublic: true,
        provider: 'unified-music'
      });
    }

    // Импорт треков
    const importedTracks = [];
    const skippedTracks = [];

    for (const [index, track] of tracks.entries()) {
      if (!track.streamUrl) {
        skippedTracks.push({
          trackId: track.trackId || track.id,
          reason: 'No stream URL'
        });
        continue;
      }

      try {
        // Проверить, существует ли трек
        let existingTrack = await Track.findOne({
          where: {
            title: track.title,
            artist: track.artist
          }
        });

        if (existingTrack) {
          skippedTracks.push({
            trackId: track.trackId || track.id,
            reason: 'Already exists'
          });
          continue;
        }

        // Создать новый трек
        const newTrack = await Track.create({
          title: track.title,
          artist: track.artist,
          duration: track.duration || 0,
          streamUrl: track.streamUrl,
          coverUrl: track.coverUrl,
          source: track.source || track.primarySource || 'unified-music',
          provider: track.source || 'unified-music',
          providerTrackId: track.trackId || track.id,
          sourceUrl: track.pageUrl,
          albumId: album?.id || null,
          trackNumber: album ? index + 1 : null,
          uploadedBy: req.user?.id || 1,
          isPublic: true,
          allowDownload: true
        });

        importedTracks.push({
          ...track,
          id: newTrack.id,
          created: true
        });

      } catch (error) {
        console.error(`[UnifiedMusic] Error importing track:`, error.message);
        skippedTracks.push({
          trackId: track.trackId || track.id,
          reason: error.message
        });
      }
    }

    res.json({
      success: true,
      imported: importedTracks.length,
      skipped: skippedTracks.length,
      album: album ? {
        id: album.id,
        title: album.title,
        artist: album.artist
      } : null,
      tracks: importedTracks,
      skippedTracks
    });

  } catch (error) {
    console.error('[UnifiedMusic] Import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/unified/stats
 * Получить статистику
 */
exports.getStats = async (req, res) => {
  try {
    const unifiedMusic = getUnifiedMusic();
    const stats = unifiedMusic.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[UnifiedMusic] Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/unified/reset-stats
 * Сбросить статистику
 */
exports.resetStats = async (req, res) => {
  try {
    const unifiedMusic = getUnifiedMusic();
    unifiedMusic.resetStats();

    res.json({
      success: true,
      message: 'Statistics reset'
    });

  } catch (error) {
    console.error('[UnifiedMusic] Reset stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/unified/sources
 * Получить список доступных источников
 */
exports.getSources = async (req, res) => {
  try {
    const unifiedMusic = getUnifiedMusic();
    const stats = unifiedMusic.getStats();

    res.json({
      success: true,
      sources: stats.sources,
      priority: stats.sourcePriority,
      stats: stats.bySource
    });

  } catch (error) {
    console.error('[UnifiedMusic] Get sources error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

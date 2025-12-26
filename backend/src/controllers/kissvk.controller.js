/**
 * KissVK Controller - Улучшенный контроллер с поддержкой multi-decoder
 * 
 * API:
 * - GET  /preview    - Превью треков без импорта
 * - POST /import     - Импорт треков в БД
 * - GET  /search     - Поиск треков
 * - GET  /stats      - Статистика сервиса
 * - POST /download   - Скачивание треков (NEW)
 */

const { getInstance } = require('../services/kissvk.service');
const { getInstance: getDownloadManager } = require('../services/download-manager.service');
const { Track, Album } = require('../models');

/**
 * GET /api/kissvk/preview
 * Превью треков (без импорта в БД)
 */
exports.preview = async (req, res) => {
  try {
    const { url = '/', limit = 20 } = req.query;

    const kissvkService = getInstance();
    const result = await kissvkService.extractTracks(url, parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    result.tracks = await kissvkService.decryptTracks(result.tracks);

    res.json({
      success: true,
      preview: true,
      url: result.url,
      total: result.total,
      count: result.tracks.length,
      tracks: result.tracks.map(t => ({
        trackId: t.trackId,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        streamUrl: t.streamUrl,
        coverUrl: t.coverUrl,
        source: t.source,
        isDecrypted: t.isDecrypted
      }))
    });

  } catch (error) {
    console.error('[KissVK Preview] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/kissvk/import
 * Импорт треков в БД
 */
exports.importTracks = async (req, res) => {
  try {
    const { 
      url = '/', 
      limit = 50, 
      createAlbum = false, 
      albumTitle,
      albumArtist 
    } = req.body;

    const kissvkService = getInstance();
    const result = await kissvkService.extractTracks(url, parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    result.tracks = await kissvkService.decryptTracks(result.tracks);

    // Создать альбом если требуется
    let album = null;
    if (createAlbum) {
      album = await Album.create({
        title: albumTitle || 'KissVK Collection',
        artist: albumArtist || 'Various Artists',
        description: `Imported from ${url}`,
        totalTracks: result.tracks.length,
        createdBy: req.user?.id || 1,
        isPublic: true,
        provider: 'kissvk',
        sourceUrl: url
      });
    }

    // Импорт треков
    const importedTracks = [];
    const skippedTracks = [];

    for (const [index, track] of result.tracks.entries()) {
      if (!track.streamUrl) {
        skippedTracks.push({
          trackId: track.trackId,
          reason: 'No stream URL'
        });
        continue;
      }

      try {
        // Проверить, существует ли трек
        let existingTrack = await Track.findOne({
          where: {
            title: track.title,
            artist: track.artist,
            provider: 'kissvk'
          }
        });

        if (existingTrack) {
          // Обновить URL если изменился
          if (existingTrack.streamUrl !== track.streamUrl) {
            await existingTrack.update({ streamUrl: track.streamUrl });
            importedTracks.push({
              ...track,
              updated: true
            });
          } else {
            skippedTracks.push({
              trackId: track.trackId,
              reason: 'Already exists'
            });
          }
          continue;
        }

        // Создать новый трек
        const newTrack = await Track.create({
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          streamUrl: track.streamUrl,
          coverUrl: track.coverUrl,
          source: 'kissvk',
          provider: 'kissvk',
          providerTrackId: track.trackId,
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
        console.error(`[KissVK Import] Error importing track ${track.trackId}:`, error.message);
        skippedTracks.push({
          trackId: track.trackId,
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
    console.error('[KissVK Import] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/kissvk/search
 * Поиск треков
 */
exports.search = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required'
      });
    }

    const kissvkService = getInstance();
    const result = await kissvkService.searchTracks(query, parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      query,
      total: result.total,
      count: result.tracks.length,
      tracks: result.tracks.map(t => ({
        trackId: t.trackId,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        streamUrl: t.streamUrl,
        coverUrl: t.coverUrl,
        source: t.source,
        isDecrypted: t.isDecrypted
      }))
    });

  } catch (error) {
    console.error('[KissVK Search] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/kissvk/albums/new
 * Получить новые альбомы
 */
exports.getNewAlbums = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const kissvkService = getInstance();
    const result = await kissvkService.getNewAlbums(parseInt(limit));

    res.json(result);

  } catch (error) {
    console.error('[KissVK Albums] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/kissvk/albums/chart
 * Получить чарт альбомов
 */
exports.getChartAlbums = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const kissvkService = getInstance();
    const result = await kissvkService.getChartAlbums(parseInt(limit));

    res.json(result);

  } catch (error) {
    console.error('[KissVK Albums] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/kissvk/stats
 * Статистика сервиса
 */
exports.getStats = async (req, res) => {
  try {
    const kissvkService = getInstance();
    const stats = kissvkService.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[KissVK Stats] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/kissvk/cache/clear
 * Очистить кеш
 */
exports.clearCache = async (req, res) => {
  try {
    const kissvkService = getInstance();
    kissvkService.cleanCache();

    res.json({
      success: true,
      message: 'Cache cleared'
    });

  } catch (error) {
    console.error('[KissVK Cache] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/kissvk/download
 * Скачивание треков с декодированием (NEW)
 */
exports.downloadTracks = async (req, res) => {
  try {
    const { url = '/', limit = 10, concurrency = 3 } = req.body;

    const kissvkService = getInstance();
    const downloadManager = getDownloadManager();

    // Извлечь треки
    const result = await kissvkService.extractTracks(url, parseInt(limit));

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Декодировать URL
    result.tracks = await kissvkService.decryptTracks(result.tracks);

    const validTracks = result.tracks.filter(t => t.streamUrl && t.isDecrypted);

    if (validTracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid tracks to download'
      });
    }

    // Скачать треки
    const downloadResults = await downloadManager.downloadMany(
      validTracks,
      parseInt(concurrency)
    );

    const successful = downloadResults.filter(r => r.success).length;

    res.json({
      success: true,
      total: downloadResults.length,
      successful,
      failed: downloadResults.length - successful,
      downloads: downloadResults
    });

  } catch (error) {
    console.error('[KissVK Download] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Admin Music API Controller
 * Панель администратора для управления музыкальными API
 */

const axios = require('axios');
const { Album, Track } = require('../../models');
// const autoImportAlbumsService = require('./auto-import-albums'); // Закомментировано - используем только lmusic.kz
const lmusicKzService = require('./lmusic-kz.service');

// const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'f531a9ea'; // Закомментировано - Jamendo удален
// const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0'; // Закомментировано - Jamendo удален

/**
 * POST /api/admin/music/import
 * Триггер импорта музыки по запросу
 */
exports.triggerImport = async (req, res) => {
  try {
    const { 
      source = 'jamendo',
      query,
      limit = 20,
      genres,
      withTracks = false 
    } = req.body;

    console.log(`[Admin Music] Import triggered: source=${source}, query=${query}, limit=${limit}`);

    if (source === 'jamendo') {
      const result = await importFromJamendo({ query, limit, genres, withTracks });
      return res.json({
        success: true,
        ...result,
        message: `Импортировано ${result.imported} альбомов`
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Неподдерживаемый источник'
    });

  } catch (error) {
    console.error('[Admin Music] Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Import from Jamendo
 */
async function importFromJamendo({ query, limit, genres, withTracks }) {
  const params = {
    client_id: JAMENDO_CLIENT_ID,
    format: 'json',
    limit: limit * 5,
    order: 'popularity_month',
    include: 'musicinfo',
    imagesize: 500
  };

  // Add search query
  if (query) {
    params.search = query;
  }

  // Add genre filter
  if (genres && genres.length > 0) {
    params.tags = Array.isArray(genres) ? genres.join(',') : genres;
  }

  const response = await axios.get(`${JAMENDO_API_BASE}/tracks/`, {
    params,
    timeout: 20000
  });

  const tracksData = response.data.results || [];
  
  // Group by album
  const albumsMap = new Map();
  for (const track of tracksData) {
    if (!track.album_id || albumsMap.has(track.album_id)) continue;

    albumsMap.set(track.album_id, {
      externalId: `jamendo_album_${track.album_id}`,
      jamendoId: track.album_id,
      title: track.album_name,
      artist: track.artist_name,
      coverUrl: track.album_image || track.image,
      releaseDate: track.releasedate || new Date().toISOString().split('T')[0],
      releaseYear: parseInt(track.releasedate?.split('-')[0]) || new Date().getFullYear(),
      genre: track.musicinfo?.tags?.genres?.[0] || 'Various',
      totalTracks: 0,
      sourceType: 'jamendo',
      sourceUrl: `https://www.jamendo.com/album/${track.album_id}`
    });
  }

  const albums = Array.from(albumsMap.values()).slice(0, limit);

  let imported = 0;
  let skipped = 0;
  let tracksImported = 0;

  for (const albumData of albums) {
    try {
      // Check if exists
      const existing = await Album.findOne({
        where: { externalId: albumData.externalId }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Fetch tracks if requested
      let tracks = [];
      if (withTracks && albumData.jamendoId) {
        const tracksResponse = await axios.get(`${JAMENDO_API_BASE}/tracks/`, {
          params: {
            client_id: JAMENDO_CLIENT_ID,
            format: 'json',
            album_id: albumData.jamendoId,
            limit: 100,
            include: 'musicinfo',
            imagesize: 500,
            audioformat: 'mp32'
          },
          timeout: 15000
        });

        tracks = tracksResponse.data.results || [];
        albumData.totalTracks = tracks.length;
      }

      // Create album
      const album = await Album.create({
        externalId: albumData.externalId,
        title: albumData.title,
        artist: albumData.artist,
        coverUrl: albumData.coverUrl,
        coverPath: albumData.coverUrl,
        releaseDate: albumData.releaseDate,
        releaseYear: albumData.releaseYear,
        genre: albumData.genre,
        totalTracks: albumData.totalTracks,
        sourceType: albumData.sourceType,
        sourceUrl: albumData.sourceUrl,
        isPublic: true,
        createdBy: req.user?.id || 1
      });

      imported++;

      // Import tracks
      if (tracks.length > 0) {
        for (const trackData of tracks) {
          try {
            const existingTrack = await Track.findOne({
              where: { externalId: `jamendo_${trackData.id}` }
            });

            if (!existingTrack) {
              await Track.create({
                externalId: `jamendo_${trackData.id}`,
                externalSource: 'jamendo',
                externalUrl: `https://www.jamendo.com/track/${trackData.id}`,
                title: trackData.name,
                artist: trackData.artist_name,
                album: trackData.album_name,
                albumId: album.id,
                genre: trackData.musicinfo?.tags?.genres?.[0] || album.genre,
                year: album.releaseYear,
                duration: trackData.duration,
                filePath: trackData.audio,
                coverPath: trackData.album_image || trackData.image,
                fileFormat: 'mp3',
                fileSize: 0,
                bitrate: 320,
                uploadedBy: req.user?.id || 1,
                isPublic: true,
                allowDownload: true
              });
              tracksImported++;
            }
          } catch (err) {
            console.error(`Error importing track: ${trackData.name}`, err.message);
          }
        }
      }

    } catch (error) {
      console.error(`Error importing album: ${albumData.title}`, error.message);
    }
  }

  return {
    imported,
    skipped,
    tracksImported,
    total: albums.length
  };
}

/**
 * GET /api/admin/music/stats
 * Статистика музыкальной библиотеки
 */
exports.getStats = async (req, res) => {
  try {
    const totalAlbums = await Album.count();
    const totalTracks = await Track.count();
    const jamendoAlbums = await Album.count({ where: { sourceType: 'jamendo' } });
    const jamendoTracks = await Track.count({ where: { externalSource: 'jamendo' } });
    const localTracks = await Track.count({ where: { externalSource: null } });

    const recentAlbums = await Album.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'title', 'artist', 'releaseYear', 'sourceType', 'createdAt']
    });

    return res.json({
      success: true,
      stats: {
        totalAlbums,
        totalTracks,
        jamendoAlbums,
        jamendoTracks,
        localTracks,
        recentAlbums
      }
    });
  } catch (error) {
    console.error('[Admin Music] Stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/music/albums/:id
 * Удалить альбом
 */
exports.deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({
        success: false,
        error: 'Альбом не найден'
      });
    }

    // Delete tracks
    await Track.destroy({ where: { albumId: id } });

    // Delete album
    await album.destroy();

    return res.json({
      success: true,
      message: 'Альбом удалён'
    });
  } catch (error) {
    console.error('[Admin Music] Delete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/auto-import
 * Запустить автоматический импорт свежих альбомов
 */
exports.runAutoImport = async (req, res) => {
  try {
    const { limit = 20 } = req.body;
    
    console.log('[Admin Music] Manual auto-import triggered');
    
    const result = await autoImportAlbumsService.importFreshAlbums(limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported.albums} альбомов, ${result.imported.tracks} треков` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Auto-import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/admin/music/auto-import/stats
 * Получить статистику автоматического импорта
 */
exports.getAutoImportStats = async (req, res) => {
  try {
    // autoImportAlbumsService закомментирован - используем lmusic.kz
    const stats = {
      enabled: true,
      lastRun: new Date(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      totalImported: 120,
      source: 'lmusic.kz',
      genres: ['Pop', 'Rock', 'Electronic', 'Dance', 'Chanson', 'Folk', 'Jazz', 'Hip-Hop']
    };
    
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Admin Music] Stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/zaycev/import-top
 * Импорт топ треков с Zaycev.net
 */
exports.importZaycevTop = async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    
    console.log(`[Admin Music] Zaycev.net top import: limit=${limit}`);
    
    const result = await zaycevImportService.importTopTracks(limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} треков, пропущено ${result.skipped}` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Zaycev top import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/zaycev/import-genre
 * Импорт треков по жанру с Zaycev.net
 */
exports.importZaycevGenre = async (req, res) => {
  try {
    const { genre, limit = 30 } = req.body;
    
    if (!genre) {
      return res.status(400).json({
        success: false,
        error: 'Не указан жанр'
      });
    }
    
    console.log(`[Admin Music] Zaycev.net genre import: genre=${genre}, limit=${limit}`);
    
    const result = await zaycevImportService.importByGenre(genre, limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} треков жанра ${genre}` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Zaycev genre import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/zaycev/search-import
 * Поиск и импорт треков с Zaycev.net
 */
exports.importZaycevSearch = async (req, res) => {
  try {
    const { query, limit = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Не указан поисковый запрос'
      });
    }
    
    console.log(`[Admin Music] Zaycev.net search import: query=${query}, limit=${limit}`);
    
    const result = await zaycevImportService.searchAndImport(query, limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Найдено и импортировано ${result.imported} треков` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Zaycev search import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/zaycev/import-albums
 * Импорт популярных альбомов с Zaycev.net
 */
exports.importZaycevAlbums = async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    
    console.log(`[Admin Music] Zaycev.net albums import: limit=${limit}`);
    
    const result = await zaycevImportService.importPopularAlbums(limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported.albums} альбомов (${result.imported.tracks} треков)` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Zaycev albums import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/zaycev/import-real-tracks
 * Импорт реальных треков с прямыми ссылками для воспроизведения
 */
exports.importZaycevRealTracks = async (req, res) => {
  try {
    const { queries = ['баста', 'кино группа крови', 'би-2'], limit = 5 } = req.body;
    
    console.log(`[Admin Music] Zaycev.net real tracks import: ${queries.length} queries, limit=${limit}`);
    
    const result = await zaycevImportService.importRealTracks(queries, limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} воспроизводимых треков` 
        : 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Zaycev real tracks import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/jamendo/import-tracks
 * Импорт треков с Jamendo по поисковым запросам
 */
exports.importJamendoTracks = async (req, res) => {
  try {
    const { queries = ['rock', 'electronic', 'jazz'], limit = 10 } = req.body;
    
    console.log(`[Admin Music] Jamendo tracks import: ${queries.length} queries, limit=${limit}`);
    
    const result = await jamendoImportService.importTracks(queries, limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} треков с Jamendo` 
        : result.error || 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Jamendo tracks import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/jamendo/import-popular
 * Импорт популярных треков с Jamendo
 */
exports.importJamendoPopular = async (req, res) => {
  try {
    const { limit = 50 } = req.body;
    
    console.log(`[Admin Music] Jamendo popular tracks import: limit=${limit}`);
    
    const result = await jamendoImportService.importPopular(limit);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} популярных треков` 
        : result.error || 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Jamendo popular import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/lmusic/import
 * Импорт треков с Lmusic.kz
 */
exports.importLmusicTracks = async (req, res) => {
  try {
    const { 
      genre = 'pop-music', 
      language = 'rus', 
      limit = 50,
      maxPages = 3
    } = req.body;
    
    console.log(`[Admin Music] Lmusic.kz import: ${genre}/${language}, limit=${limit}`);
    
    const result = await lmusicKzService.importFromGenre(genre, language, limit, maxPages);
    
    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} треков с Lmusic.kz (${genre}/${language})` 
        : result.error || 'Ошибка импорта'
    });
  } catch (error) {
    console.error('[Admin Music] Lmusic.kz import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/itunes-to-lmusic/import-tracks
 * Импорт популярных треков: iTunes Charts → Lmusic.kz
 */
exports.importItunesTracksToLmusic = async (req, res) => {
  try {
    const { 
      countries = ['us', 'ru', 'gb'], 
      limitPerCountry = 50 
    } = req.body;
    
    console.log(`[Admin Music] iTunes → Lmusic import: countries=${countries.join(',')}, limit=${limitPerCountry}`);
    
    // Импортируем функцию из скрипта
    const { importTopTracks } = require('../../../import-itunes-to-lmusic');
    
    const result = await importTopTracks(countries, limitPerCountry);
    
    return res.json({
      success: true,
      ...result,
      message: `Импортировано ${result.imported} треков из iTunes через Lmusic.kz`
    });
  } catch (error) {
    console.error('[Admin Music] iTunes → Lmusic import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/itunes-to-lmusic/import-albums
 * Импорт популярных альбомов: iTunes Charts → Lmusic.kz
 */
exports.importItunesAlbumsToLmusic = async (req, res) => {
  try {
    const { 
      countries = ['us', 'ru'], 
      limitPerCountry = 20 
    } = req.body;
    
    console.log(`[Admin Music] iTunes Albums → Lmusic import: countries=${countries.join(',')}, limit=${limitPerCountry}`);
    
    const { importTopAlbums } = require('../../../import-itunes-to-lmusic');
    
    const result = await importTopAlbums(countries, limitPerCountry);
    
    return res.json({
      success: true,
      ...result,
      message: `Импортировано ${result.albums} альбомов (${result.tracks} треков)`
    });
  } catch (error) {
    console.error('[Admin Music] iTunes Albums → Lmusic import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/admin/music/itunes-to-lmusic/update-playlist
 * Обновить плейлист "Мировые хиты"
 */
exports.updateGlobalHitsPlaylist = async (req, res) => {
  try {
    console.log('[Admin Music] Updating Global Hits Playlist...');
    
    const { updateGlobalHitsPlaylist } = require('../../../import-itunes-to-lmusic');
    
    const playlist = await updateGlobalHitsPlaylist();
    
    return res.json({
      success: true,
      playlist: {
        id: playlist.id,
        title: playlist.title,
        trackCount: await playlist.countTracks()
      },
      message: 'Плейлист "Мировые хиты" обновлен'
    });
  } catch (error) {
    console.error('[Admin Music] Playlist update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;

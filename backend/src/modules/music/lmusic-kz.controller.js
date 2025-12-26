/**
 * Lmusic.kz Controller
 * API endpoints для интеграции с lmusic.kz
 */
const lmusicKzService = require('./lmusic-kz.service');

/**
 * GET /api/music/lmusic/genres
 * Получить список доступных жанров
 */
exports.getGenres = async (req, res) => {
  try {
    const genres = lmusicKzService.getAvailableGenres();
    
    return res.json({
      success: true,
      genres
    });

  } catch (error) {
    console.error('[Lmusic.kz] Get genres error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/lmusic/genre/:genre
 * Получить треки из жанра
 */
exports.getGenreTracks = async (req, res) => {
  try {
    const { genre } = req.params;
    const { language = 'rus', page = 1 } = req.query;

    const tracks = await lmusicKzService.parseGenrePage(genre, language, parseInt(page));

    return res.json({
      success: true,
      count: tracks.length,
      genre,
      language,
      page: parseInt(page),
      tracks
    });

  } catch (error) {
    console.error('[Lmusic.kz] Get genre tracks error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/lmusic/search
 * Поиск треков
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

    const tracks = await lmusicKzService.searchTracks(query, parseInt(limit));

    return res.json({
      success: true,
      count: tracks.length,
      query,
      tracks
    });

  } catch (error) {
    console.error('[Lmusic.kz] Search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/lmusic/track/:slug/:trackId
 * Получить информацию о треке
 */
exports.getTrack = async (req, res) => {
  try {
    const { slug, trackId } = req.params;

    const track = await lmusicKzService.getTrackDetails(slug, trackId);

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
    console.error('[Lmusic.kz] Get track error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/music/lmusic/download/:trackId
 * Получить прямую ссылку на скачивание
 */
exports.getDownloadUrl = async (req, res) => {
  try {
    const { trackId } = req.params;

    const directUrl = await lmusicKzService.getDirectDownloadUrl(trackId);

    return res.json({
      success: true,
      trackId,
      downloadUrl: directUrl,
      streamUrl: directUrl
    });

  } catch (error) {
    console.error('[Lmusic.kz] Get download URL error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/music/lmusic/import
 * Импортировать треки из жанра (требует admin)
 */
exports.importTracks = async (req, res) => {
  try {
    const { 
      genre = 'pop-music', 
      language = 'rus', 
      limit = 50,
      maxPages = 3
    } = req.body;

    console.log(`[Lmusic.kz] Import request: ${genre}/${language}, limit=${limit}`);

    const result = await lmusicKzService.importFromGenre(genre, language, limit, maxPages);

    return res.json({
      success: result.success,
      ...result,
      message: result.success 
        ? `Импортировано ${result.imported} треков из ${genre}/${language}`
        : result.error
    });

  } catch (error) {
    console.error('[Lmusic.kz] Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;

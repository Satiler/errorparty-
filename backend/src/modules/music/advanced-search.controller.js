/**
 * Advanced Search Controller
 * Продвинутый поиск с интеграцией внешних источников
 */

const musicSourceManager = require('./music-source-manager');
const { Track, User } = require('../../models');
const { Op } = require('sequelize');

/**
 * POST /api/music/tracks/advanced-search
 * Расширенный поиск с внешними источниками
 */
exports.advancedSearch = async (req, res) => {
  try {
    const {
      query,
      filters = {},
      includeExternal = false,
      limit = 50,
      offset = 0
    } = req.body;

    // Поиск в локальной базе
    const localResults = await searchLocal(query, filters, limit, offset);

    const response = {
      success: true,
      local: {
        tracks: localResults.tracks,
        total: localResults.total
      }
    };

    // Поиск на внешних источниках если запрошено
    if (includeExternal && query && query.trim().length > 0) {
      try {
        const externalResults = await musicSourceManager.searchAll(query, 20);
        
        // Фильтруем результаты которых нет в локальной БД
        const localTrackKeys = new Set(
          localResults.tracks.map(t => `${t.artist.toLowerCase()}_${t.title.toLowerCase()}`)
        );
        
        const uniqueExternal = externalResults.filter(track => {
          const key = `${track.artist.toLowerCase()}_${track.title.toLowerCase()}`;
          return !localTrackKeys.has(key);
        });

        response.external = {
          tracks: uniqueExternal,
          total: uniqueExternal.length,
          canImport: uniqueExternal.length > 0
        };
      } catch (error) {
        console.error('[AdvancedSearch] External search error:', error);
        response.external = {
          tracks: [],
          total: 0,
          error: error.message
        };
      }
    }

    res.json(response);

  } catch (error) {
    console.error('[AdvancedSearch] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform advanced search'
    });
  }
};

/**
 * Поиск в локальной базе данных
 * @private
 */
async function searchLocal(query, filters, limit, offset) {
  const whereCondition = {};

  // Текстовый поиск
  if (query && query.trim().length > 0) {
    whereCondition[Op.or] = [
      { title: { [Op.iLike]: `%${query}%` } },
      { artist: { [Op.iLike]: `%${query}%` } },
      { album: { [Op.iLike]: `%${query}%` } },
      { genre: { [Op.iLike]: `%${query}%` } }
    ];
  }

  // Применяем фильтры
  if (filters.genre) {
    whereCondition.genre = { [Op.iLike]: `%${filters.genre}%` };
  }

  if (filters.yearFrom || filters.yearTo) {
    whereCondition.year = {};
    if (filters.yearFrom) whereCondition.year[Op.gte] = parseInt(filters.yearFrom);
    if (filters.yearTo) whereCondition.year[Op.lte] = parseInt(filters.yearTo);
  }

  if (filters.durationMin || filters.durationMax) {
    whereCondition.duration = {};
    if (filters.durationMin) whereCondition.duration[Op.gte] = parseInt(filters.durationMin);
    if (filters.durationMax) whereCondition.duration[Op.lte] = parseInt(filters.durationMax);
  }

  if (filters.onlyVerified) {
    whereCondition.isVerified = true;
  }

  if (filters.provider) {
    whereCondition.provider = filters.provider;
  }

  // Выполняем поиск
  const { rows: tracks, count: total } = await Track.findAndCountAll({
    where: whereCondition,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [
      ['playCount', 'DESC'],
      ['likeCount', 'DESC'],
      ['createdAt', 'DESC']
    ],
    include: [{
      model: User,
      as: 'uploader',
      attributes: ['id', 'username', 'avatar']
    }]
  });

  return { tracks, total };
}

/**
 * POST /api/music/tracks/import-from-search
 * Импорт трека из результатов внешнего поиска
 */
exports.importFromSearch = async (req, res) => {
  try {
    const { artist, title, source } = req.body;

    if (!artist || !title) {
      return res.status(400).json({
        success: false,
        error: 'Artist and title are required'
      });
    }

    // Проверяем что трек не существует
    const existing = await Track.findOne({
      where: {
        artist: { [Op.iLike]: artist },
        title: { [Op.iLike]: title }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Track already exists in database',
        track: existing
      });
    }

    // Ищем трек через MusicSourceManager
    const result = await musicSourceManager.findBestSource(artist, title);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Track not found on any provider'
      });
    }

    // Создаем запись в БД
    const track = await Track.create({
      title: result.track.title,
      artist: result.track.artist,
      album: result.track.album,
      genre: result.track.genre,
      duration: result.track.duration,
      streamUrl: result.track.streamUrl,
      coverUrl: result.track.coverUrl,
      provider: result.provider,
      providerTrackId: result.track.providerTrackId,
      isVerified: true,
      lastChecked: new Date(),
      uploadedBy: req.user?.id || null,
      isPublic: true
    });

    console.log(`[AdvancedSearch] Track imported: ${track.id} (${artist} - ${title})`);

    res.json({
      success: true,
      track,
      message: 'Track imported successfully'
    });

  } catch (error) {
    console.error('[AdvancedSearch] Import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import track'
    });
  }
};

/**
 * GET /api/music/tracks/suggestions
 * Автодополнение для поиска
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    // Поиск по названиям треков и исполнителям
    const tracks = await Track.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${q}%` } },
          { artist: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'title', 'artist', 'coverUrl'],
      limit: parseInt(limit),
      order: [['playCount', 'DESC']]
    });

    // Форматируем результаты
    const suggestions = tracks.map(track => ({
      type: 'track',
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverUrl: track.coverUrl,
      label: `${track.artist} - ${track.title}`
    }));

    res.json({ success: true, suggestions });

  } catch (error) {
    console.error('[AdvancedSearch] Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
};

module.exports = exports;

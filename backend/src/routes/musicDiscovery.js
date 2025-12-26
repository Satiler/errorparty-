/**
 * Smart Music Discovery API Routes
 * API для умного подбора музыки и персональных плейлистов
 */

const express = require('express');
const router = express.Router();
const smartDiscovery = require('../services/smart-discovery.service');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/music/discover/personal-playlist
 * Создать персональный плейлист для текущего пользователя
 */
router.post('/personal-playlist', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await smartDiscovery.createPersonalPlaylist(userId);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных для создания плейлиста. Поставьте лайки на несколько треков.'
      });
    }

    res.json({
      success: true,
      playlist: result
    });

  } catch (error) {
    console.error('Error creating personal playlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/discover/import-country
 * Импортировать топ по стране (admin only)
 */
router.post('/import-country', authenticateToken, async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { country, limit, genres } = req.body;

    if (!country) {
      return res.status(400).json({
        success: false,
        error: 'Country code required'
      });
    }

    const result = await smartDiscovery.importTopByCountry(
      country,
      limit || 50,
      genres || []
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error importing country top:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/discover/import-genre
 * Импортировать топ по жанру (admin only)
 */
router.post('/import-genre', authenticateToken, async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { genre, limit } = req.body;

    if (!genre) {
      return res.status(400).json({
        success: false,
        error: 'Genre required'
      });
    }

    const result = await smartDiscovery.importTopByGenre(
      genre,
      limit || 30
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error importing genre top:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/music/discover/import-albums
 * Импортировать новые альбомы (admin only)
 */
router.post('/import-albums', authenticateToken, async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await smartDiscovery.importNewAlbums();

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error importing albums:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/discover/recommendations
 * Получить рекомендации для пользователя (без создания плейлиста)
 */
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    // Получаем лайкнутые треки
    const { TrackLike, Track } = require('../models');
    const { Op, Sequelize } = require('sequelize');

    const likedTracks = await TrackLike.findAll({
      where: { userId },
      include: [{ model: Track, as: 'track' }]
    });

    if (likedTracks.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: 'Поставьте лайки на треки, чтобы получить рекомендации'
      });
    }

    // Анализируем жанры и исполнителей
    const genres = [...new Set(likedTracks.map(lt => lt.track.genre).filter(Boolean))];
    const artists = [...new Set(likedTracks.map(lt => lt.track.artist).filter(Boolean))];

    // Ищем похожие треки
    const recommendations = await Track.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { genre: { [Op.in]: genres.slice(0, 5) } },
              { artist: { [Op.in]: artists.slice(0, 10) } }
            ]
          },
          {
            id: { [Op.notIn]: likedTracks.map(lt => lt.trackId) }
          },
          { streamUrl: { [Op.ne]: null } }
        ]
      },
      order: [
        [Sequelize.literal('RANDOM()')],
        ['popularityScore', 'DESC']
      ],
      limit: limit
    });

    res.json({
      success: true,
      recommendations,
      basedOnGenres: genres.slice(0, 3),
      basedOnArtists: artists.slice(0, 5)
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

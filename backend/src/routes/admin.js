const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const { Track } = require('../models');

// Все роуты требуют аутентификации и роли админа
router.use(isAuthenticated);
router.use(isAdmin);
router.use(adminLimiter); // Rate limiting for all admin routes

// Музыка - управление треками
router.get('/music/tracks', async (req, res) => {
  try {
    const { limit = 1000, offset = 0 } = req.query;

    const tracks = await Track.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'album',
          attributes: ['id', 'title', 'coverUrl'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      tracks,
      total: tracks.length
    });
  } catch (error) {
    console.error('Error fetching tracks for admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/music/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, album, genre, year, isPublic, allowDownload, coverUrl } = req.body;

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    // Update fields
    if (title !== undefined) track.title = title;
    if (artist !== undefined) track.artist = artist;
    if (album !== undefined) track.album = album;
    if (genre !== undefined) track.genre = genre;
    if (year !== undefined) track.year = year;
    if (isPublic !== undefined) track.isPublic = isPublic;
    if (allowDownload !== undefined) track.allowDownload = allowDownload;
    if (coverUrl !== undefined) track.coverUrl = coverUrl;

    await track.save();

    res.json({ 
      success: true, 
      message: 'Track updated successfully',
      track 
    });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/music/tracks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    await track.destroy();

    res.json({ 
      success: true, 
      message: 'Track deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Мемы
router.get('/memes', adminController.getMemes);
router.post('/memes/:id/approve', adminController.approveMeme);
router.post('/memes/:id/reject', adminController.rejectMeme);
router.post('/memes/:id/delete', adminController.deleteMeme);

// Пользователи
router.get('/users', adminController.getUsers);
router.post('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/ban', adminController.banUser);

// Достижения
router.get('/achievements', adminController.getAllAchievements);
router.post('/achievements/grant', adminController.grantAchievement);

// Статистика
router.get('/stats', adminController.getStats);
router.get('/analytics/advanced', adminController.getAdvancedAnalytics);

// Steam Bot Management
router.get('/bot/status', adminController.getBotStatus);
router.post('/bot/start', adminController.startBot);
router.post('/bot/stop', adminController.stopBot);
router.post('/bot/restart', adminController.restartBot);
router.post('/bot/steam-guard', validate('steamGuardCode'), adminController.submitSteamGuard);
router.post('/bot/switch-account', adminController.switchAccount);
router.post('/bot/reset-rate-limit', adminController.resetRateLimit);
router.post('/bot/sync-user', adminController.syncUserMatches);
router.post('/bot/test-message', adminController.testSteamMessage);

// Test Steam Community service
router.get('/test/steam-community', adminController.testSteamCommunity);

module.exports = router;

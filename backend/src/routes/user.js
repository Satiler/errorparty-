const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userSyncService = require('../services/userSyncService');
const { User } = require('../models');
const { generateLinkToken, checkLinkStatus, getProfile, updateProfile, getUserAchievements, getUserActivity, generateAchievementImage } = require('../controllers/userController');

/**
 * @route   POST /api/user/generate-link-token
 * @desc    Сгенерировать токен для связывания TeamSpeak
 * @access  Private
 */
router.post('/generate-link-token', authenticateToken, generateLinkToken);

/**
 * @route   GET /api/user/check-link-status
 * @desc    Проверить статус связывания TeamSpeak
 * @access  Private
 */
router.get('/check-link-status', authenticateToken, checkLinkStatus);

/**
 * @route   GET /api/user/profile
 * @desc    Получить профиль текущего пользователя
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Обновить профиль пользователя
 * @access  Private
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * @route   GET /api/user/:userId/achievements
 * @desc    Получить достижения пользователя
 * @access  Public
 */
router.get('/:userId/achievements', getUserAchievements);

/**
 * @route   GET /api/user/:userId/activity
 * @desc    Получить активность пользователя для графика
 * @access  Public
 */
router.get('/:userId/activity', getUserActivity);

/**
 * @route   POST /api/user/achievement/:achievementId/generate-image
 * @desc    Сгенерировать AI картинку для достижения
 * @access  Private
 */
router.post('/achievement/:achievementId/generate-image', authenticateToken, generateAchievementImage);

/**
 * @route   POST /api/user/link-teamspeak
 * @desc    Попытка связать текущего пользователя с TeamSpeak клиентом
 * @access  Private
 */
router.post('/link-teamspeak', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.teamspeakUid) {
      return res.json({
        success: true,
        message: 'Already linked to TeamSpeak',
        teamspeakUid: user.teamspeakUid
      });
    }

    const linked = await userSyncService.linkUserWithTeamSpeak(user);

    if (linked) {
      const updatedUser = await User.findByPk(req.user.id);
      res.json({
        success: true,
        message: 'Successfully linked to TeamSpeak',
        teamspeakUid: updatedUser.teamspeakUid
      });
    } else {
      res.json({
        success: false,
        message: 'Could not find matching TeamSpeak client. Make sure you are online in TeamSpeak.'
      });
    }
  } catch (error) {
    console.error('Link TeamSpeak error:', error);
    res.status(500).json({ success: false, error: 'Failed to link TeamSpeak' });
  }
});

/**
 * @route   POST /api/user/unlink-teamspeak
 * @desc    Отвязать пользователя от TeamSpeak
 * @access  Private
 */
router.post('/unlink-teamspeak', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await user.update({ teamspeakUid: null });

    res.json({
      success: true,
      message: 'Successfully unlinked from TeamSpeak'
    });
  } catch (error) {
    console.error('Unlink TeamSpeak error:', error);
    res.status(500).json({ success: false, error: 'Failed to unlink TeamSpeak' });
  }
});

/**
 * @route   GET /api/user/teamspeak-info
 * @desc    Получить информацию о связке с TeamSpeak
 * @access  Private
 */
router.get('/teamspeak-info', authenticateToken, async (req, res) => {
  try {
    const userWithTs = await userSyncService.getUserWithTeamSpeakInfo(req.user.id);

    res.json({
      success: true,
      user: userWithTs
    });
  } catch (error) {
    console.error('Get TeamSpeak info error:', error);
    res.status(500).json({ success: false, error: 'Failed to get TeamSpeak info' });
  }
});

/**
 * @route   POST /api/user/sync-all
 * @desc    Синхронизировать всех пользователей с TeamSpeak (только admin)
 * @access  Private (Admin only)
 */
router.post('/sync-all', authenticateToken, async (req, res) => {
  try {
    // Проверяем права админа
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await userSyncService.syncAllUsers();

    res.json({
      success: true,
      message: 'User synchronization started'
    });
  } catch (error) {
    console.error('Sync all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync users' });
  }
});

module.exports = router;

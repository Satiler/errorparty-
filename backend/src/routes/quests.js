const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { questLimiter } = require('../middleware/rateLimiter');
const { getUserQuests, assignDailyQuests, claimReward, getLevelInfo, analyzeMatch, getAvailableQuests, selectQuests } = require('../controllers/questController');
const { User, UserQuest } = require('../models');
const { assignQuests } = require('../services/questService');

/**
 * @route   GET /api/quests
 * @desc    Получить активные задания пользователя
 * @access  Private
 */
router.get('/', authenticateToken, questLimiter, getUserQuests);

// DEBUG: проверка что роутер работает
router.get('/debug', (req, res) => {
  res.json({ success: true, message: 'Quests router is working', route: '/api/quests/debug' });
});

/**
 * @route   GET /api/quests/available
 * @desc    Получить доступные квесты для выбора
 * @query   game (dota2|cs2), type (daily|weekly)
 * @access  Private
 */
router.get('/available', authenticateToken, getAvailableQuests);

/**
 * @route   GET /api/quests/level
 * @desc    Получить информацию об уровне и опыте текущего пользователя
 * @access  Private
 */
router.get('/level', authenticateToken, getLevelInfo);

/**
 * @route   POST /api/quests/assign
 * @desc    Назначить ежедневные задания
 * @access  Private
 */
router.post('/assign', authenticateToken, questLimiter, assignDailyQuests);

/**
 * @route   POST /api/quests/analyze-match
 * @desc    Анализ последнего матча и обновление прогресса
 * @access  Private
 */
router.post('/analyze-match', authenticateToken, analyzeMatch);

/**
 * @route   POST /api/quests/select
 * @desc    Выбрать конкретные квесты из доступных
 * @body    questIds (array of IDs), type (daily|weekly)
 * @access  Private
 */
router.post('/select', authenticateToken, selectQuests);

/**
 * @route   POST /api/quests/:questId/claim
 * @desc    Забрать награду за выполненное задание
 * @access  Private
 */
router.post('/:questId/claim', authenticateToken, questLimiter, claimReward);

/**
 * @route   POST /api/quests/reset-all
 * @desc    [ADMIN] Пересоздать все квесты для всех пользователей
 * @access  Private (Admin only)
 */
router.post('/reset-all', authenticateToken, async (req, res) => {
  try {
    // Проверка на админа
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Удаляем все активные квесты
    await UserQuest.destroy({
      where: {
        status: 'active'
      }
    });

    // Получаем всех пользователей
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'steamId']
    });

    let assignedCount = 0;

    // Назначаем новые квесты всем пользователям
    for (const user of users) {
      if (user.steamId) {
        await assignQuests(user.id, 'dota2', 'daily');
        await assignQuests(user.id, 'cs2', 'daily');
        await assignQuests(user.id, 'dota2', 'weekly');
        await assignQuests(user.id, 'cs2', 'weekly');
        assignedCount++;
      }
    }

    console.log(`✅ Пересозданы квесты для ${assignedCount} пользователей`);

    res.json({
      success: true,
      message: `Successfully reset and reassigned quests for ${assignedCount} users`,
      users: assignedCount
    });
  } catch (error) {
    console.error('Error resetting quests:', error);
    res.status(500).json({ success: false, error: 'Failed to reset quests' });
  }
});

module.exports = router;

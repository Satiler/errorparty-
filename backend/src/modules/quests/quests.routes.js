/**
 * Quests Routes
 * Роуты для системы квестов
 */
const express = require('express');
const router = express.Router();
const questController = require('../../controllers/questController');
const { authenticateToken } = require('../../middleware/auth');
const { questLimiter } = require('../../middleware/rateLimiter');

/**
 * @route   GET /api/quests
 * @desc    Get user's active quests
 * @access  Private
 */
router.get('/', authenticateToken, questLimiter, questController.getUserQuests);

/**
 * @route   GET /api/quests/user
 * @desc    Get current user's quest progress
 * @access  Private
 */
router.get('/user', authenticateToken, questController.getUserQuests);

/**
 * @route   GET /api/quests/user/stats
 * @desc    Get user quest statistics
 * @access  Private
 */
router.get('/user/stats', authenticateToken, questController.getUserQuestStats);

/**
 * @route   GET /api/quests/available
 * @desc    Get available quests for selection
 * @access  Private
 */
router.get('/available', authenticateToken, questController.getAvailableQuests);

/**
 * @route   GET /api/quests/level
 * @desc    Get user level and experience info
 * @access  Private
 */
router.get('/level', authenticateToken, questController.getLevelInfo);

/**
 * @route   POST /api/quests/assign
 * @desc    Assign daily quests
 * @access  Private
 */
router.post('/assign', authenticateToken, questController.assignDailyQuests);

/**
 * @route   POST /api/quests/select
 * @desc    Select specific quests from available
 * @access  Private
 */
router.post('/select', authenticateToken, questController.selectQuests);

/**
 * @route   POST /api/quests/analyze-match
 * @desc    Analyze match and update quest progress
 * @access  Private
 */
router.post('/analyze-match', authenticateToken, questController.analyzeMatch);

/**
 * @route   GET /api/quests/:questId
 * @desc    Get specific quest details
 * @access  Public
 */
router.get('/:questId', questController.getQuestById);

/**
 * @route   POST /api/quests/:questId/claim
 * @desc    Claim quest reward
 * @access  Private
 */
router.post('/:questId/claim', authenticateToken, questController.claimQuestReward);

module.exports = router;

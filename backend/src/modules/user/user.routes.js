/**
 * User Routes
 * Роуты для управления пользователями
 */
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, userController.updateProfile);

/**
 * @route   POST /api/user/generate-link-token
 * @desc    Generate TeamSpeak link token
 * @access  Private
 */
router.post('/generate-link-token', authenticateToken, userController.generateLinkToken);

/**
 * @route   GET /api/user/check-link-status
 * @desc    Check TeamSpeak link status
 * @access  Private
 */
router.get('/check-link-status', authenticateToken, userController.checkLinkStatus);

/**
 * @route   GET /api/user/:userId/activity
 * @desc    Get user activity
 * @access  Public
 */
router.get('/:userId/activity', userController.getUserActivity);

/**
 * @route   GET /api/user/:userId/achievements
 * @desc    Get user achievements
 * @access  Public
 */
router.get('/:userId/achievements', userController.getUserAchievements);

/**
 * @route   GET /api/user/:steamId
 * @desc    Get user by Steam ID
 * @access  Public
 */
router.get('/:steamId', userController.getUserBySteamId);

/**
 * @route   GET /api/user/:userId/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:userId/stats', userController.getUserStats);

/**
 * @route   POST /api/user/bio
 * @desc    Update user bio
 * @access  Private
 */
router.post('/bio', authenticateToken, userController.updateBio);

module.exports = router;

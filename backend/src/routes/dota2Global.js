const express = require('express');
const router = express.Router();
const dota2GlobalController = require('../controllers/dota2GlobalController');
const { optionalAuth } = require('../middleware/auth');

/**
 * @route   GET /api/dota2/global/leaderboard
 * @desc    Get global leaderboard (top 100 players)
 * @access  Public
 */
router.get('/leaderboard', optionalAuth, dota2GlobalController.getLeaderboard);

/**
 * @route   GET /api/dota2/global/hero-stats
 * @desc    Get global hero statistics
 * @access  Public
 */
router.get('/hero-stats', optionalAuth, dota2GlobalController.getHeroStats);

/**
 * @route   GET /api/dota2/global/search
 * @desc    Search players by name or Steam ID
 * @access  Public
 */
router.get('/search', optionalAuth, dota2GlobalController.searchPlayers);

/**
 * @route   GET /api/dota2/global/recent-matches
 * @desc    Get recent public matches
 * @access  Public
 */
router.get('/recent-matches', optionalAuth, dota2GlobalController.getRecentMatches);

/**
 * @route   GET /api/dota2/global/live
 * @desc    Get live games
 * @access  Public
 */
router.get('/live', optionalAuth, dota2GlobalController.getLiveGames);

module.exports = router;

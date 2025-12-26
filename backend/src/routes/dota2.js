const express = require('express');
const router = express.Router();
const dota2Controller = require('../controllers/dota2Controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * @route   GET /api/dota2/player/:steamId
 * @desc    Get Dota 2 player summary (like Dotabuff)
 * @access  Public
 */
router.get('/player/:steamId', optionalAuth, dota2Controller.getPlayerSummary);

/**
 * @route   GET /api/dota2/matches/:steamId
 * @desc    Get recent Dota 2 matches
 * @access  Public
 */
router.get('/matches/:steamId', optionalAuth, dota2Controller.getRecentMatches);

/**
 * @route   GET /api/dota2/heroes/:steamId
 * @desc    Get Dota 2 hero statistics
 * @access  Public
 */
router.get('/heroes/:steamId', optionalAuth, dota2Controller.getHeroStats);

/**
 * @route   GET /api/dota2/match/:matchId
 * @desc    Get Dota 2 match details
 * @access  Public
 */
router.get('/match/:matchId', optionalAuth, dota2Controller.getMatchDetails);

/**
 * @route   GET /api/dota2/records/:steamId
 * @desc    Get player records (best performances)
 * @access  Public
 */
router.get('/records/:steamId', optionalAuth, dota2Controller.getPlayerRecords);

/**
 * @route   GET /api/dota2/ranks
 * @desc    Get Dota 2 rank distribution
 * @access  Public
 */
router.get('/ranks', dota2Controller.getRankDistribution);

/**
 * @route   GET /api/dota2/player/:steamId/matches/filtered
 * @desc    Get filtered Dota 2 matches with server-side filtering
 * @access  Public
 * @query   lobby, gameMode, side, region, result, limit
 */
router.get('/player/:steamId/matches/filtered', optionalAuth, dota2Controller.getFilteredMatches);

/**
 * @route   GET /api/dota2/player/:steamId/achievements
 * @desc    Get and check Dota 2 achievements for player
 * @access  Public
 */
router.get('/player/:steamId/achievements', optionalAuth, dota2Controller.getPlayerAchievements);

module.exports = router;

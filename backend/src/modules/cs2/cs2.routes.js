/**
 * CS2 Routes
 * Все роуты для CS2 функционала
 */
const express = require('express');
const router = express.Router();
const cs2Controller = require('../../controllers/cs2Controller');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');

// ===== PUBLIC ROUTES =====

/**
 * @route   GET /api/cs2/stats/:steamId
 * @desc    Get CS2 player statistics
 * @access  Public
 */
router.get('/stats/:steamId', optionalAuth, cs2Controller.getPlayerStats);

/**
 * @route   GET /api/cs2/achievements/:steamId
 * @desc    Get CS2 achievements
 * @access  Public
 */
router.get('/achievements/:steamId', optionalAuth, cs2Controller.getAchievements);

/**
 * @route   GET /api/cs2/matches/:steamId
 * @desc    Get CS2 match history
 * @access  Public
 */
router.get('/matches/:steamId', cs2Controller.getMatchHistory);

/**
 * @route   GET /api/cs2/match/:matchId/demo/status
 * @desc    Get demo download/parse status
 * @access  Private
 */
router.get('/match/:matchId/demo/status', authenticateToken, cs2Controller.getDemoStatus);

/**
 * @route   GET /api/cs2/match/:matchId/details
 * @desc    Get detailed match information
 * @access  Private
 */
router.get('/match/:matchId/details', authenticateToken, cs2Controller.getMatchDetails);

// ===== STEAM HISTORY ROUTES =====

/**
 * @route   GET /api/cs2/steam-history/match-types
 * @desc    Get available match types
 * @access  Public
 */
router.get('/steam-history/match-types', cs2Controller.getMatchTypes);

/**
 * @route   POST /api/cs2/steam-history/fetch
 * @desc    Proxy to fetch Steam page
 * @access  Private
 */
router.post('/steam-history/fetch', authenticateToken, cs2Controller.fetchSteamPage);

/**
 * @route   POST /api/cs2/steam-history/parse
 * @desc    Parse match history HTML
 * @access  Private
 */
router.post('/steam-history/parse', authenticateToken, cs2Controller.parseMatchHistoryHTML);

/**
 * @route   POST /api/cs2/steam-history/sync
 * @desc    Sync matches to database
 * @access  Private
 */
router.post('/steam-history/sync', authenticateToken, cs2Controller.syncSteamMatchHistory);

// ===== ADMIN/CRON ROUTES =====

/**
 * @route   GET /api/cs2/cron/status
 * @desc    Get cron service status
 * @access  Private
 */
router.get('/cron/status', authenticateToken, cs2Controller.getCronStatus);

/**
 * @route   POST /api/cs2/cron/sync
 * @desc    Manually trigger cron sync
 * @access  Private
 */
router.post('/cron/sync', authenticateToken, cs2Controller.triggerManualCronSync);

/**
 * @route   POST /api/cs2/cron/demo-download
 * @desc    Manually trigger demo download
 * @access  Private
 */
router.post('/cron/demo-download', authenticateToken, cs2Controller.triggerManualDemoDownload);

/**
 * @route   POST /api/cs2/match/:matchCode/load-demo
 * @desc    Load demo from match code
 * @access  Private
 */
router.post('/match/:matchCode/load-demo', authenticateToken, cs2Controller.loadDemoFromMatchCode);

// ===== STEAM BOT ROUTES =====

/**
 * @route   GET /api/cs2/bot/status
 * @desc    Get Steam bot status
 * @access  Private
 */
router.get('/bot/status', authenticateToken, cs2Controller.getBotStatus);

/**
 * @route   POST /api/cs2/bot/add-friend
 * @desc    Add friend to Steam bot
 * @access  Private
 */
router.post('/bot/add-friend', authenticateToken, cs2Controller.addBotFriend);

/**
 * @route   GET /api/cs2/bot/friends
 * @desc    Get bot friends list
 * @access  Private
 */
router.get('/bot/friends', authenticateToken, cs2Controller.getBotFriends);

/**
 * @route   POST /api/cs2/bot/sync
 * @desc    Manually trigger user match sync
 * @access  Private
 */
router.post('/bot/sync', authenticateToken, cs2Controller.syncBotMatches);

module.exports = router;

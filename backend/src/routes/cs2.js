const express = require('express');
const router = express.Router();
const cs2Controller = require('../controllers/cs2Controller');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

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

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/match/add
//  * @desc    Add CS2 match by share code
//  * @access  Private (requires authentication)
//  */
// router.post('/match/add', authenticateToken, validate('shareCode'), cs2Controller.addMatchByShareCode);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/auth/link
//  * @desc    Link CS2 authentication token
//  * @access  Private (requires authentication)
//  */
// router.post('/auth/link', authenticateToken, validate('cs2AuthToken'), cs2Controller.linkAuthToken);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/auth/unlink
//  * @desc    Unlink CS2 authentication token
//  * @access  Private (requires authentication)
//  */
// router.post('/auth/unlink', authenticateToken, cs2Controller.unlinkAuthToken);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/auth/match-token
//  * @desc    Link CS2 Match Token (Share Code of last competitive match) - anchor for sync
//  * @access  Private (requires authentication)
//  */
// router.post('/auth/match-token', authenticateToken, validate('shareCode'), cs2Controller.linkMatchToken);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/sync/trigger
//  * @desc    Manually trigger match synchronization
//  * @access  Private (requires authentication)
//  */
// router.post('/sync/trigger', authenticateToken, cs2Controller.triggerSync);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   GET /api/cs2/sync/status
//  * @desc    Get synchronization status
//  * @access  Private (requires authentication)
//  */
// router.get('/sync/status', authenticateToken, cs2Controller.getSyncStatus);

// ВРЕМЕННО ОТКЛЮЧЕНО - только GSI
// /**
//  * @route   POST /api/cs2/match/:matchId/demo/download
//  * @desc    Download and parse demo file for a match
//  * @access  Private (requires authentication)
//  */
// router.post('/match/:matchId/demo/download', authenticateToken, cs2Controller.downloadDemo);

/**
 * @route   GET /api/cs2/match/:matchId/demo/status
 * @desc    Get demo download/parse status
 * @access  Private (requires authentication)
 */
router.get('/match/:matchId/demo/status', authenticateToken, cs2Controller.getDemoStatus);

/**
 * @route   GET /api/cs2/cron/status
 * @desc    Get cron service status
 * @access  Private (requires authentication)
 */
router.get('/cron/status', authenticateToken, cs2Controller.getCronStatus);

/**
 * @route   POST /api/cs2/cron/sync
 * @desc    Manually trigger cron sync
 * @access  Private (requires authentication)
 */
router.post('/cron/sync', authenticateToken, cs2Controller.triggerManualCronSync);

/**
 * @route   POST /api/cs2/cron/download
 * @desc    Manually trigger demo download
 * @access  Private (requires authentication)
 */
router.post('/cron/download', authenticateToken, cs2Controller.triggerManualDemoDownload);

/**
 * @route   GET /api/cs2/match/:matchId
 * @desc    Get detailed match information with all players
 * @access  Public
 */
router.get('/match/:matchId', cs2Controller.getMatchDetails);

/**
 * @route   POST /api/cs2/demo/load
 * @desc    Load demo from match code and auth code
 * @access  Public
 */
router.post('/demo/load', validate('shareCode'), cs2Controller.loadDemoFromMatchCode);

/**
 * @route   GET /api/cs2/bot/status
 * @desc    Get Steam Bot status
 * @access  Private (requires authentication)
 */
router.get('/bot/status', authenticateToken, cs2Controller.getBotStatus);

/**
 * @route   POST /api/cs2/bot/add-friend
 * @desc    Add bot to friends (bot will auto-sync matches)
 * @access  Private (requires authentication)
 */
router.post('/bot/add-friend', authenticateToken, cs2Controller.addBotFriend);

/**
 * @route   GET /api/cs2/bot/friends
 * @desc    Get bot's friends list
 * @access  Private (requires authentication)
 */
router.get('/bot/friends', authenticateToken, cs2Controller.getBotFriends);

/**
 * @route   POST /api/cs2/bot/sync
 * @desc    Manually trigger match sync for current user
 * @access  Private (requires authentication)
 */
router.post('/bot/sync', authenticateToken, cs2Controller.syncBotMatches);

/**
 * @route   GET /api/cs2/steam-history/match-types
 * @desc    Get available match types for Steam Community
 * @access  Public
 */
router.get('/steam-history/match-types', cs2Controller.getMatchTypes);

/**
 * @route   POST /api/cs2/steam-history/fetch
 * @desc    Proxy to fetch Steam Community page with user's cookies
 * @access  Private (requires authentication)
 */
router.post('/steam-history/fetch', authenticateToken, cs2Controller.fetchSteamPage);

/**
 * @route   POST /api/cs2/steam-history/parse
 * @desc    Parse match history HTML sent from frontend
 * @access  Private (requires authentication)
 */
router.post('/steam-history/parse', authenticateToken, cs2Controller.parseMatchHistoryHTML);

/**
 * @route   POST /api/cs2/steam-history/sync
 * @desc    Sync matches from Steam Community (HTML sent from frontend) to database
 * @access  Private (requires authentication)
 */
router.post('/steam-history/sync', authenticateToken, cs2Controller.syncSteamMatchHistory);

module.exports = router;

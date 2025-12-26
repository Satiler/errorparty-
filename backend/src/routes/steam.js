const express = require('express');
const router = express.Router();
const steamController = require('../controllers/steamController');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// Get Steam profile by Steam ID
router.get('/profile/:steamId', optionalAuth, steamController.getProfile);

// Get user's games library
router.get('/games/:steamId', optionalAuth, steamController.getGames);

// Get popular games stats (Dota 2, CS2)
router.get('/games/:steamId/popular', optionalAuth, steamController.getPopularGames);

// Get Steam friends list
router.get('/friends/:steamId', optionalAuth, steamController.getFriends);

// CS2 Stats from Steam API
router.get('/cs2/stats/:steamId', optionalAuth, steamController.getCS2Stats);

// Get all CS2 stats (alternative endpoint)
router.get('/stats/:steamId', optionalAuth, steamController.getCS2Stats);

// Get CS2 achievements
router.get('/achievements/:steamId', optionalAuth, steamController.getCS2Achievements);

// Dota 2 Match History
router.get('/dota2/matches/:steamId', optionalAuth, steamController.getDota2Matches);

// Dota 2 Match Details
router.get('/dota2/match/:matchId', optionalAuth, steamController.getDota2MatchDetails);

// Get current user's complete Steam stats (authenticated)
router.get('/my-stats', authenticateToken, steamController.getMyStats);

module.exports = router;

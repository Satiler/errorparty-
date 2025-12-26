const express = require('express');
const router = express.Router();
const { handleGSI, getActiveMatches, getLiveStats } = require('../controllers/gsiController');

/**
 * @route   POST /api/gsi
 * @desc    Game State Integration endpoint for CS2
 * @access  Public (но можно добавить IP whitelist)
 */
router.post('/', handleGSI);

/**
 * @route   GET /api/gsi/active
 * @desc    Get active matches (debug endpoint)
 * @access  Public
 */
router.get('/active', getActiveMatches);

/**
 * @route   GET /api/gsi/live/:steamId
 * @desc    Get live stats for specific user
 * @access  Public
 */
router.get('/live/:steamId', getLiveStats);

module.exports = router;

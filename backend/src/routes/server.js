const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');

/**
 * @route   GET /api/server/status
 * @desc    Get simple server status for Navbar
 * @access  Public
 */
router.get('/status', serverController.getStatus);

/**
 * @route   GET /api/server/stats
 * @desc    Get comprehensive server statistics
 * @access  Public
 */
router.get('/stats', serverController.getStats);

/**
 * @route   GET /api/server/teamspeak
 * @desc    Get TeamSpeak server info
 * @access  Public
 */
router.get('/teamspeak', serverController.getTeamSpeakInfo);

module.exports = router;

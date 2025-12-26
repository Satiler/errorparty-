/**
 * TeamSpeak Routes
 * Роуты для TeamSpeak интеграции
 */
const express = require('express');
const router = express.Router();
const teamspeakController = require('../../controllers/teamspeakController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route   GET /api/teamspeak/status
 * @desc    Get TeamSpeak server status
 * @access  Public
 */
router.get('/status', teamspeakController.getServerStatus);

/**
 * @route   GET /api/teamspeak/clients
 * @desc    Get online clients
 * @access  Public
 */
router.get('/clients', teamspeakController.getClients);

/**
 * @route   GET /api/teamspeak/channels
 * @desc    Get channel list
 * @access  Public
 */
router.get('/channels', teamspeakController.getChannels);

/**
 * @route   POST /api/teamspeak/link
 * @desc    Link user to TeamSpeak identity
 * @access  Private
 */
router.post('/link', authenticateToken, teamspeakController.linkIdentity);

/**
 * @route   GET /api/teamspeak/user/:userId/time
 * @desc    Get user's total time on TeamSpeak
 * @access  Public
 */
router.get('/user/:userId/time', teamspeakController.getUserTime);

module.exports = router;

const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

// Get recent events/activity
router.get('/recent', eventsController.getRecentEvents);

// Get homepage statistics
router.get('/homepage-stats', eventsController.getHomepageStats);

module.exports = router;

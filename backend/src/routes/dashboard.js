const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get activity history for charts
router.get('/activity-history', dashboardController.getActivityHistory);

// Get peak times analysis
router.get('/peak-times', dashboardController.getPeakTimes);

// Get top active channels
router.get('/top-channels', dashboardController.getTopChannels);

// Get weekly comparison
router.get('/weekly-comparison', dashboardController.getWeeklyComparison);

module.exports = router;

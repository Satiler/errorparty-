const express = require('express');
const router = express.Router();
const { getHomePageData } = require('../controllers/homeController');

/**
 * @route   GET /api/home/data
 * @desc    Get all home page data in one request (optimized)
 * @access  Public
 */
router.get('/data', getHomePageData);

module.exports = router;

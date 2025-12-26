/**
 * Home Routes
 * Роуты главной страницы
 */
const express = require('express');
const router = express.Router();

// Проверка существования контроллера
let homeController;
try {
  homeController = require('../../controllers/homeController');
} catch (err) {
  console.warn('⚠️ homeController not found, using stub routes');
}

if (homeController && typeof homeController.getHomeData === 'function') {
  /**
   * @route   GET /api/home
   * @desc    Get home page data
   * @access  Public
   */
  router.get('/', homeController.getHomeData);

  /**
   * @route   GET /api/home/stats
   * @desc    Get global statistics
   * @access  Public
   */
  router.get('/stats', homeController.getGlobalStats);

  /**
   * @route   GET /api/home/recent-matches
   * @desc    Get recent matches
   * @access  Public
   */
  router.get('/recent-matches', homeController.getRecentMatches);

  /**
   * @route   GET /api/home/leaderboard
   * @desc    Get leaderboard
   * @access  Public
   */
  router.get('/leaderboard', homeController.getLeaderboard);
} else {
  // Stub routes
  router.get('/', (req, res) => res.json({ success: true, message: 'Home endpoint (stub)' }));
  router.get('/stats', (req, res) => res.json({ success: true, stats: {} }));
  router.get('/recent-matches', (req, res) => res.json({ success: true, matches: [] }));
  router.get('/leaderboard', (req, res) => res.json({ success: true, leaderboard: [] }));
}

module.exports = router;

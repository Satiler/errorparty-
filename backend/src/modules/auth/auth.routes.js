/**
 * Auth Routes
 * Роуты для аутентификации
 */
const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const authController = require('../../controllers/authController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * @route   GET /api/auth/steam
 * @desc    Redirect to Steam for authentication
 * @access  Public
 */
router.get(
  '/steam',
  passport.authenticate('steam', { failureRedirect: '/' })
);

/**
 * @route   GET /api/auth/steam/return
 * @desc    Steam authentication callback
 * @access  Public
 */
router.get(
  '/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  authController.steamCallback
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;

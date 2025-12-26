const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Timeout middleware для защиты от зависаний
const timeoutMiddleware = (req, res, next) => {
  // Устанавливаем таймаут 30 секунд
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  const timeout = setTimeout(() => {
    console.error('⏱️ Steam auth timeout after 30s');
    if (!res.headersSent) {
      res.redirect('/?error=auth_timeout');
    }
  }, 30000);
  
  // Очищаем таймаут когда запрос завершён
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  
  next();
};

// Steam authentication routes
router.get('/steam', passport.authenticate('steam', { session: false }));

router.get('/steam/return',
  timeoutMiddleware,
  passport.authenticate('steam', { session: false, failureRedirect: '/?error=auth_failed' }),
  authController.steamCallback
);

// Token verification
router.get('/verify', authLimiter, authController.verifyToken);

// Get current user profile (requires auth)
router.get('/profile', authenticateToken, authController.getProfile);

// Logout
router.post('/logout', authController.logout);

module.exports = router;

/**
 * Shared Middleware Index
 * Centralized export for all middleware
 */

// Rate limiters
const rateLimiter = require('./rateLimiter');
const lightLimiter = require('./lightLimiter');

// Auth middleware
const auth = require('./auth');

// Validation
const validation = require('./validation');

module.exports = {
  // Rate limiters
  apiLimiter: rateLimiter.apiLimiter,
  authLimiter: rateLimiter.authLimiter,
  uploadLimiter: rateLimiter.uploadLimiter,
  questLimiter: rateLimiter.questLimiter,
  lightLimiter: lightLimiter,

  // Auth
  authenticateToken: auth.authenticateToken,
  optionalAuth: auth.optionalAuth,
  requireAdmin: auth.requireAdmin,

  // Validation
  validate: validation.validate
};

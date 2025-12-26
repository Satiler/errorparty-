/**
 * Lightweight rate limiter for high-frequency read operations
 * Used for frequently accessed public endpoints
 */
const rateLimit = require('express-rate-limit');

const lightLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  message: {
    success: false,
    error: 'Too many requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false
});

module.exports = { lightLimiter };

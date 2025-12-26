const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints
 * Prevents brute-force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 attempts per window (для /verify который вызывается очень часто из-за PWA)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Rate limiter for file uploads (memes, etc.)
 * Prevents abuse of upload functionality
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    error: 'Too many uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for quest operations
 * Prevents spam/abuse of quest system
 */
const questLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes
  message: {
    success: false,
    error: 'Too many quest requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * General API rate limiter
 * Applies to all API endpoints as fallback
 * TEMPORARILY DISABLED FOR DEVELOPMENT
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (для PWA с множественными компонентами)
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ВРЕМЕННО ОТКЛЮЧЕН - пропускаем все запросы
    return true;
    
    // Skip for health checks, static files, and public read-only endpoints
    const publicEndpoints = [
      '/api/health',
      '/api/server/status',
      '/api/server/stats',
      '/api/server/teamspeak',
      '/api/users/top',
      '/api/events/recent',
      '/api/memes/top',
      '/api/memes',
      '/api/dashboard/',
      '/api/halloffame/',
      '/api/home/',
      '/api/notifications/vapid-public-key',
      '/api/notifications/status',
      '/api/quests',
      '/api/user/profile',
      '/api/steam/',
      '/api/dota2/',
      '/api/cs2/',
      '/api/gsi/'
    ];
    
    // GET requests to read-only endpoints - полностью пропускаем
    const isReadOnlyGet = req.method === 'GET' && (
      req.path.startsWith('/api/memes/') ||
      req.path.startsWith('/api/users/') ||
      req.path.startsWith('/api/steam/') ||
      req.path.startsWith('/api/dota2/') ||
      req.path.startsWith('/api/cs2/') ||
      req.path.startsWith('/api/server/') ||
      req.path.startsWith('/api/quests/') ||
      req.path.startsWith('/api/events/')
    );
    
    return req.path === '/api/health' || 
           req.path.startsWith('/uploads') ||
           req.path.startsWith('/icons') ||
           isReadOnlyGet ||
           publicEndpoints.some(endpoint => req.path.startsWith(endpoint));
  }
});

/**
 * Strict rate limiter for admin operations
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: {
    success: false,
    error: 'Too many admin requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  uploadLimiter,
  questLimiter,
  apiLimiter,
  adminLimiter
};

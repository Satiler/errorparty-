const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable must be set!');
}

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log(`🔒 Auth failed for ${req.method} ${req.path}: No token`);
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user to request
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.isActive) {
      console.log(`🔒 Auth failed for ${req.method} ${req.path}: User not found or inactive`);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = user;
    console.log(`✅ Auth success for ${req.method} ${req.path}: user ${user.id}`);
    next();
  } catch (error) {
    console.error(`🔒 Token verification error for ${req.method} ${req.path}:`, error.message);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

/**
 * Check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = authenticateToken;

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to check if user is moderator or admin
 */
const isModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Moderator access required' });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  isAuthenticated,
  isAdmin,
  isModerator
};

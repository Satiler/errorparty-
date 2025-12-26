const jwt = require('jsonwebtoken');
const { User } = require('../models');
const userSyncService = require('../services/userSyncService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable must be set!');
}

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      steamId: user.steamId,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Steam authentication callback
 */
const steamCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/?error=auth_failed');
    }

    // Generate JWT token immediately
    const token = generateToken(req.user);

    // Попытка автоматической связки с TeamSpeak в фоновом режиме (не блокируем редирект)
    if (req.user.steamId && !req.user.teamspeakUid) {
      console.log(`🔄 Attempting to link user ${req.user.username} with TeamSpeak in background...`);
      // Запускаем в фоне без await
      userSyncService.linkUserWithTeamSpeak(req.user)
        .then(() => {
          console.log(`✅ Successfully linked ${req.user.username} with TeamSpeak in background`);
        })
        .catch(err => {
          console.error(`❌ Background TeamSpeak linking failed for ${req.user.username}:`, err.message);
          console.error('Full error:', err);
        });
    }

    // Redirect to frontend with token instantly
    res.redirect(`/?token=${token}`);
  } catch (error) {
    console.error('Steam callback error:', error);
    res.redirect('/?error=server_error');
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
};

/**
 * Verify JWT token
 */
const verifyToken = (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

/**
 * Logout (client-side token removal)
 */
const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  steamCallback,
  getProfile,
  verifyToken,
  logout,
  generateToken,
  getCurrentUser: verifyToken // Алиас для auth роута
};

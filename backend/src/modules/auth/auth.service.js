/**
 * Auth Service
 * Бизнес-логика аутентификации
 */
const jwt = require('jsonwebtoken');
const { User } = require('../../models');

class AuthService {
  /**
   * Generate JWT token for user
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        steamId: user.steamId,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by Steam ID
   */
  async getUserBySteamId(steamId) {
    return await User.findOne({ where: { steamId } });
  }

  /**
   * Create or update user from Steam profile
   */
  async createOrUpdateUser(steamProfile) {
    const [user, created] = await User.findOrCreate({
      where: { steamId: steamProfile.id },
      defaults: {
        steamId: steamProfile.id,
        displayName: steamProfile.displayName,
        avatar: steamProfile.photos?.[2]?.value || null,
        profileUrl: steamProfile._json.profileurl
      }
    });

    if (!created) {
      // Update existing user
      await user.update({
        displayName: steamProfile.displayName,
        avatar: steamProfile.photos?.[2]?.value || user.avatar,
        profileUrl: steamProfile._json.profileurl,
        lastLogin: new Date()
      });
    }

    return user;
  }
}

module.exports = new AuthService();

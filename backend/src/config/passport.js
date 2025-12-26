const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { User } = require('../models');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Steam Strategy
passport.use(new SteamStrategy({
  returnURL: process.env.STEAM_RETURN_URL || 'http://localhost/api/auth/steam/return',
  realm: process.env.STEAM_REALM || 'http://localhost/',
  apiKey: process.env.STEAM_API_KEY
},
async (identifier, profile, done) => {
  try {
    // Extract Steam ID from identifier
    const steamId = identifier.match(/\d+$/)[0];
    
    // Find or create user
    let user = await User.findOne({ where: { steamId } });
    
    if (!user) {
      // Create new user from Steam profile
      user = await User.create({
        username: profile.displayName || `Player_${steamId.slice(-6)}`,
        steamId: steamId,
        avatar: profile.photos && profile.photos.length > 0 ? profile.photos[2].value : null,
        isActive: true,
        role: 'user'
      });
    } else {
      // Update existing user info
      await user.update({
        username: profile.displayName || user.username,
        avatar: profile.photos && profile.photos.length > 0 ? profile.photos[2].value : user.avatar,
        lastSeen: new Date()
      });
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Steam auth error:', error);
    return done(error, null);
  }
}));

module.exports = passport;

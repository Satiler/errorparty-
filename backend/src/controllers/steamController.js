const steamService = require('../services/steamService');
const { User } = require('../models');

/**
 * Get Steam profile for user
 */
const getProfile = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    if (!steamId) {
      return res.status(400).json({ success: false, error: 'Steam ID required' });
    }

    const profile = await steamService.getUserSummary(steamId);
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

/**
 * Get user's game library
 */
const getGames = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const games = await steamService.getOwnedGames(steamId);
    
    res.json({
      success: true,
      count: games.length,
      games: games.map(game => ({
        ...game,
        playtime_formatted: steamService.formatPlaytime(game.playtime_forever)
      }))
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch games' });
  }
};

/**
 * Get popular games stats (Dota 2, CS2)
 */
const getPopularGames = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const stats = await steamService.getPopularGamesStats(steamId);
    
    // Format playtime
    Object.keys(stats).forEach(game => {
      stats[game].playtime_formatted = steamService.formatPlaytime(stats[game].playtime_forever);
      stats[game].playtime_2weeks_formatted = steamService.formatPlaytime(stats[game].playtime_2weeks);
    });
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching popular games:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch game stats' });
  }
};

/**
 * Get Steam friends list
 */
const getFriends = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const friends = await steamService.getFriendsList(steamId);
    
    // Get registered users from our database
    const registeredSteamIds = friends.map(f => f.steamid);
    const registeredUsers = await User.findAll({
      where: {
        steamId: registeredSteamIds
      },
      attributes: ['id', 'steamId', 'username', 'avatar', 'lastSeen', 'isActive']
    });

    // Mark which friends are registered on our site
    const friendsWithStatus = friends.map(friend => {
      const registered = registeredUsers.find(u => u.steamId === friend.steamid);
      return {
        ...friend,
        isRegistered: !!registered,
        userId: registered?.id,
        lastSeenOnSite: registered?.lastSeen,
        isOnline: friend.personastate > 0
      };
    });

    // Separate online and offline
    const online = friendsWithStatus.filter(f => f.isOnline);
    const offline = friendsWithStatus.filter(f => !f.isOnline);

    res.json({
      success: true,
      total: friends.length,
      online: online.length,
      offline: offline.length,
      registered: registeredUsers.length,
      friends: {
        online,
        offline
      }
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch friends' });
  }
};

/**
 * Get CS2 statistics from Steam API
 */
const getCS2Stats = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const stats = await steamService.getCS2UserStats(steamId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'CS2 stats not found. Profile may be private or user has not played CS2.'
      });
    }

    res.json({
      success: true,
      stats,
      summary: {
        kdr: stats.kdr,
        hsr: `${stats.hsr}%`,
        winrate: `${stats.winrate}%`,
        totalMatches: stats.total_matches_played,
        totalWins: stats.total_matches_won,
        totalKills: stats.total_kills,
        totalDeaths: stats.total_deaths,
        totalMVPs: stats.total_mvps,
        hoursPlayed: Math.round(stats.total_time_played / 3600)
      }
    });
  } catch (error) {
    console.error('Error fetching CS2 stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CS2 stats' });
  }
};

/**
 * Get Dota 2 match history
 */
const getDota2Matches = async (req, res) => {
  try {
    const { steamId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const matches = await steamService.getDota2MatchHistory(steamId, limit);

    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    console.error('Error fetching Dota 2 matches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Dota 2 matches' });
  }
};

/**
 * Get Dota 2 match details
 */
const getDota2MatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await steamService.getDota2MatchDetails(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    res.json({
      success: true,
      match
    });
  } catch (error) {
    console.error('Error fetching Dota 2 match details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch match details' });
  }
};

/**
 * Get CS2 achievements
 */
const getCS2Achievements = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const achievements = await steamService.getPlayerAchievements(steamId, 730); // 730 = CS2 app ID
    
    if (!achievements) {
      return res.status(404).json({
        success: false,
        error: 'Achievements not found. Profile may be private.'
      });
    }

    // Calculate completion percentage
    const totalAchievements = achievements.length;
    const unlockedAchievements = achievements.filter(a => a.achieved === 1).length;
    const completionPercentage = totalAchievements > 0 
      ? Math.round((unlockedAchievements / totalAchievements) * 100) 
      : 0;

    res.json({
      success: true,
      total: totalAchievements,
      unlocked: unlockedAchievements,
      completion: completionPercentage,
      achievements: achievements.map(a => ({
        name: a.apiname,
        displayName: a.name || a.apiname,
        description: a.description || '',
        achieved: a.achieved === 1,
        unlockTime: a.unlocktime || null
      }))
    });
  } catch (error) {
    console.error('Error fetching CS2 achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
};

/**
 * Get current user's complete Steam stats
 */
const getMyStats = async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    const [profile, cs2Stats, popularGames, friends] = await Promise.all([
      steamService.getUserSummary(steamId),
      steamService.getCS2UserStats(steamId),
      steamService.getPopularGamesStats(steamId),
      steamService.getFriendsList(steamId)
    ]);

    // Format popular games playtime
    Object.keys(popularGames).forEach(game => {
      popularGames[game].playtime_formatted = steamService.formatPlaytime(popularGames[game].playtime_forever);
      popularGames[game].playtime_2weeks_formatted = steamService.formatPlaytime(popularGames[game].playtime_2weeks);
    });

    res.json({
      success: true,
      data: {
        profile,
        cs2Stats: cs2Stats ? {
          ...cs2Stats,
          summary: {
            kdr: cs2Stats.kdr,
            hsr: `${cs2Stats.hsr}%`,
            winrate: `${cs2Stats.winrate}%`,
            totalMatches: cs2Stats.total_matches_played,
            totalWins: cs2Stats.total_matches_won,
            hoursPlayed: Math.round(cs2Stats.total_time_played / 3600)
          }
        } : null,
        popularGames,
        friendsCount: friends.length,
        friendsOnline: friends.filter(f => f.personastate > 0).length
      }
    });
  } catch (error) {
    console.error('Error fetching my stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your Steam stats' });
  }
};

module.exports = {
  getProfile,
  getGames,
  getPopularGames,
  getFriends,
  getCS2Stats,
  getCS2Achievements,
  getDota2Matches,
  getDota2MatchDetails,
  getMyStats
};


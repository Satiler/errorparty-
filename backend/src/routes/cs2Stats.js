const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const cs2StatsService = require('../services/cs2StatsService');
const { CS2PlayerPerformance, CS2WeaponStats, CS2Match, User } = require('../models');
const { Op } = require('sequelize');

/**
 * @route GET /api/cs2-stats/performance/:steamId
 * @desc Get player performance metrics
 * @access Public
 */
router.get('/performance/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const performance = await cs2StatsService.getPlayerPerformance(user.id);
    
    if (!performance) {
      return res.status(404).json({ 
        success: false, 
        error: 'No performance data available. Player needs to play matches first.' 
      });
    }

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance data' });
  }
});

/**
 * @route GET /api/cs2-stats/weapons/:steamId
 * @desc Get weapon statistics for a player
 * @access Public
 */
router.get('/weapons/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    const { weaponType, limit } = req.query;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const options = {};
    if (weaponType) {
      options.weaponType = weaponType;
    }

    const weaponStats = await cs2StatsService.getWeaponStats(user.id, options);
    
    // Apply limit if specified
    const limitedStats = limit ? weaponStats.slice(0, parseInt(limit)) : weaponStats;

    res.json({
      success: true,
      weaponStats: limitedStats,
      total: weaponStats.length
    });

  } catch (error) {
    console.error('Error fetching weapon stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch weapon statistics' });
  }
});

/**
 * @route GET /api/cs2-stats/matches/:steamId
 * @desc Get match history with filters
 * @access Public
 */
router.get('/matches/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    const { 
      limit = 20, 
      offset = 0, 
      map, 
      result, 
      startDate, 
      endDate 
    } = req.query;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (map) options.map = map;
    if (result) options.result = result;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const matchHistory = await cs2StatsService.getMatchHistory(user.id, options);

    res.json({
      success: true,
      ...matchHistory
    });

  } catch (error) {
    console.error('Error fetching match history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch match history' });
  }
});

/**
 * @route GET /api/cs2-stats/leaderboard
 * @desc Get top performers leaderboard
 * @access Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { 
      criteria = 'rating', // rating, kd, adr, winrate, headshot, clutch, impact
      limit = 50 
    } = req.query;

    const leaderboard = await cs2StatsService.getLeaderboard(criteria, parseInt(limit));

    res.json({
      success: true,
      leaderboard,
      criteria,
      total: leaderboard.length
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * @route GET /api/cs2-stats/weapon-types/:steamId
 * @desc Get aggregated stats by weapon type
 * @access Public
 */
router.get('/weapon-types/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Get all weapon stats and aggregate by type
    const weaponStats = await cs2StatsService.getWeaponStats(user.id);
    
    // Aggregate by weapon type
    const typeStats = {};
    
    weaponStats.forEach(weapon => {
      if (!typeStats[weapon.weaponType]) {
        typeStats[weapon.weaponType] = {
          weaponType: weapon.weaponType,
          totalKills: 0,
          totalHeadshots: 0,
          totalDamage: 0,
          totalDeaths: 0,
          totalShotsFired: 0,
          totalShotsHit: 0,
          weapons: []
        };
      }
      
      typeStats[weapon.weaponType].totalKills += weapon.kills;
      typeStats[weapon.weaponType].totalHeadshots += weapon.headshots;
      typeStats[weapon.weaponType].totalDamage += weapon.damage;
      typeStats[weapon.weaponType].totalDeaths += weapon.deaths;
      typeStats[weapon.weaponType].weapons.push(weapon.weaponName);
    });

    // Calculate percentages
    Object.values(typeStats).forEach(type => {
      type.headshotPercentage = type.totalKills > 0 
        ? parseFloat(((type.totalHeadshots / type.totalKills) * 100).toFixed(2))
        : 0;
      type.kdRatio = type.totalDeaths > 0
        ? parseFloat((type.totalKills / type.totalDeaths).toFixed(2))
        : type.totalKills;
    });

    res.json({
      success: true,
      weaponTypes: Object.values(typeStats)
    });

  } catch (error) {
    console.error('Error fetching weapon type stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch weapon type statistics' });
  }
});

/**
 * @route GET /api/cs2-stats/maps/:steamId
 * @desc Get map-specific statistics
 * @access Public
 */
router.get('/maps/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    // Get all matches grouped by map
    const matches = await CS2Match.findAll({
      where: { userId: user.id },
      attributes: [
        'map',
        [CS2Match.sequelize.fn('COUNT', CS2Match.sequelize.col('id')), 'totalMatches'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.literal('CASE WHEN is_win = true THEN 1 ELSE 0 END')), 'wins'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.col('kills')), 'totalKills'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.col('deaths')), 'totalDeaths'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.col('assists')), 'totalAssists'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.col('damage')), 'totalDamage'],
        [CS2Match.sequelize.fn('SUM', CS2Match.sequelize.col('rounds_played')), 'totalRounds'],
        [CS2Match.sequelize.fn('AVG', CS2Match.sequelize.col('adr')), 'avgADR'],
        [CS2Match.sequelize.fn('MAX', CS2Match.sequelize.col('kills')), 'bestKills']
      ],
      group: ['map'],
      order: [[CS2Match.sequelize.fn('COUNT', CS2Match.sequelize.col('id')), 'DESC']],
      raw: true
    });

    const mapStats = matches.map(map => {
      const totalMatches = parseInt(map.totalMatches);
      const wins = parseInt(map.wins) || 0;
      const totalKills = parseInt(map.totalKills) || 0;
      const totalDeaths = parseInt(map.totalDeaths) || 0;

      return {
        map: map.map,
        totalMatches,
        wins,
        losses: totalMatches - wins,
        winrate: totalMatches > 0 ? parseFloat(((wins / totalMatches) * 100).toFixed(2)) : 0,
        totalKills,
        totalDeaths,
        totalAssists: parseInt(map.totalAssists) || 0,
        totalDamage: parseInt(map.totalDamage) || 0,
        kdRatio: totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : totalKills,
        avgADR: parseFloat(map.avgADR || 0).toFixed(2),
        bestKills: parseInt(map.bestKills) || 0,
        totalRounds: parseInt(map.totalRounds) || 0
      };
    });

    res.json({
      success: true,
      mapStats
    });

  } catch (error) {
    console.error('Error fetching map stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch map statistics' });
  }
});

/**
 * @route GET /api/cs2-stats/recent-form/:steamId
 * @desc Get recent performance trend (last 20 matches)
 * @access Public
 */
router.get('/recent-form/:steamId', optionalAuth, async (req, res) => {
  try {
    const { steamId } = req.params;
    const { limit = 20 } = req.query;
    
    // Find user by steamId
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }

    const recentMatches = await CS2Match.findAll({
      where: { userId: user.id },
      order: [['playedAt', 'DESC']],
      limit: parseInt(limit),
      attributes: [
        'id', 'playedAt', 'map', 'isWin', 
        'kills', 'deaths', 'assists', 
        'damage', 'roundsPlayed', 'adr', 'rating'
      ]
    });

    // Calculate trend
    const trend = recentMatches.map((match, index) => ({
      matchNumber: recentMatches.length - index,
      ...match.toJSON(),
      kd: match.deaths > 0 ? parseFloat((match.kills / match.deaths).toFixed(2)) : match.kills
    })).reverse();

    res.json({
      success: true,
      recentForm: trend
    });

  } catch (error) {
    console.error('Error fetching recent form:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent form' });
  }
});

/**
 * @route GET /api/cs2-stats/compare
 * @desc Compare two players
 * @access Public
 */
router.get('/compare', async (req, res) => {
  try {
    const { steamId1, steamId2 } = req.query;

    if (!steamId1 || !steamId2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both steamId1 and steamId2 are required' 
      });
    }

    // Find both users
    const user1 = await User.findOne({ where: { steamId: steamId1 } });
    const user2 = await User.findOne({ where: { steamId: steamId2 } });

    if (!user1 || !user2) {
      return res.status(404).json({ success: false, error: 'One or both players not found' });
    }

    // Get performance for both
    const performance1 = await cs2StatsService.getPlayerPerformance(user1.id);
    const performance2 = await cs2StatsService.getPlayerPerformance(user2.id);

    if (!performance1 || !performance2) {
      return res.status(404).json({ 
        success: false, 
        error: 'Performance data not available for one or both players' 
      });
    }

    // Compare stats
    const comparison = {
      player1: performance1,
      player2: performance2,
      comparison: {
        kdRatio: {
          player1: performance1.kdRatio,
          player2: performance2.kdRatio,
          winner: performance1.kdRatio > performance2.kdRatio ? 'player1' : 'player2'
        },
        winrate: {
          player1: performance1.winrate,
          player2: performance2.winrate,
          winner: performance1.winrate > performance2.winrate ? 'player1' : 'player2'
        },
        adr: {
          player1: performance1.averageDamagePerRound,
          player2: performance2.averageDamagePerRound,
          winner: performance1.averageDamagePerRound > performance2.averageDamagePerRound ? 'player1' : 'player2'
        },
        rating: {
          player1: performance1.hltvRating,
          player2: performance2.hltvRating,
          winner: performance1.hltvRating > performance2.hltvRating ? 'player1' : 'player2'
        },
        headshotPercentage: {
          player1: performance1.headshotPercentage,
          player2: performance2.headshotPercentage,
          winner: performance1.headshotPercentage > performance2.headshotPercentage ? 'player1' : 'player2'
        }
      }
    };

    res.json({
      success: true,
      ...comparison
    });

  } catch (error) {
    console.error('Error comparing players:', error);
    res.status(500).json({ success: false, error: 'Failed to compare players' });
  }
});

module.exports = router;

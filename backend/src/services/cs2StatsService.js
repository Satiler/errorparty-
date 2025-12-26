const { Op } = require('sequelize');
const { CS2Match, CS2WeaponStats, CS2PlayerPerformance, User } = require('../models');
const redisService = require('./redisService');

/**
 * CS2 Statistics Service
 * Advanced statistics calculations and aggregations
 */
class CS2StatsService {
  
  /**
   * Update player performance after a match
   */
  async updatePlayerPerformance(userId, matchId) {
    try {
      // Get the match data
      const match = await CS2Match.findByPk(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Get or create performance record
      let performance = await CS2PlayerPerformance.findOne({ where: { userId } });
      
      if (!performance) {
        performance = await CS2PlayerPerformance.create({ userId });
      }

      // Update total matches
      performance.totalMatches += 1;
      if (match.isWin) {
        performance.matchesWon += 1;
        performance.currentWinStreak += 1;
        if (performance.currentWinStreak > performance.longestWinStreak) {
          performance.longestWinStreak = performance.currentWinStreak;
        }
      } else {
        performance.matchesLost += 1;
        performance.currentWinStreak = 0;
      }

      // Update KDA
      performance.totalKills += match.kills;
      performance.totalDeaths += match.deaths;
      performance.totalAssists += match.assists;
      performance.totalHeadshots += match.headshots;

      // Update damage
      performance.totalDamage += match.damage;
      
      // Update rounds
      performance.totalRounds += match.roundsPlayed;
      performance.roundsWon += match.roundsWon;
      performance.totalMVPs += match.mvps;

      // Update multi-kills
      performance.total3Kills += match.kills3k || 0;
      performance.total4Kills += match.kills4k || 0;
      performance.total5Kills += match.kills5k || 0;

      // Update clutches
      const clutchTotal = (match.clutch1v1 || 0) + (match.clutch1v2 || 0) + 
                         (match.clutch1v3 || 0) + (match.clutch1v4 || 0) + (match.clutch1v5 || 0);
      performance.totalClutches += clutchTotal;
      performance.clutchesWon += clutchTotal; // Simplified - in real scenario need to track won vs attempted

      // Update peak performance
      if (!performance.bestKillsInMatch || match.kills > performance.bestKillsInMatch) {
        performance.bestKillsInMatch = match.kills;
      }
      
      if (match.adr) {
        if (!performance.bestADRInMatch || match.adr > performance.bestADRInMatch) {
          performance.bestADRInMatch = match.adr;
        }
      }

      // Update last match date
      performance.lastMatchDate = match.playedAt;

      // Calculate recent form (last 10 matches)
      await this.updateRecentForm(userId, performance);

      // Save (hooks will calculate derived stats)
      await performance.save();

      // Clear cache
      await redisService.delete(`cs2:performance:${userId}`);
      await redisService.delete(`cs2:stats:${userId}`);

      return performance;

    } catch (error) {
      console.error('Error updating player performance:', error);
      throw error;
    }
  }

  /**
   * Update recent form statistics (last 10 matches)
   */
  async updateRecentForm(userId, performance) {
    try {
      const recentMatches = await CS2Match.findAll({
        where: { userId },
        order: [['playedAt', 'DESC']],
        limit: 10
      });

      if (recentMatches.length === 0) return;

      const recentWins = recentMatches.filter(m => m.isWin).length;
      const recentKills = recentMatches.reduce((sum, m) => sum + m.kills, 0);
      const recentDeaths = recentMatches.reduce((sum, m) => sum + m.deaths, 0);
      const recentDamage = recentMatches.reduce((sum, m) => sum + m.damage, 0);
      const recentRounds = recentMatches.reduce((sum, m) => sum + m.roundsPlayed, 0);

      performance.recentWinrate = parseFloat(((recentWins / recentMatches.length) * 100).toFixed(2));
      performance.recentKD = recentDeaths > 0 ? parseFloat((recentKills / recentDeaths).toFixed(2)) : recentKills;
      performance.recentADR = recentRounds > 0 ? parseFloat((recentDamage / recentRounds).toFixed(2)) : 0;

    } catch (error) {
      console.error('Error updating recent form:', error);
    }
  }

  /**
   * Update weapon statistics
   */
  async updateWeaponStats(userId, matchId, weaponData) {
    try {
      for (const weapon of weaponData) {
        // Find or create weapon stats for this match
        let weaponStats = await CS2WeaponStats.findOne({
          where: {
            userId,
            matchId,
            weaponName: weapon.name
          }
        });

        if (!weaponStats) {
          weaponStats = await CS2WeaponStats.create({
            userId,
            matchId,
            weaponName: weapon.name,
            weaponType: weapon.type || this.getWeaponType(weapon.name),
            kills: weapon.kills || 0,
            headshots: weapon.headshots || 0,
            wallbangKills: weapon.wallbangKills || 0,
            airshotKills: weapon.airshotKills || 0,
            blindKills: weapon.blindKills || 0,
            totalDamage: weapon.damage || 0,
            shotsHit: weapon.shotsHit || 0,
            shotsFired: weapon.shotsFired || 0,
            deaths: weapon.deaths || 0,
            firstKills: weapon.firstKills || 0,
            multiKills: weapon.multiKills || 0,
            timeUsed: weapon.timeUsed || 0
          });
        } else {
          // Update existing stats
          weaponStats.kills += weapon.kills || 0;
          weaponStats.headshots += weapon.headshots || 0;
          weaponStats.wallbangKills += weapon.wallbangKills || 0;
          weaponStats.airshotKills += weapon.airshotKills || 0;
          weaponStats.blindKills += weapon.blindKills || 0;
          weaponStats.totalDamage += weapon.damage || 0;
          weaponStats.shotsHit += weapon.shotsHit || 0;
          weaponStats.shotsFired += weapon.shotsFired || 0;
          weaponStats.deaths += weapon.deaths || 0;
          weaponStats.firstKills += weapon.firstKills || 0;
          weaponStats.multiKills += weapon.multiKills || 0;
          weaponStats.timeUsed += weapon.timeUsed || 0;
          
          await weaponStats.save();
        }
      }

      // Clear cache
      await redisService.delete(`cs2:weapons:${userId}`);

    } catch (error) {
      console.error('Error updating weapon stats:', error);
      throw error;
    }
  }

  /**
   * Get aggregated weapon statistics for a player
   */
  async getWeaponStats(userId, options = {}) {
    const cacheKey = `cs2:weapons:${userId}:${JSON.stringify(options)}`;
    
    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const where = { userId };
      
      // Filter by match IDs if provided
      if (options.matchIds) {
        where.matchId = { [Op.in]: options.matchIds };
      }

      // Filter by weapon type if provided
      if (options.weaponType) {
        where.weaponType = options.weaponType;
      }

      const weapons = await CS2WeaponStats.findAll({
        where,
        attributes: [
          'weaponName',
          'weaponType',
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('kills')), 'totalKills'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('headshots')), 'totalHeadshots'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('total_damage')), 'totalDamage'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('shots_hit')), 'totalShotsHit'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('shots_fired')), 'totalShotsFired'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('deaths')), 'totalDeaths'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('wallbang_kills')), 'totalWallbangKills'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('first_kills')), 'totalFirstKills'],
          [CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('time_used')), 'totalTimeUsed']
        ],
        group: ['weaponName', 'weaponType'],
        order: [[CS2WeaponStats.sequelize.fn('SUM', CS2WeaponStats.sequelize.col('kills')), 'DESC']],
        raw: true
      });

      // Calculate derived stats
      const stats = weapons.map(weapon => {
        const kills = parseInt(weapon.totalKills) || 0;
        const headshots = parseInt(weapon.totalHeadshots) || 0;
        const shotsFired = parseInt(weapon.totalShotsFired) || 0;
        const shotsHit = parseInt(weapon.totalShotsHit) || 0;

        return {
          weaponName: weapon.weaponName,
          weaponType: weapon.weaponType,
          kills,
          headshots,
          damage: parseInt(weapon.totalDamage) || 0,
          deaths: parseInt(weapon.totalDeaths) || 0,
          wallbangKills: parseInt(weapon.totalWallbangKills) || 0,
          firstKills: parseInt(weapon.totalFirstKills) || 0,
          timeUsed: parseInt(weapon.totalTimeUsed) || 0,
          headshotPercentage: kills > 0 ? parseFloat(((headshots / kills) * 100).toFixed(2)) : 0,
          accuracy: shotsFired > 0 ? parseFloat(((shotsHit / shotsFired) * 100).toFixed(2)) : 0,
          kdRatio: parseInt(weapon.totalDeaths) > 0 ? parseFloat((kills / parseInt(weapon.totalDeaths)).toFixed(2)) : kills
        };
      });

      // Cache for 5 minutes
      await redisService.set(cacheKey, stats, 300);

      return stats;

    } catch (error) {
      console.error('Error getting weapon stats:', error);
      throw error;
    }
  }

  /**
   * Get player performance metrics
   */
  async getPlayerPerformance(userId) {
    const cacheKey = `cs2:performance:${userId}`;
    
    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const performance = await CS2PlayerPerformance.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'steamId', 'username', 'avatar']
        }]
      });

      if (!performance) {
        return null;
      }

      const result = performance.toJSON();

      // Cache for 5 minutes
      await redisService.set(cacheKey, result, 300);

      return result;

    } catch (error) {
      console.error('Error getting player performance:', error);
      throw error;
    }
  }

  /**
   * Get match history with filters
   */
  async getMatchHistory(userId, options = {}) {
    try {
      const where = { userId };
      const limit = options.limit || 20;
      const offset = options.offset || 0;

      // Filter by date range
      if (options.startDate || options.endDate) {
        where.playedAt = {};
        if (options.startDate) {
          where.playedAt[Op.gte] = new Date(options.startDate);
        }
        if (options.endDate) {
          where.playedAt[Op.lte] = new Date(options.endDate);
        }
      }

      // Filter by map
      if (options.map) {
        where.map = options.map;
      }

      // Filter by result
      if (options.result === 'win') {
        where.isWin = true;
      } else if (options.result === 'loss') {
        where.isWin = false;
      }

      const matches = await CS2Match.findAndCountAll({
        where,
        limit,
        offset,
        order: [['playedAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'steamId', 'username', 'avatar']
          }
        ]
      });

      return {
        matches: matches.rows,
        total: matches.count,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(matches.count / limit)
      };

    } catch (error) {
      console.error('Error getting match history:', error);
      throw error;
    }
  }

  /**
   * Get top performers leaderboard
   */
  async getLeaderboard(criteria = 'rating', limit = 50) {
    const cacheKey = `cs2:leaderboard:${criteria}:${limit}`;
    
    // Try cache first
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const orderField = this.getLeaderboardOrderField(criteria);
      
      const leaderboard = await CS2PlayerPerformance.findAll({
        where: {
          totalMatches: { [Op.gte]: 10 } // Minimum 10 matches
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'steamId', 'username', 'avatar']
        }],
        order: [[orderField, 'DESC']],
        limit
      });

      const result = leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry.toJSON()
      }));

      // Cache for 10 minutes
      await redisService.set(cacheKey, result, 600);

      return result;

    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Helper: Get weapon type from name
   */
  getWeaponType(weaponName) {
    const weaponTypes = {
      // Rifles
      ak47: 'rifle', m4a1: 'rifle', m4a1_silencer: 'rifle', aug: 'rifle', sg556: 'rifle',
      famas: 'rifle', galilar: 'rifle',
      // SMGs
      mp9: 'smg', mac10: 'smg', mp7: 'smg', mp5sd: 'smg', ump45: 'smg', p90: 'smg', bizon: 'smg',
      // Snipers
      awp: 'sniper', ssg08: 'sniper', scar20: 'sniper', g3sg1: 'sniper',
      // Pistols
      glock: 'pistol', usp_silencer: 'pistol', p250: 'pistol', fiveseven: 'pistol',
      tec9: 'pistol', cz75a: 'pistol', deagle: 'pistol', elite: 'pistol', hkp2000: 'pistol',
      revolver: 'pistol',
      // Heavy
      nova: 'shotgun', xm1014: 'shotgun', mag7: 'shotgun', sawedoff: 'shotgun',
      m249: 'heavy', negev: 'heavy',
      // Grenades
      hegrenade: 'grenade', flashbang: 'grenade', smokegrenade: 'grenade',
      molotov: 'grenade', incgrenade: 'grenade', decoy: 'grenade',
      // Knife
      knife: 'knife', knife_t: 'knife'
    };

    return weaponTypes[weaponName.toLowerCase()] || 'equipment';
  }

  /**
   * Helper: Get order field for leaderboard
   */
  getLeaderboardOrderField(criteria) {
    const fields = {
      rating: 'hltvRating',
      kd: 'kdRatio',
      adr: 'averageDamagePerRound',
      winrate: 'winrate',
      headshot: 'headshotPercentage',
      clutch: 'clutchSuccessRate',
      impact: 'impactRating'
    };

    return fields[criteria] || 'hltvRating';
  }
}

module.exports = new CS2StatsService();

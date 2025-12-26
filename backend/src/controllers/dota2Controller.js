const axios = require('axios');
const { User } = require('../models');
const redisService = require('../services/redisService');
const { checkAndAwardAchievements, getUserAchievements } = require('../services/achievementService');
const { analyzeRecentMatches, assignQuests } = require('../services/questService');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const DOTA2_APP_ID = 570;

/**
 * Convert Steam ID64 to Steam ID32
 * OpenDota uses 32-bit Steam IDs
 */
const steamID64ToSteamID32 = (steamID64) => {
  // Steam ID64 format: 76561197960265728 + accountID
  const steamID64Base = '76561197960265728';
  const accountID = BigInt(steamID64) - BigInt(steamID64Base);
  return accountID.toString();
};

/**
 * Get Dota 2 player summary (like Dotabuff)
 */
const getPlayerSummary = async (req, res) => {
  try {
    let { steamId } = req.params;
    const originalSteamId = steamId;
    
    // Convert Steam ID64 to Steam ID32 if needed (OpenDota requires ID32)
    if (steamId.length === 17) {
      steamId = steamID64ToSteamID32(steamId);
      console.log(`Converted Steam ID64 ${originalSteamId} to Steam ID32: ${steamId}`);
    }
    
    // Try to get from cache or fetch fresh data
    const data = await redisService.getOrSet(
      `dota2:player:${steamId}`,
      async () => {
        // First, try to refresh the player data in OpenDota
        // This tells OpenDota to fetch latest data from Steam
        try {
          await axios.post(`https://api.opendota.com/api/players/${steamId}/refresh`);
        } catch (refreshError) {
          // Ignore refresh errors, continue with fetching data
          console.log('OpenDota refresh response:', refreshError.response?.data);
        }
        
        // Get player info first to check if profile exists
        const playerUrl = `https://api.opendota.com/api/players/${steamId}`;
        const playerResponse = await axios.get(playerUrl);
        const playerData = playerResponse.data;

        // Check if profile exists (OpenDota returns error property if not found)
        if (playerData.error || (!playerData.profile && !playerData.rank_tier)) {
          throw {
            status: 404,
            response: {
              success: false,
              error: 'Player not found in OpenDota. Please visit the OpenDota link to add your profile, then try again in 2-3 minutes.',
              code: 'PROFILE_NOT_FOUND',
              opendotaUrl: `https://www.opendota.com/players/${steamId}`,
              steamId32: steamId
            }
          };
        }

        // Get recent matches - basic endpoint without details
        const recentUrl = `https://api.opendota.com/api/players/${steamId}/recentMatches`;
        const recentResponse = await axios.get(recentUrl);
        const recentMatchesBasic = recentResponse.data || [];
        
        // Get matches for stats calculations
        const matches = recentMatchesBasic;
        const recentMatches = recentMatchesBasic;

        // Get win/loss stats
        const wlUrl = `https://api.opendota.com/api/players/${steamId}/wl`;
        const wlResponse = await axios.get(wlUrl);
        const { win, lose } = wlResponse.data;

        // Get hero stats
        const heroesUrl = `https://api.opendota.com/api/players/${steamId}/heroes`;
        const heroesResponse = await axios.get(heroesUrl);
        const heroes = heroesResponse.data || [];

        // Get totals (aggregate stats)
        const totalsUrl = `https://api.opendota.com/api/players/${steamId}/totals`;
        const totalsResponse = await axios.get(totalsUrl);
        const totals = totalsResponse.data || [];

        // Get counts (match outcomes, game modes, etc)
        const countsUrl = `https://api.opendota.com/api/players/${steamId}/counts`;
        const countsResponse = await axios.get(countsUrl);
        const counts = countsResponse.data || {};

        // Get rankings (hero rankings)
        const rankingsUrl = `https://api.opendota.com/api/players/${steamId}/rankings`;
        const rankingsResponse = await axios.get(rankingsUrl);
        const rankings = rankingsResponse.data || [];

        // Get peers (frequently played with)
        const peersUrl = `https://api.opendota.com/api/players/${steamId}/peers`;
        const peersResponse = await axios.get(peersUrl);
        const peers = peersResponse.data || [];

        // Calculate advanced stats from totals
        const extractStat = (field) => {
          const stat = totals.find(t => t.field === field);
          return stat ? stat.sum : 0;
        };

        const totalKills = extractStat('kills');
        const totalDeaths = extractStat('deaths');
        const totalAssists = extractStat('assists');
        const totalGPM = extractStat('gold_per_min');
        const totalXPM = extractStat('xp_per_min');
        const totalLastHits = extractStat('last_hits');
        const totalDenies = extractStat('denies');
        const totalHeroDamage = extractStat('hero_damage');
        const totalTowerDamage = extractStat('tower_damage');
        const totalHeroHealing = extractStat('hero_healing');
        const gamesPlayed = win + lose;

        const advancedStats = {
          kda: totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : totalKills + totalAssists,
          avgKills: gamesPlayed > 0 ? (totalKills / gamesPlayed).toFixed(1) : 0,
          avgDeaths: gamesPlayed > 0 ? (totalDeaths / gamesPlayed).toFixed(1) : 0,
          avgAssists: gamesPlayed > 0 ? (totalAssists / gamesPlayed).toFixed(1) : 0,
          avgGPM: gamesPlayed > 0 ? Math.round(totalGPM / gamesPlayed) : 0,
          avgXPM: gamesPlayed > 0 ? Math.round(totalXPM / gamesPlayed) : 0,
          avgLastHits: gamesPlayed > 0 ? Math.round(totalLastHits / gamesPlayed) : 0,
          avgDenies: gamesPlayed > 0 ? Math.round(totalDenies / gamesPlayed) : 0,
          avgHeroDamage: gamesPlayed > 0 ? Math.round(totalHeroDamage / gamesPlayed) : 0,
          avgTowerDamage: gamesPlayed > 0 ? Math.round(totalTowerDamage / gamesPlayed) : 0,
          avgHeroHealing: gamesPlayed > 0 ? Math.round(totalHeroHealing / gamesPlayed) : 0
        };

        console.log(`🔴 Redis MISS - Fetched Dota 2 stats for ${steamId}`);

        return {
          profile: playerData.profile || {},
          rank: playerData.rank_tier || null,
          leaderboard_rank: playerData.leaderboard_rank || null,
          mmr_estimate: playerData.mmr_estimate?.estimate || null,
          wins: win || 0,
          losses: lose || 0,
          winrate: (win + lose) > 0 ? ((win / (win + lose)) * 100).toFixed(2) : '0.00',
          recentMatches: matches.slice(0, 20),
          recentPerformance: recentMatches.slice(0, 20),
          topHeroes: heroes.slice(0, 20),
          heroRankings: rankings.slice(0, 10),
          frequentPeers: peers.slice(0, 10),
          totalMatches: (win || 0) + (lose || 0),
          advancedStats,
          totals,
          counts,
          steamId32: steamId
        };
      },
      300 // 5 minute TTL
    );

    // Автоматический анализ матчей для квестов (если пользователь авторизован)
    if (req.user) {
      try {
        console.log(`🎮 Автоматическая проверка квестов Dota 2 для пользователя ${req.user.id}`);
        
        // Назначаем ежедневные квесты если их нет
        const assigned = await assignQuests(req.user.id, 'dota2', 'daily');
        if (assigned.length > 0) {
          console.log(`✅ Назначено ${assigned.length} новых квестов Dota 2`);
        }
        
        // Анализируем последние матчи в фоновом режиме
        analyzeRecentMatches(req.user.id, originalSteamId, 'dota2').catch(err => {
          console.error('❌ Ошибка фонового анализа квестов:', err.message);
        });
      } catch (questErr) {
        console.error('❌ Ошибка системы квестов:', questErr.message);
        // Не прерываем основной запрос
      }
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Dota 2 player summary error:', error.response?.data || error);
    
    // Handle custom 404 error from cache callback
    if (error.status === 404 && error.response) {
      return res.status(404).json(error.response);
    }
    
    // Check if it's a 404 from OpenDota
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Player not found or profile is private',
        code: 'PROFILE_NOT_FOUND'
      });
    }
    
    res.status(500).json({ success: false, error: 'Failed to fetch Dota 2 stats' });
  }
};

/**
 * Get recent Dota 2 matches with details
 */
const getRecentMatches = async (req, res) => {
  try {
    const { steamId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const matches = await redisService.getOrSet(
      `dota2:matches:${steamId}:${limit}`,
      async () => {
        const url = `https://api.opendota.com/api/players/${steamId}/matches?limit=${limit}`;
        const response = await axios.get(url);
        
        console.log(`🔴 Redis MISS - Fetched recent matches for ${steamId}`);
        
        return response.data;
      },
      180 // 3 minute TTL
    );
    
    res.json({
      success: true,
      matches
    });
  } catch (error) {
    console.error('Dota 2 matches error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch matches' });
  }
};

/**
 * Get Dota 2 heroes statistics
 */
const getHeroStats = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const url = `https://api.opendota.com/api/players/${steamId}/heroes`;
    const response = await axios.get(url);
    
    res.json({
      success: true,
      heroes: response.data
    });
  } catch (error) {
    console.error('Dota 2 heroes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hero stats' });
  }
};

/**
 * Get Dota 2 match details
 */
const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const url = `https://api.opendota.com/api/matches/${matchId}`;
    const response = await axios.get(url);
    
    res.json({
      success: true,
      match: response.data
    });
  } catch (error) {
    console.error('Dota 2 match details error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch match details' });
  }
};

/**
 * Get player records (best performances)
 */
const getPlayerRecords = async (req, res) => {
  try {
    let { steamId } = req.params;
    
    // Convert Steam ID64 to Steam ID32 if needed
    if (steamId.length === 17) {
      steamId = steamID64ToSteamID32(steamId);
    }
    
    const url = `https://api.opendota.com/api/players/${steamId}/matches?limit=100`;
    const response = await axios.get(url);
    const matches = response.data || [];
    
    // Calculate records
    const records = {
      mostKills: matches.reduce((max, m) => m.kills > (max.kills || 0) ? m : max, {}),
      mostDeaths: matches.reduce((max, m) => m.deaths > (max.deaths || 0) ? m : max, {}),
      mostAssists: matches.reduce((max, m) => m.assists > (max.assists || 0) ? m : max, {}),
      highestGPM: matches.reduce((max, m) => m.gold_per_min > (max.gold_per_min || 0) ? m : max, {}),
      highestXPM: matches.reduce((max, m) => m.xp_per_min > (max.xp_per_min || 0) ? m : max, {}),
      mostLastHits: matches.reduce((max, m) => m.last_hits > (max.last_hits || 0) ? m : max, {}),
      mostDenies: matches.reduce((max, m) => m.denies > (max.denies || 0) ? m : max, {}),
      mostHeroDamage: matches.reduce((max, m) => m.hero_damage > (max.hero_damage || 0) ? m : max, {}),
      mostTowerDamage: matches.reduce((max, m) => m.tower_damage > (max.tower_damage || 0) ? m : max, {}),
      longestGame: matches.reduce((max, m) => m.duration > (max.duration || 0) ? m : max, {}),
      shortestWin: matches
        .filter(m => (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win))
        .reduce((min, m) => !min.duration || m.duration < min.duration ? m : min, {})
    };
    
    res.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Player records error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch records' });
  }
};

/**
 * Get Dota 2 rank distribution
 */
const getRankDistribution = async (req, res) => {
  try {
    const url = 'https://api.opendota.com/api/distributions';
    const response = await axios.get(url);
    
    res.json({
      success: true,
      distributions: response.data
    });
  } catch (error) {
    console.error('Dota 2 rank distribution error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rank distribution' });
  }
};

/**
 * Get filtered matches with server-side filtering
 */
const getFilteredMatches = async (req, res) => {
  try {
    let { steamId } = req.params;
    const { lobby, gameMode, side, region, result, limit = 20 } = req.query;
    
    // Convert Steam ID64 to Steam ID32 if needed
    if (steamId.length === 17) {
      steamId = steamID64ToSteamID32(steamId);
    }

    // Build OpenDota API query parameters
    const params = {
      limit: parseInt(limit)
    };

    // Lobby type filter
    if (lobby && lobby !== 'all') {
      if (lobby === 'ranked') params.lobby_type = 7;
      else if (lobby === 'normal') params.lobby_type = 0;
    }

    // Game mode filter
    if (gameMode && gameMode !== 'all') {
      const gameModes = {
        all_pick: 22,
        single_draft: 4,
        turbo: 23,
        captains_mode: 2,
        random_draft: 3,
        all_random: 6
      };
      if (gameModes[gameMode]) {
        params.game_mode = gameModes[gameMode];
      }
    }

    // Region filter (cluster)
    if (region && region !== 'all') {
      const regions = {
        russia: 181,
        eu_east: 182,
        eu_west: 131,
        us_east: 121,
        us_west: 122,
        sea: 142,
        china: 161
      };
      if (regions[region]) {
        params.region = regions[region];
      }
    }

    const url = `https://api.opendota.com/api/players/${steamId}/matches`;
    const response = await axios.get(url, { params });
    let matches = response.data || [];

    // Client-side filters that OpenDota doesn't support directly
    
    // Side filter (Radiant/Dire)
    if (side && side !== 'all') {
      matches = matches.filter(match => {
        const isRadiant = match.player_slot < 128;
        return side === 'radiant' ? isRadiant : !isRadiant;
      });
    }

    // Result filter (Win/Loss)
    if (result && result !== 'all') {
      matches = matches.filter(match => {
        const isRadiant = match.player_slot < 128;
        const isWin = (isRadiant && match.radiant_win) || (!isRadiant && !match.radiant_win);
        return result === 'win' ? isWin : !isWin;
      });
    }

    // Calculate filtered statistics
    const totalMatches = matches.length;
    const wins = matches.filter(match => {
      const isRadiant = match.player_slot < 128;
      return (isRadiant && match.radiant_win) || (!isRadiant && !match.radiant_win);
    }).length;
    const winrate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(2) : '0.00';

    // Calculate averages for filtered matches
    const avgKills = totalMatches > 0 ? (matches.reduce((sum, m) => sum + (m.kills || 0), 0) / totalMatches).toFixed(1) : 0;
    const avgDeaths = totalMatches > 0 ? (matches.reduce((sum, m) => sum + (m.deaths || 0), 0) / totalMatches).toFixed(1) : 0;
    const avgAssists = totalMatches > 0 ? (matches.reduce((sum, m) => sum + (m.assists || 0), 0) / totalMatches).toFixed(1) : 0;
    const avgGPM = totalMatches > 0 ? Math.round(matches.reduce((sum, m) => sum + (m.gold_per_min || 0), 0) / totalMatches) : 0;
    const avgXPM = totalMatches > 0 ? Math.round(matches.reduce((sum, m) => sum + (m.xp_per_min || 0), 0) / totalMatches) : 0;
    const avgDuration = totalMatches > 0 ? Math.round(matches.reduce((sum, m) => sum + (m.duration || 0), 0) / totalMatches) : 0;
    const kda = avgDeaths > 0 ? ((parseFloat(avgKills) + parseFloat(avgAssists)) / parseFloat(avgDeaths)).toFixed(2) : (parseFloat(avgKills) + parseFloat(avgAssists)).toFixed(2);

    res.json({
      success: true,
      matches,
      stats: {
        totalMatches,
        wins,
        losses: totalMatches - wins,
        winrate,
        avgKills,
        avgDeaths,
        avgAssists,
        avgGPM,
        avgXPM,
        avgDuration,
        kda
      }
    });
  } catch (error) {
    console.error('Dota 2 filtered matches error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch filtered matches',
      details: error.response?.data || error.message 
    });
  }
};

/**
 * Get player achievements based on Dota 2 stats
 */
const getPlayerAchievements = async (req, res) => {
  try {
    let { steamId } = req.params;
    
    // Get user ID from Steam ID
    const user = await User.findOne({ where: { steamId } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found. Please link your Steam account first.' 
      });
    }

    // Convert Steam ID64 to Steam ID32 if needed
    const steamId32 = steamId.length === 17 ? steamID64ToSteamID32(steamId) : steamId;

    // Fetch player stats and records
    const playerUrl = `https://api.opendota.com/api/players/${steamId32}`;
    const playerResponse = await axios.get(playerUrl);
    const stats = playerResponse.data;

    // Get records
    const recentUrl = `https://api.opendota.com/api/players/${steamId32}/recentMatches`;
    const recentResponse = await axios.get(recentUrl);
    const matches = recentResponse.data || [];

    // Calculate records (каждый рекорд включает match_id для проверки уникальности)
    const records = {
      mostKills: matches.reduce((max, m) => {
        if (m.kills > (max?.kills || 0)) {
          return { kills: m.kills, deaths: m.deaths, assists: m.assists, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostDeaths: matches.reduce((max, m) => {
        if (m.deaths > (max?.deaths || 0)) {
          return { deaths: m.deaths, kills: m.kills, assists: m.assists, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostAssists: matches.reduce((max, m) => {
        if (m.assists > (max?.assists || 0)) {
          return { assists: m.assists, kills: m.kills, deaths: m.deaths, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      highestGPM: matches.reduce((max, m) => {
        if (m.gold_per_min > (max?.gold_per_min || 0)) {
          return { gold_per_min: m.gold_per_min, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      highestXPM: matches.reduce((max, m) => {
        if (m.xp_per_min > (max?.xp_per_min || 0)) {
          return { xp_per_min: m.xp_per_min, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostLastHits: matches.reduce((max, m) => {
        if (m.last_hits > (max?.last_hits || 0)) {
          return { last_hits: m.last_hits, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostDenies: matches.reduce((max, m) => {
        if (m.denies > (max?.denies || 0)) {
          return { denies: m.denies, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostHeroDamage: matches.reduce((max, m) => {
        if (m.hero_damage > (max?.hero_damage || 0)) {
          return { hero_damage: m.hero_damage, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      mostTowerDamage: matches.reduce((max, m) => {
        if (m.tower_damage > (max?.tower_damage || 0)) {
          return { tower_damage: m.tower_damage, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      longestGame: matches.reduce((max, m) => {
        if (m.duration > (max?.duration || 0)) {
          return { duration: m.duration, match_id: m.match_id, hero_id: m.hero_id };
        }
        return max;
      }, null),
      shortestWin: matches.filter(m => {
        const isRadiant = m.player_slot < 128;
        return (isRadiant && m.radiant_win) || (!isRadiant && !m.radiant_win);
      }).reduce((min, m) => {
        if (!min || m.duration < min.duration) {
          return { duration: m.duration, match_id: m.match_id, hero_id: m.hero_id };
        }
        return min;
      }, null)
    };

    // Check and award new achievements
    const newAchievements = await checkAndAwardAchievements(user.id, 'dota2', stats, records);

    // Get all user achievements
    const allAchievements = await getUserAchievements(user.id, 'dota2');

    res.json({
      success: true,
      achievements: allAchievements,
      newAchievements: newAchievements.map(a => ({
        key: a.achievementKey,
        title: a.title,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity
      })),
      stats: {
        total: allAchievements.length,
        byRarity: {
          common: allAchievements.filter(a => a.rarity === 'common').length,
          rare: allAchievements.filter(a => a.rarity === 'rare').length,
          epic: allAchievements.filter(a => a.rarity === 'epic').length,
          legendary: allAchievements.filter(a => a.rarity === 'legendary').length,
          mythic: allAchievements.filter(a => a.rarity === 'mythic').length
        }
      }
    });
  } catch (error) {
    console.error('Dota 2 achievements error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch achievements',
      details: error.response?.data || error.message 
    });
  }
};

module.exports = {
  getPlayerSummary,
  getRecentMatches,
  getHeroStats,
  getMatchDetails,
  getPlayerRecords,
  getRankDistribution,
  getFilteredMatches,
  getPlayerAchievements
};

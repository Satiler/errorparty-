const axios = require('axios');
const redisService = require('./redisService');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_API_BASE = 'https://api.steampowered.com';

class SteamService {
  /**
   * Get user's Steam profile summary
   */
  async getUserSummary(steamId) {
    return await redisService.getOrSet(
      `steam:user:${steamId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/`, {
            params: {
              key: STEAM_API_KEY,
              steamids: steamId
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched Steam profile for ${steamId}`);
          
          return response.data.response.players[0] || null;
        } catch (error) {
          console.error('Error fetching Steam user summary:', error);
          return null;
        }
      },
      600 // 10 minute TTL
    );
  }

  /**
   * Get user's owned games with playtime
   */
  async getOwnedGames(steamId) {
    return await redisService.getOrSet(
      `steam:games:${steamId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/`, {
            params: {
              key: STEAM_API_KEY,
              steamid: steamId,
              include_appinfo: true,
              include_played_free_games: true,
              format: 'json'
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched owned games for ${steamId}`);
          
          return response.data.response.games || [];
        } catch (error) {
          console.error('Error fetching owned games:', error);
          return [];
        }
      },
      600 // 10 minute TTL
    );
  }

  /**
   * Get popular games stats (Dota 2, CS2)
   */
  async getPopularGamesStats(steamId) {
    const POPULAR_GAMES = {
      dota2: 570,
      cs2: 730
    };

    const stats = {};

    try {
      const games = await this.getOwnedGames(steamId);
      
      // Find Dota 2
      const dota2 = games.find(g => g.appid === POPULAR_GAMES.dota2);
      if (dota2) {
        stats.dota2 = {
          appid: dota2.appid,
          name: dota2.name,
          playtime_forever: dota2.playtime_forever,
          playtime_2weeks: dota2.playtime_2weeks || 0,
          img_icon_url: dota2.img_icon_url
        };
      }

      // Find CS2
      const cs2 = games.find(g => g.appid === POPULAR_GAMES.cs2);
      if (cs2) {
        stats.cs2 = {
          appid: cs2.appid,
          name: cs2.name,
          playtime_forever: cs2.playtime_forever,
          playtime_2weeks: cs2.playtime_2weeks || 0,
          img_icon_url: cs2.img_icon_url
        };
      }

      return stats;
    } catch (error) {
      console.error('Error fetching popular games stats:', error);
      return {};
    }
  }

  /**
   * Format playtime from minutes to human-readable format
   */
  formatPlaytime(minutes) {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} мин`;
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} дн ${remainingHours} ч`;
  }

  /**
   * Get CS2 user stats from Steam API
   */
  async getCS2UserStats(steamId) {
    return await redisService.getOrSet(
      `steam:cs2stats:${steamId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/ISteamUserStats/GetUserStatsForGame/v0002/`, {
            params: {
              appid: 730, // CS2/CSGO app id
              key: STEAM_API_KEY,
              steamid: steamId
            }
          });
          
          if (!response.data.playerstats || !response.data.playerstats.stats) {
            return null;
          }

          const stats = {};
          response.data.playerstats.stats.forEach(stat => {
            stats[stat.name] = stat.value;
          });

          console.log(`🔴 Redis MISS - Fetched CS2 stats for ${steamId}`);
          
          // Форматируем основную статистику
          return {
            total_kills: stats.total_kills || 0,
            total_deaths: stats.total_deaths || 0,
            total_time_played: stats.total_time_played || 0,
            total_planted_bombs: stats.total_planted_bombs || 0,
            total_defused_bombs: stats.total_defused_bombs || 0,
            total_wins: stats.total_wins || 0,
            total_damage_done: stats.total_damage_done || 0,
            total_money_earned: stats.total_money_earned || 0,
            total_kills_knife: stats.total_kills_knife || 0,
            total_kills_headshot: stats.total_kills_headshot || 0,
            total_kills_enemy_weapon: stats.total_kills_enemy_weapon || 0,
            total_wins_pistolround: stats.total_wins_pistolround || 0,
            total_mvps: stats.total_mvps || 0,
            total_rounds_played: stats.total_rounds_played || 0,
            total_matches_won: stats.total_matches_won || 0,
            total_matches_played: stats.total_matches_played || 0,
            total_gg_matches_won: stats.total_gg_matches_won || 0,
            total_gg_matches_played: stats.total_gg_matches_played || 0,
            total_contribution_score: stats.total_contribution_score || 0,
            last_match_t_wins: stats.last_match_t_wins || 0,
            last_match_ct_wins: stats.last_match_ct_wins || 0,
            last_match_wins: stats.last_match_wins || 0,
            last_match_max_players: stats.last_match_max_players || 0,
            last_match_kills: stats.last_match_kills || 0,
            last_match_deaths: stats.last_match_deaths || 0,
            last_match_mvps: stats.last_match_mvps || 0,
            last_match_damage: stats.last_match_damage || 0,
            last_match_money_spent: stats.last_match_money_spent || 0,
            last_match_favweapon_id: stats.last_match_favweapon_id || 0,
            last_match_favweapon_shots: stats.last_match_favweapon_shots || 0,
            last_match_favweapon_hits: stats.last_match_favweapon_hits || 0,
            last_match_favweapon_kills: stats.last_match_favweapon_kills || 0,
            // Оружие статистика
            total_kills_ak47: stats.total_kills_ak47 || 0,
            total_kills_m4a1: stats.total_kills_m4a1 || 0,
            total_kills_awp: stats.total_kills_awp || 0,
            total_kills_aug: stats.total_kills_aug || 0,
            total_kills_sg556: stats.total_kills_sg556 || 0,
            total_kills_deagle: stats.total_kills_deagle || 0,
            total_kills_elite: stats.total_kills_elite || 0,
            total_kills_fiveseven: stats.total_kills_fiveseven || 0,
            total_kills_glock: stats.total_kills_glock || 0,
            total_kills_hkp2000: stats.total_kills_hkp2000 || 0,
            total_kills_p250: stats.total_kills_p250 || 0,
            total_kills_usp_silencer: stats.total_kills_usp_silencer || 0,
            total_kills_tec9: stats.total_kills_tec9 || 0,
            kdr: stats.total_deaths > 0 ? (stats.total_kills / stats.total_deaths).toFixed(2) : stats.total_kills || 0,
            hsr: stats.total_kills > 0 ? ((stats.total_kills_headshot / stats.total_kills) * 100).toFixed(1) : 0,
            winrate: stats.total_matches_played > 0 ? ((stats.total_matches_won / stats.total_matches_played) * 100).toFixed(1) : 0
          };
        } catch (error) {
          console.error('Error fetching CS2 stats:', error.response?.data || error.message);
          return null;
        }
      },
      300 // 5 minute TTL
    );
  }

  /**
   * Get Dota 2 user stats from Steam API
   */
  async getDota2MatchHistory(steamId, matchesCount = 20) {
    return await redisService.getOrSet(
      `steam:dota2history:${steamId}:${matchesCount}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/IDOTA2Match_570/GetMatchHistory/v1/`, {
            params: {
              key: STEAM_API_KEY,
              account_id: this.steamIdToAccountId(steamId),
              matches_requested: matchesCount
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched Dota 2 history for ${steamId}`);
          
          return response.data.result.matches || [];
        } catch (error) {
          console.error('Error fetching Dota 2 match history:', error);
          return [];
        }
      },
      180 // 3 minute TTL
    );
  }

  /**
   * Get detailed Dota 2 match info
   */
  async getDota2MatchDetails(matchId) {
    return await redisService.getOrSet(
      `steam:dota2match:${matchId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/IDOTA2Match_570/GetMatchDetails/v1/`, {
            params: {
              key: STEAM_API_KEY,
              match_id: matchId
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched Dota 2 match details for ${matchId}`);
          
          return response.data.result || null;
        } catch (error) {
          console.error('Error fetching Dota 2 match details:', error);
          return null;
        }
      },
      3600 // 1 hour TTL - match details don't change
    );
  }

  /**
   * Convert Steam ID 64 to Account ID (for Dota 2)
   */
  steamIdToAccountId(steamId64) {
    const steamId = BigInt(steamId64);
    const accountId = steamId - 76561197960265728n;
    return accountId.toString();
  }

  /**
   * Convert Account ID to Steam ID 64 (for Dota 2)
   */
  accountIdToSteamId(accountId) {
    const steamId = BigInt(accountId) + 76561197960265728n;
    return steamId.toString();
  }

  /**
   * Get CS2 recent match sharing codes (requires game coordinator)
   */
  async getCS2RecentMatches(steamId) {
    // This requires Steam Game Coordinator API
    // For now, return empty array - will implement with steamGCService
    console.log('CS2 recent matches require Game Coordinator integration');
    return [];
  }

  /**
   * Get Steam friends list
   */
  async getFriendsList(steamId) {
    return await redisService.getOrSet(
      `steam:friends:${steamId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/`, {
            params: {
              key: STEAM_API_KEY,
              steamid: steamId,
              relationship: 'friend'
            }
          });
          
          if (!response.data.friendslist) {
            return [];
          }

          const friends = response.data.friendslist.friends;
          
          // Get summaries for all friends
          const friendIds = friends.map(f => f.steamid).join(',');
          const summariesResponse = await axios.get(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/`, {
            params: {
              key: STEAM_API_KEY,
              steamids: friendIds
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched friends list for ${steamId}`);
          
          return summariesResponse.data.response.players.map(player => ({
            steamid: player.steamid,
            personaname: player.personaname,
            avatar: player.avatarfull,
            profileurl: player.profileurl,
            personastate: player.personastate, // 0=Offline, 1=Online, 2=Busy, 3=Away, 4=Snooze, 5=Trade, 6=Play
            gameextrainfo: player.gameextrainfo,
            gameid: player.gameid,
            lastlogoff: player.lastlogoff,
            timecreated: player.timecreated
          }));
        } catch (error) {
          console.error('Get friends list error:', error);
          return [];
        }
      },
      300 // 5 minute TTL
    );
  }

  /**
   * Get player achievements for a game
   */
  async getPlayerAchievements(steamId, appId = 730) {
    return await redisService.getOrSet(
      `steam:achievements:${steamId}:${appId}`,
      async () => {
        try {
          const response = await axios.get(`${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001/`, {
            params: {
              key: STEAM_API_KEY,
              steamid: steamId,
              appid: appId
            }
          });
          
          console.log(`🔴 Redis MISS - Fetched achievements for ${steamId} (app ${appId})`);
          
          return response.data.playerstats?.achievements || null;
        } catch (error) {
          console.error('Get player achievements error:', error);
          return null;
        }
      },
      3600 // 1 hour TTL
    );
  }
}

module.exports = new SteamService();

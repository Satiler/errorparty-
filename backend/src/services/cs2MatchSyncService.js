const axios = require('axios');
const { CS2Match, User } = require('../models');
const { decodeShareCode, normalizeShareCode } = require('../utils/shareCodeDecoder');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const CSGO_COORDINATOR_URL = 'https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1';

/**
 * CS2 Match Sync Service
 * Handles automatic fetching and syncing CS2 matches using authentication token
 * 
 * How it works (similar to SCOPE.GG):
 * 1. User provides Match Token (auth code) from Steam
 * 2. Service uses Steam API to get list of recent match share codes
 * 3. Each match is fetched and analyzed
 * 4. Statistics are extracted and stored in database
 */

class CS2MatchSyncService {
  /**
   * Sync matches for a user using their auth token
   * This uses the ICSGOPlayers_730 API which allows fetching match history
   * @param {number} userId - User ID
   * @param {string} steamId - Steam ID
   * @param {string} authToken - Authentication token
   * @param {string} startFromCode - Optional share code to start from
   */
  async syncMatchesForUser(userId, steamId, authToken, startFromCode = null) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 STARTING MATCH SYNC for user ${userId} (${steamId})`);
      console.log(`🎯 Starting code: ${startFromCode ? startFromCode.substring(0, 30) + '...' : 'NONE'}`);
      console.log(`${'='.repeat(60)}\n`);
      
      const user = await User.findByPk(userId);
      if (!user || !user.cs2AuthToken) {
        throw new Error('User or auth token not found');
      }

      let newMatches = 0;
      let skippedMatches = 0;
      let failedMatches = 0;
      
      // Try to fetch recent match codes
      // Note: This is a simplified approach. Real implementation would need:
      // 1. Proper Steam API calls with authentication
      // 2. Match share code enumeration
      // 3. Demo file downloads if available
      
      try {
        // Steam API НЕ поддерживает загрузку с начала (пустой knowncode возвращает 403/412)
        // Нужен хотя бы один известный Share Code для начала синхронизации
        
        let knownCode = startFromCode;
        
        // Если код не передан, берём из user.cs2MatchToken или последний из БД
        if (!knownCode) {
          // Сначала проверяем user.cs2MatchToken (Match Token / Share Code последнего матча)
          if (user.cs2MatchToken) {
            knownCode = user.cs2MatchToken;
            console.log(`📌 Using Match Token from user profile: ${knownCode.substring(0, 30)}...`);
          } else {
            // Если нет, берём последний из истории матчей
            const lastMatch = await CS2Match.findOne({
              where: { userId },
              order: [['createdAt', 'DESC']],
              limit: 1
            });
            knownCode = lastMatch ? lastMatch.shareCode : null;
            if (knownCode) {
              console.log(`📌 Using Share Code from last match: ${knownCode.substring(0, 30)}...`);
            }
          }
        }
        
        if (!knownCode) {
          console.log(`⚠️ No known share code found. User must add at least one match manually.`);
          return {
            success: false,
            message: 'No matches to sync from. Please add your first match using Share Code or Match Token.',
            stats: {
              totalMatches: 0,
              newMatches: 0,
              skippedMatches: 0,
              failedMatches: 0
            }
          };
        }
        
        console.log(`📍 Starting sync from code: ${knownCode}`);
        
        // Fetch new matches using Steam's GetNextMatchSharingCode API
        const matches = await this.fetchRecentMatchCodes(steamId, authToken, knownCode);
        
        console.log(`📥 Found ${matches.length} potential new matches`);

        for (const matchCode of matches) {
          try {
            // Normalize the code
            const normalizedCode = normalizeShareCode(matchCode);
            
            // Check if match already exists
            const exists = await CS2Match.findOne({
              where: { userId, shareCode: normalizedCode }
            });

            if (exists) {
              skippedMatches++;
              continue;
            }

            // Decode share code
            const decoded = decodeShareCode(normalizedCode);
            
            // Create match record first
            const match = await CS2Match.create({
              userId,
              shareCode: normalizedCode,
              matchId: decoded.matchId,
              outcomeId: decoded.outcomeId,
              tokenId: decoded.tokenId,
              source: 'share_code'
            });
            
            newMatches++;
            console.log(`✅ Added match: ${normalizedCode}`);
            
            // Queue demo download and parsing (async, runs in background)
            this.fetchMatchDetails(normalizedCode, authToken, steamId, match.id).catch(err => {
              console.error(`Background demo processing failed for match ${match.id}:`, err.message);
            });

          } catch (matchError) {
            console.error(`❌ Failed to process match ${matchCode}:`, matchError.message);
            failedMatches++;
          }
        }

      } catch (apiError) {
        console.error('Steam API error:', apiError.message);
        
        // Fallback: Return info about current status
        const totalMatches = await CS2Match.count({ where: { userId } });
        
        return {
          success: false,
          message: 'Unable to fetch matches automatically. Steam API limitations.',
          info: {
            reason: 'Steam API does not provide public endpoint for match enumeration',
            workaround: 'Matches can be added manually via Share Codes',
            apiError: apiError.message
          },
          stats: {
            totalMatches,
            newMatches: 0,
            skippedMatches: 0,
            failedMatches: 0
          }
        };
      }

      const totalMatches = await CS2Match.count({ where: { userId } });

      const result = {
        success: true,
        message: `Sync completed. Added ${newMatches} new matches.`,
        stats: {
          totalMatches,
          newMatches,
          skippedMatches,
          failedMatches,
          lastSync: new Date()
        }
      };
      
      console.log(`${'='.repeat(60)}`);
      console.log(`✅ SYNC COMPLETED for user ${userId}`);
      console.log(`   📊 New matches: ${newMatches}, Skipped: ${skippedMatches}, Failed: ${failedMatches}`);
      console.log(`   📈 Total matches: ${totalMatches}`);
      console.log(`${'='.repeat(60)}\n`);

      return result;

    } catch (error) {
      console.error('Error syncing CS2 matches:', error);
      throw new Error(`Failed to sync matches: ${error.message}`);
    }
  }

  /**
   * Fetch recent match share codes from Steam
   * Uses Steam's GetNextMatchSharingCode API endpoint
   */
  async fetchRecentMatchCodes(steamId, authToken, knownCode = null, depth = 0, maxDepth = 50) {
    try {
      // Защита от бесконечной рекурсии
      if (depth >= maxDepth) {
        console.log(`⚠️ Reached maximum depth (${maxDepth} matches), stopping...`);
        return [];
      }

      console.log(`📥 Fetching match ${depth + 1}/${maxDepth}... ${knownCode ? `(from ${knownCode.substring(0, 20)}...)` : '(from start)'}`);
      
      const matchCodes = [];
      
      try {
        const apiUrl = `https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1`;
        const params = {
          key: process.env.STEAM_API_KEY,
          steamid: steamId,
          steamidkey: authToken,
          knowncode: knownCode
        };
        
        const response = await axios.get(apiUrl, { 
          params,
          timeout: 15000 
        });
        
        if (response.data && response.data.result) {
          const result = response.data.result;
          
          if (result.nextcode && result.nextcode !== 'n/a') {
            // Normalize the share code from Steam API (may be missing dashes)
            const normalizedCode = normalizeShareCode(result.nextcode);
            console.log(`✅ Match ${depth + 1}: ${normalizedCode}`);
            matchCodes.push(normalizedCode);
            
            // Небольшая задержка между запросами чтобы не получить rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Рекурсивно получаем следующие коды (используем нормализованный код)
            const nextCodes = await this.fetchRecentMatchCodes(
              steamId, 
              authToken, 
              normalizedCode, 
              depth + 1, 
              maxDepth
            );
            matchCodes.push(...nextCodes);
          } else {
            console.log(`✅ Loaded all available matches (${depth} total)`);
          }
        }
      } catch (apiError) {
        const status = apiError.response?.status;
        const errorData = apiError.response?.data;
        
        if (status === 412) {
          if (depth === 0) {
            console.log(`❌ HTTP 412: Authentication token is EXPIRED or INVALID`);
            console.log(`   → Получите новый токен: https://help.steampowered.com/wizard/HelpWithGameIssue/?appid=730&issueid=128`);
            console.log(`   → Сыграйте хотя бы 1 матч после получения токена`);
            console.log(`   → Response: ${JSON.stringify(errorData)}`);
          } else {
            console.log(`ℹ️ No more matches available (${depth} matches loaded)`);
          }
        } else if (status === 403 || status === 401) {
          console.log('⚠️ Authentication failed - token may be invalid or expired');
          console.log(`   Status: ${status}, Response: ${JSON.stringify(errorData)}`);
        } else if (status === 429) {
          console.log('⚠️ Rate limit reached, stopping sync');
        } else if (status === 500 || status === 502 || status === 503) {
          console.log(`⚠️ Steam API server error (${status}), retry needed`);
        } else {
          console.error(`Steam API error (${status}):`, apiError.message);
          if (apiError.response) {
            console.error(`Response: ${JSON.stringify(apiError.response.data)}`);
          }
        }
      }
      
      return matchCodes;
      
    } catch (error) {
      console.error('Error fetching match codes:', error);
      return [];
    }
  }

  /**
   * Fetch match details from share code
   * Note: Demo files are only available for ~7 days after match
   * Old matches will only have basic info (share code)
   * For detailed stats, use Game State Integration (GSI) for live matches
   */
  async fetchMatchDetails(shareCode, authToken, steamId, matchId) {
    try {
      // Check match age - only download demos for recent matches
      const match = await CS2Match.findByPk(matchId);
      if (!match) {
        console.log(`⚠️ Match ${matchId} not found`);
        return null;
      }
      
      const matchAge = Date.now() - new Date(match.createdAt).getTime();
      const daysOld = matchAge / (1000 * 60 * 60 * 24);
      
      if (daysOld > 7) {
        console.log(`⏭️ Match ${matchId} is ${daysOld.toFixed(1)} days old, skipping demo`);
        return null;
      }
      
      console.log(`📥 Queuing demo for match ${matchId} (${daysOld.toFixed(1)} days)...`);
      
      const cs2DemoDownloadService = require('./cs2DemoDownloadService');
      await cs2DemoDownloadService.queueDownload(matchId, shareCode, authToken);
      
      console.log(`✅ Match ${matchId} queued`);
      return true;
      
    } catch (error) {
      console.error('Error processing match details:', error);
      return null;
    }
  }

  /**
   * Download demo file for a match
   * This requires the decoded match info and authentication
   */
  async downloadDemoFile(shareCode, authToken) {
    try {
      const decoded = decodeShareCode(shareCode);
      
      // Demo files are hosted on Valve's replay servers
      // URL format: https://replay{cluster}.valve.net/730/{matchid}_{outcomeid}_{tokenid}.dem.bz2
      // The cluster number (0-255) needs to be determined
      
      // Try multiple clusters (most common are 0-50)
      for (let cluster = 0; cluster < 50; cluster++) {
        const demoUrl = `https://replay${cluster}.valve.net/730/${decoded.matchId}_${decoded.outcomeId}_${decoded.tokenId}.dem.bz2`;
        
        try {
          console.log(`📥 Trying cluster ${cluster}...`);
          
          const response = await axios.get(demoUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });
          
          if (response.status === 200) {
            console.log(`✅ Demo file found on cluster ${cluster}`);
            return {
              success: true,
              data: response.data,
              cluster,
              url: demoUrl
            };
          }
        } catch (clusterError) {
          // Continue to next cluster
          continue;
        }
      }
      
      console.log('❌ Demo file not found on any cluster');
      return {
        success: false,
        error: 'Demo file not available'
      };
      
    } catch (error) {
      console.error('Error downloading demo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse demo file and extract statistics
   * This would use a library like demofile or demofile2
   */
  async parseDemoFile(demoData) {
    try {
      // TODO: Implement demo file parsing using demofile library
      // This would extract:
      // - Player stats (kills, deaths, assists, headshots)
      // - Round outcomes
      // - Weapon usage
      // - Positioning data
      // - Economy stats
      
      console.log('⚠️ Demo file parsing not yet implemented');
      
      return null;
      
    } catch (error) {
      console.error('Error parsing demo:', error);
      return null;
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId) {
    try {
      const user = await User.findByPk(userId);
      
      const totalMatches = await CS2Match.count({ where: { userId } });
      const autoSyncMatches = await CS2Match.count({
        where: { userId, source: 'auto_sync' }
      });
      const shareCodeMatches = await CS2Match.count({
        where: { userId, source: 'share_code' }
      });
      const gsiMatches = await CS2Match.count({
        where: { userId, source: 'steam_api' }
      });

      // Get last synced match
      const lastMatch = await CS2Match.findOne({
        where: { userId, source: 'auto_sync' },
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        hasAuthToken: !!user?.cs2AuthToken,
        tokenLinkedAt: user?.cs2TokenLinkedAt,
        stats: {
          total: totalMatches,
          fromAutoSync: autoSyncMatches,
          fromShareCode: shareCodeMatches,
          fromGSI: gsiMatches,
          lastSync: lastMatch?.createdAt || null
        }
      };

    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger sync for a user
   */
  async triggerManualSync(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.cs2AuthToken) {
        throw new Error('CS2 authentication token not linked');
      }
      
      return await this.syncMatchesForUser(userId, user.steamId, user.cs2AuthToken);
      
    } catch (error) {
      console.error('Manual sync error:', error);
      throw error;
    }
  }
}

module.exports = new CS2MatchSyncService();

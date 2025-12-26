const fs = require('fs').promises;
const { CS2Demo, CS2Match } = require('../models');

/**
 * CS2 Demo Parser Service
 * Parses CS2 demo files and extracts detailed statistics
 * 
 * Note: This requires the 'demofile' or 'demofile2' npm package
 * Install with: npm install demofile2
 */
class CS2DemoParserService {
  constructor() {
    this.parsingQueue = [];
    this.activeParsing = 0;
    this.maxConcurrentParsing = 2;
  }

  /**
   * Queue demo for parsing
   * Will wait for demo to be downloaded if not yet ready
   */
  async queueParsing(demoId, maxWaitTime = 600000) { // 10 minutes default
    try {
      const demo = await CS2Demo.findByPk(demoId);
      
      if (!demo) {
        throw new Error('Demo not found');
      }

      if (demo.status === 'parsed') {
        console.log('Demo already parsed');
        return demo.parsedData;
      }

      // If demo is not yet downloaded, wait for it
      if (demo.status !== 'downloaded') {
        console.log(`⏳ Demo ${demoId} not ready yet. Status: ${demo.status}. Waiting for download to complete...`);
        
        // Wait for demo to be downloaded (check every 2 seconds, max 10 minutes)
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitTime) {
          const updatedDemo = await CS2Demo.findByPk(demoId);
          
          if (updatedDemo.status === 'downloaded') {
            console.log(`✅ Demo ${demoId} is ready for parsing`);
            break;
          }
          
          if (updatedDemo.status === 'failed') {
            throw new Error(`Demo download failed: ${updatedDemo.parseError}`);
          }
          
          // Wait 2 seconds before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      this.parsingQueue.push(demoId);
      this.processQueue();

      return { queued: true };

    } catch (error) {
      console.error('Error queueing parsing:', error);
      throw error;
    }
  }

  /**
   * Process parsing queue
   */
  async processQueue() {
    if (this.activeParsing >= this.maxConcurrentParsing || this.parsingQueue.length === 0) {
      return;
    }

    const demoId = this.parsingQueue.shift();
    this.activeParsing++;

    try {
      await this.parseDemo(demoId);
    } catch (error) {
      console.error(`Failed to parse demo ${demoId}:`, error);
    } finally {
      this.activeParsing--;
      this.processQueue();
    }
  }

  /**
   * Parse demo file and extract statistics
   */
  async parseDemo(demoId) {
    try {
      console.log(`📊 Parsing demo ${demoId}...`);

      const demo = await CS2Demo.findByPk(demoId, {
        include: ['match']
      });

      if (!demo || !demo.filePath) {
        throw new Error('Demo file not found');
      }

      demo.status = 'parsing';
      await demo.save();

      // Read demo file
      const demoBuffer = await fs.readFile(demo.filePath);

      // Parse demo using demofile library
      const demofile = require('demofile');
      const demoFile = new demofile.DemoFile();

      const parsedData = {
        matchInfo: {
          mapName: null,
          duration: 0,
          tickRate: 64,
          serverType: 'matchmaking'
        },
        teams: {
          ct: {
            score: 0,
            players: []
          },
          t: {
            score: 0,
            players: []
          }
        },
        rounds: [],
        players: {},
        roundKills: {}, // Track kills per round per player for multikill detection
        weapons: {},
        grenades: [],
        clutches: [],
        highlights: []
      };

      let currentRound = null;
      let roundNumber = 0;

      // Parse the demo file
      await new Promise((resolve, reject) => {
        // Match header
        demoFile.on('start', () => {
          parsedData.matchInfo.mapName = demoFile.header.mapName || 'unknown';
          parsedData.matchInfo.tickRate = Math.round(demoFile.header.playbackTicks / demoFile.header.playbackTime);
          parsedData.matchInfo.duration = Math.floor(demoFile.header.playbackTime);
          console.log(`📍 Parsing map: ${parsedData.matchInfo.mapName}, duration: ${parsedData.matchInfo.duration}s, tickrate: ${parsedData.matchInfo.tickRate}`);
        });

        // Round start
        demoFile.gameEvents.on('round_start', () => {
          roundNumber++;
          currentRound = {
            roundNumber: roundNumber,
            startTick: demoFile.currentTick,
            endTick: null,
            winner: null,
            winnerTeam: null,
            reason: null,
            kills: [],
            damage: [],
            grenades: []
          };
          
          // Reset round kill tracking
          parsedData.roundKills = {};
        });

        // Round officially ended
        demoFile.gameEvents.on('round_officially_ended', (e) => {
          if (currentRound) {
            currentRound.endTick = demoFile.currentTick;
            
            // Get team scores from game rules
            const ctScore = demoFile.teams[demofile.TEAM_CTS]?.score || 0;
            const tScore = demoFile.teams[demofile.TEAM_TERRORISTS]?.score || 0;
            
            parsedData.teams.ct.score = ctScore;
            parsedData.teams.t.score = tScore;
            
            // Determine winner based on scores
            if (ctScore > parsedData.rounds.length - roundNumber + ctScore) {
              currentRound.winnerTeam = 'CT';
              currentRound.winner = 3;
            } else {
              currentRound.winnerTeam = 'T';
              currentRound.winner = 2;
            }
            
            parsedData.rounds.push(currentRound);
            
            // Detect multikills (3k, 4k, 5k)
            for (const [steamId, kills] of Object.entries(parsedData.roundKills)) {
              if (kills >= 3 && parsedData.players[steamId]) {
                if (kills === 3) parsedData.players[steamId].multikills['3k']++;
                if (kills === 4) parsedData.players[steamId].multikills['4k']++;
                if (kills >= 5) parsedData.players[steamId].multikills['5k']++;
              }
            }
          }
        });

        // Player death (for K/D/A tracking)
        demoFile.gameEvents.on('player_death', (e) => {
          const victim = demoFile.entities.getByUserId(e.userid);
          const attacker = demoFile.entities.getByUserId(e.attacker);
          const assister = e.assister ? demoFile.entities.getByUserId(e.assister) : null;

          if (!victim) return;

          const victimSteamId = victim.steamId;
          const attackerSteamId = attacker ? attacker.steamId : null;
          const assisterSteamId = assister ? assister.steamId : null;

          // Initialize victim stats if not exists
          if (!parsedData.players[victimSteamId]) {
            parsedData.players[victimSteamId] = {
              name: victim.name,
              steamId: victimSteamId,
              team: victim.teamNumber === demofile.TEAM_TERRORISTS ? 'T' : 'CT',
              kills: 0,
              deaths: 0,
              assists: 0,
              headshots: 0,
              damage: 0,
              mvps: 0,
              multikills: { '3k': 0, '4k': 0, '5k': 0 }
            };
          }

          parsedData.players[victimSteamId].deaths++;

          // Track attacker stats
          if (attacker && attackerSteamId && attackerSteamId !== victimSteamId) {
            // Initialize attacker stats if not exists
            if (!parsedData.players[attackerSteamId]) {
              parsedData.players[attackerSteamId] = {
                name: attacker.name,
                steamId: attackerSteamId,
                team: attacker.teamNumber === demofile.TEAM_TERRORISTS ? 'T' : 'CT',
                kills: 0,
                deaths: 0,
                assists: 0,
                headshots: 0,
                damage: 0,
                mvps: 0,
                multikills: { '3k': 0, '4k': 0, '5k': 0 }
              };
            }

            parsedData.players[attackerSteamId].kills++;
            
            if (e.headshot) {
              parsedData.players[attackerSteamId].headshots++;
            }
            
            // Track kills per round for multikill detection
            if (!parsedData.roundKills[attackerSteamId]) {
              parsedData.roundKills[attackerSteamId] = 0;
            }
            parsedData.roundKills[attackerSteamId]++;
          }

          // Track assister
          if (assister && assisterSteamId) {
            if (!parsedData.players[assisterSteamId]) {
              parsedData.players[assisterSteamId] = {
                name: assister.name,
                steamId: assisterSteamId,
                team: assister.teamNumber === demofile.TEAM_TERRORISTS ? 'T' : 'CT',
                kills: 0,
                deaths: 0,
                assists: 0,
                headshots: 0,
                damage: 0,
                mvps: 0,
                multikills: { '3k': 0, '4k': 0, '5k': 0 }
              };
            }
            
            parsedData.players[assisterSteamId].assists++;
          }

          // Track kills in current round
          if (currentRound) {
            currentRound.kills.push({
              tick: demoFile.currentTick,
              attacker: attackerSteamId,
              attackerName: attacker?.name,
              victim: victimSteamId,
              victimName: victim.name,
              assister: assisterSteamId,
              assisterName: assister?.name,
              weapon: e.weapon || 'unknown',
              headshot: e.headshot
            });
          }
        });

        // Player hurt (for damage tracking)
        demoFile.gameEvents.on('player_hurt', (e) => {
          const attacker = demoFile.entities.getByUserId(e.attacker);
          const victim = demoFile.entities.getByUserId(e.userid);

          if (!attacker || !victim || attacker.steamId === victim.steamId) return;

          const attackerSteamId = attacker.steamId;

          if (!parsedData.players[attackerSteamId]) {
            parsedData.players[attackerSteamId] = {
              name: attacker.name,
              steamId: attackerSteamId,
              team: attacker.teamNumber === demofile.TEAM_TERRORISTS ? 'T' : 'CT',
              kills: 0,
              deaths: 0,
              assists: 0,
              headshots: 0,
              damage: 0,
              mvps: 0,
              multikills: { '3k': 0, '4k': 0, '5k': 0 }
            };
          }

          parsedData.players[attackerSteamId].damage += (e.dmg_health || 0);
        });

        // Round MVP
        demoFile.gameEvents.on('round_mvp', (e) => {
          const player = demoFile.entities.getByUserId(e.userid);
          
          if (player && player.steamId && parsedData.players[player.steamId]) {
            parsedData.players[player.steamId].mvps++;
          }
        });

        // Match end
        demoFile.on('end', () => {
          console.log(`✅ Demo parsed: ${parsedData.rounds.length} rounds, ${Object.keys(parsedData.players).length} players`);
          resolve();
        });

        demoFile.on('error', (err) => {
          console.error('❌ Demo parse error:', err);
          reject(err);
        });

        // Start parsing
        demoFile.parseStream(require('stream').Readable.from(demoBuffer));
      });

      // Update demo record
      demo.parsedData = parsedData;
      demo.mapName = parsedData.matchInfo.mapName;
      demo.duration = parsedData.matchInfo.duration;
      demo.tickRate = parsedData.matchInfo.tickRate;
      demo.serverType = parsedData.matchInfo.serverType;
      demo.status = 'parsed';
      demo.parsedAt = new Date();
      await demo.save();

      // Update match with detailed statistics
      if (demo.match) {
        await this.updateMatchStatistics(demo.match.id, parsedData);
      }

      console.log(`✅ Demo parsed successfully: ${demoId}`);

      return parsedData;

    } catch (error) {
      console.error('Parse error:', error);
      
      const demo = await CS2Demo.findByPk(demoId);
      if (demo) {
        demo.status = 'failed';
        demo.parseError = error.message;
        await demo.save();
      }
      
      throw error;
    }
  }

  /**
   * Update match statistics from parsed demo data
   */
  async updateMatchStatistics(matchId, parsedData) {
    try {
      const match = await CS2Match.findByPk(matchId, {
        include: ['user']
      });

      if (!match || !match.user) {
        throw new Error('Match or user not found');
      }

      // Find player's stats in parsed data
      // This would search for player by Steam ID
      const playerSteamId = match.user.steamId;
      const playerStats = parsedData.players[playerSteamId];

      if (!playerStats) {
        console.warn('Player stats not found in demo');
        return;
      }

      // Update match record with detailed stats
      match.kills = playerStats.kills || 0;
      match.deaths = playerStats.deaths || 0;
      match.assists = playerStats.assists || 0;
      match.headshots = playerStats.headshots || 0;
      match.damage = playerStats.damage || 0;
      match.mvps = playerStats.mvps || 0;
      match.roundsPlayed = parsedData.rounds?.length || 0;
      match.map = parsedData.matchInfo?.mapName || 'unknown';
      
      // Calculate derived stats
      if (match.kills > 0) {
        match.headshotPercentage = ((match.headshots / match.kills) * 100).toFixed(2);
      }
      
      if (match.roundsPlayed > 0) {
        match.adr = (match.damage / match.roundsPlayed).toFixed(2);
      }

      // Determine if won
      const playerTeam = playerStats.team; // 'CT' or 'T'
      const teamScore = parsedData.teams[playerTeam.toLowerCase()]?.score || 0;
      const opponentTeam = playerTeam === 'CT' ? 't' : 'ct';
      const opponentScore = parsedData.teams[opponentTeam]?.score || 0;
      match.isWin = teamScore > opponentScore;
      match.roundsWon = teamScore;

      // Update clutches and multikills
      if (parsedData.clutches) {
        match.clutch1v1 = parsedData.clutches.filter(c => c.type === '1v1' && c.winner === playerSteamId).length;
        match.clutch1v2 = parsedData.clutches.filter(c => c.type === '1v2' && c.winner === playerSteamId).length;
        match.clutch1v3 = parsedData.clutches.filter(c => c.type === '1v3' && c.winner === playerSteamId).length;
        match.clutch1v4 = parsedData.clutches.filter(c => c.type === '1v4' && c.winner === playerSteamId).length;
        match.clutch1v5 = parsedData.clutches.filter(c => c.type === '1v5' && c.winner === playerSteamId).length;
      }

      if (playerStats.multikills) {
        match.kills3k = playerStats.multikills['3k'] || 0;
        match.kills4k = playerStats.multikills['4k'] || 0;
        match.kills5k = playerStats.multikills['5k'] || 0;
      }

      match.source = 'demo_parser';
      match.status = 'completed'; // Mark as completed for stats processing
      await match.save();

      console.log(`✅ Match ${matchId} updated with parsed statistics`);

      // Update CS2 Advanced Statistics (HLTV Rating, Weapon Stats, etc.)
      try {
        const cs2StatsService = require('./cs2StatsService');
        await cs2StatsService.updatePlayerPerformance(match.userId, matchId);
        console.log(`📊 CS2 Advanced Stats updated for match ${matchId}`);
      } catch (statsError) {
        console.error(`⚠️ Failed to update CS2 stats for match ${matchId}:`, statsError.message);
        // Don't throw - match data is saved, stats can be backfilled later
      }

    } catch (error) {
      console.error('Error updating match statistics:', error);
      throw error;
    }
  }

  /**
   * Get parsing status
   */
  async getParsingStatus(demoId) {
    try {
      const demo = await CS2Demo.findByPk(demoId);
      
      if (!demo) {
        return {
          status: 'not_found'
        };
      }

      return {
        status: demo.status,
        parsedAt: demo.parsedAt,
        error: demo.parseError,
        queuePosition: this.parsingQueue.indexOf(demoId) + 1
      };

    } catch (error) {
      console.error('Error getting parsing status:', error);
      throw error;
    }
  }
}

module.exports = new CS2DemoParserService();

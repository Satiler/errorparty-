const axios = require('axios');
const { User, CS2Match } = require('../models');
const { analyzeRecentMatches, assignQuests } = require('../services/questService');
const { decodeShareCode, isValidShareCode, normalizeShareCode } = require('../utils/shareCodeDecoder');
const { getSteamBot } = require('../services/steamBotService');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const CS2_APP_ID = 730;

/**
 * Get CS2 player stats
 */
const getPlayerStats = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=${CS2_APP_ID}&key=${STEAM_API_KEY}&steamid=${steamId}`;
    const response = await axios.get(url);
    
    if (!response.data.playerstats) {
      return res.status(404).json({ success: false, error: 'Player stats not found' });
    }

    const stats = response.data.playerstats.stats;
    
    // Parse important stats
    const parsedStats = {
      totalKills: stats.find(s => s.name === 'total_kills')?.value || 0,
      totalDeaths: stats.find(s => s.name === 'total_deaths')?.value || 0,
      totalTimePlayed: stats.find(s => s.name === 'total_time_played')?.value || 0,
      totalWins: stats.find(s => s.name === 'total_wins')?.value || 0,
      totalRoundsPlayed: stats.find(s => s.name === 'total_rounds_played')?.value || 0,
      totalMVPs: stats.find(s => s.name === 'total_mvps')?.value || 0,
      totalDamage: stats.find(s => s.name === 'total_damage_done')?.value || 0,
      totalMoneyEarned: stats.find(s => s.name === 'total_money_earned')?.value || 0,
      totalHeadshots: stats.find(s => s.name === 'total_kills_headshot')?.value || 0,
      totalPlantedBombs: stats.find(s => s.name === 'total_planted_bombs')?.value || 0,
      totalDefusedBombs: stats.find(s => s.name === 'total_defused_bombs')?.value || 0,
      totalMatchesWon: stats.find(s => s.name === 'total_matches_won')?.value || 0,
      totalMatchesPlayed: stats.find(s => s.name === 'total_matches_played')?.value || 0,
    };

    // Calculate derived stats
    parsedStats.kd = parsedStats.totalDeaths > 0 
      ? (parsedStats.totalKills / parsedStats.totalDeaths).toFixed(2)
      : parsedStats.totalKills.toFixed(2);
    
    parsedStats.headshotPercentage = parsedStats.totalKills > 0
      ? ((parsedStats.totalHeadshots / parsedStats.totalKills) * 100).toFixed(2)
      : 0;
    
    parsedStats.winrate = parsedStats.totalMatchesPlayed > 0
      ? ((parsedStats.totalMatchesWon / parsedStats.totalMatchesPlayed) * 100).toFixed(2)
      : 0;

    parsedStats.hoursPlayed = (parsedStats.totalTimePlayed / 3600).toFixed(1);

    // Автоматический анализ матчей для квестов (если пользователь авторизован)
    if (req.user) {
      try {
        console.log(`🎮 Автоматическая проверка квестов CS2 для пользователя ${req.user.id}`);
        
        // Назначаем ежедневные квесты если их нет
        const assigned = await assignQuests(req.user.id, 'cs2', 'daily');
        if (assigned.length > 0) {
          console.log(`✅ Назначено ${assigned.length} новых квестов CS2`);
        }
        
        // Анализируем последние матчи в фоновом режиме
        analyzeRecentMatches(req.user.id, steamId, 'cs2').catch(err => {
          console.error('❌ Ошибка фонового анализа квестов:', err.message);
        });
      } catch (questErr) {
        console.error('❌ Ошибка системы квестов:', questErr.message);
        // Не прерываем основной запрос
      }
    }

    res.json({
      success: true,
      stats: parsedStats,
      rawStats: stats
    });
  } catch (error) {
    console.error('CS2 stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CS2 stats' });
  }
};

/**
 * Get CS2 achievements
 */
const getAchievements = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${CS2_APP_ID}&key=${STEAM_API_KEY}&steamid=${steamId}`;
    const response = await axios.get(url);
    
    if (!response.data.playerstats) {
      return res.status(404).json({ success: false, error: 'Achievements not found' });
    }

    const achievements = response.data.playerstats.achievements || [];
    const unlocked = achievements.filter(a => a.achieved === 1).length;

    res.json({
      success: true,
      total: achievements.length,
      unlocked,
      percentage: ((unlocked / achievements.length) * 100).toFixed(2),
      achievements: achievements.sort((a, b) => b.achieved - a.achieved)
    });
  } catch (error) {
    console.error('CS2 achievements error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
};

/**
 * Get CS2 match history from database
 */
const getMatchHistory = async (req, res) => {
  try {
    const { steamId } = req.params;
    
    // Найти пользователя по Steam ID
    const user = await User.findOne({ where: { steamId } });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Получить историю матчей с информацией о демо
    const { Sequelize } = require('sequelize');
    const matches = await CS2Match.findAll({
      where: { userId: user.id },
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT status FROM cs2_demos 
              WHERE cs2_demos.match_id = "CS2Match".id 
              LIMIT 1
            )`),
            'demoStatus'
          ],
          [
            Sequelize.literal(`(
              SELECT parse_error FROM cs2_demos 
              WHERE cs2_demos.match_id = "CS2Match".id 
              LIMIT 1
            )`),
            'demoError'
          ]
        ]
      },
      order: [['playedAt', 'DESC']],
      limit: 50
    });
    
    // Ensure source field is included in response
    const matchesWithSource = matches.map(match => {
      const matchData = match.toJSON();
      // Make sure source is present (gsi, steam_api, demo_parser, share_code, auto_sync)
      matchData.source = matchData.source || 'unknown';
      return matchData;
    });
    
    res.json({
      success: true,
      matches: matchesWithSource
    });
  } catch (error) {
    console.error('CS2 match history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch match history' });
  }
};

/**
 * Link CS2 Authentication Token
 */
const linkAuthToken = async (req, res) => {
  try {
    const { authToken } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authentication token is required' 
      });
    }

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Validate token format
    const trimmedToken = authToken.trim();
    
    // Authentication Token НЕ начинается с "CSGO-" (это Share Code, а не токен!)
    if (trimmedToken.toUpperCase().startsWith('CSGO-')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Это Share Code матча, а не Authentication Token!',
        hint: 'Authentication Token выглядит как "9BK4-5Z9HP-A9KL" (без CSGO-)'
      });
    }
    
    // Authentication Token обычно формата XXXX-XXXXX-XXXX
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{5}-[A-Z0-9]{4}$/i.test(trimmedToken)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверный формат Authentication Token',
        hint: 'Токен должен иметь формат XXXX-XXXXX-XXXX (например: 9BK4-5Z9HP-A9KL)'
      });
    }

    // Update user with auth token
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Save the token (Steam API validation requires a known share code, can't validate with empty knowncode)
    user.cs2AuthToken = trimmedToken;
    user.cs2TokenLinkedAt = new Date();
    await user.save();

    // Автоматически запустить загрузку истории матчей (начиная с последнего известного)
    console.log(`🎮 Starting automatic match history sync for user ${user.id}...`);
    const cs2MatchSyncService = require('../services/cs2MatchSyncService');
    
    // Запускаем синхронизацию в фоне (без параметра = берёт последний Share Code из БД)
    cs2MatchSyncService.syncMatchesForUser(
      user.id,
      user.steamId,
      trimmedToken
    ).then(result => {
      if (result.success) {
        console.log(`✅ Initial match history sync completed: ${result.stats?.newMatches || 0} new matches loaded`);
      } else {
        console.log(`ℹ️ Sync result: ${result.message}`);
      }
    }).catch(err => {
      console.error('❌ Initial match history sync failed:', err.message);
    });

    res.json({
      success: true,
      message: 'CS2 Authentication Token linked successfully. Auto-sync activated.',
      linkedAt: user.cs2TokenLinkedAt,
      syncStarted: true,
      info: 'New matches will be automatically loaded. Make sure you have at least one match added.'
    });
  } catch (error) {
    console.error('Link CS2 auth token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to link authentication token',
      details: error.message 
    });
  }
};

/**
 * Remove CS2 Authentication Token
 */
const unlinkAuthToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    user.cs2AuthToken = null;
    user.cs2TokenLinkedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'CS2 Authentication Token unlinked successfully'
    });
  } catch (error) {
    console.error('Unlink CS2 auth token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unlink authentication token' 
    });
  }
};

/**
 * Link CS2 Match Token (Share Code of last competitive match)
 * This token is used as anchor for loading entire match history
 */
const linkMatchToken = async (req, res) => {
  try {
    console.log('='.repeat(60));
    console.log('📥 linkMatchToken called');
    console.log('Request body:', req.body);
    console.log('User:', req.user?.id);
    
    const { matchToken } = req.body;
    console.log('🎫 Match Token received:', matchToken);
    
    if (!matchToken) {
      console.error('❌ ERROR: No matchToken in request body');
      return res.status(400).json({ 
        success: false, 
        error: 'Match Token is required' 
      });
    }

    if (!req.user) {
      console.error('❌ ERROR: No authentication');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Normalize and validate share code format
    let normalizedToken = normalizeShareCode(matchToken);
    console.log('✓ Normalized token:', normalizedToken);
    
    if (!isValidShareCode(normalizedToken)) {
      console.error('❌ ERROR: Invalid share code format');
      console.error('  Original:', matchToken);
      console.error('  Normalized:', normalizedToken);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Match Token format. Expected: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx' 
      });
    }

    // Decode to verify it's valid
    console.log('🔓 Decoding share code...');
    const decoded = decodeShareCode(normalizedToken);
    console.log('✓ Decoded:', decoded);
    
    if (!decoded || !decoded.matchId) {
      console.error('❌ ERROR: Could not decode match token');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Match Token - unable to decode' 
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.error('❌ ERROR: User not found in DB');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log('✓ User found:', user.id, user.username);
    console.log('✓ User cs2AuthToken:', user.cs2AuthToken ? '✓ EXISTS' : '❌ MISSING');

    if (!user.cs2AuthToken) {
      console.error('❌ ERROR: cs2AuthToken not set on user');
      return res.status(400).json({ 
        success: false, 
        error: 'CS2 Authentication Token must be linked first. Please link it before adding Match Token.' 
      });
    }

    // Check if match with this token already exists
    const existingMatch = await CS2Match.findOne({
      where: {
        userId: req.user.id,
        shareCode: normalizedToken
      }
    });

    // Save the Match Token (anchor point for sync)
    user.cs2MatchToken = normalizedToken;
    user.cs2MatchTokenLinkedAt = new Date();
    await user.save();

    console.log(`🔗 Match Token linked for user ${user.id}: ${normalizedToken.substring(0, 20)}...`);

    // If match doesn't exist, create it (or it will be created during sync)
    let match = existingMatch;
    if (!match) {
      match = await CS2Match.create({
        userId: req.user.id,
        shareCode: normalizedToken,
        matchId: decoded.matchId,
        outcomeId: decoded.outcomeId,
        tokenId: decoded.tokenId,
        source: 'match_token',
        playedAt: new Date()
      });
      console.log(`✅ Match Token record created: ID ${match.id}`);
    }

    // Start automatic full match history sync in background
    console.log(`🔄 Starting full match history sync using token as anchor...`);
    const cs2MatchSyncService = require('../services/cs2MatchSyncService');
    
    // Sync all matches using the token as anchor point
    cs2MatchSyncService.syncMatchesForUser(
      user.id,
      user.steamId,
      user.cs2AuthToken,
      normalizedToken  // Use as starting point
    ).then(result => {
      console.log(`✅ Match history sync completed:`, result.stats);
    }).catch(err => {
      console.error('❌ Match history sync error:', err.message);
      console.error('Stack:', err.stack);
    });

    res.json({
      success: true,
      message: 'Match Token linked successfully. Syncing all matches...',
      linkedAt: user.cs2MatchTokenLinkedAt,
      syncStarted: true,
      matchTokenAnchor: normalizedToken.substring(0, 30) + '...',
      info: 'Full match history will be loaded automatically. This may take several minutes.'
    });

  } catch (error) {
    console.error('❌ Link Match Token error:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to link Match Token',
      details: error.message 
    });
  }
  console.log('='.repeat(60));
};

/**
 * Add match by Share Code and auto-load subsequent matches
 */
const addMatchByShareCode = async (req, res) => {
  try {
    console.log('📥 Add match request received:', { body: req.body, user: req.user?.id });
    
    let { shareCode } = req.body;
    
    if (!shareCode) {
      console.log('❌ Share code missing in request body');
      return res.status(400).json({ 
        success: false, 
        error: 'Share code is required' 
      });
    }

    // Normalize share code (add dashes if missing)
    shareCode = normalizeShareCode(shareCode);
    console.log('🔧 Normalized share code:', shareCode);

    // Validate share code format
    if (!isValidShareCode(shareCode)) {
      console.log('❌ Invalid share code format:', shareCode);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid share code format. Expected: CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx' 
      });
    }
    
    console.log('✅ Share code validated successfully');

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Decode share code
    const decoded = decodeShareCode(shareCode);

    // Check if this share code already exists for this user
    const existingMatch = await CS2Match.findOne({
      where: {
        userId: req.user.id,
        shareCode: shareCode
      }
    });

    if (existingMatch) {
      return res.status(409).json({ 
        success: false, 
        error: 'This match has already been added' 
      });
    }

    // Create match record with basic info
    const match = await CS2Match.create({
      userId: req.user.id,
      shareCode: shareCode,
      matchId: decoded.matchId,
      outcomeId: decoded.outcomeId,
      tokenId: decoded.tokenId,
      source: 'share_code',
      kills: 0,
      deaths: 0,
      assists: 0,
      playedAt: new Date()
    });

    // Запускаем загрузку демо для этого матча
    console.log(`📥 Starting demo download for match ${match.id}...`);
    const cs2DemoDownloadService = require('../services/cs2DemoDownloadService');
    const cs2DemoParserService = require('../services/cs2DemoParserService');
    
    // Запускаем в фоне
    cs2DemoDownloadService.queueDownload(match.id, shareCode).then(demo => {
      if (demo && demo.id) {
        console.log(`✅ Demo queued for download: ${demo.id}`);
        // После загрузки запустить парсинг
        return cs2DemoParserService.queueParsing(demo.id);
      }
    }).catch(err => {
      console.error(`❌ Demo processing failed for match ${match.id}:`, err.message);
    });

    // Если есть токен, запускаем автоматическую загрузку последующих матчей
    if (user.cs2AuthToken) {
      console.log(`🔄 Starting auto-sync for subsequent matches after ${shareCode}...`);
      const cs2MatchSyncService = require('../services/cs2MatchSyncService');
      
      // Асинхронно загружаем остальные матчи
      cs2MatchSyncService.syncMatchesForUser(
        user.id, 
        user.steamId, 
        user.cs2AuthToken,
        shareCode // Используем текущий код как стартовую точку
      ).then(result => {
        console.log(`✅ Auto-sync completed: ${result.stats?.newMatches || 0} new matches`);
      }).catch(err => {
        console.error('Auto-sync error:', err);
      });
    } else {
      console.log(`ℹ️ No auth token - skipping auto-sync. Match added manually.`);
    }

    // Проверяем, это первый матч или нет
    const totalMatches = await CS2Match.count({ where: { userId: user.id } });
    const isFirstMatch = totalMatches === 1;

    res.json({
      success: true,
      message: isFirstMatch 
        ? '🎉 Первый матч добавлен! Загружаем всю вашу историю матчей... Это займёт 1-2 минуты.'
        : 'Матч добавлен успешно. Загружаем последующие матчи в фоне...',
      match: {
        id: match.id,
        shareCode: match.shareCode,
        matchId: match.matchId,
        playedAt: match.playedAt
      },
      autoSyncStarted: true,
      isFirstMatch
    });
  } catch (error) {
    console.error('Add match by share code error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add match',
      details: error.message 
    });
  }
};

/**
 * Trigger manual match sync
 */
const triggerSync = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const cs2AutoSyncCron = require('../services/cs2AutoSyncCron');
    const result = await cs2AutoSyncCron.triggerManualSync(req.user.id);

    res.json({
      success: true,
      message: 'Sync completed',
      ...result
    });

  } catch (error) {
    console.error('Trigger sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger sync',
      details: error.message 
    });
  }
};

/**
 * Get sync status
 */
const getSyncStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const cs2MatchSyncService = require('../services/cs2MatchSyncService');
    const status = await cs2MatchSyncService.getSyncStatus(req.user.id);

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sync status' 
    });
  }
};

/**
 * Download and parse demo for a match
 */
const downloadDemo = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { authCode } = req.body;

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Verify match belongs to user
    const match = await CS2Match.findOne({
      where: { id: matchId, userId: req.user.id }
    });

    if (!match) {
      return res.status(404).json({ 
        success: false, 
        error: 'Match not found' 
      });
    }

    // Queue demo download with optional auth code
    const cs2DemoDownloadService = require('../services/cs2DemoDownloadService');
    const demo = await cs2DemoDownloadService.queueDownload(match.id, match.shareCode, authCode);

    res.json({
      success: true,
      message: 'Demo download queued',
      demo: {
        id: demo.id,
        status: demo.status
      }
    });

  } catch (error) {
    console.error('Download demo error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download demo',
      details: error.message 
    });
  }
};

/**
 * Get demo status
 */
const getDemoStatus = async (req, res) => {
  try {
    const { matchId } = req.params;

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const cs2DemoDownloadService = require('../services/cs2DemoDownloadService');
    const status = await cs2DemoDownloadService.getDownloadStatus(matchId);

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Get demo status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get demo status' 
    });
  }
};

/**
 * Get cron service status
 */
const getCronStatus = async (req, res) => {
  try {
    const cs2DemoCronService = require('../services/cs2DemoCronService');
    const status = cs2DemoCronService.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get cron status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status'
    });
  }
};

/**
 * Trigger manual sync
 */
const triggerManualCronSync = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const cs2DemoCronService = require('../services/cs2DemoCronService');
    
    // Start sync in background
    cs2DemoCronService.triggerManualSync().catch(err => {
      console.error('Background sync error:', err);
    });
    
    res.json({
      success: true,
      message: 'Manual sync started in background'
    });
  } catch (error) {
    console.error('Trigger manual sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync'
    });
  }
};

/**
 * Trigger manual demo download
 */
const triggerManualDemoDownload = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const cs2DemoCronService = require('../services/cs2DemoCronService');
    
    // Start download in background
    cs2DemoCronService.triggerManualDownload().catch(err => {
      console.error('Background download error:', err);
    });
    
    res.json({
      success: true,
      message: 'Manual demo download started in background'
    });
  } catch (error) {
    console.error('Trigger manual download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger download'
    });
  }
};

/**
 * Get detailed match information including all players
 */
const getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Find match with demo data
    const match = await CS2Match.findByPk(matchId, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'username', 'steamId', 'avatar']
        }
      ]
    });
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }
    
    // Get demo with parsed data
    const { CS2Demo } = require('../models');
    const demo = await CS2Demo.findOne({
      where: { matchId: match.id }
    });
    
    // Build response with match details and all players
    const matchDetails = {
      id: match.id,
      shareCode: match.shareCode,
      map: match.map || demo?.mapName || 'unknown',
      playedAt: match.playedAt,
      duration: demo?.duration || 0,
      roundsPlayed: match.roundsPlayed || 0,
      isWin: match.isWin,
      roundsWon: match.roundsWon || 0,
      demoStatus: demo?.status || 'pending',
      source: match.source || 'unknown',
      
      // Player's personal stats
      kills: match.kills || 0,
      deaths: match.deaths || 0,
      assists: match.assists || 0,
      headshots: match.headshots || 0,
      headshotPercentage: match.headshotPercentage || 0,
      damage: match.damage || 0,
      adr: match.adr || 0,
      mvps: match.mvps || 0,
      
      playerStats: {
        kills: match.kills || 0,
        deaths: match.deaths || 0,
        assists: match.assists || 0,
        headshots: match.headshots || 0,
        headshotPercentage: match.headshotPercentage || 0,
        damage: match.damage || 0,
        adr: match.adr || 0,
        mvps: match.mvps || 0
      },
      
      // All players from parsed demo (if available)
      teams: null,
      rounds: null,
      players: null
    };
    
    // If demo is parsed, include all players and rounds
    if (demo && demo.status === 'parsed' && demo.parsedData) {
      // Ensure parsedData is object (might be string if from DB)
      const parsedData = typeof demo.parsedData === 'string' 
        ? JSON.parse(demo.parsedData) 
        : demo.parsedData;
      
      matchDetails.teams = parsedData.teams || null;
      matchDetails.rounds = parsedData.rounds || [];
      
      // Convert players object to array and calculate additional stats
      if (parsedData.players) {
        const playersArray = Object.values(parsedData.players).map(player => {
          // Calculate KAST
          let kast = '—';
          if (matchDetails.roundsPlayed > 0) {
            const survivedRounds = matchDetails.roundsPlayed - player.deaths;
            const kastRounds = (player.kills + player.assists + Math.max(0, survivedRounds)) / matchDetails.roundsPlayed;
            kast = Math.min(100, (kastRounds * 100)).toFixed(1);
          }
          
          return {
            ...player,
            kd: player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2),
            hsPercentage: player.kills > 0 ? ((player.headshots / player.kills) * 100).toFixed(1) : 0,
            adr: matchDetails.roundsPlayed > 0 ? (player.damage / matchDetails.roundsPlayed).toFixed(1) : 0,
            kast: kast,
            rating: calculatePlayerRating(player, matchDetails.roundsPlayed)
          };
        });
        
        // Sort by kills descending
        matchDetails.players = playersArray.sort((a, b) => b.kills - a.kills);
      } else if (parsedData.teams?.ct?.players) {
        // Players в teams strukture
        const ctPlayers = parsedData.teams.ct.players || [];
        const tPlayers = parsedData.teams.t.players || [];
        const playersArray = [...ctPlayers, ...tPlayers].map(player => {
          // Calculate KAST: % of rounds with Kill/Assist/Survive/Trade
          // Simplified: (Kills + Assists + Survivors) / Rounds
          // Survivors = Rounds - Deaths - Rounds where killed without interaction
          // Simple approximation: ((Kills + Assists) / Rounds) or based on K/D ratio
          let kast = '—';
          if (matchDetails.roundsPlayed > 0) {
            const survivedRounds = matchDetails.roundsPlayed - player.deaths;
            const kastRounds = (player.kills + player.assists + Math.max(0, survivedRounds)) / matchDetails.roundsPlayed;
            kast = Math.min(100, (kastRounds * 100)).toFixed(1);
          }
          
          return {
            ...player,
            kd: player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2),
            hsPercentage: player.kills > 0 ? ((player.headshots / player.kills) * 100).toFixed(1) : 0,
            adr: matchDetails.roundsPlayed > 0 ? (player.damage / matchDetails.roundsPlayed).toFixed(1) : 0,
            kast: kast,
            rating: calculatePlayerRating(player, matchDetails.roundsPlayed)
          };
        });
        
        matchDetails.players = playersArray.sort((a, b) => b.kills - a.kills);
      }
    } else {
      if (!demo) {
        // Demo not found
      } else {
        // Demo not parsed yet
      }
    }
    
    res.json({
      success: true,
      match: matchDetails
    });
    
  } catch (error) {
    console.error('Get match details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match details',
      details: error.message
    });
  }
};

/**
 * Calculate simplified player rating (similar to HLTV Rating 2.0)
 */
function calculatePlayerRating(player, roundsPlayed) {
  if (roundsPlayed === 0) return 0;
  
  const killRating = player.kills / roundsPlayed;
  const survivalRating = (roundsPlayed - player.deaths) / roundsPlayed;
  const roundsWithKill = Math.min(player.kills, roundsPlayed);
  const impact = roundsWithKill / roundsPlayed;
  
  // Simplified rating formula
  const rating = (0.0073 * player.kills * 100) + 
                 (0.3591 * ((player.kills / player.deaths) || 0)) + 
                 (-0.5329 * roundsPlayed) + 
                 (0.2372 * impact * 100) + 
                 (0.0032 * player.damage) +
                 (0.1587 * survivalRating * 100);
  
  return Math.max(0, rating / 100).toFixed(2);
}

/**
 * Load demo data directly from match code and auth code
 */
const loadDemoFromMatchCode = async (req, res) => {
  try {
    const { matchCode, authCode } = req.body;

    if (!matchCode || !authCode) {
      return res.status(400).json({
        success: false,
        error: 'Match code and auth code are required'
      });
    }

    console.log(`🔍 Loading demo for match code: ${matchCode.substring(0, 10)}...`);

    // Decode the match code to get match details
    const decoded = decodeShareCode(matchCode);
    
    if (!decoded) {
      return res.status(400).json({
        success: false,
        error: 'Invalid match code format'
      });
    }

    console.log(`✅ Decoded match:`, {
      matchId: decoded.matchId,
      outcomeId: decoded.outcomeId,
      tokenId: decoded.tokenId
    });

    // Try to download and parse the demo
    const cs2DemoDownloadService = require('../services/cs2DemoDownloadService');
    const demoFileName = `${decoded.matchId}_${decoded.outcomeId}_${decoded.tokenId}.dem.bz2`;
    
    console.log(`📥 Attempting to download demo: ${demoFileName}`);

    // Create temporary demo record for tracking
    const { CS2Demo } = require('../models');
    
    // For now, create a temporary match record or use ID 999 for test
    // In real implementation, this should be linked to actual match
    let demo = await CS2Demo.findOne({
      where: { 
        shareCode: matchCode
      }
    });
    
    if (!demo) {
      demo = await CS2Demo.create({
        matchId: 999, // Temporary ID for demo-only load
        shareCode: matchCode,
        status: 'pending'
      });
    }

    // Download demo with auth code
    try {
      const headers = { 'X-Auth-Code': authCode };
      
      // Try to download from multiple clusters
      const clustersToTry = Array.from({length: 50}, (_, i) => i);
      
      let demoBuffer = null;
      let foundCluster = null;

      for (const cluster of clustersToTry) {
        const url = `https://replay${cluster}.valve.net/730/${demoFileName}`;
        
        try {
          console.log(`  🔗 Trying cluster ${cluster}...`);
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers,
            validateStatus: (status) => status === 200
          });

          if (response.status === 200 && response.data) {
            console.log(`✅ Successfully downloaded demo from cluster ${cluster}`);
            demoBuffer = response.data;
            foundCluster = cluster;
            break;
          }
        } catch (err) {
          // Continue to next cluster
          continue;
        }
      }

      if (!demoBuffer) {
        return res.status(404).json({
          success: false,
          error: 'Demo file not found on Valve servers. The match may be older than 30 days or still uploading.'
        });
      }

      // Parse the demo file (simplified response)
      console.log(`📊 Demo downloaded: ${Math.round(demoBuffer.length / 1024 / 1024)}MB from cluster ${foundCluster}`);

      // Store in database
      demo.status = 'downloaded';
      demo.filePath = demoFileName;
      demo.fileSize = demoBuffer.length;
      demo.downloadedAt = new Date();
      await demo.save();

      // Return match information
      res.json({
        success: true,
        message: 'Demo downloaded successfully',
        demo: {
          id: demo.id,
          matchCode,
          status: 'downloaded',
          fileSize: demoBuffer.length,
          cluster: foundCluster,
          message: 'Demo file is ready. To parse it, please use POST /api/cs2/demo/parse endpoint.'
        }
      });

    } catch (downloadError) {
      console.error('Demo download failed:', downloadError.message);
      demo.status = 'failed';
      demo.parseError = downloadError.message;
      await demo.save();

      throw downloadError;
    }

  } catch (error) {
    console.error('Load demo error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load demo',
      details: error.message
    });
  }
};

/**
 * Добавить бота в друзья
 */
const addBotFriend = async (req, res) => {
  try {
    if (!req.user || !req.user.steam_id) {
      return res.status(401).json({
        success: false,
        error: 'Steam account not linked'
      });
    }
    
    const steamBot = getSteamBot();
    const botStatus = steamBot.getStatus();
    
    // Проверяем статус бота
    if (!botStatus.configured) {
      return res.status(503).json({
        success: false,
        error: 'Steam Bot not configured'
      });
    }
    
    if (!botStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'Steam Bot not connected'
      });
    }
    
    console.log(`👥 User ${req.user.username} requesting bot friendship...`);
    
    // Отправляем запрос в друзья
    await steamBot.addFriend(req.user.steam_id);
    
    res.json({
      success: true,
      message: 'Friend request sent to your Steam account. Please accept it!',
      botSteamId: botStatus.botSteamId
    });
    
  } catch (error) {
    console.error('Add bot friend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send friend request',
      details: error.message
    });
  }
};

/**
 * Получить список друзей бота
 */
const getBotFriends = async (req, res) => {
  try {
    const steamBot = getSteamBot();
    const friends = steamBot.getFriendsList();
    
    res.json({
      success: true,
      friends,
      count: friends.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Вручную запустить синхронизацию матчей
 */
const syncBotMatches = async (req, res) => {
  try {
    if (!req.user || !req.user.steam_id) {
      return res.status(401).json({
        success: false,
        error: 'Steam account not linked'
      });
    }
    
    const steamBot = getSteamBot();
    
    if (!steamBot.getStatus().gcReady) {
      return res.status(503).json({
        success: false,
        error: 'Bot not ready'
      });
    }
    
    console.log(`🔄 Manual sync requested for ${req.user.username}`);
    
    // Запускаем синхронизацию
    await steamBot.syncUserMatches(req.user.steam_id);
    
    res.json({
      success: true,
      message: 'Match sync started. This may take a few moments...'
    });
    
  } catch (error) {
    console.error('Sync bot matches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync matches',
      details: error.message
    });
  }
};

/**
 * Получить статус Steam бота
 */
const getBotStatus = async (req, res) => {
  try {
    const steamBot = getSteamBot();
    const status = steamBot.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Parse match history HTML sent from frontend
 * Frontend makes request to Steam while user is authenticated, then sends HTML here
 */
const parseMatchHistoryHTML = async (req, res) => {
  try {
    const { html, tab = 'matchhistorypremier' } = req.body;
    
    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user || !user.steamId) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a Steam ID linked'
      });
    }

    const steamMatchHistoryService = require('../services/steamMatchHistoryService');
    const result = steamMatchHistoryService.parseMatchHistoryHTML(html, user.steamId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      matches: result.matches,
      count: result.count,
      tab,
      steamId: user.steamId
    });

  } catch (error) {
    console.error('Error parsing Steam match history HTML:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse match history HTML',
      details: error.message
    });
  }
};

/**
 * Get available match types for Steam Community
 */
const getMatchTypes = async (req, res) => {
  try {
    const steamMatchHistoryService = require('../services/steamMatchHistoryService');
    const types = steamMatchHistoryService.getAvailableMatchTypes();
    
    res.json({
      success: true,
      types
    });
  } catch (error) {
    console.error('Error getting match types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get match types'
    });
  }
};

/**
 * Sync matches from Steam Community (HTML sent from frontend) to database
 */
const syncSteamMatchHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      html,
      tab = 'matchhistorypremier'
    } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user || !user.steamId) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a Steam ID linked'
      });
    }

    const steamMatchHistoryService = require('../services/steamMatchHistoryService');

    console.log(`Syncing Steam match history for user ${userId} (${user.steamId})`);

    // Parse HTML
    const result = steamMatchHistoryService.parseMatchHistoryHTML(html, user.steamId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    const matches = result.matches;
    let saved = 0;
    let skipped = 0;
    let errors = 0;

    // Save matches to database
    for (const match of matches) {
      try {
        // Get user's stats from the match (already included in enriched matches)
        if (!match.userStats) {
          skipped++;
          continue;
        }

        // Check if match already exists
        const existing = await CS2Match.findOne({
          where: {
            userId,
            playedAt: match.date,
            mapName: match.mapName
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        const won = match.result === 'win';

        // Create match record
        await CS2Match.create({
          userId,
          playedAt: match.date,
          mapName: match.mapName,
          isWin: won,
          kills: match.userStats.kills,
          deaths: match.userStats.deaths,
          assists: match.userStats.assists,
          mvps: match.userStats.mvps,
          score: match.userStats.score,
          headshots: match.userStats.headshotPercentage ? 
                    Math.round(match.userStats.kills * match.userStats.headshotPercentage / 100) : 0,
          headshotPercentage: match.userStats.headshotPercentage,
          teamScore: won ? 
                    (match.teamAScore > match.teamBScore ? match.teamAScore : match.teamBScore) : 
                    (match.teamAScore < match.teamBScore ? match.teamAScore : match.teamBScore),
          enemyScore: won ? 
                     (match.teamAScore < match.teamBScore ? match.teamAScore : match.teamBScore) : 
                     (match.teamAScore > match.teamBScore ? match.teamAScore : match.teamBScore),
          roundsPlayed: (match.teamAScore || 0) + (match.teamBScore || 0),
          source: 'steam_page',
          rawData: match
        });

        saved++;

      } catch (error) {
        console.error(`Error saving match: ${error.message}`);
        errors++;
      }
    }

    res.json({
      success: true,
      message: 'Match history synced successfully',
      stats: {
        total: matches.length,
        saved,
        skipped,
        errors
      }
    });

  } catch (error) {
    console.error('Error syncing Steam match history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync match history from Steam',
      details: error.message
    });
  }
};

module.exports = {
  getPlayerStats,
  getAchievements,
  getMatchHistory,
  addMatchByShareCode,
  linkAuthToken,
  unlinkAuthToken,
  linkMatchToken,
  triggerSync,
  getSyncStatus,
  downloadDemo,
  getDemoStatus,
  getCronStatus,
  triggerManualCronSync,
  triggerManualDemoDownload,
  getMatchDetails,
  loadDemoFromMatchCode,
  getBotStatus,
  addBotFriend,
  getBotFriends,
  syncBotMatches,
  parseMatchHistoryHTML,
  getMatchTypes,
  syncSteamMatchHistory
};

/**
 * Proxy endpoint to fetch Steam Community page with user's cookies
 * This is needed because Steam Community has CORS restrictions
 */
const fetchSteamPage = async (req, res) => {
  try {
    const { steamId, tab } = req.body;
    const userId = req.user.id;

    if (!steamId) {
      return res.status(400).json({
        success: false,
        error: 'Steam ID is required'
      });
    }

    // Get cookies from frontend
    const cookies = req.headers['x-steam-cookies'] || '';

    const steamUrl = `https://steamcommunity.com/profiles/${steamId}/gcpd/730/?tab=${tab || 'matchhistorycompetitive'}`;

    try {
      const response = await axios.get(steamUrl, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      res.json({
        success: true,
        html: response.data
      });

    } catch (fetchError) {
      console.error('Steam fetch error:', fetchError.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch from Steam Community. Make sure you are logged into Steam in your browser.',
        details: fetchError.message
      });
    }

  } catch (error) {
    console.error('Error in fetchSteamPage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Steam page',
      details: error.message
    });
  }
};

module.exports.fetchSteamPage = fetchSteamPage;

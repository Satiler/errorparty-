const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
const { EventEmitter } = require('events');
const { User, CS2Match } = require('../models');
const { analyzeRecentMatches } = require('./questService');
const { decodeShareCode } = require('../utils/shareCodeDecoder');

/**
 * Steam Bot Service для получения данных CS2 матчей через Game Coordinator
 * Автоматически загружает матчи друзей бота
 */
class SteamBotService extends EventEmitter {
  constructor() {
    super();
    
    this.client = null;
    this.csgo = null;
    this.isConnected = false;
    this.isGCReady = false;
    this.pendingRequests = new Map(); // Очередь запросов
    this.requestTimeout = 30000; // 30 секунд
    this.friendsList = new Map(); // Steam ID -> User Info
    this.syncInterval = null; // Интервал синхронизации матчей друзей
    this.syncIntervalTime = 5 * 60 * 1000; // 5 минут
    this.loginAttempts = 0; // Счётчик попыток входа
    this.maxLoginAttempts = 3; // Максимум попыток перед длительной паузой
    this.loginBackoff = 60000; // Начальная задержка 1 минута
    this.isRateLimited = false; // Флаг rate limit
    this.useBackupAccount = false; // Флаг использования резервного аккаунта
    this.pendingSteamGuard = null; // Ожидание Steam Guard кода от админа { domain, callback }
    this.autoSyncInterval = null; // Интервал автоматической синхронизации матчей
    this.intervals = new Set(); // ✅ Track all intervals
    this.timeouts = new Set(); // ✅ Track all timeouts
    
    // Проверяем наличие credentials
    if (!process.env.STEAM_BOT_USERNAME || !process.env.STEAM_BOT_PASSWORD) {
      console.warn('⚠️  Steam Bot credentials not configured. Set STEAM_BOT_USERNAME and STEAM_BOT_PASSWORD in .env');
      return;
    }
    
    // Проверяем наличие backup credentials
    if (process.env.STEAM_BOT_USERNAME_BACKUP && process.env.STEAM_BOT_PASSWORD_BACKUP) {
      console.log('✅ Backup Steam account configured');
    }
    
    this.initialize();
  }
  
  /**
   * Инициализация Steam клиента и CS:GO GC
   */
  initialize() {
    try {
      console.log('🤖 Initializing Steam Bot...');
      
      this.client = new SteamUser();
      this.csgo = new GlobalOffensive(this.client);
      
      this.setupEventHandlers();
      
      // Автоматически подключаемся для работы уведомлений Dota 2
      console.log('🔌 Автоматическое подключение к Steam для Dota 2 notifications...');
      this.connect();
      
    } catch (error) {
      console.error('❌ Steam Bot initialization failed:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Настройка обработчиков событий
   */
  setupEventHandlers() {
    // Steam Client Events
    this.client.on('loggedOn', async () => {
      console.log('✅ Steam Bot logged in');
      this.isConnected = true;
      this.loginAttempts = 0; // Сброс счётчика при успешном входе
      this.isRateLimited = false;
      this.client.setPersona(SteamUser.EPersonaState.Online);
      this.client.gamesPlayed([730]); // Запускаем CS2
      
      // ✅ Broadcast status update to admins
      this.broadcastStatusUpdate();
      
      // Загружаем друзей из базы данных после подключения
      setTimeout(async () => {
        await this.loadFriendsFromDatabase();
        
        // Запускаем автоматическую синхронизацию матчей каждые 5 минут
        this.startAutoSync();
      }, 5000); // Даём 5 секунд для загрузки списка друзей Steam
    });
    
    this.client.on('error', (err) => {
      console.error('❌ Steam Client Error:', err.message);
      this.isConnected = false;
      this.isGCReady = false;
      
      // НЕ эмитим error наружу - это крашит backend!
      // this.emit('error', err);
      
      // ✅ Broadcast status update
      this.broadcastStatusUpdate();
      
      // Обработка Rate Limit и Throttle
      if (err.eresult === 84 || err.eresult === 87) { // RateLimitExceeded или AccountLoginDeniedThrottle
        this.isRateLimited = true;
        this.loginAttempts = 0; // Сброс счётчика
        
        console.warn('⚠️ Steam Rate Limited - will retry later (does not affect TeamSpeak time tracking)');
        
        // Проверяем наличие backup аккаунта
        if (!this.useBackupAccount && process.env.STEAM_BOT_USERNAME_BACKUP) {
          console.log('🚫 Rate limit detected on primary account!');
          console.log('🔄 Switching to backup account: ' + process.env.STEAM_BOT_USERNAME_BACKUP);
          this.useBackupAccount = true;
          this.isRateLimited = false;
          
          // Пробуем подключиться с backup аккаунтом через 5 секунд
          setTimeout(() => {
            this.connect();
          }, 5000);
          return;
        }
        
        // Если backup тоже заблокирован или его нет
        const waitTime = 60 * 60 * 1000; // 1 час
        console.log(`🚫 Rate limit detected! ${this.useBackupAccount ? 'Backup account also limited.' : 'No backup account available.'}`);
        console.log(`⏰ Waiting ${waitTime / 60000} minutes before retry...`);
        console.log('⏰ Bot will automatically reconnect after cooldown');
        
        setTimeout(() => {
          this.isRateLimited = false;
          this.useBackupAccount = false; // Возвращаемся к основному аккаунту
          this.connect();
        }, waitTime);
        return;
      }
      
      // Экспоненциальная задержка при других ошибках
      this.loginAttempts++;
      const delay = Math.min(this.loginBackoff * Math.pow(2, this.loginAttempts - 1), 30 * 60 * 1000); // Максимум 30 минут
      console.log(`⏱️  Reconnecting in ${delay / 1000} seconds (attempt ${this.loginAttempts})...`);
      setTimeout(() => this.connect(), delay);
    });
    
    this.client.on('disconnected', (eresult, msg) => {
      console.log('⚠️  Steam Bot disconnected:', msg);
      this.isConnected = false;
      this.isGCReady = false;
      
      // Не переподключаемся если в rate limit
      if (this.isRateLimited) {
        console.log('⏸️  Skipping reconnect - rate limited');
        return;
      }
      
      // Переподключение через 30 секунд
      console.log('⏱️  Reconnecting in 30 seconds...');
      setTimeout(() => this.connect(), 30000);
    });
    
    this.client.on('steamGuard', (domain, callback) => {
      console.log('\n🔐 Steam Guard required!');
      if (domain) {
        console.log(`📧 Code sent to email: ***@${domain}`);
      } else {
        console.log('📱 Mobile authenticator code required');
      }
      
      // Сохраняем callback для последующей отправки кода через админ-панель
      this.pendingSteamGuard = { domain, callback };
      this.emit('steamGuardRequired', { 
        domain, 
        account: this.useBackupAccount ? 'backup' : 'primary' 
      });
      
      console.log('⏳ Waiting for Steam Guard code from admin panel...');
    });
    
    // Friend Events
    this.client.on('friendRelationship', async (steamid, relationship) => {
      console.log(`👤 Friend relationship change: ${steamid.getSteamID64()} -> ${relationship}`);
      
      if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
        // Получили запрос в друзья - автоматически принимаем
        console.log(`✅ Auto-accepting friend request from ${steamid.getSteamID64()}`);
        this.client.addFriend(steamid);
      } else if (relationship === SteamUser.EFriendRelationship.Friend) {
        // Добавили в друзья - начинаем синхронизацию
        const steamId64 = steamid.getSteamID64();
        console.log(`🎮 New friend added: ${steamId64}`);
        
        try {
          // Находим пользователя в БД
          const user = await User.findOne({ where: { steam_id: steamId64 } });
          if (user) {
            this.friendsList.set(steamId64, { userId: user.id, username: user.username });
            console.log(`💾 Linked friend to user: ${user.username} (ID: ${user.id})`);
            
            // Отправляем приветственное сообщение
            await this.sendMessage(steamId64, `👋 Привет, ${user.username}! Я ErrorParty бот для Dota 2 и CS2.\n\nЯ буду присылать тебе отчеты о матчах и прогресс по квестам.\n\nКоманды:\n!quests - показать активные квесты\n!progress - показать прогресс`);
            
            // Сразу загружаем последние матчи
            await this.syncUserMatches(steamId64);
          }
        } catch (error) {
          console.error('Friend sync error:', error);
        }
      } else if (relationship === SteamUser.EFriendRelationship.None) {
        // Удалили из друзей
        const steamId64 = steamid.getSteamID64();
        console.log(`👋 Friend removed: ${steamId64}`);
        this.friendsList.delete(steamId64);
      }
    });

    // Chat Messages
    this.client.on('friendMessage', async (steamID, message) => {
      const steamId64 = steamID.getSteamID64();
      console.log(`💬 Message from ${steamId64}: ${message}`);
      
      try {
        await this.handleChatCommand(steamId64, message.trim());
      } catch (error) {
        console.error('Chat command error:', error);
      }
    });
    
    // CS:GO GC Events
    this.csgo.on('connectedToGC', () => {
      console.log('✅ Connected to CS2 Game Coordinator');
      this.isGCReady = true;
      this.emit('ready');
      
      // Запускаем периодическую синхронизацию матчей
      this.startMatchSync();
    });
    
    this.csgo.on('disconnectedFromGC', (reason) => {
      console.log('⚠️  Disconnected from GC:', reason);
      this.isGCReady = false;
      
      // Останавливаем синхронизацию
      this.stopMatchSync();
    });
    
    // Получение данных матча
    this.csgo.on('matchList', (matches, data) => {
      console.log(`📋 Match data received from GC: ${matches ? matches.length : 0} matches`);
      console.log('📋 Match list data:', JSON.stringify(data || {}).substring(0, 200));
      this.handleMatchListResponse(matches, data);
    });
  }
  
  /**
   * Подключение к Steam
   */
  connect() {
    if (this.isConnected) {
      console.log('Already connected to Steam');
      this.broadcastStatusUpdate(); // ✅ Broadcast update
      return;
    }
    
    if (this.isRateLimited) {
      console.log('⏸️  Cannot connect - rate limited. Waiting for cooldown...');
      this.broadcastStatusUpdate(); // ✅ Broadcast update
      return;
    }
    
    console.log('🔐 Logging into Steam...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Выбираем аккаунт для входа
    let username, password;
    if (this.useBackupAccount && process.env.STEAM_BOT_USERNAME_BACKUP) {
      username = process.env.STEAM_BOT_USERNAME_BACKUP;
      password = process.env.STEAM_BOT_PASSWORD_BACKUP;
      console.log('🔄 Using backup account: ' + username);
    } else {
      username = process.env.STEAM_BOT_USERNAME;
      password = process.env.STEAM_BOT_PASSWORD;
      console.log('🔐 Using primary account: ' + username);
    }
    
    // Создаём отдельную директорию для каждого аккаунта
    const dataDirectory = path.join(__dirname, '../../.steam', username);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    
    this.client.logOn({
      accountName: username,
      password: password,
      rememberPassword: true,
      machineName: `ErrorParty CS2 Bot (${username})`,
      dataDirectory: dataDirectory // Сохраняем sentry файлы здесь
    });
  }
  
  /**
   * Обработка ответа с данными матчей
   */
  async handleMatchListResponse(matches, data) {
    if (!matches || matches.length === 0) {
      console.log('⚠️  No matches in GC response');
      
      // Проверяем pending запросы и уведомляем об отсутствии данных
      for (const [requestId, request] of this.pendingRequests.entries()) {
        if (request.type === 'recent') {
          console.log(`ℹ️  No recent matches found for user ${request.userId}`);
          this.pendingRequests.delete(requestId);
          return;
        }
      }
      
      return;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 GC Response: ${matches.length} match(es) received`);
    console.log(`${'='.repeat(60)}`);
    
    // Проверяем, это ответ на запрос последних матчей пользователя
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.type === 'recent') {
        console.log(`✅ Found pending 'recent' request for user ${request.userId}`);
        this.pendingRequests.delete(requestId);
        
        // Обрабатываем все матчи пользователя
        console.log(`🔄 Processing ${matches.length} matches for user ${request.userId}...`);
        await this.saveUserMatches(request.steamId, request.userId, matches);
        
        console.log(`${'='.repeat(60)}\n`);
        return;
      }
    }
    
    // Обрабатываем обычный запрос матча по Share Code
    const match = matches[0];
    
    console.log('📊 Processing single match data:', {
      matchId: match.matchid?.toString(),
      map: match.map,
      duration: match.match_duration,
      roundsCount: match.roundstatsall?.length || 0
    });
    
    // Находим соответствующий запрос
    const matchIdStr = match.matchid?.toString();
    let foundRequest = null;
    
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.matchId === matchIdStr) {
        foundRequest = request;
        this.pendingRequests.delete(requestId);
        break;
      }
    }
    
    if (foundRequest) {
      clearTimeout(foundRequest.timeout);
      foundRequest.resolve(match);
      console.log(`✅ Match request resolved for ${matchIdStr}`);
    } else {
      console.warn('⚠️  No pending request found for match:', matchIdStr);
      console.warn('   This match response will be ignored.');
    }
    
    console.log(`${'='.repeat(60)}\n`);
  }
  
  /**
   * Сохранить матчи пользователя в БД
   */
  async saveUserMatches(steamId64, userId, matches) {
    try {
      console.log(`💾 Saving ${matches.length} matches for user ${userId} (Steam ID: ${steamId64})...`);
      
      let newMatches = 0;
      let skippedMatches = 0;
      let errorMatches = 0;
      
      for (const match of matches) {
        try {
          const matchId = match.matchid?.toString();
          
          if (!matchId) {
            console.warn('⚠️  Match without ID, skipping');
            errorMatches++;
            continue;
          }
          
          console.log(`\n📋 Processing match ${matchId}...`);
          
          // Проверяем, есть ли уже этот матч
          const existing = await CS2Match.findOne({
            where: {
              userId: userId,
              matchId: matchId
            }
          });
          
          if (existing) {
            console.log(`⏭️  Match ${matchId} already exists, skipping`);
            skippedMatches++;
            continue;
          }
          
          // Парсим данные матча
          const matchData = this.parseMatchData(match, steamId64);
          
          // Находим статистику пользователя в матче
          // GC возвращает матчи владельца share code первым игроком
          const playerStats = matchData.playerStats?.[matchData.targetPlayerIndex] || matchData.playerStats?.[0] || {
            kills: 0,
            deaths: 0,
            assists: 0,
            headshots: 0,
            damage: 0,
            headshotPercentage: 0,
            adr: 0,
            mvps: 0,
            kills3k: 0,
            kills4k: 0,
            kills5k: 0,
            clutch1v1: 0,
            clutch1v2: 0,
            clutch1v3: 0,
            clutch1v4: 0,
            clutch1v5: 0
          };
          
          console.log('🎯 Player stats:', {
            kills: playerStats.kills,
            deaths: playerStats.deaths,
            assists: playerStats.assists,
            headshots: playerStats.headshots,
            damage: playerStats.damage,
            mvps: playerStats.mvps,
            hs_pct: playerStats.headshotPercentage,
            adr: playerStats.adr
          });
          
          // Создаём запись матча со всеми деталями
          const createdMatch = await CS2Match.create({
            userId: userId,
            matchId: matchId,
            playedAt: matchData.matchTime,
            map: matchData.map,
            roundsPlayed: matchData.roundsPlayed || 0,
            roundsWon: matchData.roundsWon || 0,
            isWin: matchData.isWin || false,
            kills: playerStats.kills || 0,
            deaths: playerStats.deaths || 0,
            assists: playerStats.assists || 0,
            headshots: playerStats.headshots || 0,
            headshotPercentage: parseFloat(playerStats.headshotPercentage) || 0,
            damage: playerStats.damage || 0,
            adr: parseFloat(playerStats.adr) || 0,
            mvps: playerStats.mvps || 0,
            kills3k: playerStats.kills3k || 0,
            kills4k: playerStats.kills4k || 0,
            kills5k: playerStats.kills5k || 0,
            clutch1v1: playerStats.clutch1v1 || 0,
            clutch1v2: playerStats.clutch1v2 || 0,
            clutch1v3: playerStats.clutch1v3 || 0,
            clutch1v4: playerStats.clutch1v4 || 0,
            clutch1v5: playerStats.clutch1v5 || 0,
            source: 'steam_api'
          });
          
          console.log(`✅ Match ${matchId} saved successfully (ID: ${createdMatch.id})`);
          newMatches++;
          
        } catch (matchError) {
          console.error(`❌ Error processing match:`, matchError.message);
          errorMatches++;
        }
      }
      
      console.log(`\n📊 Match import summary:`);
      console.log(`  ✅ New: ${newMatches}`);
      console.log(`  ⏭️  Skipped: ${skippedMatches}`);
      console.log(`  ❌ Errors: ${errorMatches}`);
      
      // Для CS2: анализируем квесты и отправляем уведомления о новых матчах
      if (newMatches > 0) {
        console.log(`🎯 Analyzing CS2 matches for quests...`);
        try {
          // Получаем пользователя для Steam ID
          const user = await User.findByPk(userId);
          if (user && user.steamId) {
            // Анализируем последние матчи CS2 и обновляем квесты
            const { analyzeCS2Matches } = require('./questService');
            const questResults = await analyzeCS2Matches(userId);
            
            console.log(`✅ Quest analysis completed: ${questResults.completedQuests || 0} quests completed`);
            
            // Отправляем уведомление о последнем матче через Steam
            const steamNotificationService = require('./questService').getSteamNotificationService();
            if (steamNotificationService && matches.length > 0) {
              const lastMatch = matches[0]; // Берём первый (последний добавленный)
              const matchData = this.parseMatchData(lastMatch, steamId64);
              
              // Подготавливаем данные для отчёта
              const reportData = {
                map_name: matchData.map,
                win: matchData.isWin,
                kills: matchData.playerStats?.[0]?.kills || 0,
                deaths: matchData.playerStats?.[0]?.deaths || 0,
                assists: matchData.playerStats?.[0]?.assists || 0,
                mvps: matchData.playerStats?.[0]?.mvps || 0,
                score: `${matchData.roundsWon || 0}:${(matchData.roundsPlayed - matchData.roundsWon) || 0}`,
                headshots: matchData.playerStats?.[0]?.headshots || 0,
                damage: matchData.playerStats?.[0]?.damage || 0,
                adr: matchData.playerStats?.[0]?.adr || 0
              };
              
              console.log(`📤 Отправляем отчёт о CS2 матче в Steam...`);
              await steamNotificationService.sendCS2MatchReport(userId, user.steamId, reportData, questResults);
            }
          } else {
            console.warn(`⚠️ Пользователь ${userId} не найден или нет Steam ID`);
          }
        } catch (questError) {
          console.error(`❌ Quest analysis or notification failed:`, questError.message);
          console.error(questError.stack);
        }
      }
      
    } catch (error) {
      console.error('❌ Save user matches error:', error);
      console.error('Stack:', error.stack);
    }
  }
  
  /**
   * Получить данные матча по Share Code
   * @param {string} shareCode - CS2 Share Code (CSGO-XXXXX-XXXXX-...)
   * @returns {Promise<Object>} - Данные матча
   */
  async getMatchData(shareCode) {
    return new Promise((resolve, reject) => {
      // Проверяем подключение
      if (!this.isConnected || !this.isGCReady) {
        return reject(new Error('Steam Bot not ready. Check connection.'));
      }
      
      try {
        // Декодируем Share Code
        const decoded = decodeMatchShareCode(shareCode);
        const matchId = decoded.matchId.toString();
        const outcomeId = decoded.reservationId.toString();
        const token = decoded.tvPort;
        
        console.log('🔍 Requesting match data:', {
          shareCode,
          matchId,
          outcomeId,
          token
        });
        
        // Создаём уникальный ID запроса
        const requestId = `${matchId}_${Date.now()}`;
        
        // Таймаут для запроса
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Match data request timeout (${this.requestTimeout}ms)`));
        }, this.requestTimeout);
        
        // Сохраняем запрос
        this.pendingRequests.set(requestId, {
          matchId,
          shareCode,
          timeout,
          resolve,
          reject
        });
        
        // Отправляем запрос в GC
        this.csgo.requestGame({
          matchId: decoded.matchId,
          outcomeId: decoded.reservationId,
          token: decoded.tvPort
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Парсинг данных матча в удобный формат
   * @param {Object} matchData - Сырые данные от GC
   * @param {String} targetSteamId - Steam ID игрока для поиска его статистики
   * @returns {Object} - Обработанные данные
   */
  parseMatchData(matchData, targetSteamId = null) {
    if (!matchData) {
      throw new Error('No match data to parse');
    }
    
    console.log('📊 Parsing match data:', {
      matchId: matchData.matchid?.toString(),
      map: matchData.map,
      roundsCount: matchData.roundstatsall?.length || 0,
      targetSteamId
    });
    
    const result = {
      matchId: matchData.matchid?.toString(),
      matchTime: matchData.matchtime ? new Date(matchData.matchtime * 1000) : new Date(),
      map: matchData.map || 'de_unknown',
      duration: matchData.match_duration || 0,
      rounds: [],
      playerStats: {},
      targetPlayerIndex: -1
    };
    
    // Парсим статистику раундов
    if (matchData.roundstatsall && Array.isArray(matchData.roundstatsall)) {
      console.log(`📊 Parsing ${matchData.roundstatsall.length} rounds...`);
      
      matchData.roundstatsall.forEach((round, index) => {
        const roundData = {
          roundNumber: index + 1,
          roundResult: round.round_result,
          teamScores: round.team_scores || [],
          players: []
        };
        
        // Извлекаем статистику игроков
        const playerCount = round.kills?.length || 0;
        
        for (let i = 0; i < playerCount; i++) {
          roundData.players.push({
            playerIndex: i,
            kills: round.kills?.[i] || 0,
            assists: round.assists?.[i] || 0,
            deaths: round.deaths?.[i] || 0,
            score: round.scores?.[i] || 0,
            enemyKills: round.enemy_kills?.[i] || 0,
            enemyHeadshots: round.enemy_headshots?.[i] || 0,
            damage: round.damage?.[i] || 0,
            enemy2k: round.enemy_2ks?.[i] || 0,
            enemy3k: round.enemy_3ks?.[i] || 0,
            enemy4k: round.enemy_4ks?.[i] || 0,
            enemy5k: round.enemy_5ks?.[i] || 0,
            mvps: round.mvps?.[i] || 0,
            clutch1v1: round.clutch_1v1?.[i] || 0,
            clutch1v2: round.clutch_1v2?.[i] || 0,
            clutch1v3: round.clutch_1v3?.[i] || 0,
            clutch1v4: round.clutch_1v4?.[i] || 0,
            clutch1v5: round.clutch_1v5?.[i] || 0
          });
        }
        
        result.rounds.push(roundData);
      });
    }
    
    // Подсчитываем общую статистику по всем игрокам
    if (result.rounds.length > 0) {
      const lastRound = result.rounds[result.rounds.length - 1];
      result.finalScore = lastRound.teamScores;
      result.roundsPlayed = result.rounds.length;
      
      // Считаем общую статистику по всем игрокам
      const playerStats = new Map();
      
      result.rounds.forEach(round => {
        round.players.forEach((player, index) => {
          if (!playerStats.has(index)) {
            playerStats.set(index, {
              playerIndex: index,
              kills: 0,
              assists: 0,
              deaths: 0,
              headshots: 0,
              damage: 0,
              mvps: 0,
              kills3k: 0,
              kills4k: 0,
              kills5k: 0,
              clutch1v1: 0,
              clutch1v2: 0,
              clutch1v3: 0,
              clutch1v4: 0,
              clutch1v5: 0
            });
          }
          
          const stats = playerStats.get(index);
          stats.kills += player.kills;
          stats.assists += player.assists;
          stats.deaths += player.deaths;
          stats.headshots += player.enemyHeadshots;
          stats.damage += player.damage;
          stats.mvps += player.mvps;
          stats.kills3k += player.enemy3k;
          stats.kills4k += player.enemy4k;
          stats.kills5k += player.enemy5k;
          stats.clutch1v1 += player.clutch1v1;
          stats.clutch1v2 += player.clutch1v2;
          stats.clutch1v3 += player.clutch1v3;
          stats.clutch1v4 += player.clutch1v4;
          stats.clutch1v5 += player.clutch1v5;
        });
      });
      
      result.playerStats = Array.from(playerStats.values());
      
      // Вычисляем производные метрики
      result.playerStats.forEach(stats => {
        stats.headshotPercentage = stats.kills > 0 ? (stats.headshots / stats.kills * 100).toFixed(2) : 0;
        stats.adr = result.roundsPlayed > 0 ? (stats.damage / result.roundsPlayed).toFixed(2) : 0;
        stats.kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills;
      });
      
      // Определяем победителя (предполагая что игрок в первой команде)
      const teamScore = result.finalScore?.[0] || 0;
      const enemyScore = result.finalScore?.[1] || 0;
      result.isWin = teamScore > enemyScore;
      result.roundsWon = teamScore;
      
      console.log('📊 Match summary:', {
        rounds: result.roundsPlayed,
        score: `${teamScore}:${enemyScore}`,
        isWin: result.isWin,
        playersCount: result.playerStats.length
      });
    }
    
    // Если известен Steam ID, пытаемся найти индекс игрока
    // GC не предоставляет Steam ID напрямую, поэтому используем эвристику:
    // первый игрок в списке обычно владелец share code
    if (targetSteamId && result.playerStats.length > 0) {
      result.targetPlayerIndex = 0; // Предполагаем что это первый игрок
      console.log('🎯 Target player stats (index 0):', result.playerStats[0]);
    }
    
    return result;
  }
  
  /**
   * Загрузить последние матчи пользователя
   */
  async syncUserMatches(steamId64) {
    if (!this.isGCReady) {
      console.log('⚠️  GC not ready, skipping sync for', steamId64);
      return { success: false, error: 'GC not ready' };
    }
    
    try {
      const friendInfo = this.friendsList.get(steamId64);
      if (!friendInfo) {
        console.log('⚠️  Friend not in list:', steamId64);
        return { success: false, error: 'Friend not found in bot friend list' };
      }
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 MATCH SYNC REQUEST`);
      console.log(`   User: ${friendInfo.username} (ID: ${friendInfo.userId})`);
      console.log(`   Steam ID: ${steamId64}`);
      console.log(`${'='.repeat(60)}`);
      
      // Проверяем, нет ли уже активного запроса для этого пользователя
      const existingRequest = this.pendingRequests.get(`recent_${steamId64}`);
      if (existingRequest) {
        console.log('⏸️  Sync already in progress for this user, skipping...');
        return { success: false, error: 'Sync already in progress' };
      }
      
      // ВАЖНО: requestRecentGames работает только для СВОЕГО аккаунта!
      // Для друзей GC не возвращает данные матчей
      console.log(`⚠️  requestRecentGames не поддерживает загрузку матчей друзей`);
      console.log(`   Для синхронизации матчей друзей используйте Share Codes`);
      console.log(`   Пользователь должен вручную добавить Share Code последнего матча`);
      
      return { success: false, error: 'GC does not support match sync for friends without share codes' };
      
      // Сохраняем метаданные запроса для обработки ответа
      this.pendingRequests.set(`recent_${steamId64}`, {
        type: 'recent',
        steamId: steamId64,
        userId: friendInfo.userId,
        username: friendInfo.username,
        timestamp: Date.now()
      });
      
      // Таймаут на случай если GC не ответит
      setTimeout(() => {
        if (this.pendingRequests.has(`recent_${steamId64}`)) {
          console.log(`\n⏱️  TIMEOUT: No response from GC for ${friendInfo.username}`);
          console.log(`   This could mean:`);
          console.log(`   - User has no recent competitive matches`);
          console.log(`   - GC is slow or unresponsive`);
          console.log(`   - Steam API issues`);
          console.log(`   - Invalid auth token`);
          this.pendingRequests.delete(`recent_${steamId64}`);
        }
      }, 60000); // 60 секунд
      
      return { success: true, message: 'Sync request sent' };
      
    } catch (error) {
      console.error('❌ Sync user matches error:', error);
      console.error('   Stack:', error.stack);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Запустить периодическую синхронизацию матчей всех друзей
   */
  startMatchSync() {
    if (this.syncInterval) {
      console.log('ℹ️  Match sync already running');
      return;
    }
    
    console.log('\n⏰ Starting automatic match sync service');
    console.log(`   Interval: ${this.syncIntervalTime / 60000} minutes`);
    console.log(`   Friends will be loaded shortly...`);
    
    // Загружаем друзей при старте (с небольшой задержкой)
    setTimeout(() => {
      this.loadFriendsFromDatabase();
    }, 3000);
    
    // Первая синхронизация через 10 секунд после подключения к GC
    setTimeout(async () => {
      if (this.isGCReady && this.friendsList.size > 0) {
        console.log(`\n🚀 Running initial match sync for ${this.friendsList.size} friends...`);
        await this.runMatchSyncCycle();
      }
    }, 10000);
    
    // Периодическая синхронизация
    this.syncInterval = setInterval(async () => {
      if (!this.isGCReady) {
        console.log('⏸️  Skipping sync cycle - GC not ready');
        return;
      }
      
      if (this.friendsList.size === 0) {
        console.log('⏸️  Skipping sync cycle - no friends in list');
        return;
      }
      
      await this.runMatchSyncCycle();
      
    }, this.syncIntervalTime);
    this.intervals.add({ id: this.syncInterval, name: 'matchSync' }); // ✅ Track
    
    console.log('✅ Match sync service started');
  }
  
  /**
   * Выполнить один цикл синхронизации всех друзей
   */
  async runMatchSyncCycle() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 AUTO-SYNC CYCLE STARTED`);
    console.log(`   Time: ${new Date().toLocaleString('ru-RU')}`);
    console.log(`   Friends to sync: ${this.friendsList.size}`);
    console.log(`${'='.repeat(70)}`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [steamId64, friendInfo] of this.friendsList) {
      console.log(`\n📊 [${successCount + failCount + 1}/${this.friendsList.size}] Syncing ${friendInfo.username}...`);
      
      const result = await this.syncUserMatches(steamId64);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`   ⚠️  Sync failed: ${result.error}`);
      }
      
      // Задержка между запросами чтобы не перегружать GC
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ AUTO-SYNC CYCLE COMPLETED`);
    console.log(`   Success: ${successCount}, Failed: ${failCount}`);
    console.log(`   Next sync in ${this.syncIntervalTime / 60000} minutes`);
    console.log(`${'='.repeat(70)}\n`);
  }
  
  /**
   * Остановить синхронизацию
   */
  stopMatchSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏰ Match sync stopped');
    }
  }
  
  /**
   * Загрузить друзей из базы данных при старте
   * Согласно документации steam-user: myFriends - это объект {steamID: EFriendRelationship}
   */
  async loadFriendsFromDatabase() {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👥 LOADING FRIENDS FROM DATABASE`);
      console.log(`${'='.repeat(60)}`);
      
      // Получаем всех пользователей, у которых есть Steam ID
      const users = await User.findAll({
        where: {
          steamId: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['id', 'steamId', 'username']
      });
      
      console.log(`📚 Found ${users.length} users with Steam ID in database`);
      
      // Проверяем наличие myFriends
      if (!this.client || !this.client.myFriends) {
        console.log('⚠️  Steam client myFriends not available yet');
        console.log('   Retrying in 5 seconds...');
        setTimeout(() => this.loadFriendsFromDatabase(), 5000);
        return;
      }
      
      const steamFriendsCount = Object.keys(this.client.myFriends).length;
      console.log(`🔍 Bot has ${steamFriendsCount} Steam friends total`);
      
      if (steamFriendsCount === 0) {
        console.log('⚠️  Bot has no Steam friends yet!');
        console.log('   Users need to add the bot as a friend first.');
        console.log(`   Bot Steam ID: ${this.getBotSteamId()}`);
      }
      
      // Создаём map Steam друзей для быстрого поиска (ключ - строка Steam ID)
      const steamFriendsMap = new Map();
      for (const [steamId, relationship] of Object.entries(this.client.myFriends)) {
        // Нормализуем к строке
        const steamIdStr = steamId.toString();
        steamFriendsMap.set(steamIdStr, relationship);
      }
      
      console.log(`\n🔍 Processing ${users.length} users from database...`);
      
      let foundCount = 0;
      let notFriendCount = 0;
      
      for (const user of users) {
        const dbSteamId = user.steamId;
        
        // Пропускаем пользователей без Steam ID
        if (!dbSteamId) {
          console.log(`⏭️  Skipping user ${user.username} - no Steam ID`);
          notFriendCount++;
          continue;
        }
        
        // Нормализуем Steam ID из БД к строке
        const steamIdStr = dbSteamId.toString().trim();
        
        // Получаем relationship из map
        const relationship = steamFriendsMap.get(steamIdStr);
        
        // EFriendRelationship enum values (из документации steam-user):
        // 0 = None
        // 1 = Blocked
        // 2 = RequestRecipient (мы получили запрос)
        // 3 = Friend (взаимные друзья)
        // 4 = RequestInitiator (мы отправили запрос)
        // 5 = Ignored
        // 6 = IgnoredFriend
        
        if (relationship === 3) {
          // Друзья! Добавляем в список
          this.friendsList.set(steamIdStr, {
            userId: user.id,
            username: user.username
          });
          console.log(`✅ ${user.username} - FRIENDS (${steamIdStr})`);
          foundCount++;
        } else if (relationship === 2) {
          // Получили запрос - принимаем автоматически
          console.log(`📨 ${user.username} - AUTO-ACCEPTING friend request`);
          this.client.addFriend(steamIdStr);
          notFriendCount++;
        } else if (relationship === 4) {
          // Ожидаем принятия от пользователя
          console.log(`⏳ ${user.username} - WAITING for user to accept`);
          notFriendCount++;
        } else if (relationship === undefined) {
          // Не в друзьях вообще
          console.log(`❌ ${user.username} - NOT FRIENDS (not found in Steam list)`);
          notFriendCount++;
        } else {
          // Другие статусы
          console.log(`❓ ${user.username} - STATUS: ${relationship}`);
          notFriendCount++;
        }
      }
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 FRIEND LIST SUMMARY`);
      console.log(`   ✅ Active friends: ${foundCount}`);
      console.log(`   ❌ Not friends / Pending: ${notFriendCount}`);
      console.log(`   📊 Total in database: ${users.length}`);
      console.log(`${'='.repeat(60)}\n`);
      
      if (foundCount === 0) {
        console.log('⚠️  WARNING: No active friends found!');
        console.log('   To enable auto-sync:');
        console.log(`   1. Add bot to Steam friends: ${this.getBotSteamId()}`);
        console.log('   2. Bot will auto-accept friend requests');
        console.log('   3. Matches will sync automatically every 5 minutes\n');
      } else {
        console.log(`✅ Successfully loaded ${foundCount} friend(s) for auto-sync\n`);
      }
      
    } catch (error) {
      console.error('❌ Load friends error:', error);
      console.error('   Stack:', error.stack);
    }
  }
  
  /**
   * Запустить автоматическую синхронизацию матчей для всех друзей
   */
  startAutoSync() {
    // Если уже запущен, не запускаем повторно
    if (this.autoSyncInterval) {
      console.log('⚠️  Auto-sync already running');
      return;
    }
    
    console.log('\n🔄 Starting automatic match sync (every 5 minutes)...\n');
    
    // Немедленно запускаем первую синхронизацию
    this.autoSyncAllFriends();
    
    // Затем каждые 5 минут
    this.autoSyncInterval = setInterval(() => {
      this.autoSyncAllFriends();
    }, 5 * 60 * 1000); // 5 минут
    this.intervals.add({ id: this.autoSyncInterval, name: 'autoSync' }); // ✅ Track
  }
  
  /**
   * Остановить автоматическую синхронизацию
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }
  
  /**
   * Синхронизировать матчи для всех друзей
   */
  async autoSyncAllFriends() {
    if (!this.isConnected) {
      console.log('⚠️  Bot not connected, skipping auto-sync');
      return;
    }
    
    if (this.friendsList.size === 0) {
      console.log('⚠️  No friends to sync');
      return;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 AUTO-SYNC: Checking ${this.friendsList.size} friend(s) for new matches`);
    console.log(`${'='.repeat(60)}`);
    
    const questService = require('./questService');
    
    for (const [steamId64, friendInfo] of this.friendsList.entries()) {
      try {
        console.log(`\n🔍 Checking matches for ${friendInfo.username} (${steamId64})...`);
        
        // Для Dota 2 используем analyzeRecentMatches
        await questService.analyzeRecentMatches(friendInfo.userId, steamId64, 'dota2');
        
      } catch (error) {
        console.error(`❌ Auto-sync failed for ${friendInfo.username}:`, error.message);
      }
    }
    
    console.log(`\n✅ Auto-sync completed at ${new Date().toLocaleString()}\n`);
  }
  
  /**
   * Отправить сообщение другу в Steam
   */
  async sendMessage(steamId64, message) {
    if (!this.isConnected) {
      console.log('⚠️  Bot not connected, cannot send message');
      return false;
    }
    
    // Проверяем, есть ли пользователь в друзьях
    const friendInfo = this.friendsList.get(steamId64);
    if (!friendInfo) {
      console.log(`⚠️  User ${steamId64} is not in friends list, cannot send message`);
      console.log(`📋 Current friends: ${Array.from(this.friendsList.keys()).join(', ')}`);
      return false;
    }
    
    try {
      console.log(`📤 Отправка сообщения ${friendInfo.username} (${steamId64})`);
      console.log(`📝 Предпросмотр: ${message.substring(0, 100)}...`);
      console.log(`📏 Длина сообщения: ${message.length} символов`);
      
      // Разбиваем длинное сообщение на части (Steam лимит ~2000 символов)
      const maxLength = 1900; // Оставляем запас
      const messages = [];
      
      if (message.length > maxLength) {
        console.log(`⚠️  Message too long (${message.length} chars), splitting into parts...`);
        let currentMessage = '';
        const lines = message.split('\n');
        
        for (const line of lines) {
          if ((currentMessage + line + '\n').length > maxLength) {
            if (currentMessage) messages.push(currentMessage);
            currentMessage = line + '\n';
          } else {
            currentMessage += line + '\n';
          }
        }
        if (currentMessage) messages.push(currentMessage);
      } else {
        messages.push(message);
      }
      
      // Отправляем каждую часть с задержкой и retry при rate limit
      for (let i = 0; i < messages.length; i++) {
        const part = messages[i];
        let attempt = 0;
        const maxAttempts = 3;
        let sent = false;
        
        while (attempt < maxAttempts && !sent) {
          try {
            await new Promise((resolve, reject) => {
              try {
                this.client.chat.sendFriendMessage(steamId64, part, (err) => {
                  if (err) {
                    console.error(`❌ Ошибка отправки сообщения (часть ${i + 1}/${messages.length}):`, err);
                    reject(err);
                  } else {
                    console.log(`✅ Сообщение отправлено успешно (часть ${i + 1}/${messages.length})`);
                    resolve();
                  }
                });
              } catch (error) {
                // Если новый API недоступен, используем старый метод
                console.log('⚠️  Используем старый API chatMessage...');
                this.client.chatMessage(steamId64, part);
                console.log(`✅ Сообщение отправлено через chatMessage (часть ${i + 1}/${messages.length})`);
                resolve();
              }
            });
            
            sent = true;
            
          } catch (error) {
            attempt++;
            
            // Проверяем код ошибки rate limit
            if (error.eresult === 84) { // RateLimitExceeded
              console.log(`⏳ Rate limit detected, waiting ${5 * attempt} seconds before retry (attempt ${attempt}/${maxAttempts})...`);
              await new Promise(resolve => setTimeout(resolve, 5000 * attempt)); // Экспоненциальная задержка
            } else {
              // Другая ошибка - не повторяем
              throw error;
            }
          }
        }
        
        if (!sent) {
          throw new Error(`Failed to send message after ${maxAttempts} attempts`);
        }
        
        // Задержка между частями (увеличена для избежания rate limit)
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Все сообщения отправлены пользователю ${friendInfo.username}`);
      
      // Задержка после отправки всех частей (для следующего пользователя)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      return false;
    }
  }

  /**
   * Обработать команду из чата
   */
  async handleChatCommand(steamId64, message) {
    console.log(`🎯 Command received from ${steamId64}: "${message}"`);
    console.log(`📋 Friends list size: ${this.friendsList.size}`);
    console.log(`📋 Friends:`, Array.from(this.friendsList.keys()));
    
    const friendInfo = this.friendsList.get(steamId64);
    if (!friendInfo) {
      console.log('⚠️  Message from non-friend:', steamId64);
      console.log('   Available friends:', Array.from(this.friendsList.entries()));
      return;
    }

    console.log(`✅ Found friend: userId=${friendInfo.userId}, username=${friendInfo.username}`);
    const command = message.toLowerCase();
    
    if (command === '!quests' || command === '!квесты') {
      console.log('📋 Executing !quests command');
      await this.sendQuestsList(steamId64, friendInfo.userId);
    } else if (command === '!progress' || command === '!прогресс') {
      console.log('📊 Executing !progress command');
      await this.sendQuestsProgress(steamId64, friendInfo.userId);
    } else if (command === '!help' || command === '!помощь') {
      console.log('❓ Executing !help command');
      await this.sendMessage(steamId64, 
        `🤖 ErrorParty Bot - Команды:\n\n` +
        `!quests - показать активные квесты\n` +
        `!progress - показать прогресс по квестам\n` +
        `!help - показать эту справку`
      );
    }
  }

  /**
   * Отправить список активных квестов
   */
  async sendQuestsList(steamId64, userId) {
    try {
      console.log(`📋 sendQuestsList for userId=${userId}`);
      const questService = require('./questService');
      const userQuests = await questService.getUserQuests(userId);
      
      console.log(`📊 Got ${userQuests ? userQuests.length : 0} quests from service`);
      if (userQuests && userQuests.length > 0) {
        console.log('First quest:', userQuests[0]);
      }
      
      if (!userQuests || userQuests.length === 0) {
        console.log('⚠️ No active quests, sending empty message');
        await this.sendMessage(steamId64, '📋 У тебя пока нет активных квестов. Зайди на сайт чтобы выбрать!');
        return;
      }

      let message = '📋 Твои активные квесты:\n\n';
      for (const uq of userQuests) {
        const quest = uq.quest || uq.Quest;
        if (!quest) continue;
        const progress = Math.round((uq.progress / quest.targetValue) * 100);
        message += `${quest.emoji || '•'} ${quest.title}\n`;
        message += `   ${uq.progress}/${quest.targetValue} (${progress}%)\n`;
        message += `   +${quest.xpReward} XP\n\n`;
      }

      await this.sendMessage(steamId64, message);
    } catch (error) {
      console.error('Send quests list error:', error);
      await this.sendMessage(steamId64, '❌ Ошибка при загрузке квестов');
    }
  }

  /**
   * Отправить прогресс по квестам
   */
  async sendQuestsProgress(steamId64, userId) {
    try {
      const User = require('../models/User');
      const user = await User.findByPk(userId);
      
      if (!user) {
        await this.sendMessage(steamId64, '❌ Пользователь не найден');
        return;
      }

      const questService = require('./questService');
      const userQuests = await questService.getUserQuests(userId);
      
      let message = `📊 Твоя статистика:\n\n`;
      message += `Уровень: ${user.level}\n`;
      message += `XP: ${user.xp}/${user.xp_needed}\n`;
      message += `Всего XP: ${user.total_xp}\n\n`;

      if (userQuests && userQuests.length > 0) {
        message += `Активные квесты: ${userQuests.length}\n\n`;
        for (const uq of userQuests) {
          const quest = uq.quest || uq.Quest;
          if (!quest) continue;
          const progress = Math.round((uq.progress / quest.targetValue) * 100);
          message += `${quest.emoji || '•'} ${progress}% - ${quest.title}\n`;
        }
      } else {
        message += `Активных квестов: 0\nВыбери квесты на сайте!`;
      }

      await this.sendMessage(steamId64, message);
    } catch (error) {
      console.error('Send progress error:', error);
      await this.sendMessage(steamId64, '❌ Ошибка при загрузке прогресса');
    }
  }

  /**
   * Добавить пользователя в друзья (отправить запрос)
   */
  async addFriend(steamId64) {
    if (!this.isConnected) {
      throw new Error('Bot not connected to Steam');
    }
    
    try {
      console.log(`📤 Sending friend request to ${steamId64}...`);
      this.client.addFriend(steamId64);
      
      return {
        success: true,
        message: 'Friend request sent. Please accept it in Steam.'
      };
    } catch (error) {
      console.error('Add friend error:', error);
      throw error;
    }
  }
  
  /**
   * Получить список друзей бота
   */
  getFriendsList() {
    return Array.from(this.friendsList.entries()).map(([steamId, info]) => ({
      steamId,
      ...info
    }));
  }
  
  /**
   * Отключение бота
   */
  disconnect() {
    console.log('🔌 Disconnecting Steam Bot...');
    
    // ✅ Clear all intervals and timeouts
    console.log(`🧹 Clearing ${this.intervals.size} intervals and ${this.timeouts.size} timeouts...`);
    for (const interval of this.intervals) {
      clearInterval(interval.id);
      console.log(`   ✓ Cleared interval: ${interval.name}`);
    }
    for (const timeout of this.timeouts) {
      clearTimeout(timeout.id);
      console.log(`   ✓ Cleared timeout: ${timeout.name}`);
    }
    this.intervals.clear();
    this.timeouts.clear();
    
    // Останавливаем синхронизацию
    this.stopMatchSync();
    this.stopAutoSync();
    
    // Очищаем все ожидающие запросы
    this.pendingRequests.forEach((request) => {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      if (request.reject) {
        request.reject(new Error('Bot disconnecting'));
      }
    });
    this.pendingRequests.clear();
    
    // ✅ Broadcast disconnect status
    this.broadcastStatusUpdate();
    
    if (this.client) {
      this.client.logOff();
    }
    
    this.isConnected = false;
    this.isGCReady = false;
    this.friendsList.clear();
  }
  
  /**
   * Получить Steam ID бота
   */
  getBotSteamId() {
    if (this.client && this.client.steamID) {
      return this.client.steamID.getSteamID64();
    }
    return null;
  }
  
  /**
   * Получить статус бота
   */
  /**
   * Broadcast bot status to admin panel via Socket.IO
   */
  broadcastStatusUpdate() {
    if (global.io) {
      const status = this.getStatus();
      global.io.to('admin-bot-status').emit('bot:statusUpdate', status);
    }
  }
  
  getStatus() {
    const currentAccount = this.useBackupAccount && process.env.STEAM_BOT_USERNAME_BACKUP
      ? process.env.STEAM_BOT_USERNAME_BACKUP
      : process.env.STEAM_BOT_USERNAME;
    
    // Список друзей с деталями
    const friendsList = Array.from(this.friendsList.entries()).map(([steamId, info]) => ({
      steamId,
      userId: info.userId,
      username: info.username
    }));
    
    return {
      connected: this.isConnected,
      gcReady: this.isGCReady,
      pendingRequests: this.pendingRequests.size,
      friends: this.friendsList.size,
      friendsList: friendsList,
      botSteamId: this.getBotSteamId(),
      configured: !!(process.env.STEAM_BOT_USERNAME && process.env.STEAM_BOT_PASSWORD),
      rateLimited: this.isRateLimited,
      loginAttempts: this.loginAttempts,
      currentAccount: currentAccount,
      usingBackup: this.useBackupAccount,
      hasBackup: !!(process.env.STEAM_BOT_USERNAME_BACKUP && process.env.STEAM_BOT_PASSWORD_BACKUP),
      syncInterval: !!this.syncInterval,
      syncIntervalMinutes: this.syncIntervalTime / 60000,
      pendingSteamGuard: this.pendingSteamGuard ? {
        domain: this.pendingSteamGuard.domain,
        account: this.useBackupAccount ? 'backup' : 'primary'
      } : null
    };
  }
  
  /**
   * Отправить Steam Guard код (из админ-панели)
   */
  submitSteamGuardCode(code) {
    if (!this.pendingSteamGuard) {
      console.warn('⚠️  No pending Steam Guard request');
      return false;
    }
    
    console.log('✅ Submitting Steam Guard code from admin panel');
    this.pendingSteamGuard.callback(code);
    this.pendingSteamGuard = null;
    return true;
  }
  
  /**
   * Ручной сброс rate limit (для админов)
   */
  resetRateLimit() {
    console.log('🔓 Manually resetting rate limit...');
    this.isRateLimited = false;
    this.loginAttempts = 0;
    if (!this.isConnected) {
      this.connect();
    }
  }
}

// Создаём единственный экземпляр бота (Singleton)
let botInstance = null;

function getSteamBot() {
  if (!botInstance) {
    botInstance = new SteamBotService();
  }
  return botInstance;
}

module.exports = {
  SteamBotService,
  getSteamBot
};

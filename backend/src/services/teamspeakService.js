const { TeamSpeak, QueryProtocol } = require('ts3-nodejs-library');
const redisService = require('./redisService');

class TeamSpeakService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.reconnectInterval = null;
    this.reconnectDelay = 60000; // 60 seconds
    this.intervals = new Set(); // ✅ Track all intervals for cleanup
    this.config = {
      host: process.env.TS_HOST || 'localhost',
      queryport: parseInt(process.env.TS_QUERY_PORT) || 10011,
      serverport: parseInt(process.env.TS_SERVER_PORT) || 9987,
      username: process.env.TS_QUERY_USER || 'serveradmin',
      password: process.env.TS_QUERY_PASSWORD || '',
      nickname: process.env.TS_QUERY_NICKNAME || 'ErrorParty Bot',
      protocol: QueryProtocol.RAW
    };
  }

  /**
   * Connect to TeamSpeak ServerQuery
   */
  async connect() {
    try {
      console.log('🔌 Connecting to TeamSpeak ServerQuery...');
      console.log('Config:', { 
        host: this.config.host, 
        queryport: this.config.queryport,
        serverport: this.config.serverport,
        username: this.config.username,
        password: '***'
      });

      this.client = await TeamSpeak.connect({
        host: this.config.host,
        queryport: this.config.queryport,
        serverport: this.config.serverport,
        username: this.config.username,
        password: this.config.password,
        nickname: this.config.nickname,
        protocol: this.config.protocol,
        keepAlive: true
      });

      // Select server instance
      await this.client.useByPort(this.config.serverport);

      // Register for server events - регистрируем ВСЕ события сервера
      // server - события сервера (клиенты, каналы и тд)
      await this.client.registerEvent('server');
      
      console.log('✅ Registered for TeamSpeak server events');

      // DEBUG: Ловим ВСЕ события через _events
      const eventEmitter = this.client;
      console.log('🔍 Available events:', Object.keys(eventEmitter._events || {}));
      
      // Пробуем все возможные варианты событий
      const possibleEvents = ['cliententerview', 'clientleftview', 'notifycliententerview', 'notifyclientleftview'];
      possibleEvents.forEach(eventName => {
        eventEmitter.on(eventName, (ev) => {
          console.log(`🎯 EVENT FIRED: ${eventName}`, JSON.stringify(ev).substring(0, 200));
        });
      });

      // PLAN B: Polling система - сравниваем клиентов каждые 30 секунд
      this.startClientPolling();

      this.connected = true;
      console.log('✅ TeamSpeak ServerQuery connected successfully');

      // Initialize client connect times Map
      if (!this.clientConnectTimes) {
        this.clientConnectTimes = new Map();
      }

      // Initialize existing online clients
      await this.initializeOnlineClients();

      // Setup event listeners
      this.setupEventListeners();

      // Start periodic time sync
      this.startPeriodicTimeSync();

      // Stop reconnect attempts if we're now connected
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      return true;
    } catch (error) {
      console.error('❌ TeamSpeak connection error:', error.message);
      this.connected = false;
      
      // Start auto-reconnect if not already running
      if (!this.reconnectInterval) {
        this.startAutoReconnect();
      }
      
      return false;
    }
  }

  /**
   * Setup event listeners for TeamSpeak events
   */
  setupEventListeners() {
    if (!this.client) return;

    const userSyncService = require('./userSyncService');

    // Client connected - событие cliententerview (НЕ clientconnect!)
    this.client.on('cliententerview', async (ev) => {
      console.log(`👤 Client connected: ${ev.client.nickname} (clid: ${ev.client.clid})`);
      
      // Отмечаем время подключения для отслеживания онлайн времени
      if (ev.client?.clid) {
        if (!this.clientConnectTimes) {
          this.clientConnectTimes = new Map();
        }
        
        // Обновляем счетчик подключений за день
        try {
          const clientInfo = {
            client_unique_identifier: ev.client.uniqueIdentifier || ev.client.unique_identifier,
            client_nickname: ev.client.nickname,
            client_database_id: ev.client.databaseId || ev.client.database_id
          };
          
          console.log(`📋 Client info from event:`, clientInfo);
          
          if (clientInfo.client_unique_identifier) {
            // Сохраняем время подключения И UID клиента
            this.clientConnectTimes.set(ev.client.clid, {
              connectTime: Date.now(),
              uid: clientInfo.client_unique_identifier
            });
            
            console.log(`💾 Saved to Map: clid=${ev.client.clid}, uid=${clientInfo.client_unique_identifier}`);
            
            await userSyncService.incrementDailyConnections(clientInfo.client_unique_identifier);
            console.log(`✅ Client ${ev.client.nickname} connected with UID: ${clientInfo.client_unique_identifier}`);
          } else {
            console.warn(`⚠️ No UID found in event for ${ev.client.nickname}`);
          }
        } catch (error) {
          console.error(`❌ Error updating daily connections for ${ev.client.nickname}:`, error.message);
        }
      }
    });

    // Client disconnected - событие clientleftview
    this.client.on('clientleftview', async (ev) => {
      await this.handleClientLeft(ev);
    });

    // Text message received
    this.client.on('textmessage', async (ev) => {
      await this.handleTextMessage(ev);
    });

    // Connection closed
    this.client.on('close', () => {
      console.warn('⚠️ TeamSpeak connection closed');
      this.connected = false;
      this.stopPeriodicTimeSync();
      this.startAutoReconnect();
    });

    // Text message received
    this.client.on('textmessage', async (ev) => {
      await this.handleTextMessage(ev);
    });

    // Connection closed
    this.client.on('close', () => {
      console.warn('⚠️ TeamSpeak connection closed');
      this.connected = false;
      this.stopPeriodicTimeSync();
      this.startAutoReconnect();
    });

    // Connection error
    this.client.on('error', (error) => {
      console.error('❌ TeamSpeak error:', error.message);
    });
  }

  /**
   * Handle client left event (unified handler)
   */
  async handleClientLeft(ev) {
    const clid = ev.client?.clid || ev.clid;
    
    console.log(`👋 Client left detected (clid: ${clid})`);
    
    try {
      const clientData = this.clientConnectTimes?.get(clid);
      
      if (!clientData) {
        console.warn(`⚠️ No data in Map for clid ${clid}`);
        return;
      }
      
      if (clientData && clientData.uid) {
        const onlineTime = Math.floor((Date.now() - clientData.connectTime) / 1000);
        
        console.log(`💾 Saving ${onlineTime} seconds for UID: ${clientData.uid}`);
        
        const userSyncService = require('./userSyncService');
        await userSyncService.updateOnlineTime(clientData.uid, onlineTime);
        await userSyncService.updateLastSeen(clientData.uid);
        
        this.clientConnectTimes.delete(clid);
        
        console.log(`✅ Saved ${onlineTime} seconds for UID: ${clientData.uid}`);
      }
    } catch (error) {
      console.error('❌ Error in handleClientLeft:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * Start automatic reconnection attempts
   */
  startAutoReconnect() {
    if (this.reconnectInterval) return;

    console.log(`🔄 Starting auto-reconnect (every ${this.reconnectDelay / 1000}s)...`);
    this.reconnectInterval = setInterval(async () => {
      if (!this.connected) {
        console.log('🔄 Attempting to reconnect to TeamSpeak...');
        await this.connect();
      }
    }, this.reconnectDelay);
    this.intervals.add({ id: this.reconnectInterval, name: 'reconnect' }); // ✅ Track interval
  }

  /**
   * Периодическое обновление времени онлайн для всех подключенных пользователей
   */
  startPeriodicTimeSync() {
    // Обновление каждые 5 минут
    const syncInterval = 5 * 60 * 1000;
    
    this.timeSyncInterval = setInterval(async () => {
      if (!this.connected || !this.clientConnectTimes) {
        return;
      }

      console.log('⏰ Periodic time sync for online clients...');
      
      const userSyncService = require('./userSyncService');
      const currentTime = Date.now();
      
      try {
        const clients = await this.getOnlineClients();
        
        for (const [clid, clientData] of this.clientConnectTimes.entries()) {
          // Проверяем, что клиент еще онлайн
          const client = clients.find(c => c.clid === clid);
          
          if (client && clientData.uid) {
            // Вычисляем время с последней синхронизации
            const timeSinceLastSync = Math.floor((currentTime - clientData.connectTime) / 1000);
            
            // Обновляем время в базе
            await userSyncService.updateOnlineTime(clientData.uid, timeSinceLastSync);
            
            // Обновляем время последней синхронизации
            this.clientConnectTimes.set(clid, {
              connectTime: currentTime,
              uid: clientData.uid
            });
          } else if (!client) {
            // Клиент отключился между проверками - удаляем из Map
            this.clientConnectTimes.delete(clid);
          }
        }
        
        console.log(`✅ Synced time for ${this.clientConnectTimes.size} online clients`);
      } catch (error) {
        console.error('Error during periodic time sync:', error);
      }
    }, syncInterval);
    this.intervals.add({ id: this.timeSyncInterval, name: 'timeSync' }); // ✅ Track interval
    
    console.log(`⏰ Started periodic time sync (every ${syncInterval / 1000 / 60} minutes)`);
  }

  /**
   * Остановка периодической синхронизации времени
   */
  stopPeriodicTimeSync() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
      this.timeSyncInterval = null;
      console.log('⏰ Stopped periodic time sync');
    }
  }

  /**
   * Инициализация уже подключенных клиентов при старте сервера
   */
  async initializeOnlineClients() {
    try {
      const clients = await this.getOnlineClients();
      const currentTime = Date.now();
      
      for (const client of clients) {
        if (client.clid && client.client_unique_identifier) {
          this.clientConnectTimes.set(client.clid, {
            connectTime: currentTime,
            uid: client.client_unique_identifier
          });
        }
      }
      
      console.log(`✅ Initialized ${this.clientConnectTimes.size} already connected clients`);
    } catch (error) {
      console.error('Error initializing online clients:', error);
    }
  }

  /**
   * Disconnect from TeamSpeak ServerQuery
   */
  async disconnect() {
    // ✅ Clear all tracked intervals
    console.log(`🧹 Clearing ${this.intervals.size} tracked intervals...`);
    for (const interval of this.intervals) {
      clearInterval(interval.id);
      console.log(`   ✓ Cleared: ${interval.name}`);
    }
    this.intervals.clear();
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Stop polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 Stopped client polling');
    }

    // Stop periodic time sync
    this.stopPeriodicTimeSync();

    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      console.log('👋 Disconnected from TeamSpeak');
    }
  }

  /**
   * Get list of online clients
   */
  async getOnlineClients() {
    if (!this.connected || !this.client) {
      console.warn('⚠️ TeamSpeak not connected, returning empty client list');
      return [];
    }

    // Try to get from cache
    return await redisService.getOrSet(
      'ts:online_clients',
      async () => {
        try {
          // Get all clients
          const allClients = await this.client.clientList();
          
          // Filter to only regular clients (type 0), excluding ServerQuery clients (type 1)
          const clients = allClients.filter(client => client.type === 0);
          
          console.log(`🔴 Redis MISS - Fetched ${clients.length} online clients from TeamSpeak`);
          
          return clients.map(client => ({
            clid: client.clid,
            cid: client.cid,
            client_database_id: client.clientDatabaseId,
            client_nickname: client.nickname,
            client_unique_identifier: client.uniqueIdentifier,
            client_type: client.type, // Fixed: was clientType (undefined), now using type
            client_away: client.clientAway,
            client_away_message: client.clientAwayMessage,
            client_idle_time: client.clientIdleTime,
            client_country: client.clientCountry,
            connection_time: client.connectionTime
          }));
        } catch (error) {
          console.error('❌ Error fetching clients:', error.message);
          console.error('❌ Full error:', error);
          console.error('❌ Stack:', error.stack);
          return [];
        }
      },
      30 // 30 second TTL
    );
  }

  /**
   * Get channel list
   */
  async getChannelList() {
    if (!this.connected || !this.client) {
      console.warn('⚠️ TeamSpeak not connected, returning empty channel list');
      return [];
    }

    // Try to get from cache
    return await redisService.getOrSet(
      'ts:channels',
      async () => {
        try {
          const channels = await this.client.channelList();
          
          console.log('🔴 Redis MISS - Fetched channels from TeamSpeak');
          
          return channels.map(channel => ({
            cid: channel.cid,
            pid: channel.pid,
            channel_name: channel.name,
            channel_order: channel.channelOrder,
            total_clients: channel.totalClients,
            channel_maxclients: channel.channelMaxclients,
            channel_codec: channel.channelCodec,
            channel_flag_permanent: channel.channelFlagPermanent
          }));
        } catch (error) {
          console.error('❌ Error fetching channels:', error.message);
          return [];
        }
      },
      60 // 60 second TTL
    );
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    if (!this.connected || !this.client) {
      console.warn('⚠️ TeamSpeak not connected, returning mock server info');
      return {
        virtualserver_name: 'ErrorParty.ru (offline)',
        virtualserver_maxclients: '0',
        virtualserver_clientsonline: '0',
        virtualserver_channelsonline: '0',
        virtualserver_uptime: '0',
        virtualserver_status: 'offline'
      };
    }

    // Try to get from cache
    return await redisService.getOrSet(
      'ts:server_info',
      async () => {
        try {
          const info = await this.client.serverInfo();
          
          console.log('🔴 Redis MISS - Fetched server info from TeamSpeak');
          
          return {
            virtualserver_name: info.virtualserverName,
            virtualserver_maxclients: info.virtualserverMaxclients,
            virtualserver_clientsonline: info.virtualserverClientsonline,
            virtualserver_channelsonline: info.virtualserverChannelsonline,
            virtualserver_uptime: info.virtualserverUptime,
            virtualserver_status: 'online',
            virtualserver_platform: info.virtualserverPlatform,
            virtualserver_version: info.virtualserverVersion,
            virtualserver_created: info.virtualserverCreated
          };
        } catch (error) {
          console.error('❌ Error fetching server info:', error.message);
          return {
            virtualserver_name: 'ErrorParty.ru (error)',
            virtualserver_maxclients: '0',
            virtualserver_clientsonline: '0',
            virtualserver_channelsonline: '0',
            virtualserver_uptime: '0',
            virtualserver_status: 'error'
          };
        }
      },
      30 // 30 second TTL
    );
  }

  /**
   * Send message to client
   */
  async sendMessageToClient(clientId, message) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      await this.client.sendTextMessage(clientId, 1, message);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      throw error;
    }
  }

  /**
   * Send message to channel
   */
  async sendMessageToChannel(channelId, message) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      await this.client.sendTextMessage(channelId, 2, message);
      return true;
    } catch (error) {
      console.error('❌ Error sending channel message:', error.message);
      throw error;
    }
  }

  /**
   * Send server-wide message
   */
  async sendServerMessage(message) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      await this.client.sendTextMessage(this.client.whoami().virtualserverPort, 3, message);
      return true;
    } catch (error) {
      console.error('❌ Error sending server message:', error.message);
      throw error;
    }
  }

  /**
   * Handle text messages from clients
   */
  async handleTextMessage(ev) {
    try {
      const message = ev.msg.trim();
      const invoker = ev.invoker;

      // Ignore messages from the bot itself
      if (invoker.clientType === 1) return;

      console.log(`💬 Message from ${invoker.nickname}: ${message}`);

      // Check for !link command
      if (message.startsWith('!link ')) {
        const token = message.substring(6).trim().toUpperCase();
        
        if (!token || token.length !== 6) {
          await this.sendMessageToClient(invoker.clid, '❌ Неверный формат команды. Используйте: !link ТОКЕН');
          return;
        }

        console.log(`🔗 Link request from ${invoker.nickname} with token: ${token.substring(0, 4)}****`);

        // Get client UID from invoker
        const clientUid = invoker.uniqueIdentifier || invoker.client_unique_identifier;
        
        if (!clientUid) {
          console.error('No UID in invoker:', invoker);
          await this.sendMessageToClient(invoker.clid, '❌ Не удалось получить ваш уникальный идентификатор TeamSpeak');
          return;
        }

        console.log(`Client UID: ${clientUid}`);

        // Try to link using the token
        const userSyncService = require('./userSyncService');
        const result = await userSyncService.linkUserByToken(
          token,
          clientUid,
          invoker.nickname
        );

        // Send response to client
        await this.sendMessageToClient(invoker.clid, result.message);

        // If successful, ask user to change nickname
        if (result.success && result.steamUsername) {
          const nicknameMessage = `\n📝 Пожалуйста, измените свой ник на: ${result.steamUsername}\n` +
                                  `(Правый клик на своё имя → Изменить ник)`;
          await this.sendMessageToClient(invoker.clid, nicknameMessage);
        }
      }
      // Quest progress command
      else if (message === '!quests' || message === '!progress') {
        console.log(`📊 Quest progress request from ${invoker.nickname}`);
        
        const clientUid = invoker.uniqueIdentifier || invoker.client_unique_identifier;
        
        if (!clientUid) {
          await this.sendMessageToClient(invoker.clid, '❌ Не удалось получить ваш идентификатор');
          return;
        }

        // Находим пользователя по TeamSpeak UID
        const { User } = require('../models');
        const user = await User.findOne({ where: { teamspeakUid: clientUid } });

        if (!user) {
          await this.sendMessageToClient(invoker.clid, '❌ Аккаунт не связан. Используйте !link ТОКЕН');
          return;
        }

        // Отправляем прогресс
        const notificationService = require('./teamspeakNotificationService');
        await notificationService.sendQuestProgress(user.id);
      }
      // Help command
      else if (message === '!help' || message === '!commands') {
        const helpMessage = 
          '🤖 Доступные команды:\n' +
          '!link ТОКЕН - Связать аккаунт сайта с TeamSpeak\n' +
          '!quests - Показать прогресс квестов\n' +
          '!progress - Показать прогресс квестов\n' +
          '!help - Показать это сообщение';
        
        await this.sendMessageToClient(invoker.clid, helpMessage);
      }
    } catch (error) {
      console.error('Error handling text message:', error);
    }
  }

  /**
   * Get client full info including UID
   */
  async getClientFullInfo(clientId) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    // Retry логика - иногда событие clientconnect срабатывает до того, как клиент появляется в списке
    const maxRetries = 10;
    const retryDelay = 1000; // 1000ms между попытками
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get all clients and filter to regular clients (type 0)
        const allClients = await this.client.clientList();
        const clients = allClients.filter(c => c.type === 0);
        
        // Находим клиента по clid
        const clientData = clients.find(c => c.clid.toString() === clientId.toString());
        
        if (!clientData) {
          if (attempt < maxRetries) {
            console.log(`⏳ Client ${clientId} not found in list yet, retrying (${attempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          throw new Error(`Client with clid ${clientId} not found after ${maxRetries} attempts`);
        }
        
        // В clientList данные доступны напрямую
        const uid = clientData.uniqueIdentifier;
        const nickname = clientData.nickname;
        const dbid = clientData.databaseId;
        
        console.log(`✅ Client info: UID=${uid}, Nickname=${nickname}, DBID=${dbid}`);
        
        if (!uid) {
          throw new Error('UID not found in client data');
        }
        
        return {
          clid: clientId,
          client_unique_identifier: uid,
          client_nickname: nickname,
          client_database_id: dbid
        };
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('❌ Error fetching client info:', error.message);
          throw error;
        }
      }
    }
  }

  /**
   * Set client nickname
   */
  async setClientNickname(clientId, nickname) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      await this.client.clientEdit(clientId, { client_nickname: nickname });
      console.log(`✅ Changed nickname for client ${clientId} to: ${nickname}`);
      return true;
    } catch (error) {
      console.error('❌ Error setting client nickname:', error.message);
      // Try alternative method
      try {
        const clients = await this.client.clientList();
        const client = clients.find(c => c.clid === clientId);
        if (client) {
          await this.client.execute('clientupdate', { client_nickname: nickname });
          console.log(`✅ Changed nickname using clientupdate to: ${nickname}`);
          return true;
        }
      } catch (err) {
        console.error('❌ Alternative method also failed:', err.message);
      }
      throw error;
    }
  }

  /**
   * Добавить пользователю серверную группу (роль)
   */
  async addServerGroupToClient(clientUid, serverGroupId) {
    if (!this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      // Получаем клиента по UID
      const clients = await this.client.clientList({ clientType: 0 });
      const client = clients.find(c => c.clientUniqueIdentifier === clientUid);

      if (!client) {
        throw new Error('Client not found in TeamSpeak');
      }

      // Добавляем серверную группу
      await this.client.serverGroupAddClient(serverGroupId, client.clid);
      console.log(`✅ Added server group ${serverGroupId} to client ${clientUid}`);
      
      return true;
    } catch (error) {
      console.error('Error adding server group:', error);
      throw error;
    }
  }

  /**
   * Получить список всех серверных групп
   */
  async getServerGroups() {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      const groups = await this.client.serverGroupList();
      
      return groups.map(group => ({
        sgid: group.sgid,
        name: group.name,
        type: group.type,
        iconid: group.iconid,
        savedb: group.savedb,
        sortid: group.sortid,
        namemode: group.namemode
      }));
    } catch (error) {
      console.error('Error fetching server groups:', error);
      throw error;
    }
  }

  /**
   * Создать новую серверную группу
   */
  async createServerGroup(name, type = 1) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      const group = await this.client.serverGroupCreate(name, type);
      console.log(`✅ Created server group "${name}" with ID ${group.sgid}`);
      return group;
    } catch (error) {
      console.error('Error creating server group:', error);
      throw error;
    }
  }

  /**
   * Удалить серверную группу
   */
  async deleteServerGroup(serverGroupId, force = false) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      await this.client.serverGroupDel(serverGroupId, force);
      console.log(`✅ Deleted server group ${serverGroupId}`);
      return true;
    } catch (error) {
      console.error('Error deleting server group:', error);
      throw error;
    }
  }

  /**
   * Получить клиентов в определенной группе
   */
  async getServerGroupClients(serverGroupId) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      const clients = await this.client.serverGroupClientList(serverGroupId);
      return clients;
    } catch (error) {
      console.error('Error fetching server group clients:', error);
      throw error;
    }
  }

  /**
   * Удалить пользователя из серверной группы
   */
  async removeServerGroupFromClient(clientUid, serverGroupId) {
    if (!this.connected || !this.client) {
      throw new Error('TeamSpeak not connected');
    }

    try {
      const clients = await this.client.clientList({ clientType: 0 });
      const client = clients.find(c => c.clientUniqueIdentifier === clientUid);

      if (!client) {
        throw new Error('Client not found in TeamSpeak');
      }

      await this.client.serverGroupDelClient(serverGroupId, client.clientDatabaseId);
      console.log(`✅ Removed server group ${serverGroupId} from client ${clientUid}`);
      return true;
    } catch (error) {
      console.error('Error removing server group:', error);
      throw error;
    }
  }

  /**
   * Polling система - сравниваем клиентов каждые 30 секунд
   * ПЛАН B когда события не работают!
   */
  startClientPolling() {
    // Храним предыдущий список клиентов
    this.previousClients = new Map();
    this.pollingFirstRun = true; // Флаг первого запуска
    
    console.log('🔄 Starting client polling (30s interval)');
    
    this.pollingInterval = setInterval(async () => {
      try {
        if (!this.connected || !this.client) return;
        
        // Получаем текущих клиентов
        const allClients = await this.client.clientList();
        const currentClients = allClients.filter(c => c.type === 0); // только реальные клиенты
        
        // Создаем Map текущих клиентов (clid -> client)
        const currentMap = new Map();
        for (const client of currentClients) {
          if (client.clid) {
            currentMap.set(client.clid, client);
          }
        }
        
        // Первый запуск - инициализируем Map И clientConnectTimes для ВСЕХ текущих клиентов
        if (this.pollingFirstRun) {
          console.log(`🎬 First polling run - initializing ${currentMap.size} clients`);
          console.log(`🔍 currentMap entries:`, Array.from(currentMap.keys()));
          
          if (!this.clientConnectTimes) {
            this.clientConnectTimes = new Map();
          }
          
          let processedCount = 0;
          for (const [clid, client] of currentMap) {
            processedCount++;
            console.log(`🔄 Processing client ${processedCount}/${currentMap.size}...`);
            
            try {
              // Proxy объект - нужно обратиться к свойству чтобы оно подгрузилось
              const uid = client.uniqueIdentifier;
              const nickname = client.nickname;
              
              console.log(`🔍 Client ${nickname} (clid: ${clid})`);
              console.log(`   - UID from .uniqueIdentifier: ${uid}`);
              console.log(`   - Available keys:`, Object.keys(client).join(', '));
              
              if (uid) {
                this.clientConnectTimes.set(clid, {
                  connectTime: Date.now(),
                  uid: uid
                });
                console.log(`💾 Initialized tracking for ${nickname} (UID: ${uid.substring(0, 10)}...)`);
              } else {
                console.error(`❌ No UID for ${nickname}!`);
              }
            } catch (error) {
              console.error(`❌ Error initializing clid ${clid}:`, error.message);
              console.error(error.stack);
            }
          }
          
          console.log(`✅ Processed ${processedCount} clients in first run`);
          
          this.previousClients = currentMap;
          this.pollingFirstRun = false;
          console.log(`🏁 First run complete, will start detecting changes from now`);
          return; // Пропускаем первую итерацию
        }
        
        console.log(`🔄 Regular polling check...`);

        
        // Находим новых клиентов (подключились)
        for (const [clid, client] of currentMap) {
          if (!this.previousClients.has(clid)) {
            const nickname = client.nickname;
            const uid = client.uniqueIdentifier;
            
            console.log(`✨ POLLING: Client connected - ${nickname} (clid: ${clid})`);
            console.log(`   - UID: ${uid}`);
            
            if (uid) {
              if (!this.clientConnectTimes) {
                this.clientConnectTimes = new Map();
              }
              
              this.clientConnectTimes.set(clid, {
                connectTime: Date.now(),
                uid: uid
              });
              console.log(`💾 POLLING: Saved connect time for ${nickname} (UID: ${uid.substring(0, 10)}...)`);
            } else {
              console.error(`❌ POLLING: No UID for ${nickname}!`);
              console.error(`   Available keys:`, Object.keys(client).join(', '));
            }
          }
        }
        
        // Находим отключившихся клиентов
        for (const [clid, client] of this.previousClients) {
          if (!currentMap.has(clid)) {
            console.log(`👋 POLLING: Client disconnected - clid: ${clid}`);
            
            // Вызываем обработчик отключения (передаем объект с clid)
            await this.handleClientLeft({ clid: clid });
          }
        }
        
        // Обновляем предыдущий список
        this.previousClients = currentMap;
        
      } catch (error) {
        console.error('❌ Polling error:', error.message);
      }
    }, 30000); // 30 секунд
  }
}

module.exports = new TeamSpeakService();

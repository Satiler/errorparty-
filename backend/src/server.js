const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('./config/passport');
const { testConnection } = require('./config/database');
const teamspeakService = require('./services/teamspeakService');
const redisService = require('./services/redisService');
const { getSteamBot } = require('./services/steamBotService');
const { apiLimiter } = require('./middleware/rateLimiter');
const { lightLimiter } = require('./middleware/lightLimiter');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiter (nginx reverse proxy)
app.set('trust proxy', 1);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Apply lightweight rate limiter to frequently accessed read-only endpoints
app.use('/api/home', lightLimiter);
app.use('/api/server/status', lightLimiter);
app.use('/api/quests', lightLimiter);
app.use('/api/notifications', lightLimiter);
app.use('/api/cs2-stats', lightLimiter); // ✅ CS2 Stats are public read-only

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Validate required secrets
if (!process.env.SESSION_SECRET) {
  throw new Error('❌ CRITICAL: SESSION_SECRET environment variable must be set!');
}
if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable must be set!');
}

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files for uploads
app.use('/uploads', express.static('uploads'));
app.use('/api/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'errorparty-backend',
    version: '1.0.0'
  });
});

// TEMPORARY: Steam Guard submission with IP whitelist protection
// Set ADMIN_IPS in .env as comma-separated list: ADMIN_IPS=127.0.0.1,::1,YOUR_IP
const ALLOWED_IPS = (process.env.ADMIN_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());

app.post('/api/bot/steam-guard-submit', (req, res) => {
  try {
    // IP whitelist check
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!ALLOWED_IPS.includes(clientIP) && !ALLOWED_IPS.includes('0.0.0.0')) {
      console.warn(`⚠️ Unauthorized Steam Guard attempt from IP: ${clientIP}`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code required' });
    }
    
    const bot = getSteamBot();
    const success = bot.submitSteamGuardCode(code.trim().toUpperCase());
    
    if (success) {
      res.json({ success: true, message: 'Code submitted successfully' });
    } else {
      res.json({ success: false, error: 'No pending Steam Guard request' });
    }
  } catch (error) {
    console.error('Error submitting Steam Guard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// TEMPORARY: Manual user sync with IP whitelist protection (for testing)
app.post('/api/bot/sync-user-temp', (req, res) => {
  try {
    // IP whitelist check
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!ALLOWED_IPS.includes(clientIP) && !ALLOWED_IPS.includes('0.0.0.0')) {
      console.warn(`⚠️ Unauthorized sync attempt from IP: ${clientIP}`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const { steamId } = req.body;
    if (!steamId) {
      return res.status(400).json({ success: false, error: 'steamId required' });
    }
    
    const bot = getSteamBot();
    if (!bot.isConnected || !bot.isGCReady) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bot not connected or GC not ready' 
      });
    }
    
    bot.syncUserMatches(steamId).then(() => {
      // Success handled async
    }).catch(err => {
      console.error('Sync error:', err);
    });
    
    res.json({ success: true, message: `Sync started for ${steamId}` });
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to ErrorParty.ru API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      steam: '/api/steam',
      dota2: '/api/dota2',
      cs2: '/api/cs2',
      friends: '/api/friends',
      server: '/api/server',
      users: '/api/users',
      memes: '/api/memes',
      quotes: '/api/quotes',
      stats: '/api/stats'
    }
  });
});

// Import routes
const usersRouter = require('./routes/users');
const memesRouter = require('./routes/memes');
const quotesRouter = require('./routes/quotes');
const authRouter = require('./routes/auth');
const steamRouter = require('./routes/steam');
const dota2Router = require('./routes/dota2');
const dota2GlobalRouter = require('./routes/dota2Global');
const cs2Router = require('./routes/cs2');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const serverRouter = require('./routes/server');
const halloffameRouter = require('./routes/halloffame');
const eventsRouter = require('./routes/events');
const dashboardRouter = require('./routes/dashboard');
const questsRouter = require('./routes/quests');
const gsiRouter = require('./routes/gsi');
const homeRouter = require('./routes/home'); // ✅ New optimized endpoint
const notificationsRouter = require('./routes/notifications'); // ✅ Push notifications
const cs2StatsRouter = require('./routes/cs2Stats'); // ✅ CS2 Advanced Statistics API
const musicDiscoveryRouter = require('./routes/musicDiscovery'); // ✅ Smart Music Discovery
const musicRouter = require('./modules/music/music.routes'); // ✅ Main Music API

// Use routes
app.use('/api/home', homeRouter); // ✅ Add home route
app.use('/api/notifications', notificationsRouter); // ✅ Push notifications
app.use('/api/users', usersRouter);
app.use('/api/memes', memesRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/steam', steamRouter);
app.use('/api/dota2', dota2Router);
app.use('/api/dota2/global', dota2GlobalRouter);
app.use('/api/cs2', cs2Router);
app.use('/api/admin', adminRouter);
app.use('/api/server', serverRouter);
app.use('/api/halloffame', halloffameRouter);
app.use('/api/events', eventsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/quests', questsRouter);
app.use('/api/gsi', gsiRouter);
app.use('/api/cs2-stats', cs2StatsRouter); // ✅ CS2 Advanced Statistics
app.use('/api/cs2-demo', require('./routes/cs2Demo')); // ✅ CS2 Demo Upload
app.use('/api/music/discover', musicDiscoveryRouter); // ✅ Smart Music Discovery & Personal Playlists
app.use('/api/music/auto', require('./routes/auto-music')); // ✅ Automated Music System API
app.use('/api/music/smart-playlists', require('./modules/music/smart-playlists.routes')); // ✅ Smart AI Playlists
app.use('/api/music', musicRouter); // ✅ Main Music API (tracks, albums, playlists)

// DISABLED: Test endpoint removed for security
// Use admin panel /api/admin/test/steam-community instead with proper authentication

// Server info endpoint
app.get('/api/server/status', async (req, res) => {
  try {
    const serverInfo = await teamspeakService.getServerInfo();
    res.json({
      online: serverInfo.virtualserver_status === 'online',
      name: serverInfo.virtualserver_name,
      clients: parseInt(serverInfo.virtualserver_clientsonline) || 0,
      maxClients: parseInt(serverInfo.virtualserver_maxclients) || 0,
      uptime: parseInt(serverInfo.virtualserver_uptime) || 0,
      channels: parseInt(serverInfo.virtualserver_channelsonline) || 0,
      platform: serverInfo.virtualserver_platform,
      version: serverInfo.virtualserver_version
    });
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.status(500).json({ error: 'Failed to fetch server status' });
  }
});

// Online users endpoint
app.get('/api/users/online', async (req, res) => {
  try {
    const clients = await teamspeakService.getOnlineClients();
    const channels = await teamspeakService.getChannelList();
    
    // Map channel IDs to channel names
    const channelMap = {};
    channels.forEach(ch => {
      channelMap[ch.cid] = ch.channel_name;
    });
    
    const users = clients.map(client => ({
      id: client.clid,
      database_id: client.client_database_id,
      nickname: client.client_nickname,
      channel: channelMap[client.cid] || 'Unknown',
      channel_id: client.cid,
      away: client.client_away || false,
      away_message: client.client_away_message || '',
      idle_time: client.client_idle_time || 0,
      country: client.client_country || '',
      connection_time: client.connection_time || 0
    }));
    
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Get channel list endpoint
app.get('/api/teamspeak/channels', async (req, res) => {
  try {
    const channels = await teamspeakService.getChannelList();
    res.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Socket.IO real-time events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send initial server status
  teamspeakService.getServerInfo().then(serverInfo => {
    socket.emit('server:status', {
      online: serverInfo.virtualserver_status === 'online',
      clients: parseInt(serverInfo.virtualserver_clientsonline) || 0,
      maxClients: parseInt(serverInfo.virtualserver_maxclients) || 0,
      uptime: parseInt(serverInfo.virtualserver_uptime) || 0
    });
  }).catch(err => {
    console.error('Error sending initial status:', err);
  });

  // ✅ Admin bot status subscription
  socket.on('admin:subscribeBotStatus', () => {
    console.log(`Admin subscribed to bot status: ${socket.id}`);
    socket.join('admin-bot-status');
    
    // Send current bot status immediately
    const steamBot = require('./services/steamBotService');
    socket.emit('bot:statusUpdate', steamBot.getStatus());
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Send real-time updates every 10 seconds
setInterval(async () => {
  try {
    const serverInfo = await teamspeakService.getServerInfo();
    io.emit('server:update', {
      clients: parseInt(serverInfo.virtualserver_clientsonline) || 0,
      online: serverInfo.virtualserver_status === 'online',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending server update:', error);
  }
}, 10000);

// ✅ Expose io for bot status updates
global.io = io;

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler - must be AFTER all routes
app.use(notFoundHandler);

// Centralized error handler - must be LAST middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎮 ErrorParty.ru Backend API       ║
  ║   Server: http://localhost:${PORT}     ║
  ║   Status: RUNNING                     ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ╚═══════════════════════════════════════╝
  `);
  
  // Test database connection
  await testConnection();
  
  // Initialize quests
  console.log('\n🎯 Initializing quest system...');
  const questService = require('./services/questService');
  await questService.initializeQuests();
  
  // Initialize quest CRON jobs
  console.log('\n⏰ Initializing quest CRON jobs...');
  const { initQuestsCron } = require('./services/questCron');
  initQuestsCron();
  
  // Initialize CS2 demo download service
  console.log('\n📥 Initializing CS2 demo download service...');
  const cs2DemoDownloadService = require('./services/cs2DemoDownloadService');
  await cs2DemoDownloadService.init();
  
  // Initialize CS2 Match Auto-Sync Service (Auth Token based sync)
  console.log('\n🔄 Initializing CS2 Match Auto-Sync Service...');
  const cs2AutoSyncCron = require('./services/cs2AutoSyncCron');
  cs2AutoSyncCron.start();
  
  // Initialize CS2 Demo Cron Service (demo downloads for existing matches)
  console.log('\n🎮 Initializing CS2 Demo Cron Service...');
  const cs2DemoCronService = require('./services/cs2DemoCronService');
  cs2DemoCronService.start();
  
  // Connect to Redis
  console.log('\n🔴 Initializing Redis connection...');
  await redisService.connect();
  
  // Connect to TeamSpeak ServerQuery
  console.log('\n📡 Initializing TeamSpeak connection...');
  await teamspeakService.connect();
  
  // Initialize Steam Bot for CS2 Game Coordinator
  console.log('\n🤖 Initializing Steam Bot for CS2 Game Coordinator...');
  try {
    const steamBot = getSteamBot();
    if (steamBot.getStatus().configured) {
      console.log('✅ Steam Bot initialized (will connect in background)');
      
      // Initialize Steam Notifications for Dota 2 match reports
      console.log('\n💬 Initializing Steam Notification Service...');
      questService.initSteamNotifications(steamBot);
      console.log('✅ Steam notifications enabled for Dota 2 match reports');
    } else {
      console.log('⚠️  Steam Bot not configured (set STEAM_BOT_USERNAME and STEAM_BOT_PASSWORD in .env)');
    }
  } catch (error) {
    console.error('❌ Steam Bot initialization failed:', error.message);
  }
  
  // Initialize Music Scheduler
  try {
    console.log('\n🎵 Initializing Music Scheduler...');
    const musicScheduler = require('./modules/music/music-scheduler');
    musicScheduler.start();
    console.log('✅ Music Scheduler started');
  } catch (error) {
    console.error('❌ Music Scheduler initialization failed:', error.message);
  }
  
  // Initialize Track Verification & Auto-Cache System (NEW)
  try {
    console.log('\n🔍 Initializing Track Verification & Auto-Cache System...');
    const trackVerificationCron = require('./modules/music/track-verification.cron');
    trackVerificationCron.start();
    console.log('✅ Track Verification System started');
    console.log('   - Track verification: every 6 hours');
    console.log('   - Auto-cache: every hour');
    console.log('   - Cleanup: daily at 03:00');
  } catch (error) {
    console.error('❌ Track Verification System initialization failed:', error.message);
  }
  
  // Initialize Top Hits Auto Import
  try {
    console.log('\n🌟 Initializing Top Hits Auto Import...');
    const { scheduleImport } = require('../setup-auto-import');
    scheduleImport();
    console.log('✅ Top Hits Auto Import scheduled (daily at 3:00 AM)');
  } catch (error) {
    console.error('❌ Top Hits Auto Import initialization failed:', error.message);
  }
  
  // Initialize Smart Music Import (iTunes + Yandex Music)
  try {
    console.log('\n🧠 Initializing Smart Music Import...');
    const { startAll } = require('../setup-smart-import');
    startAll();
    console.log('✅ Smart Music Import scheduled (daily at 4:00 AM)');
    console.log('✅ Personal Playlists creation scheduled (daily at 5:00 AM)');
  } catch (error) {
    console.error('❌ Smart Music Import initialization failed:', error.message);
  }
  
  // Initialize Smart URL Cache (VK URL Auto-Refresh)
  try {
    console.log('\n🔄 Initializing Smart URL Cache System...');
    const { startJob } = require('./jobs/refresh-urls.job');
    startJob();
    console.log('✅ Smart URL Cache started (proactive refresh every 30 minutes)');
    console.log('   - Automatically refreshes expired VK URLs');
    console.log('   - Prevents playback delays');
  } catch (error) {
    console.error('❌ Smart URL Cache initialization failed:', error.message);
  }

  // Initialize Automated Music System (New!)
  try {
    console.log('\n🤖 Initializing Automated Music System...');
    const { getInstance: getAutoMusicScheduler } = require('./schedulers/auto-music-system.scheduler');
    const autoMusicScheduler = getAutoMusicScheduler();
    autoMusicScheduler.start();
    console.log('✅ Automated Music System started!');
    console.log('   📥 Automatic track import (every 3 hours)');
    console.log('   📊 Chart playlists update (every 6 hours)');
    console.log('   🎯 Personal recommendations (daily at 5:00 AM)');
    console.log('   🔄 Full system update (daily at 4:00 AM)');
    console.log('   📈 Popularity tracking (hourly)');
  } catch (error) {
    console.error('❌ Automated Music System initialization failed:', error.message);
  }

  // Initialize Smart Playlists Scheduler (AI-powered playlists)
  try {
    console.log('\n🧠 Initializing Smart Playlists Scheduler...');
    const smartPlaylistsScheduler = require('./schedulers/smart-playlists.scheduler');
    smartPlaylistsScheduler.start();
    console.log('✅ Smart Playlists Scheduler started!');
    console.log('   🎵 Daily playlists update (every day at 4:00 AM)');
    console.log('   📅 Weekly playlists update (Monday at 3:00 AM)');
    console.log('   🎶 Daily soundtrack refresh (every 6 hours)');
    console.log('   🤖 AI-powered mood, activity & genre playlists');
  } catch (error) {
    console.error('❌ Smart Playlists Scheduler initialization failed:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Stop cron jobs
  const cs2AutoSyncCron = require('./services/cs2AutoSyncCron');
  cs2AutoSyncCron.stop();
  
  const cs2DemoCronService = require('./services/cs2DemoCronService');
  cs2DemoCronService.stop();
  
  // Stop Top Hits Auto Import (cron jobs gracefully stop on process exit)
  console.log('🌟 Top Hits Auto Import cron will stop with process exit');
  
  // Stop Music Scheduler
  try {
    const musicScheduler = require('./modules/music/music-scheduler');
    musicScheduler.stop();
  } catch (error) {
    console.error('Music Scheduler stop error:', error.message);
  }

  // Stop Smart Playlists Scheduler
  try {
    const smartPlaylistsScheduler = require('./schedulers/smart-playlists.scheduler');
    smartPlaylistsScheduler.stop();
    console.log('🧠 Smart Playlists Scheduler stopped');
  } catch (error) {
    console.error('Smart Playlists Scheduler stop error:', error.message);
  }

  // Stop Automated Music System
  try {
    const { getInstance: getAutoMusicScheduler } = require('./schedulers/auto-music-system.scheduler');
    const autoMusicScheduler = getAutoMusicScheduler();
    autoMusicScheduler.stop();
    console.log('🤖 Automated Music System stopped');
  } catch (error) {
    console.error('Automated Music System stop error:', error.message);
  }
  
  // Disconnect Steam Bot
  try {
    const steamBot = getSteamBot();
    steamBot.disconnect();
  } catch (error) {
    console.error('Steam Bot disconnect error:', error.message);
  }
  
  // Disconnect from Redis
  await redisService.disconnect();
  
  // Disconnect from TeamSpeak
  await teamspeakService.disconnect();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  
  // Stop cron jobs
  const cs2AutoSyncCron = require('./services/cs2AutoSyncCron');
  cs2AutoSyncCron.stop();
  
  const cs2DemoCronService = require('./services/cs2DemoCronService');
  cs2DemoCronService.stop();
  
  // Stop Top Hits Auto Import (cron jobs gracefully stop on process exit)
  console.log('🌟 Top Hits Auto Import cron will stop with process exit');
  
  // Stop Music Scheduler
  try {
    const musicScheduler = require('./modules/music/music-scheduler');
    musicScheduler.stop();
  } catch (error) {
    console.error('Music Scheduler stop error:', error.message);
  }

  // Stop Automated Music System
  try {
    const { getInstance: getAutoMusicScheduler } = require('./schedulers/auto-music-system.scheduler');
    const autoMusicScheduler = getAutoMusicScheduler();
    autoMusicScheduler.stop();
    console.log('🤖 Automated Music System stopped');
  } catch (error) {
    console.error('Automated Music System stop error:', error.message);
  }
  
  // Disconnect Steam Bot
  try {
    const steamBot = getSteamBot();
    steamBot.disconnect();
  } catch (error) {
    console.error('Steam Bot disconnect error:', error.message);
  }
  
  // Disconnect from Redis
  await redisService.disconnect();
  
  // Disconnect from TeamSpeak
  await teamspeakService.disconnect();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };

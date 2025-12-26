/**
 * Core Server
 * HTTP сервер и запуск приложения
 */
const http = require('http');
const cron = require('node-cron');
const { createApp } = require('./app');
const { initializeSocket } = require('./socket');
const { testConnection, syncDatabase } = require('./database');
const moduleLoader = require('./moduleLoader');

// Services that need initialization
const teamspeakService = require('../services/teamspeakService');
const redisService = require('../services/redisService');
const { getSteamBot } = require('../services/steamBotService');
const trackDiscoveryService = require('../modules/music/track-discovery.service');
const albumDiscoveryService = require('../modules/music/album-discovery.service');
const autoImportAlbumsService = require('../modules/music/auto-import-albums');

/**
 * Start the server
 */
async function startServer() {
  const PORT = process.env.PORT || 3001;

  try {
    console.log('🚀 Starting ErrorParty Backend...');
    console.log('📦 Architecture: Modular');

    // 1. Test database connection
    console.log('\n📊 Connecting to database...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // 2. Sync database models
    // await syncDatabase(); // Uncomment if you want auto-sync

    // 3. Create Express app
    console.log('\n⚙️ Configuring Express application...');
    const app = createApp();

    // 4. Create HTTP server
    const server = http.createServer(app);

    // 5. Initialize Socket.IO
    console.log('\n🔌 Initializing Socket.IO...');
    const io = initializeSocket(server);

    // 6. Load and initialize modules
    console.log('');
    await moduleLoader.loadModules();
    await moduleLoader.initializeModules(app, io);

    // 7. Initialize external services
    console.log('\n🔧 Initializing services...');
    await initializeServices(io);

    // 8. Setup scheduled tasks
    console.log('\n⏰ Setting up scheduled tasks...');
    setupScheduledTasks();

    // 9. Error handling
    setupErrorHandling(app);

    // 10. Start listening
    server.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log('\n🎉 ErrorParty Backend is ready!\n');
    });

    // Handle graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Initialize external services
 */
async function initializeServices(io) {
  try {
    // Redis
    if (process.env.REDIS_URL) {
      await redisService.connect();
      console.log('  ✓ Redis connected');
    }

    // TeamSpeak
    if (process.env.TS_HOST) {
      await teamspeakService.connect();
      console.log('  ✓ TeamSpeak connected');
      
      // Set up TeamSpeak event handlers with Socket.IO
      teamspeakService.on('clientConnect', (client) => {
        io.emit('teamspeak:join', client);
      });
      
      teamspeakService.on('clientDisconnect', (client) => {
        io.emit('teamspeak:leave', client);
      });
    }

    // Steam Bot (CS2)
    if (process.env.ENABLE_STEAM_BOT === 'true') {
      const bot = getSteamBot();
      bot.connect();
      console.log('  ✓ Steam Bot initialized');
    }

  } catch (error) {
    console.warn('⚠️ Some services failed to initialize:', error.message);
  }
}

/**
 * Setup error handling
 */
function setupErrorHandling(app) {
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    });
  });
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(server) {
  const shutdown = async () => {
    console.log('\n📴 Shutting down gracefully...');
    
    // Stop Smart Playlists Scheduler
    try {
      const smartPlaylistsScheduler = require('../schedulers/smart-playlists.scheduler');
      smartPlaylistsScheduler.stop();
      console.log('  ✓ Smart Playlists scheduler stopped');
    } catch (error) {
      // Ignore if not loaded
    }
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Forced shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Setup scheduled tasks (cron jobs)
 */
function setupScheduledTasks() {
  console.log('⏰ Setting up scheduled tasks...');
  
  // Автоматический импорт свежих альбомов каждый день в 3:00 AM
  if (process.env.ENABLE_AUTO_ALBUM_IMPORT !== 'false') {
    autoImportAlbumsService.startScheduledImport();
    console.log('  ✓ Auto album import scheduled (daily at 3:00 AM)');
  } else {
    console.log('  ⏭️ Auto album import disabled');
  }
  
  // Автоматическая загрузка треков каждый день в 3:00 AM
  if (process.env.ENABLE_AUTO_TRACK_DISCOVERY !== 'false') {
    cron.schedule('0 3 * * *', async () => {
      console.log('🎵 Running scheduled track discovery...');
      try {
        const result = await trackDiscoveryService.discoverAndImportTracks({
          limit: 30,
          genres: ['pop', 'electronic', 'rock', 'jazz', 'ambient', 'classical'],
          minRating: 7.5
        });
        console.log(`✅ Track discovery completed: ${result.imported} new tracks imported`);
      } catch (error) {
        console.error('❌ Scheduled track discovery failed:', error);
      }
    });
    console.log('  ✓ Track discovery scheduled (daily at 3:00 AM)');
  } else {
    console.log('  ⏭️ Track discovery disabled');
  }

  // Очистка старых треков каждый понедельник в 4:00 AM
  if (process.env.ENABLE_TRACK_CLEANUP !== 'false') {
    cron.schedule('0 4 * * 1', async () => {
      console.log('🧹 Running scheduled track cleanup...');
      try {
        const deleted = await trackDiscoveryService.cleanupUnpopularTracks({
          maxAge: 90,
          minPlays: 5
        });
        console.log(`✅ Track cleanup completed: ${deleted} tracks removed`);
      } catch (error) {
        console.error('❌ Scheduled track cleanup failed:', error);
      }
    });
    console.log('  ✓ Track cleanup scheduled (Mondays at 4:00 AM)');
  } else {
    console.log('  ⏭️ Track cleanup disabled');
  }

  // Автоматическая загрузка альбомов каждый день в 3:30 AM
  if (process.env.ENABLE_AUTO_ALBUM_DISCOVERY !== 'false') {
    cron.schedule('30 3 * * *', async () => {
      console.log('💿 Running scheduled album discovery...');
      try {
        const result = await albumDiscoveryService.importAlbums(15);
        console.log(`✅ Album discovery completed: ${result.imported} new albums imported`);
      } catch (error) {
        console.error('❌ Scheduled album discovery failed:', error);
      }
    });
    console.log('  ✓ Album discovery scheduled (daily at 3:30 AM)');
  } else {
    console.log('  ⏭️ Album discovery disabled');
  }

  // Очистка старых альбомов каждый понедельник в 4:30 AM
  if (process.env.ENABLE_ALBUM_CLEANUP !== 'false') {
    cron.schedule('30 4 * * 1', async () => {
      console.log('🧹 Running scheduled album cleanup...');
      try {
        const deleted = await albumDiscoveryService.cleanupUnpopularAlbums();
        console.log(`✅ Album cleanup completed: ${deleted} albums removed`);
      } catch (error) {
        console.error('❌ Scheduled album cleanup failed:', error);
      }
    });
    console.log('  ✓ Album cleanup scheduled (Mondays at 4:30 AM)');
  } else {
    console.log('  ⏭️ Album cleanup disabled');
  }

  // Smart Playlists - Умные подборки музыки
  if (process.env.ENABLE_SMART_PLAYLISTS !== 'false') {
    try {
      const smartPlaylistsScheduler = require('../schedulers/smart-playlists.scheduler');
      smartPlaylistsScheduler.start();
      console.log('  ✓ Smart Playlists scheduler started');
      console.log('    • Daily playlists update (4:00 AM)');
      console.log('    • Weekly playlists update (Monday 3:00 AM)');
      console.log('    • Daily soundtrack refresh (every 6 hours)');
    } catch (error) {
      console.error('  ⚠️ Smart Playlists scheduler failed to start:', error.message);
    }
  } else {
    console.log('  ⏭️ Smart Playlists scheduler disabled');
  }
}

module.exports = { startServer };

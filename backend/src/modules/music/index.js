/**
 * Music Module - Оптимизированный модуль с минимальным функционалом
 */
const musicRoutes = require('./music.routes');
const adminMusicRoutes = require('./admin-music.routes');
const kissvkRoutes = require('./kissvk.routes');
const musicService = require('./music.service');
const musicScheduler = require('./music-scheduler');

module.exports = {
  name: 'music',
  routePrefix: '/api/music',
  routes: musicRoutes,
  services: musicService,

  /**
   * Initialize music module
   */
  async initialize(app, io) {
    // Register admin routes
    app.use('/api/admin/music', adminMusicRoutes);
    console.log('  🎵 Music module ready (admin routes: /api/admin/music)');

    // Register KissVK routes
    app.use('/api/kissvk', kissvkRoutes);
    console.log('  💋 KissVK routes ready (routes: /api/kissvk)');

    // Start Music Scheduler
    try {
      musicScheduler.start();
      console.log('  ⏰ Music Scheduler started');
    } catch (error) {
      console.error('  ❌ Music Scheduler failed:', error.message);
    }
    
    // Setup Socket.IO для real-time обновлений плеера
    if (io) {
      io.on('connection', (socket) => {
        // Трансляция текущего трека
        socket.on('music:nowPlaying', (data) => {
          socket.broadcast.emit('music:nowPlaying', data);
        });
        
        // Обновление прогресса трека
        socket.on('music:progress', (data) => {
          socket.broadcast.emit('music:progress', data);
        });
      });
    }
  }
};


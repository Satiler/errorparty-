/**
 * CS2 Module
 * Counter-Strike 2 игровая статистика и матчи
 */
const cs2Routes = require('./cs2.routes');

module.exports = {
  name: 'cs2',
  routePrefix: '/api/cs2',
  routes: cs2Routes,

  /**
   * Initialize CS2 module
   */
  async initialize(app, io) {
    console.log('  🎮 CS2 module ready');
    
    // Setup Socket.IO events for live CS2 updates
    if (io) {
      io.on('connection', (socket) => {
        // CS2 match updates
        socket.on('cs2:subscribe', (steamId) => {
          socket.join(`cs2:${steamId}`);
        });

        socket.on('cs2:unsubscribe', (steamId) => {
          socket.leave(`cs2:${steamId}`);
        });
      });
    }

    // Export socket for use in controllers
    this.io = io;
  },

  /**
   * Emit match update to client
   */
  emitMatchUpdate(steamId, matchData) {
    if (this.io) {
      this.io.to(`cs2:${steamId}`).emit('cs2:match:update', matchData);
    }
  }
};

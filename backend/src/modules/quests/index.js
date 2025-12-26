/**
 * Quests Module
 * Система квестов и достижений
 */
const questRoutes = require('./quests.routes');

module.exports = {
  name: 'quests',
  routePrefix: '/api/quests',
  routes: questRoutes,

  /**
   * Initialize quests module
   */
  async initialize(app, io) {
    console.log('  🎯 Quests module ready');
    
    // Setup Socket.IO events for quest updates
    if (io) {
      io.on('connection', (socket) => {
        // Quest progress updates
        socket.on('quests:subscribe', (userId) => {
          socket.join(`quests:${userId}`);
        });

        socket.on('quests:unsubscribe', (userId) => {
          socket.leave(`quests:${userId}`);
        });
      });
    }

    this.io = io;
  },

  /**
   * Emit quest progress update
   */
  emitQuestUpdate(userId, questData) {
    if (this.io) {
      this.io.to(`quests:${userId}`).emit('quests:update', questData);
    }
  },

  /**
   * Emit quest completed
   */
  emitQuestCompleted(userId, questData) {
    if (this.io) {
      this.io.to(`quests:${userId}`).emit('quests:completed', questData);
    }
  }
};

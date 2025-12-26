/**
 * User Module
 * Управление профилями пользователей
 */
const userRoutes = require('./user.routes');

module.exports = {
  name: 'user',
  routePrefix: '/api/user',
  routes: userRoutes,

  /**
   * Initialize user module
   */
  async initialize(app, io) {
    console.log('  👤 User module ready');
    
    // Setup Socket.IO events for user updates
    if (io) {
      io.on('connection', (socket) => {
        socket.on('user:subscribe', (userId) => {
          socket.join(`user:${userId}`);
        });

        socket.on('user:unsubscribe', (userId) => {
          socket.leave(`user:${userId}`);
        });
      });
    }

    this.io = io;
  },

  /**
   * Emit user profile update
   */
  emitProfileUpdate(userId, userData) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('user:profile:update', userData);
    }
  }
};

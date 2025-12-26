/**
 * Notifications Module
 * Push-уведомления (Web Push)
 */
const notificationRoutes = require('./notifications.routes');

module.exports = {
  name: 'notifications',
  routePrefix: '/api/notifications',
  routes: notificationRoutes,

  /**
   * Initialize notifications module
   */
  async initialize(app, io) {
    console.log('  🔔 Notifications module ready');
    
    // Setup Socket.IO events for real-time notifications
    if (io) {
      io.on('connection', (socket) => {
        socket.on('notifications:subscribe', (userId) => {
          socket.join(`notifications:${userId}`);
        });

        socket.on('notifications:unsubscribe', (userId) => {
          socket.leave(`notifications:${userId}`);
        });

        socket.on('notifications:mark-read', async (notificationId) => {
          // Mark notification as read
          socket.emit('notifications:read', { id: notificationId });
        });
      });
    }

    this.io = io;
  },

  /**
   * Send notification to user
   */
  sendNotification(userId, notification) {
    if (this.io) {
      this.io.to(`notifications:${userId}`).emit('notification', notification);
    }
  },

  /**
   * Broadcast notification to all users
   */
  broadcastNotification(notification) {
    if (this.io) {
      this.io.emit('notification:broadcast', notification);
    }
  }
};

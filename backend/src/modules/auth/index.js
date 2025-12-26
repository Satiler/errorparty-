/**
 * Auth Module
 * Модуль аутентификации через Steam
 */
const authRoutes = require('./auth.routes');
const authService = require('./auth.service');

module.exports = {
  name: 'auth',
  routePrefix: '/api/auth',
  skipRouteRegistration: true, // Отключен - используется legacy auth
  routes: authRoutes,
  services: authService,

  /**
   * Initialize auth module
   */
  async initialize(app, io) {
    console.log('  🔐 Auth module ready (disabled - using legacy routes)');
    
    // Setup Socket.IO auth events if needed
    if (io) {
      io.on('connection', (socket) => {
        socket.on('auth:verify', (data) => {
          authService.verifyToken(data.token)
            .then(user => socket.emit('auth:verified', { success: true, user }))
            .catch(err => socket.emit('auth:verified', { success: false, error: err.message }));
        });
      });
    }
  }
};

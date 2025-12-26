/**
 * Admin Module
 * Административные функции (только для разработки)
 */
const adminRoutes = require('./admin.routes');
const { getSteamBot } = require('../../services/steamBotService');

module.exports = {
  name: 'admin',
  routePrefix: '/api/bot', // Используем /api/bot для обратной совместимости
  routes: adminRoutes,

  /**
   * Initialize admin module
   */
  async initialize(app, io) {
    console.log('  🔧 Admin module ready (development only)');
    
    // Warn about security
    if (process.env.NODE_ENV === 'production') {
      console.warn('  ⚠️  WARNING: Admin endpoints active in production!');
      console.warn('  ⚠️  Make sure ADMIN_IPS is properly configured');
    }
  }
};

/**
 * Home Module
 * Главная страница и общая статистика
 */
const homeRoutes = require('./home.routes');

module.exports = {
  name: 'home',
  routePrefix: '/api/home',
  routes: homeRoutes,

  /**
   * Initialize home module
   */
  async initialize(app, io) {
    console.log('  🏠 Home module ready');
  }
};

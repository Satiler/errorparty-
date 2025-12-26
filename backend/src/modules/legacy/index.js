/**
 * Legacy Module
 * Подключение старых роутов для обратной совместимости
 */
const express = require('express');
const router = express.Router();

module.exports = {
  name: 'legacy',
  skipRouteRegistration: true, // Не регистрируем через moduleLoader
  
  /**
   * Initialize legacy routes
   */
  async initialize(app, io) {
    console.log('  📦 Legacy routes module');
    
    try {
      // Подключаем старые роуты напрямую к app
      
      // Auth (старая авторизация с /verify и /profile)
      const authRoutes = require('../../routes/auth');
      app.use('/api/auth', authRoutes);
      console.log('    ✓ /api/auth (legacy)');
      
      // Server status
      const serverRoutes = require('../../routes/server');
      app.use('/api/server', serverRoutes);
      console.log('    ✓ /api/server');
      
      // Steam
      const steamRoutes = require('../../routes/steam');
      app.use('/api/steam', steamRoutes);
      console.log('    ✓ /api/steam');
      
      // Quotes
      const quotesRoutes = require('../../routes/quotes');
      app.use('/api/quotes', quotesRoutes);
      console.log('    ✓ /api/quotes');
      
      // Memes
      const memesRoutes = require('../../routes/memes');
      app.use('/api/memes', memesRoutes);
      console.log('    ✓ /api/memes');
      
      // Events
      const eventsRoutes = require('../../routes/events');
      app.use('/api/events', eventsRoutes);
      console.log('    ✓ /api/events');
      
      // Hall of Fame
      const halloffameRoutes = require('../../routes/halloffame');
      app.use('/api/halloffame', halloffameRoutes);
      console.log('    ✓ /api/halloffame');
      
      // Users (список пользователей)
      const usersRoutes = require('../../routes/users');
      app.use('/api/users', usersRoutes);
      console.log('    ✓ /api/users');
      
      // CS2 Stats (публичные статы)
      const cs2StatsRoutes = require('../../routes/cs2Stats');
      app.use('/api/cs2-stats', cs2StatsRoutes);
      console.log('    ✓ /api/cs2-stats');
      
      // GSI (Game State Integration)
      const gsiRoutes = require('../../routes/gsi');
      app.use('/api/gsi', gsiRoutes);
      console.log('    ✓ /api/gsi');
      
      // Dota2
      const dota2Routes = require('../../routes/dota2');
      app.use('/api/dota2', dota2Routes);
      console.log('    ✓ /api/dota2');
      
      const dota2GlobalRoutes = require('../../routes/dota2Global');
      app.use('/api/dota2-global', dota2GlobalRoutes);
      console.log('    ✓ /api/dota2-global');
      
      // Dashboard
      const dashboardRoutes = require('../../routes/dashboard');
      app.use('/api/dashboard', dashboardRoutes);
      console.log('    ✓ /api/dashboard');
      
      // Admin
      const adminRoutes = require('../../routes/admin');
      app.use('/api/admin', adminRoutes);
      console.log('    ✓ /api/admin');
      
      console.log('  ✅ Legacy routes loaded');
    } catch (error) {
      console.error('  ❌ Error loading legacy routes:', error.message);
    }
  }
};

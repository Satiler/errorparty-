const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const autoUpdateScheduler = require('./scheduler/auto-update.scheduler');
const autoUpdateRoutes = require('./routes/auto-update.routes');

/**
 * Инициализация и запуск системы автообновления
 */
class AutoUpdateSystem {
  constructor() {
    this.app = express();
    this.port = process.env.AUTO_UPDATE_PORT || 3001;
  }

  /**
   * Настройка middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Настройка маршрутов
   */
  setupRoutes() {
    this.app.use('/api/auto-update', autoUpdateRoutes);

    // Health check
    this.app.get('/health', (req, res) => {
      const status = autoUpdateScheduler.getStatus();
      res.json({
        status: 'ok',
        scheduler: status,
        timestamp: new Date().toISOString()
      });
    });

    // 404
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    });
  }

  /**
   * Запуск планировщика
   */
  startScheduler() {
    try {
      autoUpdateScheduler.start();
      logger.info('✓ Планировщик автообновлений запущен');
    } catch (error) {
      logger.error('Ошибка запуска планировщика:', error);
    }
  }

  /**
   * Запуск сервера
   */
  start() {
    this.setupMiddleware();
    this.setupRoutes();

    this.server = this.app.listen(this.port, () => {
      logger.info('='.repeat(60));
      logger.info('🎵 Система автообновления плейлистов запущена');
      logger.info(`🌐 Сервер: http://localhost:${this.port}`);
      logger.info(`📊 Health check: http://localhost:${this.port}/health`);
      logger.info('='.repeat(60));

      // Запуск планировщика
      this.startScheduler();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  /**
   * Остановка системы
   */
  stop() {
    logger.info('Остановка системы автообновления...');

    // Остановка планировщика
    autoUpdateScheduler.stop();

    // Остановка сервера
    if (this.server) {
      this.server.close(() => {
        logger.info('✓ Сервер остановлен');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// Запуск, если файл запущен напрямую
if (require.main === module) {
  const system = new AutoUpdateSystem();
  system.start();
}

module.exports = AutoUpdateSystem;

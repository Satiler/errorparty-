const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config/charts-config');
const kissvkConfig = require('../config/kissvk-config');
const playlistActualizationService = require('../services/playlist-actualization.service');
const kissvkAutoImportService = require('../services/kissvk-auto-import.service');
const recommendationService = require('../services/recommendation.service');

class AutoUpdateScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * Запуск планировщика
   */
  start() {
    if (this.isRunning) {
      logger.warn('Планировщик уже запущен');
      return;
    }

    logger.info('Запуск планировщика автообновлений...');

    // Задача 1: Обновление плейлистов из чартов
    if (config.updateSchedule.enabled) {
      const chartsTask = cron.schedule(
        config.updateSchedule.cronExpression,
        () => this.updatePlaylistsFromCharts(),
        {
          timezone: config.updateSchedule.timezone
        }
      );
      this.tasks.push({ name: 'charts-update', task: chartsTask });
      logger.info(`Задача "charts-update" запланирована: ${config.updateSchedule.cronExpression}`);
    }

    // Задача 2: Импорт новинок с kissvk
    if (kissvkConfig.updateSchedule.enabled) {
      const kissvkTask = cron.schedule(
        kissvkConfig.updateSchedule.cronExpression,
        () => this.importFromKissVK(),
        {
          timezone: kissvkConfig.updateSchedule.timezone
        }
      );
      this.tasks.push({ name: 'kissvk-import', task: kissvkTask });
      logger.info(`Задача "kissvk-import" запланирована: ${kissvkConfig.updateSchedule.cronExpression}`);
    }

    // Задача 3: Обновление популярности треков (каждый час)
    const popularityTask = cron.schedule(
      '0 * * * *',
      () => this.updateTracksPopularity(),
      {
        timezone: config.updateSchedule.timezone
      }
    );
    this.tasks.push({ name: 'popularity-update', task: popularityTask });
    logger.info('Задача "popularity-update" запланирована: каждый час');

    // Задача 4: Очистка старых данных (раз в неделю)
    const cleanupTask = cron.schedule(
      '0 2 * * 0',
      () => this.cleanupOldData(),
      {
        timezone: config.updateSchedule.timezone
      }
    );
    this.tasks.push({ name: 'cleanup', task: cleanupTask });
    logger.info('Задача "cleanup" запланирована: каждое воскресенье в 2:00');

    this.isRunning = true;
    logger.info(`Планировщик запущен. Активных задач: ${this.tasks.length}`);
  }

  /**
   * Остановка планировщика
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Планировщик не запущен');
      return;
    }

    logger.info('Остановка планировщика...');

    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`Задача "${name}" остановлена`);
    });

    this.tasks = [];
    this.isRunning = false;
    logger.info('Планировщик остановлен');
  }

  /**
   * Обновление плейлистов из чартов
   */
  async updatePlaylistsFromCharts() {
    logger.info('=== Начало обновления плейлистов из чартов ===');
    const startTime = Date.now();

    try {
      const results = [];

      for (const playlistConfig of config.managedPlaylists) {
        try {
          logger.info(`Обработка плейлиста: ${playlistConfig.name}`);
          
          const result = await playlistActualizationService.actualizePlaylist(
            playlistConfig.id
          );

          results.push({
            playlist: playlistConfig.name,
            success: true,
            changes: result.changes.summary
          });

          logger.info(`✓ Плейлист "${playlistConfig.name}" обновлён`, result.changes.summary);
        } catch (error) {
          logger.error(`Ошибка обновления плейлиста ${playlistConfig.name}:`, error);
          results.push({
            playlist: playlistConfig.name,
            success: false,
            error: error.message
          });
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`=== Обновление плейлистов завершено за ${duration}с ===`);
      logger.info('Результаты:', results);

      // Отправка уведомления администраторам
      if (config.logging.notifyAdmins) {
        await this.notifyAdmins('Плейлисты обновлены', results);
      }

      return results;
    } catch (error) {
      logger.error('Критическая ошибка обновления плейлистов:', error);
      throw error;
    }
  }

  /**
   * Импорт треков с kissvk
   */
  async importFromKissVK() {
    logger.info('=== Начало импорта с kissvk ===');
    const startTime = Date.now();

    try {
      kissvkAutoImportService.resetStats();

      // Импорт новых релизов
      if (kissvkConfig.importCategories.newReleases.enabled) {
        await kissvkAutoImportService.importNewReleases();
      }

      // Импорт топ-чартов
      if (kissvkConfig.importCategories.topCharts.enabled) {
        const charts = await kissvkAutoImportService.fetchTopCharts();
        logger.info(`Найдено ${charts.length} треков в чартах kissvk`);
      }

      const stats = kissvkAutoImportService.getStats();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`=== Импорт с kissvk завершён за ${duration}с ===`);
      logger.info('Статистика:', stats);

      // Уведомление
      if (kissvkConfig.notifications.enabled) {
        await this.notifyAdmins('Импорт с kissvk завершён', stats);
      }

      return stats;
    } catch (error) {
      logger.error('Критическая ошибка импорта с kissvk:', error);
      throw error;
    }
  }

  /**
   * Обновление популярности треков
   */
  async updateTracksPopularity() {
    logger.info('=== Начало обновления популярности треков ===');

    try {
      const db = require('../../config/database');
      
      // Получение активных треков
      const query = `
        SELECT id FROM tracks
        WHERE created_at > NOW() - INTERVAL '90 days'
          OR updated_at > NOW() - INTERVAL '7 days'
      `;

      const result = await db.query(query);
      const trackIds = result.rows.map(row => row.id);

      logger.info(`Обновление популярности для ${trackIds.length} треков`);

      let updated = 0;
      for (const trackId of trackIds) {
        try {
          await recommendationService.updateTrackPopularity(trackId);
          updated++;
        } catch (error) {
          logger.error(`Ошибка обновления популярности трека ${trackId}:`, error);
        }
      }

      logger.info(`=== Обновлено ${updated} из ${trackIds.length} треков ===`);
    } catch (error) {
      logger.error('Ошибка обновления популярности:', error);
    }
  }

  /**
   * Очистка старых данных
   */
  async cleanupOldData() {
    logger.info('=== Начало очистки старых данных ===');

    try {
      const db = require('../../config/database');
      let totalDeleted = 0;

      // Удаление старых записей истории прослушивания (старше 6 месяцев)
      const deleteHistoryQuery = `
        DELETE FROM listening_history
        WHERE played_at < NOW() - INTERVAL '6 months'
      `;
      const historyResult = await db.query(deleteHistoryQuery);
      totalDeleted += historyResult.rowCount;
      logger.info(`Удалено записей истории: ${historyResult.rowCount}`);

      // Удаление старых pending changes (старше 30 дней)
      const deletePendingQuery = `
        DELETE FROM playlist_pending_changes
        WHERE created_at < NOW() - INTERVAL '30 days'
          AND status != 'pending'
      `;
      const pendingResult = await db.query(deletePendingQuery);
      totalDeleted += pendingResult.rowCount;
      logger.info(`Удалено старых изменений: ${pendingResult.rowCount}`);

      // Удаление неиспользуемых треков (не в плейлистах, не в избранном, старше 90 дней)
      const deleteTracksQuery = `
        DELETE FROM tracks t
        WHERE t.created_at < NOW() - INTERVAL '90 days'
          AND NOT EXISTS (
            SELECT 1 FROM playlist_tracks pt WHERE pt.track_id = t.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM user_favorites uf WHERE uf.track_id = t.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM listening_history lh 
            WHERE lh.track_id = t.id 
              AND lh.played_at > NOW() - INTERVAL '30 days'
          )
      `;
      const tracksResult = await db.query(deleteTracksQuery);
      totalDeleted += tracksResult.rowCount;
      logger.info(`Удалено неиспользуемых треков: ${tracksResult.rowCount}`);

      logger.info(`=== Очистка завершена. Всего удалено записей: ${totalDeleted} ===`);
    } catch (error) {
      logger.error('Ошибка очистки данных:', error);
    }
  }

  /**
   * Отправка уведомлений администраторам
   */
  async notifyAdmins(subject, data) {
    try {
      logger.info(`Уведомление: ${subject}`, data);
      
      // Здесь можно добавить отправку email, Telegram и т.д.
      // Пример: await emailService.send(...)
      // Пример: await telegramService.sendMessage(...)
      
    } catch (error) {
      logger.error('Ошибка отправки уведомления:', error);
    }
  }

  /**
   * Ручной запуск задачи
   */
  async runTask(taskName) {
    logger.info(`Ручной запуск задачи: ${taskName}`);

    switch (taskName) {
      case 'charts-update':
        return await this.updatePlaylistsFromCharts();
      case 'kissvk-import':
        return await this.importFromKissVK();
      case 'popularity-update':
        return await this.updateTracksPopularity();
      case 'cleanup':
        return await this.cleanupOldData();
      default:
        throw new Error(`Неизвестная задача: ${taskName}`);
    }
  }

  /**
   * Получить статус планировщика
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: this.tasks.map(({ name, task }) => ({
        name,
        isRunning: task ? true : false
      }))
    };
  }
}

module.exports = new AutoUpdateScheduler();

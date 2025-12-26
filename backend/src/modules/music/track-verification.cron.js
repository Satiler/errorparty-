/**
 * Track Verification Cron
 * Фоновая проверка доступности треков и автокеширование популярных
 */

const cron = require('node-cron');
const musicSourceManager = require('./music-source-manager');
const streamingStrategy = require('./streaming-strategy.service');

class TrackVerificationCron {
  constructor() {
    this.isRunning = false;
    this.stats = {
      lastRun: null,
      tracksVerified: 0,
      tracksCached: 0,
      tracksFailed: 0
    };
  }

  /**
   * Запустить все cron задачи
   */
  start() {
    console.log('[TrackVerificationCron] Starting cron jobs...');

    // Верификация треков каждые 6 часов (в 00:00, 06:00, 12:00, 18:00)
    cron.schedule('0 */6 * * *', async () => {
      console.log('[TrackVerificationCron] Starting track verification...');
      await this.runVerification();
    });

    // Автокеширование популярных треков каждый час
    cron.schedule('0 * * * *', async () => {
      console.log('[TrackVerificationCron] Starting auto-cache...');
      await this.runAutoCache();
    });

    // Очистка битых треков раз в день (в 03:00)
    cron.schedule('0 3 * * *', async () => {
      console.log('[TrackVerificationCron] Starting cleanup of broken tracks...');
      await this.runCleanup();
    });

    // Регенерация плейлистов раз в неделю (каждое воскресенье в 04:00)
    cron.schedule('0 4 * * 0', async () => {
      console.log('[TrackVerificationCron] Starting playlist regeneration...');
      await this.runPlaylistGeneration();
    });

    // Обновление Discover Weekly для всех пользователей (каждый понедельник в 05:00)
    cron.schedule('0 5 * * 1', async () => {
      console.log('[TrackVerificationCron] Starting Discover Weekly generation...');
      await this.runDiscoverWeeklyGeneration();
    });

    console.log('[TrackVerificationCron] All cron jobs scheduled successfully');
    console.log('  - Track verification: every 6 hours (00:00, 06:00, 12:00, 18:00)');
    console.log('  - Auto-cache: every hour');
    console.log('  - Cleanup: daily at 03:00');
    console.log('  - Playlist generation: weekly on Sunday at 04:00');
    console.log('  - Discover Weekly: weekly on Monday at 05:00');
  }

  /**
   * Верификация треков
   */
  async runVerification() {
    if (this.isRunning) {
      console.log('[TrackVerificationCron] Verification already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[TrackVerificationCron] Starting batch verification...');
      
      const result = await musicSourceManager.batchVerifyTracks(100);
      
      this.stats.lastRun = new Date();
      this.stats.tracksVerified = result.verified;
      this.stats.tracksFailed = result.failed;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[TrackVerificationCron] Verification complete in ${duration}s:`, {
        total: result.total,
        verified: result.verified,
        failed: result.failed,
        refreshed: result.refreshed
      });

    } catch (error) {
      console.error('[TrackVerificationCron] Verification error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Автокеширование популярных треков
   */
  async runAutoCache() {
    if (this.isRunning) {
      console.log('[TrackVerificationCron] Auto-cache skipped (verification running)...');
      return;
    }

    try {
      console.log('[TrackVerificationCron] Starting auto-cache...');
      
      const result = await streamingStrategy.autoCache(10); // Кешируем 10 треков за раз
      
      this.stats.tracksCached += result.cached;

      console.log(`[TrackVerificationCron] Auto-cache complete:`, {
        cached: result.cached,
        failed: result.failed,
        total: this.stats.tracksCached
      });

    } catch (error) {
      console.error('[TrackVerificationCron] Auto-cache error:', error);
    }
  }

  /**
   * Очистка битых треков
   */
  async runCleanup() {
    try {
      console.log('[TrackVerificationCron] Starting cleanup...');
      
      const { Track } = require('../../models');
      const { Op } = require('sequelize');

      // Удаляем треки которые:
      // - Не верифицированы (isVerified = false)
      // - Последняя проверка > 7 дней назад
      // - Количество прослушиваний = 0
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const deletedCount = await Track.destroy({
        where: {
          isVerified: false,
          lastChecked: { [Op.lt]: sevenDaysAgo },
          playCount: 0
        }
      });

      console.log(`[TrackVerificationCron] Cleanup complete: deleted ${deletedCount} broken tracks`);

    } catch (error) {
      console.error('[TrackVerificationCron] Cleanup error:', error);
    }
  }

  /**
   * Получить статистику cron задач
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: this.stats.lastRun ? Date.now() - this.stats.lastRun.getTime() : null
    };
  }

  /**
   * Принудительный запуск верификации
   */
  async forceVerification(limit = 50) {
    console.log(`[TrackVerificationCron] Force verification requested (limit: ${limit})`);
    return await musicSourceManager.batchVerifyTracks(limit);
  }

  /**
   * Принудительный запуск кеширования
   */
  async forceCache(limit = 5) {
    console.log(`[TrackVerificationCron] Force cache requested (limit: ${limit})`);
    return await streamingStrategy.autoCache(limit);
  }

  /**
   * Регенерация плейлистов
   */
  async runPlaylistGeneration() {
    if (this.isRunning) {
      console.log('[TrackVerificationCron] Another task is running, skipping playlist generation...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[TrackVerificationCron] Starting playlist generation...');
      
      const playlistGenerator = require('./playlist-generator.service');
      const result = await playlistGenerator.generateAllPlaylists();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[TrackVerificationCron] Playlist generation complete in ${duration}s:`, result.summary);

      return result;
    } catch (error) {
      console.error('[TrackVerificationCron] Playlist generation failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Генерация Discover Weekly для всех пользователей
   */
  async runDiscoverWeeklyGeneration() {
    if (this.isRunning) {
      console.log('[TrackVerificationCron] Another task is running, skipping Discover Weekly...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[TrackVerificationCron] Starting Discover Weekly generation...');
      
      const discoverWeekly = require('./discover-weekly.service');
      const result = await discoverWeekly.generateForAllUsers();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[TrackVerificationCron] Discover Weekly complete in ${duration}s: ${result.successful}/${result.total} users`);

      return result;
    } catch (error) {
      console.error('[TrackVerificationCron] Discover Weekly generation failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

// Singleton instance
const trackVerificationCron = new TrackVerificationCron();

module.exports = trackVerificationCron;

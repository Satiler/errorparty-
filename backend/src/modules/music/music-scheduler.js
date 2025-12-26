const cron = require('node-cron');
const musicAutoSyncService = require('./music-auto-sync.service');
const smartPlaylistsService = require('./smart-playlists.service');
const { User } = require('../../models');

/**
 * Планировщик задач для музыкальной системы
 */
class MusicScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Запуск всех cron-задач
   */
  start() {
    console.log('⏰ Запуск планировщика музыки...');

    // 1. Обновление плейлистов каждый день в 00:00
    const dailyPlaylistsJob = cron.schedule('0 0 * * *', async () => {
      console.log('\n🌅 === ЕЖЕДНЕВНОЕ ОБНОВЛЕНИЕ ПЛЕЙЛИСТОВ ===');
      try {
        const users = await User.findAll({ attributes: ['id'] });
        console.log(`👥 Обновление плейлистов для ${users.length} пользователей`);

        for (const user of users) {
          try {
            await smartPlaylistsService.updateAllPlaylists(user.id);
            console.log(`✅ Плейлисты обновлены для пользователя ${user.id}`);
          } catch (error) {
            console.error(`❌ Ошибка для пользователя ${user.id}:`, error.message);
          }
        }

        console.log('✨ Ежедневное обновление завершено!');
      } catch (error) {
        console.error('❌ Ошибка ежедневного обновления:', error);
      }
    });

    // 2. Импорт новинок каждые 6 часов
    const newReleasesJob = cron.schedule('0 */6 * * *', async () => {
      console.log('\n🆕 === АВТОМАТИЧЕСКИЙ ИМПОРТ НОВИНОК ===');
      try {
        const results = await musicAutoSyncService.importNewReleases(30);
        console.log(`✅ Импортировано новинок: ${results.imported.length}`);
        console.log(`⏭️  Пропущено дубликатов: ${results.skipped.length}`);
      } catch (error) {
        console.error('❌ Ошибка импорта новинок:', error);
      }
    });

    // 3. Обновление чартов каждый день в 12:00
    const chartsUpdateJob = cron.schedule('0 12 * * *', async () => {
      console.log('\n📊 === ОБНОВЛЕНИЕ ЧАРТОВ ===');
      try {
        const results = await musicAutoSyncService.importFromCharts(50);
        console.log(`✅ Импортировано треков из чартов: ${results.imported.length}`);
      } catch (error) {
        console.error('❌ Ошибка обновления чартов:', error);
      }
    });

    // 4. Полная синхронизация по воскресеньям в 03:00
    const fullSyncJob = cron.schedule('0 3 * * 0', async () => {
      console.log('\n🔄 === ПОЛНАЯ СИНХРОНИЗАЦИЯ (ЕЖЕНЕДЕЛЬНАЯ) ===');
      try {
        const results = await musicAutoSyncService.fullSync({
          chartsLimit: 100,
          newReleasesLimit: 50
        });

        const stats = await musicAutoSyncService.getLibraryStats();
        console.log(`\n📊 Статистика библиотеки:`);
        console.log(`   Всего треков: ${stats.total}`);
        console.log(`   Внешних: ${stats.bySource.external}`);
        console.log(`   Локальных: ${stats.bySource.local}`);
        console.log(`   Новинок: ${stats.categories.newReleases}`);
        console.log(`   В чартах: ${stats.categories.charts}`);
      } catch (error) {
        console.error('❌ Ошибка полной синхронизации:', error);
      }
    });

    this.jobs = [
      { name: 'Ежедневное обновление плейлистов', schedule: '0 0 * * *', job: dailyPlaylistsJob },
      { name: 'Импорт новинок каждые 6 часов', schedule: '0 */6 * * *', job: newReleasesJob },
      { name: 'Обновление чартов', schedule: '0 12 * * *', job: chartsUpdateJob },
      { name: 'Полная синхронизация', schedule: '0 3 * * 0', job: fullSyncJob }
    ];

    console.log('✅ Планировщик запущен. Активные задачи:');
    this.jobs.forEach(job => {
      console.log(`   ⏰ ${job.name} - ${job.schedule}`);
    });
  }

  /**
   * Остановка всех задач
   */
  stop() {
    console.log('🛑 Остановка планировщика...');
    this.jobs.forEach(job => {
      job.job.stop();
    });
    this.jobs = [];
    console.log('✅ Планировщик остановлен');
  }

  /**
   * Ручной запуск задачи
   */
  async runTask(taskName) {
    console.log(`▶️  Запуск задачи: ${taskName}`);

    switch (taskName) {
      case 'update-playlists':
        const users = await User.findAll({ attributes: ['id'], limit: 10 });
        for (const user of users) {
          await smartPlaylistsService.updateAllPlaylists(user.id);
        }
        break;

      case 'import-new-releases':
        await musicAutoSyncService.importNewReleases(30);
        break;

      case 'update-charts':
        await musicAutoSyncService.importFromCharts(50);
        break;

      case 'full-sync':
        await musicAutoSyncService.fullSync();
        break;

      default:
        throw new Error(`Неизвестная задача: ${taskName}`);
    }

    console.log(`✅ Задача ${taskName} выполнена`);
  }

  /**
   * Получение статуса планировщика
   */
  getStatus() {
    return {
      running: this.jobs.length > 0,
      jobs: this.jobs.map(job => ({
        name: job.name,
        schedule: job.schedule,
        running: job.job.options.scheduled
      }))
    };
  }
}

module.exports = new MusicScheduler();

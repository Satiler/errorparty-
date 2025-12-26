/**
 * 🕐 Планировщик автоматической музыкальной системы
 * 
 * Автоматический запуск задач по расписанию:
 * - Импорт новых треков каждые 3 часа
 * - Обновление чартовых плейлистов каждые 6 часов
 * - Генерация персональных рекомендаций ежедневно
 * - Очистка устаревших данных еженедельно
 */

const cron = require('node-cron');
const { getInstance: getAutoMusicSystem } = require('../services/auto-music-system.service');
const logger = console;

class AutoMusicSystemScheduler {
  constructor() {
    this.autoMusicSystem = getAutoMusicSystem();
    this.tasks = [];
    this.isRunning = false;
    this.lastRun = {
      fullUpdate: null,
      import: null,
      playlists: null,
      recommendations: null
    };
  }

  /**
   * 🚀 Запуск планировщика
   */
  start() {
    if (this.isRunning) {
      logger.log('⚠️ Планировщик музыкальной системы уже запущен');
      return;
    }

    logger.log('\n🎵 ========================================');
    logger.log('🤖 ЗАПУСК АВТОМАТИЧЕСКОЙ МУЗЫКАЛЬНОЙ СИСТЕМЫ');
    logger.log('========================================\n');

    // Задача 1: ИМПОРТ НОВЫХ ТРЕКОВ (каждые 3 часа)
    const importTask = cron.schedule('0 */3 * * *', async () => {
      await this.runTask('import', async () => {
        logger.log('\n📥 === АВТОМАТИЧЕСКИЙ ИМПОРТ ТРЕКОВ ===');
        const result = await this.autoMusicSystem.importPopularTracks();
        this.lastRun.import = new Date();
        logger.log(`✅ Импортировано ${result.total} треков\n`);
      });
    });
    this.tasks.push({ name: 'import-tracks', cron: '0 */3 * * *', task: importTask });

    // Задача 2: ОБНОВЛЕНИЕ ЧАРТОВЫХ ПЛЕЙЛИСТОВ (каждые 6 часов)
    const playlistsTask = cron.schedule('0 */6 * * *', async () => {
      await this.runTask('playlists', async () => {
        logger.log('\n📊 === ОБНОВЛЕНИЕ ЧАРТОВЫХ ПЛЕЙЛИСТОВ ===');
        const result = await this.autoMusicSystem.updateChartPlaylists();
        this.lastRun.playlists = new Date();
        logger.log(`✅ Обновлено/создано ${result.created + result.updated} плейлистов\n`);
      });
    });
    this.tasks.push({ name: 'update-playlists', cron: '0 */6 * * *', task: playlistsTask });

    // Задача 3: ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ (ежедневно в 05:00)
    const recommendationsTask = cron.schedule('0 5 * * *', async () => {
      await this.runTask('recommendations', async () => {
        logger.log('\n🎯 === ГЕНЕРАЦИЯ ПЕРСОНАЛЬНЫХ РЕКОМЕНДАЦИЙ ===');
        const result = await this.autoMusicSystem.generatePersonalPlaylists();
        this.lastRun.recommendations = new Date();
        logger.log(`✅ Создано ${result.playlistsGenerated} персональных плейлистов\n`);
      });
    });
    this.tasks.push({ name: 'personal-recommendations', cron: '0 5 * * *', task: recommendationsTask });

    // Задача 4: ПОЛНОЕ ОБНОВЛЕНИЕ (ежедневно в 04:00)
    const fullUpdateTask = cron.schedule('0 4 * * *', async () => {
      await this.runTask('fullUpdate', async () => {
        logger.log('\n🔄 === ПОЛНОЕ ОБНОВЛЕНИЕ СИСТЕМЫ ===');
        const result = await this.autoMusicSystem.runFullUpdate();
        this.lastRun.fullUpdate = new Date();
        
        if (result.success) {
          logger.log(`\n✅ Система полностью обновлена за ${result.duration}с`);
          logger.log(`   📥 Импортировано треков: ${result.results.imports.total}`);
          logger.log(`   📊 Плейлистов обновлено: ${result.results.playlists.created + result.results.playlists.updated}`);
          logger.log(`   🎯 Рекомендаций создано: ${result.results.recommendations.playlistsGenerated}\n`);
        } else {
          logger.error(`❌ Ошибка полного обновления: ${result.error}\n`);
        }
      });
    });
    this.tasks.push({ name: 'full-update', cron: '0 4 * * *', task: fullUpdateTask });

    // Задача 5: ОБНОВЛЕНИЕ ПОПУЛЯРНОСТИ (каждый час)
    const popularityTask = cron.schedule('0 * * * *', async () => {
      await this.runTask('popularity', async () => {
        logger.log('\n📈 === ОБНОВЛЕНИЕ ПОПУЛЯРНОСТИ ТРЕКОВ ===');
        await this.updateTracksPopularity();
        logger.log('✅ Популярность обновлена\n');
      });
    });
    this.tasks.push({ name: 'update-popularity', cron: '0 * * * *', task: popularityTask });

    this.isRunning = true;

    logger.log('✅ Планировщик запущен. Активные задачи:');
    this.tasks.forEach(task => {
      logger.log(`   ⏰ ${task.name} - ${task.cron}`);
    });
    logger.log('\n📊 Расписание:');
    logger.log('   📥 Импорт треков: каждые 3 часа');
    logger.log('   📊 Обновление плейлистов: каждые 6 часов');
    logger.log('   🎯 Персональные рекомендации: ежедневно в 05:00');
    logger.log('   🔄 Полное обновление: ежедневно в 04:00');
    logger.log('   📈 Обновление популярности: каждый час');
    logger.log('\n');
  }

  /**
   * 🛑 Остановка планировщика
   */
  stop() {
    if (!this.isRunning) {
      logger.log('⚠️ Планировщик не запущен');
      return;
    }

    logger.log('\n🛑 Остановка планировщика...');

    this.tasks.forEach(({ task, name }) => {
      task.stop();
      logger.log(`   ✅ Задача "${name}" остановлена`);
    });

    this.tasks = [];
    this.isRunning = false;

    logger.log('✅ Планировщик остановлен\n');
  }

  /**
   * 🎬 Выполнение задачи с обработкой ошибок
   */
  async runTask(taskName, taskFunction) {
    const startTime = Date.now();
    
    try {
      await taskFunction();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.log(`⏱️  Задача "${taskName}" выполнена за ${duration}с`);
    } catch (error) {
      logger.error(`\n❌ Ошибка выполнения задачи "${taskName}":`, error);
      logger.error(`   Сообщение: ${error.message}`);
      logger.error(`   Стек: ${error.stack}\n`);
    }
  }

  /**
   * 📈 Обновление популярности треков на основе активности
   */
  async updateTracksPopularity() {
    const { Track, TrackLike, ListeningHistory, sequelize } = require('../models');
    const { Op, literal } = require('sequelize');

    try {
      // Находим треки с активностью за последнюю неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Обновляем популярность на основе лайков и прослушиваний
      await sequelize.query(`
        UPDATE Tracks t
        SET popularity = LEAST(100, GREATEST(0, (
          SELECT 
            50 + 
            COUNT(DISTINCT tl.id) * 5 +
            COUNT(DISTINCT lh.id) * 0.5
          FROM TrackLikes tl
          LEFT JOIN ListeningHistories lh ON lh.trackId = t.id
          WHERE tl.trackId = t.id
          AND (tl.createdAt >= :weekAgo OR lh.listenedAt >= :weekAgo)
        ))),
        updatedAt = NOW()
        WHERE t.id IN (
          SELECT DISTINCT trackId FROM TrackLikes WHERE createdAt >= :weekAgo
          UNION
          SELECT DISTINCT trackId FROM ListeningHistories WHERE listenedAt >= :weekAgo
        )
      `, {
        replacements: { weekAgo },
        type: sequelize.QueryTypes.UPDATE
      });

      // Снижаем популярность старых треков без активности
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      await Track.update(
        { 
          popularity: literal('GREATEST(0, popularity - 5)') 
        },
        {
          where: {
            updatedAt: { [Op.lt]: monthAgo },
            popularity: { [Op.gt]: 0 }
          }
        }
      );

      logger.log('   ✅ Популярность треков обновлена');
    } catch (error) {
      logger.error('   ❌ Ошибка обновления популярности:', error);
    }
  }

  /**
   * ▶️ Ручной запуск задачи
   */
  async runManualTask(taskName) {
    logger.log(`\n▶️  Ручной запуск задачи: ${taskName}`);

    switch (taskName) {
      case 'import':
        await this.runTask('import', async () => {
          const result = await this.autoMusicSystem.importPopularTracks();
          logger.log(`✅ Импортировано ${result.total} треков`);
        });
        break;

      case 'playlists':
        await this.runTask('playlists', async () => {
          const result = await this.autoMusicSystem.updateChartPlaylists();
          logger.log(`✅ Обновлено/создано ${result.created + result.updated} плейлистов`);
        });
        break;

      case 'recommendations':
        await this.runTask('recommendations', async () => {
          const result = await this.autoMusicSystem.generatePersonalPlaylists();
          logger.log(`✅ Создано ${result.playlistsGenerated} персональных плейлистов`);
        });
        break;

      case 'full':
        await this.runTask('full', async () => {
          const result = await this.autoMusicSystem.runFullUpdate();
          if (result.success) {
            logger.log(`✅ Система полностью обновлена за ${result.duration}с`);
          }
        });
        break;

      case 'popularity':
        await this.runTask('popularity', async () => {
          await this.updateTracksPopularity();
        });
        break;

      default:
        logger.error(`❌ Неизвестная задача: ${taskName}`);
        logger.log('Доступные задачи: import, playlists, recommendations, full, popularity');
        break;
    }
  }

  /**
   * 📊 Получение статуса планировщика
   */
  getStatus() {
    const systemStats = this.autoMusicSystem.getStats();

    return {
      isRunning: this.isRunning,
      activeTasks: this.tasks.length,
      tasks: this.tasks.map(t => ({
        name: t.name,
        schedule: t.cron
      })),
      lastRun: this.lastRun,
      systemStats: systemStats
    };
  }

  /**
   * 📈 Статистика работы планировщика
   */
  printStatus() {
    const status = this.getStatus();

    logger.log('\n📊 === СТАТУС АВТОМАТИЧЕСКОЙ СИСТЕМЫ ===');
    logger.log(`   Статус: ${status.isRunning ? '🟢 Запущен' : '🔴 Остановлен'}`);
    logger.log(`   Активных задач: ${status.activeTasks}`);
    
    logger.log('\n⏰ Последний запуск:');
    Object.entries(status.lastRun).forEach(([task, time]) => {
      const timeStr = time ? time.toLocaleString('ru-RU') : 'Никогда';
      logger.log(`   ${task}: ${timeStr}`);
    });

    logger.log('\n📊 Статистика системы:');
    logger.log(`   Импортировано треков: ${status.systemStats.tracksImported}`);
    logger.log(`   Создано плейлистов: ${status.systemStats.playlistsCreated}`);
    logger.log(`   Генерировано рекомендаций: ${status.systemStats.recommendationsGenerated}`);
    
    if (status.systemStats.lastUpdate) {
      logger.log(`   Последнее обновление: ${status.systemStats.lastUpdate.toLocaleString('ru-RU')}`);
      logger.log(`   Время работы: ${status.systemStats.uptime} минут`);
    }
    logger.log('');
  }
}

// Экспорт синглтона
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AutoMusicSystemScheduler();
    }
    return instance;
  },
  AutoMusicSystemScheduler
};

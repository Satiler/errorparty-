/**
 * 🎵 Music Auto-Import Scheduler
 * Автоматический планировщик импорта музыки
 */

const cron = require('node-cron');
const aiMusicDiscovery = require('./ai-music-discovery.service');
const smartRecommendation = require('./smart-recommendation.service');
const { Track, User } = require('../../models');
const { getInstance: getKissVKScheduler } = require('../../schedulers/kissvk-auto.scheduler');

class MusicAutoImportScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }

  /**
   * 🚀 Запуск автоматического импорта
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Планировщик уже запущен');
      return;
    }

    console.log('🎵 Запуск планировщика автоимпорта музыки...');

    // Запускаем KissVK Auto-Download планировщик
    try {
      const kissvkScheduler = getKissVKScheduler();
      await kissvkScheduler.start();
      console.log('✅ KissVK Auto-Download планировщик запущен');
    } catch (error) {
      console.error('❌ Ошибка запуска KissVK планировщика:', error.message);
    }

    // Задача 1: Ежедневный импорт новой музыки (каждый день в 03:00)
    const dailyImportTask = cron.schedule('0 3 * * *', async () => {
      console.log('\n🌅 Запуск ежедневного автоимпорта...');
      await this.runDailyImport();
    });

    // Задача 2: Обновление рекомендаций (каждые 6 часов)
    const recommendationUpdateTask = cron.schedule('0 */6 * * *', async () => {
      console.log('\n🔄 Обновление рекомендаций...');
      await this.updateRecommendations();
    });

    // Задача 3: Анализ популярности (каждый день в 02:00)
    const popularityAnalysisTask = cron.schedule('0 2 * * *', async () => {
      console.log('\n📊 Анализ популярности треков...');
      await this.analyzePopularity();
    });

    // Задача 4: Очистка неиспользуемых треков (каждое воскресенье в 01:00)
    const cleanupTask = cron.schedule('0 1 * * 0', async () => {
      console.log('\n🧹 Очистка неиспользуемых треков...');
      await this.cleanupUnusedTracks();
    });

    this.tasks = [
      { name: 'daily-import', task: dailyImportTask },
      { name: 'recommendation-update', task: recommendationUpdateTask },
      { name: 'popularity-analysis', task: popularityAnalysisTask },
      { name: 'cleanup', task: cleanupTask }
    ];

    this.isRunning = true;
    console.log('✅ Планировщик запущен. Активных задач:', this.tasks.length);
  }

  /**
   * 🛑 Остановка планировщика
   */
  async stop() {
    console.log('🛑 Остановка планировщика...');
    
    // Останавливаем KissVK планировщик
    try {
      const kissvkScheduler = getKissVKScheduler();
      await kissvkScheduler.stop();
      console.log('✅ KissVK Auto-Download планировщик остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки KissVK планировщика:', error.message);
    }
    
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      console.log(`  ⏹️  Остановлена задача: ${name}`);
    });

    this.tasks = [];
    this.isRunning = false;
    console.log('✅ Планировщик остановлен');
  }

  /**
   * 📥 Ежедневный импорт музыки
   */
  async runDailyImport() {
    try {
      const startTime = Date.now();

      // Импортируем по 5 треков каждого популярного жанра
      const result = await aiMusicDiscovery.autoUpdateLibrary({
        genres: ['Electronic', 'Pop', 'Hip-Hop', 'Rock', 'Jazz'],
        tracksPerGenre: 5,
        createPlaylists: true
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Ежедневный импорт завершён за ${duration}с:`);
      console.log(`   📥 Найдено: ${result.totalSearched}`);
      console.log(`   ✅ Импортировано: ${result.totalImported}`);
      console.log(`   📋 Создано плейлистов: ${result.playlistsCreated}`);

      // Отправляем уведомление админам
      await this.notifyAdmins('daily-import', result);

    } catch (error) {
      console.error('❌ Ошибка ежедневного импорта:', error.message);
    }
  }

  /**
   * 🔄 Обновление рекомендаций для всех пользователей
   */
  async updateRecommendations() {
    try {
      const users = await User.findAll({
        where: { isActive: true }
      });

      console.log(`🔄 Обновление рекомендаций для ${users.length} пользователей...`);

      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        try {
          // Генерируем персональные рекомендации
          const recommendations = await smartRecommendation.getPersonalizedRecommendations(
            user.id,
            { limit: 30 }
          );

          if (recommendations.length > 0) {
            // Сохраняем в кеш рекомендаций пользователя
            await this.cacheUserRecommendations(user.id, recommendations);
            successCount++;
          }

        } catch (error) {
          console.error(`  ❌ Ошибка для пользователя ${user.id}:`, error.message);
          failCount++;
        }
      }

      console.log(`✅ Обновление завершено: ${successCount} успешно, ${failCount} ошибок`);

    } catch (error) {
      console.error('❌ Ошибка обновления рекомендаций:', error.message);
    }
  }

  /**
   * 📊 Анализ популярности треков
   */
  async analyzePopularity() {
    try {
      const tracks = await Track.findAll();
      console.log(`📊 Анализ ${tracks.length} треков...`);

      let updated = 0;

      for (const track of tracks) {
        // Вычисляем popularity score на основе лайков и прослушиваний
        const popularityScore = this.calculatePopularityScore(track);

        if (track.popularityScore !== popularityScore) {
          await track.update({ popularityScore });
          updated++;
        }
      }

      console.log(`✅ Обновлено ${updated} оценок популярности`);

    } catch (error) {
      console.error('❌ Ошибка анализа популярности:', error.message);
    }
  }

  /**
   * 📈 Вычисление оценки популярности
   */
  calculatePopularityScore(track) {
    const likes = track.likesCount || 0;
    const plays = track.playsCount || 0;

    // Простая формула: лайки важнее прослушиваний
    const score = (likes * 10 + plays) / 100;

    return Math.min(Math.round(score), 100);
  }

  /**
   * 🧹 Очистка неиспользуемых треков
   */
  async cleanupUnusedTracks() {
    try {
      const thresholdDate = new Date();
      thresholdDate.setMonth(thresholdDate.getMonth() - 6); // 6 месяцев назад

      const unusedTracks = await Track.findAll({
        where: {
          playsCount: 0,
          likesCount: 0,
          createdAt: { [Op.lt]: thresholdDate }
        }
      });

      console.log(`🧹 Найдено ${unusedTracks.length} неиспользуемых треков`);

      if (unusedTracks.length > 0) {
        // В реальности можно удалять, но пока просто помечаем
        for (const track of unusedTracks) {
          await track.update({ isArchived: true });
        }

        console.log(`✅ Архивировано ${unusedTracks.length} треков`);
      }

    } catch (error) {
      console.error('❌ Ошибка очистки:', error.message);
    }
  }

  /**
   * 💾 Кеширование рекомендаций пользователя
   */
  async cacheUserRecommendations(userId, recommendations) {
    // В реальности можно использовать Redis
    // Пока сохраняем в metadata пользователя
    try {
      const user = await User.findByPk(userId);
      if (user) {
        await user.update({
          metadata: {
            ...user.metadata,
            cachedRecommendations: recommendations.map(r => r.id),
            recommendationsCachedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error(`Ошибка кеширования для пользователя ${userId}:`, error.message);
    }
  }

  /**
   * 📧 Уведомление администраторов
   */
  async notifyAdmins(taskName, result) {
    try {
      const admins = await User.findAll({
        where: { role: 'admin' }
      });

      // Здесь можно отправить email или push-уведомление
      console.log(`📧 Уведомление ${admins.length} администраторов о задаче ${taskName}`);
      console.log('   Результат:', result);

    } catch (error) {
      console.error('❌ Ошибка уведомления:', error.message);
    }
  }

  /**
   * ⚡ Ручной запуск импорта (для тестирования)
   */
  async manualImport(options = {}) {
    console.log('⚡ Ручной запуск импорта...');
    return await aiMusicDiscovery.autoUpdateLibrary(options);
  }

  /**
   * 📊 Статус планировщика
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.tasks.length,
      tasks: this.tasks.map(({ name }) => name)
    };
  }
}

// Экспортируем синглтон
const scheduler = new MusicAutoImportScheduler();

// Автозапуск при старте сервера
if (process.env.AUTO_IMPORT_ENABLED !== 'false') {
  scheduler.start();
}

module.exports = scheduler;

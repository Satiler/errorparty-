const cron = require('node-cron');
const { CS2Match, User } = require('../models');
const { Op } = require('sequelize');
const cs2MatchSyncService = require('./cs2MatchSyncService');
const cs2DemoDownloadService = require('./cs2DemoDownloadService');

/**
 * CS2 Demo Cron Service
 * Автоматическая загрузка демо-файлов для свежих матчей
 * 
 * Функции:
 * 1. Проверка новых матчей каждые 6 часов
 * 2. Автоматическая загрузка демо для матчей < 30 дней
 * 3. Синхронизация истории матчей для пользователей с токенами
 */

class CS2DemoCronService {
  constructor() {
    this.isRunning = false;
    this.cronJobs = [];
  }

  /**
   * Запуск всех cron задач
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ CS2 Demo Cron Service already running');
      return this;
    }

    console.log('🚀 Starting CS2 Demo Cron Service...');

    // Задача 1: Синхронизация новых матчей каждые 6 часов
    const syncMatchesJob = cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 [CRON] Starting automatic match sync...');
      await this.syncAllUsersMatches();
    }, {
      scheduled: true,
      timezone: "Europe/Moscow"
    });

    // Задача 2: Загрузка демо для свежих матчей каждый час (DISABLED - demo files not publicly available)
    // const downloadDemosJob = cron.schedule('0 * * * *', async () => {
    //   console.log('📥 [CRON] Starting automatic demo download...');
    //   await this.downloadPendingDemos();
    // }, {
    //   scheduled: true,
    //   timezone: "Europe/Moscow"
    // });

    // Задача 3: Очистка старых записей с failed статусом раз в день
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 [CRON] Starting demo cleanup...');
      await this.cleanupExpiredDemos();
    }, {
      scheduled: true,
      timezone: "Europe/Moscow"
    });

    this.cronJobs = [syncMatchesJob, cleanupJob];
    this.isRunning = true;

    console.log('✅ CS2 Demo Cron Service started');
    console.log('   - Match sync: Every 6 hours');
    console.log('   - Demo download: DISABLED (use GSI for live stats)');
    console.log('   - Cleanup: Daily at 2:00 AM');
    console.log('   📝 Note: Demo files not publicly available. Use GSI for detailed match stats.');

    return this;
  }

  /**
   * Остановка всех cron задач
   */
  stop() {
    console.log('🛑 Stopping CS2 Demo Cron Service...');
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    this.isRunning = false;
    console.log('✅ CS2 Demo Cron Service stopped');
  }

  /**
   * Синхронизация матчей для всех пользователей с токенами
   */
  async syncAllUsersMatches() {
    try {
      const users = await User.findAll({
        where: {
          cs2AuthToken: {
            [Op.ne]: null
          }
        }
      });

      console.log(`📊 Found ${users.length} users with CS2 auth tokens`);

      let totalNewMatches = 0;
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        try {
          console.log(`🔄 Syncing matches for user ${user.id} (${user.username})...`);
          
          const result = await cs2MatchSyncService.syncMatchesForUser(
            user.id,
            user.steamId,
            user.cs2AuthToken
          );

          if (result.success) {
            totalNewMatches += result.stats.newMatches || 0;
            successCount++;
            console.log(`✅ User ${user.id}: ${result.stats.newMatches} new matches`);
          } else {
            failCount++;
            console.log(`⚠️ User ${user.id}: ${result.message}`);
          }

          // Задержка между пользователями чтобы не перегружать Steam API
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (userError) {
          failCount++;
          console.error(`❌ Error syncing user ${user.id}:`, userError.message);
        }
      }

      console.log(`📊 Match sync completed:`);
      console.log(`   - Users processed: ${users.length}`);
      console.log(`   - Success: ${successCount}`);
      console.log(`   - Failed: ${failCount}`);
      console.log(`   - Total new matches: ${totalNewMatches}`);

      return {
        success: true,
        stats: {
          usersProcessed: users.length,
          successCount,
          failCount,
          totalNewMatches
        }
      };

    } catch (error) {
      console.error('❌ Error in syncAllUsersMatches:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Загрузка демо для матчей без демо-файлов
   * Только для матчей моложе 30 дней
   */
  async downloadPendingDemos() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Найти demo со статусом pending (готовые к загрузке)
      const { sequelize } = require('../config/database');
      const { CS2Demo } = require('../models');
      
      // Найдём все demo со статусом pending
      const { User } = require('../models');
      const pendingDemos = await CS2Demo.findAll({
        where: {
          status: 'pending'
        },
        include: [{
          model: CS2Match,
          as: 'match',
          where: {
            shareCode: {
              [Op.ne]: null
            }
          },
          required: true,
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'steamId', 'cs2AuthToken']
          }]
        }],
        order: [[{ model: CS2Match, as: 'match' }, 'createdAt', 'DESC']],
        limit: 50
      });
      
      if (pendingDemos.length === 0) {
        console.log('ℹ️ No pending demos to download');
        return {
          success: true,
          processed: 0,
          message: 'No pending demos'
        };
      }
      
      console.log(`📥 Found ${pendingDemos.length} pending demos to download`);

      let successCount = 0;
      let failCount = 0;
      let expiredCount = 0;

      for (const demoRecord of pendingDemos) {
        try {
          const match = demoRecord.match;
          console.log(`📥 Processing demo ${demoRecord.id} for match ${match.id} (${match.shareCode?.substring(0, 25)}...)`);

          // Проверяем возраст матча
          const matchAge = Date.now() - new Date(match.createdAt).getTime();
          const daysOld = matchAge / (1000 * 60 * 60 * 24);

          if (daysOld > 7) {
            console.log(`⚠️ Match ${match.id} is ${daysOld.toFixed(1)} days old (Valve keeps demos ~7 days)`);
            expiredCount++;
            
            // Обновляем статус demo
            demoRecord.status = 'expired';
            demoRecord.parseError = 'Demo file expired (> 7 days)';
            await demoRecord.save();
            
            continue;
          }

          // Загружаем демо через сервис (передаём auth token если есть)
          console.log(`🔄 Starting download for demo ${demoRecord.id}...`);
          const authToken = match.user?.cs2AuthToken || null;
          const result = await cs2DemoDownloadService.downloadDemo(
            match.id,
            match.shareCode,
            demoRecord.id,
            authToken
          );

          if (result) {
            successCount++;
            console.log(`✅ Demo ${demoRecord.id}: Download successful`);
          } else {
            failCount++;
            console.log(`❌ Demo ${demoRecord.id}: Download failed`);
          }

          // Задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (demoError) {
          failCount++;
          console.error(`❌ Error processing demo ${demoRecord.id}:`, demoError.message);
        }
      }

      console.log(`📊 Demo download completed:`);
      console.log(`   - Demos processed: ${pendingDemos.length}`);
      console.log(`   - Success: ${successCount}`);
      console.log(`   - Failed: ${failCount}`);
      console.log(`   - Expired: ${expiredCount}`);

      return {
        success: true,
        stats: {
          processed: pendingDemos.length,
          successCount,
          failCount,
          expiredCount
        }
      };

    } catch (error) {
      console.error('❌ Error in downloadPendingDemos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Очистка записей об устаревших демо
   * Удаляет записи cs2_demos со статусом 'expired' или 'failed' старше 60 дней
   */
  async cleanupExpiredDemos() {
    try {
      const { CS2Demo } = require('../models');
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deleted = await CS2Demo.destroy({
        where: {
          status: {
            [Op.in]: ['expired', 'failed']
          },
          updatedAt: {
            [Op.lt]: sixtyDaysAgo
          }
        }
      });

      console.log(`🧹 Cleanup completed: Removed ${deleted} expired demo records`);

      return {
        success: true,
        deleted
      };

    } catch (error) {
      console.error('❌ Error in cleanupExpiredDemos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получить статус cron сервиса
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.length,
      jobs: [
        {
          name: 'Match Sync',
          schedule: 'Every 6 hours',
          expression: '0 */6 * * *'
        },
        {
          name: 'Demo Download',
          schedule: 'Every hour',
          expression: '0 * * * *'
        },
        {
          name: 'Cleanup',
          schedule: 'Daily at 2:00 AM',
          expression: '0 2 * * *'
        }
      ]
    };
  }

  /**
   * Ручной запуск синхронизации
   */
  async triggerManualSync() {
    console.log('🎯 Manual sync triggered');
    await this.syncAllUsersMatches();
  }

  /**
   * Ручной запуск загрузки демо
   */
  async triggerManualDownload() {
    console.log('🎯 Manual demo download triggered');
    await this.downloadPendingDemos();
  }
}

// Singleton instance
const cronService = new CS2DemoCronService();

module.exports = cronService;

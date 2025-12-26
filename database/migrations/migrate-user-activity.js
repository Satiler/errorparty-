/**
 * Скрипт для миграции данных UserActivity
 * Создает записи активности на основе существующего totalOnlineTime
 */

const { User, UserActivity } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function migrateUserActivity() {
  try {
    console.log('🔄 Starting UserActivity migration...');
    
    // Получаем всех пользователей с totalOnlineTime > 0
    const users = await User.findAll({
      where: {
        totalOnlineTime: { [require('sequelize').Op.gt]: 0 }
      }
    });
    
    console.log(`Found ${users.length} users with online time`);
    
    let migratedCount = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (const user of users) {
      try {
        // Проверяем, есть ли уже записи активности
        const existingActivity = await UserActivity.count({
          where: { userId: user.id }
        });
        
        if (existingActivity > 0) {
          console.log(`⏭️  Skipping user ${user.username} - already has activity records`);
          continue;
        }
        
        // Создаем запись активности на сегодня с накопленным временем
        await UserActivity.create({
          userId: user.id,
          date: today,
          voiceTime: user.totalOnlineTime,
          connections: 1 // Минимум 1 подключение
        });
        
        migratedCount++;
        console.log(`✅ Migrated ${user.username}: ${Math.floor(user.totalOnlineTime / 3600)}h`);
      } catch (error) {
        console.error(`❌ Error migrating user ${user.username}:`, error.message);
      }
    }
    
    console.log(`\n✅ Migration completed! Migrated ${migratedCount} users`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Запуск миграции
migrateUserActivity();

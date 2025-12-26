const cron = require('node-cron');
const { User } = require('../models');
const { assignQuests, analyzeRecentMatches } = require('../services/questService');

/**
 * Запускает CRON задачи для автоматической работы с квестами
 */
const initQuestsCron = () => {
  // Каждый день в 00:01 - назначаем ежедневные квесты всем активным пользователям
  cron.schedule('1 0 * * *', async () => {
    console.log('🕐 [CRON] Назначение ежедневных квестов...');
    
    try {
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'steamId']
      });
      
      for (const user of users) {
        if (user.steamId) {
          // Назначаем квесты для обеих игр
          await assignQuests(user.id, 'dota2', 'daily');
          await assignQuests(user.id, 'cs2', 'daily');
        }
      }
      
      console.log(`✅ [CRON] Ежедневные квесты назначены для ${users.length} пользователей`);
    } catch (error) {
      console.error('❌ [CRON] Ошибка назначения ежедневных квестов:', error);
    }
  });
  
  // Каждый понедельник в 00:01 - назначаем еженедельные квесты
  cron.schedule('1 0 * * 1', async () => {
    console.log('🕐 [CRON] Назначение еженедельных квестов...');
    
    try {
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'steamId']
      });
      
      for (const user of users) {
        if (user.steamId) {
          await assignQuests(user.id, 'dota2', 'weekly');
          await assignQuests(user.id, 'cs2', 'weekly');
        }
      }
      
      console.log(`✅ [CRON] Еженедельные квесты назначены для ${users.length} пользователей`);
    } catch (error) {
      console.error('❌ [CRON] Ошибка назначения еженедельных квестов:', error);
    }
  });
  
  // Каждые 30 минут - проверяем последние матчи активных пользователей
  cron.schedule('*/30 * * * *', async () => {
    console.log('🕐 [CRON] Автоматическая проверка последних матчей...');
    
    try {
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'steamId', 'username'],
        limit: 100 // Проверяем по 100 пользователей каждые 30 минут
      });
      
      let processedCount = 0;
      let completedQuestsTotal = 0;
      
      for (const user of users) {
        if (user.steamId) {
          try {
            // Анализируем Dota 2 матчи
            const dota2Result = await analyzeRecentMatches(user.id, user.steamId, 'dota2');
            if (dota2Result.success && dota2Result.newMatchesAnalyzed > 0) {
              console.log(`  ✅ ${user.username}: Dota 2 - ${dota2Result.newMatchesAnalyzed} новых матчей`);
              processedCount++;
            }
            
            // Анализируем CS2 матчи
            const cs2Result = await analyzeRecentMatches(user.id, user.steamId, 'cs2');
            if (cs2Result.success && cs2Result.newMatchesAnalyzed > 0) {
              console.log(`  ✅ ${user.username}: CS2 - ${cs2Result.newMatchesAnalyzed} новых матчей`);
              processedCount++;
            }
            
            // Небольшая задержка между пользователями
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.error(`  ❌ ${user.username}: ${err.message}`);
          }
        }
      }
      
      console.log(`✅ [CRON] Обработано ${processedCount} пользователей с новыми матчами из ${users.length} проверенных`);
    } catch (error) {
      console.error('❌ [CRON] Ошибка проверки матчей:', error);
    }
  });
  
  console.log('✅ Quest CRON jobs initialized');
};

module.exports = { initQuestsCron };

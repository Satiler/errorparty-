/**
 * Триггер для отправки отчета по конкретному матчу
 */

const { getSteamBot } = require('./src/services/steamBotService');
const { initSteamNotifications } = require('./src/services/questService');
const SteamNotificationService = require('./src/services/steamNotificationService');
const { User } = require('./src/models');
const axios = require('axios');

const MATCH_ID = 8573604409;

// Данные пользователей с их Steam ID
const USERS = [
  { userId: 5, steamId: '76561198306468078', username: 'RageTIK' },
  // Добавьте других пользователей если нужно
];

async function triggerMatchReport() {
  console.log('🚀 Триггер отправки отчета по матчу', MATCH_ID);
  
  // Получаем Steam Bot
  const steamBot = getSteamBot();
  
  // Проверяем подключение
  if (!steamBot.isConnected) {
    console.log('⚠️  Бот не подключен. Подключаю...');
    
    // Подключаемся к Steam
    await new Promise((resolve, reject) => {
      steamBot.once('ready', resolve);
      steamBot.once('error', reject);
      steamBot.connect();
      
      // Таймаут 30 секунд
      setTimeout(() => reject(new Error('Connection timeout')), 30000);
    });
    
    console.log('✅ Бот подключен к Steam');
    
    // Ждем загрузки друзей
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('✅ Бот уже подключен');
  }
  
  console.log(`👥 Друзей в списке: ${steamBot.friendsList.size}`);
  console.log('📋 Список друзей:');
  for (const [steamId64, info] of steamBot.friendsList) {
    console.log(`   - ${info.username} (${steamId64})`);
  }
  
  // Создаем notification service
  const notificationService = new SteamNotificationService(steamBot);
  
  for (const user of USERS) {
    try {
      console.log(`\n📤 Обрабатываем ${user.username}...`);
      
      // Конвертируем Steam ID64 в Steam ID32 для OpenDota
      const steamID64ToSteamID32 = (steamID64) => {
        const steamID64Base = '76561197960265728';
        const accountID = BigInt(steamID64) - BigInt(steamID64Base);
        return accountID.toString();
      };
      
      const steamId32 = steamID64ToSteamID32(user.steamId);
      console.log(`🔍 Получаю данные матча для Steam ID32: ${steamId32}`);
      
      // Получаем данные матча из OpenDota
      const url = `https://api.opendota.com/api/players/${steamId32}/recentMatches`;
      const response = await axios.get(url);
      const matches = response.data || [];
      
      // Находим нужный матч
      const match = matches.find(m => m.match_id === MATCH_ID);
      
      if (!match) {
        console.log(`⚠️  Матч ${MATCH_ID} не найден для ${user.username}`);
        continue;
      }
      
      console.log(`✅ Матч найден!`);
      console.log(`   Hero: ${match.hero_id}`);
      console.log(`   K/D/A: ${match.kills}/${match.deaths}/${match.assists}`);
      console.log(`   Result: ${match.radiant_win ? 'Radiant' : 'Dire'} win`);
      
      // Формируем данные матча
      const matchData = {
        matchId: match.match_id,
        hero_name: `Hero ${match.hero_id}`,
        win: (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win),
        kills: match.kills || 0,
        deaths: match.deaths || 0,
        assists: match.assists || 0,
        duration: match.duration || 0,
        hero_damage: match.hero_damage || 0,
        hero_healing: match.hero_healing || 0,
        tower_damage: match.tower_damage || 0,
        gold_per_min: match.gold_per_min || 0,
        xp_per_min: match.xp_per_min || 0,
        last_hits: match.last_hits || 0,
        denies: match.denies || 0
      };
      
      // Формируем данные квестов (пустые для теста)
      const questResults = {
        questResults: [],
        totalXp: 0,
        levelProgress: {
          currentLevel: 1,
          currentXp: 0,
          xpForNextLevel: 400,
          progress: 0
        }
      };
      
      console.log(`📨 Отправляю сообщение в Steam...`);
      
      // Отправляем отчет
      await notificationService.sendDota2MatchReport(
        user.userId,
        user.steamId,
        matchData,
        questResults
      );
      
      console.log(`✅ Сообщение отправлено для ${user.username}`);
      
      // Небольшая пауза между отправками
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Ошибка для ${user.username}:`, error.message);
    }
  }
  
  console.log('\n✅ Все отправки завершены');
  
  // Даем время на отправку
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  process.exit(0);
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  process.exit(1);
});

triggerMatchReport();

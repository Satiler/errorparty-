/**
 * Простой триггер автосинка (использует уже подключенный бот)
 */

const { getSteamBot } = require('./src/services/steamBotService');

async function triggerAutoSync() {
  console.log('🔄 Запуск ручного автосинка...\n');
  
  const steamBot = getSteamBot();
  
  console.log(`Статус бота: ${steamBot.isConnected ? '✅ Подключен' : '❌ Не подключен'}`);
  console.log(`Друзей: ${steamBot.friendsList.size}\n`);
  
  if (!steamBot.isConnected) {
    console.log('⚠️  Бот не подключен!');
    console.log('📝 Подключите бота через админ-панель: https://errorparty.ru/admin/bot');
    console.log('   Или запустите команду: POST /api/admin/bot/connect');
    process.exit(1);
  }
  
  if (typeof steamBot.autoSyncAllFriends === 'function') {
    console.log('🚀 Запускаю autoSyncAllFriends...\n');
    await steamBot.autoSyncAllFriends();
    console.log('\n✅ Автосинк завершен');
  } else {
    console.log('❌ Метод autoSyncAllFriends не найден');
  }
  
  // Даем время на отправку сообщений
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  process.exit(0);
}

triggerAutoSync();

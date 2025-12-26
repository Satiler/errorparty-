const { sequelize } = require('./src/config/database');
const scheduler = require('./src/schedulers/lightweight-music-import.scheduler');

async function updateTop100Now() {
  try {
    console.log('🔥 Запуск обновления Топ 100...\n');
    
    await sequelize.authenticate();
    console.log('✅ База данных подключена\n');

    const instance = scheduler.getInstance();
    await instance.updateTop100Playlist();

    console.log('\n✅ Обновление завершено!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateTop100Now();

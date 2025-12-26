const albumTracksService = require('./src/services/album-tracks-sync.service');
const { sequelize } = require('./src/config/database');

async function runSync() {
  try {
    console.log('🚀 Запуск синхронизации треков для альбомов...\n');
    
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено\n');
    
    const result = await albumTracksService.syncAllAlbums();
    
    console.log('✅ Синхронизация завершена!');
    console.log(`📊 Результаты:`);
    console.log(`   - Всего альбомов: ${result.total}`);
    console.log(`   - Обработано: ${result.processed}`);
    console.log(`   - Треков добавлено: ${result.tracksAdded}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    process.exit(1);
  }
}

runSync();

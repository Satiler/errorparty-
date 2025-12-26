/**
 * Скрипт для ручного запуска импорта топ-100
 * Использует iTunes Charts API (БЕЗ необходимости API ключа!)
 * Запуск: node import-lastfm-top100.js
 */

require('dotenv').config();
const musicDiscoveryService = require('./src/services/music-discovery.service');

async function main() {
  console.log('🚀 Запуск импорта топ-100 мировых хитов из iTunes Charts\n');
  console.log('✅ iTunes API не требует регистрации или API ключей!\n');

  try {
    // Шаг 1: Импорт треков
    console.log('📥 Шаг 1/2: Импорт треков из iTunes Charts...\n');
    const importResult = await musicDiscoveryService.importGlobalTop100();
    
    // Шаг 2: Обновление плейлиста
    console.log('\n📝 Шаг 2/2: Обновление плейлиста...\n');
    const playlistResult = await musicDiscoveryService.updateGlobalTop50Playlist();
    
    // Итоги
    console.log('\n🎉 === УСПЕШНО ЗАВЕРШЕНО ===');
    console.log(`✅ Импортировано треков: ${importResult.imported}`);
    console.log(`⏭️  Уже были в базе: ${importResult.skipped}`);
    console.log(`❌ Не найдено: ${importResult.notFound}`);
    console.log(`📊 Плейлист обновлен: ${playlistResult.tracksCount} треков`);
    console.log('\n🌐 Проверьте плейлист на errorparty.ru/music');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

main();

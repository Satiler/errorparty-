const musicDiscoveryService = require('./src/services/music-discovery.service');

async function updatePlaylist() {
  console.log('🎵 Обновление плейлиста "Топ-50 Мировые Хиты"...\n');
  
  try {
    const result = await musicDiscoveryService.updateGlobalTop50Playlist();
    console.log(`\n✅ Готово! Плейлист содержит ${result.tracksCount} треков`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

updatePlaylist();

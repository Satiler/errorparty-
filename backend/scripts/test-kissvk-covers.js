const kissvkService = require('../src/services/kissvk.service');

(async () => {
  try {
    const service = kissvkService.getInstance();
    
    console.log('Получение треков с kissvk.top...\n');
    const result = await service.extractTracks('/', 5);
    
    if (!result.success) {
      console.error('Ошибка:', result.message);
      process.exit(1);
    }
    
    console.log(`Получено треков: ${result.tracks.length}\n`);
    
    result.tracks.forEach((track, i) => {
      console.log(`${i+1}. ${track.artist} - ${track.title}`);
      console.log(`   coverUrl: ${track.coverUrl ? '✅ ' + track.coverUrl : '❌ null'}`);
      console.log(`   encryptedUrl: ${track.encryptedUrl ? '✅ Есть' : '❌ null'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();

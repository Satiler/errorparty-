const kissvkService = require('../src/services/kissvk.service');

(async () => {
  try {
    const service = kissvkService.getInstance();
    
    console.log('1. Получение треков с kissvk.top...\n');
    const result = await service.extractTracks('/', 3);
    
    if (!result.success) {
      console.error('Ошибка:', result.message);
      process.exit(1);
    }
    
    console.log('До декодирования:');
    result.tracks.forEach((track, i) => {
      console.log(`${i+1}. ${track.artist} - ${track.title}`);
      console.log(`   coverUrl: ${track.coverUrl ? '✅ Есть' : '❌ null'}`);
    });
    
    console.log('\n2. Декодирование URL...\n');
    const decrypted = await service.decryptTracks(result.tracks);
    
    console.log('После декодирования:');
    decrypted.forEach((track, i) => {
      console.log(`${i+1}. ${track.artist} - ${track.title}`);
      console.log(`   coverUrl: ${track.coverUrl ? '✅ Есть' : '❌ null'}`);
      console.log(`   streamUrl: ${track.streamUrl ? '✅ Есть' : '❌ null'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();

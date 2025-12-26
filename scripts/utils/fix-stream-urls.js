const { Track } = require('./src/models');

(async () => {
  try {
    console.log('🔧 Добавляем streamUrl ко всем трекам из externalUrl...\n');
    
    // Получаем все треки БЕЗ streamUrl, но С externalUrl
    const tracks = await Track.findAll({
      where: {
        externalUrl: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'title', 'artist', 'externalUrl', 'streamUrl']
    });
    
    console.log(`📊 Найдено треков с externalUrl: ${tracks.length}`);
    
    let updated = 0;
    
    for (const track of tracks) {
      if (!track.streamUrl && track.externalUrl) {
        await track.update({
          streamUrl: track.externalUrl
        });
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`  ✅ Обновлено: ${updated}/${tracks.length}`);
        }
      }
    }
    
    console.log(`\n✅ Обновлено треков: ${updated}`);
    console.log('🎵 Все треки готовы к воспроизведению!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
})();

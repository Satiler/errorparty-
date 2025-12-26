const { Track, PlaylistTrack } = require('./src/models');

async function main() {
  console.log('🔍 Проверка треков на корректность URL...\n');

  try {
    // Находим треки с пустыми или некорректными streamUrl
    const brokenTracks = await Track.findAll({
      where: {
        streamUrl: null
      }
    });

    console.log(`❌ Найдено треков с пустым streamUrl: ${brokenTracks.length}`);

    if (brokenTracks.length > 0) {
      console.log('\nУдаление сломанных треков:');
      
      for (const track of brokenTracks) {
        console.log(`🗑️ ${track.id}. ${track.artist} - ${track.title}`);
        
        // Удаляем связи с плейлистами
        await PlaylistTrack.destroy({ where: { trackId: track.id } });
        
        // Удаляем трек
        await track.destroy();
      }
    }

    // Проверяем треки с очень короткими или подозрительными URL
    const suspiciousTracks = await Track.findAll({
      where: {
        streamUrl: {
          [require('sequelize').Op.or]: [
            { [require('sequelize').Op.like]: '%/api/music/tracks/%/stream' },
            { [require('sequelize').Op.notLike]: 'https://%' }
          ]
        }
      }
    });

    console.log(`\n⚠️ Найдено треков с подозрительным streamUrl: ${suspiciousTracks.length}`);
    
    if (suspiciousTracks.length > 0) {
      console.log('\nПервые 10 подозрительных треков:');
      suspiciousTracks.slice(0, 10).forEach(t => {
        console.log(`${t.id}. ${t.artist} - ${t.title}`);
        console.log(`   URL: ${t.streamUrl.substring(0, 80)}...`);
      });
    }

    // Статистика
    const totalTracks = await Track.count();
    const validTracks = await Track.count({
      where: {
        streamUrl: {
          [require('sequelize').Op.like]: 'https://%vkuseraudio.net%'
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Всего треков: ${totalTracks}`);
    console.log(`✅ Валидных треков (VK Audio): ${validTracks}`);
    console.log(`⚠️ Подозрительных треков: ${suspiciousTracks.length}`);
    console.log(`❌ Удалено сломанных треков: ${brokenTracks.length}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();

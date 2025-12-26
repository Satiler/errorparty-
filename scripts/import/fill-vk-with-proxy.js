/**
 * Заполнение альбомов из ВК с использованием прокси
 */
const { Album, Track } = require('./src/models');
const vkService = require('./src/services/vk-music.service');

async function fillWithProxy() {
  console.log('\n🎵 === ЗАПОЛНЕНИЕ АЛЬБОМОВ С ПРОКСИ ===\n');

  // Включаем прокси
  vkService.useProxy = process.env.USE_PROXY === 'true';
  
  if (vkService.useProxy) {
    console.log('✅ Прокси включены');
  } else {
    console.log('⚠️  Прокси отключены (USE_PROXY=false)');
  }

  if (!vkService.isAvailable()) {
    console.error('❌ VK Music недоступен (нет токена)');
    process.exit(1);
  }

  // Находим пустые альбомы
  const allAlbums = await Album.findAll({
    include: [{
      model: Track,
      as: 'tracks',
      required: false
    }]
  });

  const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
  console.log(`📊 Найдено ${emptyAlbums.length} пустых альбомов\n`);

  let processed = 0;
  let successful = 0;
  let totalTracksAdded = 0;
  let errors = 0;

  for (const album of emptyAlbums.slice(0, 10)) { // Тестируем на первых 10
    processed++;
    console.log(`\n[${processed}/10] ${album.artist} - ${album.title}`);

    try {
      // Увеличенная задержка
      if (processed > 1) {
        const delay = 5000 + Math.random() * 5000; // 5-10 секунд
        console.log(`  ⏱️  Ожидание ${Math.round(delay/1000)} сек...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const vkResults = await vkService.searchTracks(`${album.artist} ${album.title}`, 15);
      
      if (vkResults && vkResults.length > 0) {
        console.log(`  ✅ Найдено ${vkResults.length} треков`);
        
        let added = 0;
        
        for (let i = 0; i < Math.min(vkResults.length, 10); i++) {
          const trackData = vkResults[i];
          
          try {
            if (!trackData.streamUrl && !trackData.url) {
              continue;
            }

            const existingTrack = await Track.findOne({
              where: {
                title: trackData.title,
                artist: trackData.artist
              }
            });

            if (existingTrack && !existingTrack.albumId) {
              await existingTrack.update({ 
                albumId: album.id,
                streamUrl: trackData.streamUrl || trackData.url
              });
              added++;
            } else if (!existingTrack) {
              await Track.create({
                title: trackData.title,
                artist: trackData.artist,
                albumId: album.id,
                streamUrl: trackData.streamUrl || trackData.url,
                duration: trackData.duration || 180,
                genre: album.genre || 'Unknown',
                trackNumber: i + 1,
                source: 'vk-music-proxy',
                allowDownload: true
              });
              added++;
            }
          } catch (error) {
            if (!error.message.includes('unique')) {
              console.log(`    ⚠️  ${error.message.substring(0, 50)}`);
            }
          }
        }

        if (added > 0) {
          successful++;
          totalTracksAdded += added;
          console.log(`  💾 Добавлено треков: ${added}`);
        }
      } else {
        console.log(`  ⚠️  Треки не найдены`);
      }
    } catch (error) {
      errors++;
      console.error(`  ❌ Ошибка: ${error.message}`);
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('капча')) {
        console.log('  ⚠️  Возможно, нужно сменить прокси или увеличить задержки');
      }
    }
  }

  console.log('\n📊 === ИТОГИ ===');
  console.log(`Обработано альбомов: ${processed}`);
  console.log(`Успешно заполнено: ${successful}`);
  console.log(`Добавлено треков: ${totalTracksAdded}`);
  console.log(`Ошибок: ${errors}`);
  
  if (errors > processed / 2) {
    console.log('\n⚠️  РЕКОМЕНДАЦИЯ: Слишком много ошибок!');
    console.log('   1. Проверьте прокси (node fetch-free-proxies.js)');
    console.log('   2. Увеличьте задержки между запросами');
    console.log('   3. Используйте платные прокси');
  }

  process.exit(0);
}

fillWithProxy().catch(console.error);

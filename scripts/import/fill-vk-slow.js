/**
 * Заполнение альбомов из VK с БОЛЬШИМИ задержками (без капчи)
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const vkService = require('./src/services/vk-music.service');

// Случайная задержка от min до max секунд
function randomDelay(min, max) {
  const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function fillVKSlow() {
  console.log('\n🎵 === ЗАПОЛНЕНИЕ АЛЬБОМОВ ИЗ VK (МЕДЛЕННЫЙ РЕЖИМ) ===\n');
  console.log('⏱️  Задержки: 5-10 секунд между запросами\n');

  try {
    if (!vkService.isAvailable()) {
      console.error('❌ VK Music недоступен (нет токена)');
      process.exit(1);
    }

    // Находим альбомы без треков
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
    let captchaCount = 0;

    for (const album of emptyAlbums) {
      processed++;
      console.log(`\n[${processed}/${emptyAlbums.length}] ${album.title} - ${album.artist}`);

      try {
        // БОЛЬШАЯ задержка перед запросом
        if (processed > 1) {
          const delay = Math.floor(Math.random() * 6) + 5; // 5-10 секунд
          console.log(`  ⏱️  Ожидание ${delay} сек...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }

        console.log(`  🔍 Поиск в VK Music...`);
        
        const vkResults = await vkService.getAlbumTracks(album.artist, album.title, 15);

        if (vkResults && vkResults.length > 0) {
          console.log(`    ✅ Найдено ${vkResults.length} треков`);

          let added = 0;

          for (let i = 0; i < Math.min(vkResults.length, 15); i++) {
            const trackData = vkResults[i];

            try {
              const existingTrack = await Track.findOne({
                where: {
                  title: trackData.title,
                  artist: trackData.artist
                }
              });

              if (existingTrack) {
                if (!existingTrack.albumId) {
                  await existingTrack.update({ albumId: album.id });
                  added++;
                  console.log(`    💾 Привязан: ${trackData.title}`);
                }
              } else {
                await Track.create({
                  title: trackData.title,
                  artist: trackData.artist,
                  albumId: album.id,
                  streamUrl: trackData.streamUrl || trackData.url || null,
                  duration: trackData.duration || 180,
                  genre: album.genre || 'Unknown',
                  trackNumber: i + 1,
                  source: 'vk-music',
                  allowDownload: true
                });
                added++;
                console.log(`    ✅ Добавлен: ${trackData.title}`);
              }
            } catch (error) {
              console.log(`    ⚠️  Пропущен: ${trackData.title}`);
            }
          }

          if (added > 0) {
            totalTracksAdded += added;
            successful++;
            console.log(`  ✅ Успешно добавлено ${added} треков`);
          }

        } else {
          console.log(`    ⚠️  Треки не найдены`);
        }

      } catch (error) {
        if (error.message.includes('captcha') || error.message.includes('капч')) {
          captchaCount++;
          console.error(`  🔐 Капча! (${captchaCount} всего)`);
          
          // При капче - ещё больше ждём
          console.log(`  ⏱️  Дополнительное ожидание 30 секунд...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          console.error(`  ❌ Ошибка: ${error.message}`);
        }
      }

      // Каждые 10 альбомов - длинная пауза
      if (processed % 10 === 0) {
        console.log(`\n  ☕ Перерыв 15 секунд (обработано ${processed})...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    console.log(`\n📊 === ИТОГИ ===`);
    console.log(`✅ Обработано: ${processed}`);
    console.log(`✅ Заполнено: ${successful}`);
    console.log(`✅ Треков добавлено: ${totalTracksAdded}`);
    console.log(`🔐 Капч встречено: ${captchaCount}\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fillVKSlow();

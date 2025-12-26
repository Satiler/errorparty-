/**
 * Медленное заполнение альбомов (чтобы избежать капчи VK)
 * Задержка 5 секунд между запросами
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const vkService = require('./src/services/vk-music.service');

async function fillAlbumsFromSources() {
  console.log('\n🎵 === МЕДЛЕННОЕ ЗАПОЛНЕНИЕ АЛЬБОМОВ ИЗ VK MUSIC ===');
  console.log('⏱️  Задержка: 5 секунд между альбомами\n');

  try {
    // Находим альбомы без треков
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false,
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']]
    });

    const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
    console.log(`📊 Найдено ${emptyAlbums.length} альбомов без треков\n`);

    if (!vkService.isAvailable()) {
      console.log('❌ VK Music недоступен (нет токена)');
      return;
    }

    let processed = 0;
    let successful = 0;
    let totalTracksAdded = 0;
    let captchaCount = 0;

    for (const album of emptyAlbums) {
      processed++;
      console.log(`\n[${processed}/${emptyAlbums.length}] ${album.title} - ${album.artist}`);

      try {
        const vkResults = await vkService.getAlbumTracks(album.artist, album.title, 20);
        
        if (vkResults && vkResults.length > 0) {
          console.log(`  ✅ Найдено ${vkResults.length} треков`);
          
          let added = 0;
          
          for (let i = 0; i < Math.min(vkResults.length, 15); i++) {
            const trackData = vkResults[i];
            
            try {
              // Проверяем URL
              if (!trackData.streamUrl && !trackData.url) {
                console.log(`    ⚠️  Пропущен (нет URL): ${trackData.title}`);
                continue;
              }

              // Проверяем существование
              const existingTrack = await Track.findOne({
                where: {
                  title: trackData.title,
                  artist: trackData.artist
                }
              });

              if (existingTrack && !existingTrack.albumId) {
                await existingTrack.update({ albumId: album.id });
                added++;
                console.log(`    💾 Привязан: ${trackData.title}`);
              } else if (!existingTrack) {
                await Track.create({
                  title: trackData.title,
                  artist: trackData.artist,
                  albumId: album.id,
                  streamUrl: trackData.streamUrl || trackData.url,
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
              console.log(`    ⚠️  Ошибка: ${trackData.title} - ${error.message}`);
            }
          }

          if (added > 0) {
            totalTracksAdded += added;
            successful++;
            console.log(`  ✅ Успешно добавлено ${added} треков`);
          }
        } else {
          console.log(`  ⚠️  Треки не найдены`);
        }

      } catch (error) {
        if (error.message && error.message.includes('Captcha')) {
          captchaCount++;
          console.error(`  ❌ КАПЧА! (${captchaCount} раз)`);
          if (captchaCount >= 3) {
            console.log('\n⏸️  Слишком много капч. Останавливаем процесс.');
            break;
          }
          // Увеличиваем задержку после капчи
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15 секунд
        } else {
          console.error(`  ❌ Ошибка: ${error.message}`);
        }
      }

      // Задержка между запросами
      if (processed < emptyAlbums.length) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 секунд
        process.stdout.write('  ⏱️  Ожидание...\r');
      }
    }

    console.log(`\n\n📊 === ИТОГИ ===`);
    console.log(`✅ Обработано альбомов: ${processed}`);
    console.log(`✅ Успешно заполнено: ${successful}`);
    console.log(`✅ Всего треков добавлено: ${totalTracksAdded}`);
    console.log(`⚠️  Капч получено: ${captchaCount}\n`);

    return { processed, successful, totalTracksAdded };

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fillAlbumsFromSources();

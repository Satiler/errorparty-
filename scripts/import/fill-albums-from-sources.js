/**
 * Автоматическое заполнение альбомов треками ТОЛЬКО из VK Music
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const vkService = require('./src/services/vk-music.service');

async function fillAlbumsFromSources() {
  console.log('\n🎵 === ЗАПОЛНЕНИЕ АЛЬБОМОВ ТРЕКАМИ ИЗ VK MUSIC ===\n');

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

    let processed = 0;
    let successful = 0;
    let totalTracksAdded = 0;

    for (const album of emptyAlbums) {
      processed++;
      console.log(`\n[${processed}/${emptyAlbums.length}] ${album.title} - ${album.artist}`);

      try {
        let tracksFound = [];

        // Поиск только в VK Music
        if (!vkService.isAvailable()) {
          console.log(`  ⚠️  VK Music недоступен (нет токена)`);
          continue;
        }

        console.log(`  🔍 Поиск в VK Music...`);
        try {
          const vkResults = await vkService.getAlbumTracks(album.artist, album.title, 20);
          
          if (vkResults && vkResults.length > 0) {
            console.log(`    ✅ Найдено ${vkResults.length} треков`);
            tracksFound = vkResults;
          }
        } catch (error) {
          console.log(`    ❌ Ошибка VK: ${error.message}`);
        }

        // Создаём треки в базе
        if (tracksFound.length > 0) {
          let added = 0;
          
          for (let i = 0; i < Math.min(tracksFound.length, 15); i++) {
            const trackData = tracksFound[i];
            
            try {
              // Проверяем, не существует ли уже такой трек
              const existingTrack = await Track.findOne({
                where: {
                  title: trackData.title,
                  artist: trackData.artist
                }
              });

              if (existingTrack) {
                // Обновляем albumId у существующего трека
                if (!existingTrack.albumId) {
                  await existingTrack.update({ albumId: album.id });
                  added++;
                  console.log(`    💾 Привязан существующий: ${trackData.title}`);
                }
              } else {
                // Создаём новый трек с правильным streamUrl
                const newTrack = await Track.create({
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
                
                // Проверяем, что URL был добавлен
                if (!newTrack.streamUrl) {
                  console.log(`    ⚠️  Трек без URL: ${trackData.title}`);
                } else {
                  added++;
                  console.log(`    ✅ Добавлен: ${trackData.title}`);
                }
              }
            } catch (error) {
              console.log(`    ⚠️  Пропущен: ${trackData.title} (${error.message})`);
            }
          }

          if (added > 0) {
            totalTracksAdded += added;
            successful++;
            console.log(`  ✅ Успешно добавлено ${added} треков`);
          }
        } else {
          console.log(`  ⚠️  Треки не найдены в VK Music`);
        }

      } catch (error) {
        console.error(`  ❌ Ошибка обработки альбома: ${error.message}`);
      }

      // Задержка между запросами (увеличена для избежания капчи)
      if (processed < emptyAlbums.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды
      }
    }

    console.log(`\n📊 === ИТОГИ ===`);
    console.log(`✅ Обработано альбомов: ${processed}`);
    console.log(`✅ Успешно заполнено: ${successful}`);
    console.log(`✅ Всего треков добавлено: ${totalTracksAdded}\n`);

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

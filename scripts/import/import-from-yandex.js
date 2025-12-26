/**
 * Импорт топ-100 из Яндекс.Музыка
 * Российские чарты и новинки
 */

const { Album, Track } = require('./src/models');
const yandexService = require('./src/services/yandex-music.service');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const vkService = require('./src/services/vk-music.service');

// Поиск трека для получения stream URL
async function findTrackUrl(artist, title) {
  // 1. Пробуем Lmusic.kz
  try {
    const query = `${artist} ${title}`;
    const results = await lmusicService.search(query, 1);
    
    if (results.length > 0 && results[0].streamUrl) {
      console.log('    ✅ Найдено в Lmusic.kz');
      return { url: results[0].streamUrl, source: 'lmusic.kz' };
    }
  } catch (error) {
    // Игнорируем
  }

  // 2. Пробуем VK (если доступен и без капчи)
  if (vkService.isAvailable()) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка
      const results = await vkService.searchTracks(`${artist} ${title}`, 1);
      
      if (results.length > 0 && results[0].streamUrl) {
        console.log('    ✅ Найдено в VK');
        return { url: results[0].streamUrl, source: 'vk-music' };
      }
    } catch (error) {
      console.log('    ⚠️  VK недоступен');
    }
  }

  return null;
}

async function importFromYandex() {
  console.log('\n🎵 === ИМПОРТ ИЗ ЯНДЕКС.МУЗЫКА ===\n');

  try {
    // 1. Получаем топ-100 российского чарта
    console.log('📥 Загрузка топ-100 российского чарта...\n');
    const chartTracks = await yandexService.getRussianTop100();

    if (chartTracks.length === 0) {
      console.log('❌ Не удалось получить чарт Яндекс.Музыка');
      console.log('⚠️  Возможно, требуется обновить парсер или использовать API');
      process.exit(1);
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const chartTrack of chartTracks) {
      try {
        // Проверяем существование
        const existing = await Track.findOne({
          where: {
            title: chartTrack.title,
            artist: chartTrack.artist
          }
        });

        if (existing) {
          skipped++;
          console.log(`[${chartTrack.position}] ⏭️  ${chartTrack.artist} - ${chartTrack.title} (уже есть)`);
          continue;
        }

        console.log(`\n[${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title}`);

        // Ищем URL для стрима
        console.log('  🔍 Поиск stream URL...');
        const urlData = await findTrackUrl(chartTrack.artist, chartTrack.title);
        
        if (!urlData) {
          console.log('  ⚠️  Stream URL не найден, пропускаем');
          failed++;
          continue;
        }

        // Создаем или находим альбом
        let album = null;
        if (chartTrack.album) {
          [album] = await Album.findOrCreate({
            where: {
              title: chartTrack.album,
              artist: chartTrack.artist
            },
            defaults: {
              title: chartTrack.album,
              artist: chartTrack.artist,
              genre: chartTrack.genre || 'Russian Pop',
              coverUrl: chartTrack.image
            }
          });
        }

        // Создаем трек
        await Track.create({
          title: chartTrack.title,
          artist: chartTrack.artist,
          albumId: album?.id || null,
          streamUrl: urlData.url,
          duration: parseInt(chartTrack.duration) || 180,
          genre: chartTrack.genre || 'Russian Pop',
          trackNumber: chartTrack.position,
          source: urlData.source,
          allowDownload: true,
          popularityScore: (100 - chartTrack.position) * 10,
          chartPosition: chartTrack.position,
          trendingDate: new Date(),
          importSource: 'yandex-music-top100'
        });

        imported++;
        console.log(`  💾 Добавлено (источник: ${urlData.source})`);

        // Задержка между треками
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        failed++;
        console.error(`  ❌ Ошибка: ${error.message}`);
      }
    }

    console.log('\n📊 === ИТОГИ ИМПОРТА ===');
    console.log(`Импортировано: ${imported}`);
    console.log(`Пропущено (уже есть): ${skipped}`);
    console.log(`Не удалось импортировать: ${failed}`);
    console.log(`Всего обработано: ${chartTracks.length}`);
    
    if (imported > 0) {
      console.log(`\n✅ Успешно импортировано ${imported} треков из Яндекс.Музыка!`);
    } else {
      console.log('\n⚠️  Новые треки не импортированы');
      console.log('💡 Возможно, все треки уже есть в базе или нет доступных источников для stream URL');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  console.log('\n');
  process.exit(0);
}

importFromYandex().catch(console.error);

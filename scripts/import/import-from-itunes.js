/**
 * Импорт топ-треков из iTunes RSS Charts (БЕЗ API ключей!)
 * Получаем музыку из разных стран
 */

const { Album, Track } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');
const lmusicService = require('./src/modules/music/lmusic-kz.service');

// Поиск трека в Lmusic.kz для получения stream URL
async function findTrackUrl(artist, title) {
  try {
    const query = `${artist} ${title}`;
    const results = await lmusicService.search(query, 1);
    
    if (results.length > 0 && results[0].streamUrl) {
      return results[0].streamUrl;
    }
  } catch (error) {
    // Игнорируем ошибки
  }
  return null;
}

async function importFromItunes() {
  console.log('\n🎵 === ИМПОРТ МУЗЫКИ ИЗ ITUNES CHARTS ===\n');

  try {
    // Страны для импорта
    const countries = [
      { code: 'us', name: 'США', limit: 50 },
      { code: 'ru', name: 'Россия', limit: 50 },
      { code: 'gb', name: 'Великобритания', limit: 30 },
      { code: 'de', name: 'Германия', limit: 30 },
      { code: 'fr', name: 'Франция', limit: 30 },
      { code: 'jp', name: 'Япония', limit: 30 }
    ];

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const country of countries) {
      console.log(`\n🌍 === ${country.name.toUpperCase()} ===\n`);

      try {
        // Получаем топ из iTunes
        const chartTracks = await itunesService.getTopSongs(country.code, country.limit);
        
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
              continue;
            }

            console.log(`[${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title}`);

            // Ищем URL для стрима
            let streamUrl = null;
            console.log('  🔍 Поиск stream URL...');
            
            streamUrl = await findTrackUrl(chartTrack.artist, chartTrack.title);
            
            if (streamUrl) {
              console.log('  ✅ Stream URL найден');
            } else {
              console.log('  ⚠️  Stream URL не найден, используем preview');
              streamUrl = chartTrack.preview || null;
            }

            // Создаем или находим альбом
            let album = null;
            if (chartTrack.album && chartTrack.album !== 'Unknown') {
              [album] = await Album.findOrCreate({
                where: {
                  title: chartTrack.album,
                  artist: chartTrack.artist
                },
                defaults: {
                  title: chartTrack.album,
                  artist: chartTrack.artist,
                  releaseDate: chartTrack.releaseDate ? new Date(chartTrack.releaseDate) : null,
                  genre: chartTrack.genre,
                  coverUrl: chartTrack.image
                }
              });
            }

            // Создаем трек
            await Track.create({
              title: chartTrack.title,
              artist: chartTrack.artist,
              albumId: album?.id || null,
              streamUrl: streamUrl,
              duration: 180, // Дефолтная длительность
              genre: chartTrack.genre,
              trackNumber: chartTrack.position,
              source: `itunes-${country.code}`,
              allowDownload: !!streamUrl,
              popularityScore: (100 - chartTrack.position) * 10,
              chartPosition: chartTrack.position,
              trendingDate: new Date(),
              importSource: `itunes-${country.code}-charts`
            });

            imported++;
            console.log('  💾 Добавлено\n');

            // Задержка между треками
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            failed++;
            console.error(`  ❌ Ошибка: ${error.message}\n`);
          }
        }

        console.log(`\n📊 ${country.name}: импортировано ${imported}, пропущено ${skipped}, ошибок ${failed}`);
        
        totalImported += imported;
        totalSkipped += skipped;
        totalFailed += failed;

        // Задержка между странами
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Ошибка импорта ${country.name}:`, error.message);
      }
    }

    console.log('\n📊 === ИТОГИ ИМПОРТА ===');
    console.log(`Импортировано: ${totalImported}`);
    console.log(`Пропущено: ${totalSkipped}`);
    console.log(`Ошибок: ${totalFailed}`);
    console.log(`\n✅ Импорт завершен!\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  process.exit(0);
}

importFromItunes().catch(console.error);

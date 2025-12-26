/**
 * Финальный скрипт импорта музыки
 * Использует только рабочие источники: iTunes RSS + существующие треки
 */

const { Album, Track } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');

async function finalMusicImport() {
  console.log('\n🎵 === ИМПОРТ МУЗЫКИ ИЗ ITUNES ===\n');
  console.log('📥 iTunes RSS Charts - БЕЗ API ключей!\n');

  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    byCountry: {}
  };

  try {
    // Страны с хорошим контентом
    const countries = [
      { code: 'us', name: 'США 🇺🇸', limit: 100, genres: ['Pop', 'Rock', 'Hip-Hop/Rap', 'Electronic'] },
      { code: 'ru', name: 'Россия 🇷🇺', limit: 100, genres: ['Pop', 'Rock', 'Hip-Hop/Rap'] },
      { code: 'gb', name: 'Великобритания 🇬🇧', limit: 50, genres: ['Rock', 'Alternative', 'Electronic'] },
      { code: 'de', name: 'Германия 🇩🇪', limit: 50, genres: ['Electronic', 'Rock'] },
      { code: 'fr', name: 'Франция 🇫🇷', limit: 50, genres: ['Pop', 'Electronic'] },
      { code: 'jp', name: 'Япония 🇯🇵', limit: 50, genres: ['Pop', 'Rock'] }
    ];

    for (const country of countries) {
      console.log(`\n🌍 === ${country.name} - ТОП ${country.limit} ===\n`);

      try {
        // Получаем топ из iTunes
        const tracks = await itunesService.getTopSongs(country.code, country.limit);
        
        let imported = 0;
        let skipped = 0;

        for (const chartTrack of tracks) {
          stats.total++;

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
              stats.skipped++;
              continue;
            }

            // Создаем альбом
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

            // Создаем трек (используем preview URL или пустой)
            await Track.create({
              title: chartTrack.title,
              artist: chartTrack.artist,
              albumId: album?.id || null,
              streamUrl: chartTrack.preview || `itunes://track/${chartTrack.position}`, // Временный URL
              duration: 180,
              genre: chartTrack.genre,
              trackNumber: chartTrack.position,
              source: `itunes-${country.code}`,
              allowDownload: false, // Preview только
              popularityScore: (country.limit - chartTrack.position + 1) * 10,
              chartPosition: chartTrack.position,
              trendingDate: new Date(),
              importSource: `itunes-${country.code}-charts`
            });

            imported++;
            stats.imported++;

            if (imported % 10 === 0) {
              console.log(`  ✅ Импортировано: ${imported}/${tracks.length}`);
            }

          } catch (error) {
            if (!error.message.includes('unique')) {
              console.error(`  ⚠️  Ошибка: ${error.message}`);
            }
          }
        }

        stats.byCountry[country.code] = { imported, skipped, total: tracks.length };
        
        console.log(`\n📊 ${country.name}:`);
        console.log(`  ✅ Импортировано: ${imported}`);
        console.log(`  ⏭️  Пропущено: ${skipped}`);
        console.log(`  📈 Всего: ${tracks.length}`);

        // Задержка между странами
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Ошибка ${country.name}:`, error.message);
      }
    }

    // Итоги
    console.log('\n\n📊 === ИТОГОВАЯ СТАТИСТИКА ===\n');
    console.log(`Всего обработано: ${stats.total}`);
    console.log(`✅ Импортировано: ${stats.imported}`);
    console.log(`⏭️  Пропущено (уже есть): ${stats.skipped}`);
    console.log(`📈 Успешность: ${Math.round((stats.imported / stats.total) * 100)}%`);

    console.log('\n📈 По странам:');
    for (const [code, data] of Object.entries(stats.byCountry)) {
      console.log(`  ${code.toUpperCase()}: ${data.imported}/${data.total} (${Math.round((data.imported/data.total)*100)}%)`);
    }

    // Финальная статистика БД
    console.log('\n💾 === БАЗА ДАННЫХ ===\n');
    const totalTracks = await Track.count();
    const totalAlbums = await Album.count();
    
    console.log(`Всего треков: ${totalTracks}`);
    console.log(`Всего альбомов: ${totalAlbums}`);

    if (stats.imported > 0) {
      console.log(`\n✅ Успешно импортировано ${stats.imported} новых треков из iTunes!`);
      console.log('📌 Треки добавлены с preview URL');
      console.log('💡 Для полных версий настройте VK API или другие источники\n');
    } else {
      console.log('\n⚠️  Новые треки не импортированы - все уже есть в базе\n');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  process.exit(0);
}

finalMusicImport().catch(console.error);

/**
 * Комбинированный импорт из всех источников
 * iTunes RSS + Яндекс.Музыка
 */

const { Album, Track } = require('./src/models');
const itunesService = require('./src/services/lastfm.service');
const yandexService = require('./src/services/yandex-music.service');
const lmusicService = require('./src/modules/music/lmusic-kz.service');

// Статистика импорта
const stats = {
  total: 0,
  imported: 0,
  skipped: 0,
  failed: 0,
  bySource: {}
};

// Поиск stream URL
async function findStreamUrl(artist, title) {
  try {
    const query = `${artist} ${title}`;
    const results = await lmusicService.search(query, 1);
    
    if (results.length > 0 && results[0].streamUrl) {
      return results[0].streamUrl;
    }
  } catch (error) {
    // Игнорируем
  }
  return null;
}

// Импорт трека
async function importTrack(trackData, source) {
  stats.total++;
  
  try {
    // Проверяем существование
    const existing = await Track.findOne({
      where: {
        title: trackData.title,
        artist: trackData.artist
      }
    });

    if (existing) {
      stats.skipped++;
      return false;
    }

    // Ищем stream URL
    const streamUrl = await findStreamUrl(trackData.artist, trackData.title);
    
    if (!streamUrl) {
      stats.failed++;
      return false;
    }

    // Создаем альбом если есть
    let album = null;
    if (trackData.album && trackData.album !== 'Unknown') {
      [album] = await Album.findOrCreate({
        where: {
          title: trackData.album,
          artist: trackData.artist
        },
        defaults: {
          title: trackData.album,
          artist: trackData.artist,
          genre: trackData.genre,
          coverUrl: trackData.image
        }
      });
    }

    // Создаем трек
    await Track.create({
      title: trackData.title,
      artist: trackData.artist,
      albumId: album?.id || null,
      streamUrl: streamUrl,
      duration: trackData.duration || 180,
      genre: trackData.genre,
      trackNumber: trackData.position,
      source: 'lmusic.kz',
      allowDownload: true,
      popularityScore: trackData.position ? (100 - trackData.position) * 10 : 50,
      chartPosition: trackData.position,
      trendingDate: new Date(),
      importSource: source
    });

    stats.imported++;
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    
    return true;

  } catch (error) {
    stats.failed++;
    console.error(`  ❌ ${error.message}`);
    return false;
  }
}

async function combinedImport() {
  console.log('\n🎵 === КОМБИНИРОВАННЫЙ ИМПОРТ МУЗЫКИ ===\n');
  console.log('📥 Источники: iTunes RSS + Яндекс.Музыка');
  console.log('🔗 Stream URL: Lmusic.kz\n');

  try {
    // 1. Импорт из iTunes (топ разных стран)
    console.log('🌍 === ITUNES CHARTS ===\n');
    
    const countries = [
      { code: 'us', name: 'США 🇺🇸', limit: 30 },
      { code: 'ru', name: 'Россия 🇷🇺', limit: 30 },
      { code: 'gb', name: 'Великобритания 🇬🇧', limit: 20 },
      { code: 'de', name: 'Германия 🇩🇪', limit: 20 }
    ];

    for (const country of countries) {
      console.log(`📊 ${country.name} - топ ${country.limit}`);
      
      try {
        const tracks = await itunesService.getTopSongs(country.code, country.limit);
        
        let countryImported = 0;
        for (const track of tracks) {
          const imported = await importTrack(track, `itunes-${country.code}`);
          if (imported) {
            countryImported++;
            console.log(`  ✅ [${track.position}] ${track.artist} - ${track.title}`);
          }
          
          // Задержка
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log(`  📊 Импортировано: ${countryImported}/${tracks.length}\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Ошибка: ${error.message}\n`);
      }
    }

    // 2. Импорт из Яндекс.Музыка
    console.log('\n🎵 === ЯНДЕКС.МУЗЫКА ===\n');
    console.log('📊 Топ-100 российского чарта');
    
    try {
      const yandexTracks = await yandexService.getRussianTop100();
      
      if (yandexTracks.length > 0) {
        let yandexImported = 0;
        
        for (const track of yandexTracks.slice(0, 50)) { // Берем первые 50
          const imported = await importTrack(track, 'yandex-music');
          if (imported) {
            yandexImported++;
            console.log(`  ✅ [${track.position}] ${track.artist} - ${track.title}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`  📊 Импортировано: ${yandexImported}/${yandexTracks.length}\n`);
      } else {
        console.log('  ⚠️  Яндекс.Музыка недоступна\n');
      }
      
    } catch (error) {
      console.error(`  ❌ Ошибка: ${error.message}\n`);
    }

    // Итоги
    console.log('\n📊 === ИТОГОВАЯ СТАТИСТИКА ===\n');
    console.log(`Всего обработано: ${stats.total}`);
    console.log(`✅ Импортировано: ${stats.imported}`);
    console.log(`⏭️  Пропущено (уже есть): ${stats.skipped}`);
    console.log(`❌ Не удалось: ${stats.failed}`);
    
    console.log('\n📈 По источникам:');
    for (const [source, count] of Object.entries(stats.bySource)) {
      console.log(`  ${source}: ${count} треков`);
    }

    if (stats.imported > 0) {
      console.log(`\n✅ Успешно импортировано ${stats.imported} новых треков!`);
    } else {
      console.log('\n⚠️  Новые треки не импортированы');
      console.log('💡 Возможные причины:');
      console.log('   - Все треки уже есть в базе');
      console.log('   - Lmusic.kz не нашел stream URL');
      console.log('   - Проблемы с доступом к источникам');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  console.log('\n');
  process.exit(0);
}

combinedImport().catch(console.error);

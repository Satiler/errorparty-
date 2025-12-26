const { parseKissvkAlbums } = require('./parse-kissvk-albums');
const { sequelize, Track, Artist, Genre, Album } = require('./src/models');
const { KissVKService } = require('./src/services/kissvk.service');

const kissvkService = new KissVKService();

async function importAlbum(albumData) {
  console.log(`\n📀 Импорт: ${albumData.artist} - ${albumData.title}`);
  console.log(`   URL: ${albumData.url}`);
  
  try {
    // Извлекаем треки с альбома
    const result = await kissvkService.extractTracks(albumData.url);
    
    if (!result.success || !result.tracks || result.tracks.length === 0) {
      console.log(`   ⚠️  Треки не найдены`);
      return { success: false, tracks: 0 };
    }
    
    const tracks = result.tracks;
    console.log(`   🎵 Найдено треков: ${tracks.length}`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const trackData of tracks) {
      try {
        // Проверяем есть ли уже такой трек
        const existing = await Track.findOne({
          where: {
            title: trackData.title,
            artist: trackData.artist
          }
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Находим или создаём жанр
        const [genre] = await Genre.findOrCreate({
          where: { name: albumData.genre },
          defaults: { description: `Auto-imported from kissvk` }
        });
        
        // Создаём трек
        await Track.create({
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration || 0,
          genre: albumData.genre,
          genreId: genre.id,
          url: trackData.url,
          isPublic: true,
          playCount: 0,
          source: 'kissvk',
          sourceUrl: trackData.url
        });
        
        imported++;
        
      } catch (err) {
        console.error(`   ❌ Ошибка импорта трека "${trackData.title}":`, err.message);
      }
    }
    
    console.log(`   ✅ Импортировано: ${imported}, пропущено: ${skipped}`);
    return { success: true, tracks: imported, skipped };
    
  } catch (error) {
    console.error(`   ❌ Ошибка импорта альбома:`, error.message);
    return { success: false, tracks: 0, error: error.message };
  }
}

async function main() {
  console.log('🎵 ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ С KISSVK\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно\n');
    
    // Парсим альбомы
    console.log('📥 Парсинг списка альбомов...');
    const allAlbums = await parseKissvkAlbums();
    
    // Берём топ-30 из чарта
    const chartAlbums = allAlbums
      .filter(a => a.source === 'Чарт альбомов')
      .slice(0, 30);
    
    console.log(`\n🔥 Отобрано для импорта: ${chartAlbums.length} альбомов из чарта\n`);
    
    const stats = {
      total: chartAlbums.length,
      success: 0,
      failed: 0,
      tracksImported: 0,
      tracksSkipped: 0
    };
    
    // Импортируем по одному
    for (let i = 0; i < chartAlbums.length; i++) {
      const album = chartAlbums[i];
      console.log(`\n[${i + 1}/${chartAlbums.length}]`);
      
      const result = await importAlbum(album);
      
      if (result.success) {
        stats.success++;
        stats.tracksImported += result.tracks;
        stats.tracksSkipped += result.skipped || 0;
      } else {
        stats.failed++;
      }
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\n═══════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('═══════════════════════════════════════');
    console.log(`Всего альбомов: ${stats.total}`);
    console.log(`✅ Успешно: ${stats.success}`);
    console.log(`❌ Ошибок: ${stats.failed}`);
    console.log(`🎵 Треков импортировано: ${stats.tracksImported}`);
    console.log(`⏭️  Треков пропущено: ${stats.tracksSkipped}`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

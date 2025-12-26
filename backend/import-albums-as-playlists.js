const { parseKissvkAlbums } = require('./parse-kissvk-albums');
const { sequelize, Track, Playlist, PlaylistTrack } = require('./src/models');
const { KissVKService } = require('./src/services/kissvk.service');

const kissvkService = new KissVKService();

async function importAlbumAsPlaylist(albumData, userId = 1) {
  console.log(`\n📀 Импорт альбома как плейлиста:`);
  console.log(`   ${albumData.artist} - ${albumData.title}`);
  console.log(`   URL: ${albumData.url}`);
  
  try {
    // Проверяем, есть ли уже такой плейлист
    const existing = await Playlist.findOne({
      where: {
        name: `${albumData.artist} - ${albumData.title}`,
        userId
      }
    });
    
    if (existing) {
      console.log(`   ⏭️  Плейлист уже существует`);
      return { success: true, created: false, playlist: existing };
    }
    
    // Извлекаем треки с альбома
    const result = await kissvkService.extractTracks(albumData.url);
    
    if (!result.success || !result.tracks || result.tracks.length === 0) {
      console.log(`   ⚠️  Треки не найдены`);
      return { success: false, error: 'No tracks found' };
    }
    
    console.log(`   🎵 Найдено треков: ${result.tracks.length}`);
    
    // Создаём плейлист
    const playlist = await Playlist.create({
      name: `${albumData.artist} - ${albumData.title}`,
      description: `Альбом ${albumData.genre} ${albumData.year} с kissvk.top`,
      userId: userId,
      isPublic: true,
      coverImage: result.tracks[0]?.coverUrl || null
    });
    
    console.log(`   ✅ Плейлист создан (ID: ${playlist.id})`);
    
    // Добавляем треки в плейлист
    let added = 0;
    let notFound = 0;
    
    for (let i = 0; i < result.tracks.length; i++) {
      const trackData = result.tracks[i];
      
      // Ищем трек в базе по названию и исполнителю
      const track = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });
      
      if (track) {
        // Добавляем трек в плейлист
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: track.id,
          position: i
        });
        added++;
      } else {
        notFound++;
      }
    }
    
    console.log(`   ✅ Добавлено треков: ${added}`);
    if (notFound > 0) {
      console.log(`   ⚠️  Треков не найдено в БД: ${notFound}`);
    }
    
    return { success: true, created: true, playlist, tracksAdded: added };
    
  } catch (error) {
    console.error(`   ❌ Ошибка:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎵 ИМПОРТ ПОПУЛЯРНЫХ АЛЬБОМОВ КАК ПЛЕЙЛИСТОВ\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно\n');
    
    // Парсим альбомы
    console.log('📥 Парсинг списка альбомов...');
    const allAlbums = await parseKissvkAlbums();
    
    // Берём топ-20 из чарта
    const chartAlbums = allAlbums
      .filter(a => a.source === 'Чарт альбомов')
      .slice(0, 20);
    
    console.log(`\n🔥 Отобрано для импорта: ${chartAlbums.length} альбомов из чарта\n`);
    
    const stats = {
      total: chartAlbums.length,
      created: 0,
      skipped: 0,
      failed: 0,
      tracksAdded: 0
    };
    
    // Импортируем по одному
    for (let i = 0; i < chartAlbums.length; i++) {
      const album = chartAlbums[i];
      console.log(`\n[${i + 1}/${chartAlbums.length}]`);
      
      const result = await importAlbumAsPlaylist(album);
      
      if (result.success) {
        if (result.created) {
          stats.created++;
          stats.tracksAdded += result.tracksAdded || 0;
        } else {
          stats.skipped++;
        }
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
    console.log(`✅ Создано плейлистов: ${stats.created}`);
    console.log(`⏭️  Пропущено (уже есть): ${stats.skipped}`);
    console.log(`❌ Ошибок: ${stats.failed}`);
    console.log(`🎵 Треков добавлено в плейлисты: ${stats.tracksAdded}`);
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

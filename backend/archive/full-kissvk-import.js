/**
 * Полный импорт: новые альбомы + чарт треков + чарт альбомов
 */

const { getInstance: getPuppeteer } = require('./src/services/kissvk-puppeteer.service');
const { Track, Album, Playlist, sequelize } = require('./src/models');

async function fullImport() {
  console.log('🚀 Полный импорт музыки с KissVK...\n');
  
  try {
    // Инициализация
    const puppeteer = getPuppeteer(3);
    await puppeteer.initBrowserPool();
    console.log('✅ Браузеры готовы\n');
    
    // ========== 1. НОВЫЕ АЛЬБОМЫ ==========
    console.log('📀 === ИМПОРТ НОВЫХ АЛЬБОМОВ ===\n');
    const newAlbums = await puppeteer.getNewAlbums(20);
    console.log(`📥 Найдено новых альбомов: ${newAlbums.length}\n`);
    
    let importedAlbums = 0;
    let existingAlbums = 0;
    let totalTracks = 0;
    
    for (const albumData of newAlbums) {
      try {
        const existing = await Album.findOne({
          where: {
            providerAlbumId: albumData.playlistId,
            provider: 'kissvk'
          }
        });
        
        if (existing) {
          existingAlbums++;
          continue;
        }
        
        console.log(`\n📀 ${albumData.artist} - ${albumData.title}`);
        
        // Получаем треки альбома
        const playlistData = await puppeteer.getPlaylistTracks(albumData.playlistId);
        
        if (!playlistData || playlistData.tracks.length === 0) {
          console.log('   ⚠️  Нет треков, пропускаем');
          continue;
        }
        
        // Создаем альбом
        const album = await Album.create({
          title: playlistData.title || albumData.title,
          artist: playlistData.artist || albumData.artist,
          coverUrl: playlistData.coverUrl || albumData.coverUrl,
          description: `Импортировано с kissvk.top`,
          releaseYear: new Date().getFullYear(),
          source: 'kissvk.top',
          provider: 'kissvk',
          providerAlbumId: albumData.playlistId,
          uploadedBy: 1,
          isPublic: true,
          totalTracks: playlistData.tracks.length
        });
        
        console.log(`   ✅ Альбом создан (ID: ${album.id})`);
        
        // Импортируем треки
        let trackCount = 0;
        for (const trackData of playlistData.tracks) {
          try {
            const existingTrack = await Track.findOne({
              where: {
                title: trackData.title,
                artist: trackData.artist
              }
            });
            
            if (existingTrack) continue;
            
            await Track.create({
              title: trackData.title,
              artist: trackData.artist,
              duration: trackData.duration || 0,
              albumId: album.id,
              trackNumber: trackData.trackNumber,
              streamUrl: trackData.streamUrl,
              coverUrl: trackData.coverUrl || album.coverUrl,
              provider: 'kissvk',
              providerTrackId: trackData.trackId,
              uploadedBy: 1,
              isPublic: true
            });
            
            trackCount++;
            totalTracks++;
          } catch (err) {
            // Игнорируем ошибки отдельных треков
          }
        }
        
        console.log(`   🎵 Импортировано треков: ${trackCount}`);
        importedAlbums++;
        
      } catch (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Новые альбомы:`);
    console.log(`   📀 Альбомов: ${importedAlbums}`);
    console.log(`   🎵 Треков: ${totalTracks}`);
    console.log(`   ♻️  Существующих: ${existingAlbums}\n`);
    
    // ========== 2. ЧАРТ ТРЕКОВ ==========
    console.log('📊 === ИМПОРТ ЧАРТА ТРЕКОВ ===\n');
    const chartTracks = await puppeteer.getTracksChart(50);
    console.log(`📥 Найдено треков в чарте: ${chartTracks.length}\n`);
    
    // Создаем плейлист для чарта
    const chartDate = new Date().toLocaleDateString('ru-RU');
    const [playlist] = await Playlist.findOrCreate({
      where: { 
        name: `KissVK Chart - ${chartDate}`,
        type: 'editorial'
      },
      defaults: {
        description: `Топ-50 треков с kissvk.top на ${chartDate}`,
        isPublic: true,
        userId: 1,
        type: 'editorial'
      }
    });
    
    let importedTracks = 0;
    let existingTracks = 0;
    const trackIds = [];
    
    for (const trackData of chartTracks) {
      try {
        let track = await Track.findOne({
          where: {
            title: trackData.title,
            artist: trackData.artist
          }
        });
        
        if (!track) {
          track = await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            duration: trackData.duration || 0,
            streamUrl: trackData.streamUrl,
            coverUrl: trackData.coverUrl,
            provider: 'kissvk',
            providerTrackId: trackData.trackId,
            uploadedBy: 1,
            isPublic: true
          });
          
          console.log(`   ✅ #${trackData.chartPosition} ${trackData.artist} - ${trackData.title}`);
          importedTracks++;
        } else {
          existingTracks++;
        }
        
        trackIds.push({ id: track.id, position: trackData.chartPosition || trackIds.length + 1 });
      } catch (err) {
        console.error(`   ❌ ${trackData.title}: ${err.message}`);
      }
    }
    
    // Обновляем плейлист
    await sequelize.query('DELETE FROM "PlaylistTracks" WHERE "playlistId" = ?', {
      replacements: [playlist.id]
    });
    
    for (const { id, position } of trackIds) {
      await sequelize.query(
        'INSERT INTO "PlaylistTracks" ("playlistId", "trackId", position) VALUES (?, ?, ?)',
        { replacements: [playlist.id, id, position] }
      );
    }
    
    console.log(`\n✅ Чарт треков:`);
    console.log(`   🆕 Новых: ${importedTracks}`);
    console.log(`   ♻️  Существующих: ${existingTracks}`);
    console.log(`   📋 Плейлист ID: ${playlist.id}\n`);
    
    // ========== 3. ЧАРТ АЛЬБОМОВ ==========
    console.log('📊 === ИМПОРТ ЧАРТА АЛЬБОМОВ (топ-15) ===\n');
    const chartAlbums = await puppeteer.getAlbumsChart(15);
    console.log(`📥 Найдено альбомов в чарте: ${chartAlbums.length}\n`);
    
    let chartAlbumsImported = 0;
    let chartAlbumsExisting = 0;
    
    for (const albumData of chartAlbums) {
      try {
        const existing = await Album.findOne({
          where: {
            providerAlbumId: albumData.playlistId,
            provider: 'kissvk'
          }
        });
        
        if (existing) {
          chartAlbumsExisting++;
          continue;
        }
        
        const album = await Album.create({
          title: albumData.title,
          artist: albumData.artist,
          coverUrl: albumData.coverUrl,
          description: `Чарт альбомов KissVK - Позиция #${albumData.chartPosition}`,
          releaseYear: new Date().getFullYear(),
          source: 'kissvk.top',
          provider: 'kissvk',
          providerAlbumId: albumData.playlistId,
          uploadedBy: 1,
          isPublic: true,
          totalTracks: 0
        });
        
        console.log(`   ✅ #${albumData.chartPosition} ${albumData.artist} - ${albumData.title} (ID: ${album.id})`);
        chartAlbumsImported++;
      } catch (err) {
        console.error(`   ❌ ${albumData.title}: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Чарт альбомов:`);
    console.log(`   🆕 Новых: ${chartAlbumsImported}`);
    console.log(`   ♻️  Существующих: ${chartAlbumsExisting}\n`);
    
    // ========== ИТОГИ ==========
    console.log('🎉 === ИМПОРТ ЗАВЕРШЁН ===\n');
    console.log(`📀 Альбомов импортировано: ${importedAlbums + chartAlbumsImported}`);
    console.log(`🎵 Треков импортировано: ${totalTracks + importedTracks}`);
    console.log(`📋 Плейлистов создано: 1\n`);
    
    await puppeteer.closeBrowserPool();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fullImport();

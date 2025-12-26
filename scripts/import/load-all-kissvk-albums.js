/**
 * Загрузка всех альбомов с KissVK
 * 1. Получаем чарт альбомов (топ 50)
 * 2. Получаем новые альбомы (30 последних)
 * 3. Для каждого альбома загружаем треки
 * 4. Создаем альбомы и треки в базе
 */

const { Track, Album, Playlist, PlaylistTrack, sequelize } = require('./src/models');
const kissvkServiceModule = require('./src/services/kissvk-puppeteer.service');

const kissvkService = kissvkServiceModule.getInstance();

async function loadAllAlbums() {
  try {
    console.log('🚀 Начало загрузки альбомов с KissVK...\n');

    // Инициализация браузеров
    await kissvkService.initBrowserPool();

    let allAlbums = [];
    const processedPlaylistIds = new Set();

    // 1. Загружаем чарт альбомов
    console.log('\n📊 Загрузка чарта альбомов...');
    const chartAlbums = await kissvkService.getAlbumsChart(100);
    console.log(`   Найдено альбомов в чарте: ${chartAlbums.length}`);
    
    for (const album of chartAlbums) {
      if (!processedPlaylistIds.has(album.playlistId)) {
        allAlbums.push(album);
        processedPlaylistIds.add(album.playlistId);
      }
    }

    // 2. Загружаем новые альбомы
    console.log('\n🆕 Загрузка новых альбомов...');
    const newAlbums = await kissvkService.getNewAlbums(50);
    console.log(`   Найдено новых альбомов: ${newAlbums.length}`);
    
    for (const album of newAlbums) {
      if (!processedPlaylistIds.has(album.playlistId)) {
        allAlbums.push(album);
        processedPlaylistIds.add(album.playlistId);
      }
    }

    console.log(`\n✅ Всего уникальных альбомов для загрузки: ${allAlbums.length}\n`);

    // 3. Обрабатываем каждый альбом
    let processedCount = 0;
    let createdAlbums = 0;
    let createdTracks = 0;
    let skippedAlbums = 0;

    for (const albumData of allAlbums) {
      processedCount++;
      console.log(`\n[${processedCount}/${allAlbums.length}] Обработка: ${albumData.artist} - ${albumData.title}`);

      try {
        // Загружаем треки альбома
        console.log(`   🎵 Загрузка треков плейлиста ${albumData.playlistId}...`);
        const playlistResult = await kissvkService.getPlaylistTracks(albumData.playlistId);
        const playlistTracks = playlistResult?.tracks || [];
        
        if (playlistTracks.length === 0) {
          console.log(`   ⚠️  Треки не найдены, пропускаем`);
          continue;
        }

        console.log(`   📦 Найдено треков: ${playlistTracks.length}`);

        // Проверяем, существует ли альбом в базе
        let albumRecord = await Album.findOne({
          where: {
            provider: 'kissvk',
            providerAlbumId: albumData.playlistId
          }
        });

        if (albumRecord) {
          const existingTrackCount = await Track.count({ where: { albumId: albumRecord.id } });
          if (existingTrackCount >= playlistTracks.length) {
            console.log(`   ⏭️  Альбом уже содержит ${existingTrackCount} треков, пропускаем`);
            skippedAlbums++;
            continue;
          }
          console.log(`   ℹ️  Альбом уже есть (ID: ${albumRecord.id}), обновляем ${existingTrackCount}/${playlistTracks.length} треков`);
        } else {
          albumRecord = await Album.create({
            title: albumData.title,
            artist: albumData.artist,
            coverUrl: albumData.coverUrl || playlistResult?.coverUrl || null,
            releaseDate: playlistResult?.releaseDate || new Date(),
            genre: null,
            provider: 'kissvk',
            providerAlbumId: albumData.playlistId,
            trackCount: playlistTracks.length
          });

          createdAlbums++;
          console.log(`   ✅ Альбом создан (ID: ${albumRecord.id})`);
        }

        // Создаем треки
        let albumTracksCreated = 0;
        for (let i = 0; i < playlistTracks.length; i++) {
          const trackData = playlistTracks[i];
          
          try {
            // Проверяем, существует ли трек
            const existingTrack = await Track.findOne({
              where: {
                provider: 'kissvk',
                providerTrackId: trackData.trackId
              }
            });

            if (existingTrack) {
              // Обновляем albumId если нужно
              if (!existingTrack.albumId) {
                await existingTrack.update({ albumId: albumRecord.id });
                albumTracksCreated++;
              }
              continue;
            }

            // Создаем новый трек
            await Track.create({
              title: trackData.title,
              artist: trackData.artist,
              duration: trackData.duration || 0,
              streamUrl: trackData.streamUrl,
              coverUrl: trackData.coverUrl || albumData.coverUrl || null,
              albumId: albumRecord.id,
              genre: null,
              isPublic: true,
              provider: 'kissvk',
              providerTrackId: trackData.trackId
            });

            albumTracksCreated++;
            createdTracks++;

          } catch (trackError) {
            console.log(`   ⚠️  Ошибка создания трека: ${trackError.message}`);
          }
        }

        // Обновим счётчик треков после вставки
        const finalTrackCount = await Track.count({ where: { albumId: albumRecord.id } });
        await albumRecord.update({ trackCount: finalTrackCount });
        console.log(`   💾 Создано треков для альбома: ${albumTracksCreated}/${playlistTracks.length} (всего ${finalTrackCount})`);

        // Небольшая задержка между альбомами
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ❌ Ошибка обработки альбома:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 СТАТИСТИКА ЗАГРУЗКИ:');
    console.log('='.repeat(60));
    console.log(`✅ Создано альбомов: ${createdAlbums}`);
    console.log(`✅ Создано треков: ${createdTracks}`);
    console.log(`⏭️  Пропущено альбомов: ${skippedAlbums}`);
    console.log(`📦 Всего обработано: ${processedCount}`);
    console.log('='.repeat(60) + '\n');

    // Закрываем браузеры
    await kissvkService.closeBrowserPool();

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    await kissvkService.closeBrowserPool();
    process.exit(1);
  }
}

// Запуск
loadAllAlbums()
  .then(() => {
    console.log('✅ Загрузка завершена успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });

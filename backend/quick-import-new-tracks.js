/**
 * 🔥 БЫСТРЫЙ ИМПОРТ НОВЫХ ПОПУЛЯРНЫХ ТРЕКОВ
 * Загружает топ треков из KissVK и добавляет в базу
 */

const { sequelize, Track, User, Playlist, PlaylistTrack } = require('./src/models');
const { getInstance: getKissVK } = require('./src/services/kissvk.service');

async function quickImportNewTracks() {
  console.log('🚀 БЫСТРЫЙ ИМПОРТ НОВЫХ ТРЕКОВ\n');
  console.log('='.repeat(80));
  
  const kissvk = getKissVK();

  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно\n');

    // Получаем system user
    let systemUser = await User.findOne({ where: { username: 'system' } });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'system',
        email: 'system@errorparty.local',
        password: 'system',
        isAdmin: true
      });
    }

    // ============================================================
    // 1. ИМПОРТ ИЗ ЧАРТА KISSVK
    // ============================================================
    console.log('📊 1. ИМПОРТ ИЗ ЧАРТА KISSVK');
    console.log('-'.repeat(80));
    
    const chartResult = await kissvk.extractTracks('https://kissvk.top/tracks_chart', 30);
    
    if (!chartResult.success) {
      console.log('❌ Ошибка загрузки чарта');
      process.exit(1);
    }

    console.log(`✅ Извлечено ${chartResult.tracks.length} треков из чарта`);
    
    // Декодируем треки
    console.log('🔓 Декодирование треков...');
    const decryptedTracks = await kissvk.decryptTracks(chartResult.tracks);
    const validTracks = decryptedTracks.filter(t => t.streamUrl);
    
    console.log(`✅ Декодировано ${validTracks.length} треков\n`);

    // Добавляем треки в базу
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const trackData of validTracks) {
      try {
        // Проверяем существование
        let track = await Track.findOne({
          where: {
            title: trackData.title,
            artist: trackData.artist
          }
        });

        if (track) {
          // Обновляем URL если изменился
          if (track.streamUrl !== trackData.streamUrl) {
            await track.update({
              streamUrl: trackData.streamUrl,
              coverUrl: trackData.coverUrl || track.coverUrl
            });
            updated++;
            console.log(`🔄 ${trackData.artist} - ${trackData.title}`);
          } else {
            skipped++;
          }
        } else {
          // Создаем новый трек
          track = await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            duration: trackData.duration || 0,
            streamUrl: trackData.streamUrl,
            coverUrl: trackData.coverUrl,
            source: 'kissvk',
            provider: 'kissvk',
            isPublic: true,
            uploadedBy: systemUser.id,
            playCount: 0,
            likeCount: 0
          });
          added++;
          console.log(`✅ ${trackData.artist} - ${trackData.title}`);
        }
      } catch (error) {
        console.log(`❌ ${trackData.artist} - ${trackData.title}: ${error.message}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ ИМПОРТА:');
    console.log(`   ✅ Добавлено новых: ${added}`);
    console.log(`   🔄 Обновлено: ${updated}`);
    console.log(`   ⏭️  Пропущено: ${skipped}`);

    // ============================================================
    // 2. СОЗДАНИЕ ПЛЕЙЛИСТА "ПОПУЛЯРНОЕ СЕЙЧАС"
    // ============================================================
    console.log('\n📀 2. СОЗДАНИЕ ПЛЕЙЛИСТА "ПОПУЛЯРНОЕ СЕЙЧАС"');
    console.log('-'.repeat(80));

    let popularPlaylist = await Playlist.findOne({
      where: {
        name: '🔥 Популярное сейчас (KissVK)',
        userId: systemUser.id
      }
    });

    if (popularPlaylist) {
      // Очищаем старые треки
      await PlaylistTrack.destroy({
        where: { playlistId: popularPlaylist.id }
      });
      console.log('♻️  Обновляем существующий плейлист...');
    } else {
      // Создаем новый
      popularPlaylist = await Playlist.create({
        userId: systemUser.id,
        name: '🔥 Популярное сейчас (KissVK)',
        description: 'Топ треков из чарта KissVK - обновляется автоматически',
        type: 'editorial',
        isPublic: true
      });
      console.log('✅ Создан новый плейлист');
    }

    // Добавляем треки в плейлист
    let playlistAdded = 0;
    for (let i = 0; i < validTracks.length; i++) {
      const trackData = validTracks[i];
      
      const track = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });

      if (track) {
        await PlaylistTrack.create({
          playlistId: popularPlaylist.id,
          trackId: track.id,
          position: i
        });
        playlistAdded++;
      }
    }

    console.log(`✅ В плейлист добавлено: ${playlistAdded} треков`);

    // ============================================================
    // 3. ИМПОРТ ИЗ НОВИНОК
    // ============================================================
    console.log('\n🆕 3. ИМПОРТ НОВИНОК');
    console.log('-'.repeat(80));

    const newResult = await kissvk.extractTracks('https://kissvk.top/', 20);
    
    if (newResult.success) {
      const newDecrypted = await kissvk.decryptTracks(newResult.tracks);
      const newValid = newDecrypted.filter(t => t.streamUrl);
      
      let newAdded = 0;
      for (const trackData of newValid) {
        try {
          const exists = await Track.findOne({
            where: {
              title: trackData.title,
              artist: trackData.artist
            }
          });

          if (!exists && trackData.streamUrl) {
            await Track.create({
              title: trackData.title,
              artist: trackData.artist,
              duration: trackData.duration || 0,
              streamUrl: trackData.streamUrl,
              coverUrl: trackData.coverUrl,
              source: 'kissvk',
              provider: 'kissvk',
              isPublic: true,
              uploadedBy: systemUser.id,
              playCount: 0,
              likeCount: 0
            });
            newAdded++;
            console.log(`🆕 ${trackData.artist} - ${trackData.title}`);
          }
        } catch (error) {
          // Skip duplicates
        }
      }
      
      console.log(`✅ Добавлено новинок: ${newAdded}`);
    }

    // ============================================================
    // ИТОГИ
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ИМПОРТ ЗАВЕРШЕН!');
    console.log('='.repeat(80));
    
    const totalTracks = await Track.count();
    console.log(`\n📊 ИТОГО В БИБЛИОТЕКЕ: ${totalTracks} треков`);
    console.log(`   ✅ Новых добавлено: ${added}`);
    console.log(`   🔄 Обновлено: ${updated}`);
    console.log(`   📀 Плейлистов создано: 1`);
    console.log('\n💡 Запустите rebuild-playlists.js для обновления всех умных плейлистов\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  }
}

quickImportNewTracks();

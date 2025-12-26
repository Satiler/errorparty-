/**
 * Тест системы аналитики популярности и автоматического создания альбомов
 * Интегрируется с новой аудио-системой скачивания
 */

const { sequelize, Track, Playlist, PlaylistTrack, User } = require('./src/models');
const { Op } = require('sequelize');
const { getInstance: getKissVK } = require('./src/services/kissvk.service');
const { getInstance: getDownloader } = require('./src/services/audio-downloader.service');
const smartPlaylistGenerator = require('./src/services/smart-playlist-generator.service');

async function analyzePopularityAndAlbums() {
  console.log('🎯 АНАЛИЗ ПОПУЛЯРНОСТИ ТРЕКОВ И СОЗДАНИЕ АЛЬБОМОВ\n');
  console.log('=' .repeat(80));
  
  const kissvk = getKissVK();
  const downloader = getDownloader();

  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к БД успешно\n');

    // ============================================================
    // 1. АНАЛИТИКА ПОПУЛЯРНОСТИ ТРЕКОВ
    // ============================================================
    console.log('\n📊 1. АНАЛИТИКА ПОПУЛЯРНОСТИ');
    console.log('-'.repeat(80));

    // Топ треков по прослушиваниям
    const topTracks = await Track.findAll({
      where: {
        playCount: { [Op.gt]: 0 }
      },
      order: [['playCount', 'DESC']],
      limit: 10,
      attributes: ['id', 'title', 'artist', 'playCount', 'likeCount', 'source']
    });

    console.log('\n🏆 ТОП-10 ТРЕКОВ ПО ПРОСЛУШИВАНИЯМ:');
    topTracks.forEach((track, i) => {
      console.log(`${i + 1}. ${track.artist} - ${track.title}`);
      console.log(`   Прослушиваний: ${track.playCount}, Лайков: ${track.likeCount}, Источник: ${track.source}`);
    });

    // Статистика по источникам
    const sourceStats = await sequelize.query(`
      SELECT 
        COALESCE(source, 'unknown') as source,
        COUNT(*) as total_tracks,
        SUM("playCount") as total_plays,
        AVG("playCount") as avg_plays,
        MAX("playCount") as max_plays
      FROM "Tracks"
      GROUP BY source
      ORDER BY total_plays DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n📈 СТАТИСТИКА ПО ИСТОЧНИКАМ:');
    console.table(sourceStats);

    // Статистика по исполнителям
    const artistStats = await sequelize.query(`
      SELECT 
        artist,
        COUNT(*) as tracks_count,
        SUM("playCount") as total_plays,
        AVG("playCount") as avg_plays
      FROM "Tracks"
      WHERE "playCount" > 0
      GROUP BY artist
      ORDER BY total_plays DESC
      LIMIT 15
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n🎤 ТОП-15 ИСПОЛНИТЕЛЕЙ ПО ПОПУЛЯРНОСТИ:');
    console.table(artistStats);

    // ============================================================
    // 2. АНАЛИЗ ПЛЕЙЛИСТОВ
    // ============================================================
    console.log('\n📋 2. АНАЛИЗ ПЛЕЙЛИСТОВ');
    console.log('-'.repeat(80));

    const playlists = await Playlist.findAll({
      attributes: [
        'id',
        'name',
        'type',
        'isPublic',
        [sequelize.fn('COUNT', sequelize.col('PlaylistTracks.id')), 'trackCount']
      ],
      include: [{
        model: PlaylistTrack,
        attributes: [],
        required: false
      }],
      group: ['Playlist.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('PlaylistTracks.id')), 'DESC']]
    });

    console.log(`\nВсего плейлистов: ${playlists.length}`);
    
    if (playlists.length > 0) {
      console.log('\n📚 СПИСОК ПЛЕЙЛИСТОВ:');
      playlists.forEach((playlist, i) => {
        const trackCount = playlist.get('trackCount') || 0;
        const type = playlist.type || 'user';
        const visibility = playlist.isPublic ? '🌐' : '🔒';
        console.log(`${i + 1}. ${visibility} ${playlist.name} (${trackCount} треков) [${type}]`);
      });
    }

    // ============================================================
    // 3. СОЗДАНИЕ ПОПУЛЯРНЫХ АЛЬБОМОВ ИЗ KISSVK
    // ============================================================
    console.log('\n🎵 3. ПОИСК И СОЗДАНИЕ ПОПУЛЯРНЫХ АЛЬБОМОВ');
    console.log('-'.repeat(80));

    // Извлекаем популярные треки с KissVK
    console.log('\nИзвлечение популярных треков с kissvk.top...');
    const popularTracksResult = await kissvk.extractTracks('https://kissvk.top/tracks_chart', 10);

    if (popularTracksResult.success && popularTracksResult.tracks.length > 0) {
      console.log(`✅ Найдено ${popularTracksResult.tracks.length} популярных треков`);
      
      // Декодируем треки
      const decryptedTracks = await kissvk.decryptTracks(popularTracksResult.tracks);
      
      // Группируем по исполнителям
      const artistGroups = {};
      decryptedTracks.forEach(track => {
        const artist = track.artist;
        if (!artistGroups[artist]) {
          artistGroups[artist] = [];
        }
        artistGroups[artist].push(track);
      });

      console.log('\n🎭 ГРУППИРОВКА ПО ИСПОЛНИТЕЛЯМ:');
      Object.keys(artistGroups).forEach(artist => {
        const tracks = artistGroups[artist];
        console.log(`${artist}: ${tracks.length} треков`);
        tracks.forEach(t => console.log(`  - ${t.title}`));
      });

      // Создаем плейлист "Популярные сейчас"
      const systemUser = await User.findOne({ where: { username: 'system' } }) || 
                        await User.create({
                          username: 'system',
                          email: 'system@errorparty.local',
                          password: 'system',
                          isAdmin: true
                        });

      // Проверяем существующий плейлист
      let popularNowPlaylist = await Playlist.findOne({
        where: {
          name: '🔥 Популярное сейчас (KissVK)',
          userId: systemUser.id
        }
      });

      if (popularNowPlaylist) {
        // Удаляем старые треки
        await PlaylistTrack.destroy({
          where: { playlistId: popularNowPlaylist.id }
        });
        console.log('\n♻️  Обновляем существующий плейлист...');
      } else {
        // Создаем новый плейлист
        popularNowPlaylist = await Playlist.create({
          userId: systemUser.id,
          name: '🔥 Популярное сейчас (KissVK)',
          description: 'Топ треков из чарта KissVK - обновляется автоматически',
          type: 'editorial',
          isPublic: true
        });
        console.log('\n✅ Создан новый плейлист "Популярное сейчас"');
      }

      // Добавляем треки в плейлист
      let addedToPlaylist = 0;
      for (let i = 0; i < decryptedTracks.length; i++) {
        const trackData = decryptedTracks[i];
        
        // Проверяем, есть ли трек в базе
        let track = await Track.findOne({
          where: {
            title: trackData.title,
            artist: trackData.artist
          }
        });

        // Если трека нет, создаем его
        if (!track && trackData.streamUrl) {
          try {
            track = await Track.create({
              title: trackData.title,
              artist: trackData.artist,
              duration: trackData.duration || 0,
              streamUrl: trackData.streamUrl,
              coverUrl: trackData.coverUrl,
              source: 'kissvk',
              provider: 'kissvk',
              isPublic: true,
              uploadedBy: systemUser.id
            });
            console.log(`  ✅ Добавлен новый трек: ${track.artist} - ${track.title}`);
          } catch (error) {
            console.log(`  ❌ Ошибка добавления трека: ${error.message}`);
            continue;
          }
        }

        if (track) {
          // Добавляем в плейлист
          await PlaylistTrack.create({
            playlistId: popularNowPlaylist.id,
            trackId: track.id,
            position: i
          });
          addedToPlaylist++;
        }
      }

      console.log(`\n✅ В плейлист добавлено треков: ${addedToPlaylist}`);
    }

    // ============================================================
    // 4. УМНЫЕ ПЛЕЙЛИСТЫ (AI-POWERED)
    // ============================================================
    console.log('\n🤖 4. ГЕНЕРАЦИЯ УМНЫХ ПЛЕЙЛИСТОВ');
    console.log('-'.repeat(80));

    try {
      // Создаем несколько умных плейлистов
      const smartPlaylists = [
        {
          name: 'generateTopTracks',
          description: 'Топ треков недели'
        },
        {
          name: 'generateTrendingNow', 
          description: 'Тренды сейчас'
        },
        {
          name: 'generateChillPlaylist',
          description: 'Спокойная музыка'
        }
      ];

      for (const pl of smartPlaylists) {
        try {
          if (typeof smartPlaylistGenerator[pl.name] === 'function') {
            console.log(`\nСоздание: ${pl.description}...`);
            const result = await smartPlaylistGenerator[pl.name]();
            if (result && result.id) {
              console.log(`✅ Создан: ${result.name} (${result.trackCount || 0} треков)`);
            }
          }
        } catch (error) {
          console.log(`⚠️  Пропущен: ${pl.description} (${error.message})`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Умные плейлисты недоступны: ${error.message}`);
    }

    // ============================================================
    // 5. РЕКОМЕНДАЦИИ ПО СКАЧИВАНИЮ
    // ============================================================
    console.log('\n💾 5. РЕКОМЕНДАЦИИ ПО СКАЧИВАНИЮ');
    console.log('-'.repeat(80));

    // Топ треков без локальной копии
    const tracksNeedDownload = await Track.findAll({
      where: {
        playCount: { [Op.gte]: 10 }, // Популярные треки
        [Op.or]: [
          { filePath: null },
          { filePath: '' }
        ],
        streamUrl: { [Op.ne]: null }
      },
      order: [['playCount', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'artist', 'playCount', 'streamUrl']
    });

    if (tracksNeedDownload.length > 0) {
      console.log('\n📥 РЕКОМЕНДУЕТСЯ СКАЧАТЬ (популярные без локальных файлов):');
      tracksNeedDownload.forEach((track, i) => {
        console.log(`${i + 1}. ${track.artist} - ${track.title} (${track.playCount} прослушиваний)`);
      });

      console.log('\n💡 Для скачивания используйте:');
      console.log('   node test-audio-system-docker.js');
    } else {
      console.log('\n✅ Все популярные треки уже имеют локальные копии');
    }

    // ============================================================
    // ИТОГИ
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ АНАЛИЗ ЗАВЕРШЕН');
    console.log('='.repeat(80));
    
    const summary = {
      totalTracks: await Track.count(),
      totalPlaylists: await Playlist.count(),
      popularTracks: topTracks.length,
      sources: sourceStats.length,
      topArtists: artistStats.length
    };

    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.table(summary);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
  } finally {
    await sequelize.close();
  }
}

// Запуск
if (require.main === module) {
  analyzePopularityAndAlbums()
    .then(() => {
      console.log('\n✅ Анализ успешно завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка выполнения:', error);
      process.exit(1);
    });
}

module.exports = { analyzePopularityAndAlbums };

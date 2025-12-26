/**
 * Создание автоматических плейлистов по жанрам, годам и исполнителям
 */
const { Track, Playlist, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function createAutoPlaylists() {
  console.log('🎵 Создание автоматических плейлистов\n');

  try {
    // 1. Плейлисты по жанрам
    console.log('📂 Создание плейлистов по жанрам...');
    const genres = await Track.findAll({
      attributes: [
        'genre',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        genre: { [Op.ne]: null },
        [Op.or]: [
          { fileUrl: { [Op.ne]: null } },
          { streamUrl: { [Op.ne]: null } }
        ]
      },
      group: ['genre'],
      having: sequelize.literal('COUNT(id) >= 5'), // Минимум 5 треков
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    console.log(`Найдено ${genres.length} жанров с >= 5 треков`);
    let genrePlaylistsCreated = 0;

    for (const genreData of genres) {
      const genre = genreData.genre;
      const count = genreData.count;

      // Проверяем существует ли плейлист
      const existing = await Playlist.findOne({
        where: { name: `🎼 ${genre}` }
      });

      if (existing) {
        console.log(`  ⏭️  Плейлист "${genre}" уже существует (${count} треков)`);
        continue;
      }

      // Создаём плейлист
      const playlist = await Playlist.create({
        name: `🎼 ${genre}`,
        description: `Все треки в жанре ${genre}`,
        userId: 1,
        isPublic: true,
        type: 'editorial',
        metadata: { type: 'editorial', priority: 1 },
        coverUrl: null
      });

      // Добавляем треки
      const tracks = await Track.findAll({
        where: { 
          genre: genre,
          [Op.or]: [
            { fileUrl: { [Op.ne]: null } },
            { streamUrl: { [Op.ne]: null } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 100 // Ограничение для производительности
      });

      for (let i = 0; i < tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i
        });
      }

      console.log(`  ✅ Создан плейлист "${genre}" (${tracks.length} треков)`);
      genrePlaylistsCreated++;
    }

    // 2. Плейлисты по годам
    console.log('\n📅 Создание плейлистов по годам...');
    const years = await Track.findAll({
      attributes: [
        'year',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        year: { [Op.ne]: null },
        [Op.or]: [
          { fileUrl: { [Op.ne]: null } },
          { streamUrl: { [Op.ne]: null } }
        ]
      },
      group: ['year'],
      having: sequelize.literal('COUNT(id) >= 10'), // Минимум 10 треков
      order: [['year', 'DESC']],
      raw: true
    });

    console.log(`Найдено ${years.length} годов с >= 10 треков`);
    let yearPlaylistsCreated = 0;

    for (const yearData of years) {
      const year = yearData.year;
      const count = yearData.count;

      // Проверяем существует ли плейлист
      const existing = await Playlist.findOne({
        where: { name: `🗓️ ${year}` }
      });

      if (existing) {
        console.log(`  ⏭️  Плейлист "${year}" уже существует (${count} треков)`);
        continue;
      }

      // Создаём плейлист
      const playlist = await Playlist.create({
        name: `🗓️ ${year}`,
        description: `Лучшие треки ${year} года`,
        userId: 1,
        isPublic: true,
        type: 'editorial',
        metadata: { type: 'editorial', priority: 1 },
        coverUrl: null
      });

      // Добавляем треки
      const tracks = await Track.findAll({
        where: { 
          year: year,
          [Op.or]: [
            { fileUrl: { [Op.ne]: null } },
            { streamUrl: { [Op.ne]: null } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      for (let i = 0; i < tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i
        });
      }

      console.log(`  ✅ Создан плейлист "${year}" (${tracks.length} треков)`);
      yearPlaylistsCreated++;
    }

    // 3. Плейлисты по популярным исполнителям
    console.log('\n🎤 Создание плейлистов по исполнителям...');
    const artists = await Track.findAll({
      attributes: [
        'artist',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        artist: { [Op.ne]: null },
        [Op.or]: [
          { fileUrl: { [Op.ne]: null } },
          { streamUrl: { [Op.ne]: null } }
        ]
      },
      group: ['artist'],
      having: sequelize.literal('COUNT(id) >= 3'), // Минимум 3 трека
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 50, // Топ-50 исполнителей
      raw: true
    });

    console.log(`Найдено ${artists.length} исполнителей с >= 3 треков`);
    let artistPlaylistsCreated = 0;

    for (const artistData of artists) {
      const artist = artistData.artist;
      const count = artistData.count;

      // Проверяем существует ли плейлист
      const existing = await Playlist.findOne({
        where: { name: `🎤 ${artist}` }
      });

      if (existing) {
        console.log(`  ⏭️  Плейлист "${artist}" уже существует (${count} треков)`);
        continue;
      }

      // Создаём плейлист
      const playlist = await Playlist.create({
        name: `🎤 ${artist}`,
        description: `Все треки исполнителя ${artist}`,
        userId: 1,
        isPublic: true,
        type: 'editorial',
        metadata: { type: 'editorial', priority: 1 },
        coverUrl: null
      });

      // Добавляем треки
      const tracks = await Track.findAll({
        where: { 
          artist: artist,
          [Op.or]: [
            { fileUrl: { [Op.ne]: null } },
            { streamUrl: { [Op.ne]: null } }
          ]
        },
        order: [['year', 'DESC'], ['createdAt', 'DESC']],
        limit: 100
      });

      for (let i = 0; i < tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i
        });
      }

      console.log(`  ✅ Создан плейлист "${artist}" (${tracks.length} треков)`);
      artistPlaylistsCreated++;
    }

    // 4. Специальные плейлисты
    console.log('\n⭐ Создание специальных плейлистов...');
    
    // Новинки (последние 100 треков)
    const newTracksPlaylist = await Playlist.findOne({ where: { name: '🆕 Новинки' } });
    if (!newTracksPlaylist) {
      const newPlaylist = await Playlist.create({
        name: '🆕 Новинки',
        description: 'Последние добавленные треки',
        userId: 1,
        isPublic: true,
        type: 'editorial',
        metadata: { type: 'editorial', priority: 1 },
        coverUrl: null
      });

      const newTracks = await Track.findAll({
        where: {
          [Op.or]: [
            { fileUrl: { [Op.ne]: null } },
            { streamUrl: { [Op.ne]: null } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      for (let i = 0; i < newTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: newPlaylist.id,
          trackId: newTracks[i].id,
          position: i
        });
      }
      console.log(`  ✅ Создан плейлист "Новинки" (${newTracks.length} треков)`);
    } else {
      console.log('  ⏭️  Плейлист "Новинки" уже существует');
    }

    // Микс жанров (случайная выборка)
    const mixPlaylist = await Playlist.findOne({ where: { name: '🎲 Микс жанров' } });
    if (!mixPlaylist) {
      const mixPl = await Playlist.create({
        name: '🎲 Микс жанров',
        description: 'Случайная подборка из разных жанров',
        userId: 1,
        isPublic: true,
        type: 'editorial',
        metadata: { type: 'editorial', priority: 1 },
        coverUrl: null
      });

      const mixTracks = await Track.findAll({
        where: { 
          [Op.or]: [
            { fileUrl: { [Op.ne]: null } },
            { streamUrl: { [Op.ne]: null } }
          ],
          genre: { [Op.ne]: null }
        },
        order: sequelize.random(),
        limit: 100
      });

      for (let i = 0; i < mixTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: mixPl.id,
          trackId: mixTracks[i].id,
          position: i
        });
      }
      console.log(`  ✅ Создан плейлист "Микс жанров" (${mixTracks.length} треков)`);
    } else {
      console.log('  ⏭️  Плейлист "Микс жанров" уже существует');
    }

    // Итоги
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГИ:');
    console.log(`  🎼 Плейлистов по жанрам: ${genrePlaylistsCreated}`);
    console.log(`  📅 Плейлистов по годам: ${yearPlaylistsCreated}`);
    console.log(`  🎤 Плейлистов по исполнителям: ${artistPlaylistsCreated}`);
    console.log(`  ⭐ Специальных плейлистов: 2`);
    console.log(`  📝 Всего создано: ${genrePlaylistsCreated + yearPlaylistsCreated + artistPlaylistsCreated + 2}`);
    console.log('='.repeat(60));
    console.log('✅ Готово!\n');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

createAutoPlaylists();

/**
 * Пересборка всех плейлистов на главной странице
 * + Добавление плейлистов для Miyagi, Eminem, Rihanna, Bones
 */
const { Track, Playlist, PlaylistTrack, Album } = require('./src/models');
const { Op } = require('sequelize');

// Популярные зарубежные исполнители
const foreignArtists = [
  'Taylor Swift', 'The Weeknd', 'Drake', 'Ariana Grande', 'Billie Eilish',
  'Dua Lipa', 'Ed Sheeran', 'Bruno Mars', 'Post Malone', 'Travis Scott',
  'Justin Bieber', 'Olivia Rodrigo', 'Harry Styles', 'Bad Bunny',
  'Coldplay', 'Imagine Dragons', 'Maroon 5', 'Eminem', 'Kendrick Lamar',
  'Rihanna', 'Adele', 'Lady Gaga', 'Katy Perry', 'Miley Cyrus',
  'Selena Gomez', 'Shawn Mendes', 'Twenty One Pilots', 'Sia',
  'OneRepublic', 'Macklemore', 'Sam Smith', 'Charlie Puth', 'Khalid',
  'The Weeknd', 'Bones', 'BONES'
];

// Приоритетные исполнители для отдельных плейлистов
const priorityArtists = ['Miyagi', 'Eminem', 'Rihanna', 'Bones', 'BONES'];

async function createOrUpdatePlaylist(name, description, tracks, metadata = {}) {
  try {
    if (!tracks || tracks.length === 0) {
      console.log(`⚠️ Пропускаем "${name}" - нет треков`);
      return null;
    }

    let playlist = await Playlist.findOne({ where: { name } });
    
    const playlistData = {
      name,
      description,
      type: metadata.type || 'editorial',
      isPublic: true,
      image: metadata.image || (tracks[0]?.coverUrl) || null,
      userId: 1,
      metadata: metadata.extra || {}
    };

    if (!playlist) {
      playlist = await Playlist.create(playlistData);
      console.log(`✅ Создан: "${name}" (ID ${playlist.id})`);
    } else {
      await playlist.update(playlistData);
      await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
      console.log(`🔄 Обновлен: "${name}" (ID ${playlist.id})`);
    }

    // Добавляем треки
    const playlistTracks = tracks.map((track, i) => ({
      playlistId: playlist.id,
      trackId: track.id,
      position: i
    }));

    await PlaylistTrack.bulkCreate(playlistTracks);
    console.log(`   📀 Добавлено треков: ${tracks.length}`);

    return playlist;
  } catch (error) {
    console.error(`❌ Ошибка "${name}":`, error.message);
    return null;
  }
}

async function rebuildAllPlaylists() {
  console.log('🎵 ПЕРЕСБОРКА ВСЕХ ПЛЕЙЛИСТОВ');
  console.log('=' .repeat(70));

  try {
    // Получаем все треки
    const allTracks = await Track.findAll({
      where: {
        streamUrl: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 2000
    });

    console.log(`\n✅ Найдено треков: ${allTracks.length}\n`);

    if (allTracks.length === 0) {
      console.log('❌ Нет треков для создания плейлистов!');
      process.exit(1);
    }

    // ========== ОСНОВНЫЕ ПЛЕЙЛИСТЫ ==========
    console.log('📋 ОСНОВНЫЕ ПЛЕЙЛИСТЫ:\n');

    // 1. Топ 100 хитов
    await createOrUpdatePlaylist(
      '🔥 Топ 100 Хитов',
      'Самые популярные треки на ErrorParty',
      allTracks.slice(0, 100),
      { type: 'chart' }
    );

    // 2. Новинки 2025
    const newTracks2025 = allTracks.filter(t => {
      const year = new Date(t.createdAt).getFullYear();
      return year === 2025;
    }).slice(0, 100);

    await createOrUpdatePlaylist(
      '🆕 Новинки 2025',
      'Свежие релизы этого года',
      newTracks2025.length > 0 ? newTracks2025 : allTracks.slice(0, 100),
      { type: 'new' }
    );

    // 3. Новые альбомы
    const recentAlbums = await Album.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      include: [{
        model: Track,
        as: 'tracks',
        where: { streamUrl: { [Op.ne]: null } }
      }]
    });

    const albumTracks = recentAlbums.flatMap(album => album.tracks).slice(0, 100);
    
    await createOrUpdatePlaylist(
      '💿 Новые Альбомы',
      'Свежие альбомы и EP',
      albumTracks.length > 0 ? albumTracks : allTracks.slice(0, 100),
      { type: 'new' }
    );

    // 4. Микс дня
    const randomTracks = [...allTracks].sort(() => Math.random() - 0.5).slice(0, 50);
    await createOrUpdatePlaylist(
      '🎲 Микс Дня',
      'Случайная подборка на каждый день',
      randomTracks,
      { type: 'editorial' }
    );

    // ========== ЗАРУБЕЖНАЯ МУЗЫКА ==========
    console.log('\n📋 ЗАРУБЕЖНЫЕ ПЛЕЙЛИСТЫ:\n');

    const foreignTracks = allTracks.filter(t => 
      foreignArtists.some(artist => 
        t.artist.toLowerCase().includes(artist.toLowerCase())
      )
    );

    console.log(`   Найдено зарубежных треков: ${foreignTracks.length}`);

    // 5. Зарубежные хиты
    await createOrUpdatePlaylist(
      '🌍 Зарубежные Хиты',
      'Лучшая музыка со всего мира',
      foreignTracks.slice(0, 100),
      { type: 'editorial' }
    );

    // 6. Зарубежные новинки
    await createOrUpdatePlaylist(
      '🌍 Зарубежные Новинки',
      'Свежие релизы мировых звезд',
      foreignTracks.slice(0, 50),
      { type: 'new' }
    );

    // 7. Billboard Hot 100
    await createOrUpdatePlaylist(
      '🔥 Billboard Hot 100',
      'Мировые чарты',
      foreignTracks.slice(0, 100),
      { type: 'chart' }
    );

    // ========== РУССКАЯ МУЗЫКА ==========
    console.log('\n📋 РУССКИЕ ПЛЕЙЛИСТЫ:\n');

    const russianTracks = allTracks.filter(t => 
      !foreignArtists.some(artist => 
        t.artist.toLowerCase().includes(artist.toLowerCase())
      )
    );

    console.log(`   Найдено русских треков: ${russianTracks.length}`);

    // 8. Русские хиты
    await createOrUpdatePlaylist(
      '🇷🇺 Русские Хиты',
      'Лучшая русская музыка',
      russianTracks.slice(0, 100),
      { type: 'editorial' }
    );

    // 9. Русский рэп
    const russianRap = russianTracks.filter(t => 
      t.genre?.toLowerCase().includes('рэп') ||
      t.genre?.toLowerCase().includes('хип-хоп') ||
      ['UNNV', 'ЛСП', 'Oxxxymiron', 'MACAN', 'Miyagi'].some(a => 
        t.artist.includes(a)
      )
    ).slice(0, 80);

    if (russianRap.length > 0) {
      await createOrUpdatePlaylist(
        '🎤 Русский Рэп',
        'Лучший русский хип-хоп и рэп',
        russianRap,
        { type: 'editorial' }
      );
    }

    // ========== ПЛЕЙЛИСТЫ ПО АРТИСТАМ ==========
    console.log('\n📋 ПЛЕЙЛИСТЫ ПО АРТИСТАМ:\n');

    // 10-13. Приоритетные артисты
    for (const artistName of priorityArtists) {
      const artistTracks = allTracks.filter(t => 
        t.artist.toLowerCase().includes(artistName.toLowerCase())
      );

      if (artistTracks.length >= 5) {
        const emoji = {
          'Miyagi': '🎌',
          'Eminem': '🎤',
          'Rihanna': '👑',
          'Bones': '💀',
          'BONES': '💀'
        }[artistName] || '🎵';

        await createOrUpdatePlaylist(
          `${emoji} ${artistName}`,
          `Лучшие треки ${artistName}`,
          artistTracks.slice(0, 80),
          { type: 'editorial' }
        );
      } else {
        console.log(`⚠️ ${artistName}: недостаточно треков (${artistTracks.length})`);
      }
    }

    // Дополнительные популярные артисты
    const artistStats = {};
    allTracks.forEach(track => {
      const artist = track.artist.split(',')[0].trim();
      if (!artistStats[artist]) {
        artistStats[artist] = [];
      }
      artistStats[artist].push(track);
    });

    const topArtists = Object.entries(artistStats)
      .filter(([name]) => !priorityArtists.some(p => name.toLowerCase().includes(p.toLowerCase())))
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10);

    for (const [artist, tracks] of topArtists) {
      if (tracks.length >= 10) {
        await createOrUpdatePlaylist(
          `🎤 ${artist}`,
          `Лучшие треки ${artist}`,
          tracks.slice(0, 50),
          { type: 'editorial' }
        );
      }
    }

    // ========== СТАТИСТИКА ==========
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(70));

    const stats = {
      totalTracks: await Track.count(),
      totalPlaylists: await Playlist.count(),
      editorialPlaylists: await Playlist.count({ where: { type: 'editorial' } }),
      chartPlaylists: await Playlist.count({ where: { type: 'chart' } }),
      newPlaylists: await Playlist.count({ where: { type: 'new' } }),
      playlistTracks: await PlaylistTrack.count()
    };

    console.log(`✅ Всего треков в БД: ${stats.totalTracks}`);
    console.log(`📀 Всего плейлистов: ${stats.totalPlaylists}`);
    console.log(`   - Editorial: ${stats.editorialPlaylists}`);
    console.log(`   - Charts: ${stats.chartPlaylists}`);
    console.log(`   - New: ${stats.newPlaylists}`);
    console.log(`🔗 Связей треков: ${stats.playlistTracks}`);
    console.log('='.repeat(70));
    console.log('✨ Пересборка завершена успешно!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
rebuildAllPlaylists();

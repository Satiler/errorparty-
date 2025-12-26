const { Track, Playlist, PlaylistTrack } = require('./src/models');
const { Op } = require('sequelize');

// Список популярных зарубежных исполнителей
const foreignArtists = [
  'Taylor Swift', 'The Weeknd', 'Drake', 'Ariana Grande', 'Billie Eilish',
  'Dua Lipa', 'Ed Sheeran', 'Bruno Mars', 'Post Malone', 'Travis Scott',
  'Justin Bieber', 'Olivia Rodrigo', 'Harry Styles', 'Bad Bunny',
  'Coldplay', 'Imagine Dragons', 'Maroon 5', 'Eminem', 'Kendrick Lamar',
  'Rihanna', 'Adele', 'Lady Gaga', 'Katy Perry', 'Miley Cyrus',
  'Selena Gomez', 'Shawn Mendes', 'Twenty One Pilots', 'Sia',
  'OneRepublic', 'Macklemore', 'Sam Smith', 'Charlie Puth', 'Khalid',
  'Bebe Rexha', 'Doja Cat', 'Megan Thee Stallion', 'Cardi B',
  'Nicki Minaj', 'Kanye West', 'Beyoncé'
];

async function createOrUpdatePlaylist(name, description, tracks, image = null) {
  try {
    let playlist = await Playlist.findOne({ where: { name } });
    
    if (!playlist) {
      playlist = await Playlist.create({
        name,
        description,
        type: 'editorial',
        isPublic: true,
        image: image || (tracks[0] ? tracks[0].coverUrl : null),
        userId: 1
      });
      console.log(`✅ Создан плейлист: "${name}" (ID ${playlist.id})`);
    } else {
      // Удаляем старые связи треков
      await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
      
      // Обновляем обложку если нужно
      if (tracks[0] && !playlist.image) {
        await playlist.update({ image: tracks[0].coverUrl });
      }
      
      console.log(`🔄 Обновлен плейлист: "${name}" (ID ${playlist.id})`);
    }

    // Добавляем треки в плейлист
    for (let i = 0; i < tracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: tracks[i].id,
        position: i
      });
    }

    console.log(`   📀 Добавлено треков: ${tracks.length}`);
    return playlist;

  } catch (error) {
    console.error(`❌ Ошибка создания плейлиста "${name}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🌍 Обновление плейлистов зарубежными хитами...\n');

  try {
    // Получаем все зарубежные треки
    const foreignTracks = await Track.findAll({
      where: {
        artist: {
          [Op.or]: foreignArtists.map(artist => ({ [Op.like]: `%${artist}%` }))
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 500
    });

    console.log(`✅ Найдено зарубежных треков: ${foreignTracks.length}\n`);

    if (foreignTracks.length === 0) {
      console.log('⚠️ Нет зарубежных треков для плейлистов');
      process.exit(0);
    }

    // 1. Топ 100 зарубежных хитов
    const top100Foreign = foreignTracks.slice(0, 100);
    await createOrUpdatePlaylist(
      '🌍 Топ 100 Зарубежных Хитов',
      'Лучшая зарубежная музыка на ErrorParty',
      top100Foreign
    );

    // 2. Новинки зарубежной музыки
    const newForeign = foreignTracks.slice(0, 50);
    await createOrUpdatePlaylist(
      '🆕 Новинки Зарубежной Музыки',
      'Свежие релизы от мировых звезд',
      newForeign
    );

    // 3. Billboard Hot 100
    const billboard = foreignTracks.slice(0, 100);
    await createOrUpdatePlaylist(
      '🔥 Billboard Hot 100',
      'Мировые чарты на ErrorParty',
      billboard
    );

    // 4. Pop Hits
    const popTracks = foreignTracks.filter(t => 
      t.genre && (t.genre.toLowerCase().includes('pop') || 
      ['Taylor Swift', 'Ariana Grande', 'Dua Lipa', 'Ed Sheeran'].some(a => 
        t.artist.includes(a)
      ))
    ).slice(0, 80);
    
    if (popTracks.length > 0) {
      await createOrUpdatePlaylist(
        '🎵 Pop Hits',
        'Лучшие поп-хиты со всего мира',
        popTracks
      );
    }

    // 5. Hip-Hop & Rap
    const hiphopArtists = ['Drake', 'Eminem', 'Kendrick Lamar', 'Post Malone', 
                          'Travis Scott', 'Cardi B', 'Nicki Minaj', 'Kanye West'];
    const hiphopTracks = foreignTracks.filter(t => 
      hiphopArtists.some(a => t.artist.includes(a))
    ).slice(0, 60);
    
    if (hiphopTracks.length > 0) {
      await createOrUpdatePlaylist(
        '🎤 Hip-Hop & Rap Hits',
        'Лучшие хип-хоп и рэп треки',
        hiphopTracks
      );
    }

    // 6. Rock & Alternative
    const rockArtists = ['Coldplay', 'Imagine Dragons', 'Twenty One Pilots'];
    const rockTracks = foreignTracks.filter(t => 
      rockArtists.some(a => t.artist.includes(a))
    ).slice(0, 60);
    
    if (rockTracks.length > 0) {
      await createOrUpdatePlaylist(
        '🎸 Rock & Alternative',
        'Рок и альтернативная музыка',
        rockTracks
      );
    }

    // 7. Плейлисты по топовым исполнителям
    const topArtists = {};
    foreignTracks.forEach(track => {
      const artist = track.artist.split(',')[0].trim(); // Берем первого исполнителя
      if (!topArtists[artist]) {
        topArtists[artist] = [];
      }
      topArtists[artist].push(track);
    });

    // Создаем плейлисты для топ-5 исполнителей
    const sortedArtists = Object.entries(topArtists)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5);

    console.log('\n🎤 Создание плейлистов для топ исполнителей:\n');
    
    for (const [artist, tracks] of sortedArtists) {
      if (tracks.length >= 10) { // Минимум 10 треков для плейлиста
        await createOrUpdatePlaylist(
          `🎤 ${artist}`,
          `Лучшие треки ${artist}`,
          tracks.slice(0, 50) // Максимум 50 треков
        );
      }
    }

    // Статистика
    const playlistCount = await Playlist.count({ where: { type: 'editorial' } });
    const trackAssociations = await PlaylistTrack.count();
    const totalTracks = await Track.count();

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Всего треков в базе: ${totalTracks}`);
    console.log(`✅ Зарубежных треков: ${foreignTracks.length}`);
    console.log(`📀 Editorial плейлистов: ${playlistCount}`);
    console.log(`🔗 Связей треков с плейлистами: ${trackAssociations}`);
    console.log('='.repeat(60));
    console.log('✨ Плейлисты обновлены!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();

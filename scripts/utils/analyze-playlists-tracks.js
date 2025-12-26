const { Playlist, PlaylistTrack, Track, Album, User } = require('./src/models');

async function analyzePlaylistsAndTracks() {
  console.log('📊 АНАЛИЗ ПЛЕЙЛИСТОВ И ТРЕКОВ');
  console.log('='.repeat(70));

  // Общая статистика
  const totalTracks = await Track.count();
  const totalPlaylists = await Playlist.count();
  const editorialPlaylists = await Playlist.count({ where: { type: 'editorial' } });
  const totalAlbums = await Album.count();
  const kissvkTracks = await Track.count({ where: { provider: 'kissvk' } });
  const lmusicTracks = await Track.count({ where: { provider: 'lmusic' } });

  console.log('\n📈 ОБЩАЯ СТАТИСТИКА:');
  console.log(`   Всего треков: ${totalTracks}`);
  console.log(`   - KissVK: ${kissvkTracks} (${(kissvkTracks/totalTracks*100).toFixed(1)}%)`);
  console.log(`   - Lmusic: ${lmusicTracks} (${(lmusicTracks/totalTracks*100).toFixed(1)}%)`);
  console.log(`   Всего плейлистов: ${totalPlaylists}`);
  console.log(`   - Редакционные: ${editorialPlaylists}`);
  console.log(`   - Пользовательские: ${totalPlaylists - editorialPlaylists}`);
  console.log(`   Всего альбомов: ${totalAlbums}`);

  // Анализ плейлистов
  console.log('\n🎵 ДЕТАЛЬНЫЙ АНАЛИЗ ПЛЕЙЛИСТОВ:');
  console.log('='.repeat(70));
  
  const playlists = await Playlist.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username']
      }
    ],
    order: [['type', 'ASC'], ['createdAt', 'DESC']]
  });
  
  // Получаем треки для каждого плейлиста отдельно
  for (const playlist of playlists) {
    const playlistTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      include: [{ model: Track, as: 'track' }]
    });
    playlist.tracks = playlistTracks.map(pt => pt.track);
  }

  for (const playlist of playlists) {
    const trackCount = playlist.tracks ? playlist.tracks.length : 0;
    console.log(`\n[${playlist.id}] ${playlist.name}`);
    console.log(`   📀 Треков: ${trackCount}`);
    console.log(`   🏷️  Тип: ${playlist.type || 'user'}`);
    console.log(`   👁️  Публичный: ${playlist.isPublic ? '✅ Да' : '❌ Нет'}`);
    if (playlist.user) {
      console.log(`   👤 Создатель: ${playlist.user.username}`);
    }
    if (playlist.description) {
      console.log(`   📝 Описание: ${playlist.description.substring(0, 80)}${playlist.description.length > 80 ? '...' : ''}`);
    }
    
    // Анализ источников треков в плейлисте
    if (trackCount > 0) {
      const kissVkCount = playlist.tracks.filter(t => t.provider === 'kissvk').length;
      const lmusicCount = playlist.tracks.filter(t => t.provider === 'lmusic').length;
      console.log(`   📊 Источники: KissVK: ${kissVkCount}, Lmusic: ${lmusicCount}`);
    }
  }

  // Топ треков
  console.log('\n\n🔥 ТОП-10 ПОПУЛЯРНЫХ ТРЕКОВ:');
  console.log('='.repeat(70));
  
  const topTracks = await Track.findAll({
    include: [{ model: Album, as: 'album' }],
    order: [['playCount', 'DESC']],
    limit: 10
  });

  topTracks.forEach((track, index) => {
    console.log(`\n${index + 1}. ${track.title} - ${track.artist}`);
    console.log(`   Альбом: ${track.album ? track.album.title : 'N/A'}`);
    console.log(`   Прослушиваний: ${track.playCount || 0}`);
    console.log(`   Источник: ${track.provider || 'N/A'}`);
    console.log(`   Год: ${track.year || 'N/A'}`);
  });

  // Новые треки (за последние 7 дней)
  console.log('\n\n🆕 НЕДАВНО ДОБАВЛЕННЫЕ ТРЕКИ (последние 7 дней):');
  console.log('='.repeat(70));
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentTracks = await Track.count({
    where: {
      createdAt: {
        [require('sequelize').Op.gte]: sevenDaysAgo
      }
    }
  });

  const recentKissVk = await Track.count({
    where: {
      provider: 'kissvk',
      createdAt: {
        [require('sequelize').Op.gte]: sevenDaysAgo
      }
    }
  });

  console.log(`   Всего добавлено: ${recentTracks}`);
  console.log(`   - KissVK: ${recentKissVk}`);
  console.log(`   - Lmusic: ${recentTracks - recentKissVk}`);

  // Статистика по годам
  console.log('\n\n📅 СТАТИСТИКА ПО ГОДАМ:');
  console.log('='.repeat(70));
  
  const tracksByYear = await Track.findAll({
    attributes: [
      'year',
      [require('./src/models').sequelize.fn('COUNT', '*'), 'count']
    ],
    where: {
      year: {
        [require('sequelize').Op.ne]: null
      }
    },
    group: ['year'],
    order: [['year', 'DESC']],
    limit: 10,
    raw: true
  });

  tracksByYear.forEach(item => {
    console.log(`   ${item.year}: ${item.count} треков`);
  });

  // Проблемные треки (без альбома или с пустыми данными)
  console.log('\n\n⚠️  ПРОБЛЕМНЫЕ ТРЕКИ:');
  console.log('='.repeat(70));
  
  const tracksWithoutAlbum = await Track.count({ where: { albumId: null } });
  const tracksWithoutYear = await Track.count({ where: { year: null } });
  const tracksWithoutGenre = await Track.count({ where: { genre: null } });
  
  console.log(`   Без альбома: ${tracksWithoutAlbum}`);
  console.log(`   Без года: ${tracksWithoutYear}`);
  console.log(`   Без жанра: ${tracksWithoutGenre}`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ Анализ завершен!');
  
  process.exit(0);
}

analyzePlaylistsAndTracks().catch(error => {
  console.error('❌ Ошибка при анализе:', error);
  process.exit(1);
});

/**
 * Простой импорт новых альбомов с KissVK
 * Добавляет существующие треки из альбомов в плейлисты
 */
const db = require('./src/models');
const { Track, Album, Playlist, PlaylistTrack } = db;

async function importNewAlbumTracks() {
  try {
    console.log('🎵 Импорт новых альбомов с KissVK...\n');

    // Получаем альбомы которые уже есть
    const albums = await Album.findAll({
      where: { source: 'kissvk' },
      limit: 50,
      order: [['createdAt', 'DESC']]
    });

    console.log(`📚 Найдено ${albums.length} альбомов KissVK\n`);

    // Получаем все треки KissVK
    const allTracks = await Track.findAll({
      limit: 300,
      order: [['createdAt', 'DESC']]
    });

    console.log(`🎶 Найдено ${allTracks.length} треков KissVK\n`);

    // Обновляем плейлист "Новые Альбомы"
    let newAlbumsPlaylist = await Playlist.findOne({
      where: { name: 'Новые Альбомы' }
    });

    if (!newAlbumsPlaylist) {
      // Создаем новый плейлист если его нет
      const sysUser = await db.User.findOne({ where: { username: 'system' } }) ||
                       await db.User.create({ 
                         username: 'system',
                         email: 'system@errorparty.local',
                         password: 'system'
                       });
      
      newAlbumsPlaylist = await Playlist.create({
        userId: sysUser.id,
        name: 'Новые Альбомы',
        description: 'Новые альбомы с KissVK',
        type: 'editorial',
        isSystem: true
      });
    }

    // Очищаем плейлист
    await PlaylistTrack.destroy({
      where: { playlistId: newAlbumsPlaylist.id }
    });

    // Добавляем треки
    for (let i = 0; i < Math.min(100, allTracks.length); i++) {
      await PlaylistTrack.create({
        playlistId: newAlbumsPlaylist.id,
        trackId: allTracks[i].id,
        position: i + 1
      });
    }

    console.log(`✅ Плейлист "Новые Альбомы": ${Math.min(100, allTracks.length)} треков\n`);

    // Статистика
    const totalTracks = await Track.count();
    const totalAlbums = await Album.count();
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();

    console.log('📊 СТАТИСТИКА:');
    console.log(`   Всего треков: ${totalTracks}`);
    console.log(`   Всего альбомов: ${totalAlbums}`);
    console.log(`   Всего плейлистов: ${totalPlaylists}`);
    console.log(`   Связей трек-плейлист: ${totalPlaylistTracks}\n`);

    console.log('✅ Импорт завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

importNewAlbumTracks();

/**
 * Создание плейлистов для зарубежных новинок и популярных альбомов
 */
const db = require('./src/models');
const { Track, Playlist, PlaylistTrack } = db;

async function createForeignPlaylistsSimple() {
  try {
    console.log('🌍 Создание плейлистов зарубежных новинок...\n');
    
    // Получаем системного пользователя
    const sysUser = await db.User.findOne({ where: { username: 'system' } }) ||
                     await db.User.create({ 
                       username: 'system',
                       email: 'system@errorparty.local',
                       password: 'system'
                     });
    
    // ===== Плейлист "Зарубежные Новинки" =====
    console.log('📋 Создание плейлиста "Зарубежные Новинки"...');
    
    let foreignPlaylist = await Playlist.findOne({
      where: { name: 'Зарубежные Новинки' }
    });
    
    if (!foreignPlaylist) {
      foreignPlaylist = await Playlist.create({
        userId: sysUser.id,
        name: 'Зарубежные Новинки',
        description: 'Самые популярные зарубежные новинки',
        type: 'editorial',
        isSystem: true
      });
      console.log('   ✅ Создан новый плейлист\n');
    } else {
      console.log('   ℹ️  Плейлист уже существует\n');
    }
    
    // Очищаем и заполняем
    await PlaylistTrack.destroy({ where: { playlistId: foreignPlaylist.id } });
    
    const allTracks = await Track.findAll({
      limit: 100,
      order: [['createdAt', 'DESC']]
    });
    
    for (let i = 0; i < Math.min(100, allTracks.length); i++) {
      await PlaylistTrack.create({
        playlistId: foreignPlaylist.id,
        trackId: allTracks[i].id,
        position: i + 1
      });
    }
    
    console.log(`   ✅ Добавлено ${Math.min(100, allTracks.length)} треков\n`);
    
    // ===== Плейлист "Популярные Альбомы" =====
    console.log('📋 Создание плейлиста "Популярные Альбомы"...');
    
    let popularPlaylist = await Playlist.findOne({
      where: { name: 'Популярные Альбомы' }
    });
    
    if (!popularPlaylist) {
      popularPlaylist = await Playlist.create({
        userId: sysUser.id,
        name: 'Популярные Альбомы',
        description: 'Самые популярные альбомы с KissVK',
        type: 'editorial',
        isSystem: true
      });
      console.log('   ✅ Создан новый плейлист\n');
    } else {
      console.log('   ℹ️  Плейлист уже существует\n');
    }
    
    // Очищаем и заполняем
    await PlaylistTrack.destroy({ where: { playlistId: popularPlaylist.id } });
    
    const moreTracksCount = await Track.count();
    const batchSize = Math.min(150, moreTracksCount);
    
    const moreAllTracks = await Track.findAll({
      limit: batchSize,
      order: [['createdAt', 'DESC']]
    });
    
    for (let i = 0; i < moreAllTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: popularPlaylist.id,
        trackId: moreAllTracks[i].id,
        position: i + 1
      });
    }
    
    console.log(`   ✅ Добавлено ${moreAllTracks.length} треков\n`);
    
    // ===== ИТОГОВАЯ СТАТИСТИКА =====
    console.log('='.repeat(60));
    console.log('📊 ИТОГИ:');
    
    const playlists = await Playlist.findAll({
      where: {
        name: ['Зарубежные Новинки', 'Популярные Альбомы', 'Новые Альбомы']
      },
      include: [{
        model: PlaylistTrack,
        as: 'tracks',
        attributes: []
      }]
    });
    
    for (const p of playlists) {
      console.log(`\n📋 ${p.name}`);
      console.log(`   Треков: ${p.tracks ? p.tracks.length : 0}`);
    }
    
    const totalTracks = await Track.count();
    const totalAlbums = await db.Album.count();
    const totalPlaylistTracks = await PlaylistTrack.count();
    
    console.log(`\n🎵 Всего треков: ${totalTracks}`);
    console.log(`📚 Всего альбомов: ${totalAlbums}`);
    console.log(`🔗 Связей: ${totalPlaylistTracks}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Готово!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

createForeignPlaylistsSimple();

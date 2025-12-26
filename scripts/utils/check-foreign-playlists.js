/**
 * Проверка плейлистов "Зарубежные Новинки" и "Популярные Альбомы"
 */
const db = require('./src/models');
const { Playlist, PlaylistTrack } = db;

async function checkForeignPlaylists() {
  try {
    console.log('📊 Проверка плейлистов...\n');
    
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
    
    console.log(`✅ Найдено ${playlists.length} плейлистов:\n`);
    
    for (const p of playlists) {
      console.log(`📋 ${p.name}`);
      console.log(`   Тип: ${p.type}`);
      console.log(`   Треков: ${p.tracks ? p.tracks.length : 0}`);
      console.log(`   Описание: ${p.description}\n`);
    }
    
    // Общая статистика
    const totalTracks = await db.Track.count();
    const totalAlbums = await db.Album.count();
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();
    
    console.log('='.repeat(60));
    console.log('📊 ПОЛНАЯ СТАТИСТИКА:');
    console.log(`   🎵 Всего треков: ${totalTracks}`);
    console.log(`   📚 Всего альбомов: ${totalAlbums}`);
    console.log(`   📋 Всего плейлистов: ${totalPlaylists}`);
    console.log(`   🔗 Связей трек-плейлист: ${totalPlaylistTracks}`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkForeignPlaylists();

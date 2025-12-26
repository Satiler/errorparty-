/**
 * Диагностика плейлистов
 */
const db = require('./src/models');
const { Playlist, PlaylistTrack } = db;

async function diagnosePlaylistsIssue() {
  try {
    console.log('🔍 Диагностика плейлистов...\n');
    
    // Найдем все плейлисты
    const allPlaylists = await Playlist.findAll({
      where: {
        name: ['Зарубежные Новинки', 'Популярные Альбомы']
      }
    });
    
    console.log(`✅ Найдено плейлистов: ${allPlaylists.length}\n`);
    
    for (const pl of allPlaylists) {
      console.log(`📋 ${pl.name} (ID: ${pl.id})`);
      
      // Проверим треки через прямой запрос
      const tracks = await PlaylistTrack.findAll({
        where: { playlistId: pl.id }
      });
      
      console.log(`   Треков в БД: ${tracks.length}`);
      
      if (tracks.length > 0) {
        console.log(`   Примеры ID треков: ${tracks.slice(0, 3).map(t => t.trackId).join(', ')}`);
      }
      
      console.log('');
    }
    
    // Проверим общую статистику
    console.log('='.repeat(50));
    console.log('📊 ОБЩАЯ СТАТИСТИКА:\n');
    
    const totalTracks = await db.Track.count();
    const totalAlbums = await db.Album.count();
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();
    
    console.log(`🎵 Всего треков: ${totalTracks}`);
    console.log(`📚 Всего альбомов: ${totalAlbums}`);
    console.log(`📋 Всего плейлистов: ${totalPlaylists}`);
    console.log(`🔗 Всего связей: ${totalPlaylistTracks}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnosePlaylistsIssue();

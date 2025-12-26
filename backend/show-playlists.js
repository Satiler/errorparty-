const { Playlist, PlaylistTrack } = require('./src/models');

async function showPlaylists() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('          🎵 ПОПУЛЯРНЫЕ ПЛЕЙЛИСТЫ НА ГЛАВНОЙ');
  console.log('════════════════════════════════════════════════════════════\n');

  const playlists = await Playlist.findAll({
    where: { type: 'editorial' },
    order: [['id', 'DESC']]
  });

  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    const trackCount = await PlaylistTrack.count({
      where: { playlistId: playlist.id }
    });

    console.log(`${i + 1}. 📀 ${playlist.name}`);
    console.log(`   🎵 Треков: ${trackCount}`);
    console.log(`   🆔 ID: ${playlist.id}`);
    if (playlist.description) {
      console.log(`   📝 ${playlist.description}`);
    }
    console.log('');
  }

  const totalTracks = await PlaylistTrack.count();
  
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Всего плейлистов: ${playlists.length}`);
  console.log(`📊 Всего связей: ${totalTracks}`);
  console.log('════════════════════════════════════════════════════════════\n');
}

showPlaylists()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

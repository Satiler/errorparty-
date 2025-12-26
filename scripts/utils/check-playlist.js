const { Playlist, PlaylistTrack, Track } = require('./src/models');

async function checkPlaylist() {
  const playlist = await Playlist.findOne({
    where: { name: 'Топ-50 Мировые Хиты' },
    include: [{
      model: PlaylistTrack,
      as: 'tracks',
      include: [{ model: Track, as: 'track' }],
      separate: true,
      order: [['position', 'ASC']]
    }]
  });
  
  console.log(`🎵 Плейлист: ${playlist.name}`);
  console.log(`📊 Треков: ${playlist.tracks.length}`);
  console.log(`\n📝 Первые 15 треков:\n`);
  
  playlist.tracks.slice(0, 15).forEach((pt, i) => {
    console.log(`  ${i+1}. ${pt.track.artist} - ${pt.track.title} (chart: ${pt.track.chartPosition})`);
  });
  
  process.exit(0);
}

checkPlaylist();

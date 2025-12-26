const { Playlist, PlaylistTrack, sequelize } = require('./src/models');
const { Sequelize } = require('sequelize');

async function showPlaylistStats() {
  const playlists = await sequelize.query(`
    SELECT p.id, p.name, COUNT(pt.id) as "trackCount"
    FROM "Playlists" p
    LEFT JOIN "PlaylistTracks" pt ON p.id = pt."playlistId"
    GROUP BY p.id, p.name
    ORDER BY COUNT(pt.id) DESC
    LIMIT 20
  `, { type: Sequelize.QueryTypes.SELECT });

  console.log('\n🎵 ТОП-20 ПЛЕЙЛИСТОВ ПО КОЛИЧЕСТВУ ТРЕКОВ:\n');
  playlists.forEach((pl, i) => {
    console.log(`${i+1}. ${pl.name} - ${pl.trackCount} треков`);
  });

  const total = await Playlist.count();
  console.log(`\n📊 Всего плейлистов: ${total}`);
  
  process.exit(0);
}

showPlaylistStats();

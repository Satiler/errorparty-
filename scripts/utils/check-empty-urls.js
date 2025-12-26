const { Track, Album } = require('./src/models');
const { Sequelize } = require('sequelize');

async function checkEmptyUrls() {
  try {
    // Треки в альбомах без URL
    const albumTracks = await Track.findAll({
      where: { 
        streamUrl: null,
        albumId: { [Sequelize.Op.ne]: null }
      },
      include: [{
        model: Album,
        as: 'album'
      }],
      limit: 10
    });

    console.log(`\n📊 Треков в альбомах без URL: ${albumTracks.length}`);
    
    if (albumTracks.length > 0) {
      console.log('\nПримеры:');
      albumTracks.forEach(t => {
        console.log(`  - ${t.title} (${t.artist})`);
        if (t.album) {
          console.log(`    Альбом: ${t.album.title}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

checkEmptyUrls();

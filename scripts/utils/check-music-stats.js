const { Track, Album } = require('./src/models');

async function checkMusicStats() {
  console.log('\n📊 === СТАТИСТИКА МУЗЫКАЛЬНОЙ БИБЛИОТЕКИ ===\n');

  const albums = await Album.findAll({
    include: [{
      model: Track,
      as: 'tracks',
      attributes: ['id'],
      required: false
    }]
  });

  const filled = albums.filter(a => a.tracks && a.tracks.length > 0);
  const empty = albums.filter(a => !a.tracks || a.tracks.length === 0);
  
  const totalTracks = await Track.count();
  const tracksWithUrl = await Track.count({
    where: { streamUrl: { [require('sequelize').Op.ne]: null } }
  });

  console.log('Альбомы:');
  console.log(`  - Всего: ${albums.length}`);
  console.log(`  - Заполненных: ${filled.length} (${Math.round(filled.length/albums.length*100)}%)`);
  console.log(`  - Пустых: ${empty.length}`);
  
  console.log('\nТреки:');
  console.log(`  - Всего: ${totalTracks}`);
  console.log(`  - С URL: ${tracksWithUrl} (${Math.round(tracksWithUrl/totalTracks*100)}%)`);
  console.log(`  - Среднее на альбом: ${Math.round(totalTracks / filled.length)}`);

  console.log('\n✅ Музыкальная библиотека готова к использованию!\n');
  
  process.exit(0);
}

checkMusicStats().catch(console.error);

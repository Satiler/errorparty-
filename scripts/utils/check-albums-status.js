const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');

(async () => {
  const allAlbums = await Album.findAll({
    include: [{
      model: Track,
      as: 'tracks',
      required: false,
      attributes: ['id']
    }]
  });

  const emptyAlbums = allAlbums.filter(a => !a.tracks || a.tracks.length === 0);
  const filledAlbums = allAlbums.filter(a => a.tracks && a.tracks.length > 0);

  console.log('\n📊 СТАТИСТИКА АЛЬБОМОВ:\n');
  console.log('  Всего альбомов:', allAlbums.length);
  console.log('  Пустые альбомы:', emptyAlbums.length);
  console.log('  Заполненные альбомы:', filledAlbums.length);

  if (filledAlbums.length > 0) {
    const totalTracks = filledAlbums.reduce((sum, a) => sum + a.tracks.length, 0);
    console.log('  Всего треков в альбомах:', totalTracks);
    console.log('  Среднее треков на альбом:', Math.round(totalTracks / filledAlbums.length));
    
    console.log('\n  ✅ Примеры заполненных альбомов:\n');
    filledAlbums.slice(0, 5).forEach(a => 
      console.log(`    • ${a.title} - ${a.artist} (${a.tracks.length} треков)`)
    );
  }

  await sequelize.close();
  process.exit(0);
})();

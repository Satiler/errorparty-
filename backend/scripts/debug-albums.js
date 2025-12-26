const { Track, Album } = require('../src/models');

(async () => {
  try {
    // Проверяем альбомы
    const albums = await Album.findAll({
      where: { source: 'kissvk' },
      order: [['id', 'ASC']]
    });
    
    console.log(`Найдено альбомов KissVK: ${albums.length}\n`);
    albums.forEach(album => {
      console.log(`ID: ${album.id} | "${album.title}"`);
      console.log(`   coverUrl: ${album.coverUrl ? '✅ ' + album.coverUrl.substring(0, 60) + '...' : '❌ null'}\n`);
    });
    
    // Проверяем треки
    const track = await Track.findOne({
      where: { source: 'kissvk' },
      order: [['updatedAt', 'DESC']],
      include: [{ model: Album, as: 'album' }]
    });
    
    console.log('\nПоследний обновленный трек:');
    console.log(`${track.artist} - ${track.title}`);
    console.log(`albumId в БД: ${track.albumId}`);
    console.log(`album из include: ${track.album ? `ID ${track.album.id}, "${track.album.title}"` : 'null'}`);
    
    if (track.album) {
      console.log(`album.coverUrl: ${track.album.coverUrl || 'null'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();

const { Track, Album } = require('../src/models');

(async () => {
  try {
    const tracks = await Track.findAll({
      where: { source: 'kissvk' },
      limit: 5,
      order: [['updatedAt', 'DESC']],
      include: [{ model: Album, as: 'album' }]
    });
    
    console.log('Последние обновленные треки KissVK:\n');
    
    tracks.forEach((t, i) => {
      console.log(`${i+1}. ${t.artist} - ${t.title}`);
      console.log(`   Track coverUrl: ${t.coverUrl ? '✅ ' + t.coverUrl.substring(0, 60) + '...' : '❌ null'}`);
      console.log(`   Album coverUrl: ${t.album?.coverUrl ? '✅ ' + t.album.coverUrl.substring(0, 60) + '...' : '❌ null'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();

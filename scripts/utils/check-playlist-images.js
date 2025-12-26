const { Playlist } = require('./src/models');

(async () => {
  const playlists = await Playlist.findAll({
    where: { isPublic: true, type: ['editorial', 'chart', 'new'] },
    attributes: ['id', 'name', 'image', 'coverPath'],
    limit: 15,
    order: [['updatedAt', 'DESC']]
  });
  
  playlists.forEach(p => {
    console.log('ID:', p.id, 'Name:', p.name);
    console.log('  image:', p.image);
    console.log('  coverPath:', p.coverPath);
    console.log('---');
  });
  
  process.exit(0);
})();

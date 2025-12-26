const { Playlist } = require('./src/models');

async function checkMetadata() {
  const playlists = await Playlist.findAll({
    where: { id: { [require('sequelize').Op.lte]: 10 } },
    attributes: ['id', 'name', 'type', 'metadata'],
    order: [['id', 'ASC']],
    raw: true
  });

  console.log('\n📊 Первые 10 плейлистов:\n');
  playlists.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Type: ${p.type}`);
    console.log(`Metadata:`, JSON.stringify(p.metadata));
    console.log('---');
  });
  
  process.exit(0);
}

checkMetadata();

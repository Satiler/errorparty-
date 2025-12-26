const { Track } = require('./src/models');

(async () => {
  const tracks = await Track.findAll({
    where: { provider: 'kissvk' },
    attributes: ['id', 'title', 'artist', 'streamUrl', 'fileUrl', 'filePath'],
    order: [['id', 'ASC']],
    limit: 5
  });

  console.log(`\n📊 KissVK tracks status:\n`);
  tracks.forEach(t => {
    console.log(`Track #${t.id}: ${t.title} - ${t.artist}`);
    console.log(`  streamUrl: ${t.streamUrl ? t.streamUrl.substring(0, 80) + '...' : 'NULL'}`);
    console.log(`  fileUrl: ${t.fileUrl || 'NULL'}`);
    console.log(`  filePath: ${t.filePath || 'NULL'}`);
    console.log('');
  });

  process.exit(0);
})();

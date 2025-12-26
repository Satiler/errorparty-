const { Track } = require('./src/models');

(async () => {
  const tracks = await Track.findAll({ 
    where: { id: [6723, 6750, 6720] },
    attributes: ['id', 'title', 'artist', 'filePath', 'fileUrl', 'streamUrl']
  });
  
  console.log('🎵 Проверка скачанных треков:\n');
  tracks.forEach(t => {
    console.log(`ID ${t.id}: ${t.artist} - ${t.title}`);
    console.log(`  filePath: ${t.filePath || 'НЕТ'}`);
    console.log(`  fileUrl: ${t.fileUrl || 'НЕТ'}`);
    console.log(`  streamUrl: ${t.streamUrl}`);
    console.log('');
  });
  
  process.exit(0);
})();

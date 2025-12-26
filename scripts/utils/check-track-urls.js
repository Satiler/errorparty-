/**
 * Проверка треков KissVK - полная информация
 */

const { Track } = require('./src/models');

(async () => {
  try {
    const tracks = await Track.findAll({
      where: { provider: 'kissvk' },
      limit: 3,
      order: [['id', 'ASC']]
    });

    console.log(`\n📊 Треки KissVK (${tracks.length}):\n`);
    
    tracks.forEach((t, i) => {
      console.log(`${i + 1}. ${t.artist} - ${t.title}`);
      console.log(`   streamUrl: ${t.streamUrl || 'NULL'}`);
      console.log(`   fileUrl: ${t.fileUrl || 'NULL'}`);
      console.log(`   filePath: ${t.filePath || 'NULL'}`);
      console.log(`   sourceUrl: ${t.sourceUrl || 'NULL'}`);
      console.log(`   coverUrl: ${t.coverUrl || 'NULL'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
})();

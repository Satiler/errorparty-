const { sequelize, Track } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();
    
    const count = await Track.count();
    console.log('📊 Треков в базе:', count);
    
    const sample = await Track.findAll({ 
      limit: 5,
      attributes: ['id', 'title', 'artist', 'streamUrl', 'fileUrl', 'externalUrl'],
      order: [['id', 'DESC']]
    });
    
    console.log('\n🎵 Последние 5 треков:');
    sample.forEach(t => {
      console.log(`
  ID: ${t.id}
  Название: ${t.title}
  Исполнитель: ${t.artist}
  streamUrl: ${t.streamUrl || 'NULL ❌'}
  fileUrl: ${t.fileUrl || 'NULL ❌'}
  externalUrl: ${t.externalUrl || 'NULL ❌'}
  ---`);
    });
    
    // Проверим сколько треков БЕЗ streamUrl
    const withoutStream = await Track.count({
      where: {
        streamUrl: null
      }
    });
    
    console.log(`\n⚠️ Треков БЕЗ streamUrl: ${withoutStream} из ${count}`);
    console.log(`✅ Треков С streamUrl: ${count - withoutStream}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();

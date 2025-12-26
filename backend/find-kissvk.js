const { Track } = require('./src/models');

(async () => {
  console.log('\n🔍 ПОИСК KISSVK ТРЕКОВ:\n');
  
  // Ищем треки по полю provider
  const byProvider = await Track.count({ where: { provider: 'kissvk' } });
  console.log(`Треков с provider='kissvk': ${byProvider}`);
  
  // Ищем треки по полю source
  const bySource = await Track.count({ where: { source: 'kissvk' } });
  console.log(`Треков с source='kissvk': ${bySource}`);

  // Ищем треки по sourceUrl
  const bySourceUrl = await Track.count({ 
    where: { 
      sourceUrl: { $like: '%kissvk%' } 
    } 
  });
  console.log(`Треков с sourceUrl содержащим 'kissvk': ${bySourceUrl}`);

  // Ищем треки по externalUrl
  const byExternalUrl = await Track.count({ 
    where: { 
      externalUrl: { $like: '%kissvk%' } 
    } 
  });
  console.log(`Треков с externalUrl содержащим 'kissvk': ${byExternalUrl}`);

  // Примеры треков
  console.log('\n📋 ПРИМЕРЫ ТРЕКОВ:\n');
  const samples = await Track.findAll({
    limit: 5,
    attributes: ['id', 'artist', 'title', 'sourceType', 'source', 'provider', 'sourceUrl', 'externalUrl']
  });
  
  samples.forEach(t => {
    console.log(`ID ${t.id}: ${t.artist} - ${t.title}`);
    console.log(`  sourceType: ${t.sourceType || 'NULL'}`);
    console.log(`  source: ${t.source || 'NULL'}`);
    console.log(`  provider: ${t.provider || 'NULL'}`);
    console.log(`  sourceUrl: ${t.sourceUrl ? t.sourceUrl.substring(0, 50) : 'NULL'}`);
    console.log(`  externalUrl: ${t.externalUrl ? t.externalUrl.substring(0, 50) : 'NULL'}`);
    console.log('');
  });

  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

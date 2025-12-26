const { Track } = require('./src/models');

(async () => {
  try {
    const tracks = await Track.findAll({ 
      attributes: ['streamUrl'],
      limit: 100
    });
    
    const sources = {};
    tracks.forEach(t => {
      if (t.streamUrl) {
        try {
          const domain = new URL(t.streamUrl).hostname;
          sources[domain] = (sources[domain] || 0) + 1;
        } catch (e) {
          sources['invalid-url'] = (sources['invalid-url'] || 0) + 1;
        }
      }
    });
    
    console.log('📊 Источники треков (первые 100):');
    Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count}`);
      });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
})();

const { Track } = require('./src/models');
const { Op } = require('sequelize');

async function checkDatabase() {
  console.log('🔍 Проверка базы данных...\n');
  
  try {
    // 1. Общее количество треков
    const totalTracks = await Track.count();
    console.log(`📊 Всего треков: ${totalTracks}`);
    
    // 2. Треки с streamUrl
    const tracksWithStream = await Track.count({
      where: { streamUrl: { [Op.ne]: null } }
    });
    console.log(`🎵 Треков с streamUrl: ${tracksWithStream}`);
    
    // 3. Треки с chartPosition
    const tracksWithChart = await Track.count({
      where: { chartPosition: { [Op.ne]: null } }
    });
    console.log(`📈 Треков с chartPosition: ${tracksWithChart}`);
    
    // 4. Треки с popularityScore > 0
    const tracksWithPopularity = await Track.count({
      where: { popularityScore: { [Op.gt]: 0 } }
    });
    console.log(`⭐ Треков с popularityScore > 0: ${tracksWithPopularity}`);
    
    // 5. Треки с importSource = 'itunes-global'
    const itunesTracks = await Track.count({
      where: { importSource: 'itunes-global' }
    });
    console.log(`🍎 Треков с importSource='itunes-global': ${itunesTracks}`);
    
    // 6. Примеры треков с chartPosition
    console.log('\n🎵 Примеры треков с chartPosition:');
    const examples = await Track.findAll({
      where: { chartPosition: { [Op.ne]: null } },
      limit: 10,
      order: [['chartPosition', 'ASC']],
      attributes: ['id', 'title', 'artist', 'chartPosition', 'popularityScore', 'importSource']
    });
    
    if (examples.length > 0) {
      examples.forEach(t => {
        console.log(`  [${t.chartPosition}] ${t.artist} - ${t.title} (ID: ${t.id}, score: ${t.popularityScore}, source: ${t.importSource})`);
      });
    } else {
      console.log('  ❌ Нет треков с chartPosition!');
    }
    
    // 7. Последние обновленные треки
    console.log('\n🕒 Последние 5 обновленных треков:');
    const recent = await Track.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'artist', 'chartPosition', 'updatedAt']
    });
    
    recent.forEach(t => {
      console.log(`  ${t.artist} - ${t.title} (chart: ${t.chartPosition || 'N/A'}, updated: ${t.updatedAt.toISOString()})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkDatabase();

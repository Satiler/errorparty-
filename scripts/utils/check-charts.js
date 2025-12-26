const { Track } = require('./src/models');
const { Op } = require('sequelize');

async function checkCharts() {
  console.log('🔍 Проверка треков с позициями в чартах...\n');
  
  const tracksWithChartPos = await Track.findAll({
    where: {
      chartPosition: { [Op.ne]: null }
    },
    order: [['chartPosition', 'ASC']],
    limit: 10,
    attributes: ['id', 'title', 'artist', 'chartPosition', 'popularityScore', 'importSource', 'trendingDate']
  });
  
  console.log(`📊 Найдено треков с chartPosition: ${tracksWithChartPos.length}\n`);
  
  if (tracksWithChartPos.length > 0) {
    tracksWithChartPos.forEach(track => {
      console.log(`${track.chartPosition}. ${track.artist} - ${track.title}`);
      console.log(`   Score: ${track.popularityScore} | Source: ${track.importSource || 'N/A'} | Date: ${track.trendingDate ? track.trendingDate.toISOString().split('T')[0] : 'N/A'}\n`);
    });
  }
  
  // Проверяем общее количество треков с popularityScore > 0
  const popularTracks = await Track.count({
    where: {
      popularityScore: { [Op.gt]: 0 }
    }
  });
  
  console.log(`📈 Треков с popularityScore > 0: ${popularTracks}`);
  
  process.exit(0);
}

checkCharts();

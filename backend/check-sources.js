const { Track, sequelize } = require('./src/models');

(async () => {
  console.log('\n📊 АНАЛИЗ ИСТОЧНИКОВ ТРЕКОВ:\n');
  
  const result = await sequelize.query(`
    SELECT 
      COALESCE("sourceType", 'NULL') as source,
      COUNT(*) as count
    FROM "Tracks"
    GROUP BY "sourceType"
    ORDER BY count DESC
  `, { type: sequelize.QueryTypes.SELECT });

  result.forEach(r => {
    console.log(`  ${r.source}: ${r.count} треков`);
  });

  console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:\n');
  
  const stats = await sequelize.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN "sourceType" = 'kissvk' THEN 1 END) as kissvk,
      COUNT(CASE WHEN "sourceType" = 'vk' THEN 1 END) as vk,
      COUNT(CASE WHEN "sourceType" IS NULL THEN 1 END) as manual,
      COUNT(CASE WHEN "coverUrl" IS NOT NULL THEN 1 END) as with_covers
    FROM "Tracks"
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`  Всего треков: ${stats[0].total}`);
  console.log(`  KissVK: ${stats[0].kissvk}`);
  console.log(`  VK: ${stats[0].vk}`);
  console.log(`  Manual (без source): ${stats[0].manual}`);
  console.log(`  С обложками: ${stats[0].with_covers} (${Math.round(stats[0].with_covers/stats[0].total*100)}%)`);
  
  console.log('');
  process.exit(0);
})();

const { Album, Track, sequelize } = require('./src/models');

async function checkAlbumsCovers() {
  try {
    const total = await Album.count();
    const withoutCovers = await Album.count({ where: { coverUrl: null } });
    const withCovers = total - withoutCovers;
    
    console.log('\n📊 Album Covers Statistics:');
    console.log(`   Total albums: ${total}`);
    console.log(`   With covers: ${withCovers}`);
    console.log(`   Without covers: ${withoutCovers}\n`);
    
    // Проверим, у скольких альбомов без обложек есть треки с обложками
    const query = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM "Albums" a
      INNER JOIN "Tracks" t ON t."albumId" = a.id
      WHERE a."coverUrl" IS NULL
        AND t."coverUrl" IS NOT NULL
    `;
    
    const [result] = await sequelize.query(query);
    const canBeFixed = result[0].count;
    
    console.log(`   Can be auto-fixed: ${canBeFixed} (albums with tracks that have covers)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAlbumsCovers();

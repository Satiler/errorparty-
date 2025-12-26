const db = require('./src/models');
const sequelize = db.sequelize;

async function checkSql() {
  try {
    const result = await sequelize.query(
      'SELECT COUNT(*) as count FROM "Tracks" WHERE "streamUrl" IS NULL AND "albumId" IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📊 Треков без URL в альбомах:', result[0].count);
    
    const samples = await sequelize.query(
      'SELECT id, title, artist, "streamUrl", "albumId" FROM "Tracks" WHERE "streamUrl" IS NULL AND "albumId" IS NOT NULL LIMIT 10',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (samples.length > 0) {
      console.log('\n📋 Примеры:');
      samples.forEach(t => {
        console.log(`  ID ${t.id}: ${t.title} (${t.artist})`);
        console.log(`    Album ID: ${t.albumId}, URL: ${t.streamUrl || 'NULL'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

checkSql();

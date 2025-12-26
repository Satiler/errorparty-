const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('errorparty', 'errorparty', 'change_me_secure_password', {
  host: 'postgres',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function check() {
  try {
    // Проверяем все треки из kissvk
    const kissvkTracks = await sequelize.query(
      'SELECT id, title, artist, source, provider, "providerTrackId", "albumId" FROM "Tracks" WHERE source = \'kissvk\' ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`🔍 Треки из kissvk: ${kissvkTracks.length}`);
    kissvkTracks.forEach(t => {
      console.log(`   ${t.id}: ${t.artist} - ${t.title}`);
      console.log(`        Provider Track ID: ${t.providerTrackId}`);
      console.log(`        Album ID: ${t.albumId}`);
    });
    
    // Проверяем общую статистику по source
    const stats = await sequelize.query(
      'SELECT source, COUNT(*) as count FROM "Tracks" GROUP BY source ORDER BY count DESC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('\n📊 Статистика по источникам:');
    stats.forEach(s => console.log(`   ${s.source || 'null'}: ${s.count}`));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();

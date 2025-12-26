const { sequelize } = require('./src/models');
const { Sequelize } = require('sequelize');

async function checkMeta() {
  const result = await sequelize.query(`
    SELECT id, name, type, metadata 
    FROM "Playlists" 
    WHERE type = 'editorial'
    ORDER BY id ASC 
    LIMIT 10
  `, { type: Sequelize.QueryTypes.SELECT });

  console.log('\n📊 Редакционные плейлисты:\n');
  result.forEach(p => {
    console.log(`${p.id}. ${p.name}`);
    console.log(`   Type: ${p.type}`);
    console.log(`   Metadata:`, p.metadata);
    console.log('');
  });
  
  process.exit(0);
}

checkMeta();

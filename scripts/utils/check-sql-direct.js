const { sequelize } = require('./src/models');

(async () => {
  const [results] = await sequelize.query(`
    SELECT id, name, image, "coverPath"
    FROM "Playlists" 
    WHERE "isPublic" = true AND type IN ('editorial', 'chart', 'new')
    ORDER BY "updatedAt" DESC 
    LIMIT 10
  `);
  
  console.log('Direct SQL query results:');
  results.forEach(p => {
    console.log('ID:', p.id, 'Name:', p.name);
    console.log('  image:', p.image);
    console.log('  coverPath:', p.coverPath);
    console.log('---');
  });
  
  process.exit(0);
})();

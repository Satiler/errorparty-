const { sequelize } = require('./src/models');

(async () => {
  const [results] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'Playlists' 
    ORDER BY ordinal_position
  `);
  
  console.log('Columns in Playlists table:');
  results.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  });
  
  process.exit(0);
})();

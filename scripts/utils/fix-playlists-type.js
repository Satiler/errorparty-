const { Playlist, sequelize } = require('./src/models');

async function fixPlaylists() {
  try {
    // Обновляем все плейлисты кроме первых 6
    const [results] = await sequelize.query(`
      UPDATE "Playlists" 
      SET type = 'editorial', 
          metadata = '{"type": "editorial", "priority": 1}'::jsonb
      WHERE id > 6
    `);
    
    console.log('✅ Обновлено плейлистов');
    
    // Проверка
    const editorial = await Playlist.count({ where: { type: 'editorial' } });
    console.log('📊 Редакционных плейлистов:', editorial);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

fixPlaylists();

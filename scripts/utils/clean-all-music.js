const { Track, Album, Playlist, PlaylistTrack, sequelize } = require('./src/models');

async function cleanAllMusic() {
  try {
    console.log('🗑️  Начинаю полную очистку музыкальной базы данных...\n');
    
    await sequelize.authenticate();
    console.log('✅ База данных подключена\n');

    // Используем raw SQL с CASCADE для обхода ограничений внешних ключей
    await sequelize.query('TRUNCATE TABLE "PlaylistTracks" CASCADE');
    console.log('✅ Удалена таблица PlaylistTracks');

    await sequelize.query('TRUNCATE TABLE "Playlists" CASCADE');
    console.log('✅ Удалена таблица Playlists');

    await sequelize.query('TRUNCATE TABLE "Albums" CASCADE');
    console.log('✅ Удалена таблица Albums');

    await sequelize.query('TRUNCATE TABLE "Tracks" CASCADE');
    console.log('✅ Удалена таблица Tracks');

    console.log('\n🎉 Полная очистка завершена! База готова к загрузке новых треков.');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка очистки:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanAllMusic();

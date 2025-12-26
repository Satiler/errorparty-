const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function checkPlaylist() {
  try {
    console.log('🔍 Проверка реального содержимого плейлиста...\n');

    const [tracks] = await sequelize.query(`
      SELECT 
        pt.id, 
        pt.position, 
        t.title, 
        t.artist, 
        t.id as track_id
      FROM "PlaylistTracks" pt
      JOIN "Tracks" t ON pt."trackId" = t.id
      WHERE pt."playlistId" = 60
      ORDER BY pt.position
    `);

    console.log(`📊 Всего треков: ${tracks.length}\n`);

    // Группируем по названию трека
    const trackGroups = {};
    tracks.forEach(track => {
      const key = `${track.title} - ${track.artist}`;
      if (!trackGroups[key]) {
        trackGroups[key] = [];
      }
      trackGroups[key].push(track);
    });

    // Показываем только дубликаты
    let duplicatesFound = false;
    console.log('🔴 ДУБЛИКАТЫ:\n');
    Object.entries(trackGroups).forEach(([key, group]) => {
      if (group.length > 1) {
        duplicatesFound = true;
        console.log(`❌ "${key}" - ${group.length} раз:`);
        group.forEach(t => {
          console.log(`   Позиция ${t.position}, trackId: ${t.track_id}`);
        });
        console.log('');
      }
    });

    if (!duplicatesFound) {
      console.log('✅ Дубликатов не найдено!\n');
    }

    // Показываем первые 20 треков
    console.log('\n📋 Первые 20 треков:');
    tracks.slice(0, 20).forEach(t => {
      console.log(`${t.position}. ${t.title} - ${t.artist}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkPlaylist();

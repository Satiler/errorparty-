const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'errorparty',
  process.env.DB_USER || 'errorparty', 
  process.env.DB_PASSWORD || 'errorparty',
  {
    host: process.env.DB_HOST || 'postgres',
    dialect: 'postgres',
    logging: false
  }
);

async function analyzeMusic() {
  try {
    console.log('📊 АНАЛИЗ МУЗЫКАЛЬНОЙ БИБЛИОТЕКИ\n' + '='.repeat(80) + '\n');

    // 1. Общая статистика треков
    console.log('1️⃣  ОБЩАЯ СТАТИСТИКА ТРЕКОВ:');
    const [trackStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(CASE WHEN "streamUrl" IS NOT NULL THEN 1 END) as with_stream,
        COUNT(CASE WHEN "fileUrl" IS NOT NULL THEN 1 END) as with_file,
        COUNT(CASE WHEN source = 'kissvk' THEN 1 END) as kissvk,
        COUNT(CASE WHEN source = 'jamendo' THEN 1 END) as jamendo,
        COUNT(CASE WHEN source = 'local' THEN 1 END) as local_files
      FROM "Tracks"
    `);
    console.table(trackStats);

    // 2. ТОП-10 исполнителей
    console.log('\n2️⃣  ТОП-10 ИСПОЛНИТЕЛЕЙ:');
    const [topArtists] = await sequelize.query(`
      SELECT artist, COUNT(*) as tracks_count 
      FROM "Tracks" 
      GROUP BY artist 
      ORDER BY tracks_count DESC 
      LIMIT 10
    `);
    console.table(topArtists);

    // 3. Альбомы
    console.log('\n3️⃣  АЛЬБОМЫ:');
    try {
      const [albumStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_albums,
          COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_covers
        FROM "Albums"
      `);
      console.table(albumStats);
    } catch (e) {
      console.log('Нет данных об альбомах');
    }

    // 4. Плейлисты
    console.log('\n4️⃣  ПЛЕЙЛИСТЫ:');
    try {
      const [playlistStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_playlists,
          COUNT(CASE WHEN is_public = true THEN 1 END) as public_playlists
        FROM "Playlists"
      `);
      console.table(playlistStats);
    } catch (e) {
      console.log('Нет данных о плейлистах');
    }

    // 5. Источники треков
    console.log('\n5️⃣  ИСТОЧНИКИ ТРЕКОВ:');
    const [sources] = await sequelize.query(`
      SELECT 
        COALESCE(source, 'unknown') as source,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Tracks"), 2) as percentage
      FROM "Tracks"
      GROUP BY source
      ORDER BY count DESC
    `);
    console.table(sources);

    // 6. Последние треки
    console.log('\n6️⃣  ПОСЛЕДНИЕ 10 ДОБАВЛЕННЫХ ТРЕКОВ:');
    const [recentTracks] = await sequelize.query(`
      SELECT id, title, artist, source, created_at 
      FROM "Tracks" 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.table(recentTracks);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Анализ завершен!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

analyzeMusic();

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('errorparty', 'errorparty', 'change_me_secure_password', {
  host: 'postgres',
  dialect: 'postgres',
  logging: false
});

const Track = sequelize.define('Track', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
}, { tableName: 'Tracks' });

const PlaylistTrack = sequelize.define('PlaylistTrack', {
  playlistId: DataTypes.INTEGER,
  trackId: DataTypes.INTEGER,
  position: DataTypes.INTEGER
}, { tableName: 'PlaylistTracks', timestamps: false });

async function fillPlaylists() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключено к БД');

    // Получаем случайные треки
    const allTracks = await Track.findAll({ attributes: ['id'] });
    const trackIds = allTracks.map(t => t.id);
    
    if (trackIds.length === 0) {
      console.log('❌ Нет треков в базе данных');
      process.exit(1);
    }

    // Получаем треки отсортированные по дате добавления (самые свежие)
    const getLatestTracks = async (count) => {
      const tracks = await sequelize.query(
        'SELECT id FROM "Tracks" ORDER BY "createdAt" DESC LIMIT :limit',
        {
          replacements: { limit: count },
          type: sequelize.QueryTypes.SELECT
        }
      );
      return tracks.map(t => t.id);
    };

    const playlistIds = [308, 309, 310, 311, 312, 313, 314, 315, 340, 341];

    for (const playlistId of playlistIds) {
      // Удаляем старые треки если есть
      await PlaylistTrack.destroy({ where: { playlistId } });

      // Добавляем самые свежие треки (из KissVK импорта)
      const selectedTracks = await getLatestTracks(50);
      for (let i = 0; i < selectedTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId,
          trackId: selectedTracks[i],
          position: i
        });
      }
      console.log(`✅ Плейлист ${playlistId}: добавлено ${selectedTracks.length} треков (самые свежие)`);
    }

    console.log('\n🎉 Все плейлисты заполнены треками!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

fillPlaylists();

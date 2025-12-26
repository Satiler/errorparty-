const { Playlist, PlaylistTrack, Track, sequelize } = require('./src/models');

async function checkTop100() {
  try {
    await sequelize.authenticate();
    console.log('✅ База данных подключена\n');

    const playlist = await Playlist.findOne({
      where: { name: '🔥 Топ 100' }
    });

    if (!playlist) {
      console.log('❌ Плейлист "🔥 Топ 100" не найден');
      await sequelize.close();
      return;
    }

    const tracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'title', 'artist', 'provider', 'playCount']
      }],
      order: [['position', 'ASC']],
      limit: 20
    });

    console.log(`✅ Плейлист: ${playlist.name}`);
    console.log(`   ID: ${playlist.id}`);
    console.log(`   Тип: ${playlist.type}`);
    console.log(`   Треков в плейлисте: ${tracks.length}+\n`);

    console.log('📋 Топ 20 треков:\n');
    tracks.forEach((pt, index) => {
      const track = pt.track;
      const provider = track.provider === 'kissvk' ? '💋' : '🎵';
      console.log(`${index + 1}. ${provider} ${track.artist} - ${track.title}`);
      console.log(`   Провайдер: ${track.provider} | Прослушиваний: ${track.playCount || 0}`);
    });

    // Статистика по провайдерам
    const allTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['provider']
      }]
    });

    const providers = {};
    allTracks.forEach(pt => {
      const provider = pt.track.provider;
      providers[provider] = (providers[provider] || 0) + 1;
    });

    console.log('\n📊 Статистика по источникам:');
    Object.entries(providers).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} треков`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
  }
}

checkTop100();

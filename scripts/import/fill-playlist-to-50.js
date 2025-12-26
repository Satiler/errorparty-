const { sequelize } = require('./src/config/database');
const { Playlist, PlaylistTrack, Track } = require('./src/models');

async function fillPlaylistTo50() {
  try {
    console.log('\n📝 === ДОПОЛНЕНИЕ ПЛЕЙЛИСТА ДО 50 ТРЕКОВ ===\n');
    
    const playlist = await Playlist.findOne({
      where: { name: 'Топ-50 Мировые Хиты' }
    });
    
    if (!playlist) {
      console.log('❌ Плейлист не найден');
      return;
    }
    
    // Текущее количество
    const currentCount = await PlaylistTrack.count({
      where: { playlistId: playlist.id }
    });
    
    console.log(`📊 Текущее количество: ${currentCount} треков`);
    
    if (currentCount >= 50) {
      console.log('✅ Плейлист уже заполнен!');
      return;
    }
    
    const needed = 50 - currentCount;
    console.log(`🎯 Нужно добавить: ${needed} треков\n`);
    
    // Получаем ID треков, которые уже в плейлисте
    const existingTrackIds = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      attributes: ['trackId']
    }).then(pts => pts.map(pt => pt.trackId));
    
    // Находим топ треки, которых ещё нет в плейлисте
    const additionalTracks = await Track.findAll({
      where: {
        id: { [sequelize.Sequelize.Op.notIn]: existingTrackIds },
        streamUrl: { [sequelize.Sequelize.Op.ne]: null }
      },
      order: [
        [sequelize.literal('COALESCE("popularityScore", 0)'), 'DESC'],
        ['playCount', 'DESC']
      ],
      limit: needed
    });
    
    console.log(`✅ Найдено ${additionalTracks.length} дополнительных треков\n`);
    
    // Добавляем их в плейлист
    let position = currentCount + 1;
    for (const track of additionalTracks) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: track.id,
        position: position
      });
      console.log(`  ${position}. ${track.title} - ${track.artist}`);
      position++;
    }
    
    // Обновляем счётчик
    await playlist.update({ trackCount: position - 1 });
    
    console.log(`\n✅ Плейлист дополнен до ${position - 1} треков!\n`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fillPlaylistTo50()
  .then(() => {
    console.log('✅ Готово!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

const { sequelize } = require('./src/config/database');
const { PlaylistTrack, Playlist, Track } = require('./src/models');

async function fixPlaylistDuplicates() {
  try {
    console.log('\n🔧 === УДАЛЕНИЕ ДУБЛИКАТОВ ПО НАЗВАНИЮ ===\n');
    
    // Находим плейлист
    const playlist = await Playlist.findOne({
      where: { name: 'Топ-50 Мировые Хиты' }
    });
    
    if (!playlist) {
      console.log('❌ Плейлист не найден');
      return;
    }
    
    console.log(`✅ Плейлист найден (ID: ${playlist.id})`);
    
    // Находим все треки в плейлисте с информацией о треках
    const allTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      include: [{ model: Track, as: 'track' }],
      order: [['position', 'ASC']]
    });
    
    console.log(`📊 Всего записей: ${allTracks.length}\n`);
    
    // Находим дубликаты по названию + исполнителю
    const seenTracks = new Map();
    const duplicateIds = [];
    
    for (const playlistTrack of allTracks) {
      const track = playlistTrack.track;
      const key = `${track.title}|||${track.artist}`.toLowerCase();
      
      if (seenTracks.has(key)) {
        // Это дубликат по названию - помечаем на удаление
        duplicateIds.push(playlistTrack.id);
        console.log(`❌ Дубликат: "${track.title} - ${track.artist}" (позиция ${playlistTrack.position}, trackId ${track.id})`);
      } else {
        seenTracks.set(key, playlistTrack);
      }
    }
    
    console.log(`\n⚠️  Найдено дубликатов по названию: ${duplicateIds.length}\n`);
    
    if (duplicateIds.length > 0) {
      // Удаляем дубликаты
      await PlaylistTrack.destroy({
        where: {
          id: duplicateIds
        }
      });
      console.log(`✅ Удалено ${duplicateIds.length} дубликатов\n`);
      
      // Пересчитываем позиции для оставшихся треков
      const uniqueTracks = Array.from(seenTracks.values()).sort((a, b) => a.position - b.position);
      
      console.log('🔄 Пересчитываем позиции...');
      for (let i = 0; i < uniqueTracks.length; i++) {
        await uniqueTracks[i].update({ position: i + 1 });
      }
      
      console.log(`✅ Позиции пересчитаны для ${uniqueTracks.length} треков`);
      
      // Обновляем счетчик
      await playlist.update({ trackCount: uniqueTracks.length });
      console.log(`✅ Счетчик треков обновлен: ${uniqueTracks.length}\n`);
    } else {
      console.log('✅ Дубликаты не найдены!\n');
    }
    
    // Финальная проверка
    const finalTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      include: [{ model: Track, as: 'track' }],
      order: [['position', 'ASC']]
    });
    
    console.log(`\n📊 Финальный результат: ${finalTracks.length} уникальных треков\n`);
    console.log('📋 Первые 10 треков:');
    finalTracks.slice(0, 10).forEach(pt => {
      console.log(`  ${pt.position}. ${pt.track.title} - ${pt.track.artist}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем
fixPlaylistDuplicates()
  .then(() => {
    console.log('\n✅ Готово!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

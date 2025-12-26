const { sequelize } = require('./src/config/database');
const { PlaylistTrack, Playlist } = require('./src/models');

async function fixPlaylistDuplicates() {
  try {
    console.log('\n🔧 === ПОЛНАЯ ОЧИСТКА ДУБЛИКАТОВ В ПЛЕЙЛИСТЕ ===\n');
    
    // Находим плейлист
    const playlist = await Playlist.findOne({
      where: { name: 'Топ-50 Мировые Хиты' }
    });
    
    if (!playlist) {
      console.log('❌ Плейлист не найден');
      return;
    }
    
    console.log(`✅ Плейлист найден (ID: ${playlist.id})`);
    
    // Находим все треки в плейлисте
    const allTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      order: [['position', 'ASC']]
    });
    
    console.log(`📊 Всего записей: ${allTracks.length}`);
    
    // Находим дубликаты
    const seenTracks = new Map();
    const duplicateIds = [];
    
    for (const pt of allTracks) {
      if (seenTracks.has(pt.trackId)) {
        duplicateIds.push(pt.id);
        console.log(`🔍 Дубликат найден: trackId=${pt.trackId}, position=${pt.position}`);
      } else {
        seenTracks.set(pt.trackId, pt);
      }
    }
    
    console.log(`\n⚠️  Найдено дубликатов: ${duplicateIds.length}`);
    
    if (duplicateIds.length > 0) {
      // Удаляем дубликаты
      await PlaylistTrack.destroy({
        where: {
          id: duplicateIds
        }
      });
      console.log(`✅ Удалено ${duplicateIds.length} дубликатов`);
      
      // Пересчитываем позиции
      const uniqueTracks = Array.from(seenTracks.values()).sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < uniqueTracks.length; i++) {
        await uniqueTracks[i].update({ position: i + 1 });
      }
      
      console.log(`✅ Позиции пересчитаны для ${uniqueTracks.length} треков`);
      
      // Обновляем счетчик
      await playlist.update({ trackCount: uniqueTracks.length });
      console.log(`✅ Счетчик треков обновлен: ${uniqueTracks.length}`);
    } else {
      console.log('✅ Дубликаты не найдены!');
    }
    
    // Финальная проверка
    const finalCount = await PlaylistTrack.count({
      where: { playlistId: playlist.id }
    });
    
    console.log(`\n📊 Финальный результат: ${finalCount} уникальных треков`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}

// Запуск
(async () => {
  try {
    await sequelize.query('SELECT 1+1');
    console.log('✅ Подключение к БД\n');
    
    await fixPlaylistDuplicates();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
  }
})();

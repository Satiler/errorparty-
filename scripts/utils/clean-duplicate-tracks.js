const { sequelize } = require('./src/config/database');
const { Track } = require('./src/models');

async function cleanDuplicateTracks() {
  try {
    console.log('\n🔧 === УДАЛЕНИЕ ДУБЛИРУЮЩИХСЯ ТРЕКОВ ИЗ БАЗЫ ===\n');
    
    // Находим все треки
    const allTracks = await Track.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`📊 Всего треков в базе: ${allTracks.length}\n`);
    
    // Группируем по названию + исполнителю
    const trackMap = new Map();
    const duplicateIds = [];
    
    for (const track of allTracks) {
      const key = `${track.title}|||${track.artist}`.toLowerCase();
      
      if (trackMap.has(key)) {
        // Это дубликат - помечаем на удаление (оставляем первый)
        duplicateIds.push(track.id);
        console.log(`❌ Дубликат: "${track.title} - ${track.artist}" (ID: ${track.id})`);
      } else {
        trackMap.set(key, track);
      }
    }
    
    console.log(`\n⚠️  Найдено дубликатов: ${duplicateIds.length}\n`);
    
    if (duplicateIds.length > 0) {
      // Удаляем дубликаты из базы
      await Track.destroy({
        where: {
          id: duplicateIds
        }
      });
      
      console.log(`✅ Удалено ${duplicateIds.length} дублирующихся треков\n`);
    } else {
      console.log('✅ Дубликаты не найдены!\n');
    }
    
    // Финальная статистика
    const finalCount = await Track.count();
    console.log(`📊 Финальный результат: ${finalCount} уникальных треков в базе\n`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем
cleanDuplicateTracks()
  .then(() => {
    console.log('✅ Готово!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

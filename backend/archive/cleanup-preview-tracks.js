/**
 * Очистка треков с preview URL
 * Удаляет все треки, которые содержат только 30-секундные preview
 */

require('dotenv').config();
const { Op } = require('sequelize');
const { Track, PlaylistTrack } = require('./src/models');

async function cleanupPreviewTracks() {
  console.log('\n🧹 === ОЧИСТКА PREVIEW ТРЕКОВ ===\n');
  
  try {
    // 1. Найти все preview треки
    console.log('🔍 Поиск preview треков...\n');
    
    const previewTracks = await Track.findAll({
      where: {
        [Op.or]: [
          // URL содержит preview
          { streamUrl: { [Op.like]: '%preview%' } },
          // URL содержит itunes://
          { streamUrl: { [Op.like]: '%itunes://%' } },
          // Длительность 30 секунд или меньше
          { duration: { [Op.lte]: 30 } },
          // Preview URL из Apple Music
          { streamUrl: { [Op.like]: '%apple.com%preview%' } }
        ]
      }
    });
    
    console.log(`📊 Найдено preview треков: ${previewTracks.length}\n`);
    
    if (previewTracks.length === 0) {
      console.log('✅ Preview треков не найдено!\n');
      return { deleted: 0 };
    }
    
    // Показать примеры
    console.log('📋 Примеры найденных preview треков:\n');
    previewTracks.slice(0, 5).forEach(track => {
      console.log(`  - ${track.artist} - ${track.title}`);
      console.log(`    URL: ${track.streamUrl?.substring(0, 60)}...`);
      console.log(`    Длительность: ${track.duration}s`);
      console.log(`    Источник: ${track.importSource}\n`);
    });
    
    // Подтверждение
    console.log(`⚠️  Будет удалено ${previewTracks.length} треков\n`);
    
    // 2. Удалить связи с плейлистами
    const trackIds = previewTracks.map(t => t.id);
    
    console.log('🗑️  Удаление связей с плейлистами...');
    const deletedPlaylistTracks = await PlaylistTrack.destroy({
      where: {
        trackId: { [Op.in]: trackIds }
      }
    });
    console.log(`✅ Удалено связей: ${deletedPlaylistTracks}\n`);
    
    // 3. Удалить треки
    console.log('🗑️  Удаление preview треков...');
    const deletedTracks = await Track.destroy({
      where: {
        id: { [Op.in]: trackIds }
      }
    });
    console.log(`✅ Удалено треков: ${deletedTracks}\n`);
    
    // 4. Статистика оставшихся треков
    const remainingTracks = await Track.count();
    const fullTracks = await Track.count({
      where: {
        [Op.and]: [
          { streamUrl: { [Op.notLike]: '%preview%' } },
          { streamUrl: { [Op.notLike]: '%itunes://%' } },
          { duration: { [Op.gt]: 30 } }
        ]
      }
    });
    
    console.log('📊 === ИТОГИ ===\n');
    console.log(`🗑️  Удалено: ${deletedTracks} preview треков`);
    console.log(`✅ Осталось: ${remainingTracks} треков`);
    console.log(`🎵 Полных треков: ${fullTracks}`);
    console.log(`📈 Качество базы: ${Math.round(fullTracks / remainingTracks * 100)}%\n`);
    
    return {
      deleted: deletedTracks,
      remaining: remainingTracks,
      full: fullTracks
    };
    
  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
    throw error;
  }
}

// Запуск
if (require.main === module) {
  cleanupPreviewTracks()
    .then(() => {
      console.log('✅ Очистка завершена!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { cleanupPreviewTracks };

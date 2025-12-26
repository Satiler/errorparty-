/**
 * УЛУЧШЕННЫЙ Топ 100 - только качественные хиты
 */

const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function rebuildTop100() {
  console.log('🔥 СОЗДАНИЕ КАЧЕСТВЕННОГО ТОП 100\n');
  
  // Критерии качества:
  // 1. Популярность: playCount > 20
  // 2. Длительность: 60-600 секунд (исключаем слишком короткие и длинные)
  // 3. Исключаем инструменталы и биты
  // 4. Приоритет треков с обложками
  
  const qualityTracks = await Track.findAll({
    where: {
      playCount: { [Op.gte]: 20 },
      duration: { 
        [Op.and]: [
          { [Op.gte]: 60 },
          { [Op.lte]: 600 }
        ]
      },
      title: {
        [Op.and]: [
          { [Op.notILike]: '%type beat%' },
          { [Op.notILike]: '%instrumental%' },
          { [Op.notILike]: '%remix%pitch%' },
          { [Op.notILike]: '%+reverb%' }
        ]
      }
    },
    order: [
      ['playCount', 'DESC'],
      ['coverUrl', 'DESC NULLS LAST']
    ],
    limit: 100
  });

  console.log(`✅ Найдено ${qualityTracks.length} качественных треков\n`);

  // Статистика
  const withCovers = qualityTracks.filter(t => t.coverUrl).length;
  const kissvk = qualityTracks.filter(t => t.source === 'kissvk' || t.provider === 'kissvk').length;
  const avgPlays = Math.round(qualityTracks.reduce((sum, t) => sum + t.playCount, 0) / qualityTracks.length);

  console.log('📊 СТАТИСТИКА:');
  console.log(`  Треков: ${qualityTracks.length}`);
  console.log(`  С обложками: ${withCovers} (${Math.round(withCovers/qualityTracks.length*100)}%)`);
  console.log(`  KissVK: ${kissvk}`);
  console.log(`  Средние прослушивания: ${avgPlays}`);
  console.log('');

  // Обновляем плейлист
  const playlist = await Playlist.findOne({ where: { id: 423 } });
  
  if (!playlist) {
    console.log('❌ Плейлист не найден');
    process.exit(1);
  }

  console.log('🔄 Обновляю плейлист...');
  
  await PlaylistTrack.destroy({ where: { playlistId: 423 } });

  for (let i = 0; i < qualityTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: 423,
      trackId: qualityTracks[i].id,
      position: i
    });
  }

  // Устанавливаем обложку
  const topWithCover = qualityTracks.find(t => t.coverUrl);
  if (topWithCover) {
    await playlist.update({
      coverUrl: topWithCover.coverUrl,
      image: topWithCover.coverUrl
    });
  }

  console.log('✅ Плейлист обновлён!');
  console.log('');
  
  // Показываем топ 20
  console.log('🎵 ТОП 20 ТРЕКОВ:\n');
  qualityTracks.slice(0, 20).forEach((t, i) => {
    const cover = t.coverUrl ? '🖼️' : '❌';
    const source = t.source || t.provider || 'manual';
    console.log(`${i+1}. ${t.artist} - ${t.title.substring(0, 50)}`);
    console.log(`   ${cover} ${t.playCount} plays | ${source}`);
  });

  console.log('');
  process.exit(0);
}

rebuildTop100().catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

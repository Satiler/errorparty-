/**
 * Улучшенная сортировка треков на главной странице
 * Показывает ПОПУЛЯРНЫЕ треки, а не последние добавленные
 */

const { Track } = require('./src/models');

async function demonstrateSorting() {
  console.log('🎵 ДЕМОНСТРАЦИЯ УЛУЧШЕННОЙ СОРТИРОВКИ ТРЕКОВ\n');
  console.log('=' .repeat(80));
  
  // Старая сортировка - по дате (ПЛОХО)
  console.log('\n❌ СТАРАЯ ЛОГИКА (sortBy=createdAt):');
  console.log('   Показывает последние добавленные треки, независимо от качества\n');
  
  const oldSort = await Track.findAll({
    where: { isPublic: true },
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['title', 'artist', 'playCount', 'likeCount']
  });
  
  oldSort.forEach((t, i) => {
    console.log(`${i+1}. ${t.artist} - ${t.title}`);
    console.log(`   👂 ${t.playCount} прослушиваний, ❤️  ${t.likeCount} лайков`);
  });
  
  const oldAvgPlays = oldSort.reduce((s, t) => s + t.playCount, 0) / oldSort.length;
  console.log(`\n   📊 Средняя популярность: ${Math.round(oldAvgPlays)} прослушиваний`);
  
  // Новая сортировка - по популярности (ХОРОШО)
  console.log('\n\n✅ НОВАЯ ЛОГИКА (sortBy=playCount):');
  console.log('   Показывает ПОПУЛЯРНЫЕ треки с большим количеством прослушиваний\n');
  
  const newSort = await Track.findAll({
    where: { isPublic: true },
    order: [
      ['playCount', 'DESC'],
      ['likeCount', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: 10,
    attributes: ['title', 'artist', 'playCount', 'likeCount']
  });
  
  newSort.forEach((t, i) => {
    console.log(`${i+1}. ${t.artist} - ${t.title}`);
    console.log(`   👂 ${t.playCount} прослушиваний, ❤️  ${t.likeCount} лайков`);
  });
  
  const newAvgPlays = newSort.reduce((s, t) => s + t.playCount, 0) / newSort.length;
  console.log(`\n   📊 Средняя популярность: ${Math.round(newAvgPlays)} прослушиваний`);
  
  // Сравнение
  console.log('\n' + '='.repeat(80));
  console.log('📈 РЕЗУЛЬТАТ УЛУЧШЕНИЯ:\n');
  console.log(`   Было: ${Math.round(oldAvgPlays)} прослушиваний в среднем`);
  console.log(`   Стало: ${Math.round(newAvgPlays)} прослушиваний в среднем`);
  console.log(`   Улучшение: +${Math.round((newAvgPlays / oldAvgPlays - 1) * 100)}%`);
  console.log('\n✅ Теперь на главной странице ПОПУЛЯРНАЯ музыка!');
  console.log('=' .repeat(80));
  
  process.exit(0);
}

demonstrateSorting();

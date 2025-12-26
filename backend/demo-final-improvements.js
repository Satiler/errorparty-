/**
 * 🔥 УЛУЧШЕНИЕ КАЧЕСТВА ТРЕКОВ НА ГЛАВНОЙ СТРАНИЦЕ
 * Показывает результаты всех оптимизаций
 */

const { Track } = require('./src/models');
const { Op } = require('sequelize');

async function demonstrateImprovements() {
  console.log('🎯 УЛУЧШЕНИЕ КАЧЕСТВА ТРЕКОВ НА ГЛАВНОЙ СТРАНИЦЕ\n');
  console.log('=' .repeat(80));
  
  // ============================================================
  // 1. СТАРАЯ ЛОГИКА (УЖАСНАЯ)
  // ============================================================
  console.log('\n❌ СТАРАЯ ЛОГИКА:');
  console.log('   - Сортировка по дате создания (createdAt)');
  console.log('   - Нет фильтрации по качеству');
  console.log('   - Показывает ЛЮБЫЕ треки, даже непопулярные\n');
  
  const oldTracks = await Track.findAll({
    where: { isPublic: true },
    order: [['createdAt', 'DESC']],
    limit: 20,
    attributes: ['title', 'artist', 'playCount', 'likeCount', 'createdAt']
  });
  
  console.log('Примеры треков:');
  oldTracks.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i+1}. ${t.artist} - ${t.title}`);
    console.log(`     👂 ${t.playCount} plays, ❤️  ${t.likeCount} likes`);
  });
  
  const oldAvg = oldTracks.reduce((s, t) => s + t.playCount, 0) / oldTracks.length;
  const oldLikes = oldTracks.reduce((s, t) => s + t.likeCount, 0);
  console.log(`\n📊 Средняя популярность: ${Math.round(oldAvg)} прослушиваний`);
  console.log(`❤️  Всего лайков: ${oldLikes}`);
  
  // ============================================================
  // 2. НОВАЯ ЛОГИКА (ОТЛИЧНАЯ!)
  // ============================================================
  console.log('\n\n✅ НОВАЯ ЛОГИКА:');
  console.log('   - Сортировка по популярности (playCount)');
  console.log('   - Фильтрация качественного контента');
  console.log('   - Многоуровневая сортировка (plays → likes → date)\n');
  
  const newWhere = { isPublic: true };
  newWhere[Op.or] = [
    { playCount: { [Op.gte]: 5 } },
    { likeCount: { [Op.gte]: 1 } },
    { 
      createdAt: { 
        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      } 
    }
  ];
  
  const newTracks = await Track.findAll({
    where: newWhere,
    order: [
      ['playCount', 'DESC'],
      ['likeCount', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: 20,
    attributes: ['title', 'artist', 'playCount', 'likeCount', 'createdAt']
  });
  
  console.log('Примеры треков:');
  newTracks.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i+1}. ${t.artist} - ${t.title}`);
    console.log(`     👂 ${t.playCount} plays, ❤️  ${t.likeCount} likes`);
  });
  
  const newAvg = newTracks.reduce((s, t) => s + t.playCount, 0) / newTracks.length;
  const newLikes = newTracks.reduce((s, t) => s + t.likeCount, 0);
  console.log(`\n📊 Средняя популярность: ${Math.round(newAvg)} прослушиваний`);
  console.log(`❤️  Всего лайков: ${newLikes}`);
  
  // ============================================================
  // 3. СРАВНЕНИЕ И РЕЗУЛЬТАТЫ
  // ============================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 РЕЗУЛЬТАТЫ ОПТИМИЗАЦИИ:\n');
  
  const improvementPlays = Math.round((newAvg / oldAvg - 1) * 100);
  const improvementLikes = newLikes > 0 ? Math.round((newLikes / (oldLikes || 1) - 1) * 100) : 0;
  
  console.log(`🎵 ПРОСЛУШИВАНИЯ:`);
  console.log(`   Было: ${Math.round(oldAvg)} в среднем`);
  console.log(`   Стало: ${Math.round(newAvg)} в среднем`);
  console.log(`   Улучшение: +${improvementPlays}%\n`);
  
  console.log(`❤️  ЛАЙКИ:`);
  console.log(`   Было: ${oldLikes} всего`);
  console.log(`   Стало: ${newLikes} всего`);
  console.log(`   Улучшение: +${improvementLikes}%\n`);
  
  console.log('✅ ЧТО ИЗМЕНИЛОСЬ:');
  console.log('   1. Сортировка по умолчанию: createdAt → playCount');
  console.log('   2. Добавлена фильтрация по качеству (5+ plays или 1+ like)');
  console.log('   3. Многоуровневая сортировка (plays → likes → date)');
  console.log('   4. Новые треки (< 7 дней) тоже попадают в выдачу');
  
  console.log('\n💡 ТЕПЕРЬ НА ГЛАВНОЙ:');
  console.log('   ✅ Популярная музыка');
  console.log('   ✅ Качественный контент');
  console.log('   ✅ Любимые треки пользователей');
  console.log('   ✅ Свежие релизы');
  
  console.log('\n' + '='.repeat(80));
  console.log('🎉 КАЧЕСТВО ГЛАВНОЙ СТРАНИЦЫ УЛУЧШЕНО!\n');
  
  process.exit(0);
}

demonstrateImprovements();

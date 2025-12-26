// Проверка треков на главной странице
const { Track } = require('./src/models');

async function checkHomeTracks() {
  try {
    console.log('🔍 ПРОВЕРКА ТРЕКОВ НА ГЛАВНОЙ СТРАНИЦЕ\n');
    
    // Текущая логика - последние добавленные
    const currentTracks = await Track.findAll({
      where: { isPublic: true },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'title', 'artist', 'playCount', 'likeCount', 'source', 'createdAt']
    });
    
    console.log('❌ СЕЙЧАС НА ГЛАВНОЙ (по createdAt):');
    currentTracks.forEach((t, i) => {
      console.log(`${i+1}. ${t.artist} - ${t.title}`);
      console.log(`   👂 ${t.playCount} прослушиваний, ❤️  ${t.likeCount} лайков, 📅 ${t.createdAt.toLocaleDateString()}, 🎵 ${t.source}`);
    });
    
    // Рекомендуемая логика - популярные
    const popularTracks = await Track.findAll({
      where: { isPublic: true },
      order: [['playCount', 'DESC'], ['likeCount', 'DESC'], ['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'title', 'artist', 'playCount', 'likeCount', 'source', 'createdAt']
    });
    
    console.log('\n✅ ДОЛЖНО БЫТЬ (по популярности):');
    popularTracks.forEach((t, i) => {
      console.log(`${i+1}. ${t.artist} - ${t.title}`);
      console.log(`   👂 ${t.playCount} прослушиваний, ❤️  ${t.likeCount} лайков, 🎵 ${t.source}`);
    });
    
    // Сравнение
    console.log('\n📊 СРАВНЕНИЕ:');
    console.log(`Средняя популярность текущих треков: ${Math.round(currentTracks.reduce((sum, t) => sum + t.playCount, 0) / currentTracks.length)}`);
    console.log(`Средняя популярность популярных треков: ${Math.round(popularTracks.reduce((sum, t) => sum + t.playCount, 0) / popularTracks.length)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkHomeTracks();

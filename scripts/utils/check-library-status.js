// Быстрая проверка состояния музыкальной библиотеки
const { Track, Album, Artist, Genre } = require('./src/models');

async function checkStatus() {
  try {
    // Подсчёт треков
    const totalTracks = await Track.count();
    
    // Подсчёт по провайдерам
    const allTracks = await Track.findAll({ attributes: ['provider'], raw: true });
    const tracksByProvider = {};
    allTracks.forEach(t => {
      tracksByProvider[t.provider] = (tracksByProvider[t.provider] || 0) + 1;
    });

    // Последние добавленные
    const recentTracks = await Track.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'artist', 'createdAt']
    });

    // Статистика (некоторые таблицы могут не существовать)
    let totalArtists = 0;
    let totalAlbums = 0;
    let totalGenres = 0;
    
    try { totalArtists = await Artist.count(); } catch (e) {}
    try { totalAlbums = await Album.count(); } catch (e) {}
    try { totalGenres = await Genre.count(); } catch (e) {}

    console.log('\n🎵 СОСТОЯНИЕ МУЗЫКАЛЬНОЙ БИБЛИОТЕКИ');
    console.log('=====================================\n');
    
    console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`   Всего треков: ${totalTracks}`);
    console.log(`   Артистов: ${totalArtists}`);
    console.log(`   Альбомов: ${totalAlbums}`);
    console.log(`   Жанров: ${totalGenres}\n`);

    console.log(`📦 ПО ПРОВАЙДЕРАМ:`);
    Object.keys(tracksByProvider).forEach(provider => {
      console.log(`   ${provider}: ${tracksByProvider[provider]} треков`);
    });

    console.log(`\n🆕 ПОСЛЕДНИЕ ДОБАВЛЕННЫЕ:`);
    recentTracks.forEach((t, i) => {
      const date = new Date(t.createdAt).toLocaleString('ru-RU');
      console.log(`   ${i + 1}. [ID: ${t.id}] ${t.artist} - ${t.title}`);
      console.log(`      Добавлен: ${date}`);
    });

    console.log('\n✅ Проверка завершена!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkStatus();

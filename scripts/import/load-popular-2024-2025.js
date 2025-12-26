const { Sequelize } = require('sequelize');
const { Track, Album, Artist, Genre } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

const kissVKService = new KissVKLightweightService();

// Популярные треки 2024-2025
const POPULAR_SEARCHES = [
  // Мировые хиты 2024-2025
  'Sabrina Carpenter Espresso',
  'Sabrina Carpenter Please Please Please',
  'Billie Eilish Birds of a Feather',
  'Billie Eilish Lunch',
  'Benson Boone Beautiful Things',
  'Benson Boone Slow It Down',
  'Gracie Abrams I Love You Im Sorry',
  'Chappell Roan Good Luck Babe',
  'Ariana Grande Yes And',
  'Ariana Grande We Cant Be Friends',
  'Taylor Swift Fortnight',
  'Teddy Swims Lose Control',
  'Shaboozey A Bar Song',
  'Hozier Too Sweet',
  'Megan Thee Stallion Hiss',
  
  // Популярная музыка 2023
  'Miley Cyrus Flowers',
  'Doja Cat Paint The Town Red',
  'Taylor Swift Cruel Summer',
  'Taylor Swift Is It Over Now',
  'Olivia Rodrigo Vampire',
  'Olivia Rodrigo Get Him Back',
  'Tate McRae Greedy',
  'Rema Calm Down',
  
  // Русская музыка 2024-2025
  'Мот Когда исчезнет слово',
  'Макс Корж Малый повзрослел',
  'Элджей Sayonara',
  'Miyagi Andy Panda Kosandra',
  'Скриптонит Это любовь',
  'Дора Рабочий',
  'Люся Чеботина Солнце Монако',
  'Zivert Beverly Hills',
  
  // EDM и Dance
  'David Guetta Bebe Rexha Im Good',
  'Calvin Harris Ellie Goulding Miracle',
  'Fred Again Delilah',
  'Tiesto Lay Low',
  
  // Рэп и Hip-Hop
  'Drake Rich Baby Daddy',
  'Travis Scott Fe N',
  'Kendrick Lamar Not Like Us',
  'Metro Boomin Like That',
  'Nicki Minaj FTCU'
];

async function loadPopularTrack(searchQuery) {
  try {
    console.log(`\n🔍 Поиск: ${searchQuery}`);
    
    const results = await kissVKService.searchTracks(searchQuery);
    
    if (!results || !results.tracks || results.tracks.length === 0) {
      console.log(`   ⚠️  Не найдено треков`);
      return null;
    }
    
    // Берем первый трек (обычно самый релевантный)
    const firstTrack = results.tracks[0];
    console.log(`   ✅ Найдено: ${firstTrack.artist} - ${firstTrack.title}`);
    
    // Формируем составной VK ID
    const vkId = firstTrack.vk_id || `${firstTrack.vk_owner_id}_${firstTrack.vk_audio_id}`;
    
    // Проверяем, существует ли уже
    const existingTrack = await Track.findOne({
      where: {
        [Sequelize.Op.or]: [
          { vk_id: vkId },
          { vk_owner_id: firstTrack.vk_owner_id, file_path: firstTrack.file_path }
        ]
      }
    });
    
    if (existingTrack) {
      console.log(`   ⏭️  Трек уже существует (ID: ${existingTrack.id})`);
      return existingTrack;
    }
    
    // Получаем или создаем исполнителя
    let artist = await Artist.findOne({ where: { name: firstTrack.artist } });
    if (!artist) {
      artist = await Artist.create({
        name: firstTrack.artist,
        bio: `Артист: ${firstTrack.artist}`
      });
    }
    
    // Получаем или создаем альбом
    let album = null;
    if (firstTrack.album) {
      album = await Album.findOne({
        where: { title: firstTrack.album, artist_id: artist.id }
      });
      if (!album) {
        album = await Album.create({
          title: firstTrack.album,
          artist_id: artist.id,
          release_date: new Date()
        });
      }
    }
    
    // Создаем трек
    const newTrack = await Track.create({
      title: firstTrack.title,
      artist_id: artist.id,
      album_id: album ? album.id : null,
      duration: firstTrack.duration || 0,
      file_path: firstTrack.file_path,
      provider: 'kissvk',
      vk_id: vkId,
      vk_owner_id: firstTrack.vk_owner_id
    });
    
    console.log(`   💾 Сохранен трек ID: ${newTrack.id}`);
    return newTrack;
    
  } catch (error) {
    console.error(`   ❌ Ошибка для "${searchQuery}":`, error.message);
    return null;
  }
}

async function loadAllPopularTracks() {
  console.log('🚀 Начинаем загрузку популярных треков 2024-2025...\n');
  
  let loaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < POPULAR_SEARCHES.length; i++) {
    const query = POPULAR_SEARCHES[i];
    console.log(`[${i + 1}/${POPULAR_SEARCHES.length}]`);
    
    const result = await loadPopularTrack(query);
    
    if (result && result.id) {
      loaded++;
    } else if (result === null && !result) {
      failed++;
    } else {
      skipped++;
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Загрузка завершена:');
  console.log(`   📥 Новых треков: ${loaded}`);
  console.log(`   ⏭️  Пропущено (дубликаты): ${skipped}`);
  console.log(`   ❌ Ошибок: ${failed}`);
  
  // Проверяем итоговое количество
  const totalTracks = await Track.count();
  console.log(`\n📊 Всего треков в базе: ${totalTracks}`);
}

loadAllPopularTracks()
  .then(() => {
    console.log('\n🎉 Готово!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });

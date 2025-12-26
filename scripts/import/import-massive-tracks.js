const { Track, Album, sequelize } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

// Топ популярных запросов 2023-2025
const POPULAR_QUERIES = [
  // Мировые хиты 2024-2025
  'Sabrina Carpenter Espresso',
  'Billie Eilish Birds of a Feather',
  'Benson Boone Beautiful Things',
  'Teddy Swims Lose Control',
  'Ariana Grande eternal sunshine',
  'Dua Lipa Training Season',
  'Olivia Rodrigo vampire',
  'Taylor Swift Cruel Summer',
  'Tate McRae greedy',
  'Noah Kahan Stick Season',
  'Hozier Too Sweet',
  'Post Malone Fortnight',
  'Gracie Abrams That So True',
  'Chappell Roan Good Luck Babe',
  
  // Русская музыка
  'Скриптонит 2004',
  'Miyagi Minor',
  'Элджей Минимал',
  'Баста Сансара',
  'Markul Молодость',
  'HammAli Девочка с картинки',
  'NILETTO Любимка',
  'Дора Не звони',
  'Клава Кока Покинула чат',
  'Cream Soda Плачу на техно',
  
  // EDM и Dance
  'Calvin Harris Miracle',
  'David Guetta Crazy What Love Can Do',
  'Martin Garrix Animals',
  'Tiesto Lay Low',
  'Swedish House Mafia',
  
  // Рэп и хип-хоп
  'Travis Scott FE!N',
  'Drake Rich Baby Daddy',
  'Kendrick Lamar',
  'Kanye West Carnival',
  'Future Like That',
  
  // Попса и R&B
  'SZA Kill Bill',
  'The Weeknd Dancing in the Flames',
  'Bruno Mars Die With A Smile',
  'Rihanna Lift Me Up',
  'Beyonce Texas Hold Em'
];

const kissvk = new KissVKLightweightService();

async function importMassiveTracks() {
  console.log('🎵 МАССОВЫЙ ИМПОРТ ПОПУЛЯРНЫХ ТРЕКОВ 2023-2025');
  console.log('='.repeat(70));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < POPULAR_QUERIES.length; i++) {
    const query = POPULAR_QUERIES[i];
    console.log(`\n[${i + 1}/${POPULAR_QUERIES.length}] 🔍 ${query}`);
    
    try {
      // Поиск на KissVK
      const searchResults = await kissvk.searchTracks(query);
      
      if (searchResults.length === 0) {
        console.log('   ❌ Не найдено');
        errors++;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      console.log(`   ✅ Найдено: ${searchResults.length} треков`);

      // Импортируем до 10 треков из результатов
      const tracksToImport = searchResults.slice(0, 10);

      for (const track of tracksToImport) {
        try {
          // Проверяем существование
          const existing = await Track.findOne({
            where: {
              title: track.title,
              artist: track.artist
            }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Расшифровываем URL
          const decryptedTracks = await kissvk.decryptTracks([track]);
          
          if (decryptedTracks.length === 0 || !decryptedTracks[0].streamUrl) {
            errors++;
            continue;
          }

          const trackData = decryptedTracks[0];

          // Создаем/находим альбом
          let album = null;
          if (trackData.album) {
            [album] = await Album.findOrCreate({
              where: { title: trackData.album },
              defaults: {
                title: trackData.album,
                artist: trackData.artist,
                coverUrl: trackData.coverUrl || null
              }
            });
          }

          // Создаем трек
          await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            albumId: album ? album.id : null,
            duration: trackData.duration || 0,
            streamUrl: trackData.streamUrl,
            coverUrl: trackData.coverUrl || null,
            provider: 'kissvk',
            externalId: trackData.id,
            genre: trackData.genre || null,
            year: track.Data.year || 2024
          });

          console.log(`   💾 ${trackData.title}`);
          imported++;

          // Задержка
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (trackError) {
          errors++;
        }
      }

      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
      errors++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Пересборка плейлистов
  console.log('\n\n🔄 Пересборка плейлистов...');
  const { execSync } = require('child_process');
  try {
    execSync('node rebuild-playlists-modern.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Ошибка пересборки плейлистов:', e.message);
  }

  // Итоговая статистика
  const totalTracks = await Track.count();
  
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(70));
  console.log(`✅ Импортировано: ${imported}`);
  console.log(`⏭️  Пропущено (дубликаты): ${skipped}`);
  console.log(`❌ Ошибки: ${errors}`);
  console.log(`📀 Всего треков в базе: ${totalTracks}`);
  console.log('='.repeat(70));

  process.exit(0);
}

importMassiveTracks().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

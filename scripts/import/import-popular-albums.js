const { Track, Album, sequelize } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

// Популярные исполнители и альбомы 2023-2025
const POPULAR_ALBUMS = [
  // 2025 Хиты
  { artist: 'Taylor Swift', album: 'The Tortured Poets Department', year: 2024 },
  { artist: 'Billie Eilish', album: 'HIT ME HARD AND SOFT', year: 2024 },
  { artist: 'Ariana Grande', album: 'eternal sunshine', year: 2024 },
  { artist: 'Olivia Rodrigo', album: 'GUTS', year: 2023 },
  { artist: 'Sabrina Carpenter', album: 'Short n Sweet', year: 2024 },
  { artist: 'Charli XCX', album: 'BRAT', year: 2024 },
  { artist: 'Chappell Roan', album: 'The Rise and Fall of a Midwest Princess', year: 2023 },
  
  // Русские хиты
  { artist: 'Скриптонит', album: '2004', year: 2024 },
  { artist: 'Miyagi', album: 'Yamakasi', year: 2023 },
  { artist: 'Элджей', album: 'Sayonara Boy', year: 2023 },
  { artist: 'Баста', album: 'Баста 5', year: 2023 },
  { artist: 'Markul', album: 'Карма', year: 2024 },
  { artist: 'Дора', album: 'Не моя вина', year: 2024 },
  { artist: 'Клава Кока', album: 'Малиновый свет', year: 2023 },
  
  // Зарубежные хиты 2024
  { artist: 'Dua Lipa', album: 'Radical Optimism', year: 2024 },
  { artist: 'The Weeknd', album: 'Hurry Up Tomorrow', year: 2024 },
  { artist: 'Travis Scott', album: 'Utopia', year: 2023 },
  { artist: 'Drake', album: 'For All The Dogs', year: 2023 },
  { artist: 'SZA', album: 'SOS', year: 2023 },
  { artist: 'Bad Bunny', album: 'nadie sabe lo que va a pasar mañana', year: 2023 },
  
  // EDM и Dance
  { artist: 'Calvin Harris', album: 'Funk Wav Bounces Vol. 3', year: 2024 },
  { artist: 'David Guetta', album: '7', year: 2023 },
  { artist: 'Tiesto', album: 'Drive', year: 2023 },
  { artist: 'Martin Garrix', album: 'Sentio', year: 2023 },
  
  // Рок и альтернатива
  { artist: 'Imagine Dragons', album: 'Loom', year: 2024 },
  { artist: 'Arctic Monkeys', album: 'The Car', year: 2023 },
  { artist: 'Twenty One Pilots', album: 'Clancy', year: 2024 },
  { artist: 'Linkin Park', album: 'Meteora 20', year: 2023 }
];

// Топ треки по исполнителям
const TOP_ARTISTS_TRACKS = [
  'Taylor Swift - Anti-Hero',
  'Billie Eilish - LUNCH',
  'Ariana Grande - yes and',
  'Olivia Rodrigo - vampire',
  'Sabrina Carpenter - Espresso',
  'The Weeknd - Blinding Lights',
  'Drake - Rich Baby Daddy',
  'Travis Scott - FE!N',
  'Bad Bunny - Monaco',
  'Dua Lipa - Houdini',
  'SZA - Kill Bill',
  'Metro Boomin - Creepin',
  'Joji - Glimpse of Us',
  'Tate McRae - greedy',
  'Benson Boone - Beautiful Things',
  'Teddy Swims - Lose Control',
  'Noah Kahan - Stick Season',
  'Hozier - Too Sweet',
  'Скриптонит - Это любовь',
  'Miyagi - Minor',
  'Элджей - Розовое вино',
  'Баста - Сансара',
  'Markul - Ты моя',
  'Дора - Не звони',
  'Клава Кока - Покинула чат',
  'HammAli - Девочка с картинки',
  'NILETTO - Любимка',
  'Монеточка - Каждый раз',
  'Cream Soda - Никаких больше вечеринок',
  'Rauf Faik - Детство'
];

const kissvk = new KissVKLightweightService();

async function importPopularMusic() {
  console.log('🎵 ИМПОРТ ПОПУЛЯРНОЙ МУЗЫКИ 2023-2025');
  console.log('='.repeat(70));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Импортируем топ треки
  console.log('\n📀 ИМПОРТ ТОПОВЫХ ТРЕКОВ\n');
  
  for (let i = 0; i < TOP_ARTISTS_TRACKS.length; i++) {
    const query = TOP_ARTISTS_TRACKS[i];
    console.log(`\n[${i + 1}/${TOP_ARTISTS_TRACKS.length}] 🔍 ${query}`);
    
    try {
      // Поиск на KissVK
      const searchResults = await kissvk.searchTracks(query);
      
      if (searchResults.length === 0) {
        console.log('   ❌ Не найдено');
        errors++;
        continue;
      }

      // Берем первый результат
      const firstTrack = searchResults[0];
      console.log(`   ✅ Найдено: ${firstTrack.title} - ${firstTrack.artist}`);

      // Проверяем, есть ли уже такой трек
      const existing = await Track.findOne({
        where: {
          title: firstTrack.title,
          artist: firstTrack.artist
        }
      });

      if (existing) {
        console.log('   ⏭️  Уже существует');
        skipped++;
        continue;
      }

      // Расшифровываем URL
      const decryptedTracks = await kissvk.decryptTracks([firstTrack]);
      
      if (decryptedTracks.length === 0 || !decryptedTracks[0].streamUrl) {
        console.log('   ❌ Не удалось расшифровать URL');
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
        year: trackData.year || null
      });

      console.log('   💾 Сохранено');
      imported++;

      // Задержка для избежания блокировки
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
      errors++;
    }
  }

  // Импортируем треки из альбомов
  console.log('\n\n📀 ИМПОРТ ТРЕКОВ ИЗ ПОПУЛЯРНЫХ АЛЬБОМОВ\n');
  
  for (let i = 0; i < POPULAR_ALBUMS.length; i++) {
    const albumInfo = POPULAR_ALBUMS[i];
    const query = `${albumInfo.artist} ${albumInfo.album}`;
    
    console.log(`\n[${i + 1}/${POPULAR_ALBUMS.length}] 🔍 ${query}`);
    
    try {
      // Поиск на KissVK
      const searchResults = await kissvk.searchTracks(query);
      
      if (searchResults.length === 0) {
        console.log('   ❌ Не найдено');
        errors++;
        continue;
      }

      console.log(`   ✅ Найдено треков: ${searchResults.length}`);

      // Импортируем первые 5 треков из результатов
      const tracksToImport = searchResults.slice(0, 5);

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
            console.log(`   ⏭️  ${track.title} - уже существует`);
            skipped++;
            continue;
          }

          // Расшифровываем URL
          const decryptedTracks = await kissvk.decryptTracks([track]);
          
          if (decryptedTracks.length === 0 || !decryptedTracks[0].streamUrl) {
            console.log(`   ❌ ${track.title} - не удалось расшифровать`);
            errors++;
            continue;
          }

          const trackData = decryptedTracks[0];

          // Создаем/находим альбом
          let album = null;
          if (albumInfo.album) {
            [album] = await Album.findOrCreate({
              where: { title: albumInfo.album },
              defaults: {
                title: albumInfo.album,
                artist: albumInfo.artist,
                coverUrl: trackData.coverUrl || null,
                year: albumInfo.year
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
            year: albumInfo.year
          });

          console.log(`   💾 ${trackData.title}`);
          imported++;

          // Задержка
          await new Promise(resolve => setTimeout(resolve, 800));

        } catch (trackError) {
          console.error(`   ❌ ${track.title}: ${trackError.message}`);
          errors++;
        }
      }

      // Задержка между альбомами
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
      errors++;
    }
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

importPopularMusic().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

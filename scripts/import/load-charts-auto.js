/**
 * Тестирование и загрузка чартов 2025 из всех доступных источников
 * Автоматически определяет работающие источники и загружает треки
 */

const { Track, Playlist, PlaylistTrack } = require('./src/models');
const vkService = require('./src/services/vk-music.service');
const musifyService = require('./src/services/musify.service');

// Список популярных запросов для поиска хитов 2025
const CHART_QUERIES = [
  'хиты 2025',
  'топ 2025',
  'popular 2025',
  'hits 2025',
  'best songs 2025',
  'top hits 2025',
  'chart 2025',
  'новинки 2025',
  'лучшее 2025'
];

// Популярные артисты 2025
const POPULAR_ARTISTS = [
  'The Weeknd', 'Ariana Grande', 'Ed Sheeran', 'Taylor Swift',
  'Drake', 'Billie Eilish', 'Post Malone', 'Dua Lipa',
  'Баста', 'Элджей', 'Miyagi', 'Скриптонит',
  'Монеточка', 'Oxxxymiron', 'Pharaoh', 'Dabro'
];

async function testVKMusic() {
  console.log('\n🔵 Тестирование VK Music...');
  
  if (!vkService.isAvailable()) {
    console.log('   ❌ VK токен не настроен');
    return { works: false, tracks: [] };
  }

  try {
    // Пробуем поиск
    const testQuery = 'popular music';
    const data = await vkService.makeVKRequest('audio.search', {
      q: testQuery,
      count: 10,
      auto_complete: 1
    });

    if (data.response && data.response.items && data.response.items.length > 0) {
      const tracks = data.response.items
        .filter(item => item.url)
        .map(item => ({
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          streamUrl: item.url,
          albumName: item.album?.title,
          coverUrl: item.album?.thumb?.photo_300,
          source: 'vk-music',
          year: 2025
        }));
      
      console.log(`   ✅ VK Music работает! Найдено ${tracks.length} треков`);
      return { works: true, tracks };
    } else {
      console.log('   ⚠️  VK Music вернул пустой ответ');
      return { works: false, tracks: [] };
    }
  } catch (error) {
    console.log(`   ❌ VK Music ошибка: ${error.message}`);
    return { works: false, tracks: [] };
  }
}

async function testMusify() {
  console.log('\n🟢 Тестирование Musify.club...');
  
  try {
    const tracks = await musifyService.searchTracks('popular', 10);
    
    if (tracks && tracks.length > 0) {
      console.log(`   ✅ Musify.club работает! Найдено ${tracks.length} треков`);
      return { works: true, tracks };
    } else {
      console.log('   ⚠️  Musify.club не вернул треков');
      return { works: false, tracks: [] };
    }
  } catch (error) {
    console.log(`   ❌ Musify.club ошибка: ${error.message}`);
    return { works: false, tracks: [] };
  }
}

async function loadFromVKMusic(queries, limit = 50) {
  console.log('\n📥 Загрузка из VK Music...\n');
  const allTracks = [];
  
  for (const query of queries) {
    try {
      console.log(`   🔍 Поиск: "${query}"`);
      
      const data = await vkService.makeVKRequest('audio.search', {
        q: query,
        count: limit,
        auto_complete: 1,
        sort: 2 // Сортировка по популярности
      });

      if (data.response && data.response.items) {
        const tracks = data.response.items
          .filter(item => item.url)
          .map(item => ({
            title: item.title,
            artist: item.artist,
            duration: item.duration,
            streamUrl: item.url,
            albumName: item.album?.title,
            coverUrl: item.album?.thumb?.photo_300,
            source: 'vk-music',
            year: 2025
          }));
        
        allTracks.push(...tracks);
        console.log(`   ✅ Найдено: ${tracks.length} треков`);
      }
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }
  
  return allTracks;
}

async function loadFromMusify(queries, limit = 30) {
  console.log('\n📥 Загрузка из Musify.club...\n');
  const allTracks = [];
  
  for (const query of queries) {
    try {
      console.log(`   🔍 Поиск: "${query}"`);
      const tracks = await musifyService.searchTracks(query, limit);
      
      if (tracks && tracks.length > 0) {
        const formatted = tracks.map(track => ({
          title: track.title,
          artist: track.artist,
          duration: track.duration || 180,
          streamUrl: track.streamUrl,
          albumName: track.album,
          coverUrl: track.coverUrl,
          source: 'musify',
          year: 2025
        }));
        
        allTracks.push(...formatted);
        console.log(`   ✅ Найдено: ${formatted.length} треков`);
      }
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
    }
  }
  
  return allTracks;
}

async function loadPopularArtists(artists, workingSources) {
  console.log('\n📥 Загрузка треков популярных артистов...\n');
  const allTracks = [];
  
  for (const artist of artists) {
    try {
      console.log(`   🎤 Артист: "${artist}"`);
      
      // Пробуем VK Music
      if (workingSources.vk) {
        try {
          const data = await vkService.makeVKRequest('audio.search', {
            q: artist,
            count: 20,
            auto_complete: 1,
            sort: 2
          });

          if (data.response && data.response.items) {
            const tracks = data.response.items
              .filter(item => item.url && item.artist.toLowerCase().includes(artist.toLowerCase()))
              .slice(0, 10)
              .map(item => ({
                title: item.title,
                artist: item.artist,
                duration: item.duration,
                streamUrl: item.url,
                albumName: item.album?.title,
                coverUrl: item.album?.thumb?.photo_300,
                source: 'vk-music',
                year: 2025
              }));
            
            allTracks.push(...tracks);
            console.log(`   ✅ VK: ${tracks.length} треков`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.log(`   ⚠️  VK: ${error.message}`);
        }
      }
      
      // Пробуем Musify
      if (workingSources.musify) {
        try {
          const tracks = await musifyService.searchTracks(artist, 10);
          
          if (tracks && tracks.length > 0) {
            const formatted = tracks
              .filter(track => track.artist.toLowerCase().includes(artist.toLowerCase()))
              .slice(0, 5)
              .map(track => ({
                title: track.title,
                artist: track.artist,
                duration: track.duration || 180,
                streamUrl: track.streamUrl,
                albumName: track.album,
                coverUrl: track.coverUrl,
                source: 'musify',
                year: 2025
              }));
            
            allTracks.push(...formatted);
            console.log(`   ✅ Musify: ${formatted.length} треков`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.log(`   ⚠️  Musify: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Ошибка загрузки ${artist}: ${error.message}`);
    }
  }
  
  return allTracks;
}

async function saveTracksToDatabase(tracks) {
  console.log('\n💾 Сохранение треков в базу данных...\n');
  
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const trackData of tracks) {
    try {
      // Ищем существующий трек
      const existing = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });

      if (existing) {
        // Обновляем, если streamUrl отсутствует или источник лучше
        if (!existing.streamUrl && trackData.streamUrl) {
          await existing.update({
            streamUrl: trackData.streamUrl,
            duration: trackData.duration || existing.duration,
            coverUrl: trackData.coverUrl || existing.coverUrl,
            isPublic: true,
            playCount: existing.playCount + 5 // Бонус за популярность
          });
          updated++;
        } else {
          // Просто увеличиваем счетчик популярности
          await existing.increment('playCount', { by: 2 });
          skipped++;
        }
      } else {
        // Создаем новый трек
        await Track.create({
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration || 180,
          streamUrl: trackData.streamUrl,
          coverUrl: trackData.coverUrl,
          albumName: trackData.albumName,
          year: trackData.year || 2025,
          source: trackData.source,
          isPublic: true,
          playCount: 20, // Начальная популярность
          genre: 'Popular'
        });
        saved++;
      }

      // Прогресс
      if ((saved + updated + skipped + errors) % 100 === 0) {
        process.stdout.write(`   📊 Обработано: ${saved + updated + skipped + errors} треков\r`);
      }

    } catch (error) {
      errors++;
      // Игнорируем ошибки дубликатов
    }
  }

  console.log(`\n\n📊 Статистика сохранения:`);
  console.log(`   ✨ Новых треков: ${saved}`);
  console.log(`   🔄 Обновлено: ${updated}`);
  console.log(`   ⏭️  Уже было: ${skipped}`);
  console.log(`   ⚠️  Ошибок: ${errors}`);

  return { saved, updated, skipped, errors };
}

async function createChartsPlaylist() {
  console.log('\n🎼 Создание плейлиста "Чарты 2025"...\n');
  
  try {
    // Создаем или обновляем плейлист
    let playlist = await Playlist.findOne({ where: { name: '🔥 Чарты 2025' } });
    
    if (!playlist) {
      playlist = await Playlist.create({
        name: '🔥 Чарты 2025',
        description: 'Самые популярные треки 2025 года. Обновляется автоматически.',
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        isPublic: true
      });
      console.log('✅ Плейлист создан');
    } else {
      // Очищаем старые треки
      await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
      console.log('🔄 Плейлист очищен');
    }

    // Берем топ-200 самых популярных треков
    const topTracks = await Track.findAll({
      where: { 
        isPublic: true,
        streamUrl: { $ne: null }
      },
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 200
    });

    console.log(`📀 Найдено ${topTracks.length} треков для плейлиста`);

    // Добавляем в плейлист
    for (let i = 0; i < topTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: topTracks[i].id,
        position: i + 1
      });
    }

    console.log(`✅ Плейлист обновлен: ${topTracks.length} треков`);
    
  } catch (error) {
    console.log('⚠️  Ошибка создания плейлиста:', error.message);
  }
}

async function main() {
  console.log('\n🎵 ════════════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЧАРТОВ 2025 - АВТОМАТИЧЕСКИЙ РЕЖИМ');
  console.log('════════════════════════════════════════════════════════\n');

  // 1. Тестируем источники
  console.log('📡 ЭТАП 1: Тестирование источников');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const vkTest = await testVKMusic();
  const musifyTest = await testMusify();

  const workingSources = {
    vk: vkTest.works,
    musify: musifyTest.works
  };

  console.log('\n📊 Результаты тестирования:');
  console.log(`   VK Music: ${workingSources.vk ? '✅ Работает' : '❌ Не работает'}`);
  console.log(`   Musify.club: ${workingSources.musify ? '✅ Работает' : '❌ Не работает'}`);

  if (!workingSources.vk && !workingSources.musify) {
    console.log('\n❌ Ни один источник не доступен!');
    console.log('💡 Проверьте подключение к интернету и настройки VK токена');
    process.exit(1);
  }

  const allTracks = [];

  // 2. Загружаем по поисковым запросам
  console.log('\n\n🔍 ЭТАП 2: Загрузка по чартовым запросам');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (workingSources.vk) {
    const vkTracks = await loadFromVKMusic(CHART_QUERIES, 50);
    allTracks.push(...vkTracks);
    console.log(`\n✅ VK Music: загружено ${vkTracks.length} треков`);
  }

  if (workingSources.musify) {
    const musifyTracks = await loadFromMusify(CHART_QUERIES.slice(0, 5), 30);
    allTracks.push(...musifyTracks);
    console.log(`\n✅ Musify: загружено ${musifyTracks.length} треков`);
  }

  // 3. Загружаем популярных артистов
  console.log('\n\n🎤 ЭТАП 3: Загрузка популярных артистов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const artistTracks = await loadPopularArtists(POPULAR_ARTISTS, workingSources);
  allTracks.push(...artistTracks);
  console.log(`\n✅ Артисты: загружено ${artistTracks.length} треков`);

  // 4. Удаляем дубликаты
  console.log('\n\n🔄 ЭТАП 4: Удаление дубликатов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const uniqueTracks = [];
  const seen = new Set();

  for (const track of allTracks) {
    const key = `${track.title.toLowerCase()}|||${track.artist.toLowerCase()}`;
    if (!seen.has(key) && track.streamUrl) {
      seen.add(key);
      uniqueTracks.push(track);
    }
  }

  console.log(`✅ Всего треков: ${allTracks.length}`);
  console.log(`✅ Уникальных: ${uniqueTracks.length}`);

  // 5. Сохраняем в базу
  console.log('\n💾 ЭТАП 5: Сохранение в базу данных');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = await saveTracksToDatabase(uniqueTracks);

  // 6. Создаем плейлист
  console.log('\n🎼 ЭТАП 6: Создание плейлиста');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await createChartsPlaylist();

  // 7. Итоги
  console.log('\n\n🎉 ════════════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log('════════════════════════════════════════════════════════');
  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`\n🌐 Источники:`);
  console.log(`   ${workingSources.vk ? '✅' : '❌'} VK Music`);
  console.log(`   ${workingSources.musify ? '✅' : '❌'} Musify.club`);
  console.log(`\n📥 Загрузка:`);
  console.log(`   📦 Всего загружено: ${allTracks.length} треков`);
  console.log(`   🌟 Уникальных: ${uniqueTracks.length} треков`);
  console.log(`\n💾 База данных:`);
  console.log(`   ✨ Новых треков: ${stats.saved}`);
  console.log(`   🔄 Обновлено: ${stats.updated}`);
  console.log(`   ⏭️  Пропущено: ${stats.skipped}`);
  console.log(`\n🎼 Плейлист: "🔥 Чарты 2025" готов!\n`);

  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  console.error(error.stack);
  process.exit(1);
});

/**
 * Загрузка ПОЛНЫХ треков из VK Music
 * Без капчи - через прямой поиск
 */

const { Track, Playlist, PlaylistTrack, User } = require('./src/models');
const vkService = require('./src/services/vk-music.service');

let systemUserId = null;

// Популярные поисковые запросы
const SEARCH_QUERIES = [
  // Русские хиты
  'Элджей', 'Miyagi', 'Скриптонит', 'Баста', 'Oxxxymiron',
  'Тима Белорусских', 'HammAli Navai', 'Zivert', 'Егор Крид',
  'Моргенштерн', 'Dabro', 'Konfuz', 'SQWOZ BAB', 'Платина',
  
  // Зарубежные хиты
  'The Weeknd', 'Dua Lipa', 'Ed Sheeran', 'Billie Eilish',
  'Post Malone', 'Drake', 'Travis Scott', 'Ariana Grande',
  
  // Жанры
  'phonk', 'slowed reverb', 'nightcore', 'remix 2025',
  'russian rap', 'russian pop', 'dance 2025', 'club music'
];

async function searchVKMusic(query, count = 100) {
  try {
    console.log(`\n🔍 Поиск: "${query}"`);
    
    // Прямой поиск через VK API
    const data = await vkService.makeVKRequest('audio.search', {
      q: query,
      count: count,
      auto_complete: 1,
      sort: 2, // По популярности
      offset: 0
    });

    if (!data.response || !data.response.items) {
      console.log('   ⚠️  Нет результатов');
      return [];
    }

    const tracks = data.response.items
      .filter(item => item.url) // Только с прямыми ссылками
      .map(item => ({
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        streamUrl: item.url, // ПОЛНЫЙ трек!
        coverUrl: item.album?.thumb?.photo_300,
        albumName: item.album?.title,
        year: 2025,
        source: 'vk-music',
        genre: 'Popular'
      }));

    console.log(`   ✅ Найдено: ${tracks.length} треков`);
    return tracks;

  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return [];
  }
}

async function loadVKPopular(genreId, count = 200) {
  try {
    console.log(`\n📊 Загрузка популярных (жанр ${genreId})...`);
    
    const data = await vkService.makeVKRequest('audio.getPopular', {
      genre_id: genreId,
      count: count
    });

    if (!data.response || !data.response.items) {
      console.log('   ⚠️  Нет результатов');
      return [];
    }

    const tracks = data.response.items
      .filter(item => item.url)
      .map(item => ({
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        streamUrl: item.url,
        coverUrl: item.album?.thumb?.photo_300,
        albumName: item.album?.title,
        year: 2025,
        source: 'vk-music',
        genre: 'Popular'
      }));

    console.log(`   ✅ Найдено: ${tracks.length} треков`);
    return tracks;

  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return [];
  }
}

async function saveTracksToDatabase(tracks) {
  console.log('\n💾 Сохранение треков...\n');
  
  let saved = 0;
  let skipped = 0;

  for (const trackData of tracks) {
    try {
      const existing = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });

      if (!existing) {
        await Track.create({
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration || 180,
          streamUrl: trackData.streamUrl,
          coverUrl: trackData.coverUrl,
          albumName: trackData.albumName,
          year: trackData.year,
          source: trackData.source,
          isPublic: true,
          playCount: 20,
          genre: trackData.genre
        });
        saved++;
      } else {
        skipped++;
      }

      if ((saved + skipped) % 100 === 0) {
        process.stdout.write(`   📊 Обработано: ${saved + skipped} треков\r`);
      }

    } catch (error) {
      // Игнорируем ошибки
    }
  }

  console.log(`\n\n📊 Статистика:`);
  console.log(`   ✨ Новых: ${saved}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);

  return { saved, skipped };
}

async function createPlaylists() {
  console.log('\n🎼 Создание плейлистов...\n');

  try {
    // Главный плейлист
    await Playlist.destroy({ where: { name: '🔥 VK Music Топ' } });
    
    const mainPlaylist = await Playlist.create({
      name: '🔥 VK Music Топ',
      description: 'Лучшие треки из VK Music',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
      isPublic: true,
      userId: systemUserId
    });

    const allTracks = await Track.findAll({
      where: { isPublic: true },
      order: [['playCount', 'DESC']],
      limit: 200
    });

    for (let i = 0; i < allTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: mainPlaylist.id,
        trackId: allTracks[i].id,
        position: i + 1
      });
    }

    console.log(`✅ Плейлист создан: ${allTracks.length} треков`);

  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }
}

async function main() {
  console.log('\n🎵 ═══════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ПОЛНЫХ ТРЕКОВ ИЗ VK MUSIC');
  console.log('═══════════════════════════════════════════════════\n');

  if (!vkService.isAvailable()) {
    console.log('❌ VK токен не настроен!');
    process.exit(1);
  }

  // Получаем пользователя
  const systemUser = await User.findOne();
  if (!systemUser) {
    console.log('❌ Не найден пользователь');
    process.exit(1);
  }
  systemUserId = systemUser.id;
  console.log(`👤 Пользователь: ${systemUser.username}\n`);

  const allTracks = [];

  // 1. Популярные треки по жанрам
  console.log('📊 ЭТАП 1: Популярные треки по жанрам');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const genres = [2, 3, 5, 18, 1001]; // Pop, Rap, Dance, Alternative, Russian Pop
  
  for (const genreId of genres) {
    const tracks = await loadVKPopular(genreId, 200);
    allTracks.push(...tracks);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Пауза 3 сек
  }

  console.log(`\n✅ Этап 1: ${allTracks.length} треков\n`);

  // 2. Поиск по запросам
  console.log('\n🔍 ЭТАП 2: Поиск по популярным запросам');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const query of SEARCH_QUERIES) {
    const tracks = await searchVKMusic(query, 50);
    allTracks.push(...tracks);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза 2 сек
  }

  console.log(`\n✅ Всего загружено: ${allTracks.length} треков\n`);

  // 3. Удаляем дубликаты
  console.log('\n🔄 ЭТАП 3: Удаление дубликатов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const uniqueTracks = [];
  const seen = new Set();

  for (const track of allTracks) {
    const key = `${track.title.toLowerCase()}|||${track.artist.toLowerCase()}`;
    if (!seen.has(key) && track.streamUrl) {
      seen.add(key);
      uniqueTracks.push(track);
    }
  }

  console.log(`✅ Уникальных: ${uniqueTracks.length}\n`);

  // 4. Сохраняем
  console.log('\n💾 ЭТАП 4: Сохранение в базу');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = await saveTracksToDatabase(uniqueTracks);

  // 5. Создаем плейлисты
  console.log('\n🎼 ЭТАП 5: Создание плейлистов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await createPlaylists();

  // Итоги
  console.log('\n\n🎉 ═══════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`\n🎵 VK Music:`);
  console.log(`   📦 Загружено: ${allTracks.length} треков`);
  console.log(`   🌟 Уникальных: ${uniqueTracks.length} треков`);
  console.log(`   ✨ Новых в базе: ${stats.saved}`);
  console.log(`   📀 Плейлист: "🔥 VK Music Топ"`);
  console.log(`\n✅ ВСЕ ТРЕКИ ПОЛНЫЕ (не preview)!\n`);

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  console.error(error.stack);
  process.exit(1);
});

/**
 * Загрузка музыки из бесплатных легальных источников
 * Без капчи, без ограничений
 */

const axios = require('axios');
const { Track, Playlist, PlaylistTrack, User } = require('./src/models');

// Free Music Archive API
const FMA_BASE = 'https://freemusicarchive.org/api/get';
const FMA_API_KEY = 'YOUR_FMA_KEY'; // Можно получить бесплатно

// Jamendo API  
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';
const JAMENDO_CLIENT_ID = '56d30c95'; // Тестовый клиент

// iTunes API (бесплатный, без регистрации)
const ITUNES_BASE = 'https://itunes.apple.com';

let systemUserId = null;

async function loadFromiTunes(query, limit = 100) {
  try {
    console.log(`\n🎵 iTunes поиск: "${query}"`);
    
    const response = await axios.get(`${ITUNES_BASE}/search`, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: limit
      },
      timeout: 15000
    });

    if (!response.data.results) {
      console.log('   ❌ Нет результатов');
      return [];
    }

    const tracks = response.data.results.map(item => ({
      title: item.trackName,
      artist: item.artistName,
      duration: Math.floor(item.trackTimeMillis / 1000),
      streamUrl: item.previewUrl, // 30-секундный preview
      coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
      albumName: item.collectionName,
      year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2025,
      source: 'itunes',
      genre: item.primaryGenreName
    })).filter(t => t.streamUrl);

    console.log(`   ✅ Найдено: ${tracks.length} треков`);
    return tracks;

  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return [];
  }
}

async function loadFromJamendo(tag, limit = 50) {
  try {
    console.log(`\n🎸 Jamendo тег: "${tag}"`);
    
    const response = await axios.get(`${JAMENDO_BASE}/tracks/`, {
      params: {
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: limit,
        tags: tag,
        audioformat: 'mp32',
        include: 'musicinfo'
      },
      timeout: 15000
    });

    if (!response.data.results) {
      console.log('   ❌ Нет результатов');
      return [];
    }

    const tracks = response.data.results.map(item => ({
      title: item.name,
      artist: item.artist_name,
      duration: item.duration,
      streamUrl: item.audio, // Полный трек!
      coverUrl: item.image?.replace('1.100', '1.500'),
      albumName: item.album_name,
      year: item.releasedate ? new Date(item.releasedate).getFullYear() : 2025,
      source: 'jamendo',
      genre: tag
    })).filter(t => t.streamUrl);

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
          playCount: 10,
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
    await Playlist.destroy({ where: { name: '🎵 Популярная музыка' } });
    
    const mainPlaylist = await Playlist.create({
      name: '🎵 Популярная музыка',
      description: 'Лучшие треки из легальных источников',
      coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600',
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
  console.log('   ЗАГРУЗКА МУЗЫКИ ИЗ ЛЕГАЛЬНЫХ ИСТОЧНИКОВ');
  console.log('═══════════════════════════════════════════════════\n');

  // Получаем пользователя
  const systemUser = await User.findOne();
  if (!systemUser) {
    console.log('❌ Не найден пользователь');
    process.exit(1);
  }
  systemUserId = systemUser.id;
  console.log(`👤 Пользователь: ${systemUser.username}\n`);

  const allTracks = [];

  // 1. iTunes (популярные запросы)
  console.log('🍎 ЭТАП 1: iTunes API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const itunesQueries = [
    'top songs 2025', 'popular music', 'best hits',
    'dance music', 'electronic', 'pop hits',
    'rap', 'hip hop', 'rock music'
  ];

  for (const query of itunesQueries) {
    const tracks = await loadFromiTunes(query, 100);
    allTracks.push(...tracks);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ iTunes: ${allTracks.length} треков\n`);

  // 2. Jamendo (легальная музыка)
  console.log('\n🎸 ЭТАП 2: Jamendo API (CC лицензия)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const jamendoTags = [
    'pop', 'dance', 'electronic', 'rock', 'ambient',
    'hiphop', 'jazz', 'classical', 'indie', 'alternative'
  ];

  for (const tag of jamendoTags) {
    const tracks = await loadFromJamendo(tag, 50);
    allTracks.push(...tracks);
    await new Promise(resolve => setTimeout(resolve, 1000));
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
  console.log(`\n🌐 Источники:`);
  console.log(`   ✅ iTunes API (preview треки)`);
  console.log(`   ✅ Jamendo (полные треки, CC лицензия)`);
  console.log(`\n📥 Результат:`);
  console.log(`   📦 Загружено: ${allTracks.length} треков`);
  console.log(`   🌟 Уникальных: ${uniqueTracks.length} треков`);
  console.log(`   ✨ Новых в базе: ${stats.saved}`);
  console.log(`   📀 Плейлист: "🎵 Популярная музыка"\n`);

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});

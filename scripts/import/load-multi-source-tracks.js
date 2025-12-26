const axios = require('axios');
const { Sequelize } = require('sequelize');
const { Track, User, Playlist, PlaylistTrack } = require('./src/models');

/**
 * Загрузка треков из нескольких источников:
 * 1. theroyakash Music API (Apple Music превью)
 * 2. iTunes API (Apple Music превью, резервный)
 * 3. YouTube links (через theroyakash API)
 */

const MUSIC_API_BASE = 'https://theroyakashapis.herokuapp.com';
const ITUNES_API_BASE = 'https://itunes.apple.com';

// Популярные исполнители и треки 2025
const SEARCH_QUERIES = [
  // Русские исполнители
  'Элджей', 'Miyagi', 'Скриптонит', 'Баста', 'Oxxxymiron',
  'Тима Белорусских', 'Мот', 'Hammali Navai', 'Макс Корж',
  'Zivert', 'Моргенштерн', 'Cream Soda', 'HammAli Navai',
  
  // Международные хиты
  'The Weeknd', 'Dua Lipa', 'Ed Sheeran', 'Billie Eilish',
  'Drake', 'Post Malone', 'Ariana Grande', 'Taylor Swift',
  'Bad Bunny', 'Peso Pluma', 'Karol G', 'Shakira',
  
  // Популярные треки 2025
  'Flowers Miley Cyrus', 'Kill Bill SZA', 'Anti-Hero Taylor Swift',
  'Unholy Sam Smith', 'As It Was Harry Styles', 'Heat Waves',
  'Levitating Dua Lipa', 'Blinding Lights', 'Save Your Tears',
  
  // Жанры
  'phonk 2025', 'russian rap', 'latin hits', 'indie rock',
  'electronic dance', 'hip hop', 'pop hits 2025'
];

/**
 * Поиск трека через theroyakash Music API
 */
async function searchTheroyakash(query) {
  try {
    const searchTerm = encodeURIComponent(query.replace(/\s+/g, '+'));
    const response = await axios.get(
      `${MUSIC_API_BASE}/applemusic/v1?q=${searchTerm}`,
      { timeout: 10000 }
    );

    if (response.data && response.data.title) {
      return {
        title: response.data.title.replace(/ - Single| - EP| - Album/g, '').trim(),
        artist: response.data.artist_name || 'Unknown Artist',
        streamUrl: response.data.short_music_preview,
        artworkUrl: response.data.image_url?.replace('100x100', '600x600') || null,
        source: 'theroyakash-apple',
        duration: 30 // Apple Music preview
      };
    }
    return null;
  } catch (error) {
    console.log(`      ⚠️  theroyakash API error: ${error.message}`);
    return null;
  }
}

/**
 * Поиск трека через iTunes API (резервный)
 */
async function searchITunes(query) {
  try {
    const response = await axios.get(`${ITUNES_API_BASE}/search`, {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: 1,
        country: 'US'
      },
      timeout: 10000
    });

    if (response.data.results && response.data.results.length > 0) {
      const track = response.data.results[0];
      return {
        title: track.trackName,
        artist: track.artistName,
        streamUrl: track.previewUrl,
        artworkUrl: track.artworkUrl100?.replace('100x100', '600x600') || null,
        source: 'itunes',
        duration: 30
      };
    }
    return null;
  } catch (error) {
    console.log(`      ⚠️  iTunes API error: ${error.message}`);
    return null;
  }
}

/**
 * Поиск трека через несколько источников
 */
async function searchMultiSource(query) {
  console.log(`  🔍 Поиск: "${query}"`);
  
  // Пробуем theroyakash API
  let result = await searchTheroyakash(query);
  
  // Если не нашли, пробуем iTunes
  if (!result) {
    console.log(`      ⚠️  theroyakash не нашел, пробуем iTunes...`);
    result = await searchITunes(query);
  }
  
  if (result) {
    console.log(`      ✅ Найдено: ${result.artist} - ${result.title} (${result.source})`);
  } else {
    console.log(`      ❌ Не найдено в источниках`);
  }
  
  return result;
}

/**
 * Сохранить треки в базу данных
 */
async function saveTracksToDatabase(tracks, systemUserId) {
  console.log(`\n💾 Сохранение ${tracks.length} треков в базу данных...`);
  
  const savedTracks = [];
  
  for (const trackData of tracks) {
    try {
      // Проверяем, нет ли уже такого трека
      const existing = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });

      if (existing) {
        console.log(`  ⏭️  Пропускаем: ${trackData.artist} - ${trackData.title} (уже есть)`);
        savedTracks.push(existing);
        continue;
      }

      // Создаем новый трек
      const track = await Track.create({
        title: trackData.title,
        artist: trackData.artist,
        streamUrl: trackData.streamUrl,
        artworkUrl: trackData.artworkUrl,
        duration: trackData.duration,
        userId: systemUserId,
        playCount: Math.floor(Math.random() * 50) + 10, // 10-60 прослушиваний
        isPublic: true
      });

      console.log(`  ✅ Добавлен: ${track.artist} - ${track.title}`);
      savedTracks.push(track);
    } catch (error) {
      console.error(`  ❌ Ошибка сохранения: ${trackData.title} - ${error.message}`);
    }
  }

  return savedTracks;
}

/**
 * Создать плейлисты из треков
 */
async function createPlaylists(tracks, systemUserId) {
  console.log(`\n🎵 Создание плейлистов...`);

  // Плейлист "Топ чарт 2025"
  const topPlaylist = await Playlist.findOrCreate({
    where: { name: '🔥 Топ чарт 2025', userId: systemUserId },
    defaults: {
      name: '🔥 Топ чарт 2025',
      description: 'Самые популярные треки 2025 года',
      userId: systemUserId,
      isPublic: true
    }
  });

  // Сортируем треки по playCount
  const topTracks = tracks
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 50);

  for (let i = 0; i < topTracks.length; i++) {
    await PlaylistTrack.findOrCreate({
      where: {
        playlistId: topPlaylist[0].id,
        trackId: topTracks[i].id
      },
      defaults: {
        playlistId: topPlaylist[0].id,
        trackId: topTracks[i].id,
        position: i
      }
    });
  }

  console.log(`  ✅ Плейлист "${topPlaylist[0].name}": ${topTracks.length} треков`);

  return [topPlaylist[0]];
}

/**
 * Главная функция
 */
async function main() {
  console.log('🎵 ════════════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ТРЕКОВ ИЗ НЕСКОЛЬКИХ ИСТОЧНИКОВ');
  console.log('════════════════════════════════════════════════════════\n');

  // Получаем системного пользователя
  const systemUser = await User.findOne({
    where: { username: 'SHATooN' }
  });

  if (!systemUser) {
    console.error('❌ Системный пользователь не найден');
    process.exit(1);
  }

  console.log(`👤 Пользователь: ${systemUser.username}\n`);

  // Шаг 1: Поиск треков
  console.log('🔍 ЭТАП 1: Поиск треков через API\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const foundTracks = [];
  
  for (const query of SEARCH_QUERIES) {
    const track = await searchMultiSource(query);
    if (track) {
      foundTracks.push(track);
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Найдено треков: ${foundTracks.length}/${SEARCH_QUERIES.length}\n`);

  if (foundTracks.length === 0) {
    console.error('❌ Не найдено ни одного трека');
    process.exit(1);
  }

  // Шаг 2: Сохранение в БД
  console.log('═══════════════════════════════════════════════════════\n');
  const savedTracks = await saveTracksToDatabase(foundTracks, systemUser.id);

  // Шаг 3: Создание плейлистов
  console.log('═══════════════════════════════════════════════════════\n');
  const playlists = await createPlaylists(savedTracks, systemUser.id);

  // Итоги
  console.log('\n🎯 ════════════════════════════════════════════════════════');
  console.log('   ИТОГИ ЗАГРУЗКИ');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`✅ Всего найдено: ${foundTracks.length} треков`);
  console.log(`✅ Сохранено в БД: ${savedTracks.length} треков`);
  console.log(`✅ Создано плейлистов: ${playlists.length}\n`);

  playlists.forEach(playlist => {
    console.log(`   📀 ${playlist.name}`);
  });

  console.log('\n════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

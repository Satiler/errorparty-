const axios = require('axios');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const { Track, User, Playlist, PlaylistTrack } = require('./src/models');

// Конфигурация
const VK_LOGIN = process.env.VK_LOGIN || ''; // Используй переменные окружения!
const VK_PASSWORD = process.env.VK_PASSWORD || ''; // Используй переменные окружения!

// Поисковые запросы для загрузки
const SEARCH_QUERIES = [
  // Русские исполнители
  'Элджей', 'Miyagi', 'Скриптонит', 'Баста', 'Oxxxymiron',
  'Тима Белорусских', 'Мот', 'Hammali Navai', 'Макс Корж',
  'Zivert', 'Моргенштерн', 'Cream Soda', 'HammAli Navai',
  
  // Западные хиты 2025
  'The Weeknd', 'Dua Lipa', 'Ed Sheeran', 'Billie Eilish',
  'Drake', 'Post Malone', 'Ariana Grande', 'Taylor Swift',
  'Bad Bunny', 'Peso Pluma', 'Karol G', 'Shakira',
  
  // Топ треки 2025
  'Flowers Miley Cyrus', 'Kill Bill SZA', 'Anti-Hero Taylor Swift',
  'Unholy Sam Smith', 'As It Was Harry Styles', 'Heat Waves',
  'Levitating Dua Lipa', 'Blinding Lights', 'Save Your Tears',
  
  // Жанры
  'phonk 2025', 'russian rap 2025', 'reggaeton 2025',
  'rock 2025', 'electronic dance 2025', 'pop 2025'
];

let vkToken = null;
let vkUserAgent = null;

/**
 * Получить VK Audio токен через Docker контейнер с Python
 */
async function getVKToken() {
  console.log('🔑 Получение VK Audio токена...');
  
  try {
    const { stdout } = await execAsync(`docker run --rm vk-token-getter "${VK_LOGIN}" "${VK_PASSWORD}"`);
    const result = JSON.parse(stdout);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get VK token');
    }
    
    console.log('✅ VK токен получен');
    console.log('   User-Agent:', result.user_agent);
    
    return {
      token: result.token,
      userAgent: result.user_agent
    };
  } catch (error) {
    console.error('❌ Ошибка получения токена:', error.message);
    throw error;
  }
}

/**
 * Поиск треков в VK Music
 */
async function searchVKMusic(query, count = 50) {
  try {
    const response = await axios.get('https://api.vk.com/method/audio.search', {
      params: {
        q: query,
        access_token: vkToken,
        v: '5.131',
        count: count,
        sort: 2 // По популярности
      },
      headers: {
        'User-Agent': vkUserAgent
      },
      timeout: 15000
    });

    if (response.data.error) {
      console.error(`   ⚠️  VK API error: ${response.data.error.error_msg}`);
      return [];
    }

    const items = response.data.response?.items || [];
    
    return items
      .filter(track => track.url && !track.url.includes('audio_api_unavailable'))
      .map(track => ({
        title: track.title,
        artist: track.artist,
        streamUrl: track.url,
        duration: track.duration,
        artworkUrl: track.album?.thumb?.photo_600 || null,
        source: 'vk',
        playCount: Math.floor(Math.random() * 50) + 10
      }));
  } catch (error) {
    console.error(`   ⚠️  Ошибка поиска "${query}":`, error.message);
    return [];
  }
}

/**
 * Получить популярные треки VK
 */
async function getVKPopular(count = 100) {
  try {
    const response = await axios.get('https://api.vk.com/method/audio.getPopular', {
      params: {
        access_token: vkToken,
        v: '5.131',
        count: count
      },
      headers: {
        'User-Agent': vkUserAgent
      },
      timeout: 15000
    });

    if (response.data.error) {
      console.error(`   ⚠️  VK API error: ${response.data.error.error_msg}`);
      return [];
    }

    const items = response.data.response?.items || [];
    
    return items
      .filter(track => track.url && !track.url.includes('audio_api_unavailable'))
      .map(track => ({
        title: track.title,
        artist: track.artist,
        streamUrl: track.url,
        duration: track.duration,
        artworkUrl: track.album?.thumb?.photo_600 || null,
        source: 'vk-popular',
        playCount: Math.floor(Math.random() * 100) + 50
      }));
  } catch (error) {
    console.error(`   ⚠️  Ошибка получения популярных:`, error.message);
    return [];
  }
}

/**
 * Сохранить треки в БД
 */
async function saveTracksToDatabase(tracks, userId = 1) {
  const savedTracks = [];
  const uniqueTracks = new Map();

  // Дедупликация по artist + title
  for (const track of tracks) {
    const key = `${track.artist.toLowerCase()}-${track.title.toLowerCase()}`;
    if (!uniqueTracks.has(key)) {
      uniqueTracks.set(key, track);
    }
  }

  console.log(`\n💾 Сохранение ${uniqueTracks.size} уникальных треков в БД...`);

  for (const [key, track] of uniqueTracks) {
    try {
      // Проверяем существование трека
      const existing = await Track.findOne({
        where: {
          title: track.title,
          artist: track.artist
        }
      });

      if (existing) {
        console.log(`   ⏩  Пропускаем: ${track.artist} - ${track.title} (уже есть)`);
        savedTracks.push(existing);
        continue;
      }

      // Создаем новый трек
      const newTrack = await Track.create({
        title: track.title,
        artist: track.artist,
        streamUrl: track.streamUrl,
        artworkUrl: track.artworkUrl,
        duration: track.duration,
        source: track.source,
        playCount: track.playCount,
        userId: userId
      });

      console.log(`   ✅ Сохранен: ${track.artist} - ${track.title}`);
      savedTracks.push(newTrack);
    } catch (error) {
      console.error(`   ❌ Ошибка сохранения: ${track.artist} - ${track.title}:`, error.message);
    }
  }

  return savedTracks;
}

/**
 * Создать плейлисты
 */
async function createPlaylists(tracks, userId = 1) {
  console.log('\n🎵 Создание плейлистов...');

  // Топ чарт 2025 - топ 100 треков по playCount
  const topTracks = tracks
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 100);

  let playlist = await Playlist.findOne({
    where: { name: '🔥 Топ чарт 2025 (VK Music)' }
  });

  if (playlist) {
    await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
  } else {
    playlist = await Playlist.create({
      name: '🔥 Топ чарт 2025 (VK Music)',
      description: 'Самые популярные треки 2025 года из VK Music',
      userId: userId,
      isPublic: true,
      coverImageUrl: topTracks[0]?.artworkUrl || null
    });
  }

  for (let i = 0; i < topTracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist.id,
      trackId: topTracks[i].id,
      position: i
    });
  }

  console.log(`  ✅ Плейлист "🔥 Топ чарт 2025 (VK Music)": ${topTracks.length} треков`);

  return [playlist];
}

/**
 * Главная функция
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ТРЕКОВ ИЗ VK MUSIC (ПОЛНЫЕ ВЕРСИИ)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Получаем токен
  const tokenData = await getVKToken();
  vkToken = tokenData.token;
  vkUserAgent = tokenData.userAgent;

  const allTracks = [];

  // ЭТАП 1: Получаем популярные треки
  console.log('\n🔍 ЭТАП 1: Загрузка популярных треков\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('  🔍 Получение топ-100 популярных треков...');
  const popularTracks = await getVKPopular(100);
  console.log(`      ✅ Найдено: ${popularTracks.length} треков`);
  allTracks.push(...popularTracks);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // ЭТАП 2: Поиск по запросам
  console.log('\n🔍 ЭТАП 2: Поиск треков по запросам\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const query of SEARCH_QUERIES) {
    console.log(`  🔍 Поиск: "${query}"`);
    const tracks = await searchVKMusic(query, 20);
    
    if (tracks.length > 0) {
      console.log(`      ✅ Найдено: ${tracks.length} треков`);
      allTracks.push(...tracks);
    } else {
      console.log(`      ⚠️  Ничего не найдено`);
    }

    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Получаем пользователя
  const user = await User.findByPk(1);
  if (!user) {
    console.error('❌ Пользователь не найден');
    process.exit(1);
  }

  console.log(`👤 Пользователь: ${user.username}`);

  // Сохраняем треки
  const savedTracks = await saveTracksToDatabase(allTracks, user.id);

  // Создаем плейлисты
  const playlists = await createPlaylists(savedTracks, user.id);

  console.log('\n🎉 ═══════════════════════════════════════════════════════════════');
  console.log('   ИТОГИ ЗАГРУЗКИ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Всего найдено: ${allTracks.length} треков`);
  console.log(`✅ Сохранено в БД: ${savedTracks.length} треков`);
  console.log(`✅ Создано плейлистов: ${playlists.length}`);

  playlists.forEach(p => {
    console.log(`\n   📀 ${p.name}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Запуск
main().catch(error => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});

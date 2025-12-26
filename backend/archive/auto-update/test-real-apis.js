/**
 * Реальное тестирование системы автообновления с внешними API
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ============================================================================
// BILLBOARD CHARTS (без API ключа, парсинг HTML)
// ============================================================================

async function getBillboardHot100() {
  console.log('\n📊 Получение Billboard Hot 100...');
  
  try {
    const response = await axios.get('https://www.billboard.com/charts/hot-100/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const tracks = [];

    $('ul.o-chart-results-list-row').each((index, element) => {
      if (index >= 10) return false; // Только топ-10
      
      const title = $(element).find('h3#title-of-a-story').text().trim();
      const artist = $(element).find('span.c-label.a-no-trucate').text().trim();
      
      if (title && artist) {
        tracks.push({
          position: index + 1,
          title: title,
          artist: artist,
          source: 'Billboard Hot 100'
        });
      }
    });

    console.log(`✅ Получено ${tracks.length} треков из Billboard`);
    return tracks;
  } catch (error) {
    console.error(`❌ Ошибка Billboard API:`, error.message);
    return [];
  }
}

// ============================================================================
// SPOTIFY CHARTS (требует Client ID/Secret)
// ============================================================================

let spotifyToken = null;

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret || clientId.includes('your_')) {
    console.log('⚠️  Spotify credentials не настроены, пропускаем...');
    return null;
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    spotifyToken = response.data.access_token;
    console.log('✅ Spotify токен получен');
    return spotifyToken;
  } catch (error) {
    console.error('❌ Ошибка получения Spotify токена:', error.response?.data || error.message);
    return null;
  }
}

async function getSpotifyTopTracks() {
  console.log('\n🎵 Получение Spotify Top Tracks...');
  
  if (!spotifyToken) {
    await getSpotifyToken();
  }
  
  if (!spotifyToken) {
    console.log('⏩ Пропускаем Spotify (нет токена)');
    return [];
  }

  try {
    // Используем плейлист "Top 50 Global"
    const playlistId = '37i9dQZEVXbMDoHDwVN2tF';
    
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        },
        params: {
          limit: 10
        }
      }
    );

    const tracks = response.data.items.map((item, index) => ({
      position: index + 1,
      title: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      source: 'Spotify Top 50 Global',
      albumArt: item.track.album.images[0]?.url,
      previewUrl: item.track.preview_url
    }));

    console.log(`✅ Получено ${tracks.length} треков из Spotify`);
    return tracks;
  } catch (error) {
    console.error(`❌ Ошибка Spotify API:`, error.response?.data || error.message);
    return [];
  }
}

// ============================================================================
// ITUNES/APPLE MUSIC (публичный API, не требует ключа)
// ============================================================================

async function getItunesTopSongs() {
  console.log('\n🍎 Получение iTunes/Apple Music Top Songs...');
  
  try {
    const response = await axios.get(
      'https://itunes.apple.com/us/rss/topsongs/limit=10/json',
      { timeout: 15000 }
    );

    const tracks = response.data.feed.entry.map((entry, index) => ({
      position: index + 1,
      title: entry['im:name'].label,
      artist: entry['im:artist'].label,
      source: 'iTunes Top Songs',
      albumArt: entry['im:image'][2]?.label,
      price: entry['im:price']?.label
    }));

    console.log(`✅ Получено ${tracks.length} треков из iTunes`);
    return tracks;
  } catch (error) {
    console.error(`❌ Ошибка iTunes API:`, error.message);
    return [];
  }
}

// ============================================================================
// LAST.FM (бесплатный API ключ)
// ============================================================================

async function getLastFmTopTracks() {
  console.log('\n🎸 Получение Last.fm Top Tracks...');
  
  const apiKey = process.env.LASTFM_API_KEY;
  
  if (!apiKey || apiKey.includes('your_')) {
    console.log('⚠️  Last.fm API key не настроен, пропускаем...');
    return [];
  }

  try {
    const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'chart.gettoptracks',
        api_key: apiKey,
        format: 'json',
        limit: 10
      }
    });

    const tracks = response.data.tracks.track.map((track, index) => ({
      position: index + 1,
      title: track.name,
      artist: track.artist.name,
      source: 'Last.fm Global Top',
      playCount: track.playcount,
      listeners: track.listeners
    }));

    console.log(`✅ Получено ${tracks.length} треков из Last.fm`);
    return tracks;
  } catch (error) {
    console.error(`❌ Ошибка Last.fm API:`, error.message);
    return [];
  }
}

// ============================================================================
// АГРЕГАЦИЯ И АНАЛИЗ
// ============================================================================

function aggregateAndAnalyze(allTracks) {
  console.log('\n📊 АГРЕГАЦИЯ РЕЗУЛЬТАТОВ\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const trackMap = new Map();
  const sources = new Set();
  
  // Группировка по трекам
  for (const track of allTracks) {
    sources.add(track.source);
    const key = `${track.artist.toLowerCase()} - ${track.title.toLowerCase()}`;
    
    if (trackMap.has(key)) {
      const existing = trackMap.get(key);
      existing.sources.push(track.source);
      existing.totalScore += (11 - track.position) / 10; // Взвешивание по позиции
    } else {
      trackMap.set(key, {
        title: track.title,
        artist: track.artist,
        sources: [track.source],
        totalScore: (11 - track.position) / 10,
        firstPosition: track.position
      });
    }
  }
  
  // Сортировка по количеству источников и скору
  const aggregated = Array.from(trackMap.values())
    .sort((a, b) => {
      if (b.sources.length !== a.sources.length) {
        return b.sources.length - a.sources.length;
      }
      return b.totalScore - a.totalScore;
    });
  
  // Вывод результатов
  console.log(`📈 Источников данных: ${sources.size}`);
  sources.forEach(s => console.log(`   • ${s}`));
  
  console.log(`\n🎵 Всего уникальных треков: ${aggregated.length}`);
  console.log(`\n🏆 ТОП-10 ТРЕКОВ (по количеству источников):\n`);
  
  aggregated.slice(0, 10).forEach((track, index) => {
    console.log(`${index + 1}. ${track.artist} - ${track.title}`);
    console.log(`   Источников: ${track.sources.length} | Скор: ${track.totalScore.toFixed(2)}`);
    console.log(`   ${track.sources.join(', ')}\n`);
  });
  
  return aggregated;
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   РЕАЛЬНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ АВТООБНОВЛЕНИЯ            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const allTracks = [];
  
  // 1. Billboard (всегда доступен)
  try {
    const billboardTracks = await getBillboardHot100();
    allTracks.push(...billboardTracks);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Ошибка Billboard:', error.message);
  }
  
  // 2. iTunes (публичный API)
  try {
    const itunesTracks = await getItunesTopSongs();
    allTracks.push(...itunesTracks);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Ошибка iTunes:', error.message);
  }
  
  // 3. Spotify (требует ключи)
  try {
    const spotifyTracks = await getSpotifyTopTracks();
    allTracks.push(...spotifyTracks);
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Ошибка Spotify:', error.message);
  }
  
  // 4. Last.fm (требует бесплатный ключ)
  try {
    const lastfmTracks = await getLastFmTopTracks();
    allTracks.push(...lastfmTracks);
  } catch (error) {
    console.error('Ошибка Last.fm:', error.message);
  }
  
  // Анализ результатов
  if (allTracks.length > 0) {
    const aggregated = aggregateAndAnalyze(allTracks);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО: ${allTracks.length} треков обработано`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  } else {
    console.log('\n❌ Не удалось получить данные ни из одного источника');
    console.log('\n💡 Совет: Настройте API ключи в .env файле:');
    console.log('   SPOTIFY_CLIENT_ID=...');
    console.log('   SPOTIFY_CLIENT_SECRET=...');
    console.log('   LASTFM_API_KEY=... (получить на https://www.last.fm/api)\n');
  }
}

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { getBillboardHot100, getSpotifyTopTracks, getItunesTopSongs, getLastFmTopTracks };

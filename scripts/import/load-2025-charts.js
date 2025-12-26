/**
 * Загрузка чартов и популярной музыки 2025 года
 * Использует lmusic.kz, VK Music и iTunes Charts
 */

const axios = require('axios');
const { Track, Album, Playlist, PlaylistTrack } = require('./src/models');
const vkService = require('./src/services/vk-music.service');

const LMUSIC_BASE = 'https://lmusic.kz';

// Топ-альбомы 2025 с lmusic.kz
const CHART_PAGES_2025 = [
  { url: '/album/gromkie-novinki-dekabr-2025', name: 'Громкие новинки декабря 2025' },
  { url: '/album/zarubezhnye-novinki-2025', name: 'Зарубежные новинки 2025' },
  { url: '/album/top-100-zarubezhnykh-trekov-2025', name: 'ТОП 100 зарубежных треков 2025' },
  { url: '/album/luchshie-khity-2025-goda', name: 'Лучшие хиты 2025 года' },
  { url: '/album/novaya-muzyka-2025', name: 'Новая музыка 2025' },
  { url: '/album/top-50-trekov-2025', name: 'ТОП 50 треков 2025' },
  { url: '/album/khity-2025', name: 'Хиты 2025' },
  { url: '/album/populyarnaya-muzyka-2025', name: 'Популярная музыка 2025' },
  { url: '/album/top-pesni-2025', name: 'Топ песни 2025' },
  { url: '/album/muzykalnyye-khity-2025', name: 'Музыкальные хиты 2025' }
];

function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#039;': "'", '&apos;': "'", '&nbsp;': ' '
  };
  return text.replace(/&[#\w]+;/g, match => entities[match] || match);
}

async function fetchLMusicAlbum(pageInfo) {
  try {
    console.log(`\n🔍 Загрузка: ${pageInfo.name}`);
    const response = await axios.get(`${LMUSIC_BASE}${pageInfo.url}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000
    });

    const html = response.data;
    const tracks = [];
    
    // Парсим треки (несколько паттернов для надежности)
    const patterns = [
      /<div[^>]*class="[^"]*track[^"]*"[^>]*>.*?data-title="([^"]*)".*?data-artist="([^"]*)".*?data-url="([^"]*)".*?<\/div>/gs,
      /<a[^>]*class="[^"]*track-link[^"]*"[^>]*href="([^"]*)"[^>]*>.*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/span>.*?<span[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]*)<\/span>/gs,
      /data-track='{"title":"([^"]*)","artist":"([^"]*)","url":"([^"]*)"[^}]*}'/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const [, arg1, arg2, arg3] = match;
        let title, artist, streamUrl;
        
        if (pattern === patterns[1]) {
          streamUrl = arg1;
          title = arg2;
          artist = arg3;
        } else {
          title = arg1;
          artist = arg2;
          streamUrl = arg3;
        }
        
        if (streamUrl && !streamUrl.startsWith('http')) {
          streamUrl = LMUSIC_BASE + streamUrl;
        }
        
        if (title && artist && streamUrl) {
          tracks.push({
            title: decodeHtmlEntities(title.trim()),
            artist: decodeHtmlEntities(artist.trim()),
            streamUrl: streamUrl.trim(),
            albumTitle: pageInfo.name,
            source: 'lmusic'
          });
        }
      }
      
      if (tracks.length > 0) break;
    }
    
    console.log(`✅ Найдено ${tracks.length} треков`);
    return tracks;
    
  } catch (error) {
    console.log(`❌ Ошибка загрузки ${pageInfo.name}:`, error.message);
    return [];
  }
}

async function loadVKCharts2025() {
  try {
    if (!vkService.isAvailable()) {
      console.log('⚠️  VK Music недоступен (нет токена), пропускаем');
      return [];
    }

    console.log('\n📊 Загрузка чартов VK Music 2025...');
    
    // Жанры: Pop, Dance, Hip-Hop, Alternative, Russian Pop
    const genres = [2, 5, 3, 18, 1001];
    const code = `
      var result = [];
      ${genres.map(genreId => `
        var g${genreId} = API.audio.getPopular({"genre_id": ${genreId}, "count": 50});
        result.push(g${genreId}.items);
      `).join('\n')}
      return result;
    `;

    const data = await vkService.makeVKRequest('execute', { code });
    
    if (!data.response) {
      console.log('❌ Не удалось загрузить VK чарты');
      return [];
    }

    const tracks = [];
    for (const genreTracks of data.response) {
      if (Array.isArray(genreTracks)) {
        for (const item of genreTracks) {
          if (item.url) {
            tracks.push({
              title: item.title,
              artist: item.artist,
              duration: item.duration,
              streamUrl: item.url,
              albumTitle: item.album?.title || 'VK Charts 2025',
              coverUrl: item.album?.thumb?.photo_300,
              source: 'vk-music',
              year: 2025
            });
          }
        }
      }
    }
    
    console.log(`✅ VK: загружено ${tracks.length} треков из чартов`);
    return tracks;
    
  } catch (error) {
    console.log('❌ Ошибка VK чартов:', error.message);
    return [];
  }
}

async function saveTracksToDatabase(tracks, playlistName) {
  let saved = 0;
  let updated = 0;
  let skipped = 0;

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
        // Обновляем, если есть улучшения
        if (!existing.streamUrl && trackData.streamUrl) {
          await existing.update({
            streamUrl: trackData.streamUrl,
            duration: trackData.duration || existing.duration,
            coverUrl: trackData.coverUrl || existing.coverUrl,
            chartPosition: existing.chartPosition || 1,
            isPublic: true
          });
          updated++;
        } else {
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
          albumName: trackData.albumTitle,
          year: trackData.year || 2025,
          source: trackData.source || 'lmusic',
          isPublic: true,
          chartPosition: 1
        });
        saved++;
      }
    } catch (error) {
      console.log(`⚠️  Ошибка сохранения "${trackData.title}":`, error.message);
    }
  }

  console.log(`\n📊 Статистика сохранения:`);
  console.log(`   ✅ Новых треков: ${saved}`);
  console.log(`   🔄 Обновлено: ${updated}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);

  // Создаем/обновляем плейлист
  try {
    let playlist = await Playlist.findOne({ where: { name: playlistName } });
    
    if (!playlist) {
      playlist = await Playlist.create({
        name: playlistName,
        description: `Лучшие хиты и чарты 2025 года`,
        coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300',
        isPublic: true
      });
      console.log(`\n✅ Создан плейлист: ${playlistName}`);
    }

    // Добавляем треки в плейлист (первые 100)
    const playlistTracks = await Track.findAll({
      where: {
        title: tracks.slice(0, 100).map(t => t.title),
        artist: tracks.slice(0, 100).map(t => t.artist)
      },
      limit: 100
    });

    for (let i = 0; i < playlistTracks.length; i++) {
      await PlaylistTrack.findOrCreate({
        where: {
          playlistId: playlist.id,
          trackId: playlistTracks[i].id
        },
        defaults: {
          position: i + 1
        }
      });
    }

    console.log(`✅ Плейлист обновлен: ${playlistTracks.length} треков`);
    
  } catch (error) {
    console.log('⚠️  Ошибка создания плейлиста:', error.message);
  }

  return { saved, updated, skipped };
}

async function main() {
  console.log('\n🎵 ═══════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЧАРТОВ И ХИТОВ 2025 ГОДА');
  console.log('═══════════════════════════════════════════\n');

  const allTracks = [];

  // 1. Загружаем с lmusic.kz
  console.log('📀 ЭТАП 1: Загрузка с lmusic.kz');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const page of CHART_PAGES_2025) {
    const tracks = await fetchLMusicAlbum(page);
    allTracks.push(...tracks);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза между запросами
  }

  console.log(`\n✅ LMusic: загружено ${allTracks.length} треков`);

  // 2. Загружаем с VK Music
  console.log('\n📊 ЭТАП 2: Загрузка с VK Music');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const vkTracks = await loadVKCharts2025();
  allTracks.push(...vkTracks);

  console.log(`\n✅ Всего загружено: ${allTracks.length} треков`);

  // 3. Удаляем дубликаты
  console.log('\n🔄 ЭТАП 3: Удаление дубликатов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const uniqueTracks = [];
  const seen = new Set();
  
  for (const track of allTracks) {
    const key = `${track.title.toLowerCase()}|||${track.artist.toLowerCase()}`;
    if (!seen.has(key) && track.streamUrl) {
      seen.add(key);
      uniqueTracks.push(track);
    }
  }

  console.log(`✅ Уникальных треков: ${uniqueTracks.length}`);

  // 4. Сохраняем в базу
  console.log('\n💾 ЭТАП 4: Сохранение в базу данных');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const stats = await saveTracksToDatabase(uniqueTracks, '🔥 Чарты 2025');

  // 5. Итоги
  console.log('\n\n🎉 ═══════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`   🌍 Источников: ${CHART_PAGES_2025.length + 1}`);
  console.log(`   📥 Загружено треков: ${allTracks.length}`);
  console.log(`   🎵 Уникальных: ${uniqueTracks.length}`);
  console.log(`   ✨ Новых в базе: ${stats.saved}`);
  console.log(`   🔄 Обновлено: ${stats.updated}`);
  console.log(`   📀 Плейлист: "🔥 Чарты 2025"\n`);

  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});

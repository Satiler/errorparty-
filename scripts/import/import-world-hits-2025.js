/**
 * Импорт мировых хитов 2025 года с lmusic.kz
 * Громкие новинки декабря + топовые треки
 */

const axios = require('axios');
const { Track, Album, Playlist, PlaylistTrack } = require('./src/models');

const LMUSIC_BASE = 'https://lmusic.kz';

// Страницы с реальными мировыми хитами
const TARGET_PAGES = [
  '/album/gromkie-novinki-dekabr-2025',           // Громкие новинки декабря 2025
  '/album/zarubezhnye-novinki-2025',              // Зарубежные новинки 2025
  '/album/top-100-zarubezhnykh-trekov-2025',      // ТОП 100 зарубежных треков
  '/album/luchshie-khity-2025-goda',              // Лучшие хиты 2025 года
  '/album/novaya-muzyka-2025',                     // Новая музыка 2025
  '/album/top-50-trekov-2025',                     // ТОП 50 треков 2025
  '/album/khity-2025',                             // Хиты 2025
  '/album/populyarnaya-muzyka-2025',               // Популярная музыка 2025
  '/album/top-pesni-2025',                         // Топ песни 2025
  '/album/muzykalnyye-khity-2025',                 // Музыкальные хиты 2025
];

async function fetchAlbumPage(url) {
  try {
    console.log(`\n🔍 Загрузка страницы: ${url}`);
    const response = await axios.get(`${LMUSIC_BASE}${url}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000
    });

    const html = response.data;
    
    // Извлекаем название альбома/плейлиста
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const albumTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown Album';
    
    console.log(`📀 Альбом: ${albumTitle}`);
    
    // Парсим треки из HTML
    const tracks = [];
    const trackPattern = /<div class="track-item"[^>]*>.*?data-title="([^"]*)".*?data-artist="([^"]*)".*?data-url="([^"]*)".*?<\/div>/gs;
    
    let match;
    let count = 0;
    while ((match = trackPattern.exec(html)) !== null && count < 100) {
      const title = match[1].trim();
      const artist = match[2].trim();
      let streamUrl = match[3].trim();
      
      // Преобразуем относительный URL в абсолютный
      if (streamUrl.startsWith('/')) {
        streamUrl = LMUSIC_BASE + streamUrl;
      }
      
      if (title && artist && streamUrl) {
        tracks.push({
          title: decodeHtmlEntities(title),
          artist: decodeHtmlEntities(artist),
          streamUrl,
          albumTitle
        });
        count++;
      }
    }
    
    // Альтернативный парсинг если первый не сработал
    if (tracks.length === 0) {
      console.log('⚠️  Пробуем альтернативный парсинг...');
      
      const altPattern = /<a[^>]*class="[^"]*track[^"]*"[^>]*>.*?<span[^>]*>(.*?)<\/span>.*?<span[^>]*>(.*?)<\/span>.*?href="([^"]*)"[^>]*>/gs;
      
      while ((match = altPattern.exec(html)) !== null && count < 100) {
        const title = match[1].replace(/<[^>]+>/g, '').trim();
        const artist = match[2].replace(/<[^>]+>/g, '').trim();
        let streamUrl = match[3].trim();
        
        if (streamUrl.startsWith('/')) {
          streamUrl = LMUSIC_BASE + streamUrl;
        }
        
        if (title && artist && streamUrl.includes('mp3')) {
          tracks.push({
            title: decodeHtmlEntities(title),
            artist: decodeHtmlEntities(artist),
            streamUrl,
            albumTitle
          });
          count++;
        }
      }
    }
    
    console.log(`✅ Найдено ${tracks.length} треков`);
    return { albumTitle, tracks };
    
  } catch (error) {
    console.error(`❌ Ошибка загрузки ${url}:`, error.message);
    return { albumTitle: 'Unknown', tracks: [] };
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function importWorldHits() {
  console.log('🌍 === ИМПОРТ МИРОВЫХ ХИТОВ 2025 ===\n');
  
  const allTracks = [];
  const albumMap = new Map();
  
  // Загружаем все страницы
  for (const pageUrl of TARGET_PAGES) {
    const { albumTitle, tracks } = await fetchAlbumPage(pageUrl);
    
    if (tracks.length > 0) {
      albumMap.set(albumTitle, tracks);
      allTracks.push(...tracks);
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 Всего найдено треков: ${allTracks.length}`);
  
  if (allTracks.length === 0) {
    console.log('❌ Не удалось загрузить треки. Проверьте структуру сайта.');
    return;
  }
  
  // Импортируем в базу
  let imported = 0;
  let skipped = 0;
  
  for (const trackData of allTracks) {
    try {
      // Проверяем существование
      const existing = await Track.findOne({
        where: {
          title: trackData.title,
          artist: trackData.artist
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Создаём или находим альбом
      let album = await Album.findOne({
        where: { title: trackData.albumTitle }
      });
      
      if (!album) {
        album = await Album.create({
          title: trackData.albumTitle,
          artist: 'Various Artists',
          releaseYear: 2025,
          genre: 'Pop',
          coverUrl: '/api/placeholder/album'
        });
      }
      
      // Создаём трек
      await Track.create({
        title: trackData.title,
        artist: trackData.artist,
        albumId: album.id,
        duration: 180, // 3 минуты по умолчанию
        trackNumber: 1,
        genre: 'Pop',
        streamUrl: trackData.streamUrl,
        fileUrl: trackData.streamUrl,
        externalUrl: trackData.streamUrl
      });
      
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`✅ Импортировано: ${imported} треков...`);
      }
      
    } catch (error) {
      console.error(`❌ Ошибка импорта трека "${trackData.title}":`, error.message);
    }
  }
  
  console.log('\n📊 === ИТОГИ ИМПОРТА ===');
  console.log(`✅ Импортировано новых треков: ${imported}`);
  console.log(`⏭️  Пропущено (дубликаты): ${skipped}`);
  console.log(`📀 Альбомов обработано: ${albumMap.size}`);
  
  // Создаём плейлист "Мировые Хиты 2025"
  if (imported > 0) {
    console.log('\n🎵 Создание плейлиста "Мировые Хиты 2025"...');
    
    try {
      // Удаляем старый если есть
      await Playlist.destroy({
        where: { name: 'Мировые Хиты 2025' }
      });
      
      const playlist = await Playlist.create({
        name: 'Мировые Хиты 2025',
        description: 'Лучшие зарубежные хиты и новинки декабря 2025 года',
        isPublic: true,
        metadata: {
          type: 'editorial',
          icon: '🌍',
          color: '#ff6b6b',
          priority: 1
        }
      });
      
      // Берём последние 100 импортированных треков
      const tracks = await Track.findAll({
        order: [['createdAt', 'DESC']],
        limit: 100
      });
      
      for (let i = 0; i < tracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: tracks[i].id,
          position: i + 1
        });
      }
      
      console.log(`✅ Плейлист создан с ${tracks.length} треками`);
      
    } catch (error) {
      console.error('❌ Ошибка создания плейлиста:', error.message);
    }
  }
  
  // Итоговая статистика
  const totalTracks = await Track.count();
  console.log(`\n🎵 Всего треков в базе: ${totalTracks}`);
}

// Запуск
importWorldHits()
  .then(() => {
    console.log('\n✅ Импорт завершён!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });

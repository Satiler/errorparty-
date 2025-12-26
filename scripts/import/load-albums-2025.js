/**
 * 🎵 Загрузка топовых альбомов 2025 с KissVK
 */

const { getInstance } = require('./src/services/kissvk-puppeteer.service');
const { Track, Album, Playlist } = require('./src/models');

const albums2025 = [
  // Российские альбомы
  { search: 'MACAN', artist: 'MACAN', name: 'MACAN — BRATLAND', type: 'russian', limit: 15 },
  { search: 'Мияги', artist: 'Мияги', name: 'Мияги — новый альбом 2025', type: 'russian', limit: 15 },
  { search: 'ANNA ASTI', artist: 'ANNA ASTI', name: 'ANNA ASTI — сборник хитов 2025', type: 'russian', limit: 15 },
  { search: 'ATL', artist: 'ATL', name: 'ATL — Необратимые последствия', type: 'russian', limit: 12 },
  { search: 'Жарок', artist: 'Жарок', name: 'Жарок — Энвайронментал', type: 'russian', limit: 12 },
  { search: 'Холодный ты', artist: 'Холодный', name: 'Холодный ты — Музыка в машину', type: 'russian', limit: 12 },
  { search: 'Скриптонит', artist: 'Скриптонит', name: 'Скриптонит — новый релиз 2025', type: 'russian', limit: 15 },
  { search: 'ЛСП', artist: 'ЛСП', name: 'ЛСП — релиз осени 2025', type: 'russian', limit: 12 },
  
  // Зарубежные альбомы
  { search: 'Lady Gaga', artist: 'Lady Gaga', name: 'Lady Gaga — Mayhem', type: 'foreign', limit: 15 },
  { search: 'Bad Bunny', artist: 'Bad Bunny', name: 'Bad Bunny — Debí Tirar Más Fotos', type: 'foreign', limit: 15 },
  { search: 'PinkPantheress', artist: 'PinkPantheress', name: 'PinkPantheress — Fancy That', type: 'foreign', limit: 12 },
  { search: 'Kali Uchis', artist: 'Kali Uchis', name: 'Kali Uchis — Sincerely', type: 'foreign', limit: 12 },
  { search: 'FKA Twigs', artist: 'FKA Twigs', name: 'FKA Twigs — Eusexua', type: 'foreign', limit: 10 },
  { search: 'Skrillex', artist: 'Skrillex', name: 'Skrillex — новый альбом 2025', type: 'foreign', limit: 15 },
  { search: 'Addison Rae', artist: 'Addison Rae', name: 'Addison Rae — Addison', type: 'foreign', limit: 10 },
  { search: 'Deafheaven', artist: 'Deafheaven', name: 'Deafheaven — Lonely People With Power', type: 'foreign', limit: 10 },
  { search: 'Yeule', artist: 'Yeule', name: 'Yeule — Evangelic Girl is a Gun', type: 'foreign', limit: 10 },
  { search: 'Rosalía', artist: 'Rosalía', name: 'Rosalía — новый альбом 2025', type: 'foreign', limit: 12 },
  { search: 'Billie Eilish', artist: 'Billie Eilish', name: 'Billie Eilish — Hit Me Hard and Soft', type: 'foreign', limit: 15 },
  { search: 'Kendrick Lamar', artist: 'Kendrick Lamar', name: 'Kendrick Lamar — GNX', type: 'foreign', limit: 15 },
  { search: 'Playboi Carti', artist: 'Playboi Carti', name: 'Playboi Carti — релиз 2025', type: 'foreign', limit: 15 }
];

async function loadAlbums() {
  console.log('🎵 Начинаем загрузку топовых альбомов 2025...\n');

  const puppeteerService = getInstance(3);
  await puppeteerService.initBrowserPool();

  const russianTracks = [];
  const foreignTracks = [];
  let totalLoaded = 0;

  for (let i = 0; i < albums2025.length; i++) {
    const album = albums2025[i];
    console.log(`\n📀 [${i + 1}/${albums2025.length}] Загружаем: ${album.name}`);
    console.log(`   Поиск исполнителя: "${album.artist}"`);

    try {
      // Загружаем ВСЕ треки с главной страницы
      const allTracks = await puppeteerService.getChartTracks();
      console.log(`   📊 Всего треков на главной: ${allTracks.length}`);
      
      // Фильтруем треки по исполнителю
      const artistLower = album.artist.toLowerCase();
      const foundTracks = allTracks.filter(t => {
        const trackArtistLower = (t.artist || '').toLowerCase();
        return trackArtistLower.includes(artistLower);
      }).slice(0, album.limit);

      if (foundTracks.length > 0) {
        console.log(`   ✅ Найдено ${foundTracks.length} треков исполнителя "${album.artist}"`);
        
        for (const trackData of foundTracks) {
          // Проверяем, есть ли уже в базе
          const existing = await Track.findOne({
            where: {
              title: trackData.title,
              artist: trackData.artist
            }
          });

          if (existing) {
            console.log(`   ⏭️  Трек уже есть: ${trackData.artist} - ${trackData.title}`);
            continue;
          }

          // Расшифровываем URL если нужно
          let streamUrl = trackData.streamUrl;
          if (streamUrl.startsWith('encrypted:')) {
            const trackId = streamUrl.replace('encrypted:', '');
            console.log(`   🔓 Расшифровываем URL для трека ${trackId}...`);
            
            const decryptedUrl = await puppeteerService.decryptTrackUrl(trackId, trackData.pageUrl);
            if (decryptedUrl) {
              streamUrl = decryptedUrl;
              console.log(`   ✅ URL расшифрован: ${streamUrl.substring(0, 60)}...`);
            } else {
              console.log(`   ❌ Не удалось расшифровать URL`);
              continue;
            }
          }

          // Сохраняем трек
          const track = await Track.create({
            title: trackData.title,
            artist: trackData.artist,
            duration: trackData.duration || 0,
            streamUrl: streamUrl,
            coverUrl: trackData.coverUrl,
            provider: 'kissvk',
            externalId: trackData.trackId
          });

          console.log(`   💾 Сохранён: ${track.artist} - ${track.title}`);
          
          if (album.type === 'russian') {
            russianTracks.push(track);
          } else {
            foreignTracks.push(track);
          }
          
          totalLoaded++;
        }
      } else {
        console.log(`   ⚠️  Треки исполнителя "${album.artist}" не найдены на главной`);
      }

      // Задержка между альбомами
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Ошибка загрузки альбома:`, error.message);
    }
  }

  // Создаём плейлисты
  console.log('\n\n📋 Создаём плейлисты...');

  if (russianTracks.length > 0) {
    const russianPlaylist = await Playlist.findOrCreate({
      where: { name: 'Топ российских альбомов 2025' },
      defaults: {
        description: 'Лучшие российские альбомы и сборники 2025 года',
        coverUrl: 'https://i.imgur.com/russian2025.jpg',
        isPublic: true
      }
    });

    for (const track of russianTracks) {
      await russianPlaylist[0].addTrack(track);
    }

    console.log(`✅ Плейлист "Топ российских альбомов 2025": ${russianTracks.length} треков`);
  }

  if (foreignTracks.length > 0) {
    const foreignPlaylist = await Playlist.findOrCreate({
      where: { name: 'Топ зарубежных альбомов 2025' },
      defaults: {
        description: 'Лучшие зарубежные альбомы 2025 года',
        coverUrl: 'https://i.imgur.com/foreign2025.jpg',
        isPublic: true
      }
    });

    for (const track of foreignTracks) {
      await foreignPlaylist[0].addTrack(track);
    }

    console.log(`✅ Плейлист "Топ зарубежных альбомов 2025": ${foreignTracks.length} треков`);
  }

  await puppeteerService.closeBrowserPool();

  console.log('\n\n✨ Загрузка завершена!');
  console.log(`📊 Всего загружено треков: ${totalLoaded}`);
  console.log(`🇷🇺 Российские: ${russianTracks.length}`);
  console.log(`🌍 Зарубежные: ${foreignTracks.length}`);
}

// Запуск
loadAlbums()
  .then(() => {
    console.log('\n✅ Скрипт завершён успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Ошибка выполнения скрипта:', error);
    process.exit(1);
  });

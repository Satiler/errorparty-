const { Album, Track } = require('./src/models');
const lmusicService = require('./src/modules/music/lmusic-kz.service');
const musifyService = require('./src/services/musify.service');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fixAlbum493() {
  console.log('\n🔧 Исправление альбома "Горизонт 2" (Би-2)\n');
  
  const album = await Album.findByPk(493, {
    include: [{ model: Track, as: 'tracks' }]
  });

  let fixed = 0;

  for (const track of album.tracks) {
    console.log(`\n🎵 ${track.title}`);
    
    // Извлекаем исполнителя и название
    let artist = 'Би-2';
    let title = track.title;
    
    // Убираем лишнее из названия
    title = title.replace(/\s*\(.*?\)/g, ''); // Убираем (2017 - Горизонт событий)
    title = title.replace(/БИ-2\s*-\s*/gi, ''); // Убираем "БИ-2 -"
    title = title.replace(/\s*feat\.\s*.*$/i, ''); // Убираем feat.
    title = title.trim();
    
    const query = `Би-2 ${title}`;
    console.log(`  🔍 "${query}"`);
    
    // Lmusic
    try {
      const results = await lmusicService.searchTracks(query, 5);
      if (results && results.length > 0) {
        const match = results.find(r => r.streamUrl);
        if (match) {
          await track.update({
            streamUrl: match.streamUrl,
            duration: match.duration || track.duration,
            sourceType: 'lmusic.kz'
          });
          console.log(`    ✅ ${match.streamUrl.substring(0, 50)}...`);
          fixed++;
          await sleep(1000);
          continue;
        }
      }
    } catch (e) {
      console.log(`    ⚠️  ${e.message}`);
    }
    
    await sleep(800);
    
    // Musify
    try {
      const results = await musifyService.searchTracks(query, 5);
      if (results && results.length > 0) {
        const match = results.find(r => r.streamUrl);
        if (match) {
          await track.update({
            streamUrl: match.streamUrl,
            duration: match.duration || track.duration,
            sourceType: 'musify.club'
          });
          console.log(`    ✅ ${match.streamUrl.substring(0, 50)}...`);
          fixed++;
          await sleep(1000);
          continue;
        }
      }
    } catch (e) {
      console.log(`    ⚠️  ${e.message}`);
    }
    
    console.log(`    ❌ Не найдено`);
    await sleep(1000);
  }

  console.log(`\n\n✅ Исправлено: ${fixed} из ${album.tracks.length}`);
  process.exit(0);
}

fixAlbum493();

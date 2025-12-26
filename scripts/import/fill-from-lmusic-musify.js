/**
 * Заполнение альбомов ТОЛЬКО из Lmusic.kz и Musify (без VK)
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const axios = require('axios');

// Поиск треков в Lmusic.kz
async function searchLmusic(query, limit = 10) {
  try {
    const response = await axios.get('https://lmusic.kz/api/search', {
      params: { q: query, limit },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.tracks) {
      return response.data.tracks.map(track => ({
        title: track.title || track.name,
        artist: track.artist || 'Unknown',
        streamUrl: track.url || track.stream_url,
        duration: track.duration || 180,
        source: 'lmusic.kz'
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Поиск треков в Musify
async function searchMusify(query, limit = 10) {
  try {
    const response = await axios.get('https://musify.club/api/search', {
      params: { q: query, limit },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.results) {
      return response.data.results.map(track => ({
        title: track.title,
        artist: track.artist,
        streamUrl: track.stream_url || track.url,
        duration: track.duration || 180,
        source: 'musify.club'
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

async function fillFromLmusicMusify() {
  console.log('\n🎵 === ЗАПОЛНЕНИЕ АЛЬБОМОВ ИЗ LMUSIC.KZ И MUSIFY ===\n');

  try {
    // Находим альбомы без треков
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false
      }]
    });

    const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
    console.log(`📊 Найдено ${emptyAlbums.length} пустых альбомов\n`);

    let processed = 0;
    let successful = 0;
    let totalTracksAdded = 0;

    for (const album of emptyAlbums) {
      processed++;
      console.log(`\n[${processed}/${emptyAlbums.length}] ${album.title} - ${album.artist}`);

      try {
        let allTracks = [];

        // Поиск в Lmusic.kz
        console.log(`  🔍 Поиск в Lmusic.kz...`);
        const lmusicQuery = `${album.artist} ${album.title}`;
        const lmusicResults = await searchLmusic(lmusicQuery, 10);
        
        if (lmusicResults.length > 0) {
          console.log(`    ✅ Найдено ${lmusicResults.length} треков`);
          allTracks.push(...lmusicResults);
        } else {
          console.log(`    ⚠️  Не найдено`);
        }

        // Задержка между сервисами
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Поиск в Musify
        console.log(`  🔍 Поиск в Musify...`);
        const musifyQuery = `${album.artist} ${album.title}`;
        const musifyResults = await searchMusify(musifyQuery, 10);
        
        if (musifyResults.length > 0) {
          console.log(`    ✅ Найдено ${musifyResults.length} треков`);
          allTracks.push(...musifyResults);
        } else {
          console.log(`    ⚠️  Не найдено`);
        }

        // Убираем дубликаты по названию
        const uniqueTracks = [];
        const seen = new Set();
        
        for (const track of allTracks) {
          const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
          if (!seen.has(key) && track.streamUrl) {
            seen.add(key);
            uniqueTracks.push(track);
          }
        }

        console.log(`  📦 Уникальных треков с URL: ${uniqueTracks.length}`);

        // Создаём треки в базе
        if (uniqueTracks.length > 0) {
          let added = 0;

          for (let i = 0; i < Math.min(uniqueTracks.length, 15); i++) {
            const trackData = uniqueTracks[i];

            try {
              // Проверяем существование
              const existingTrack = await Track.findOne({
                where: {
                  title: trackData.title,
                  artist: trackData.artist
                }
              });

              if (existingTrack) {
                if (!existingTrack.albumId) {
                  await existingTrack.update({ albumId: album.id });
                  added++;
                  console.log(`    💾 Привязан: ${trackData.title}`);
                }
              } else {
                await Track.create({
                  title: trackData.title,
                  artist: trackData.artist,
                  albumId: album.id,
                  streamUrl: trackData.streamUrl,
                  duration: trackData.duration,
                  genre: album.genre || 'Unknown',
                  trackNumber: i + 1,
                  source: trackData.source,
                  allowDownload: true
                });
                added++;
                console.log(`    ✅ Добавлен: ${trackData.title}`);
              }
            } catch (error) {
              console.log(`    ⚠️  Пропущен: ${trackData.title}`);
            }
          }

          if (added > 0) {
            totalTracksAdded += added;
            successful++;
            console.log(`  ✅ Успешно добавлено ${added} треков`);
          }
        } else {
          console.log(`  ❌ Треки с URL не найдены`);
        }

      } catch (error) {
        console.error(`  ❌ Ошибка: ${error.message}`);
      }

      // Задержка между альбомами
      if (processed < emptyAlbums.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n📊 === ИТОГИ ===`);
    console.log(`✅ Обработано: ${processed}`);
    console.log(`✅ Заполнено: ${successful}`);
    console.log(`✅ Треков добавлено: ${totalTracksAdded}\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fillFromLmusicMusify();

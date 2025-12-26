/**
 * Массовая загрузка популярных треков по жанрам
 * Получаем топ-200 треков разных жанров одним запросом
 */
const { Album, Track } = require('./src/models');
const { sequelize } = require('./src/config/database');
const vkService = require('./src/services/vk-music.service');

async function bulkLoadPopular() {
  console.log('\n🎵 === МАССОВАЯ ЗАГРУЗКА ПОПУЛЯРНЫХ ТРЕКОВ ===');
  console.log('⚡ Загружаем топ-200 по всем жанрам одним execute запросом\n');

  try {
    if (!vkService.isAvailable()) {
      console.log('❌ VK Music недоступен (нет токена)');
      return;
    }

    // 1. Загружаем популярные треки через execute (параллельно несколько жанров)
    console.log('1️⃣ Загрузка популярных треков...');
    
    // VK жанры: 1-Rock, 2-Pop, 3-Rap&Hip-Hop, 4-Easy Listening, 5-House&Dance, 
    // 6-Instrumental, 7-Metal, 18-Alternative, 21-Electropop, 1001-Russian Pop
    const genres = [1, 2, 3, 5, 18, 21, 1001];
    
    const code = `
      var result = [];
      ${genres.map(genreId => `
        var g${genreId} = API.audio.getPopular({"genre_id": ${genreId}, "count": 100});
        result.push(g${genreId}.items);
      `).join('\n')}
      return result;
    `;

    const data = await vkService.makeVKRequest('execute', { code });
    
    if (!data.response) {
      console.log('❌ Не удалось загрузить популярные треки');
      return;
    }

    // Объединяем все треки
    const allPopularTracks = [];
    for (const genreTracks of data.response) {
      if (Array.isArray(genreTracks)) {
        allPopularTracks.push(...genreTracks);
      }
    }

    console.log(`✅ Загружено ${allPopularTracks.length} популярных треков\n`);

    // 2. Группируем по альбомам
    console.log('2️⃣ Группировка по альбомам...');
    const tracksByAlbum = new Map();
    
    for (const item of allPopularTracks) {
      if (!item.url) continue;
      
      const track = {
        id: `vk_${item.id}_${item.owner_id}`,
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        streamUrl: item.url,
        albumTitle: item.album?.title || null,
        coverUrl: item.album?.thumb?.photo_300 || null,
        source: 'vk-music'
      };

      if (track.albumTitle) {
        const key = `${track.artist}|||${track.albumTitle}`.toLowerCase();
        if (!tracksByAlbum.has(key)) {
          tracksByAlbum.set(key, []);
        }
        tracksByAlbum.get(key).push(track);
      }
    }

    console.log(`✅ Найдено ${tracksByAlbum.size} уникальных альбомов\n`);

    // 3. Сопоставляем с пустыми альбомами в БД
    console.log('3️⃣ Сопоставление с базой данных...');
    const allAlbums = await Album.findAll({
      include: [{
        model: Track,
        as: 'tracks',
        required: false,
        attributes: ['id']
      }]
    });

    const emptyAlbums = allAlbums.filter(album => !album.tracks || album.tracks.length === 0);
    console.log(`✅ Найдено ${emptyAlbums.length} пустых альбомов\n`);

    // 4. Заполняем совпадения
    console.log('4️⃣ Заполнение альбомов...');
    let matched = 0;
    let totalTracksAdded = 0;

    for (const album of emptyAlbums) {
      const artistLower = album.artist.toLowerCase();
      const titleLower = album.title.toLowerCase();
      
      // Ищем совпадения
      let bestMatch = null;
      let bestScore = 0;

      for (const [key, tracks] of tracksByAlbum.entries()) {
        const [keyArtist, keyTitle] = key.split('|||');
        
        let score = 0;
        if (keyArtist.includes(artistLower) || artistLower.includes(keyArtist)) score += 2;
        if (keyTitle.includes(titleLower) || titleLower.includes(keyTitle)) score += 2;
        if (keyArtist === artistLower) score += 1;
        if (keyTitle === titleLower) score += 1;

        if (score > bestScore && score >= 2) {
          bestScore = score;
          bestMatch = tracks;
        }
      }

      if (bestMatch && bestMatch.length > 0) {
        matched++;
        console.log(`\n[${matched}] ${album.artist} - ${album.title}`);
        console.log(`  ✅ Найдено ${bestMatch.length} треков (score: ${bestScore})`);
        
        let added = 0;
        
        for (let i = 0; i < Math.min(bestMatch.length, 15); i++) {
          const trackData = bestMatch[i];
          
          try {
            const existingTrack = await Track.findOne({
              where: { title: trackData.title, artist: trackData.artist }
            });

            if (existingTrack && !existingTrack.albumId) {
              await existingTrack.update({ 
                albumId: album.id,
                streamUrl: trackData.streamUrl
              });
              added++;
            } else if (!existingTrack) {
              await Track.create({
                title: trackData.title,
                artist: trackData.artist,
                albumId: album.id,
                streamUrl: trackData.streamUrl,
                duration: trackData.duration || 180,
                genre: album.genre || 'Unknown',
                trackNumber: i + 1,
                source: 'vk-music',
                allowDownload: true
              });
              added++;
            }
          } catch (error) {
            if (!error.message.includes('unique')) {
              console.log(`    ⚠️  Ошибка: ${error.message.substring(0, 40)}`);
            }
          }
        }

        if (added > 0) {
          totalTracksAdded += added;
          console.log(`  ✅ Добавлено ${added} треков`);
        }
      }
    }

    console.log(`\n\n✅ === ЗАВЕРШЕНО ===`);
    console.log(`📊 Обработано альбомов: ${emptyAlbums.length}`);
    console.log(`✅ Совпадений найдено: ${matched}`);
    console.log(`🎵 Всего треков добавлено: ${totalTracksAdded}`);
    console.log(`⚡ Потребовался всего 1 запрос к VK API!\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

bulkLoadPopular();

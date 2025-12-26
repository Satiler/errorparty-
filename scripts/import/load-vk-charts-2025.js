/**
 * Загрузка популярных чартов 2025 через VK Music API
 * Получаем топ треков по жанрам + новинки
 */

const { Track, Playlist, PlaylistTrack } = require('./src/models');
const vkService = require('./src/services/vk-music.service');

// Жанры VK Music
const GENRES = [
  { id: 2, name: 'Pop' },
  { id: 5, name: 'Dance & House' },
  { id: 3, name: 'Rap & Hip-Hop' },
  { id: 18, name: 'Alternative' },
  { id: 21, name: 'Electropop & Disco' },
  { id: 1001, name: 'Russian Pop' },
  { id: 1, name: 'Rock' },
  { id: 4, name: 'Easy Listening' }
];

async function loadGenreCharts(genreInfo, count = 100) {
  try {
    console.log(`\n🎵 Загрузка: ${genreInfo.name} (топ ${count})...`);
    
    const data = await vkService.makeVKRequest('audio.getPopular', {
      genre_id: genreInfo.id,
      count: count
    });

    if (!data.response || !data.response.items) {
      console.log(`   ❌ Нет данных`);
      return [];
    }

    const tracks = [];
    for (const item of data.response.items) {
      if (item.url) {
        tracks.push({
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          streamUrl: item.url,
          albumName: item.album?.title || null,
          coverUrl: item.album?.thumb?.photo_300 || null,
          genre: genreInfo.name,
          year: 2025,
          source: 'vk-music'
        });
      }
    }

    console.log(`   ✅ Найдено ${tracks.length} треков`);
    return tracks;

  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return [];
  }
}

async function loadRecommendations(count = 100) {
  try {
    console.log(`\n🌟 Загрузка рекомендаций VK Music...`);
    
    const data = await vkService.makeVKRequest('audio.getRecommendations', {
      count: count,
      shuffle: 1
    });

    if (!data.response || !data.response.items) {
      console.log(`   ❌ Нет рекомендаций`);
      return [];
    }

    const tracks = [];
    for (const item of data.response.items) {
      if (item.url) {
        tracks.push({
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          streamUrl: item.url,
          albumName: item.album?.title || null,
          coverUrl: item.album?.thumb?.photo_300 || null,
          genre: 'Рекомендации',
          year: 2025,
          source: 'vk-music'
        });
      }
    }

    console.log(`   ✅ Найдено ${tracks.length} рекомендаций`);
    return tracks;

  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return [];
  }
}

async function saveTracksToDatabase(tracks) {
  let saved = 0;
  let updated = 0;
  let skipped = 0;

  console.log('\n💾 Сохранение в базу данных...\n');

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
            isPublic: true,
            playCount: existing.playCount + 1 // Увеличиваем счетчик популярности
          });
          updated++;
        } else {
          // Просто увеличиваем популярность
          await existing.increment('playCount', { by: 1 });
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
          albumName: trackData.albumName,
          year: trackData.year || 2025,
          source: trackData.source || 'vk-music',
          isPublic: true,
          playCount: 10, // Начальная популярность для новых треков
          genre: trackData.genre
        });
        saved++;
      }

      // Прогресс
      if ((saved + updated + skipped) % 50 === 0) {
        process.stdout.write(`   📊 Обработано: ${saved + updated + skipped} треков\r`);
      }

    } catch (error) {
      // Игнорируем ошибки (обычно дубликаты)
    }
  }

  console.log(`\n\n📊 Статистика сохранения:`);
  console.log(`   ✨ Новых треков: ${saved}`);
  console.log(`   🔄 Обновлено: ${updated}`);
  console.log(`   ⏭️  Уже было: ${skipped}`);

  return { saved, updated, skipped };
}

async function createChartsPlaylist(genreTracks) {
  try {
    console.log('\n\n🎼 Создание плейлистов...\n');

    // Создаем главный плейлист "Чарты 2025"
    let mainPlaylist = await Playlist.findOne({ where: { name: '🔥 Чарты 2025' } });
    
    if (!mainPlaylist) {
      mainPlaylist = await Playlist.create({
        name: '🔥 Чарты 2025',
        description: 'Самые популярные треки 2025 года со всех чартов',
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        isPublic: true
      });
      console.log('✅ Создан плейлист: 🔥 Чарты 2025');
    } else {
      // Очищаем старые треки
      await PlaylistTrack.destroy({ where: { playlistId: mainPlaylist.id } });
      console.log('🔄 Очищен плейлист: 🔥 Чарты 2025');
    }

    // Берем топ-100 треков с наибольшим playCount
    const topTracks = await Track.findAll({
      where: { isPublic: true, streamUrl: { $ne: null } },
      order: [['playCount', 'DESC'], ['likeCount', 'DESC']],
      limit: 100
    });

    // Добавляем в главный плейлист
    for (let i = 0; i < topTracks.length; i++) {
      await PlaylistTrack.create({
        playlistId: mainPlaylist.id,
        trackId: topTracks[i].id,
        position: i + 1
      });
    }

    console.log(`✅ Главный плейлист: ${topTracks.length} треков`);

    // Создаем плейлисты по жанрам
    for (const [genre, tracks] of Object.entries(genreTracks)) {
      if (tracks.length === 0) continue;

      const playlistName = `📊 Чарты 2025: ${genre}`;
      let playlist = await Playlist.findOne({ where: { name: playlistName } });
      
      if (!playlist) {
        playlist = await Playlist.create({
          name: playlistName,
          description: `Топ ${genre} треков 2025 года`,
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
          isPublic: true
        });
      } else {
        await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
      }

      // Находим треки в базе
      const dbTracks = await Track.findAll({
        where: {
          title: tracks.slice(0, 50).map(t => t.title),
          artist: tracks.slice(0, 50).map(t => t.artist)
        },
        limit: 50
      });

      for (let i = 0; i < dbTracks.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: dbTracks[i].id,
          position: i + 1
        });
      }

      console.log(`✅ ${playlistName}: ${dbTracks.length} треков`);
    }

  } catch (error) {
    console.log('⚠️  Ошибка создания плейлистов:', error.message);
  }
}

async function main() {
  console.log('\n🎵 ═══════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЧАРТОВ 2025 ГОДА ЧЕРЕЗ VK MUSIC');
  console.log('═══════════════════════════════════════════════════\n');

  if (!vkService.isAvailable()) {
    console.log('❌ VK Music недоступен (нет токена)');
    console.log('💡 Настройте VK_SERVICE_TOKEN в .env файле\n');
    process.exit(1);
  }

  const allTracks = [];
  const genreTracks = {};

  // 1. Загружаем чарты по жанрам
  console.log('📊 ЭТАП 1: Загрузка чартов по жанрам');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const genre of GENRES) {
    const tracks = await loadGenreCharts(genre, 100);
    allTracks.push(...tracks);
    genreTracks[genre.name] = tracks;
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 2. Загружаем рекомендации
  console.log('\n\n🌟 ЭТАП 2: Загрузка рекомендаций');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const recommendations = await loadRecommendations(100);
  allTracks.push(...recommendations);

  console.log(`\n\n✅ Всего загружено: ${allTracks.length} треков`);

  // 3. Удаляем дубликаты
  console.log('\n🔄 ЭТАП 3: Удаление дубликатов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = await saveTracksToDatabase(uniqueTracks);

  // 5. Создаем плейлисты
  console.log('\n🎼 ЭТАП 5: Создание плейлистов');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await createChartsPlaylist(genreTracks);

  // 6. Итоги
  console.log('\n\n🎉 ═══════════════════════════════════════════════════');
  console.log('   ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`   🎵 Жанров: ${GENRES.length}`);
  console.log(`   📥 Загружено треков: ${allTracks.length}`);
  console.log(`   🌟 Уникальных: ${uniqueTracks.length}`);
  console.log(`   ✨ Новых в базе: ${stats.saved}`);
  console.log(`   🔄 Обновлено: ${stats.updated}`);
  console.log(`   📀 Создано плейлистов: ${GENRES.length + 1}`);
  console.log(`\n🔥 Плейлисты:`);
  console.log(`   • Чарты 2025 (топ-100)`);
  for (const genre of GENRES) {
    console.log(`   • Чарты 2025: ${genre.name}`);
  }
  console.log('');

  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});

/**
 * Установка уникальных обложек для editorial плейлистов
 */

const { Playlist, Track, PlaylistTrack } = require('./src/models');
const { Op } = require('sequelize');
const axios = require('axios');

const ITUNES_API = 'https://itunes.apple.com/search';

async function getUniqueCoverForPlaylist(playlistName, trackIds) {
  console.log(`\n🎨 Ищу уникальную обложку для "${playlistName}"...`);
  
  // Для каждого плейлиста используем разные треки для поиска обложки
  const searchStrategies = {
    '🔥 Открытия Недели': { position: 0, genre: 'pop' },
    '😌 Релакс': { position: 0, genre: 'ambient' },
    '💋 KissVK Хиты': { position: Math.floor(trackIds.length / 3), genre: 'pop' },
    '🆕 Новинки Месяца': { position: Math.floor(trackIds.length / 4), genre: 'hip-hop' },
    '🔥 Топ 100 Хитов': { position: Math.floor(trackIds.length / 2), genre: 'rock' }
  };

  const strategy = searchStrategies[playlistName] || { position: 0 };
  const trackIndex = Math.min(strategy.position, trackIds.length - 1);
  
  console.log(`  Используем трек на позиции ${trackIndex} из ${trackIds.length}`);

  // Получаем трек
  const track = await Track.findByPk(trackIds[trackIndex]);
  if (!track) {
    console.log('  ❌ Трек не найден');
    return null;
  }

  console.log(`  Трек: ${track.artist} - ${track.title}`);

  // Если у трека уже есть обложка, используем её
  if (track.coverUrl) {
    console.log(`  ✅ Используем обложку трека: ${track.coverUrl.substring(0, 60)}...`);
    return track.coverUrl;
  }

  // Ищем в iTunes
  try {
    const searchQuery = `${track.artist} ${track.title}`.trim();
    const response = await axios.get(ITUNES_API, {
      params: {
        term: searchQuery,
        media: 'music',
        entity: 'song',
        limit: 1
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      const artworkUrl = response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      console.log(`  ✅ Найдена обложка в iTunes: ${artworkUrl.substring(0, 60)}...`);
      
      // Обновляем трек
      await track.update({ coverUrl: artworkUrl });
      
      return artworkUrl;
    }
  } catch (error) {
    console.log(`  ⚠️ iTunes search failed: ${error.message}`);
  }

  return null;
}

async function setUniqueCovers() {
  console.log('🎨 Установка уникальных обложек для editorial плейлистов\n');

  const playlists = await Playlist.findAll({
    where: {
      type: 'editorial',
      name: {
        [Op.in]: [
          '🔥 Открытия Недели',
          '😌 Релакс',
          '💋 KissVK Хиты',
          '🆕 Новинки Месяца',
          '🔥 Топ 100 Хитов'
        ]
      }
    },
    order: [['id', 'DESC']]
  });

  console.log(`Найдено ${playlists.length} плейлистов для обновления\n`);

  for (const playlist of playlists) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📀 Плейлист: [${playlist.id}] ${playlist.name}`);
    console.log(`  Текущая обложка: ${playlist.coverUrl || 'НЕТ'}`);

    // Получаем треки плейлиста
    const playlistTracks = await PlaylistTrack.findAll({
      where: { playlistId: playlist.id },
      order: [['position', 'ASC']],
      limit: 50
    });

    if (playlistTracks.length === 0) {
      console.log('  ❌ Нет треков в плейлисте');
      continue;
    }

    const trackIds = playlistTracks.map(pt => pt.trackId);
    console.log(`  Треков в плейлисте: ${trackIds.length}`);

    // Получаем уникальную обложку
    const coverUrl = await getUniqueCoverForPlaylist(playlist.name, trackIds);

    if (coverUrl) {
      // Обновляем плейлист
      await playlist.update({
        coverUrl: coverUrl,
        image: coverUrl
      });

      console.log(`  ✅ Обложка установлена: ${coverUrl.substring(0, 60)}...`);
    } else {
      console.log('  ⚠️ Не удалось найти обложку');
    }

    // Небольшая задержка между запросами к iTunes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Обработка завершена!');
}

// Запуск
setUniqueCovers()
  .then(() => {
    console.log('\n🎉 Все готово!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });

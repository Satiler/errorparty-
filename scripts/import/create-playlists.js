/**
 * Создание плейлистов из импортированных треков
 */
const { Playlist, Track, PlaylistTrack, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function createEditorialPlaylists() {
  console.log('🎵 СОЗДАНИЕ ПЛЕЙЛИСТОВ ИЗ ТРЕКОВ');
  console.log('=' .repeat(60));

  try {
    // Получаем все треки
    const allTracks = await Track.findAll({
      limit: 1000,
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n✅ Найдено ${allTracks.length} треков`);

    if (allTracks.length === 0) {
      console.log('❌ Треки не найдены. Сначала импортируйте треки!');
      return;
    }

    // 1. Топ 100 треков
    console.log('\n📀 Создаю "Топ 100 Треков"...');
    await createOrUpdatePlaylist('Топ 100 Треков', 'Самые популярные треки', allTracks.slice(0, 100));

    // 2. КissVK Хиты
    console.log('\n📀 Создаю "💋 Хиты с KissVK"...');
    await createOrUpdatePlaylist('💋 Хиты с KissVK', 'Лучшие треки с KissVK', allTracks.slice(0, 200));

    // 3. Новинки 2025
    console.log('\n📀 Создаю "🆕 Новинки 2025"...');
    await createOrUpdatePlaylist('🆕 Новинки 2025', 'Свежие треки 2025 года', allTracks.slice(0, 100));

    // 4. Микс дня
    console.log('\n📀 Создаю "🎲 Микс дня"...');
    const randomTracks = [...allTracks].sort(() => Math.random() - 0.5).slice(0, 50);
    await createOrUpdatePlaylist('🎲 Микс дня', 'Случайная подборка на каждый день', randomTracks);

    // 5. Плейлисты по исполнителям
    const artistStats = await Track.findAll({
      attributes: [
        'artist',
        [sequelize.fn('COUNT', sequelize.col('id')), 'trackCount']
      ],
      group: ['artist'],
      having: sequelize.literal('COUNT(id) >= 5'),
      order: [[sequelize.literal('COUNT(id)'), 'DESC']],
      limit: 10,
      raw: true
    });

    console.log(`\n✅ Найдено ${artistStats.length} популярных исполнителей`);

    for (let i = 0; i < Math.min(5, artistStats.length); i++) {
      const artistData = artistStats[i];
      const artistName = artistData.artist;
      
      const artistTracks = await Track.findAll({
        where: { artist: artistName },
        limit: 50
      });

      if (artistTracks.length > 0) {
        console.log(`\n📀 Создаю "🎤 ${artistName}"...`);
        await createOrUpdatePlaylist(
          `🎤 Лучшее от ${artistName}`,
          `Популярные треки ${artistName}`,
          artistTracks
        );
      }
    }

    // Финальная статистика
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`Всего плейлистов: ${totalPlaylists}`);
    console.log(`Всего связей треков: ${totalPlaylistTracks}`);
    console.log('\n✨ Плейлисты успешно созданы!');

  } catch (error) {
    console.error('\n❌ Ошибка создания плейлистов:', error);
    console.error(error.stack);
    throw error;
  }
}

// Вспомогательная функция для создания/обновления плейлиста
async function createOrUpdatePlaylist(name, description, tracks) {
  let playlist = await Playlist.findOne({ where: { name } });

  if (!playlist) {
    playlist = await Playlist.create({
      name,
      description,
      type: 'editorial',
      isPublic: true,
      trackCount: tracks.length,
      image: tracks[0]?.coverUrl || null,
      userId: 1 // System playlists
    });
    console.log(`   ✅ Создан плейлист (ID: ${playlist.id})`);
  } else {
    playlist.description = description;
    playlist.trackCount = tracks.length;
    playlist.image = tracks[0]?.coverUrl || playlist.image;
    await playlist.save();
    console.log(`   ⚠️ Обновлён существующий плейлист (ID: ${playlist.id})`);
    
    // Удаляем старые связи
    await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
  }

  // Добавляем треки
  for (let i = 0; i < tracks.length; i++) {
    await PlaylistTrack.create({
      playlistId: playlist.id,
      trackId: tracks[i].id,
      position: i
    });
  }

  console.log(`   ✅ Добавлено ${tracks.length} треков`);
  return playlist;
}

// Run if called directly
if (require.main === module) {
  createEditorialPlaylists()
    .then(() => {
      console.log('\n✅ Готово!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { createEditorialPlaylists };

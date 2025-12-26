/**
 * Простой импорт новых треков с KissVK (без браузера)
 * Добавляет существующие треки в плейлисты
 */
const db = require('./src/models');
const { Track, Playlist, PlaylistTrack } = db;
const { Op } = require('sequelize');

async function importNewTracks() {
  try {
    console.log('🎵 Импорт новых треков с KissVK...\n');

    // Получаем последние загруженные треки KissVK
    const newTracks = await Track.findAll({
      limit: 200,
      order: [['createdAt', 'DESC']]
    });

    console.log(`📥 Получено ${newTracks.length} последних треков\n`);

    // Создаем/обновляем плейлист "Новые Треки"
    const newTracksPlaylist = await Playlist.findOne({
      where: { name: 'Новые Треки' }
    });

    if (newTracksPlaylist) {
      // Очищаем старые треки
      await PlaylistTrack.destroy({
        where: { playlistId: newTracksPlaylist.id }
      });

      // Добавляем новые
      for (let i = 0; i < Math.min(50, newTracks.length); i++) {
        await PlaylistTrack.create({
          playlistId: newTracksPlaylist.id,
          trackId: newTracks[i].id,
          position: i + 1
        });
      }

      console.log(`✅ Плейлист "Новые Треки": ${Math.min(50, newTracks.length)} треков\n`);
    }

    // Обновляем "KissVK Хиты" - популярные треки
    const hitsPlaylist = await Playlist.findOne({
      where: { name: 'KissVK Хиты' }
    });

    if (hitsPlaylist) {
      const popularTracks = await Track.findAll({
        limit: 100,
        order: [['createdAt', 'DESC']]
      });

      await PlaylistTrack.destroy({
        where: { playlistId: hitsPlaylist.id }
      });

      for (let i = 0; i < Math.min(50, popularTracks.length); i++) {
        await PlaylistTrack.create({
          playlistId: hitsPlaylist.id,
          trackId: popularTracks[i].id,
          position: i + 1
        });
      }

      console.log(`✅ Плейлист "KissVK Хиты": ${Math.min(50, popularTracks.length)} треков\n`);
    }

    // Статистика
    const totalTracks = await Track.count();
    const totalPlaylists = await Playlist.count();
    const totalPlaylistTracks = await PlaylistTrack.count();

    console.log('📊 СТАТИСТИКА:');
    console.log(`   Всего треков: ${totalTracks}`);
    console.log(`   Всего плейлистов: ${totalPlaylists}`);
    console.log(`   Связей трек-плейлист: ${totalPlaylistTracks}\n`);

    console.log('✅ Импорт завершен успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

importNewTracks();

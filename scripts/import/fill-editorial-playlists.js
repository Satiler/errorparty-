/**
 * Дополнение плейлистов треками
 */
const { Playlist, PlaylistTrack, Track, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function fillPlaylists() {
  try {
    console.log('🎵 Дополнение плейлистов...\n');

    // Плейлист "Любимое" - добавляем популярные треки
    console.log('📝 Дополнение: ❤️ Любимое');
    const lovedPlaylist = await Playlist.findOne({ where: { name: '❤️ Любимое' } });
    if (lovedPlaylist) {
      const existingTracks = await PlaylistTrack.findAll({
        where: { playlistId: lovedPlaylist.id },
        attributes: ['trackId']
      });
      const existingIds = existingTracks.map(t => t.trackId);

      const additionalTracks = await Track.findAll({
        where: {
          streamUrl: { [Op.ne]: null },
          id: { [Op.notIn]: existingIds },
          playCount: { [Op.gte]: 5 }
        },
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: 42
      });

      if (additionalTracks.length > 0) {
        const playlistTracks = additionalTracks.map((track, index) => ({
          playlistId: lovedPlaylist.id,
          trackId: track.id,
          order: existingIds.length + index + 1
        }));
        await PlaylistTrack.bulkCreate(playlistTracks);
        console.log(`  ✅ Добавлено ${additionalTracks.length} треков\n`);
      }
    }

    // Плейлист "Популярные сейчас"
    console.log('📝 Дополнение: 🎧 Популярные сейчас');
    const popularPlaylist = await Playlist.findOne({ where: { name: '🎧 Популярные сейчас' } });
    if (popularPlaylist) {
      const existingTracks = await PlaylistTrack.findAll({
        where: { playlistId: popularPlaylist.id },
        attributes: ['trackId']
      });
      const existingIds = existingTracks.map(t => t.trackId);

      const additionalTracks = await Track.findAll({
        where: {
          streamUrl: { [Op.ne]: null },
          id: { [Op.notIn]: existingIds },
          playCount: { [Op.gte]: 3 }
        },
        order: [
          ['playCount', 'DESC'],
          ['updatedAt', 'DESC']
        ],
        limit: 32
      });

      if (additionalTracks.length > 0) {
        const playlistTracks = additionalTracks.map((track, index) => ({
          playlistId: popularPlaylist.id,
          trackId: track.id,
          order: existingIds.length + index + 1
        }));
        await PlaylistTrack.bulkCreate(playlistTracks);
        console.log(`  ✅ Добавлено ${additionalTracks.length} треков\n`);
      }
    }

    // Плейлист "Альбомы-шедевры" - добавляем треки с альбомов
    console.log('📝 Дополнение: 💎 Альбомы-шедевры');
    const albumsPlaylist = await Playlist.findOne({ where: { name: '💎 Альбомы-шедевры' } });
    if (albumsPlaylist) {
      // Берем случайные треки, где указан альбом
      const albumTracks = await Track.findAll({
        where: {
          streamUrl: { [Op.ne]: null },
          albumId: { [Op.ne]: null }
        },
        order: sequelize.random(),
        limit: 60
      });

      if (albumTracks.length > 0) {
        const playlistTracks = albumTracks.map((track, index) => ({
          playlistId: albumsPlaylist.id,
          trackId: track.id,
          order: index + 1
        }));
        await PlaylistTrack.bulkCreate(playlistTracks);
        console.log(`  ✅ Добавлено ${albumTracks.length} треков\n`);
      }
    }

    console.log('✅ Все плейлисты успешно дополнены!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

fillPlaylists();

/**
 * Проверка треков в плейлистах - напрямую через Sequelize
 */
const db = require('./src/models');
const { Track, Playlist, PlaylistTrack } = db;
const { sequelize, Op } = require('sequelize');

async function checkTracks() {
  try {
    console.log('🔍 Проверка треков в плейлистах\n');
    
    // Проверим прямую таблицу
    const playlistTracks = await PlaylistTrack.count();
    console.log(`📊 Всего связей PlaylistTrack: ${playlistTracks}\n`);

    // Проверим по плейлистам
    const playlists = await Playlist.findAll({
      where: { name: ['Топ 100 Треков', 'KissVK Хиты', 'Новые Треки'] }
    });

    for (const p of playlists) {
      const tracks = await PlaylistTrack.count({
        where: { playlistId: p.id }
      });
      console.log(`${p.name}: ${tracks} треков`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkTracks();

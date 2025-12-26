const { Playlist, Track, PlaylistTrack } = require('./src/models');
const { Sequelize } = require('sequelize');

async function checkPlaylists() {
  try {
    // Просто получаем плейлисты без JOIN
    const playlists = await Playlist.findAll({
      attributes: ['id', 'name', 'type'],
      order: [['createdAt', 'DESC']],
      raw: true
    });
    
    // Подсчитываем треки отдельно
    for (const p of playlists) {
      const count = await PlaylistTrack.count({ where: { playlistId: p.id } });
      p.trackCount = count;
    }

    console.log('\n=== ТЕКУЩИЕ ПЛЕЙЛИСТЫ ===\n');
    playlists.forEach(p => {
      console.log(`${p.id.toString().padStart(3)} | ${p.name.padEnd(40)} | ${p.type.padEnd(10)} | ${p.trackCount} треков`);
    });
    
    console.log(`\nВсего плейлистов: ${playlists.length}\n`);

    // Проверка артистов
    console.log('\n=== ПРОВЕРКА АРТИСТОВ ===\n');
    const artists = ['Miyagi', 'Eminem', 'Rihanna', 'Bones'];
    
    for (const artist of artists) {
      const playlist = await Playlist.findOne({
        where: { name: { [Sequelize.Op.iLike]: `%${artist}%` } }
      });
      
      if (playlist) {
        const count = await PlaylistTrack.count({ where: { playlistId: playlist.id } });
        console.log(`✅ ${artist}: плейлист "${playlist.name}" существует (${count} треков)`);
      } else {
        const tracks = await Track.count({
          where: { artist: { [Sequelize.Op.iLike]: `%${artist}%` } }
        });
        console.log(`❌ ${artist}: плейлист НЕ найден (в БД ${tracks} треков этого артиста)`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

checkPlaylists();

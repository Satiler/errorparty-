const { Playlist, Track, PlaylistTrack } = require('./src/models');
const { Op } = require('sequelize');

async function createArtistPlaylists() {
  try {
    const artists = [
      { name: 'Miyagi', emoji: '🎤', description: 'Лучшие треки от Miyagi' },
      { name: 'Eminem', emoji: '👑', description: 'Легенда рэпа - лучшие треки Eminem' },
      { name: 'Rihanna', emoji: '💎', description: 'Хиты мировой звезды Rihanna' },
      { name: 'Bones', emoji: '💀', description: 'Андеграунд от Bones' }
    ];

    console.log('\n=== СОЗДАНИЕ ПЛЕЙЛИСТОВ АРТИСТОВ ===\n');

    for (const artist of artists) {
      // Ищем треки артиста
      const tracks = await Track.findAll({
        where: {
          [Op.or]: [
            { artist: { [Op.iLike]: `%${artist.name}%` } },
            { title: { [Op.iLike]: `%${artist.name}%` } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      if (tracks.length === 0) {
        console.log(`⏭️  ${artist.name}: треков не найдено, пропускаем`);
        continue;
      }

      // Проверяем существующий плейлист
      let playlist = await Playlist.findOne({
        where: { 
          name: { [Op.iLike]: `%${artist.name}%` },
          type: 'editorial'
        }
      });

      if (playlist) {
        console.log(`♻️  ${artist.name}: плейлист "${playlist.name}" уже существует, обновляем`);
        
        // Удаляем старые связи
        await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });
      } else {
        // Создаем новый плейлист
        playlist = await Playlist.create({
          name: `${artist.emoji} ${artist.name} - Хиты`,
          description: artist.description,
          type: 'editorial',
          coverImage: tracks[0].coverUrl || null
        });
        console.log(`✅ ${artist.name}: создан новый плейлист "${playlist.name}"`);
      }

      // Добавляем треки
      const playlistTracks = tracks.map((track, index) => ({
        playlistId: playlist.id,
        trackId: track.id,
        position: index
      }));

      await PlaylistTrack.bulkCreate(playlistTracks);
      console.log(`   └─ Добавлено ${tracks.length} треков`);
    }

    console.log('\n✅ ГОТОВО!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createArtistPlaylists();

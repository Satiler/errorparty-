/**
 * Проверка созданных плейлистов
 */
const { Playlist, PlaylistTrack, Track } = require('./src/models');

async function checkPlaylists() {
  try {
    const playlists = await Playlist.findAll({
      where: { type: 'editorial' },
      include: [{
        model: PlaylistTrack,
        as: 'tracks',
        include: [{
          model: Track,
          as: 'track',
          attributes: ['id', 'title', 'artist']
        }]
      }],
      order: [['id', 'ASC']]
    });

    console.log(`\n📋 Найдено плейлистов: ${playlists.length}\n`);

    playlists.forEach((p, index) => {
      const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
      const trackCount = p.tracks?.length || 0;
      
      console.log(`${index + 1}. ${p.name}`);
      console.log(`   Описание: ${p.description}`);
      console.log(`   Треков: ${trackCount}`);
      console.log(`   Приоритет: ${meta.priority || 'не указан'}`);
      console.log(`   Публичный: ${p.isPublic ? 'Да' : 'Нет'}`);
      
      if (trackCount > 0 && trackCount <= 5) {
        console.log(`   Первые треки:`);
        p.tracks.slice(0, 3).forEach((pt, i) => {
          if (pt.track) {
            console.log(`     ${i + 1}. ${pt.track.artist} - ${pt.track.title}`);
          }
        });
      }
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkPlaylists();

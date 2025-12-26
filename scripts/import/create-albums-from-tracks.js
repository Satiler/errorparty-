/**
 * Создание альбомов из загруженных треков по исполнителям
 * Группирует треки по artist и создает для каждого исполнителя альбом
 */

const { Track, Album } = require('./src/models');
const { Op } = require('sequelize');

async function createAlbumsFromTracks() {
  try {
    console.log('🎵 Начинаем формирование альбомов из треков...\n');

    // Получаем все треки без альбома
    const tracksWithoutAlbum = await Track.findAll({
      where: {
        albumId: null,
        artist: {
          [Op.ne]: null
        }
      },
      order: [['artist', 'ASC'], ['title', 'ASC']]
    });

    console.log(`📊 Найдено треков без альбома: ${tracksWithoutAlbum.length}\n`);

    if (tracksWithoutAlbum.length === 0) {
      console.log('✅ Все треки уже имеют альбомы');
      return;
    }

    // Группируем треки по исполнителям
    const tracksByArtist = {};
    
    tracksWithoutAlbum.forEach(track => {
      const artist = track.artist.trim();
      if (!tracksByArtist[artist]) {
        tracksByArtist[artist] = [];
      }
      tracksByArtist[artist].push(track);
    });

    console.log(`👥 Найдено уникальных исполнителей: ${Object.keys(tracksByArtist).length}\n`);

    let createdAlbums = 0;
    let updatedTracks = 0;

    // Создаем альбомы для каждого исполнителя
    for (const [artist, tracks] of Object.entries(tracksByArtist)) {
      try {
        console.log(`\n🎤 Обрабатываем: ${artist} (${tracks.length} треков)`);

        // Проверяем, есть ли уже альбом для этого исполнителя
        let album = await Album.findOne({
          where: {
            artist: artist,
            title: {
              [Op.or]: [
                `${artist} - Сборник`,
                `Сборник ${artist}`,
                artist
              ]
            }
          }
        });

        // Если альбома нет, создаем новый
        if (!album) {
          const albumTitle = `${artist} - Сборник`;
          
          // Берем обложку первого трека (если есть)
          const coverUrl = tracks.find(t => t.coverUrl)?.coverUrl || null;
          
          album = await Album.create({
            title: albumTitle,
            artist: artist,
            coverUrl: coverUrl,
            releaseYear: new Date().getFullYear(),
            genre: tracks[0].genre || 'Various',
            trackCount: tracks.length,
            isPublic: true,
            provider: tracks[0].provider || 'kissvk',
            description: `Сборник треков исполнителя ${artist}`
          });

          console.log(`   ✅ Создан альбом: "${albumTitle}" (ID: ${album.id})`);
          createdAlbums++;
        } else {
          console.log(`   ℹ️ Альбом уже существует: "${album.title}" (ID: ${album.id})`);
        }

        // Привязываем треки к альбому
        for (const track of tracks) {
          await track.update({
            albumId: album.id
          });
          updatedTracks++;
        }

        // Обновляем количество треков в альбоме
        const totalTracksInAlbum = await Track.count({
          where: { albumId: album.id }
        });

        await album.update({
          trackCount: totalTracksInAlbum
        });

        console.log(`   ✅ Привязано треков: ${tracks.length} (всего в альбоме: ${totalTracksInAlbum})`);

      } catch (error) {
        console.error(`   ❌ Ошибка при обработке ${artist}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Создано новых альбомов: ${createdAlbums}`);
    console.log(`✅ Обновлено треков: ${updatedTracks}`);
    console.log(`✅ Обработано исполнителей: ${Object.keys(tracksByArtist).length}`);
    
    // Финальная статистика
    const totalAlbums = await Album.count();
    const totalTracks = await Track.count();
    const tracksWithAlbums = await Track.count({ where: { albumId: { [Op.ne]: null } } });
    const tracksWithoutAlbums = await Track.count({ where: { albumId: null } });

    console.log('\n' + '='.repeat(60));
    console.log('📈 ОБЩАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`Всего альбомов в базе: ${totalAlbums}`);
    console.log(`Всего треков в базе: ${totalTracks}`);
    console.log(`Треков с альбомами: ${tracksWithAlbums}`);
    console.log(`Треков без альбомов: ${tracksWithoutAlbums}`);
    console.log('='.repeat(60));

    console.log('\n✅ Готово!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}

// Запуск
createAlbumsFromTracks()
  .then(() => {
    console.log('\n👋 Завершение работы');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

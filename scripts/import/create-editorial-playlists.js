/**
 * Создание редакционных плейлистов
 */
const { Playlist, PlaylistTrack, Track, sequelize } = require('./src/models');
const { Op } = require('sequelize');

const EDITORIAL_PLAYLISTS = [
  {
    name: '🔥 Топ хиты',
    description: 'Самые популярные треки прямо сейчас',
    type: 'editorial',
    priority: 1,
    genre: null,
    trackCount: 50
  },
  {
    name: '🎸 Рок',
    description: 'Лучшие рок-треки всех времён',
    type: 'editorial',
    priority: 2,
    genre: 'Rock',
    trackCount: 30
  },
  {
    name: '🎵 Поп',
    description: 'Популярная музыка для всех',
    type: 'editorial',
    priority: 3,
    genre: 'Pop',
    trackCount: 30
  },
  {
    name: '🎹 Электроника',
    description: 'Электронная музыка и танцевальные треки',
    type: 'editorial',
    priority: 4,
    genre: 'Electronic',
    trackCount: 30
  },
  {
    name: '🎤 Хип-Хоп',
    description: 'Лучшее из мира хип-хопа и рэпа',
    type: 'editorial',
    priority: 5,
    genre: 'Hip-Hop',
    trackCount: 30
  },
  {
    name: '🎼 Классика',
    description: 'Классическая музыка великих композиторов',
    type: 'editorial',
    priority: 6,
    genre: 'Classical',
    trackCount: 25
  },
  {
    name: '🎺 Джаз',
    description: 'Джазовые композиции для настроения',
    type: 'editorial',
    priority: 7,
    genre: 'Jazz',
    trackCount: 25
  },
  {
    name: '🌍 Мировая музыка',
    description: 'Музыка со всего мира',
    type: 'editorial',
    priority: 8,
    genre: 'World',
    trackCount: 20
  }
];

async function createEditorialPlaylists() {
  try {
    console.log('🎵 Создание редакционных плейлистов...\n');

    for (const playlistData of EDITORIAL_PLAYLISTS) {
      const { name, description, type, priority, genre, trackCount } = playlistData;
      
      console.log(`📝 Обработка: ${name}`);

      // Проверяем существование
      let playlist = await Playlist.findOne({
        where: {
          name,
          metadata: {
            type
          }
        }
      });

      if (!playlist) {
        // Создаём новый плейлист
        playlist = await Playlist.create({
          name,
          description,
          isPublic: true,
          type: 'editorial',
          metadata: {
            type,
            priority,
            genre
          }
        });
        console.log(`  ✅ Создан плейлист ID: ${playlist.id}`);
      } else {
        console.log(`  ℹ️  Плейлист уже существует ID: ${playlist.id}`);
        
        // Обновляем метаданные
        await playlist.update({
          description,
          metadata: {
            type,
            priority,
            genre
          }
        });
      }

      // Получаем треки для плейлиста
      const where = {
        isPublic: true,
        streamUrl: { [Op.ne]: null }
      };

      if (genre) {
        where.genre = { [Op.iLike]: `%${genre}%` };
      }

      const tracks = await Track.findAll({
        where,
        limit: trackCount,
        order: [
          ['playCount', 'DESC'],
          ['likeCount', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });

      console.log(`  🎵 Найдено треков: ${tracks.length}`);

      if (tracks.length > 0) {
        // Удаляем старые треки из плейлиста
        await PlaylistTrack.destroy({
          where: { playlistId: playlist.id }
        });

        // Добавляем новые треки
        const playlistTracks = tracks.map((track, index) => ({
          playlistId: playlist.id,
          trackId: track.id,
          position: index + 1
        }));

        await PlaylistTrack.bulkCreate(playlistTracks);
        console.log(`  ✅ Добавлено треков: ${playlistTracks.length}`);
      } else {
        console.log(`  ⚠️  Треки не найдены`);
      }

      console.log('');
    }

    // Статистика
    const totalPlaylists = await Playlist.count({
      where: {
        metadata: {
          type: 'editorial'
        }
      }
    });

    const totalTracks = await PlaylistTrack.count({
      include: [{
        model: Playlist,
        as: 'playlist',
        where: {
          metadata: {
            type: 'editorial'
          }
        }
      }]
    });

    console.log('\n📊 Статистика:');
    console.log(`  📁 Всего редакционных плейлистов: ${totalPlaylists}`);
    console.log(`  🎵 Всего треков в плейлистах: ${totalTracks}`);
    console.log('\n✅ Готово!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}

// Запуск
if (require.main === module) {
  createEditorialPlaylists()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createEditorialPlaylists };

/**
 * Пересоздание редакционных плейлистов с улучшенными алгоритмами
 */
const { Playlist, PlaylistTrack, Track, Album, sequelize } = require('./src/models');
const { Op } = require('sequelize');

const SYSTEM_USER_ID = 4;

const PLAYLISTS_CONFIG = [
  {
    name: '🔥 Топ 100',
    description: 'Самые популярные треки всех времён',
    type: 'editorial',
    priority: 1,
    query: {
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 100
    }
  },
  {
    name: '🆕 Свежее',
    description: 'Новые треки последних дней',
    type: 'editorial',
    priority: 2,
    query: {
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    }
  },
  {
    name: '❤️ Любимое',
    description: 'Треки с наибольшим количеством лайков',
    type: 'editorial',
    priority: 3,
    query: {
      where: {
        likeCount: { [Op.gt]: 0 }
      },
      order: [
        ['likeCount', 'DESC'],
        ['playCount', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '🎧 Популярные сейчас',
    description: 'Треки, которые слушают прямо сейчас',
    type: 'editorial',
    priority: 4,
    query: {
      where: {
        playCount: { [Op.gt]: 10 }
      },
      order: [
        ['playCount', 'DESC'],
        ['updatedAt', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '💎 Альбомы-шедевры',
    description: 'Лучшие треки из популярных альбомов',
    type: 'editorial',
    priority: 5,
    albumBased: true,
    query: {
      limit: 60
    }
  },
  {
    name: '🌟 Открытия',
    description: 'Малоизвестные, но качественные треки',
    type: 'editorial',
    priority: 6,
    query: {
      where: {
        playCount: { [Op.between]: [1, 50] },
        duration: { [Op.between]: [120, 420] } // От 2 до 7 минут
      },
      order: sequelize.random(),
      limit: 40
    }
  },
  {
    name: '🎸 Рок коллекция',
    description: 'Лучшее из мира рока',
    type: 'editorial',
    priority: 7,
    genres: ['Rock', 'Hard Rock', 'Alternative Rock', 'Indie Rock', 'Metal'],
    query: {
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '🎵 Поп-хиты',
    description: 'Популярные поп-композиции',
    type: 'editorial',
    priority: 8,
    genres: ['Pop', 'Indie Pop', 'Synth Pop', 'Dance Pop'],
    query: {
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '🎹 Электронная музыка',
    description: 'Электроника и EDM',
    type: 'editorial',
    priority: 9,
    genres: ['Electronic', 'House', 'Techno', 'Trance', 'Dubstep', 'EDM'],
    query: {
      order: [
        ['playCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '🎤 Хип-Хоп и Рэп',
    description: 'Лучшее из хип-хопа',
    type: 'editorial',
    priority: 10,
    genres: ['Hip-Hop', 'Rap', 'Trap', 'R&B'],
    query: {
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC']
      ],
      limit: 50
    }
  },
  {
    name: '😌 Релакс и чилл',
    description: 'Спокойная музыка для отдыха',
    type: 'editorial',
    priority: 11,
    genres: ['Ambient', 'Chillout', 'Lounge', 'Downtempo'],
    query: {
      where: {
        duration: { [Op.gte]: 180 } // Минимум 3 минуты
      },
      order: sequelize.random(),
      limit: 40
    }
  },
  {
    name: '⚡ Энергия',
    description: 'Заряд бодрости и энергии',
    type: 'editorial',
    priority: 12,
    genres: ['Dance', 'House', 'Electro', 'Drum & Bass'],
    query: {
      where: {
        duration: { [Op.between]: [150, 300] }
      },
      order: [
        ['playCount', 'DESC'],
        sequelize.random()
      ],
      limit: 50
    }
  }
];

async function rebuildEditorialPlaylists() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🎵 Пересоздание редакционных плейлистов...\n');

    for (const config of PLAYLISTS_CONFIG) {
      console.log(`\n📝 Обработка: ${config.name}`);

      // Удаляем старый плейлист если есть
      await Playlist.destroy({
        where: {
          name: config.name,
          type: 'editorial'
        },
        transaction
      });

      // Создаём новый плейлист
      const playlist = await Playlist.create({
        name: config.name,
        description: config.description,
        userId: SYSTEM_USER_ID,
        isPublic: true,
        type: 'editorial',
        metadata: {
          priority: config.priority
        }
      }, { transaction });

      console.log(`  ✅ Создан плейлист ID: ${playlist.id}`);

      // Получаем треки
      let tracks = [];

      if (config.albumBased) {
        // Получаем треки из популярных альбомов
        const albums = await Album.findAll({
          order: [['totalTracks', 'DESC']],
          limit: 10,
          attributes: ['id'],
          transaction
        });

        const albumIds = albums.map(a => a.id);
        
        tracks = await Track.findAll({
          where: {
            albumId: { [Op.in]: albumIds },
            streamUrl: { [Op.ne]: null }
          },
          order: sequelize.random(),
          limit: config.query.limit,
          transaction
        });
      } else if (config.genres) {
        // Поиск по жанрам
        tracks = await Track.findAll({
          where: {
            [Op.or]: config.genres.map(genre => ({
              [Op.or]: [
                { artist: { [Op.iLike]: `%${genre}%` } },
                { title: { [Op.iLike]: `%${genre}%` } }
              ]
            })),
            streamUrl: { [Op.ne]: null },
            ...config.query.where
          },
          order: config.query.order,
          limit: config.query.limit,
          transaction
        });

        // Если мало треков, добавляем случайные
        if (tracks.length < config.query.limit / 2) {
          const additionalTracks = await Track.findAll({
            where: {
              streamUrl: { [Op.ne]: null },
              id: { [Op.notIn]: tracks.map(t => t.id) }
            },
            order: sequelize.random(),
            limit: config.query.limit - tracks.length,
            transaction
          });
          tracks = [...tracks, ...additionalTracks];
        }
      } else {
        // Обычный поиск
        tracks = await Track.findAll({
          where: {
            streamUrl: { [Op.ne]: null },
            ...config.query.where
          },
          order: config.query.order,
          limit: config.query.limit,
          transaction
        });
      }

      console.log(`  🎵 Найдено треков: ${tracks.length}`);

      // Добавляем треки в плейлист
      if (tracks.length > 0) {
        const playlistTracks = tracks.map((track, index) => ({
          playlistId: playlist.id,
          trackId: track.id,
          order: index + 1
        }));

        await PlaylistTrack.bulkCreate(playlistTracks, { transaction });
        console.log(`  ✅ Добавлено ${tracks.length} треков`);
      } else {
        console.log(`  ⚠️  Треки не найдены`);
      }
    }

    await transaction.commit();
    console.log('\n✅ Все редакционные плейлисты успешно пересозданы!');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Ошибка при создании плейлистов:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Запуск
rebuildEditorialPlaylists()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

/**
 * Контроллер личных плейлистов (My Wave, Discovery Weekly, etc)
 */
const {
  Playlist,
  PlaylistTrack,
  Track,
  User,
  Album
} = require('../../models');
const { Op, Sequelize } = require('sequelize');

/**
 * GET /api/music/personal-playlists
 * Получить личные плейлисты пользователя
 */
exports.getPersonalPlaylists = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Всегда добавляем "Моя волна" в начало списка как специальную карточку
    const myWaveCard = {
      id: 'my-wave',
      name: 'Моя волна',
      description: 'Бесконечный поток музыки под твой вкус',
      slug: 'my-wave',
      icon: '🌊',
      image: null,
      trackCount: '∞',
      isSpecial: true,
      url: '/music/wave',
      coverPath: null,
      isSystem: false,
      isPersonal: true
    };

    // Если пользователь не авторизован, возвращаем только системные плейлисты + Моя волна
    if (!userId) {
      const systemPlaylists = await Playlist.findAll({
        where: {
          isSystem: true,
          isPublic: true
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar']
          }
        ],
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT COUNT(*)
                FROM "PlaylistTracks" AS pt
                WHERE pt."playlistId" = "Playlist"."id"
              )`),
              'trackCount'
            ]
          ]
        },
        limit: 20,
        order: [['createdAt', 'DESC']]
      });

      // Преобразуем coverPath в image и получаем trackCount
      const playlists = systemPlaylists.map(p => {
        const plain = p.get({ plain: true });
        return {
          ...plain,
          image: plain.coverPath,
          coverPath: undefined
        };
      });

      return res.json({
        success: true,
        playlists: [myWaveCard, ...playlists]
      });
    }

    // Для авторизованного пользователя создаём/обновляем личные плейлисты
    const personalPlaylists = await ensurePersonalPlaylists(userId);
    
    res.json({
      success: true,
      playlists: [myWaveCard, ...personalPlaylists]
    });
  } catch (error) {
    console.error('Error getting personal playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to get playlists' });
  }
};

/**
 * Создание личных плейлистов пользователя
 */
async function ensurePersonalPlaylists(userId) {
  const playlistConfigs = [
    // "Моя волна" теперь не создаётся как плейлист - это специальная карточка
    {
      name: 'Новое на KissVK',
      description: 'Самые свежие треки из чартов',
      slug: 'new-tracks',
      icon: '✨',
      generator: generateNewTracks
    },
    {
      name: 'Хиты',
      description: 'Самые популярные треки',
      slug: 'hits',
      icon: '🔥',
      generator: generateHits
    },
    {
      name: 'Премьера',
      description: 'Премьеры и авторские сборки',
      slug: 'premiere',
      icon: '🎬',
      generator: generatePremiere
    },
    {
      name: 'Новое',
      description: 'Недавно добавленные треки',
      slug: 'recently-added',
      icon: '🆕',
      generator: generateRecentlyAdded
    }
  ];

  const personalPlaylists = [];

  for (const config of playlistConfigs) {
    let playlist = await Playlist.findOne({
      where: {
        name: config.name,
        userId,
        isPersonal: true
      }
    });

    if (!playlist) {
      playlist = await Playlist.create({
        name: config.name,
        description: config.description,
        userId,
        isPersonal: true,
        isPublic: false,
        coverPath: null
      });
    }

    // Регенерируем треки в плейлист
    const tracks = await config.generator();
    
    // Очищаем старые треки
    await PlaylistTrack.destroy({ where: { playlistId: playlist.id } });

    // Добавляем новые треки
    if (tracks.length > 0) {
      await PlaylistTrack.bulkCreate(
        tracks.map((trackId, index) => ({
          playlistId: playlist.id,
          trackId,
          position: index
        }))
      );
    }

    const trackCount = await PlaylistTrack.count({
      where: { playlistId: playlist.id }
    });

    // Получаем картинку из первого трека если нет coverPath
    let image = playlist.coverPath;
    if (!image && tracks.length > 0) {
      try {
        const firstTrack = await Track.findByPk(tracks[0], {
          include: [{ model: Album, attributes: ['coverUrl'] }]
        });
        if (firstTrack && firstTrack.Album) {
          image = firstTrack.Album.coverUrl;
        }
      } catch (e) {
        console.log('Could not fetch track cover for playlist', playlist.id);
      }
    }

    personalPlaylists.push({
      ...playlist.toJSON(),
      image,
      trackCount,
      icon: config.icon,
      slug: config.slug
    });
  }

  return personalPlaylists;
}

/**
 * Генератор "Моя волна" - микс популярных + новых треков
 */
async function generateMyWave() {
  const popularTracks = await Track.findAll({
    where: {
      streamUrl: { [Op.notLike]: 'encrypted:%' },
      [Op.or]: [
        { provider: 'kissvk' },
        { provider: { [Op.not]: null } }
      ]
    },
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 150,
    raw: true
  });

  return popularTracks.map(t => t.id);
}

/**
 * Генератор "Новое на KissVK"
 */
async function generateNewTracks() {
  const newTracks = await Track.findAll({
    where: {
      provider: 'kissvk',
      streamUrl: { [Op.notLike]: 'encrypted:%' }
    },
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 100,
    raw: true
  });

  return newTracks.map(t => t.id);
}

/**
 * Генератор "Хиты"
 */
async function generateHits() {
  const hits = await Track.findAll({
    attributes: ['id'],
    where: {
      streamUrl: { [Op.notLike]: 'encrypted:%' }
    },
    order: [['createdAt', 'DESC']],
    limit: 80,
    raw: true
  });

  return hits.map(t => t.id);
}

/**
 * Генератор "Премьера"
 */
async function generatePremiere() {
  // Самые свежие альбомы
  const recentAlbums = await Album.findAll({
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 5,
    raw: true
  });

  const albumIds = recentAlbums.map(a => a.id);

  if (albumIds.length === 0) {
    return [];
  }

  const premiereTracks = await Track.findAll({
    where: {
      albumId: { [Op.in]: albumIds },
      streamUrl: { [Op.notLike]: 'encrypted:%' }
    },
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 50,
    raw: true
  });

  return premiereTracks.map(t => t.id);
}

/**
 * Генератор "Недавно добавлено"
 */
async function generateRecentlyAdded() {
  const recent = await Track.findAll({
    where: {
      streamUrl: { [Op.notLike]: 'encrypted:%' }
    },
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit: 100,
    raw: true
  });

  return recent.map(t => t.id);
}

/**
 * GET /api/music/personal-playlists/:slug
 * Получить плейлист с треками
 */
exports.getPersonalPlaylist = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const slugMap = {
      'my-wave': 'Моя волна',
      'new-tracks': 'Новое на KissVK',
      'hits': 'Хиты',
      'premiere': 'Премьера',
      'recently-added': 'Недавно добавлено'
    };

    const playlistName = slugMap[slug];
    if (!playlistName) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    const playlist = await Playlist.findOne({
      where: {
        name: playlistName,
        userId,
        isPersonal: true
      },
      include: [
        {
          model: PlaylistTrack,
          include: [
            {
              model: Track,
              include: [
                {
                  model: Album,
                  attributes: ['id', 'title', 'image', 'artist']
                },
                {
                  model: User,
                  attributes: ['id', 'username', 'avatar']
                }
              ]
            }
          ],
          order: [['position', 'ASC']]
        }
      ]
    });

    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    const tracks = playlist.PlaylistTracks.map(pt => pt.Track);

    res.json({
      success: true,
      playlist: {
        ...playlist.toJSON(),
        tracks,
        trackCount: tracks.length
      }
    });
  } catch (error) {
    console.error('Error getting personal playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to get playlist' });
  }
};

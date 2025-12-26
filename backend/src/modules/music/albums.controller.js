/**
 * Albums Controller
 * Контроллеры для работы с альбомами
 */
const { Album, Track, User, AlbumLike, AlbumComment } = require('../../models');
const { Op } = require('sequelize');

/**
 * GET /api/music/albums
 * Получить список альбомов
 */
exports.getAlbums = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      artist,
      search,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isPublic: true };

    if (genre) where.genre = genre;
    if (artist) where.artist = { [Op.iLike]: `%${artist}%` };
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { artist: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows: albums, count } = await Album.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order]],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Track,
          as: 'tracks',
          limit: 1,
          attributes: ['id']
        }
      ]
    });

    res.json({
      success: true,
      albums,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch albums' });
  }
};

/**
 * GET /api/music/albums/:id
 * Получить информацию об альбоме
 */
exports.getAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Track,
          as: 'tracks',
          order: [['trackNumber', 'ASC']],
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'avatar']
          }]
        }
      ]
    });

    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    // Increment view count
    await album.increment('viewCount');

    // Check if user liked
    let isLiked = false;
    if (req.user) {
      const like = await AlbumLike.findOne({
        where: { userId: req.user.id, albumId: id }
      });
      isLiked = !!like;
    }

    res.json({
      success: true,
      album: {
        ...album.toJSON(),
        isLiked,
        // Фронт ожидает coverPath, добавляем его из coverUrl или coverPath
        coverPath: album.coverUrl || album.coverPath
      }
    });
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch album' });
  }
};

/**
 * POST /api/music/albums
 * Создать новый альбом
 */
exports.createAlbum = async (req, res) => {
  try {
    const { title, artist, description, releaseYear, genre, coverPath } = req.body;

    if (!title || !artist) {
      return res.status(400).json({
        success: false,
        error: 'Title and artist are required'
      });
    }

    const album = await Album.create({
      title,
      artist,
      description,
      releaseYear,
      genre,
      coverPath,
      createdBy: req.user.id,
      isPublic: true
    });

    res.json({ success: true, album });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ success: false, error: 'Failed to create album' });
  }
};

/**
 * PUT /api/music/albums/:id
 * Обновить альбом
 */
exports.updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, description, releaseYear, genre, coverPath, isPublic } = req.body;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    if (album.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await album.update({
      title,
      artist,
      description,
      releaseYear,
      genre,
      coverPath,
      isPublic
    });

    res.json({ success: true, album });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ success: false, error: 'Failed to update album' });
  }
};

/**
 * DELETE /api/music/albums/:id
 * Удалить альбом
 */
exports.deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    if (album.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await album.destroy();
    res.json({ success: true, message: 'Album deleted' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ success: false, error: 'Failed to delete album' });
  }
};

/**
 * POST /api/music/albums/:id/like
 * Лайкнуть альбом
 */
exports.likeAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    const [like, created] = await AlbumLike.findOrCreate({
      where: { userId, albumId: id }
    });

    if (created) {
      await album.increment('likeCount');
    }

    res.json({ success: true, liked: true });
  } catch (error) {
    console.error('Error liking album:', error);
    res.status(500).json({ success: false, error: 'Failed to like album' });
  }
};

/**
 * DELETE /api/music/albums/:id/like
 * Убрать лайк с альбома
 */
exports.unlikeAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await AlbumLike.destroy({
      where: { userId, albumId: id }
    });

    if (deleted) {
      await Album.decrement('likeCount', { where: { id } });
    }

    res.json({ success: true, liked: false });
  } catch (error) {
    console.error('Error unliking album:', error);
    res.status(500).json({ success: false, error: 'Failed to unlike album' });
  }
};

/**
 * GET /api/music/albums/:id/comments
 * Получить комментарии к альбому
 */
exports.getAlbumComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: comments, count } = await AlbumComment.findAndCountAll({
      where: { albumId: id, parentId: null },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: AlbumComment,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatar']
          }]
        }
      ]
    });

    res.json({
      success: true,
      comments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
};

/**
 * POST /api/music/albums/:id/comments
 * Добавить комментарий к альбому
 */
exports.addAlbumComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    const comment = await AlbumComment.create({
      albumId: id,
      userId: req.user.id,
      content: content.trim(),
      parentId: parentId || null
    });

    const fullComment = await AlbumComment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({ success: true, comment: fullComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};

/**
 * GET /api/music/albums/:id/similar
 * Получить похожие альбомы
 */
exports.getSimilarAlbums = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album not found' });
    }

    // Поиск похожих альбомов по жанру и исполнителю
    const similar = await Album.findAll({
      where: {
        id: { [Op.ne]: id },
        isPublic: true,
        [Op.or]: [
          { genre: album.genre },
          { artist: album.artist }
        ]
      },
      limit: parseInt(limit),
      order: [['playCount', 'DESC']],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({ success: true, albums: similar });
  } catch (error) {
    console.error('Error fetching similar albums:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch similar albums' });
  }
};

module.exports = exports;

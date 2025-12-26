/**
 * Playlists Enhanced Controller
 * Расширенные контроллеры для подборок (подписки, комментарии, лайки)
 */
const {
  Playlist,
  PlaylistTrack,
  Track,
  User,
  Album,
  PlaylistSubscription,
  PlaylistLike,
  PlaylistComment
} = require('../../models');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * POST /api/music/playlists/:id/subscribe
 * Подписаться на подборку
 */
exports.subscribePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    const [subscription, created] = await PlaylistSubscription.findOrCreate({
      where: { userId, playlistId: id }
    });

    if (created) {
      await playlist.increment('subscriberCount');
    }

    res.json({ success: true, subscribed: true });
  } catch (error) {
    console.error('Error subscribing to playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
};

/**
 * DELETE /api/music/playlists/:id/subscribe
 * Отписаться от подборки
 */
exports.unsubscribePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await PlaylistSubscription.destroy({
      where: { userId, playlistId: id }
    });

    if (deleted) {
      await Playlist.decrement('subscriberCount', { where: { id } });
    }

    res.json({ success: true, subscribed: false });
  } catch (error) {
    console.error('Error unsubscribing from playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
};

/**
 * POST /api/music/playlists/:id/like
 * Лайкнуть подборку
 */
exports.likePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    const [like, created] = await PlaylistLike.findOrCreate({
      where: { userId, playlistId: id }
    });

    if (created) {
      await playlist.increment('likeCount');
    }

    res.json({ success: true, liked: true });
  } catch (error) {
    console.error('Error liking playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to like playlist' });
  }
};

/**
 * DELETE /api/music/playlists/:id/like
 * Убрать лайк с подборки
 */
exports.unlikePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await PlaylistLike.destroy({
      where: { userId, playlistId: id }
    });

    if (deleted) {
      await Playlist.decrement('likeCount', { where: { id } });
    }

    res.json({ success: true, liked: false });
  } catch (error) {
    console.error('Error unliking playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to unlike playlist' });
  }
};

/**
 * GET /api/music/playlists/:id/comments
 * Получить комментарии к подборке
 */
exports.getPlaylistComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: comments, count } = await PlaylistComment.findAndCountAll({
      where: { playlistId: id, parentId: null },
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
          model: PlaylistComment,
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
 * POST /api/music/playlists/:id/comments
 * Добавить комментарий к подборке
 */
exports.addPlaylistComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    const comment = await PlaylistComment.create({
      playlistId: id,
      userId: req.user.id,
      content: content.trim(),
      parentId: parentId || null
    });

    const fullComment = await PlaylistComment.findByPk(comment.id, {
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
 * GET /api/music/playlists/editorial
 * Получить редакционные подборки
 */
exports.getEditorialPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔍 Getting editorial playlists...');

    // Используем raw query для фильтрации по типу (включая chart, new, editorial)
    const query = `
      SELECT p.*, 
             (SELECT COUNT(*) FROM "PlaylistTracks" WHERE "playlistId" = p.id) as "trackCount"
      FROM "Playlists" p
      WHERE p.type IN ('editorial', 'chart', 'new') AND p."isPublic" = true
      ORDER BY (p.metadata->>'priority')::integer ASC NULLS LAST, p."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Playlists"
      WHERE type IN ('editorial', 'chart', 'new') AND "isPublic" = true
    `;

    console.log('📊 Executing playlist query...');
    const playlists = await sequelize.query(query, {
      replacements: { limit: parseInt(limit), offset },
      type: Sequelize.QueryTypes.SELECT
    });
    console.log(`✅ Found ${playlists.length} playlists`);

    console.log('📊 Executing count query...');
    const countResult = await sequelize.query(countQuery, {
      type: Sequelize.QueryTypes.SELECT
    });
    
    const count = countResult[0].count;
    console.log(`✅ Total count: ${count}`);

    // Получаем информацию о пользователях и картинки
    const playlistsWithUsers = await Promise.all(
      (Array.isArray(playlists) ? playlists : [playlists]).map(async (playlist) => {
        let user = null;
        // ВАЖНО: Проверяем и image, и coverPath
        let image = playlist.image || playlist.coverPath || null;

        console.log(`[Playlist ${playlist.id} "${playlist.name}"] Initial image: ${image}`);

        // Получаем пользователя если есть
        if (playlist.userId) {
          user = await User.findByPk(playlist.userId, {
            attributes: ['id', 'username', 'avatar', 'steamId']
          });
        }

        // Если нет image/coverPath, пытаемся получить картинку из первого трека в плейлисте
        if (!image) {
          try {
            const firstTrackQuery = `
              SELECT t."coverUrl" as "trackCoverUrl", a."coverUrl" as "albumCoverUrl"
              FROM "PlaylistTracks" pt
              LEFT JOIN "Tracks" t ON t.id = pt."trackId"
              LEFT JOIN "Albums" a ON a.id = t."albumId"
              WHERE pt."playlistId" = :playlistId
                AND (t."coverUrl" IS NOT NULL OR a."coverUrl" IS NOT NULL)
              ORDER BY pt."position" ASC
              LIMIT 1
            `;
            
            console.log(`[Playlist ${playlist.id}] Fetching cover from first track...`);
            const firstTrackResult = await sequelize.query(firstTrackQuery, {
              replacements: { playlistId: playlist.id },
              type: Sequelize.QueryTypes.SELECT
            });

            if (firstTrackResult && firstTrackResult.length > 0) {
              // Приоритет: coverUrl трека > coverUrl альбома
              image = firstTrackResult[0].trackCoverUrl || firstTrackResult[0].albumCoverUrl;
              console.log(`[Playlist ${playlist.id}] Found cover: ${image ? 'YES' : 'NO'} (track: ${!!firstTrackResult[0].trackCoverUrl}, album: ${!!firstTrackResult[0].albumCoverUrl})`);
            } else {
              console.log(`[Playlist ${playlist.id}] No tracks found`);
            }
          } catch (e) {
            console.error('Could not fetch track cover for playlist', playlist.id, ':', e.message);
          }
        }
        
        console.log(`[Playlist ${playlist.id}] Final image value from logic: ${image}`);
        console.log(`[Playlist ${playlist.id}] playlist.image from DB: ${playlist.image}`);
        
        const result = {
          ...playlist,
          user: user ? user.toJSON() : null
        };
        
        console.log(`[Playlist ${playlist.id}] After spread - result.image: ${result.image}, result.coverUrl: ${result.coverUrl}`);
        
        // ТОЛЬКО если нет image в плейлисте, используем найденную картинку
        // Это сохраняет градиенты и другие кастомные обложки
        if (!result.image) {
          result.image = image || null;
          result.coverUrl = image || null;
        } else {
          result.coverUrl = result.image;
        }
        
        console.log(`[Playlist ${playlist.id}] After assignment - result.image: ${result.image}, result.coverUrl: ${result.coverUrl}`);
        
        return result;
      })
    );

    console.log(`📤 Sending ${playlistsWithUsers.length} playlists to client`);

    // Запрещаем кэширование - всегда показываем актуальные editorial плейлисты
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json({
      success: true,
      playlists: playlistsWithUsers,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching editorial playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
};

/**
 * GET /api/music/playlists/user/:userId
 * Получить публичные подборки пользователя
 */
exports.getUserPublicPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: playlists, count } = await Playlist.findAndCountAll({
      where: { userId, isPublic: true },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({
      success: true,
      playlists,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
};

/**
 * GET /api/music/playlists/:id/similar
 * Получить похожие подборки
 */
exports.getSimilarPlaylists = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    // Поиск похожих подборок по тегам
    const similar = await Playlist.findAll({
      where: {
        id: { [Op.ne]: id },
        isPublic: true,
        tags: {
          [Op.overlap]: playlist.tags || []
        }
      },
      limit: parseInt(limit),
      order: [['subscriberCount', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({ success: true, playlists: similar });
  } catch (error) {
    console.error('Error fetching similar playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch similar playlists' });
  }
};

/**
 * GET /api/music/playlists/subscriptions
 * Получить подборки, на которые подписан пользователь
 */
exports.getSubscribedPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: subscriptions, count } = await PlaylistSubscription.findAndCountAll({
      where: { userId },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Playlist,
        as: 'playlist',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar']
        }]
      }]
    });

    const playlists = subscriptions.map(sub => sub.playlist);

    res.json({
      success: true,
      playlists,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscribed playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
};

module.exports = exports;

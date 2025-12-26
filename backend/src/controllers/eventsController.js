const { User, Meme, Quote } = require('../models');
const { Op } = require('sequelize');

/**
 * Get recent activity/events on the server
 */
exports.getRecentEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = [];

    // Get recent users (last 7 days)
    const recentUsers = await User.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: ['id', 'username', 'avatar', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5,
      raw: true
    });

    recentUsers.forEach(user => {
      events.push({
        type: 'user_joined',
        icon: '👋',
        title: 'Новый участник',
        description: `${user.username} присоединился к сообществу`,
        user: {
          username: user.username,
          avatar: user.avatar
        },
        timestamp: user.created_at,
        color: 'cyan'
      });
    });

    // Get recent memes (last 24 hours)
    const recentMemes = await Meme.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    recentMemes.forEach(meme => {
      events.push({
        type: 'meme_created',
        icon: '🎨',
        title: 'Новый мем',
        description: `${meme.author?.username || 'Аноним'} создал "${meme.title}"`,
        user: {
          username: meme.author?.username,
          avatar: meme.author?.avatar
        },
        meme: {
          id: meme.id,
          title: meme.title,
          imageUrl: meme.imageUrl
        },
        timestamp: meme.created_at,
        color: 'pink'
      });
    });

    // Get recent quotes (last 24 hours)
    const recentQuotes = await Quote.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: [{
        model: User,
        as: 'submitter',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      limit: 3
    });

    recentQuotes.forEach(quote => {
      events.push({
        type: 'quote_added',
        icon: '💬',
        title: 'Новая цитата',
        description: quote.text.length > 50 ? quote.text.substring(0, 50) + '...' : quote.text,
        user: {
          username: quote.submitter?.username,
          avatar: quote.submitter?.avatar
        },
        timestamp: quote.created_at,
        color: 'purple'
      });
    });

    // Sort all events by timestamp and limit
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedEvents = events.slice(0, limit);

    res.json({
      success: true,
      events: limitedEvents,
      total: events.length
    });
  } catch (error) {
    console.error('Get recent events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent events'
    });
  }
};

/**
 * Get summary statistics for homepage
 */
exports.getHomepageStats = async (req, res) => {
  try {
    const [totalUsers, totalMemes, totalQuotes] = await Promise.all([
      User.count(),
      Meme.count(),
      Quote.count()
    ]);

    // Calculate total online time
    const users = await User.findAll({
      attributes: ['total_online_time'],
      raw: true
    });
    const totalOnlineHours = users.reduce((sum, user) => sum + (user.total_online_time || 0), 0) / 3600;

    // Get users who joined this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.count({
      where: {
        created_at: {
          [Op.gte]: weekAgo
        }
      }
    });

    // Get memes created this week
    const memesThisWeek = await Meme.count({
      where: {
        created_at: {
          [Op.gte]: weekAgo
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalMemes,
        totalQuotes,
        totalOnlineHours: Math.floor(totalOnlineHours),
        newUsersThisWeek,
        memesThisWeek
      }
    });
  } catch (error) {
    console.error('Get homepage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage stats'
    });
  }
};

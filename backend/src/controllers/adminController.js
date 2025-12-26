const { Meme, User, Achievement, UserStats, UserActivity, MemeComment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { getSteamBot } = require('../services/steamBotService');
const steamCommunityService = require('../services/steamCommunityService');

// Получить все мемы для модерации
exports.getMemes = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: memes } = await Meme.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ 
      memes: memes.map(m => ({
        ...m.toJSON(),
        creator: m.author // Добавляем creator для фронтенда (дублируем author)
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ error: 'Ошибка при получении мемов' });
  }
};

// Одобрить мем
exports.approveMeme = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findByPk(id);
    if (!meme) {
      return res.status(404).json({ error: 'Мем не найден' });
    }

    meme.status = 'approved';
    await meme.save();

    res.json({ message: 'Мем одобрен', meme });
  } catch (error) {
    console.error('Error approving meme:', error);
    res.status(500).json({ error: 'Ошибка при одобрении мема' });
  }
};

// Отклонить мем
exports.rejectMeme = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findByPk(id);
    if (!meme) {
      return res.status(404).json({ error: 'Мем не найден' });
    }

    meme.status = 'rejected';
    await meme.save();

    res.json({ message: 'Мем отклонен', meme });
  } catch (error) {
    console.error('Error rejecting meme:', error);
    res.status(500).json({ error: 'Ошибка при отклонении мема' });
  }
};

// Удалить мем
exports.deleteMeme = async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findByPk(id);
    if (!meme) {
      return res.status(404).json({ error: 'Мем не найден' });
    }

    // Удаляем связанные комментарии и рейтинги
    await MemeComment.destroy({ where: { memeId: id } });
    
    // Удаляем мем
    await meme.destroy();

    res.json({ message: 'Мем удален' });
  } catch (error) {
    console.error('Error deleting meme:', error);
    res.status(500).json({ error: 'Ошибка при удалении мема' });
  }
};

// Получить всех пользователей
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, banned } = req.query;
    const offset = (page - 1) * limit;

    // Условия фильтрации
    const where = {};
    if (search) {
      where.username = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    if (role) {
      where.role = role;
    }
    if (banned !== undefined) {
      where.banned = banned === 'true';
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: ['id', 'username', 'steamId', 'avatar', 'role', 'banned', 'created_at', 'email', 'totalOnlineTime'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ 
      users: users.map(u => ({
        ...u.toJSON(),
        createdAt: u.created_at // Маппинг для фронтенда
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
};

// Обновить роль пользователя
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { value: role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Роль обновлена', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Ошибка при обновлении роли' });
  }
};

// Заблокировать/разблокировать пользователя
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { value: banned } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.banned = banned;
    await user.save();

    res.json({ 
      message: banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован',
      user 
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Ошибка при блокировке пользователя' });
  }
};

// Получить статистику
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalMemes = await Meme.count();
    const totalAchievements = await Achievement.count();

    // Last 7 days stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersThisWeek = await User.count({
      where: { created_at: { [Op.gte]: sevenDaysAgo } }
    });
    
    const memesThisWeek = await Meme.count({
      where: { created_at: { [Op.gte]: sevenDaysAgo } }
    });
    
    const achievementsUnlockedThisWeek = await Achievement.count({
      where: { earned_at: { [Op.gte]: sevenDaysAgo } }
    });

    const bannedUsers = await User.count({ where: { banned: true } });

    // Top users by online time
    const topUsers = await User.findAll({
      attributes: ['id', 'username', 'avatar', 'totalOnlineTime'],
      order: [['totalOnlineTime', 'DESC']],
      limit: 5
    });

    // Recent activity
    const recentActivity = await UserActivity.findAll({
      attributes: [
        'date',
        [sequelize.fn('SUM', sequelize.col('voice_time')), 'totalVoiceTime'],
        [sequelize.fn('SUM', sequelize.col('connections')), 'totalConnections']
      ],
      where: {
        date: { [Op.gte]: sevenDaysAgo }
      },
      group: ['date'],
      order: [['date', 'DESC']],
      limit: 7,
      raw: true
    });

    // User roles distribution
    const roleStats = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { is_active: true },
      group: ['role'],
      raw: true
    });

    res.json({
      stats: {
        overview: {
          totalUsers,
          newUsersThisWeek,
          bannedUsers,
          totalMemes,
          memesThisWeek,
          totalAchievements,
          achievementsUnlockedThisWeek
        },
        topUsers: topUsers.map(u => ({
          id: u.id,
          username: u.username,
          avatar: u.avatar,
          totalOnlineTime: Math.floor(u.totalOnlineTime / 3600)
        })),
        recentActivity,
        roleStats: roleStats.reduce((acc, r) => {
          acc[r.role] = parseInt(r.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
};

// Grant achievement to user
exports.grantAchievement = async (req, res) => {
  try {
    const { userId, achievementKey, title, description, game, rarity, icon } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Check if achievement already exists
    const existing = await Achievement.findOne({
      where: { userId, achievementKey }
    });

    if (existing) {
      return res.status(400).json({ error: 'Достижение уже выдано' });
    }

    // Create achievement
    const achievement = await Achievement.create({
      userId,
      achievementKey,
      title,
      description,
      game: game || 'general',
      rarity: rarity || 'common',
      icon: icon || '🏆',
      earnedAt: new Date()
    });

    res.json({
      message: 'Достижение выдано',
      achievement
    });
  } catch (error) {
    console.error('Error granting achievement:', error);
    res.status(500).json({ error: 'Не удалось выдать достижение' });
  }
};

// Get all achievements
exports.getAllAchievements = async (req, res) => {
  try {
    // Сначала проверяем, есть ли достижения вообще
    const achievements = await Achievement.findAll({
      order: [['earnedAt', 'DESC']],
      limit: 100
    });

    // Если есть достижения, подгружаем пользователей отдельно
    if (achievements.length > 0) {
      const userIds = achievements.map(a => a.userId).filter(id => id);
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'avatar']
      });

      const userMap = users.reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});

      const result = achievements.map(a => ({
        ...a.toJSON(),
        user: userMap[a.userId] || null
      }));

      return res.json({ achievements: result });
    }

    res.json({ achievements: [] });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Ошибка при получении достижений' });
  }
};

// Advanced Analytics
exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query; // week, month, year
    
    let daysBack;
    switch (period) {
      case 'week': daysBack = 7; break;
      case 'month': daysBack = 30; break;
      case 'year': daysBack = 365; break;
      default: daysBack = 30;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Activity by day of week
    const dayOfWeekActivity = await UserActivity.findAll({
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal('DOW FROM date')), 'dayOfWeek'],
        [sequelize.fn('AVG', sequelize.col('voice_time')), 'avgVoiceTime'],
        [sequelize.fn('SUM', sequelize.col('connections')), 'totalConnections']
      ],
      where: { date: { [Op.gte]: startDate } },
      group: [sequelize.fn('EXTRACT', sequelize.literal('DOW FROM date'))],
      order: [[sequelize.fn('EXTRACT', sequelize.literal('DOW FROM date')), 'ASC']],
      raw: true
    });

    // Hourly activity distribution (simplified - by activity records)
    const hourlyActivity = await UserActivity.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'activityCount']
      ],
      where: { date: { [Op.gte]: startDate } },
      limit: 24,
      raw: true
    });

    // User growth trend
    const userGrowth = await User.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'newUsers']
      ],
      where: { created_at: { [Op.gte]: startDate } },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Game-specific stats
    const achievementsByGame = await Achievement.findAll({
      attributes: [
        'game',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { earned_at: { [Op.gte]: startDate } },
      group: ['game'],
      raw: true
    });

    // Top performers by period - упрощенная версия без join
    const topPerformersData = await UserActivity.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('voice_time')), 'totalTime']
      ],
      where: { date: { [Op.gte]: startDate } },
      group: ['userId'],
      order: [[sequelize.fn('SUM', sequelize.col('voice_time')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Подгружаем пользователей отдельно
    const topUserIds = topPerformersData.map(p => p.userId);
    const topUsers = await User.findAll({
      where: { id: topUserIds },
      attributes: ['id', 'username', 'avatar']
    });

    const userMap = topUsers.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});

    const topPerformers = topPerformersData.map(p => ({
      username: userMap[p.userId]?.username || 'Unknown',
      avatar: userMap[p.userId]?.avatar || null,
      totalTime: Math.floor(parseFloat(p.totalTime) / 3600)
    }));

    // Meme statistics
    const memeStats = await Meme.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { created_at: { [Op.gte]: startDate } },
      group: ['status'],
      raw: true
    });

    res.json({
      analytics: {
        period,
        dayOfWeekActivity: dayOfWeekActivity.map(d => ({
          day: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][parseInt(d.dayOfWeek)],
          avgVoiceTime: Math.floor(parseFloat(d.avgVoiceTime) / 60) || 0,
          totalConnections: parseInt(d.totalConnections) || 0
        })),
        userGrowth,
        achievementsByGame: achievementsByGame.reduce((acc, a) => {
          acc[a.game] = parseInt(a.count);
          return acc;
        }, {}),
        topPerformers,
        memeStats: memeStats.reduce((acc, m) => {
          acc[m.status] = parseInt(m.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({ error: 'Ошибка при получении расширенной аналитики' });
  }
};

// ============================================
// STEAM BOT MANAGEMENT
// ============================================

/**
 * Получить статус Steam Bot
 */
exports.getBotStatus = async (req, res) => {
  try {
    const bot = getSteamBot();
    const status = bot.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при получении статуса бота' 
    });
  }
};

/**
 * Запустить Steam Bot
 */
exports.startBot = async (req, res) => {
  try {
    const bot = getSteamBot();
    
    if (bot.isConnected) {
      return res.json({ 
        success: false, 
        message: 'Бот уже подключен' 
      });
    }
    
    bot.connect();
    
    res.json({ 
      success: true, 
      message: 'Бот запускается...' 
    });
  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при запуске бота' 
    });
  }
};

/**
 * Остановить Steam Bot
 */
exports.stopBot = async (req, res) => {
  try {
    const bot = getSteamBot();
    
    if (!bot.isConnected) {
      return res.json({ 
        success: false, 
        message: 'Бот уже отключен' 
      });
    }
    
    bot.disconnect();
    
    res.json({ 
      success: true, 
      message: 'Бот остановлен' 
    });
  } catch (error) {
    console.error('Error stopping bot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при остановке бота' 
    });
  }
};

/**
 * Перезапустить Steam Bot
 */
exports.restartBot = async (req, res) => {
  try {
    const bot = getSteamBot();
    
    console.log('🔄 Restarting Steam Bot...');
    bot.disconnect();
    
    // Ждём 3 секунды перед повторным подключением
    setTimeout(() => {
      bot.connect();
    }, 3000);
    
    res.json({ 
      success: true, 
      message: 'Бот перезапускается...' 
    });
  } catch (error) {
    console.error('Error restarting bot:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при перезапуске бота' 
    });
  }
};

/**
 * Отправить Steam Guard код
 */
exports.submitSteamGuard = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Не указан код Steam Guard' 
      });
    }
    
    const bot = getSteamBot();
    const success = bot.submitSteamGuardCode(code.trim().toUpperCase());
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Код отправлен, подключение...' 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Нет ожидающего запроса Steam Guard' 
      });
    }
  } catch (error) {
    console.error('Error submitting Steam Guard code:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при отправке кода' 
    });
  }
};

/**
 * Переключить аккаунт (primary <-> backup)
 */
exports.switchAccount = async (req, res) => {
  try {
    const bot = getSteamBot();
    
    if (!bot.hasBackup) {
      return res.status(400).json({ 
        success: false, 
        error: 'Резервный аккаунт не настроен' 
      });
    }
    
    console.log('🔄 Switching Steam Bot account...');
    bot.disconnect();
    bot.useBackupAccount = !bot.useBackupAccount;
    
    setTimeout(() => {
      bot.connect();
    }, 3000);
    
    res.json({ 
      success: true, 
      message: `Переключение на ${bot.useBackupAccount ? 'резервный' : 'основной'} аккаунт...` 
    });
  } catch (error) {
    console.error('Error switching account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при переключении аккаунта' 
    });
  }
};

/**
 * Сбросить rate limit вручную
 */
exports.resetRateLimit = async (req, res) => {
  try {
    const bot = getSteamBot();
    bot.resetRateLimit();
    
    res.json({ 
      success: true, 
      message: 'Rate limit сброшен, попытка переподключения...' 
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при сбросе rate limit' 
    });
  }
};

/**
 * Синхронизировать матчи пользователя вручную
 */
exports.syncUserMatches = async (req, res) => {
  try {
    const { steamId } = req.body;
    
    if (!steamId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Steam ID не указан' 
      });
    }
    
    const bot = getSteamBot();
    
    if (!bot.isConnected || !bot.isGCReady) {
      return res.status(400).json({ 
        success: false, 
        error: 'Бот не подключен к Steam или GC не готов' 
      });
    }
    
    // Запускаем синхронизацию
    await bot.syncUserMatches(steamId);
    
    res.json({ 
      success: true, 
      message: `Синхронизация матчей для ${steamId} запущена...` 
    });
  } catch (error) {
    console.error('Error syncing user matches:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при синхронизации матчей' 
    });
  }
};

/**
 * Тест Steam Community - получить demo URLs для пользователя Vex
 */
exports.testSteamCommunity = async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 ADMIN: Testing Steam Community Service');
    console.log('='.repeat(70) + '\n');

    // Find user Vex
    const user = await User.findOne({ where: { username: 'Vex' } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User Vex not found' 
      });
    }

    if (!user.cs2AuthToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'User does not have auth token' 
      });
    }

    console.log('✅ Found user:', {
      id: user.id,
      username: user.username,
      steamId: user.steamId,
      hasAuthToken: !!user.cs2AuthToken
    });

    // Fetch match history demos
    const demos = await steamCommunityService.getMatchHistoryDemos(
      user.steamId,
      user.cs2AuthToken
    );

    console.log(`✅ Found ${demos.length} demo URLs`);

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        steamId: user.steamId
      },
      demosFound: demos.length,
      demos: demos.map(demo => ({
        matchId: demo.matchId,
        outcomeId: demo.outcomeId,
        cluster: demo.cluster,
        url: demo.url
      }))
    });

  } catch (error) {
    console.error('❌ Steam Community test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Тестовая отправка Steam сообщения
 */
exports.testSteamMessage = async (req, res) => {
  try {
    const { steamId, message } = req.body;
    
    if (!steamId) {
      return res.status(400).json({ 
        success: false, 
        error: 'steamId required' 
      });
    }
    
    const bot = getSteamBot();
    const status = bot.getStatus();
    
    if (!status.connected) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bot not connected' 
      });
    }
    
    const testMessage = message || '🧪 Test message from ErrorParty Bot!';
    
    const sent = await bot.sendMessage(steamId, testMessage);
    
    if (sent) {
      res.json({ 
        success: true, 
        message: 'Message sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send message' 
      });
    }
    
  } catch (error) {
    console.error('❌ Test message failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

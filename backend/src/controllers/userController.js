const { User, UserStats, LinkToken, Achievement, UserActivity } = require('../models');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'avatar', 'role', 'totalOnlineTime', 'lastSeen'],
      include: [{
        model: UserStats,
        as: 'stats',
        attributes: ['level', 'experience', 'totalConnections']
      }],
      where: { isActive: true },
      order: [['totalOnlineTime', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{
        model: UserStats,
        as: 'stats'
      }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

// Get top users by online time
const getTopUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'all'; // 'all' or 'week'

    let whereClause = { isActive: true };
    
    // Если запрашивается недельная статистика
    if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      whereClause.lastSeen = {
        [require('sequelize').Op.gte]: oneWeekAgo
      };
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'avatar', 'totalOnlineTime'],
      include: [{
        model: UserStats,
        as: 'stats',
        attributes: ['level', 'totalConnections']
      }],
      where: whereClause,
      order: [['totalOnlineTime', 'DESC']],
      limit
    });

    res.json({
      success: true,
      users: users.map(user => {
        const hours = Math.floor(user.totalOnlineTime / 3600);
        return {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          onlineTime: hours, // В часах для фронтенда
          level: user.stats?.level || 1,
          totalConnections: user.stats?.totalConnections || 0,
          onlineTimeFormatted: formatTime(user.totalOnlineTime)
        };
      })
    });
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top users' });
  }
};

// Helper function to format time
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Generate TeamSpeak link token
const generateLinkToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // Проверяем, не связан ли уже аккаунт
    const user = await User.findByPk(userId);
    if (user.teamspeakUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'TeamSpeak аккаунт уже связан' 
      });
    }

    // Удаляем старые неиспользованные токены этого пользователя
    await LinkToken.destroy({
      where: { 
        userId,
        isUsed: false
      }
    });

    // Генерируем новый токен
    let token;
    let isUnique = false;
    
    while (!isUnique) {
      token = LinkToken.generateToken();
      const existing = await LinkToken.findOne({ where: { token } });
      if (!existing) isUnique = true;
    }

    // Создаем токен со сроком действия 15 минут
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await LinkToken.create({
      token,
      userId,
      expiresAt
    });

    res.json({
      success: true,
      token,
      expiresAt,
      message: 'Токен сгенерирован. Используйте команду !link ' + token + ' в чате TeamSpeak'
    });
  } catch (error) {
    console.error('Error generating link token:', error);
    res.status(500).json({ success: false, error: 'Не удалось сгенерировать токен' });
  }
};

// Check link status
const checkLinkStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Проверяем текущий статус пользователя
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'teamspeakUid']
    });

    if (user.teamspeakUid) {
      return res.json({
        success: true,
        linked: true,
        message: 'TeamSpeak аккаунт успешно связан'
      });
    }

    // Проверяем активный токен
    const activeToken = await LinkToken.findOne({
      where: {
        userId,
        isUsed: false,
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    res.json({
      success: true,
      linked: false,
      hasActiveToken: !!activeToken,
      token: activeToken?.token
    });
  } catch (error) {
    console.error('Error checking link status:', error);
    res.status(500).json({ success: false, error: 'Не удалось проверить статус связывания' });
  }
};

// Update user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'steamId', 'avatar', 'role', 'bio', 'cs2AuthToken', 'cs2TokenLinkedAt', 'teamspeakUid']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Don't send the actual token value, just whether it exists
    const userData = user.toJSON();
    userData.cs2AuthToken = !!userData.cs2AuthToken;

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ success: false, error: 'Не удалось получить профиль' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio } = req.body;

    // Валидация bio
    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Биография не может превышать 500 символов'
      });
    }

    // Обновляем профиль
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    user.bio = bio || null;
    await user.save();

    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Не удалось обновить профиль' });
  }
};

// Get user achievements
const getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;

    const achievements = await Achievement.findAll({
      where: { userId },
      order: [['unlockedAt', 'DESC']]
    });

    // Группируем достижения по категориям
    const grouped = {
      dota2: achievements.filter(a => a.category === 'dota2'),
      cs2: achievements.filter(a => a.category === 'cs2'),
      general: achievements.filter(a => a.category === 'general')
    };

    // Подсчитываем статистику
    const stats = {
      total: achievements.length,
      byCategory: {
        dota2: grouped.dota2.length,
        cs2: grouped.cs2.length,
        general: grouped.general.length
      },
      byRarity: {
        common: achievements.filter(a => a.rarity === 'common').length,
        rare: achievements.filter(a => a.rarity === 'rare').length,
        epic: achievements.filter(a => a.rarity === 'epic').length,
        legendary: achievements.filter(a => a.rarity === 'legendary').length
      }
    };

    res.json({
      success: true,
      achievements: grouped,
      stats
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ success: false, error: 'Не удалось загрузить достижения' });
  }
};

// Get user activity for graph
const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    // Вычисляем дату начала
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const activity = await UserActivity.findAll({
      where: {
        userId,
        date: {
          [require('sequelize').Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      order: [['date', 'ASC']]
    });

    // Форматируем данные для графика
    const chartData = activity.map(day => ({
      date: day.date,
      voiceTime: Math.round(day.voiceTime / 3600), // В часах
      connections: day.connections
    }));

    res.json({
      success: true,
      activity: chartData,
      totalVoiceTime: activity.reduce((sum, day) => sum + day.voiceTime, 0),
      totalConnections: activity.reduce((sum, day) => sum + day.connections, 0)
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ success: false, error: 'Не удалось загрузить активность' });
  }
};

// Generate achievement image with AI
const generateAchievementImage = async (req, res) => {
  try {
    const { achievementId } = req.params;

    const achievement = await Achievement.findByPk(achievementId);
    if (!achievement) {
      return res.status(404).json({ success: false, error: 'Достижение не найдено' });
    }

    // Формируем промпт на основе данных достижения
    const metadata = achievement.metadata || {};
    const game = achievement.game || 'general';
    const matchId = metadata.match_id || 'unknown';
    
    let prompt = '';
    let humorText = '';

    if (game === 'dota2') {
      // Извлекаем данные матча из metadata
      const records = metadata.stats?.records || {};
      // Ищем рекорд, который привел к этому достижению (по match_id)
      let matchData = null;
      for (const recordKey in records) {
        const record = records[recordKey];
        if (record && record.match_id === matchId) {
          matchData = record;
          break;
        }
      }
      
      // Если не нашли по match_id, берем первый доступный рекорд с KDA
      if (!matchData) {
        matchData = Object.values(records).find(r => r && r.kills !== undefined);
      }
      
      const kda = matchData ? { 
        kills: matchData.kills || 0, 
        deaths: matchData.deaths || 0, 
        assists: matchData.assists || 0 
      } : { kills: 0, deaths: 0, assists: 0 };
      const hero = matchData?.hero_id ? `Hero #${matchData.hero_id}` : 'Unknown Hero';
      const result = metadata.result || 'unknown';
      
      // Генерируем черный юмор на основе статистики
      if (kda.deaths > kda.kills * 2) {
        const phrases = [
          `💩 ФИДЕР ДЕТЕКТЕД! ${kda.kills}/${kda.deaths}/${kda.assists}\n"Я просто не повезло с командой!"`,
          `🍔 Макдональдс вызывает! ${kda.kills}/${kda.deaths}/${kda.assists}\nДоставка корма для врагов 24/7`,
          `🎪 Цирк приехал! ${kda.kills}/${kda.deaths}/${kda.assists}\nКлоун года - это ты!`,
          `⚰️ RIP MMR ${kda.kills}/${kda.deaths}/${kda.assists}\n"Это команда виновата" - классика`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else if (kda.kills > 20 && result === 'win') {
        const phrases = [
          `🔥 ЧИТЕР РЕЖИМ ON! ${kda.kills}/${kda.deaths}/${kda.assists}\nВраги в слезах, мамки в ярости!`,
          `😈 БОГ ВОЙНЫ! ${kda.kills}/${kda.deaths}/${kda.assists}\nПрокач на трупах врагов завершен`,
          `💀 УБИЙЦА ВЫШЕЛ ИЗ ТЕНИ ${kda.kills}/${kda.deaths}/${kda.assists}\nОни даже не поняли что произошло`,
          `👑 ЛЕГЕНДА ДВОРОВ! ${kda.kills}/${kda.deaths}/${kda.assists}\nВраги удалили доту после этого`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else if (kda.kills > 10 && kda.deaths > 10) {
        const phrases = [
          `🎭 ДРАМА СЕЗОНА ${kda.kills}/${kda.deaths}/${kda.assists}\nТо киллю, то умираю - жизнь такая`,
          `🎢 АМЕРИКАНСКИЕ ГОРКИ ${kda.kills}/${kda.deaths}/${kda.assists}\nЭмоции зашкаливают!`,
          `💊 БИПОЛЯРОЧКА ${kda.kills}/${kda.deaths}/${kda.assists}\nТо бог, то днище - выбери одно!`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else if (result === 'lose' && kda.deaths < 5 && kda.kills > 10) {
        const phrases = [
          `😢 ОДИН В ПОЛЕ ВОИН ${kda.kills}/${kda.deaths}/${kda.assists}\nКоманда сливала, ты держал - грустно`,
          `🦸 СУПЕРГЕРОЙ В МУСОРКЕ ${kda.kills}/${kda.deaths}/${kda.assists}\nСтарался, но тиммейты сильнее`,
          `⚔️ СОЛО КЕРРИ ${kda.kills}/${kda.deaths}/${kda.assists}\nНо видимо не настолько соло...`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else {
        const phrases = [
          `🎮 Обычная катка в Dota 2\nKDA: ${kda.kills}/${kda.deaths}/${kda.assists}`,
          `⚡ Средний уровень игры\n${kda.kills}/${kda.deaths}/${kda.assists} - норм статы`,
          `🎯 Стандартный перфоманс\nKDA ${kda.kills}/${kda.deaths}/${kda.assists}`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      }

      prompt = `Epic gaming achievement card for Dota 2: Hero ${hero}, KDA ${kda.kills}/${kda.deaths}/${kda.assists}, ${result === 'win' ? 'Victory' : 'Defeat'}. Dark fantasy gaming aesthetic with vibrant colors, dramatic lighting, epic composition. Text: "${humorText}"`;
    } else if (game === 'cs2') {
      const score = metadata.score || { kills: 0, deaths: 0 };
      const kd = score.deaths > 0 ? (score.kills / score.deaths).toFixed(2) : score.kills;
      
      if (kd > 2.0) {
        const phrases = [
          `🎯 VAC БАН ЛЕТИТ! ${score.kills}/${score.deaths}\nKD: ${kd} - это уже подозрительно`,
          `🔫 ЧИТЕР ИЛИ ПРО? ${score.kills}/${score.deaths}\nВрагам похуй - репорт отправлен`,
          `👾 КИБЕРСПОРТСМЕН? ${score.kills}/${score.deaths}\nKD ${kd} - слишком хорошо для паба`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else if (kd < 0.5) {
        const phrases = [
          `🤖 БОТ ДЕТЕКТЕД! ${score.kills}/${score.deaths}\nKD: ${kd} - играешь или кормишь?`,
          `💩 АФК ИЛИ ЧТО? ${score.kills}/${score.deaths}\nТак плохо могут только боты`,
          `🎪 ЖЕЛЕЗО? ${score.kills}/${score.deaths}\nKD ${kd} - не, просто скилл такой`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      } else {
        const phrases = [
          `⚔️ Обычная игра в CS2\n${score.kills}/${score.deaths} | KD: ${kd}`,
          `🎮 Средний уровень\nKDA ${score.kills}/${score.deaths} (${kd})`,
          `💥 Норм катка\n${score.kills}/${score.deaths} - стандарт`
        ];
        humorText = phrases[Math.floor(Math.random() * phrases.length)];
      }
      prompt = `Epic gaming achievement card for Counter-Strike 2: Score ${score.kills}/${score.deaths}, KD: ${kd}. Military tactical FPS aesthetic, gritty realistic style. Text: "${humorText}"`;
    } else {
      humorText = achievement.description || 'Легендарное достижение!';
      prompt = `Epic gaming achievement card: ${achievement.title}. Gaming aesthetic with dramatic lighting. Text: "${humorText}"`;
    }

    // Генерируем картинку через Stable Diffusion или используем плейсхолдер
    // TODO: Интегрировать реальный AI API (OpenAI DALL-E, Stable Diffusion, etc.)
    // Пока используем динамический плейсхолдер с текстом
    const encodedText = encodeURIComponent(humorText);
    const color1 = achievement.rarity === 'legendary' ? 'FFD700' : 
                   achievement.rarity === 'epic' ? '9B59B6' :
                   achievement.rarity === 'rare' ? '3498DB' : '95A5A6';
    const color2 = achievement.rarity === 'legendary' ? 'FF8C00' : 
                   achievement.rarity === 'epic' ? '8E44AD' :
                   achievement.rarity === 'rare' ? '2980B9' : '7F8C8D';
    
    const imageUrl = `https://placehold.co/800x400/${color2}/${color1}/png?text=${encodedText}&font=raleway`;

    // Сохраняем URL картинки в metadata
    achievement.metadata = {
      ...metadata,
      imageUrl,
      generatedAt: new Date(),
      prompt
    };
    await achievement.save();

    res.json({
      success: true,
      imageUrl,
      humorText,
      prompt
    });
  } catch (error) {
    console.error('Error generating achievement image:', error);
    res.status(500).json({ success: false, error: 'Не удалось сгенерировать картинку' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getTopUsers,
  generateLinkToken,
  checkLinkStatus,
  getProfile,
  updateProfile,
  getUserAchievements,
  getUserActivity,
  generateAchievementImage,
  getUserBySteamId: getUserById, // Алиас
  getUserStats: getUserById, // Алиас
  updateBio: updateProfile // Алиас
};

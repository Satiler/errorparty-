const { Meme, User, MemeRating, MemeComment } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const pushNotificationService = require('../services/pushNotificationService');

// Get all memes
const getAllMemes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: memes } = await Meme.findAndCountAll({
      where: { 
        isApproved: true,
        status: 'approved'
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: MemeComment,
          as: 'comments',
          attributes: []
        }
      ],
      attributes: {
        include: [
          [require('sequelize').fn('COUNT', require('sequelize').col('comments.id')), 'commentsCount']
        ]
      },
      group: ['Meme.id', 'author.id'],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      subQuery: false
    });

    res.json({
      success: true,
      memes,
      pagination: {
        total: count.length || count,
        page,
        pages: Math.ceil((count.length || count) / limit),
        perPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memes' });
  }
};

// Get meme by ID
const getMemeById = async (req, res) => {
  try {
    const { id } = req.params;

    const meme = await Meme.findByPk(id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    if (!meme) {
      return res.status(404).json({ success: false, error: 'Meme not found' });
    }

    // Check if meme is approved (unless user is admin/moderator or author)
    const userId = req.user?.id;
    const isAuthor = userId && meme.userId === userId;
    const isAdminOrMod = req.user && ['admin', 'moderator'].includes(req.user.role);
    
    if (meme.status !== 'approved' && !isAuthor && !isAdminOrMod) {
      return res.status(403).json({ success: false, error: 'Meme not available' });
    }

    // Increment views only for approved memes
    if (meme.status === 'approved') {
      await meme.increment('views');
    }

    res.json({ success: true, meme });
  } catch (error) {
    console.error('Error fetching meme:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch meme' });
  }
};

// Get top memes
const getTopMemes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const memes = await Meme.findAll({
      where: { 
        isApproved: true,
        status: 'approved'
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: MemeComment,
          as: 'comments',
          attributes: []
        }
      ],
      attributes: {
        include: [
          [require('sequelize').fn('COUNT', require('sequelize').col('comments.id')), 'commentsCount']
        ]
      },
      group: ['Meme.id', 'author.id'],
      order: [['likes', 'DESC']],
      limit,
      subQuery: false
    });

    res.json({ success: true, memes });
  } catch (error) {
    console.error('Error fetching top memes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top memes' });
  }
};

// Rate a meme (like/dislike)
const rateMeme = async (req, res) => {
  try {
    const { id } = req.params; // meme id
    const { rating } = req.body; // 'like' or 'dislike'
    const userId = req.user.id;

    if (!['like', 'dislike'].includes(rating)) {
      return res.status(400).json({ success: false, error: 'Invalid rating. Must be "like" or "dislike"' });
    }

    const meme = await Meme.findByPk(id);
    if (!meme) {
      return res.status(404).json({ success: false, error: 'Meme not found' });
    }

    // Check existing rating
    const existingRating = await MemeRating.findOne({
      where: { userId, memeId: id }
    });

    if (existingRating) {
      // If same rating, remove it (toggle off)
      if (existingRating.rating === rating) {
        await existingRating.destroy();
        
        // Decrement counter
        if (rating === 'like') {
          await meme.decrement('likes');
        } else {
          await meme.decrement('dislikes');
        }

        return res.json({ 
          success: true, 
          message: 'Rating removed',
          action: 'removed',
          rating: null
        });
      } else {
        // Change rating from like to dislike or vice versa
        const oldRating = existingRating.rating;
        existingRating.rating = rating;
        await existingRating.save();

        // Update counters
        if (oldRating === 'like') {
          await meme.decrement('likes');
          await meme.increment('dislikes');
        } else {
          await meme.decrement('dislikes');
          await meme.increment('likes');
        }

        return res.json({ 
          success: true, 
          message: 'Rating changed',
          action: 'changed',
          rating
        });
      }
    } else {
      // Create new rating
      await MemeRating.create({
        userId,
        memeId: id,
        rating
      });

      // Increment counter
      if (rating === 'like') {
        await meme.increment('likes');
      } else {
        await meme.increment('dislikes');
      }

      // Send push notification to meme author (only for likes)
      if (rating === 'like' && meme.userId !== userId) {
        const author = await User.findByPk(userId, { attributes: ['username'] });
        await pushNotificationService.notifyMemeLiked(
          meme.userId,
          author.username,
          meme.title
        ).catch(err => console.error('Push notification failed:', err));
      }

      return res.json({ 
        success: true, 
        message: 'Rating added',
        action: 'added',
        rating
      });
    }
  } catch (error) {
    console.error('Error rating meme:', error);
    res.status(500).json({ success: false, error: 'Failed to rate meme' });
  }
};

// Get user's rating for a meme
const getUserRating = async (req, res) => {
  try {
    const { id } = req.params; // meme id
    const userId = req.user?.id;

    if (!userId) {
      return res.json({ success: true, rating: null });
    }

    const rating = await MemeRating.findOne({
      where: { userId, memeId: id }
    });

    res.json({ 
      success: true, 
      rating: rating ? rating.rating : null 
    });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user rating' });
  }
};

// Get comments for a meme
const getMemeComments = async (req, res) => {
  try {
    const { id } = req.params; // meme id
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: comments } = await MemeComment.findAndCountAll({
      where: { memeId: id },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      comments,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        perPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
};

// Add comment to a meme
const addMemeComment = async (req, res) => {
  try {
    const { id } = req.params; // meme id
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ success: false, error: 'Comment is too long (max 1000 characters)' });
    }

    const meme = await Meme.findByPk(id);
    if (!meme) {
      return res.status(404).json({ success: false, error: 'Meme not found' });
    }

    const comment = await MemeComment.create({
      userId,
      memeId: id,
      text: text.trim()
    });

    // Fetch comment with author info
    const commentWithAuthor = await MemeComment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    // Send push notification to meme author
    if (meme.userId !== userId) {
      await pushNotificationService.notifyNewComment(
        meme.userId,
        commentWithAuthor.author.username,
        meme.title
      ).catch(err => console.error('Push notification failed:', err));
    }

    res.status(201).json({ 
      success: true, 
      comment: commentWithAuthor 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
};

// Delete comment
const deleteMemeComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const comment = await MemeComment.findOne({
      where: { id: commentId, memeId: id }
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Only comment author or admin can delete
    if (comment.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await comment.destroy();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
};

// Create a meme
const createMeme = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      imageUrl, 
      memeText, 
      matchId, 
      matchData, 
      steamId,
      tags 
    } = req.body;
    const userId = req.user.id;

    if (!title || !imageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and imageUrl are required' 
      });
    }

    const meme = await Meme.create({
      title,
      description,
      imageUrl,
      memeText,
      matchId,
      matchData,
      steamId,
      tags: tags || [],
      userId,
      isApproved: true
    });

    // Fetch meme with author info
    const memeWithAuthor = await Meme.findByPk(meme.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.status(201).json({ 
      success: true, 
      meme: memeWithAuthor 
    });
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ success: false, error: 'Failed to create meme' });
  }
};

// Upload meme image
const uploadMemeImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
    }

    // Generate public URL for the uploaded file
    const imageUrl = `/uploads/memes/${req.file.filename}`;

    res.status(200).json({ 
      success: true, 
      imageUrl 
    });
  } catch (error) {
    console.error('Error uploading meme image:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
};

// Generate a meme automatically based on recent games
const generateMeme = async (req, res) => {
  try {
    const { gameType, humorType = 'dark' } = req.body; // 'dota2' or 'cs2', humorType: 'light', 'dark', 'savage'
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Необходимо войти в систему для генерации мемов' 
      });
    }

    if (!gameType || !['dota2', 'cs2'].includes(gameType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Укажите тип игры: dota2 или cs2' 
      });
    }

    if (!['light', 'dark', 'savage'].includes(humorType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверный тип юмора' 
      });
    }

    // Get user's Steam ID
    const user = await User.findByPk(userId);
    
    // Check for recent memes to avoid duplicates (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMemes = await Meme.findAll({
      where: {
        userId: userId,
        created_at: { [Op.gte]: oneHourAgo },
        tags: { [Op.contains]: [gameType] }
      },
      limit: 5
    });
    if (!user || !user.steamId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Steam аккаунт не привязан' 
      });
    }

    let matchData, memeText, title, matchId, imageUrl;

    if (gameType === 'dota2') {
      // Get recent Dota 2 matches
      const steamID32 = convertSteamID64ToID32(user.steamId);
      const recentUrl = `https://api.opendota.com/api/players/${steamID32}/recentMatches`;
      
      try {
        const response = await axios.get(recentUrl);
        const matches = response.data || [];
        
        if (matches.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Не найдено недавних матчей Dota 2' 
          });
        }

        // Get random match from last 10, but avoid recent memes
        const usedMatchIds = recentMemes.map(m => m.matchId);
        const availableMatches = matches.slice(0, 10).filter(m => !usedMatchIds.includes(m.match_id.toString()));
        
        if (availableMatches.length === 0) {
          return res.status(409).json({
            success: false,
            error: 'Все недавние матчи уже использованы. Попробуйте позже!'
          });
        }
        
        const randomMatch = availableMatches[Math.floor(Math.random() * availableMatches.length)];
        matchId = randomMatch.match_id;
        
        const isWin = (randomMatch.player_slot < 128) === randomMatch.radiant_win;
        const kda = `${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists}`;
        const duration = Math.floor(randomMatch.duration / 60);
        
        // EXTREMELY DARK HUMOR - NO MERCY MODE 🔥
        const deathsPerMin = randomMatch.deaths / (duration || 1);
        const kdRatio = randomMatch.deaths > 0 ? (randomMatch.kills / randomMatch.deaths).toFixed(2) : randomMatch.kills;
        const avgDeathTime = duration > 0 ? Math.floor((duration * 60) / (randomMatch.deaths || 1)) : 0;
        
        const memeTemplates = [
          // CATASTROPHIC FEEDING - Multiple variants
          {
            condition: randomMatch.deaths > randomMatch.kills * 3 && randomMatch.deaths > 10,
            texts: [
              `💀 ${randomMatch.deaths} СМЕРТЕЙ | ${randomMatch.kills} КИЛЛОВ`,
              `Враги обеспечены золотом до пенсии`,
              `Ты не игрок, ты благотворительный фонд для врагов 🎁`,
              `ПОДАРИЛ ВРАГАМ АЙТЕМЫ, ДОМ И МАШИНУ`,
              `Враги уже открыли вклад на твоё имя 💰`
            ],
            lightTexts: [
              `${randomMatch.deaths} смертей - это опыт! 😊`,
              `Каждая смерть делает тебя сильнее`,
              `${randomMatch.kills} киллов - неплохое начало!`,
              `Враги были просто удачливее сегодня`
            ],
            savageTexts: [
              `💀 ${randomMatch.deaths} ТРУПОВ - ЭТО ПИЗДЕЦ`,
              `Бля, даже боты так не кормят`,
              `Ты не фидер, ты ебаный конвейер золота`,
              `Враги уже просят mercy, им скучно тебя убивать`,
              `Удали нахуй Доту, это не твоё`
            ],
            memeTemplate: 'drake',
            topText: `Играть и не кормить`,
            bottomText: `Умереть ${randomMatch.deaths} раз 💀`
          },
          // ABSOLUTELY TRAGIC
          {
            condition: randomMatch.deaths > 25,
            texts: [
              `☠️ ${randomMatch.deaths} ТРУПОВ ЗА ${duration} МИНУТ ☠️`,
              `КНИГА РЕКОРДОВ ГИННЕСА ЗВОНИТ`,
              `Даже скриптеры не умирают так часто`,
              `Враги создали музей в твою честь`,
              `Респавн таймер - единственное что ты видишь 💀`
            ],
            lightTexts: [
              `${randomMatch.deaths} смертей - ты точно пытался! 💪`,
              `Такой матч бывает у каждого`,
              `Главное не сдаваться после плохой игры`,
              `${duration} минут ценного игрового опыта`
            ],
            savageTexts: [
              `☠️ ${randomMatch.deaths} СМЕРТЕЙ - ТЫ ЕБАНЫЙ РЕКОРДСМЕН`,
              `Нахуй такой "скилл"? Удаляй игру`,
              `Твоя мать плачет глядя на эту статистику`,
              `Враги ржут так что ебало болит`,
              `Ты позор для всей Доты, бля`
            ],
            memeTemplate: 'disaster-girl',
            topText: `Нормальная игра`,
            bottomText: `${randomMatch.deaths} смертей за ${duration}м 🔥`
          },
          {
            condition: randomMatch.deaths > 20,
            texts: [
              `☠️ ${randomMatch.deaths} СМЕРТЕЙ ☠️`,
              `ПРОФЕССИОНАЛЬНЫЙ ДОНОР ОПЫТА И ЗОЛОТА`,
              `Враги: "Лучший тиммейт в нашей жизни"`,
              `Союзники написали завещание с первой минуты`,
              `Ты не фидишь, ты КОРМИШЬ ДОСЫТА 🍽️`
            ],
            lightTexts: [
              `${randomMatch.deaths} смертей - активная игра! ⚡`,
              `Много действий, много драк - молодец!`,
              `Агрессивный стиль игры - это тоже стиль`,
              `В следующий раз будет получше! 🎯`
            ],
            savageTexts: [
              `${randomMatch.deaths} СМЕРТЕЙ - ОХУЕТЬ МОЖНО`,
              `Ты ебаный донорский центр опыта`,
              `Союзники: "Нахуй такой тиммейт"`,
              `Бля, удали уже эту хуйню из Steam`,
              `Мать твою, даже курьер полезнее был`
            ],
            memeTemplate: 'afraid-to-ask',
            topText: `Умер ${randomMatch.deaths} раз?`,
            bottomText: `Серьёзно? Как?! 😱`
          },
          // EPIC FAIL WITH HIGH KILLS
          {
            condition: !isWin && randomMatch.kills > 20 && randomMatch.deaths < 10,
            texts: [
              `🔥 ${randomMatch.kills} КИЛЛОВ И СЛИВ 🔥`,
              `Когда играешь 1 против 14`,
              `Союзники сидели в АФК с рождения?`,
              `КОМАНДА ПРОДАЛАСЬ ВРАГАМ 100%`,
              `Ты тащил, а 4 дебила тянули вниз ⚓`
            ],
            lightTexts: [
              `${randomMatch.kills} киллов - ты старался! 💪`,
              `Ты молодец, просто не повезло с командой`,
              `Твоя игра была на высоте!`,
              `Иногда 1 игрока недостаточно для победы`
            ],
            savageTexts: [
              `${randomMatch.kills} КИЛЛОВ И ЕБАНЫЙ СЛИВ`,
              `Бля, команда из полных дебилов`,
              `Ты 1v9, а эти уёбки только жрали`,
              `Союзники: 4 мудака и ты один человек`,
              `Удаляй нахуй друзей, они мрази`
            ],
            memeTemplate: 'captain-phillips',
            topText: `Я убил ${randomMatch.kills}`,
            bottomText: `Всё равно проиграл 😭`
          },
          {
            condition: !isWin && randomMatch.kills > 15,
            texts: [
              `${randomMatch.kills} ФРАГОВ - ВСЁРАВНО СЛИВ`,
              `Команда специально проигрывала?`,
              `Один в поле не воин... особенно в Dota`,
              `Союзники: "Спасибо, что пытался 🤡"`
            ],
            lightTexts: [
              `${randomMatch.kills} киллов - отличный результат! ⭐`,
              `Ты показал хорошую игру`,
              `Не твоя вина что проиграли`,
              `Продолжай в том же духе! 🎮`
            ],
            savageTexts: [
              `${randomMatch.kills} ФРАГОВ - И НИХУЯ НЕ ПОМОГЛО`,
              `Бля, команда дебилов специально сливала?`,
              `Союзники - 4 больных ублюдка`,
              `Ты один человек, остальные мрази`
            ],
            memeTemplate: 'bike-fall',
            topText: `Carries team with ${randomMatch.kills} kills`,
            bottomText: `Team still loses`
          },
          // USELESS WIN
          {
            condition: isWin && randomMatch.kills < 2 && randomMatch.assists < 5,
            texts: [
              `✅ ПОБЕДА С ${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists}`,
              `ТЫ ПРОСТО ЗАНИМАЛ МЕСТО В СЛОТЕ`,
              `Команда победила НЕСМОТРЯ на тебя`,
              `Твой вклад: 0.000001% 🤡`,
              `Спасибо что не удалил Dota прямо в игре`
            ],
            lightTexts: [
              `Победа есть победа! ✅`,
              `${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists} - ты был в команде`,
              `Командная игра - это важно! 🤝`,
              `Поддержка тоже важная роль`
            ],
            savageTexts: [
              `ПОБЕДА ${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists} - ТЫ ЕБАНЫЙ БАЛЛАСТ`,
              `Бля, ты просто место занимал`,
              `Команда победила БЕЗ ТЕБЯ, уёбок`,
              `Твой вклад: хуй с маслом`,
              `Союзники: "Кто этот мудак в слоте?"`,
              `Нахуй такие саппорты, лучше с ботом`
            ],
            memeTemplate: 'roll-safe',
            topText: `Не можешь фидить`,
            bottomText: `Если вообще не играешь 🧠`
          },
          {
            condition: isWin && randomMatch.kills === 0 && randomMatch.assists === 0,
            texts: [
              `ПОБЕДА 0/${randomMatch.deaths}/0 🤯`,
              `ТЫ ИГРАЛ ИЛИ СМОТРЕЛ YOUTUBE?!`,
              `Твоя роль: фоновое украшение карты`,
              `Даже курьер принёс больше пользы`,
              `Союзники: "Кто этот 5й игрок?" 👻`
            ],
            lightTexts: [
              `0/${randomMatch.deaths}/0 - но победа! 🎉`,
              `Может быть купил вардов?`,
              `Моральная поддержка тоже важна!`,
              `Главное что команда победила 🏆`
            ],
            savageTexts: [
              `0/${randomMatch.deaths}/0 - ТЫ ЕБАНЫЙ ПРИЗРАК`,
              `Бля, ты хоть был в игре, мудак?`,
              `Твоя роль: нихуя не делать`,
              `Даже ебаный курьер полезнее`,
              `Союзники: "Репорт на 5го долбоёба"`
            ],
            memeTemplate: 'picard-facepalm',
            topText: `Победа 0/X/0`,
            bottomText: `Ты хоть был в игре?! 🤦`
          },
          // GODLIKE PERFORMANCE
          {
            condition: randomMatch.deaths === 0 && isWin && randomMatch.kills > 10,
            texts: [
              `👑 БЕЗСМЕРТНЫЙ: ${kda} KDA 👑`,
              `АБСОЛЮТНОЕ ДОМИНИРОВАНИЕ`,
              `Враги удалили Dota после этой игры`,
              `Союзники: "Можно автограф?" ✍️`
            ],
            lightTexts: [
              `${kda} KDA - превосходно! 👑`,
              `Ни одной смерти - мастерская игра! 🌟`,
              `Ты настоящий про-игрок! 💎`,
              `Так держать, чемпион! 🏆`
            ],
            savageTexts: [
              `${kda} KDA - ТЫ ЕБАНЫЙ БОГ`,
              `Нихуя себе доминация, красава`,
              `Враги удалили игру после этого`,
              `Ты порвал их как тузик грелку`,
              `Союзники сосут твой хуй за эту игру`
            ],
            memeTemplate: 'success-kid',
            topText: `${randomMatch.kills} kills`,
            bottomText: `0 deaths 😎`
          },
          // DEATH SPEEDRUN
          {
            condition: deathsPerMin > 0.6,
            texts: [
              `⏱️ СМЕРТЬ КАЖДЫЕ ${avgDeathTime} СЕКУНД`,
              `WORLD RECORD SPEEDRUN "DEATH ANY%"`,
              `Ты видел респавн чаще чем карту`,
              `Фонтан - твой настоящий дом 🏠`,
              `Враги: "Он снова идёт умирать? Скучно уже" 😴`
            ],
            lightTexts: [
              `Активная игра с частыми боями! ⚡`,
              `Смелый стиль - рисковал и дрался`,
              `Не бойся ошибаться, так учатся! 📚`,
              `В следующий раз будь осторожнее 🛡️`
            ],
            savageTexts: [
              `СМЕРТЬ КАЖДЫЕ ${avgDeathTime} СЕК - ТЫ ЕБАНУТЫЙ?`,
              `Бля, ты нарочно бежишь умирать?`,
              `РЕКОРД ГИННЕСА ПО ДЕБИЛИЗМУ`,
              `Фонтан - единственное что ты видишь`,
              `Нахуй с такой игрой вообще запускать Доту`
            ],
            memeTemplate: 'this-is-fine',
            topText: `Умираю каждые ${avgDeathTime} сек`,
            bottomText: `Всё нормально 🔥`
          },
          // GUARANTEED LOSS
          {
            condition: !isWin && randomMatch.deaths > randomMatch.kills * 2,
            texts: [
              `${kda} KDA = 100% ПОРАЖЕНИЕ`,
              `МАТЕМАТИЧЕСКИ ДОКАЗАННЫЙ СЛИВ`,
              `Враги: "Лёгкая игра, спасибо"`,
              `Союзники уже тебя зарепортили`
            ],
            lightTexts: [
              `${kda} - сложный матч`,
              `Не каждая игра будет удачной`,
              `Важен опыт, а не только победы`,
              `Продолжай играть и учиться! 📖`
            ],
            savageTexts: [
              `${kda} KDA - ЭТО ЕБАНЫЙ ПОЗОР`,
              `МАТЕМАТИКА ДОКАЗАЛА ЧТО ТЫ МУДАК`,
              `Враги: "Ебать, легчайшая катка"`,
              `Союзники хотят тебя убить IRL`
            ],
            memeTemplate: 'expanding-brain',
            topText: `Playing good`,
            bottomText: `Feeding ${randomMatch.deaths} times`
          },
          // ABSOLUTE DISASTER  
          {
            condition: !isWin && kdRatio < 0.5,
            texts: [
              `K/D: ${kdRatio} 💩 = ПОЛНАЯ ДЕГРАДАЦИЯ`,
              `ЭТО НЕ ИГРА, ЭТО ТВОЁ ЛИЧНОЕ УНИЖЕНИЕ`,
              `Враги предложили тебе психолога`,
              `Может Tetris подойдёт лучше? 🧱`,
              `Steam автоматически вернёт деньги за игру`
            ],
            lightTexts: [
              `K/D ${kdRatio} - можно улучшить`,
              `Плохой день бывает у всех`,
              `Не сдавайся, тренируйся дальше! 💪`,
              `Следующий матч будет лучше! 🎯`
            ],
            savageTexts: [
              `K/D ${kdRatio} - ЭТО ПИЗДЕЦ ПОЛНЫЙ`,
              `ТЫ НЕ ИГРОК, ТЫ МЕШОК ГОВНА`,
              `Враги предложили тебе суицид`,
              `Tetris? Бля, даже там проебёшься`,
              `Steam заблокировал твой аккаунт из жалости`
            ],
            memeTemplate: 'skull',
            topText: `K/D: ${kdRatio}`,
            bottomText: `Удали Dota навсегда ☠️`
          },
          // INVISIBLE PLAYER
          {
            condition: randomMatch.kills === 0 && randomMatch.deaths > 5,
            texts: [
              `0 КИЛЛОВ | ${randomMatch.deaths} СМЕРТЕЙ`,
              `ТЫ ИГРАЛ С ЗАКРЫТЫМИ ГЛАЗАМИ?!`,
              `Враги: "Этот даже не пытается"`,
              `Может ты перепутал кнопки? 🎮`,
              `Даже крипы нанесли больше урона по героям`
            ],
            lightTexts: [
              `0 киллов - но ты старался!`,
              `Иногда сложно попасть в драки`,
              `Саппорт тоже может без киллов играть`,
              `В следующий раз получится! 🎮`
            ],
            savageTexts: [
              `0 КИЛЛОВ ${randomMatch.deaths} СМЕРТЕЙ - ОХУЕТЬ`,
              `Бля, ты с завязанными глазами играл?`,
              `Враги: "Этот долбоёб вообще не пытается"`,
              `Может руки в жопе а не на клаве?`,
              `Крипы нанесли больше урона чем ты, мудак`
            ],
            memeTemplate: 'distracted-boyfriend',
            topText: `Убивать врагов`,
            bottomText: `Просто умирать 💀`
          },
          // FEEDING CARRIES
          {
            condition: randomMatch.deaths > 15 && !isWin,
            texts: [
              `${randomMatch.deaths} ПОДАРКОВ ВРАГАМ 🎁`,
              `ПЕРСОНАЛЬНЫЙ СПОНСОР ВРАЖЕСКИХ КЭРРИ`,
              `Враги назвали тебя "MVP матча"`,
              `Благотворительный фонд "Накорми кэрри"`,
              `Вражеский керри купил рапиру только благодаря тебе 💰`
            ],
            lightTexts: [
              `${randomMatch.deaths} смертей - активное участие`,
              `Вражеская команда была сильнее`,
              `Иногда так бывает в сложных матчах`,
              `Учись на ошибках! 📚`
            ],
            savageTexts: [
              `${randomMatch.deaths} ПОДАРКОВ - ТЫ ЕБАНЫЙ САНТА`,
              `ЛИЧНЫЙ СПОНСОР ВРАЖЕСКОЙ КОМАНДЫ`,
              `Враги: "Спасибо тебе, дебил"`,
              `Фонд "Накорми керри досрочной рапирой"`,
              `Керри купил хуй твоей матери благодаря тебе`
            ],
            memeTemplate: 'patrick-smart',
            topText: `Зачем фидить ${randomMatch.deaths} раз?`,
            bottomText: `Чтоб вражеский керри купил все айтемы`
          },
          // LOW IMPACT WIN
          {
            condition: isWin && randomMatch.kills + randomMatch.assists < 5,
            texts: [
              `Победа при ${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists}`,
              `СОЮЗНИКИ ТАЩИЛИ 4 VS 5`,
              `Ты был обузой, но победили`,
              `Спасибо за то что не фидил... ну почти`
            ],
            lightTexts: [
              `Победа - это главное! 🎉`,
              `${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists} - ты был частью команды`,
              `Командная работа решает всё! 🤝`,
              `Молодец что довёл до конца! 💪`
            ],
            savageTexts: [
              `ПОБЕДА ${randomMatch.kills}/${randomMatch.deaths}/${randomMatch.assists} - СОЮЗНИКИ БОГАТЫРИ`,
              `Бля, они тащили 4v6 по сути`,
              `Ты был хуже чем крип`,
              `Спасибо что хоть не кормил сильно`
            ],
            memeTemplate: 'sleeping-shaq',
            topText: `Teammates carrying`,
            bottomText: `Me doing nothing`
          }
        ];

        // Find matching template or use default, filter by humor type
        let availableTemplates = memeTemplates.filter(t => t.condition);
        let texts = [];
        let selectedTemplate = null;
        
        // Filter templates based on humor type
        if (humorType === 'light') {
          // For light humor, use positive texts
          if (availableTemplates.length === 0) {
            texts = [
              `Игра: ${kda} 😊`,
              `${isWin ? 'Победа!' : 'В следующий раз получится!'}`,
              `${duration} минут веселья`,
              `Продолжай тренироваться! 💪`
            ];
            memeText = texts.join('\n');
            title = `${isWin ? '✅' : '💪'} Dota 2: ${kda}`;
          } else {
            selectedTemplate = availableTemplates[0];
            texts = selectedTemplate.lightTexts || selectedTemplate.texts;
            memeText = texts.join('\n');
            title = `${isWin ? '✅' : '💪'} ${texts[0]}`;
          }
        } else if (humorType === 'savage') {
          // For savage mode, use toxic texts with mat
          selectedTemplate = availableTemplates.length > 0 
            ? availableTemplates[0] 
            : memeTemplates.find(t => t.condition);
          
          if (selectedTemplate) {
            texts = selectedTemplate.savageTexts || selectedTemplate.texts;
            memeText = texts.join('\n');
            title = `💀 SAVAGE: ${texts[0]}`;
          } else {
            texts = [
              `💀 SAVAGE MODE 💀`,
              `KDA: ${kda}`,
              `${isWin ? 'Каким-то хуем победа' : 'Ожидаемый пиздец'}`,
              `Ты позор для Доты, бля`
            ];
            memeText = texts.join('\n');
            title = `💀 SAVAGE: ${kda}`;
          }
        } else {
          // Dark humor (default)
          selectedTemplate = availableTemplates.length > 0 
            ? availableTemplates[0] 
            : memeTemplates.find(t => t.condition);
          
          texts = selectedTemplate ? selectedTemplate.texts : [
            `Обычный матч Dota 2`,
            `KDA: ${kda}`,
            `${isWin ? 'Победа' : 'Поражение'} 🤷`
          ];

          memeText = texts.join('\n');
          title = `${isWin ? '✅' : '❌'} ${selectedTemplate ? texts[0] : `Dota 2: ${kda}`}`;
        }
        
        // Generate meme image using Imgflip API or custom generator
        if (selectedTemplate && selectedTemplate.memeTemplate) {
          // Use Imgflip templates for popular memes
          const memeTemplateMap = {
            'drake': '181913649',  // Drake Hotline Bling
            'disaster-girl': '97984',  // Disaster Girl
            'afraid-to-ask': '8279814',  // Afraid To Ask Andy
            'captain-phillips': '114585149',  // Captain Phillips
            'bike-fall': '100947',  // Bike Fall
            'roll-safe': '89370399',  // Roll Safe
            'picard-facepalm': '1509839',  // Picard Facepalm
            'success-kid': '61544',  // Success Kid
            'this-is-fine': '55311130',  // This Is Fine
            'expanding-brain': '93895088',  // Expanding Brain
            'skull': '101511',  // Skull Trumpet
            'distracted-boyfriend': '112126428',  // Distracted Boyfriend
            'patrick-smart': '101511',  // Smart Patrick
            'sleeping-shaq': '99683372'  // Sleeping Shaq
          };
          
          const templateId = memeTemplateMap[selectedTemplate.memeTemplate] || '181913649';
          
          try {
            // Try to generate using Imgflip API (free, no auth required for basic use)
            const imgflipResponse = await axios.post('https://api.imgflip.com/caption_image', {
              template_id: templateId,
              username: 'errorparty',  // You can register on imgflip.com for better quality
              password: 'errorparty123',  // Or use without auth with watermark
              text0: selectedTemplate.topText || texts[0],
              text1: selectedTemplate.bottomText || texts[1] || ''
            }, {
              timeout: 5000
            });
            
            if (imgflipResponse.data && imgflipResponse.data.success) {
              imageUrl = imgflipResponse.data.data.url;
            } else {
              throw new Error('Imgflip API failed');
            }
          } catch (imgflipError) {
            console.log('Imgflip failed, using fallback:', imgflipError.message);
            // Fallback to placeholder with custom text
            const fallbackText = encodeURIComponent(texts.slice(0, 2).join('\n'));
            const bgColor = isWin ? '2d5016' : '5c1a1a';
            const textColor = isWin ? '4ade80' : 'ef4444';
            imageUrl = `https://placehold.co/800x600/${bgColor}/${textColor}/png?text=${fallbackText}&font=raleway`;
          }
        } else {
          // Default image generation with enhanced visuals
          const bgColor = isWin ? '2d5016' : '5c1a1a';
          const textColor = isWin ? '4ade80' : 'ef4444';
          const mainText = encodeURIComponent((texts[0] || 'Dota 2') + '\n' + (texts[1] || kda));
          imageUrl = `https://placehold.co/800x600/${bgColor}/${textColor}/png?text=${mainText}&font=raleway`;
        }
        
        // Fetch full match details
        const matchDetailsUrl = `https://api.opendota.com/api/matches/${matchId}`;
        let fullMatchData = null;
        let allPlayersData = [];
        try {
          const matchResponse = await axios.get(matchDetailsUrl);
          fullMatchData = matchResponse.data;
          
          // Get all 10 players data
          if (fullMatchData && fullMatchData.players) {
            allPlayersData = fullMatchData.players.map(p => ({
              playerSlot: p.player_slot,
              heroId: p.hero_id,
              kills: p.kills || 0,
              deaths: p.deaths || 0,
              assists: p.assists || 0,
              gpm: p.gold_per_min || 0,
              xpm: p.xp_per_min || 0,
              heroDamage: p.hero_damage || 0,
              towerDamage: p.tower_damage || 0,
              heroHealing: p.hero_healing || 0,
              lastHits: p.last_hits || 0,
              denies: p.denies || 0,
              netWorth: p.net_worth || 0,
              level: p.level || 1,
              items: [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5].filter(i => i > 0),
              backpack: [p.backpack_0, p.backpack_1, p.backpack_2].filter(i => i > 0),
              personaname: p.personaname || `Player ${p.player_slot}`,
              isRadiant: p.player_slot < 128
            }));
          }
        } catch (err) {
          console.error('Error fetching match details:', err.message);
        }

        // Find player's data in the match
        let playerMatchData = randomMatch;
        if (fullMatchData && fullMatchData.players) {
          const playerSlot = randomMatch.player_slot;
          playerMatchData = fullMatchData.players.find(p => p.player_slot === playerSlot) || randomMatch;
        }

        matchData = {
          game: 'dota2',
          matchId: matchId,
          kda: kda,
          kills: randomMatch.kills,
          deaths: randomMatch.deaths,
          assists: randomMatch.assists,
          duration: duration,
          result: isWin ? 'win' : 'loss',
          heroId: randomMatch.hero_id,
          playerSlot: randomMatch.player_slot,
          openDotaUrl: `https://www.opendota.com/matches/${matchId}`,
          // Detailed stats for main player
          gpm: playerMatchData.gold_per_min || randomMatch.gold_per_min || 0,
          xpm: playerMatchData.xp_per_min || randomMatch.xp_per_min || 0,
          heroDamage: playerMatchData.hero_damage || 0,
          towerDamage: playerMatchData.tower_damage || 0,
          heroHealing: playerMatchData.hero_healing || 0,
          lastHits: playerMatchData.last_hits || randomMatch.last_hits || 0,
          denies: playerMatchData.denies || randomMatch.denies || 0,
          netWorth: playerMatchData.net_worth || 0,
          items: playerMatchData.item_0 !== undefined ? [
            playerMatchData.item_0,
            playerMatchData.item_1,
            playerMatchData.item_2,
            playerMatchData.item_3,
            playerMatchData.item_4,
            playerMatchData.item_5
          ].filter(item => item > 0) : [],
          backpack: playerMatchData.backpack_0 !== undefined ? [
            playerMatchData.backpack_0,
            playerMatchData.backpack_1,
            playerMatchData.backpack_2
          ].filter(item => item > 0) : [],
          level: playerMatchData.level || randomMatch.level || 1,
          // All 10 players
          allPlayers: allPlayersData
        };

      } catch (error) {
        console.error('Error fetching Dota 2 matches:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Ошибка при получении данных Dota 2' 
        });
      }

    } else if (gameType === 'cs2') {
      // CS2 - using mock data with pattern based on Steam ID
      // In real scenario, would use Steam Web API
      const steamID32 = convertSteamID64ToID32(user.steamId);
      
      // Generate pseudo-random match based on Steam ID to avoid same memes
      const seed = parseInt(steamID32) + Date.now();
      const random = (seed * 9301 + 49297) % 233280;
      const kills = Math.floor((random % 30) + 5);
      const deaths = Math.floor((random % 20) + 3);
      const assists = Math.floor((random % 15) + 2);
      const mvps = Math.floor((random % 5));
      const score = Math.floor((random % 50) + 10);
      const isWin = (random % 2) === 0;
      
      // Check if this match was already used
      matchId = `cs2_${steamID32}_${Date.now()}`;
      const existingMeme = recentMemes.find(m => m.matchId === matchId);
      if (existingMeme) {
        return res.status(409).json({
          success: false,
          error: 'Недавно уже был создан мем с этого матча'
        });
      }
      
      const kda = `${kills}/${deaths}/${assists}`;
      const duration = 35;
      const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills;
      const headshotPercent = Math.floor((random % 60) + 10);
      
      // SAVAGE CS2 BLACK HUMOR
      const cs2Templates = [
        {
          condition: deaths > kills * 2 && deaths > 10,
          texts: [
            `💀 ${deaths} СМЕРТЕЙ В CS2`,
            `ПРОФЕССИОНАЛЬНАЯ МИШЕНЬ ДЛЯ АВП`,
            `Враги: "Бесплатные фраги, приходите!"`,
            `Может ты забыл инсталлировать читы? 🖥️`,
            `Контроллер работает или играешь ногами?`
          ],
          memeTemplate: 'disaster-girl',
          topText: `Моя статистика:`,
          bottomText: `${deaths} смертей 🔥`
        },
        {
          condition: !isWin && kills > 25,
          texts: [
            `${kills} ФРАГОВ И СЛИВ`,
            `КОМАНДА ИЗ ДРУГОЙ ВСЕЛЕННОЙ?`,
            `1v14 SIMULATOR 2025`,
            `Союзники сдались ещё в лобби`,
            `Ты вынес пол сервера, но команда слила 😭`
          ],
          memeTemplate: 'captain-phillips',
          topText: `${kills} фрагов`,
          bottomText: `Всё равно проиграл 💔`
        },
        {
          condition: isWin && kills < 5,
          texts: [
            `✅ ПОБЕДА С ${kills} КИЛЛАМИ`,
            `ТЕБЯ ПРОНЕСЛИ КАК ГРУЗ 200 КГ`,
            `Команда играла 4v5 и выиграла`,
            `Спасибо что не кикнулся 👏`,
            `Твой вклад: не мешать тиммейтам`
          ],
          memeTemplate: 'sleeping-shaq',
          topText: `Команда тащит`,
          bottomText: `Я: ${kills} фрагов 😴`
        },
        {
          condition: mvps === 0 && !isWin,
          texts: [
            `0 MVP ЗВЁЗД | ПОРАЖЕНИЕ`,
            `АБСОЛЮТНО НИЧЕГО НЕ СДЕЛАЛ`,
            `Даже бот получил бы хотя бы 1 MVP`,
            `Ты просто занимал место в лобби`,
            `Выключи игру и удали Steam 🛡️`
          ],
          memeTemplate: 'picard-facepalm',
          topText: `0 MVP звёзд`,
          bottomText: `Как ты это сделал?! 🤦`
        },
        {
          condition: kdRatio < 0.5 && !isWin,
          texts: [
            `K/D: ${kdRatio} 💩 = АПОКАЛИПСИС`,
            `ЭТО КАТАСТРОФА МИРОВОГО МАСШТАБА`,
            `Враги предложили тебе тренера`,
            `Может Solitaire больше подходит? 🎴`,
            `Твои тиммейты уже удалили тебя из друзей`
          ],
          memeTemplate: 'skull',
          topText: `K/D: ${kdRatio}`,
          bottomText: `Удали CS2 и Steam ☠️`
        },
        {
          condition: kills === 0 && deaths > 3,
          texts: [
            `0 КИЛЛОВ | ${deaths} СМЕРТЕЙ`,
            `ТЫ ВООБЩЕ СТРЕЛЯЛ?!`,
            `Даже случайная мышь убьёт кого-то`,
            `Враги: "Спасибо за +25 ELO" 🎁`,
            `Может ты перепутал CS2 с The Sims? 🎮`
          ],
          memeTemplate: 'afraid-to-ask',
          topText: `0 фрагов?`,
          bottomText: `Ты вообще выстрелил? 🔫`
        },
        {
          condition: deaths > 20,
          texts: [
            `${deaths} СМЕРТЕЙ В CS2`,
            `МИРОВОЙ РЕКОРД ПО КОРМЛЕНИЮ`,
            `Враги получили ранг благодаря тебе`,
            `Ты кормил врагов как мама блинами 🥞`,
            `Может стоит попробовать Roblox?`
          ],
          memeTemplate: 'bike-fall',
          topText: `Играю в CS2`,
          bottomText: `Умираю ${deaths} раз 💀`
        },
        {
          condition: isWin && mvps >= 3,
          texts: [
            `👑 ${mvps} MVP | ${kills} ФРАГОВ`,
            `АБСОЛЮТНОЕ ДОМИНИРОВАНИЕ`,
            `Враги в шоке, союзники аплодируют`,
            `Carry of the match 🏆`
          ],
          memeTemplate: 'success-kid',
          topText: `${mvps} MVPs`,
          bottomText: `Carried hard 😎`
        },
        {
          condition: !isWin && mvps >= 2,
          texts: [
            `${mvps} MVP НО ПРОИГРАЛ`,
            `КОМАНДА НЕ ДОСТОЙНА ТЕБЯ`,
            `Союзники играли в прятки?`,
            `1v9 and still lost`
          ],
          memeTemplate: 'distracted-boyfriend',
          topText: `Winning`,
          bottomText: `My team throwing`
        }
      ];
      
      const matchingTemplate = cs2Templates.find(t => t.condition);
      const texts = matchingTemplate ? matchingTemplate.texts : [
        `Обычная игра CS2`,
        `${kda} KDA`,
        `Счет: ${score}`
      ];
      
      memeText = texts.join('\n');
      title = `${isWin ? '✅' : '❌'} ${matchingTemplate ? texts[0] : `CS2: ${kda}`}`;
      
      // Generate CS2 meme image
      if (matchingTemplate && matchingTemplate.memeTemplate) {
        const memeTemplateMap = {
          'drake': '181913649',
          'disaster-girl': '97984',
          'afraid-to-ask': '8279814',
          'captain-phillips': '114585149',
          'bike-fall': '100947',
          'roll-safe': '89370399',
          'picard-facepalm': '1509839',
          'success-kid': '61544',
          'this-is-fine': '55311130',
          'skull': '101511',
          'distracted-boyfriend': '112126428',
          'sleeping-shaq': '99683372'
        };
        
        const templateId = memeTemplateMap[matchingTemplate.memeTemplate] || '181913649';
        
        try {
          const imgflipResponse = await axios.post('https://api.imgflip.com/caption_image', {
            template_id: templateId,
            username: 'errorparty',
            password: 'errorparty123',
            text0: matchingTemplate.topText || texts[0],
            text1: matchingTemplate.bottomText || texts[1] || ''
          }, {
            timeout: 5000
          });
          
          if (imgflipResponse.data && imgflipResponse.data.success) {
            imageUrl = imgflipResponse.data.data.url;
          } else {
            throw new Error('Imgflip failed');
          }
        } catch (error) {
          console.log('Imgflip failed for CS2, using fallback');
          const fallbackText = encodeURIComponent(texts.slice(0, 2).join('\n'));
          const bgColor = isWin ? '2d5016' : '5c1a1a';
          const textColor = isWin ? '4ade80' : 'ef4444';
          imageUrl = `https://placehold.co/800x600/${bgColor}/${textColor}/png?text=${fallbackText}&font=raleway`;
        }
      } else {
        const bgColor = isWin ? '2d5016' : '5c1a1a';
        const textColor = isWin ? '4ade80' : 'ef4444';
        const mainText = encodeURIComponent(texts.slice(0, 2).join('\n'));
        imageUrl = `https://placehold.co/800x600/${bgColor}/${textColor}/png?text=${mainText}&font=raleway`;
      }
      
      matchData = {
        game: 'cs2',
        matchId: matchId,
        kda: kda,
        kills: kills,
        deaths: deaths,
        assists: assists,
        duration: duration,
        result: isWin ? 'win' : 'loss',
        mvps: mvps,
        score: score,
        headshotPercent: headshotPercent,
        allPlayers: []
      };
    }

    // Create meme with generated image and text
    const meme = await Meme.create({
      title,
      description: `Автоматически сгенерированный мем на основе матча ${gameType.toUpperCase()}`,
      imageUrl,
      memeText,
      matchId: matchId?.toString(),
      matchData: JSON.stringify(matchData),
      steamId: user.steamId,
      tags: ['auto-generated', gameType, matchData.result],
      userId,
      isApproved: true
    });

    // Fetch with author
    const memeWithAuthor = await Meme.findByPk(meme.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.status(201).json({ 
      success: true, 
      meme: {
        ...memeWithAuthor.toJSON(),
        matchData: matchData
      },
      message: 'Мем успешно создан на основе вашего матча!'
    });

  } catch (error) {
    console.error('Error generating meme:', error);
    res.status(500).json({ success: false, error: 'Ошибка при генерации мема' });
  }
};

// Helper function to convert Steam ID64 to ID32
const convertSteamID64ToID32 = (steamID64) => {
  const steamID64Base = '76561197960265728';
  const accountID = BigInt(steamID64) - BigInt(steamID64Base);
  return accountID.toString();
};

module.exports = {
  getAllMemes,
  getMemeById,
  getTopMemes,
  rateMeme,
  getUserRating,
  getMemeComments,
  addMemeComment,
  deleteMemeComment,
  createMeme,
  uploadMemeImage,
  generateMeme
};

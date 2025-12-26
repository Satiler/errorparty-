const express = require('express');
const router = express.Router();
const { User, Meme, ChampionHistory, UserStats } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// GET /api/halloffame/gaming - Get gaming achievements
router.get('/gaming', async (req, res) => {
  try {
    // Находим топ по Dota 2 (больше всего мемов с тегом dota2)
    const dota2Stats = await Meme.findAll({
      attributes: [
        'steamId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'memeCount'],
        [sequelize.fn('AVG', sequelize.literal("CAST((match_data->>'kills')::text AS INTEGER)")), 'avgKills'],
        [sequelize.fn('MAX', sequelize.literal("CAST((match_data->>'kills')::text AS INTEGER)")), 'maxKills']
      ],
      where: {
        tags: { [Op.contains]: ['dota2'] },
        steamId: { [Op.ne]: null },
        matchData: { [Op.ne]: null }
      },
      group: ['steam_id'],
      order: [[sequelize.literal('"memeCount"'), 'DESC']],
      limit: 1,
      raw: true
    });

    // Находим топ по CS2
    const cs2Stats = await Meme.findAll({
      attributes: [
        'steamId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'memeCount'],
        [sequelize.fn('AVG', sequelize.literal("CAST((match_data->>'kills')::text AS INTEGER)")), 'avgKills']
      ],
      where: {
        tags: { [Op.contains]: ['cs2'] },
        steamId: { [Op.ne]: null },
        matchData: { [Op.ne]: null }
      },
      group: ['steam_id'],
      order: [[sequelize.literal('"memeCount"'), 'DESC']],
      limit: 1,
      raw: true
    });

    // Находим игрока с наибольшим количеством игр (мемов из обеих игр)
    const multiGameStats = await Meme.findAll({
      attributes: [
        'steamId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalGames']
      ],
      where: {
        steamId: { [Op.ne]: null },
        matchData: { [Op.ne]: null },
        tags: { 
          [Op.or]: [
            { [Op.contains]: ['dota2'] },
            { [Op.contains]: ['cs2'] }
          ]
        }
      },
      group: ['steam_id'],
      order: [[sequelize.literal('"totalGames"'), 'DESC']],
      limit: 1,
      raw: true
    });

    // Получаем информацию о пользователях
    let dota2Champion = null;
    let cs2Champion = null;
    let multiGameKing = null;

    if (dota2Stats.length > 0) {
      const user = await User.findOne({ 
        where: { steamId: dota2Stats[0].steamId },
        attributes: ['id', 'username', 'avatar']
      });
      if (user) {
        dota2Champion = {
          username: user.username,
          avatar: user.avatar,
          avgKills: Math.round(parseFloat(dota2Stats[0].avgKills) || 0),
          maxKills: parseInt(dota2Stats[0].maxKills) || 0,
          gamesPlayed: parseInt(dota2Stats[0].memeCount) || 0
        };
      }
    }

    if (cs2Stats.length > 0) {
      const user = await User.findOne({ 
        where: { steamId: cs2Stats[0].steamId },
        attributes: ['id', 'username', 'avatar']
      });
      if (user) {
        cs2Champion = {
          username: user.username,
          avatar: user.avatar,
          avgKills: Math.round(parseFloat(cs2Stats[0].avgKills) || 0),
          gamesPlayed: parseInt(cs2Stats[0].memeCount) || 0
        };
      }
    }

    if (multiGameStats.length > 0) {
      const user = await User.findOne({ 
        where: { steamId: multiGameStats[0].steamId },
        attributes: ['id', 'username', 'avatar']
      });
      if (user) {
        multiGameKing = {
          username: user.username,
          avatar: user.avatar,
          totalGames: parseInt(multiGameStats[0].totalGames) || 0
        };
      }
    }

    res.json({
      success: true,
      gaming: {
        dota2: dota2Champion,
        cs2: cs2Champion,
        multiGame: multiGameKing
      }
    });
  } catch (error) {
    console.error('Error fetching gaming achievements:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch gaming achievements' 
    });
  }
});

// GET /api/halloffame/champions-history - Get weekly champions history
router.get('/champions-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || 'voice';

    const champions = await ChampionHistory.findAll({
      where: { category },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['year', 'DESC'], ['week_number', 'DESC']],
      limit
    });

    const formattedChampions = champions.map(ch => ({
      weekNumber: ch.weekNumber,
      year: ch.year,
      weekLabel: `Неделя ${ch.weekNumber}, ${ch.year}`,
      user: {
        username: ch.user?.username || 'Unknown',
        avatar: ch.user?.avatar
      },
      score: ch.score,
      metadata: ch.metadata
    }));

    res.json({
      success: true,
      champions: formattedChampions,
      category
    });
  } catch (error) {
    console.error('Error fetching champions history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch champions history' 
    });
  }
});

// GET /api/halloffame/achievements - Get user achievements
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: UserStats,
        as: 'stats'
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate achievements
    const achievements = [];

    // Voice activity achievements
    const hoursOnline = Math.floor((user.totalOnlineTime || 0) / 3600);
    if (hoursOnline >= 100) achievements.push({ id: 'voice_100h', name: 'Болтун', description: '100+ часов в голосовом чате', icon: '🎤', rarity: 'rare' });
    if (hoursOnline >= 500) achievements.push({ id: 'voice_500h', name: 'Радиоведущий', description: '500+ часов в голосовом чате', icon: '📻', rarity: 'epic' });
    if (hoursOnline >= 1000) achievements.push({ id: 'voice_1000h', name: 'Легенда микрофона', description: '1000+ часов в голосовом чате', icon: '👑', rarity: 'legendary' });

    // Connections achievements
    const connections = user.stats?.totalConnections || 0;
    if (connections >= 100) achievements.push({ id: 'connect_100', name: 'Частый гость', description: '100+ подключений', icon: '🚪', rarity: 'common' });
    if (connections >= 500) achievements.push({ id: 'connect_500', name: 'Завсегдатай', description: '500+ подключений', icon: '🏠', rarity: 'rare' });

    // Level achievements
    const level = user.stats?.level || 1;
    if (level >= 10) achievements.push({ id: 'level_10', name: 'Опытный', description: 'Достигнут 10 уровень', icon: '⭐', rarity: 'common' });
    if (level >= 25) achievements.push({ id: 'level_25', name: 'Профессионал', description: 'Достигнут 25 уровень', icon: '🌟', rarity: 'rare' });
    if (level >= 50) achievements.push({ id: 'level_50', name: 'Мастер', description: 'Достигнут 50 уровень', icon: '💎', rarity: 'epic' });

    // Meme achievements
    const memeCount = await Meme.count({ where: { userId: user.id } });
    if (memeCount >= 10) achievements.push({ id: 'meme_10', name: 'Мемолог', description: 'Создано 10+ мемов', icon: '🎨', rarity: 'common' });
    if (memeCount >= 50) achievements.push({ id: 'meme_50', name: 'Мастер мемов', description: 'Создано 50+ мемов', icon: '🖼️', rarity: 'rare' });
    if (memeCount >= 100) achievements.push({ id: 'meme_100', name: 'Король мемов', description: 'Создано 100+ мемов', icon: '👑', rarity: 'legendary' });

    // Champion achievements
    const championCount = await ChampionHistory.count({ 
      where: { userId: user.id, category: 'voice' }
    });
    if (championCount >= 1) achievements.push({ id: 'champion_week', name: 'Чемпион недели', description: 'Был топ-1 по активности', icon: '🏆', rarity: 'epic' });
    if (championCount >= 4) achievements.push({ id: 'champion_month', name: 'Чемпион месяца', description: '4+ недели в топе', icon: '👑', rarity: 'legendary' });

    // Early bird
    const userAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (userAge >= 30) achievements.push({ id: 'veteran_30d', name: 'Ветеран', description: '30+ дней с нами', icon: '🎖️', rarity: 'rare' });
    if (userAge >= 365) achievements.push({ id: 'veteran_1y', name: 'Старожил', description: 'Год с нами!', icon: '🏅', rarity: 'legendary' });

    res.json({
      success: true,
      achievements,
      totalAchievements: achievements.length,
      user: {
        username: user.username,
        level: user.stats?.level || 1
      }
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch achievements' 
    });
  }
});

module.exports = router;

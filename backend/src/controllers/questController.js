const { Quest, UserQuest, UserStats } = require('../models');
const questService = require('../services/questService');
const pushNotificationService = require('../services/pushNotificationService');

// Получить активные задания пользователя
const getUserQuests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { game } = req.query;
    const userId = req.user.id;
    
    console.log(`🎯 getUserQuests called for userId: ${userId}, game: ${game || 'all'}`);
    
    const quests = await questService.getUserQuests(userId, game || null);
    
    console.log(`📊 Total quests from service: ${quests.length}`);
    quests.forEach((q, i) => {
      console.log(`  ${i+1}. ${q.quest?.title} (${q.quest?.type}, ${q.status})`);
    });
    
    // Группируем по типу
    const grouped = {
      daily: quests.filter(q => q.quest.type === 'daily'),
      weekly: quests.filter(q => q.quest.type === 'weekly'),
      special: quests.filter(q => q.quest.type === 'special')
    };
    
    console.log(`📋 Grouped: daily=${grouped.daily.length}, weekly=${grouped.weekly.length}, special=${grouped.special.length}`);
    
    // Отключаем кэширование для этого эндпоинта
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      quests: grouped,
      total: quests.length
    });
  } catch (error) {
    console.error('Error fetching user quests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quests' });
  }
};

// Назначить новые задания пользователю
const assignDailyQuests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { game } = req.body;
    
    if (!game || !['dota2', 'cs2'].includes(game)) {
      return res.status(400).json({ success: false, error: 'Invalid game' });
    }
    
    const assigned = await questService.assignQuests(userId, game, 'daily');
    
    res.json({
      success: true,
      assigned: assigned.length,
      message: `Assigned ${assigned.length} daily quests`
    });
  } catch (error) {
    console.error('Error assigning quests:', error);
    res.status(500).json({ success: false, error: 'Failed to assign quests' });
  }
};

// Забрать награду
const claimReward = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { questId } = req.params;
    
    const result = await questService.claimQuestReward(userId, questId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Отправляем push-уведомление о полученной награде
    if (result.quest) {
      await pushNotificationService.notifyQuestCompleted(
        userId,
        result.quest.title,
        result.reward
      ).catch(err => console.error('Push notification failed:', err));
    }
    
    // Проверяем повышение уровня
    if (result.levelUp) {
      await pushNotificationService.notifyLevelUp(
        userId,
        result.newLevel
      ).catch(err => console.error('Level up push failed:', err));
    }
    
    res.json({
      success: true,
      reward: result.reward,
      levelUp: result.levelUp,
      newLevel: result.newLevel,
      message: 'Reward claimed successfully'
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ success: false, error: 'Failed to claim reward' });
  }
};

// Получить информацию об уровне и прогрессе
const getLevelInfo = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.params.userId || req.user.id;
    
    let stats = await UserStats.findOne({ where: { userId } });
    
    if (!stats) {
      // Создаем статистику если её нет
      stats = await UserStats.create({
        userId,
        level: 1,
        experience: 0
      });
    }
    
    // Пересчитываем уровень на основе опыта
    const correctLevel = questService.calculateLevel(stats.experience);
    if (correctLevel !== stats.level) {
      stats.level = correctLevel;
      await stats.save();
    }
    
    const progress = questService.getLevelProgress(stats.experience, stats.level);
    const nextLevelXp = questService.getXpForNextLevel(stats.level);
    
    res.json({
      success: true,
      level: stats.level,
      xp: stats.experience,
      xpForNextLevel: nextLevelXp,
      progressPercentage: progress.percentage,
      currentLevelXp: progress.current,
      xpNeeded: progress.needed
    });
  } catch (error) {
    console.error('Error fetching level info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch level info' });
  }
};

// Анализ последнего матча и обновление прогресса
const analyzeMatch = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { game, matchData } = req.body;
    
    if (!game || !matchData) {
      return res.status(400).json({ success: false, error: 'Missing game or match data' });
    }
    
    // Обновляем прогресс квестов
    const result = await questService.updateQuestProgress(userId, matchData, game);
    
    res.json({
      success: true,
      completedQuests: result.completedQuests.length,
      quests: result.completedQuests.map(q => ({
        title: q.quest.title,
        reward: q.reward
      })),
      xpGained: result.totalXp,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel
    });
  } catch (error) {
    console.error('Error analyzing match:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze match' });
  }
};

// Получить доступные квесты для выбора
const getAvailableQuests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { game, type } = req.query;
    
    if (!game || !['dota2', 'cs2'].includes(game)) {
      return res.status(400).json({ success: false, error: 'Invalid game parameter' });
    }
    
    if (!type || !['daily', 'weekly'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type parameter' });
    }
    
    const availableQuests = await questService.getAvailableQuests(userId, game, type);
    
    res.json({
      success: true,
      ...availableQuests
    });
  } catch (error) {
    console.error('Error fetching available quests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available quests' });
  }
};

// Выбрать конкретные квесты
const selectQuests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { questIds, type } = req.body;
    
    if (!questIds || !Array.isArray(questIds) || questIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Quest IDs are required' });
    }
    
    if (!type || !['daily', 'weekly'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid type parameter' });
    }
    
    const assigned = await questService.selectQuests(userId, questIds, type);
    
    res.json({
      success: true,
      assigned: assigned.length,
      quests: assigned.map(uq => ({
        id: uq.id,
        questId: uq.questId,
        progress: uq.progress,
        targetValue: uq.targetValue,
        expiresAt: uq.expiresAt
      })),
      message: `Успешно выбрано ${assigned.length} ${type === 'daily' ? 'ежедневных' : 'еженедельных'} заданий`
    });
  } catch (error) {
    console.error('Error selecting quests:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUserQuests,
  assignDailyQuests,
  claimReward,
  getLevelInfo,
  analyzeMatch,
  getAvailableQuests,
  selectQuests,
  getQuests: getAvailableQuests, // Алиас
  getQuestById: async (req, res) => { // Добавляем функцию
    try {
      const { questId } = req.params;
      const quest = await Quest.findByPk(questId);
      
      if (!quest) {
        return res.status(404).json({ success: false, error: 'Quest not found' });
      }
      
      res.json({ success: true, quest });
    } catch (error) {
      console.error('Error fetching quest:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch quest' });
    }
  },
  claimQuestReward: claimReward, // Алиас
  getUserQuestStats: getLevelInfo // Алиас
};

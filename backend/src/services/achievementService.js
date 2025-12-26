const { Achievement, User } = require('../models');

// Achievement definitions with conditions
const ACHIEVEMENT_DEFINITIONS = {
  dota2: [
    {
      key: 'first_blood_king',
      title: '👑 Король First Blood',
      description: 'Получено 100+ first blood убийств',
      icon: '👑',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.mostKills?.kills >= 100;
      }
    },
    {
      key: 'rampage_master',
      title: '💀 Мастер Rampage',
      description: 'Получено 10+ rampage',
      icon: '💀',
      rarity: 'legendary',
      check: (stats, records) => {
        // Would need rampage count from OpenDota
        return false; // Placeholder
      }
    },
    {
      key: 'ultra_killer',
      title: '⚔️ Ультра киллер',
      description: '30+ убийств в одной игре',
      icon: '⚔️',
      rarity: 'rare',
      check: (stats, records) => {
        return records?.mostKills?.kills >= 30;
      }
    },
    {
      key: 'immortal_feeder',
      title: '💩 Бессмертный фидер',
      description: '25+ смертей в одной игре',
      icon: '💩',
      rarity: 'common',
      check: (stats, records) => {
        return records?.mostDeaths?.deaths >= 25;
      }
    },
    {
      key: 'support_god',
      title: '🤝 Бог поддержки',
      description: '40+ assists в одной игре',
      icon: '🤝',
      rarity: 'rare',
      check: (stats, records) => {
        return records?.mostAssists?.assists >= 40;
      }
    },
    {
      key: 'farming_machine',
      title: '🌾 Машина для фарма',
      description: '1000+ last hits в одной игре',
      icon: '🌾',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.mostLastHits?.last_hits >= 1000;
      }
    },
    {
      key: 'gold_digger',
      title: '💰 Золотоискатель',
      description: '1000+ GPM в одной игре',
      icon: '💰',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.highestGPM?.gold_per_min >= 1000;
      }
    },
    {
      key: 'experience_farmer',
      title: '⭐ Фармер опыта',
      description: '1200+ XPM в одной игре',
      icon: '⭐',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.highestXPM?.xp_per_min >= 1200;
      }
    },
    {
      key: 'tower_destroyer',
      title: '🏰 Разрушитель башен',
      description: '15000+ урона башням в одной игре',
      icon: '🏰',
      rarity: 'rare',
      check: (stats, records) => {
        return records?.mostTowerDamage?.tower_damage >= 15000;
      }
    },
    {
      key: 'hero_slayer',
      title: '💥 Истребитель героев',
      description: '100000+ урона героям в одной игре',
      icon: '💥',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.mostHeroDamage?.hero_damage >= 100000;
      }
    },
    {
      key: 'marathon_player',
      title: '⏱️ Марафонец',
      description: 'Игра длительностью 90+ минут',
      icon: '⏱️',
      rarity: 'rare',
      check: (stats, records) => {
        return records?.longestGame?.duration >= 5400; // 90 mins
      }
    },
    {
      key: 'speed_runner',
      title: '⚡ Спидраннер',
      description: 'Победа за 15 минут или меньше',
      icon: '⚡',
      rarity: 'epic',
      check: (stats, records) => {
        return records?.shortestWin?.duration <= 900; // 15 mins
      }
    },
    {
      key: 'winner_50',
      title: '🏆 50% Победитель',
      description: 'Winrate 50% или выше',
      icon: '🏆',
      rarity: 'common',
      check: (stats) => {
        return parseFloat(stats.winrate) >= 50;
      }
    },
    {
      key: 'winner_60',
      title: '🏆 60% Победитель',
      description: 'Winrate 60% или выше',
      icon: '🏆',
      rarity: 'rare',
      check: (stats) => {
        return parseFloat(stats.winrate) >= 60;
      }
    },
    {
      key: 'winner_70',
      title: '🏆 70% Легенда',
      description: 'Winrate 70% или выше',
      icon: '🏆',
      rarity: 'legendary',
      check: (stats) => {
        return parseFloat(stats.winrate) >= 70;
      }
    },
    {
      key: 'veteran_player',
      title: '🎖️ Ветеран',
      description: '1000+ сыгранных матчей',
      icon: '🎖️',
      rarity: 'rare',
      check: (stats) => {
        return stats.totalMatches >= 1000;
      }
    },
    {
      key: 'immortal_rank',
      title: '👑 Immortal',
      description: 'Достигнут ранг Immortal',
      icon: '👑',
      rarity: 'mythic',
      check: (stats) => {
        return stats.rank && stats.rank >= 80; // Immortal starts at rank 80
      }
    },
    {
      key: 'divine_rank',
      title: '💎 Divine',
      description: 'Достигнут ранг Divine',
      icon: '💎',
      rarity: 'legendary',
      check: (stats) => {
        return stats.rank && stats.rank >= 70 && stats.rank < 80;
      }
    },
    {
      key: 'kda_master',
      title: '🎯 Мастер KDA',
      description: 'KDA 5.0 или выше',
      icon: '🎯',
      rarity: 'epic',
      check: (stats) => {
        return stats.advancedStats && parseFloat(stats.advancedStats.kda) >= 5.0;
      }
    }
  ],
  cs2: [
    {
      key: 'ace_king',
      title: '👑 Король ACE',
      description: 'Получено 50+ ACE',
      icon: '👑',
      rarity: 'epic',
      check: (stats) => {
        // Would need ace count from stats
        return false; // Placeholder
      }
    },
    {
      key: 'headshot_god',
      title: '🎯 Бог хедшотов',
      description: '80%+ headshot rate',
      icon: '🎯',
      rarity: 'legendary',
      check: (stats) => {
        // Would need headshot percentage
        return false; // Placeholder
      }
    },
    {
      key: 'clutch_master',
      title: '💪 Мастер клатчей',
      description: 'Выиграно 100+ 1v2+ ситуаций',
      icon: '💪',
      rarity: 'epic',
      check: (stats) => {
        return false; // Placeholder
      }
    }
  ],
  general: [
    {
      key: 'first_meme',
      title: '🎨 Первый мем',
      description: 'Создан первый мем',
      icon: '🎨',
      rarity: 'common',
      check: async (userId) => {
        const { Meme } = require('../models');
        const count = await Meme.count({ where: { userId } });
        return count >= 1;
      }
    },
    {
      key: 'meme_lord',
      title: '👑 Повелитель мемов',
      description: 'Создано 50+ мемов',
      icon: '👑',
      rarity: 'rare',
      check: async (userId) => {
        const { Meme } = require('../models');
        const count = await Meme.count({ where: { userId } });
        return count >= 50;
      }
    },
    {
      key: 'quote_master',
      title: '💬 Мастер цитат',
      description: 'Добавлено 20+ цитат',
      icon: '💬',
      rarity: 'rare',
      check: async (userId) => {
        const { Quote } = require('../models');
        const count = await Quote.count({ where: { submittedBy: userId } });
        return count >= 20;
      }
    },
    {
      key: 'voice_legend',
      title: '🎤 Легенда голосового чата',
      description: '1000+ часов в войсе',
      icon: '🎤',
      rarity: 'epic',
      check: async (userId) => {
        const { UserStats } = require('../models');
        const stats = await UserStats.findOne({ where: { userId } });
        return stats && stats.totalOnlineTime >= 3600000; // 1000 hours in seconds
      }
    }
  ]
};

/**
 * Check and award achievements for a user based on their stats
 */
const checkAndAwardAchievements = async (userId, game, stats, records = null) => {
  const newAchievements = [];
  
  try {
    const definitions = ACHIEVEMENT_DEFINITIONS[game] || [];
    
    for (const def of definitions) {
      // Check if user already has this achievement
      const existing = await Achievement.findOne({
        where: {
          userId,
          achievementKey: def.key
        }
      });
      
      if (existing) continue;
      
      // Check if condition is met
      let conditionMet = false;
      
      if (typeof def.check === 'function') {
        if (game === 'general') {
          conditionMet = await def.check(userId);
        } else {
          conditionMet = def.check(stats, records);
        }
      }
      
      if (conditionMet) {
        // Extract match_id if available from records
        let matchId = null;
        if (records) {
          // Find the match_id from the relevant record for this achievement
          const recordKey = Object.keys(records).find(key => {
            const record = records[key];
            return record && record.match_id;
          });
          if (recordKey && records[recordKey]) {
            matchId = records[recordKey].match_id;
          }
        }

        // Check if this match_id was already used for any achievement
        if (matchId) {
          const existingWithMatch = await Achievement.findOne({
            where: {
              userId,
              game
            }
          });
          
          // Check all existing achievements for this match_id in metadata
          const allUserAchievements = await Achievement.findAll({
            where: { userId, game }
          });
          
          const matchAlreadyUsed = allUserAchievements.some(ach => {
            return ach.metadata?.match_id === matchId;
          });
          
          if (matchAlreadyUsed) {
            console.log(`Match ${matchId} already used for another achievement, skipping ${def.key}`);
            continue;
          }
        }

        // Award achievement
        const achievement = await Achievement.create({
          userId,
          game,
          achievementKey: def.key,
          title: def.title,
          description: def.description,
          icon: def.icon,
          rarity: def.rarity,
          metadata: {
            match_id: matchId,
            stats: game !== 'general' ? { ...stats, records } : null
          }
        });
        
        newAchievements.push(achievement);
      }
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Get all achievements for a user
 */
const getUserAchievements = async (userId, game = null) => {
  try {
    const where = { userId };
    if (game) {
      where.game = game;
    }
    
    const achievements = await Achievement.findAll({
      where,
      order: [
        ['rarity', 'DESC'],
        ['earned_at', 'DESC']
      ]
    });
    
    return achievements;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }
};

/**
 * Get achievement statistics
 */
const getAchievementStats = async (userId) => {
  try {
    const achievements = await Achievement.findAll({ where: { userId } });
    
    const byGame = {
      dota2: achievements.filter(a => a.game === 'dota2').length,
      cs2: achievements.filter(a => a.game === 'cs2').length,
      general: achievements.filter(a => a.game === 'general').length
    };
    
    const byRarity = {
      common: achievements.filter(a => a.rarity === 'common').length,
      rare: achievements.filter(a => a.rarity === 'rare').length,
      epic: achievements.filter(a => a.rarity === 'epic').length,
      legendary: achievements.filter(a => a.rarity === 'legendary').length,
      mythic: achievements.filter(a => a.rarity === 'mythic').length
    };
    
    return {
      total: achievements.length,
      byGame,
      byRarity,
      recent: achievements.slice(0, 5)
    };
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    return null;
  }
};

module.exports = {
  ACHIEVEMENT_DEFINITIONS,
  checkAndAwardAchievements,
  getUserAchievements,
  getAchievementStats
};

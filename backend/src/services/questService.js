const { Quest, UserQuest, User, UserStats, CS2Match } = require('../models');
const { Op } = require('sequelize');

// Singleton для уведомлений (будет инициализирован позже)
let steamNotificationService = null;
let pushNotificationService = null;

const initSteamNotifications = (steamBotService) => {
  const SteamNotificationService = require('./steamNotificationService');
  steamNotificationService = new SteamNotificationService(steamBotService);
  console.log('✅ Steam Notification Service initialized');
};

const initPushNotifications = () => {
  pushNotificationService = require('./pushNotificationService');
  console.log('✅ Push Notification Service initialized');
};

// Initialize push notifications
initPushNotifications();

// Шаблоны заданий для Dota 2
const DOTA2_QUESTS = [
  // Daily - Easy
  { key: 'daily_win', title: '🏆 Победитель дня', description: 'Одержи 1 победу', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'win', value: 1 }, reward: { xp: 50, coins: 10 }, icon: '🏆' },
  { key: 'daily_kills_10', title: '💀 Убийца', description: 'Получи 10+ киллов в одном матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'kills_per_match', value: 10 }, reward: { xp: 75, coins: 15 }, icon: '💀' },
  { key: 'daily_assists_10', title: '🤝 Помощник', description: 'Получи 10+ ассистов в одном матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'assists_per_match', value: 10 }, reward: { xp: 60, coins: 12 }, icon: '🤝' },
  { key: 'daily_last_hits', title: '⚔️ Последний удар', description: 'Добей 200+ крипов в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'last_hits', value: 200 }, reward: { xp: 70, coins: 14 }, icon: '⚔️' },
  { key: 'daily_denies', title: '🚫 Отрицание', description: 'Заденай 30+ крипов в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'denies', value: 30 }, reward: { xp: 65, coins: 13 }, icon: '🚫' },
  { key: 'daily_wards', title: '👁️ Видение', description: 'Установи 10+ вардов за матч', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'wards', value: 10 }, reward: { xp: 55, coins: 11 }, icon: '👁️' },
  { key: 'daily_hero_damage', title: '💥 Урон по героям', description: 'Нанеси 15000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'hero_damage', value: 15000 }, reward: { xp: 75, coins: 15 }, icon: '💥' },
  { key: 'daily_healing', title: '💚 Целитель', description: 'Вылечи 5000+ HP за матч', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'healing', value: 5000 }, reward: { xp: 70, coins: 14 }, icon: '💚' },
  { key: 'daily_stuns', title: '⚡ Контроль', description: 'Обездвижь врагов на 50+ секунд', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'stun_duration', value: 50 }, reward: { xp: 65, coins: 13 }, icon: '⚡' },
  { key: 'daily_game_played', title: '🎮 Участник', description: 'Сыграй 1 матч', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'games_played', value: 1 }, reward: { xp: 40, coins: 8 }, icon: '🎮' },
  { key: 'daily_kills_5', title: '🗡️ Боец', description: 'Получи 5+ киллов в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'kills_per_match', value: 5 }, reward: { xp: 55, coins: 11 }, icon: '🗡️' },
  { key: 'daily_gpm_400', title: '💵 Добытчик', description: 'Набери 400+ GPM в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'gpm', value: 400 }, reward: { xp: 60, coins: 12 }, icon: '💵' },
  { key: 'daily_xpm_400', title: '📈 Растущий', description: 'Набери 400+ XPM в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'xpm', value: 400 }, reward: { xp: 60, coins: 12 }, icon: '📈' },
  { key: 'daily_kda_2', title: '🎲 Результат', description: 'Закончи с KDA 2.0+', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'kda', value: 2.0 }, reward: { xp: 70, coins: 14 }, icon: '🎲' },
  { key: 'daily_last_hits_100', title: '🌾 Фермер-новичок', description: 'Добей 100+ крипов', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'last_hits', value: 100 }, reward: { xp: 50, coins: 10 }, icon: '🌾' },
  { key: 'daily_assists_5', title: '👥 Союзник', description: 'Получи 5+ ассистов', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'assists_per_match', value: 5 }, reward: { xp: 45, coins: 9 }, icon: '👥' },
  { key: 'daily_tower_dmg_low', title: '🗼 Разрушитель башен', description: 'Нанеси 1500+ урона по башням', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'tower_damage', value: 1500 }, reward: { xp: 55, coins: 11 }, icon: '🗼' },
  { key: 'daily_hero_dmg_low', title: '⚔️ Нападающий', description: 'Нанеси 10000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'hero_damage', value: 10000 }, reward: { xp: 60, coins: 12 }, icon: '⚔️' },
  { key: 'daily_denies_15', title: '❌ Опытный деньер', description: 'Заденай 15+ крипов', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'denies', value: 15 }, reward: { xp: 50, coins: 10 }, icon: '❌' },
  { key: 'daily_heal_low', title: '🩹 Лекарь', description: 'Вылечи 2500+ HP', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'healing', value: 2500 }, reward: { xp: 55, coins: 11 }, icon: '🩹' },
  { key: 'daily_gpm_500', title: '💸 Зарабатывающий', description: 'Набери 500+ GPM', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'gpm', value: 500 }, reward: { xp: 65, coins: 13 }, icon: '💸' },
  { key: 'daily_xpm_500', title: '📊 Опытный', description: 'Набери 500+ XPM', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'xpm', value: 500 }, reward: { xp: 65, coins: 13 }, icon: '📊' },
  { key: 'daily_win_quick', title: '⚡ Быстрая победа', description: 'Выиграй матч', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'win', value: 1 }, reward: { xp: 60, coins: 12 }, icon: '⚡' },
  { key: 'daily_last_hits_150', title: '🌻 Середнячок', description: 'Добей 150+ крипов', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'last_hits', value: 150 }, reward: { xp: 60, coins: 12 }, icon: '🌻' },
  
  // Daily - Medium
  { key: 'daily_kda_3', title: '🎯 Эффективность', description: 'Закончи матч с KDA 3.0+', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'kda', value: 3.0 }, reward: { xp: 100, coins: 20 }, icon: '🎯' },
  { key: 'daily_gpm_600', title: '💰 Фармер', description: 'Набери 600+ GPM в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'gpm', value: 600 }, reward: { xp: 90, coins: 18 }, icon: '💰' },
  { key: 'daily_xpm_600', title: '⚡ Опыт', description: 'Набери 600+ XPM в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'xpm', value: 600 }, reward: { xp: 90, coins: 18 }, icon: '⚡' },
  { key: 'daily_tower_damage', title: '🏰 Осадник', description: 'Нанеси 3000+ урона по зданиям', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'tower_damage', value: 3000 }, reward: { xp: 85, coins: 17 }, icon: '🏰' },
  { key: 'daily_kills_15', title: '🔪 Убийственная машина', description: 'Получи 15+ киллов в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'kills_per_match', value: 15 }, reward: { xp: 110, coins: 22 }, icon: '🔪' },
  { key: 'daily_assists_15', title: '🎭 Командный игрок', description: 'Получи 15+ ассистов в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'assists_per_match', value: 15 }, reward: { xp: 95, coins: 19 }, icon: '🎭' },
  { key: 'daily_net_worth', title: '💎 Богач', description: 'Набери 20000+ голды за матч', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'net_worth', value: 20000 }, reward: { xp: 105, coins: 21 }, icon: '💎' },
  { key: 'daily_runes', title: '🌟 Собиратель рун', description: 'Подбери 5+ рун за матч', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'runes', value: 5 }, reward: { xp: 80, coins: 16 }, icon: '🌟' },
  { key: 'daily_roshan', title: '🐲 Охотник на Рошана', description: 'Убей Рошана 2+ раза', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'roshan_kills', value: 2 }, reward: { xp: 100, coins: 20 }, icon: '🐲' },
  { key: 'daily_hero_dmg_med', title: '💢 Дамагер', description: 'Нанеси 20000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'hero_damage', value: 20000 }, reward: { xp: 95, coins: 19 }, icon: '💢' },
  { key: 'daily_last_hits_250', title: '🌽 Опытный фармер', description: 'Добей 250+ крипов', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'last_hits', value: 250 }, reward: { xp: 100, coins: 20 }, icon: '🌽' },
  { key: 'daily_denies_40', title: '🔒 Мастер деная', description: 'Заденай 40+ крипов', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'denies', value: 40 }, reward: { xp: 90, coins: 18 }, icon: '🔒' },
  { key: 'daily_kills_12', title: '🎖️ Опасный противник', description: 'Получи 12+ киллов', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'kills_per_match', value: 12 }, reward: { xp: 95, coins: 19 }, icon: '🎖️' },
  { key: 'daily_assists_12', title: '🤲 Хороший союзник', description: 'Получи 12+ ассистов', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'assists_per_match', value: 12 }, reward: { xp: 85, coins: 17 }, icon: '🤲' },
  { key: 'daily_tower_dmg_med', title: '🏯 Разрушитель укреплений', description: 'Нанеси 5000+ урона по башням', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'tower_damage', value: 5000 }, reward: { xp: 100, coins: 20 }, icon: '🏯' },
  { key: 'daily_heal_med', title: '💊 Целитель команды', description: 'Вылечи 8000+ HP', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'healing', value: 8000 }, reward: { xp: 95, coins: 19 }, icon: '💊' },
  { key: 'daily_gpm_700', title: '💵 Золотые руки', description: 'Набери 700+ GPM', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'gpm', value: 700 }, reward: { xp: 105, coins: 21 }, icon: '💵' },
  { key: 'daily_xpm_700', title: '📈 Быстрый рост', description: 'Набери 700+ XPM', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'xpm', value: 700 }, reward: { xp: 105, coins: 21 }, icon: '📈' },
  
  // Daily - Hard
  { key: 'daily_godlike', title: '⭐ Godlike', description: 'Получи серию Godlike или выше', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'godlike', value: 1 }, reward: { xp: 150, coins: 30 }, icon: '⭐' },
  { key: 'daily_no_death', title: '👻 Неуловимый', description: 'Выиграй без смертей', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'no_death_win', value: 1 }, reward: { xp: 200, coins: 40 }, icon: '👻' },
  { key: 'daily_kda_5', title: '🏅 Перфекционист', description: 'Закончи матч с KDA 5.0+', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'kda', value: 5.0 }, reward: { xp: 180, coins: 36 }, icon: '🏅' },
  { key: 'daily_triple_kill', title: '🎯 Тройное убийство', description: 'Получи Triple Kill', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'triple_kill', value: 1 }, reward: { xp: 160, coins: 32 }, icon: '🎯' },
  { key: 'daily_gpm_800', title: '🤑 Миллионер', description: 'Набери 800+ GPM в матче', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'gpm', value: 800 }, reward: { xp: 170, coins: 34 }, icon: '🤑' },
  { key: 'daily_kills_20', title: '☠️ Машина смерти', description: 'Получи 20+ киллов', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'kills_per_match', value: 20 }, reward: { xp: 180, coins: 36 }, icon: '☠️' },
  { key: 'daily_assists_20', title: '🎭 Идеальный тиммейт', description: 'Получи 20+ ассистов', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'assists_per_match', value: 20 }, reward: { xp: 170, coins: 34 }, icon: '🎭' },
  { key: 'daily_last_hits_300', title: '🏆 Фарм-машина', description: 'Добей 300+ крипов', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'last_hits', value: 300 }, reward: { xp: 180, coins: 36 }, icon: '🏆' },
  { key: 'daily_hero_dmg_hard', title: '💥 Разрушитель', description: 'Нанеси 30000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'hero_damage', value: 30000 }, reward: { xp: 190, coins: 38 }, icon: '💥' },
  { key: 'daily_tower_dmg_hard', title: '🏰 Штурмовик', description: 'Нанеси 8000+ урона по башням', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'tower_damage', value: 8000 }, reward: { xp: 180, coins: 36 }, icon: '🏰' },
  { key: 'daily_kda_4', title: '🌟 Звездный игрок', description: 'Закончи с KDA 4.0+', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'kda', value: 4.0 }, reward: { xp: 170, coins: 34 }, icon: '🌟' },
  { key: 'daily_xpm_800', title: '🚀 Ракета', description: 'Набери 800+ XPM', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'xpm', value: 800 }, reward: { xp: 180, coins: 36 }, icon: '🚀' },
  { key: 'daily_denies_50', title: '🛡️ Гранд-мастер деная', description: 'Заденай 50+ крипов', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'denies', value: 50 }, reward: { xp: 170, coins: 34 }, icon: '🛡️' },
  { key: 'daily_heal_hard', title: '💚 Архи-целитель', description: 'Вылечи 12000+ HP', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'healing', value: 12000 }, reward: { xp: 180, coins: 36 }, icon: '💚' },
  
  // Weekly - Medium
  { key: 'weekly_wins_5', title: '🔥 Серия побед', description: 'Одержи 5 побед за неделю', game: 'dota2', type: 'weekly', difficulty: 'medium', requirement: { type: 'win', value: 5 }, reward: { xp: 300, coins: 60, tsRole: 'Dota 2 Player' }, icon: '🔥' },
  { key: 'weekly_games_10', title: '🎮 Активный игрок', description: 'Сыграй 10 матчей за неделю', game: 'dota2', type: 'weekly', difficulty: 'easy', requirement: { type: 'games_played', value: 10 }, reward: { xp: 250, coins: 50 }, icon: '🎮' },
  { key: 'weekly_kda_4', title: '🎖️ Мастер', description: 'Набери средний KDA 4.0+ за 5 матчей', game: 'dota2', type: 'weekly', difficulty: 'medium', requirement: { type: 'avg_kda', value: 4.0, games: 5 }, reward: { xp: 350, coins: 70 }, icon: '🎖️' },
  { key: 'weekly_farm_master', title: '💎 Фарм-монстр', description: 'Набери 700+ GPM в 3 матчах', game: 'dota2', type: 'weekly', difficulty: 'medium', requirement: { type: 'gpm_count', value: 700, games: 3 }, reward: { xp: 350, coins: 70 }, icon: '💎' },
  
  // Weekly - Hard
  { key: 'weekly_ultra_kills', title: '💥 Ultra Killer', description: 'Получи 20+ киллов в матче', game: 'dota2', type: 'weekly', difficulty: 'hard', requirement: { type: 'kills_per_match', value: 20 }, reward: { xp: 400, coins: 80, tsRole: 'Quest Master' }, icon: '💥' },
  { key: 'weekly_win_streak', title: '🌟 Победная серия', description: 'Выиграй 3 матча подряд', game: 'dota2', type: 'weekly', difficulty: 'hard', requirement: { type: 'win_streak', value: 3 }, reward: { xp: 450, coins: 90 }, icon: '🌟' },
  { key: 'weekly_dominator', title: '👿 Доминатор', description: 'Закончи матч с 15+ киллов и 0 смертей', game: 'dota2', type: 'weekly', difficulty: 'hard', requirement: { type: 'perfect_game', kills: 15, deaths: 0 }, reward: { xp: 500, coins: 100, tsRole: 'Quest Master' }, icon: '👿' },
  { key: 'weekly_support_god', title: '💚 Бог поддержки', description: 'Набери 25+ ассистов в матче', game: 'dota2', type: 'weekly', difficulty: 'hard', requirement: { type: 'assists_per_match', value: 25 }, reward: { xp: 400, coins: 80 }, icon: '💚' },
  
  // Weekly - Epic
  { key: 'weekly_rampage', title: '👑 Rampage Hunter', description: 'Получи Rampage', game: 'dota2', type: 'weekly', difficulty: 'epic', requirement: { type: 'rampage', value: 1 }, reward: { xp: 500, coins: 100, tsRole: 'Legend' }, icon: '👑' },
  { key: 'weekly_triple_rampage', title: '🔱 Легенда', description: 'Получи 30+ киллов в матче', game: 'dota2', type: 'weekly', difficulty: 'epic', requirement: { type: 'kills_per_match', value: 30 }, reward: { xp: 600, coins: 120, tsRole: 'Legend' }, icon: '🔱' },
  { key: 'weekly_immortal', title: '🌌 Бессмертный', description: 'Выиграй 10 матчей подряд', game: 'dota2', type: 'weekly', difficulty: 'epic', requirement: { type: 'win_streak', value: 10 }, reward: { xp: 1000, coins: 200, tsRole: 'Legend' }, icon: '🌌' },
  { key: 'weekly_carry_god', title: '💫 Бог керри', description: 'Набери 900+ GPM в матче', game: 'dota2', type: 'weekly', difficulty: 'epic', requirement: { type: 'gpm', value: 900 }, reward: { xp: 700, coins: 140, tsRole: 'Legend' }, icon: '💫' },
  { key: 'weekly_perfect_kda', title: '🌟 Идеальный KDA', description: 'Закончи с KDA 10.0+', game: 'dota2', type: 'weekly', difficulty: 'epic', requirement: { type: 'kda', value: 10.0 }, reward: { xp: 800, coins: 160, tsRole: 'Legend' }, icon: '🌟' },
  
  // Daily - Easy (дополнительные)
  { key: 'daily_tower_hit', title: '🗼 Разрушитель', description: 'Нанеси 1000+ урона по зданиям', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'tower_damage', value: 1000 }, reward: { xp: 55, coins: 11 }, icon: '🗼' },
  { key: 'daily_assists_5', title: '🤗 Товарищ', description: 'Получи 5+ ассистов в матче', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'assists_per_match', value: 5 }, reward: { xp: 50, coins: 10 }, icon: '🤗' },
  { key: 'daily_hero_damage_low', title: '🔨 Дамаг-дилер', description: 'Нанеси 10000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'easy', requirement: { type: 'hero_damage', value: 10000 }, reward: { xp: 60, coins: 12 }, icon: '🔨' },
  
  // Daily - Medium (дополнительные)
  { key: 'daily_kills_12', title: '⚔️ Воин', description: 'Получи 12+ киллов в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'kills_per_match', value: 12 }, reward: { xp: 95, coins: 19 }, icon: '⚔️' },
  { key: 'daily_gpm_700', title: '💎 Богатей', description: 'Набери 700+ GPM в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'gpm', value: 700 }, reward: { xp: 100, coins: 20 }, icon: '💎' },
  { key: 'daily_last_hits_250', title: '🌟 Мастер фарма', description: 'Добей 250+ крипов в матче', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'last_hits', value: 250 }, reward: { xp: 105, coins: 21 }, icon: '🌟' },
  { key: 'daily_tower_push', title: '🏯 Пушер', description: 'Нанеси 5000+ урона зданиям', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'tower_damage', value: 5000 }, reward: { xp: 100, coins: 20 }, icon: '🏯' },
  { key: 'daily_hero_damage_high', title: '💢 Разрушитель героев', description: 'Нанеси 25000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'medium', requirement: { type: 'hero_damage', value: 25000 }, reward: { xp: 110, coins: 22 }, icon: '💢' },
  
  // Daily - Hard (дополнительные)
  { key: 'daily_ultra_kill', title: '💥 Ultra Kill', description: 'Получи 25+ киллов в матче', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'kills_per_match', value: 25 }, reward: { xp: 170, coins: 34 }, icon: '💥' },
  { key: 'daily_kda_7', title: '🌠 Звезда', description: 'Закончи с KDA 7.0+', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'kda', value: 7.0 }, reward: { xp: 190, coins: 38 }, icon: '🌠' },
  { key: 'daily_last_hits_300', title: '👑 Король фарма', description: 'Добей 300+ крипов в матче', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'last_hits', value: 300 }, reward: { xp: 180, coins: 36 }, icon: '👑' },
  { key: 'daily_hero_damage_ultra', title: '🔥 Мега урон', description: 'Нанеси 35000+ урона героям', game: 'dota2', type: 'daily', difficulty: 'hard', requirement: { type: 'hero_damage', value: 35000 }, reward: { xp: 175, coins: 35 }, icon: '🔥' },
];

// Шаблоны заданий для CS2
const CS2_QUESTS = [
  // Daily - Easy
  { key: 'daily_win_cs2', title: '🎖️ Победитель', description: 'Выиграй 1 матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'win', value: 1 }, reward: { xp: 50, coins: 10 }, icon: '🎖️' },
  { key: 'daily_game_cs2', title: '🎮 Участник боя', description: 'Сыграй 1 матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'games_played', value: 1 }, reward: { xp: 40, coins: 8 }, icon: '🎮' },
  { key: 'daily_kills_15', title: '🔫 Снайпер', description: 'Получи 15+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'kills_per_match', value: 15 }, reward: { xp: 70, coins: 14 }, icon: '🔫' },
  { key: 'daily_kills_10', title: '🔪 Боец', description: 'Получи 10+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'kills_per_match', value: 10 }, reward: { xp: 60, coins: 12 }, icon: '🔪' },
  { key: 'daily_headshots', title: '🎯 В голову!', description: 'Получи 5+ хедшотов в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'headshots', value: 5 }, reward: { xp: 65, coins: 13 }, icon: '🎯' },
  { key: 'daily_headshots_3', title: '🎪 Точный стрелок', description: 'Получи 3+ хедшота в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'headshots', value: 3 }, reward: { xp: 50, coins: 10 }, icon: '🎪' },
  { key: 'daily_mvp', title: '⭐ MVP', description: 'Стань MVP в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'mvp', value: 1 }, reward: { xp: 80, coins: 16 }, icon: '⭐' },
  { key: 'daily_assists_cs2', title: '🤝 Напарник', description: 'Получи 5+ ассистов в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'assists', value: 5 }, reward: { xp: 60, coins: 12 }, icon: '🤝' },
  { key: 'daily_assists_3', title: '🤗 Помощь команде', description: 'Получи 3+ ассиста в матче', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'assists', value: 3 }, reward: { xp: 50, coins: 10 }, icon: '🤗' },
  { key: 'daily_plants', title: '💣 Подрывник', description: 'Установи бомбу 3+ раза', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'plants', value: 3 }, reward: { xp: 55, coins: 11 }, icon: '💣' },
  { key: 'daily_first_kills', title: '⚡ Первая кровь', description: 'Получи 3+ первых килла в раундах', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'first_kills', value: 3 }, reward: { xp: 70, coins: 14 }, icon: '⚡' },
  { key: 'daily_damage', title: '💥 Урон', description: 'Нанеси 2000+ урона за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'damage', value: 2000 }, reward: { xp: 65, coins: 13 }, icon: '💥' },
  { key: 'daily_damage_1500', title: '💢 Дамагер', description: 'Нанеси 1500+ урона за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'damage', value: 1500 }, reward: { xp: 55, coins: 11 }, icon: '💢' },
  { key: 'daily_rounds_win', title: '🔥 Раунды', description: 'Выиграй 10+ раундов за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'rounds_won', value: 10 }, reward: { xp: 75, coins: 15 }, icon: '🔥' },
  { key: 'daily_rounds_5', title: '✨ Старт побед', description: 'Выиграй 5+ раундов за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'rounds_won', value: 5 }, reward: { xp: 55, coins: 11 }, icon: '✨' },
  { key: 'daily_kd_1', title: '⚖️ Баланс', description: 'Закончи с KD 1.0+', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'kd', value: 1.0 }, reward: { xp: 60, coins: 12 }, icon: '⚖️' },
  { key: 'daily_knife_kill', title: '🔪 Близкий контакт', description: 'Получи 1 убийство ножом', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'knife_kill', value: 1 }, reward: { xp: 80, coins: 16 }, icon: '🔪' },
  { key: 'daily_smokes', title: '💨 Дымовая завеса', description: 'Используй 5+ смоков за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'smokes_used', value: 5 }, reward: { xp: 55, coins: 11 }, icon: '💨' },
  { key: 'daily_flashes', title: '⚡ Ослепление', description: 'Ослепи врагов 5+ раз', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'enemy_flashed', value: 5 }, reward: { xp: 60, coins: 12 }, icon: '⚡' },
  { key: 'daily_money_earned', title: '💰 Заработок', description: 'Заработай $10000+ за матч', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'money_earned', value: 10000 }, reward: { xp: 65, coins: 13 }, icon: '💰' },
  { key: 'daily_eco_kills', title: '💸 Эко-раунд', description: 'Получи 3+ килла в эко-раунде', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'eco_kills', value: 3 }, reward: { xp: 70, coins: 14 }, icon: '💸' },
  { key: 'daily_wallbang', title: '🧱 Сквозь стену', description: 'Получи 1 килл через стену', game: 'cs2', type: 'daily', difficulty: 'easy', requirement: { type: 'wallbang', value: 1 }, reward: { xp: 75, coins: 15 }, icon: '🧱' },
  
  // Daily - Medium
  { key: 'daily_kd_1_5', title: '⚔️ Эффективность', description: 'Закончи с KD 1.5+', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'kd', value: 1.5 }, reward: { xp: 100, coins: 20 }, icon: '⚔️' },
  { key: 'daily_kills_20', title: '💀 Убийца', description: 'Получи 20+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'kills_per_match', value: 20 }, reward: { xp: 110, coins: 22 }, icon: '💀' },
  { key: 'daily_clutch', title: '🎭 Клатчер', description: 'Выиграй раунд 1v2 или сложнее', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'clutch', value: 1 }, reward: { xp: 120, coins: 24 }, icon: '🎭' },
  { key: 'daily_defuse', title: '🛡️ Сапёр', description: 'Разминируй 3+ бомбы за матч', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'defuse', value: 3 }, reward: { xp: 90, coins: 18 }, icon: '🛡️' },
  { key: 'daily_headshots_10', title: '🎯 Снайперская точность', description: 'Получи 10+ хедшотов в матче', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'headshots', value: 10 }, reward: { xp: 105, coins: 21 }, icon: '🎯' },
  { key: 'daily_multi_kills', title: '💥 Мультикилл', description: 'Получи 2+ убийства за 3 секунды', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'multi_kill', value: 1 }, reward: { xp: 95, coins: 19 }, icon: '💥' },
  { key: 'daily_utility_damage', title: '🎆 Мастер гранат', description: 'Нанеси 300+ урона гранатами', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'utility_damage', value: 300 }, reward: { xp: 85, coins: 17 }, icon: '🎆' },
  { key: 'daily_no_deaths_rounds', title: '👻 Выживший', description: 'Выиграй 5 раундов без смертей', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'no_death_rounds', value: 5 }, reward: { xp: 100, coins: 20 }, icon: '👻' },
  { key: 'daily_adr', title: '📊 Постоянный урон', description: 'Набери 80+ ADR за матч', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'adr', value: 80 }, reward: { xp: 95, coins: 19 }, icon: '📊' },
  { key: 'daily_awp_kills', title: '🎯 AWP мастер', description: 'Получи 10+ киллов с AWP', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'awp_kills', value: 10 }, reward: { xp: 105, coins: 21 }, icon: '🎯' },
  { key: 'daily_pistol_round_win', title: '🔫 Пистолетный раунд', description: 'Выиграй оба пистолетных раунда', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'pistol_rounds_won', value: 2 }, reward: { xp: 100, coins: 20 }, icon: '🔫' },
  { key: 'daily_entry_frags', title: '⚡ Опенер', description: 'Получи 5+ entry fragg-ов', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'entry_kills', value: 5 }, reward: { xp: 110, coins: 22 }, icon: '⚡' },
  { key: 'daily_trade_kills', title: '⚖️ Обмен', description: 'Получи 3+ trade kill-ов', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'trade_kills', value: 3 }, reward: { xp: 90, coins: 18 }, icon: '⚖️' },
  { key: 'daily_4k_round', title: '🔥 Четверка', description: 'Получи 4 килла в одном раунде', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: '4k_round', value: 1 }, reward: { xp: 115, coins: 23 }, icon: '🔥' },
  { key: 'daily_no_scope', title: '🎪 No scope', description: 'Получи 1 килл без прицела', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'no_scope', value: 1 }, reward: { xp: 100, coins: 20 }, icon: '🎪' },
  { key: 'daily_flash_assists', title: '💡 Ослепитель', description: 'Получи 10+ flash assist-ов', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'flash_assists', value: 10 }, reward: { xp: 95, coins: 19 }, icon: '💡' },
  { key: 'daily_save_teammate', title: '🛡️ Защитник', description: 'Спаси союзника 3+ раза', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'saves', value: 3 }, reward: { xp: 100, coins: 20 }, icon: '🛡️' },
  
  // Daily - Hard
  { key: 'daily_kd_2_5', title: '🔥 Доминация', description: 'Закончи с KD 2.5+', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'kd', value: 2.5 }, reward: { xp: 150, coins: 30 }, icon: '🔥' },
  { key: 'daily_triple_kill', title: '💥 Тройное убийство', description: 'Получи 3+ килла в одном раунде', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'triple_kill', value: 1 }, reward: { xp: 140, coins: 28 }, icon: '💥' },
  { key: 'daily_kills_30', title: '🔪 Резня', description: 'Получи 30+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'kills_per_match', value: 30 }, reward: { xp: 180, coins: 36 }, icon: '🔪' },
  { key: 'daily_headshot_rate', title: '🎯 Мастер хедшотов', description: 'Достигни 70%+ хедшотов (мин. 15 киллов)', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'headshot_rate', value: 70, min_kills: 15 }, reward: { xp: 160, coins: 32 }, icon: '🎯' },
  { key: 'daily_clutch_1v3', title: '👑 Герой', description: 'Выиграй клатч 1v3 или сложнее', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'clutch_1v3', value: 1 }, reward: { xp: 170, coins: 34 }, icon: '👑' },
  { key: 'daily_flawless_round', title: '💎 Безупречный', description: 'Выиграй раунд без получения урона', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'flawless_round', value: 1 }, reward: { xp: 140, coins: 28 }, icon: '💎' },
  { key: 'daily_5k_damage', title: '💥 Разрушитель', description: 'Нанеси 5000+ урона за матч', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'damage', value: 5000 }, reward: { xp: 155, coins: 31 }, icon: '💥' },
  { key: 'daily_perfect_defuse', title: '🕐 В последний момент', description: 'Разминируй бомбу за 0.5 сек до взрыва', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'clutch_defuse', value: 1 }, reward: { xp: 165, coins: 33 }, icon: '🕐' },
  { key: 'daily_ace_attempt', title: '⭐ Почти ACE', description: 'Получи 4 килла в раунде', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: '4k_round', value: 1 }, reward: { xp: 145, coins: 29 }, icon: '⭐' },
  { key: 'daily_deagle_expert', title: '🔫 Дигл мастер', description: 'Получи 5+ киллов с Desert Eagle', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'deagle_kills', value: 5 }, reward: { xp: 150, coins: 30 }, icon: '🔫' },
  { key: 'daily_ninja_defuse', title: '🥷 Ниндзя', description: 'Разминируй бомбу под носом у врагов', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'ninja_defuse', value: 1 }, reward: { xp: 200, coins: 40 }, icon: '🥷' },
  { key: 'daily_collateral', title: '💀 Коллатерал', description: 'Убей 2+ врагов одной пулей', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'collateral', value: 1 }, reward: { xp: 175, coins: 35 }, icon: '💀' },
  
  // Weekly - Medium
  { key: 'weekly_wins_5_cs2', title: '🏅 Профи', description: 'Выиграй 5 матчей за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'win', value: 5 }, reward: { xp: 300, coins: 60, tsRole: 'CS2 Player' }, icon: '🏅' },
  { key: 'weekly_games_10_cs2', title: '🎮 Регуляр', description: 'Сыграй 10 матчей за неделю', game: 'cs2', type: 'weekly', difficulty: 'easy', requirement: { type: 'games_played', value: 10 }, reward: { xp: 250, coins: 50 }, icon: '🎮' },
  { key: 'weekly_avg_kd', title: '📊 Стабильность', description: 'Набери средний KD 1.8+ за 5 матчей', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'avg_kd', value: 1.8, games: 5 }, reward: { xp: 350, coins: 70 }, icon: '📊' },
  { key: 'weekly_headshot_master', title: '🎯 Мастер хедшотов', description: 'Получи 50+ хедшотов за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'headshots', value: 50 }, reward: { xp: 350, coins: 70 }, icon: '🎯' },
  { key: 'weekly_utility_king', title: '🎆 Король гранат', description: 'Нанеси 1500+ урона утилитой за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'utility_damage', value: 1500 }, reward: { xp: 300, coins: 60 }, icon: '🎆' },
  { key: 'weekly_plants_10', title: '💣 Террорист', description: 'Установи бомбу 10+ раз за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'plants', value: 10 }, reward: { xp: 280, coins: 56 }, icon: '💣' },
  { key: 'weekly_defuses_5', title: '🛡️ Контр-террорист', description: 'Разминируй 5+ бомб за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'defuse', value: 5 }, reward: { xp: 320, coins: 64 }, icon: '🛡️' },
  { key: 'weekly_entry_master', title: '⚡ Опенщик недели', description: 'Получи 20+ entry kills за неделю', game: 'cs2', type: 'weekly', difficulty: 'medium', requirement: { type: 'entry_kills', value: 20 }, reward: { xp: 340, coins: 68 }, icon: '⚡' },
  
  // Weekly - Hard
  { key: 'weekly_kills_100', title: '💀 Убийца недели', description: 'Получи 100+ киллов за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'total_kills', value: 100 }, reward: { xp: 400, coins: 80, tsRole: 'Quest Master' }, icon: '💀' },
  { key: 'weekly_mvp_3', title: '👑 MVP серия', description: 'Стань MVP в 3 матчах', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'mvp', value: 3 }, reward: { xp: 450, coins: 90 }, icon: '👑' },
  { key: 'weekly_win_streak_cs2', title: '🌟 Победная серия', description: 'Выиграй 3 матча подряд', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'win_streak', value: 3 }, reward: { xp: 450, coins: 90 }, icon: '🌟' },
  { key: 'weekly_perfect_match', title: '👿 Идеальный матч', description: 'Закончи матч с 25+ киллами и KD 3.0+', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'perfect_game_cs2', kills: 25, kd: 3.0 }, reward: { xp: 500, coins: 100, tsRole: 'Quest Master' }, icon: '👿' },
  { key: 'weekly_clutch_master', title: '🎭 Мастер клатчей', description: 'Выиграй 5 клатчей за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'clutch', value: 5 }, reward: { xp: 450, coins: 90 }, icon: '🎭' },
  { key: 'weekly_awp_god', title: '🎯 AWP Бог', description: 'Получи 50+ киллов с AWP за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'awp_kills', value: 50 }, reward: { xp: 480, coins: 96 }, icon: '🎯' },
  { key: 'weekly_triple_kills_3', title: '💥 Тройная угроза', description: 'Получи 3 triple kill за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'triple_kill', value: 3 }, reward: { xp: 470, coins: 94 }, icon: '💥' },
  { key: 'weekly_no_death_wins', title: '👻 Призрак', description: 'Выиграй 3 матча без смертей', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'no_death_wins', value: 3 }, reward: { xp: 500, coins: 100, tsRole: 'Quest Master' }, icon: '👻' },
  { key: 'weekly_knife_master', title: '🔪 Мастер ножа', description: 'Получи 5+ киллов ножом за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'knife_kill', value: 5 }, reward: { xp: 420, coins: 84 }, icon: '🔪' },
  { key: 'weekly_eco_warrior', title: '💸 Эко-воин', description: 'Выиграй 5+ эко-раундов за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'eco_rounds_won', value: 5 }, reward: { xp: 440, coins: 88 }, icon: '💸' },
  { key: 'weekly_flashbang_god', title: '💡 Мастер флешек', description: 'Ослепи врагов 100+ раз за неделю', game: 'cs2', type: 'weekly', difficulty: 'hard', requirement: { type: 'enemy_flashed', value: 100 }, reward: { xp: 400, coins: 80 }, icon: '💡' },
  
  // Weekly - Epic
  { key: 'weekly_ace', title: '🔱 ACE Master', description: 'Получи ACE', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'ace', value: 1 }, reward: { xp: 500, coins: 100, tsRole: 'Legend' }, icon: '🔱' },
  { key: 'weekly_double_ace', title: '🌌 Бог CS2', description: 'Получи 2 ACE за неделю', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'ace', value: 2 }, reward: { xp: 800, coins: 160, tsRole: 'Legend' }, icon: '🌌' },
  { key: 'weekly_unstoppable', title: '⚡ Неудержимый', description: 'Выиграй 8 матчей подряд', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'win_streak', value: 8 }, reward: { xp: 1000, coins: 200, tsRole: 'Legend' }, icon: '⚡' },
  { key: 'weekly_40_bomb', title: '💣 40 киллов', description: 'Получи 40+ киллов в одном матче', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'kills_per_match', value: 40 }, reward: { xp: 700, coins: 140, tsRole: 'Legend' }, icon: '💣' },
  { key: 'weekly_perfect_week', title: '👑 Идеальная неделя', description: 'Выиграй все 10 матчей за неделю', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'perfect_week', wins: 10, losses: 0 }, reward: { xp: 1200, coins: 240, tsRole: 'Legend' }, icon: '👑' },
  { key: 'weekly_clutch_king', title: '🎭 Король клатчей', description: 'Выиграй 10 клатчей за неделю', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'clutch', value: 10 }, reward: { xp: 900, coins: 180, tsRole: 'Legend' }, icon: '🎭' },
  { key: 'weekly_headshot_machine', title: '🎯 Машина хедшотов', description: 'Получи 100+ хедшотов за неделю', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'headshots', value: 100 }, reward: { xp: 750, coins: 150, tsRole: 'Legend' }, icon: '🎯' },
  { key: 'weekly_damage_master', title: '💥 Мастер урона', description: 'Нанеси 8000+ урона в матче', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'damage', value: 8000 }, reward: { xp: 850, coins: 170, tsRole: 'Legend' }, icon: '💥' },
  { key: 'weekly_kd_god', title: '🌟 Бог KD', description: 'Закончи с KD 5.0+', game: 'cs2', type: 'weekly', difficulty: 'epic', requirement: { type: 'kd', value: 5.0 }, reward: { xp: 950, coins: 190, tsRole: 'Legend' }, icon: '🌟' },
  
  // Daily - Medium (дополнительные)
  { key: 'daily_kills_18', title: '🎖️ Стрелок', description: 'Получи 18+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'kills_per_match', value: 18 }, reward: { xp: 100, coins: 20 }, icon: '🎖️' },
  { key: 'daily_damage_3000', title: '💣 Много урона', description: 'Нанеси 3000+ урона за матч', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'damage', value: 3000 }, reward: { xp: 95, coins: 19 }, icon: '💣' },
  { key: 'daily_headshots_8', title: '🔫 Меткий стрелок', description: 'Получи 8+ хедшотов в матче', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'headshots', value: 8 }, reward: { xp: 95, coins: 19 }, icon: '🔫' },
  { key: 'daily_rounds_12', title: '🏆 Доминация раундов', description: 'Выиграй 12+ раундов за матч', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'rounds_won', value: 12 }, reward: { xp: 100, coins: 20 }, icon: '🏆' },
  { key: 'daily_mvp_2', title: '⭐ Двойной MVP', description: 'Стань MVP 2+ раз в матче', game: 'cs2', type: 'daily', difficulty: 'medium', requirement: { type: 'mvp', value: 2 }, reward: { xp: 110, coins: 22 }, icon: '⭐' },
  
  // Daily - Hard (дополнительные)
  { key: 'daily_kills_35', title: '💀 Истребитель', description: 'Получи 35+ киллов в матче', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'kills_per_match', value: 35 }, reward: { xp: 190, coins: 38 }, icon: '💀' },
  { key: 'daily_headshots_15', title: '🎯 Снайпер-элита', description: 'Получи 15+ хедшотов в матче', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'headshots', value: 15 }, reward: { xp: 170, coins: 34 }, icon: '🎯' },
  { key: 'daily_kd_3', title: '🔥 Тройной KD', description: 'Закончи с KD 3.0+', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'kd', value: 3.0 }, reward: { xp: 165, coins: 33 }, icon: '🔥' },
  { key: 'daily_damage_6000', title: '💥 Уничтожитель', description: 'Нанеси 6000+ урона за матч', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'damage', value: 6000 }, reward: { xp: 180, coins: 36 }, icon: '💥' },
  { key: 'daily_mvp_5', title: '👑 Король MVP', description: 'Стань MVP 5+ раз в матче', game: 'cs2', type: 'daily', difficulty: 'hard', requirement: { type: 'mvp', value: 5 }, reward: { xp: 175, coins: 35 }, icon: '👑' },
];

// Функция инициализации квестов в БД
const initializeQuests = async () => {
  try {
    const allQuests = [...DOTA2_QUESTS, ...CS2_QUESTS];
    
    for (const questData of allQuests) {
      await Quest.findOrCreate({
        where: { key: questData.key },
        defaults: questData
      });
    }
    
    console.log('✅ Quests initialized');
  } catch (error) {
    console.error('❌ Error initializing quests:', error);
  }
};

// Получить активные задания для пользователя
const getUserQuests = async (userId, game = null) => {
  try {
    const now = new Date();
    
    // Сначала штрафуем за просроченные квесты
    await penalizeExpiredQuests(userId);
    
    // Показываем только активные (active) и завершенные (completed) квесты
    // Квесты со статусом 'claimed' скрываем, чтобы пользователь мог выбрать новые
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const where = {
      userId,
      expiresAt: { [Op.gte]: todayStart },
      status: { [Op.in]: ['active', 'completed'] } // Не показываем claimed квесты
    };
    
    const userQuests = await UserQuest.findAll({
      where,
      include: [{
        model: Quest,
        as: 'quest',
        where: game ? { game, isActive: true } : { isActive: true }
      }],
      order: [['status', 'ASC'], ['created_at', 'DESC']]
    });
    
    return userQuests;
  } catch (error) {
    console.error('Error fetching user quests:', error);
    return [];
  }
};

// Назначить задания пользователю
const assignQuests = async (userId, game, type = 'daily') => {
  try {
    const now = new Date();
    const expiresAt = new Date();
    
    if (type === 'daily') {
      expiresAt.setHours(23, 59, 59, 999);
    } else if (type === 'weekly') {
      expiresAt.setDate(expiresAt.getDate() + (7 - expiresAt.getDay())); // До конца недели
      expiresAt.setHours(23, 59, 59, 999);
    }
    
    // Получаем статистику пользователя для определения уровня
    let userStats = await UserStats.findOne({ where: { userId } });
    if (!userStats) {
      userStats = await UserStats.create({
        userId,
        level: 1,
        experience: 0
      });
    }
    
    const userLevel = userStats.level;
    
    // Определяем доступные сложности на основе уровня
    const availableDifficulties = ['easy'];
    if (userLevel >= 5) availableDifficulties.push('medium');
    if (userLevel >= 10) availableDifficulties.push('hard');
    if (userLevel >= 15) availableDifficulties.push('epic');
    
    console.log(`📊 Пользователь ${userId} (уровень ${userLevel}): доступные сложности квестов: ${availableDifficulties.join(', ')}`);
    
    // Получаем задания нужного типа и доступной сложности
    const quests = await Quest.findAll({
      where: { 
        game, 
        type, 
        isActive: true,
        difficulty: { [Op.in]: availableDifficulties }
      }
    });
    
    // Выбираем случайные квесты (3 для daily, 2 для weekly)
    const questsToAssign = type === 'daily' ? 3 : 2;
    const shuffled = quests.sort(() => 0.5 - Math.random());
    const selectedQuests = shuffled.slice(0, questsToAssign);
    
    const assigned = [];
    
    for (const quest of selectedQuests) {
      // Проверяем, не назначено ли уже это задание
      const existing = await UserQuest.findOne({
        where: {
          userId,
          questId: quest.id,
          expiresAt: { [Op.gt]: now }
        }
      });
      
      if (!existing) {
        // Определяем targetValue на основе типа квеста
        // Некоторые квесты требуют выполнения N раз, другие - достижения значения в одном матче
        const perMatchQuestTypes = [
          'kills_per_match', 'assists_per_match', 'assists', 'kda', 'kd', 
          'gpm', 'xpm', 'last_hits', 'denies', 'hero_damage', 'tower_damage', 
          'healing', 'no_death_win', 'rampage', 'godlike', 'triple_kill', 
          'net_worth', 'wards', 'stun_duration', 'runes', 'roshan_kills', 
          'perfect_game', 'ace', 'headshots', 'damage', 'rounds_won', 'mvp', 
          'headshot_rate', 'clutch', 'clutch_1v3', 'defuse', 'knife_kill',
          'multi_kill', 'first_kills', 'plants', 'smokes_used', 'enemy_flashed',
          'money_earned', 'eco_kills', 'wallbang', 'utility_damage', 
          'no_death_rounds', 'adr', 'awp_kills', 'pistol_rounds_won',
          'entry_kills', 'trade_kills', '4k_round', 'no_scope', 'flash_assists',
          'saves', 'flawless_round', 'clutch_defuse', 'deagle_kills',
          'ninja_defuse', 'collateral'
        ];
        
        const isPerMatchQuest = perMatchQuestTypes.includes(quest.requirement.type);
        const targetValue = isPerMatchQuest ? 1 : quest.requirement.value;
        
        const userQuest = await UserQuest.create({
          userId,
          questId: quest.id,
          progress: 0,
          targetValue: targetValue,
          status: 'active',
          expiresAt
        });
        
        assigned.push(userQuest);
        console.log(`✅ Назначен квест "${quest.title}" (${quest.difficulty}) пользователю ${userId}, цель: ${targetValue}`);
      }
    }
    
    return assigned;
  } catch (error) {
    console.error('Error assigning quests:', error);
    return [];
  }
};

// Обновить прогресс задания после анализа матча
const updateQuestProgress = async (userId, matchData, game) => {
  try {
    const activeQuests = await getUserQuests(userId, game);
    const completedQuests = [];
    
    console.log(`📊 Анализ матча для пользователя ${userId}, игра: ${game}`);
    console.log(`📊 Данные матча:`, matchData);
    
    for (const userQuest of activeQuests) {
      if (userQuest.status !== 'active') continue;
      
      // ПРОВЕРКА: матч должен быть ПОСЛЕ взятия квеста
      if (matchData.matchDate) {
        const questStartedAt = new Date(userQuest.startedAt);
        const matchDate = new Date(matchData.matchDate);
        
        if (matchDate < questStartedAt) {
          console.log(`   ⏭️ Пропускаем квест "${userQuest.quest.title}" - матч старше времени взятия квеста`);
          console.log(`   📅 Матч: ${matchDate.toLocaleString()}, Квест взят: ${questStartedAt.toLocaleString()}`);
          continue;
        }
      }
      
      const quest = userQuest.quest;
      const req = quest.requirement;
      let progressToAdd = 0;
      
      console.log(`📋 Проверка квеста "${quest.title}" (${req.type}) для игры ${game}`);
      console.log(`   Требование: ${req.type} >= ${req.value}, Текущий прогресс: ${userQuest.progress}/${userQuest.targetValue}`);
      
      // Анализируем соответствие матча требованиям задания
      switch (req.type) {
        // Общие типы (Dota 2 + CS2)
        case 'win':
          if (matchData.isWin) {
            progressToAdd = 1;
            console.log(`   ✅ Победа засчитана`);
          }
          break;
        case 'games_played':
          progressToAdd = 1;
          console.log(`   ✅ Матч сыгран`);
          break;
        case 'kills_per_match':
          if (matchData.kills >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Киллов: ${matchData.kills} >= ${req.value}`);
          } else {
            console.log(`   ❌ Киллов: ${matchData.kills} < ${req.value}`);
          }
          break;
        case 'assists_per_match':
        case 'assists':
          if (matchData.assists >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Ассистов: ${matchData.assists} >= ${req.value}`);
          } else {
            console.log(`   ❌ Ассистов: ${matchData.assists} < ${req.value}`);
          }
          break;
        case 'kda':
          const kda = matchData.deaths > 0 ? 
            (matchData.kills + matchData.assists) / matchData.deaths : 
            matchData.kills + matchData.assists;
          if (kda >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ KDA: ${kda.toFixed(2)} >= ${req.value}`);
          } else {
            console.log(`   ❌ KDA: ${kda.toFixed(2)} < ${req.value}`);
          }
          break;
        case 'kd':
          const kd = matchData.deaths > 0 ? matchData.kills / matchData.deaths : matchData.kills;
          if (kd >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ KD: ${kd.toFixed(2)} >= ${req.value}`);
          } else {
            console.log(`   ❌ KD: ${kd.toFixed(2)} < ${req.value}`);
          }
          break;
          
        // Dota 2 типы
        case 'gpm':
          if (matchData.gold_per_min >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ GPM: ${matchData.gold_per_min} >= ${req.value}`);
          } else {
            console.log(`   ❌ GPM: ${matchData.gold_per_min} < ${req.value}`);
          }
          break;
        case 'xpm':
          if (matchData.xp_per_min >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ XPM: ${matchData.xp_per_min} >= ${req.value}`);
          } else {
            console.log(`   ❌ XPM: ${matchData.xp_per_min} < ${req.value}`);
          }
          break;
        case 'last_hits':
          if (matchData.last_hits >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Last hits: ${matchData.last_hits} >= ${req.value}`);
          } else {
            console.log(`   ❌ Last hits: ${matchData.last_hits} < ${req.value}`);
          }
          break;
        case 'denies':
          if (matchData.denies >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Denies: ${matchData.denies} >= ${req.value}`);
          } else {
            console.log(`   ❌ Denies: ${matchData.denies} < ${req.value}`);
          }
          break;
        case 'hero_damage':
          if (matchData.hero_damage >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Hero damage: ${matchData.hero_damage} >= ${req.value}`);
          } else {
            console.log(`   ❌ Hero damage: ${matchData.hero_damage} < ${req.value}`);
          }
          break;
        case 'tower_damage':
          if (matchData.tower_damage >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Tower damage: ${matchData.tower_damage} >= ${req.value}`);
          } else {
            console.log(`   ❌ Tower damage: ${matchData.tower_damage} < ${req.value}`);
          }
          break;
        case 'healing':
          if (matchData.hero_healing >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Healing: ${matchData.hero_healing} >= ${req.value}`);
          } else {
            console.log(`   ❌ Healing: ${matchData.hero_healing} < ${req.value}`);
          }
          break;
        case 'no_death_win':
          if (matchData.isWin && matchData.deaths === 0) {
            progressToAdd = 1;
            console.log(`   ✅ Победа без смертей`);
          } else {
            console.log(`   ❌ Не победа без смертей (win: ${matchData.isWin}, deaths: ${matchData.deaths})`);
          }
          break;
        case 'rampage':
          if (matchData.rampage) {
            progressToAdd = 1;
            console.log(`   ✅ Rampage!`);
          }
          break;
        case 'godlike':
          // Godlike streak = 9+ киллов без смерти (можно примерно определить по статистике)
          if (matchData.kills >= 9 && matchData.deaths <= 1) {
            progressToAdd = 1;
            console.log(`   ✅ Godlike возможен (${matchData.kills} киллов, ${matchData.deaths} смертей)`);
          }
          break;
        case 'triple_kill':
          // Triple kill обычно отражается в multi_kills OpenDota API
          if (matchData.triple_kill || (matchData.multi_kills && matchData.multi_kills['3'])) {
            progressToAdd = 1;
            console.log(`   ✅ Triple Kill!`);
          }
          break;
        case 'net_worth':
          if (matchData.total_gold >= req.value || matchData.net_worth >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Net worth: ${matchData.total_gold || matchData.net_worth} >= ${req.value}`);
          }
          break;
        case 'wards':
          if (matchData.observer_uses >= req.value || matchData.sentry_uses >= req.value) {
            progressToAdd = 1;
            const totalWards = (matchData.observer_uses || 0) + (matchData.sentry_uses || 0);
            console.log(`   ✅ Wards: ${totalWards} >= ${req.value}`);
          }
          break;
        case 'stun_duration':
          if (matchData.stuns >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Stun duration: ${matchData.stuns} >= ${req.value}`);
          }
          break;
        case 'runes':
          if (matchData.rune_pickups >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Runes: ${matchData.rune_pickups} >= ${req.value}`);
          }
          break;
        case 'roshan_kills':
          if (matchData.roshan_kills >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Roshan kills: ${matchData.roshan_kills} >= ${req.value}`);
          }
          break;
        case 'perfect_game':
          // Идеальная игра: 15+ киллов и 0 смертей
          if (matchData.kills >= req.kills && matchData.deaths === req.deaths) {
            progressToAdd = 1;
            console.log(`   ✅ Perfect game: ${matchData.kills} киллов, ${matchData.deaths} смертей`);
          }
          break;
        case 'win_streak':
          // Win streak требует отслеживания истории - пока пропускаем
          console.log(`   ⚠️ Win streak требует отдельной логики отслеживания`);
          break;
        case 'avg_kda':
          // Средний KDA за несколько игр - требует отдельной логики
          console.log(`   ⚠️ Average KDA требует отдельной логики отслеживания`);
          break;
        case 'gpm_count':
          // Количество игр с определенным GPM - требует отдельной логики
          console.log(`   ⚠️ GPM count требует отдельной логики отслеживания`);
          break;
        case 'ace':
          if (matchData.ace) {
            progressToAdd = 1;
            console.log(`   ✅ ACE!`);
          }
          break;
          
        // CS2 специфичные типы
        case 'headshots':
          if (matchData.headshots >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Headshots: ${matchData.headshots} >= ${req.value}`);
          } else {
            console.log(`   ❌ Headshots: ${matchData.headshots} < ${req.value}`);
          }
          break;
        case 'damage':
          if (matchData.damage >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Damage: ${matchData.damage} >= ${req.value}`);
          } else {
            console.log(`   ❌ Damage: ${matchData.damage} < ${req.value}`);
          }
          break;
        case 'rounds_won':
          if (matchData.rounds_won >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ Rounds won: ${matchData.rounds_won} >= ${req.value}`);
          } else {
            console.log(`   ❌ Rounds won: ${matchData.rounds_won} < ${req.value}`);
          }
          break;
        case 'mvp':
          if (matchData.mvps >= req.value) {
            progressToAdd = 1;
            console.log(`   ✅ MVPs: ${matchData.mvps} >= ${req.value}`);
          } else {
            console.log(`   ❌ MVPs: ${matchData.mvps} < ${req.value}`);
          }
          break;
        case 'headshot_rate':
          if (matchData.kills >= req.min_kills) {
            const hsRate = (matchData.headshots / matchData.kills) * 100;
            if (hsRate >= req.value) {
              progressToAdd = 1;
              console.log(`   ✅ Headshot rate: ${hsRate.toFixed(1)}% >= ${req.value}%`);
            } else {
              console.log(`   ❌ Headshot rate: ${hsRate.toFixed(1)}% < ${req.value}%`);
            }
          } else {
            console.log(`   ❌ Недостаточно киллов: ${matchData.kills} < ${req.min_kills}`);
          }
          break;
          
        // Типы которые не отслеживаются Steam API (будем добавлять позже)
        case 'clutch':
        case 'clutch_1v3':
        case 'triple_kill':
        case '4k_round':
        case 'multi_kill':
        case 'first_kills':
        case 'plants':
        case 'defuse':
        case 'knife_kill':
        case 'smokes_used':
        case 'enemy_flashed':
        case 'money_earned':
        case 'eco_kills':
        case 'wallbang':
        case 'utility_damage':
        case 'no_death_rounds':
        case 'adr':
        case 'awp_kills':
        case 'pistol_rounds_won':
        case 'entry_kills':
        case 'trade_kills':
        case 'no_scope':
        case 'flash_assists':
        case 'saves':
        case 'flawless_round':
        case 'clutch_defuse':
        case 'deagle_kills':
        case 'ninja_defuse':
        case 'collateral':
          // Пока пропускаем - нужен детальный API или парсинг демок
          console.log(`⚠️ Тип квеста "${req.type}" пока не поддерживается для автоматического трекинга`);
          break;
      }
      
      if (progressToAdd > 0) {
        userQuest.progress += progressToAdd;
        console.log(`✅ Квест "${quest.title}" обновлен: ${userQuest.progress}/${userQuest.targetValue}`);
        
        // Проверяем завершение
        if (userQuest.progress >= userQuest.targetValue) {
          userQuest.status = 'completed';
          userQuest.completedAt = new Date();
          completedQuests.push({
            quest: quest,
            reward: quest.reward
          });
          console.log(`🎉 Квест "${quest.title}" завершен!`);
        }
        
        await userQuest.save();
      }
    }
    
    // Начисляем награды
    if (completedQuests.length > 0) {
      const stats = await UserStats.findOne({ where: { userId } });
      if (stats) {
        let totalXp = 0;
        const questResults = [];
        
        for (const { quest, reward } of completedQuests) {
          totalXp += reward.xp || 0;
          questResults.push({
            quest,
            oldProgress: quest.target_value,
            newProgress: quest.target_value,
            completed: true,
            xpEarned: reward.xp || 0
          });
        }
        
        const oldXP = stats.experience;
        stats.experience += totalXp;
        
        // Рассчитываем уровень
        const oldLevel = stats.level;
        const newLevel = calculateLevel(stats.experience);
        const leveledUp = newLevel > oldLevel;
        const levelProgress = getLevelProgress(stats.experience, newLevel);
        
        if (leveledUp) {
          stats.level = newLevel;
          
          // Выдаём награды за достижение уровня
          const levelRewards = [];
          for (let level = oldLevel + 1; level <= newLevel; level++) {
            if (LEVEL_REWARDS[level]) {
              levelRewards.push({ level, ...LEVEL_REWARDS[level] });
              
              // Пытаемся выдать роль TeamSpeak
              try {
                const { User } = require('../models');
                const teamspeakService = require('./teamspeakService');
                
                const user = await User.findByPk(userId);
                if (user && user.teamspeakUid) {
                  await teamspeakService.addServerGroupToClient(user.teamspeakUid, LEVEL_REWARDS[level].tsGroupId);
                  console.log(`🎖️ Assigned TeamSpeak role "${LEVEL_REWARDS[level].tsRole}" to user ${userId} for reaching level ${level}`);
                }
              } catch (tsError) {
                console.error(`Error assigning level ${level} TeamSpeak role:`, tsError);
              }
            }
          }
        }
        
        await stats.save();
        
        return { 
          completedQuests, 
          questResults,
          totalXp, 
          leveledUp, 
          newLevel: stats.level, 
          oldLevel,
          levelInfo: {
            oldLevel,
            newLevel: stats.level,
            oldXP,
            newXP: stats.experience,
            xpNeeded: levelProgress.needed
          }
        };
      }
    }
    
    return { completedQuests: [], questResults: [], totalXp: 0, leveledUp: false };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return { completedQuests: [], questResults: [], totalXp: 0, leveledUp: false };
  }
};

// Рассчитать уровень по опыту
// Максимальное количество квестов - БЕЗ ОГРАНИЧЕНИЙ
// Пользователь может взять сколько угодно квестов
// НО за каждый невыполненный квест будет штраф
const getMaxQuestsForLevel = (level, type = 'daily') => {
  return 999; // Фактически без ограничений
};

// Награды за достижение уровней (роли TeamSpeak)
// Награды за уровни: TeamSpeak роли
// Группы созданы 23.11.2025
const LEVEL_REWARDS = {
  5: { tsRole: 'Новичок', tsGroupId: 39, color: 'green' },
  10: { tsRole: 'Игрок', tsGroupId: 40, color: 'blue' },
  15: { tsRole: 'Ветеран', tsGroupId: 41, color: 'purple' },
  20: { tsRole: 'Эксперт', tsGroupId: 42, color: 'orange' },
  25: { tsRole: 'Мастер', tsGroupId: 43, color: 'red' },
  30: { tsRole: 'Грандмастер', tsGroupId: 44, color: 'gold' },
  40: { tsRole: 'Чемпион', tsGroupId: 45, color: 'cyan' },
  50: { tsRole: 'Легенда', tsGroupId: 46, color: 'pink' }
};

const calculateLevel = (experience) => {
  // ЗНАЧИТЕЛЬНО УВЕЛИЧЕННАЯ формула прогрессии
  // Level 1: 0 XP
  // Level 2: 500 XP
  // Level 3: 2000 XP
  // Level 4: 4500 XP
  // Level 5: 8000 XP
  // Level 10: 40000 XP
  // Level 20: 160000 XP
  // Level 50: 1000000 XP
  return Math.floor(Math.sqrt(experience / 400)) + 1;
};

// Рассчитать необходимый опыт для следующего уровня
const getXpForNextLevel = (currentLevel) => {
  // Увеличенная в 8 раз формула прогрессии
  return (currentLevel * currentLevel) * 400;
};

// Получить прогресс уровня
const getLevelProgress = (experience, level) => {
  // Увеличенная в 8 раз формула прогрессии (как и в calculateLevel)
  const currentLevelXp = ((level - 1) * (level - 1)) * 400;
  const nextLevelXp = (level * level) * 400;
  const xpInLevel = Math.max(0, experience - currentLevelXp);
  const xpNeeded = nextLevelXp - currentLevelXp;
  
  return {
    current: xpInLevel,
    needed: xpNeeded,
    percentage: xpNeeded > 0 ? Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100))) : 0
  };
};

// Забрать награду за выполненное задание
const claimQuestReward = async (userId, userQuestId) => {
  try {
    const userQuest = await UserQuest.findOne({
      where: { id: userQuestId, userId, status: 'completed' },
      include: [{ model: Quest, as: 'quest' }]
    });
    
    if (!userQuest) {
      return { success: false, error: 'Quest not found or not completed' };
    }
    
    const reward = userQuest.quest.reward;
    
    // Выдаём роль TeamSpeak если есть
    if (reward.tsRole) {
      try {
        const { User } = require('../models');
        const teamspeakService = require('./teamspeakService');
        
        const user = await User.findByPk(userId);
        if (user && user.teamspeakUid) {
          // Получаем ID группы по названию роли
          // Группы созданы 23.11.2025
          const roleMapping = {
            'Dota 2 Player': 47,
            'CS2 Player': 48,
            'Quest Master': 49,
            'Legend': 50
          };
          
          const serverGroupId = roleMapping[reward.tsRole];
          
          if (serverGroupId) {
            await teamspeakService.addServerGroupToClient(user.teamspeakUid, serverGroupId);
            console.log(`✅ Assigned TeamSpeak role "${reward.tsRole}" to user ${userId}`);
          }
        }
      } catch (tsError) {
        console.error('Error assigning TeamSpeak role:', tsError);
        // Не прерываем выдачу награды, даже если роль не выдана
      }
    }
    
    // Удаляем квест вместо изменения статуса на 'claimed'
    // Это позволит пользователю взять этот квест снова в будущем
    await userQuest.destroy();
    console.log(`🗑️ Удален квест "${userQuest.quest.title}" после получения награды пользователем ${userId}`);
    
    return { success: true, reward };
  } catch (error) {
    console.error('Error claiming quest reward:', error);
    return { success: false, error: 'Failed to claim reward' };
  }
};

// Автоматический анализ последних матчей из API
const analyzeRecentMatches = async (userId, steamId, game) => {
  try {
    console.log(`🔍 Автоанализ матчей для ${steamId} (${game})`);
    
    const axios = require('axios');
    
    let recentMatches = [];
    let newMatchesAnalyzed = 0;
    let totalQuestsCompleted = 0;
    let totalXpGained = 0;
    
    if (game === 'dota2') {
      // Конвертируем Steam ID64 в Steam ID32
      const steamID64ToSteamID32 = (steamID64) => {
        const steamID64Base = '76561197960265728';
        const accountID = BigInt(steamID64) - BigInt(steamID64Base);
        return accountID.toString();
      };
      
      const steamId32 = steamId.length === 17 ? steamID64ToSteamID32(steamId) : steamId;
      
      // Получаем последние матчи из OpenDota
      const url = `https://api.opendota.com/api/players/${steamId32}/recentMatches`;
      const response = await axios.get(url);
      recentMatches = response.data || [];
      
      console.log(`📊 Получено ${recentMatches.length} матчей Dota 2`);
      
      // Находим самый новый активный квест пользователя
      const newestQuest = await UserQuest.findOne({
        where: {
          userId,
          status: 'active'
        },
        include: [{
          model: Quest,
          as: 'quest',
          where: { game: 'dota2' }
        }],
        order: [['started_at', 'DESC']]
      });
      
      const questStartDate = newestQuest ? new Date(newestQuest.startedAt) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      console.log(`📌 Анализируем матчи после ${questStartDate.toLocaleString()}`);
      
      // Получаем последний обработанный матч из Redis
      const redisService = require('./redisService');
      const lastProcessedKey = `last_match:dota2:${userId}`;
      const lastProcessedMatchId = await redisService.get(lastProcessedKey);
      
      console.log(`📝 Последний обработанный матч: ${lastProcessedMatchId || 'нет'}`);
      
      // Проверяем каждый матч
      let latestValidMatch = null;
      let latestMatchResult = null;
      let foundNewMatch = false;
      
      for (const match of recentMatches.slice(0, 10)) { // Анализируем последние 10
        const matchKey = `dota2_${userId}_${match.match_id}`;
        const matchDate = new Date(match.start_time * 1000);
        
        console.log(`\n📅 Матч ${match.match_id} от ${matchDate.toLocaleString()}`);
        
        // Пропускаем уже обработанный матч
        if (lastProcessedMatchId && match.match_id.toString() === lastProcessedMatchId) {
          console.log(`   ✅ Матч уже был обработан, пропускаем`);
          break; // Все следующие матчи старее, можно остановиться
        }
        
        // Анализируем только матчи ПОСЛЕ взятия квестов
        if (matchDate < questStartDate) {
          console.log(`   ⏭️ Пропускаем (матч старше времени взятия квеста)`);
          continue;
        }
        
        foundNewMatch = true;
        
        // Анализируем матч
        const matchData = {
          matchId: match.match_id,
          matchDate: matchDate, // ВАЖНО: время матча для проверки
          isWin: (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win),
          kills: match.kills || 0,
          deaths: match.deaths || 0,
          assists: match.assists || 0,
          gold_per_min: match.gold_per_min || 0,
          xp_per_min: match.xp_per_min || 0,
          hero_damage: match.hero_damage || 0,
          tower_damage: match.tower_damage || 0,
          hero_healing: match.hero_healing || 0,
          last_hits: match.last_hits || 0,
          denies: typeof match.denies === 'number' ? match.denies : 0,
          rampage: (match.multi_kills && match.multi_kills['5']) ? true : false,
          triple_kill: (match.multi_kills && match.multi_kills['3']) ? true : false,
          multi_kills: match.multi_kills || {},
          duration: match.duration || 0,
          // Дополнительные поля из OpenDota
          total_gold: match.total_gold || 0,
          net_worth: match.net_worth || 0,
          observer_uses: match.observer_uses || 0,
          sentry_uses: match.sentry_uses || 0,
          stuns: match.stuns || 0,
          rune_pickups: match.rune_pickups || 0,
          roshan_kills: match.roshan_kills || 0
        };
        
        console.log(`   📊 K/D/A: ${matchData.kills}/${matchData.deaths}/${matchData.assists}`);
        console.log(`   📊 Last hits: ${matchData.last_hits}, Denies: ${matchData.denies}`);
        
        // Обновляем прогресс квестов
        const result = await updateQuestProgress(userId, matchData, 'dota2');
        
        newMatchesAnalyzed++;
        totalQuestsCompleted += result.completedQuests.length;
        totalXpGained += result.totalXp;
        
        console.log(`✅ Матч ${match.match_id} проанализирован: ${result.completedQuests.length} квестов завершено, XP: ${result.totalXp}`);
        
        // Сохраняем информацию о последнем валидном матче для отправки уведомления
        if (!latestValidMatch || matchDate > new Date(latestValidMatch.start_time * 1000)) {
          latestValidMatch = match;
          latestMatchResult = { matchData, result };
        }
      }
      
      // Отправляем отчёт в Steam ТОЛЬКО для ПОСЛЕДНЕГО НОВОГО матча
      if (steamNotificationService && latestValidMatch && latestMatchResult && foundNewMatch) {
        try {
          const { matchData, result } = latestMatchResult;
          matchData.hero_name = latestValidMatch.hero_id ? `Hero ${latestValidMatch.hero_id}` : 'Unknown';
          matchData.win = matchData.isWin;
          console.log(`📤 Отправляем отчёт в Steam о последнем матче ${latestValidMatch.match_id}`);
          await steamNotificationService.sendDota2MatchReport(userId, steamId, matchData, result);
          
          // Сохраняем ID последнего обработанного матча в Redis (TTL 7 дней)
          await redisService.set(lastProcessedKey, latestValidMatch.match_id.toString(), 7 * 24 * 60 * 60);
          console.log(`✅ Сохранён последний обработанный матч: ${latestValidMatch.match_id}`);
        } catch (notifError) {
          console.error('❌ Ошибка отправки уведомления в Steam:', notifError.message);
        }
      } else if (!foundNewMatch) {
        console.log(`ℹ️ Новых матчей не найдено для пользователя ${userId}`);
      }
      
    } else if (game === 'cs2') {
      // Для CS2 используем Steam API с данными последнего матча
      const STEAM_API_KEY = process.env.STEAM_API_KEY;
      const CS2_APP_ID = 730;
      
      const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=${CS2_APP_ID}&key=${STEAM_API_KEY}&steamid=${steamId}`;
      const response = await axios.get(url);
      
      if (response.data.playerstats) {
        const stats = response.data.playerstats.stats;
        
        // Получаем данные ПОСЛЕДНЕГО МАТЧА из Steam API
        const lastMatchKills = stats.find(s => s.name === 'last_match_kills')?.value || 0;
        const lastMatchDeaths = stats.find(s => s.name === 'last_match_deaths')?.value || 0;
        const lastMatchRounds = stats.find(s => s.name === 'last_match_rounds')?.value || 0;
        const lastMatchWins = stats.find(s => s.name === 'last_match_wins')?.value || 0;
        const lastMatchMVPs = stats.find(s => s.name === 'last_match_mvps')?.value || 0;
        const lastMatchDamage = stats.find(s => s.name === 'last_match_damage')?.value || 0;
        const lastMatchFavWeaponKills = stats.find(s => s.name === 'last_match_favweapon_kills')?.value || 0;
        
        // Получаем общую статистику для отслеживания новых матчей
        const totalMatchesPlayed = stats.find(s => s.name === 'total_matches_played')?.value || 0;
        const totalKills = stats.find(s => s.name === 'total_kills')?.value || 0;
        const totalHeadshots = stats.find(s => s.name === 'total_kills_headshot')?.value || 0;
        
        // Проверяем последний проанализированный CS2 матч через завершенные квесты
        const lastCS2Quest = await UserQuest.findOne({
          where: {
            userId,
            status: { [Op.in]: ['completed', 'claimed'] }
          },
          include: [{
            model: Quest,
            as: 'quest',
            where: { game: 'cs2' }
          }],
          order: [['updated_at', 'DESC']],
          limit: 1
        });
        
        // Используем простую эвристику: если квест был обновлен недавно, скорее всего матч уже обработан
        const shouldAnalyze = !lastCS2Quest || 
          (new Date() - new Date(lastCS2Quest.updated_at)) > 60 * 60 * 1000; // Прошло более часа
        
        const lastSnapshot = {};
        
        // Если должны анализировать и есть данные последнего матча
        if (shouldAnalyze && lastMatchKills > 0) {
          // ❌ ОТКЛЮЧЕНО: Больше не создаём искусственные матчи из Steam API
          // Матчи должны загружаться только через Share Code механизм
          // Пользователь должен вручную добавить хотя бы один Share Code,
          // после чего система загрузит остальные через GetNextMatchSharingCode API
          
          console.log(`⚠️ CS2: Обнаружены изменения статистики для пользователя ${userId}, но матчи создаются только через Share Code`);
          
          // TODO: В будущем можно добавить уведомление пользователю
          // что появились новые матчи и нужно загрузить их через механизм Share Code
        }
      }
    }
    
    return { 
      success: true, 
      newMatchesAnalyzed: 0,
      totalQuestsCompleted: 0,
      totalXpGained: 0
    };
  } catch (error) {
    console.error('Error analyzing recent matches:', error);
    return { 
      success: false, 
      error: error.message,
      newMatchesAnalyzed: 0,
      totalQuestsCompleted: 0,
      totalXpGained: 0
    };
  }
};

// Получить доступные квесты для выбора пользователем
const getAvailableQuests = async (userId, game, type = 'daily') => {
  try {
    // Получаем статистику пользователя для определения уровня
    let userStats = await UserStats.findOne({ where: { userId } });
    if (!userStats) {
      userStats = await UserStats.create({
        userId,
        level: 1,
        experience: 0
      });
    }
    
    const userLevel = userStats.level;
    
    // Определяем доступные сложности на основе уровня
    const availableDifficulties = ['easy'];
    if (userLevel >= 5) availableDifficulties.push('medium');
    if (userLevel >= 10) availableDifficulties.push('hard');
    if (userLevel >= 15) availableDifficulties.push('epic');
    
    // Получаем все задания нужного типа и доступной сложности
    const quests = await Quest.findAll({
      where: { 
        game, 
        type, 
        isActive: true,
        difficulty: { [Op.in]: availableDifficulties }
      },
      order: [['difficulty', 'ASC'], ['reward', 'DESC']]
    });
    
    // Получаем уже назначенные квесты (только active и completed, не claimed)
    const now = new Date();
    const assignedQuests = await UserQuest.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: now },
        status: { [Op.in]: ['active', 'completed'] } // Исключаем claimed квесты
      },
      include: [{
        model: Quest,
        as: 'quest',
        where: { game, type }
      }]
    });
    
    const assignedQuestIds = assignedQuests.map(uq => uq.questId);
    
    // Группируем квесты по сложности
    const questsByDifficulty = {
      easy: [],
      medium: [],
      hard: [],
      epic: []
    };
    
    quests.forEach(quest => {
      const isAssigned = assignedQuestIds.includes(quest.id);
      questsByDifficulty[quest.difficulty].push({
        ...quest.toJSON(),
        isAssigned
      });
    });
    
    return {
      userLevel,
      availableDifficulties,
      questsByDifficulty,
      maxQuests: getMaxQuestsForLevel(userLevel, type),
      currentlyAssigned: assignedQuests.length
    };
  } catch (error) {
    console.error('Error fetching available quests:', error);
    throw error;
  }
};

// Выбрать конкретные квесты пользователем
const selectQuests = async (userId, questIds, type = 'daily') => {
  try {
    const now = new Date();
    const expiresAt = new Date();
    
    if (type === 'daily') {
      expiresAt.setHours(23, 59, 59, 999);
    } else if (type === 'weekly') {
      expiresAt.setDate(expiresAt.getDate() + (7 - expiresAt.getDay()));
      expiresAt.setHours(23, 59, 59, 999);
    }
    
    // Получаем статистику пользователя для проверки уровня
    let userStats = await UserStats.findOne({ where: { userId } });
    if (!userStats) {
      userStats = await UserStats.create({
        userId,
        level: 1,
        experience: 0
      });
    }
    
    const userLevel = userStats.level;
    
    // Проверяем лимит квестов в зависимости от уровня
    const maxQuests = getMaxQuestsForLevel(userLevel, type);
    if (questIds.length > maxQuests) {
      throw new Error(`Можно выбрать максимум ${maxQuests} ${type === 'daily' ? 'ежедневных' : 'еженедельных'} заданий (ваш уровень: ${userLevel})`);
    }
    
    // Определяем доступные сложности
    const availableDifficulties = ['easy'];
    if (userLevel >= 5) availableDifficulties.push('medium');
    if (userLevel >= 10) availableDifficulties.push('hard');
    if (userLevel >= 15) availableDifficulties.push('epic');
    
    // Получаем выбранные квесты
    const quests = await Quest.findAll({
      where: { 
        id: { [Op.in]: questIds },
        type,
        isActive: true
      }
    });
    
    // Проверяем, что все квесты существуют
    if (quests.length !== questIds.length) {
      throw new Error('Некоторые из выбранных квестов не найдены');
    }
    
    // Проверяем доступность сложности для пользователя
    for (const quest of quests) {
      if (!availableDifficulties.includes(quest.difficulty)) {
        throw new Error(`Квест "${quest.title}" (${quest.difficulty}) недоступен для вашего уровня (${userLevel})`);
      }
    }
    
    // Проверяем, какие квесты уже назначены пользователю (ВСЕ статусы, включая claimed)
    const existingUserQuests = await UserQuest.findAll({
      where: {
        userId,
        questId: { [Op.in]: questIds }
        // БЕЗ фильтра по status - проверяем ВСЕ квесты
      }
    });
    
    // Если квест уже назначен (любой статус), пропускаем его
    const existingQuestIds = existingUserQuests.map(uq => uq.questId);
    const newQuestIds = questIds.filter(id => !existingQuestIds.includes(id));
    
    if (newQuestIds.length === 0) {
      throw new Error('Этот квест уже у вас есть (активный, завершенный или полученный)');
    }
    
    // Фильтруем только новые квесты
    const newQuests = quests.filter(q => newQuestIds.includes(q.id));
    
    console.log(`➕ Добавляем ${newQuests.length} новых квестов для пользователя ${userId}`);
    
    // Назначаем выбранные квесты
    const assigned = [];
    
    for (const quest of newQuests) {
      // Определяем targetValue
      const perMatchQuestTypes = [
        'kills_per_match', 'assists_per_match', 'assists', 'kda', 'kd', 
        'gpm', 'xpm', 'last_hits', 'denies', 'hero_damage', 'tower_damage', 
        'healing', 'no_death_win', 'rampage', 'godlike', 'triple_kill', 
        'net_worth', 'wards', 'stun_duration', 'runes', 'roshan_kills', 
        'perfect_game', 'ace', 'headshots', 'damage', 'rounds_won', 'mvp', 
        'headshot_rate', 'clutch', 'clutch_1v3', 'defuse', 'knife_kill',
        'multi_kill', 'first_kills', 'plants', 'smokes_used', 'enemy_flashed',
        'money_earned', 'eco_kills', 'wallbang', 'utility_damage', 
        'no_death_rounds', 'adr', 'awp_kills', 'pistol_rounds_won',
        'entry_kills', 'trade_kills', '4k_round', 'no_scope', 'flash_assists',
        'saves', 'flawless_round', 'clutch_defuse', 'deagle_kills',
        'ninja_defuse', 'collateral'
      ];
      
      const isPerMatchQuest = perMatchQuestTypes.includes(quest.requirement.type);
      const targetValue = isPerMatchQuest ? 1 : quest.requirement.value;
      
      const userQuest = await UserQuest.create({
        userId,
        questId: quest.id,
        progress: 0,
        targetValue: targetValue,
        status: 'active',
        expiresAt
      });
      
      assigned.push(userQuest);
      console.log(`✅ Пользователь ${userId} выбрал квест "${quest.title}" (${quest.difficulty})`);
    }
    
    return assigned;
  } catch (error) {
    console.error('Error selecting quests:', error);
    throw error;
  }
};

// Штрафовать пользователя за невыполненные квесты
const penalizeExpiredQuests = async (userId) => {
  try {
    const now = new Date();
    
    // Находим все истекшие квесты со статусом 'active' (выбраны, но не выполнены)
    const expiredQuests = await UserQuest.findAll({
      where: {
        userId,
        expiresAt: { [Op.lt]: now },
        status: 'active' // Только выбранные, но не выполненные
      },
      include: [{
        model: Quest,
        as: 'quest'
      }]
    });
    
    if (expiredQuests.length === 0) {
      return { penalized: 0, xpLost: 0 };
    }
    
    let totalXpLost = 0;
    
    // Считаем общий штраф за КАЖДЫЙ выбранный, но не выполненный квест
    for (const userQuest of expiredQuests) {
      const questReward = userQuest.quest.reward;
      const xpPenalty = questReward.xp || 0;
      totalXpLost += xpPenalty;
      
      console.log(`⚠️ ШТРАФ за выбранный, но не выполненный квест "${userQuest.quest.title}": -${xpPenalty} XP`);
      
      // Удаляем истекший квест
      await userQuest.destroy();
    }
    
    // Снимаем опыт с пользователя
    if (totalXpLost > 0) {
      const { UserStats } = require('../models');
      let stats = await UserStats.findOne({ where: { userId } });
      
      if (stats) {
        const oldLevel = stats.level;
        
        // Снимаем опыт (но не меньше 0)
        stats.experience = Math.max(0, stats.experience - totalXpLost);
        
        // Пересчитываем уровень
        const newLevel = calculateLevel(stats.experience);
        stats.level = newLevel;
        
        await stats.save();
        
        console.log(`🔥 ШТРАФ! Пользователь ${userId}: -${totalXpLost} XP за ${expiredQuests.length} выбранных, но не выполненных квестов`);
        
        if (newLevel < oldLevel) {
          console.log(`📉 Уровень понижен: ${oldLevel} -> ${newLevel}`);
        }
        
        return {
          penalized: expiredQuests.length,
          xpLost: totalXpLost,
          oldLevel,
          newLevel,
          levelDown: newLevel < oldLevel
        };
      }
    }
    
    return {
      penalized: expiredQuests.length,
      xpLost: totalXpLost
    };
  } catch (error) {
    console.error('Error penalizing expired quests:', error);
    return { penalized: 0, xpLost: 0, error: error.message };
  }
};

/**
 * Анализировать последние CS2 матчи и обновить квесты
 * @param {number} userId - ID пользователя
 * @returns {Object} - Результаты анализа
 */
const analyzeCS2Matches = async (userId) => {
  try {
    console.log(`🔍 Анализ CS2 матчей для пользователя ${userId}`);
    
    // Получаем последние 5 матчей из базы данных
    const recentMatches = await CS2Match.findAll({
      where: { userId },
      order: [['playedAt', 'DESC']],
      limit: 5
    });
    
    if (recentMatches.length === 0) {
      console.log(`ℹ️ Нет матчей для анализа`);
      return { 
        completedQuests: 0,
        totalXp: 0,
        questResults: []
      };
    }
    
    console.log(`📊 Найдено ${recentMatches.length} матчей для анализа`);
    
    // Берём последний матч для обновления квестов
    const lastMatch = recentMatches[0];
    
    // Подготавливаем данные матча в формате для updateQuestProgress
    const matchData = {
      matchId: lastMatch.matchId,
      matchDate: lastMatch.playedAt,
      isWin: lastMatch.isWin,
      kills: lastMatch.kills,
      deaths: lastMatch.deaths,
      assists: lastMatch.assists,
      headshots: lastMatch.headshots,
      damage: lastMatch.damage,
      mvps: lastMatch.mvps,
      rounds_won: lastMatch.roundsWon,
      rounds_played: lastMatch.roundsPlayed,
      map: lastMatch.map,
      adr: lastMatch.adr,
      headshot_percentage: lastMatch.headshotPercentage
    };
    
    console.log(`📊 Анализируем матч ${lastMatch.matchId}:`);
    console.log(`   K/D/A: ${matchData.kills}/${matchData.deaths}/${matchData.assists}`);
    console.log(`   Headshots: ${matchData.headshots}`);
    console.log(`   MVPs: ${matchData.mvps}`);
    
    // Обновляем прогресс квестов
    const result = await updateQuestProgress(userId, matchData, 'cs2');
    
    console.log(`✅ Квестов завершено: ${result.completedQuests.length}, XP: ${result.totalXp}`);
    
    return {
      completedQuests: result.completedQuests.length,
      totalXp: result.totalXp,
      questResults: result.completedQuests,
      levelInfo: result.levelInfo
    };
    
  } catch (error) {
    console.error('❌ Ошибка анализа CS2 матчей:', error);
    return {
      completedQuests: 0,
      totalXp: 0,
      questResults: [],
      error: error.message
    };
  }
};

/**
 * Получить сервис уведомлений Steam
 */
const getSteamNotificationService = () => {
  return steamNotificationService;
};

module.exports = {
  initializeQuests,
  getUserQuests,
  assignQuests,
  updateQuestProgress,
  calculateLevel,
  getXpForNextLevel,
  getLevelProgress,
  getMaxQuestsForLevel,
  claimQuestReward,
  analyzeRecentMatches,
  analyzeCS2Matches,
  getAvailableQuests,
  selectQuests,
  penalizeExpiredQuests,
  initSteamNotifications,
  getSteamNotificationService,
  LEVEL_REWARDS
};

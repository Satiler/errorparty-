import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft,
  FaTrophy,
  FaPlus,
  FaTimes,
  FaUser,
  FaStar,
  FaMedal,
  FaCrown
} from 'react-icons/fa';

// Предустановленные достижения
const PRESET_ACHIEVEMENTS = {
  dota2: [
    { key: 'first_blood_10', title: 'Первая кровь x10', description: 'Получите 10 первых убийств', icon: '🩸', rarity: 'common' },
    { key: 'rampage_master', title: 'Мастер рампага', description: 'Получите 5 рампагов', icon: '⚡', rarity: 'legendary' },
    { key: 'support_god', title: 'Бог поддержки', description: 'Купите 1000 вардов', icon: '👁️', rarity: 'epic' },
    { key: 'carry_master', title: 'Мастер керри', description: 'Нанесите 1M урона', icon: '⚔️', rarity: 'epic' },
    { key: 'immortal_rank', title: 'Immortal ранг', description: 'Достигните Immortal', icon: '💎', rarity: 'mythic' }
  ],
  cs2: [
    { key: 'ace_master', title: 'Мастер эйсов', description: 'Получите 10 эйсов', icon: '🎯', rarity: 'rare' },
    { key: 'clutch_king', title: 'Король клатчей', description: 'Выиграйте 20 клатчей 1v3+', icon: '👑', rarity: 'epic' },
    { key: 'headshot_machine', title: 'Машина хедшотов', description: '70%+ хедшотов в матче', icon: '💀', rarity: 'rare' },
    { key: 'mvp_legend', title: 'Легенда MVP', description: 'Получите 50 MVP', icon: '⭐', rarity: 'epic' },
    { key: 'global_elite', title: 'Global Elite', description: 'Достигните GE ранга', icon: '🏆', rarity: 'legendary' }
  ],
  general: [
    { key: 'teamspeak_veteran', title: 'Ветеран TeamSpeak', description: '100 часов в голосе', icon: '🎤', rarity: 'common' },
    { key: 'meme_lord', title: 'Повелитель мемов', description: 'Загрузите 50 мемов', icon: '😂', rarity: 'rare' },
    { key: 'quest_master', title: 'Мастер квестов', description: 'Выполните 100 квестов', icon: '📜', rarity: 'epic' },
    { key: 'social_butterfly', title: 'Душа компании', description: '500 сообщений в чате', icon: '💬', rarity: 'common' },
    { key: 'early_adopter', title: 'Ранний пользователь', description: 'Зарегистрировались первыми', icon: '🌟', rarity: 'legendary' }
  ]
};

const AdminAchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [formData, setFormData] = useState({
    userId: '',
    achievementKey: '',
    title: '',
    description: '',
    game: 'general',
    rarity: 'common',
    icon: '🏆'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchAchievements();
    fetchUsers();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch('/api/admin/achievements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('У вас нет прав доступа к админ-панели.');
        navigate('/');
        return;
      }

      const data = await response.json();
      setAchievements(data.achievements);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      navigate('/');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleGrantAchievement = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/achievements/grant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Достижение успешно выдано!');
        setIsModalOpen(false);
        setFormData({
          userId: '',
          achievementKey: '',
          title: '',
          description: '',
          game: 'general',
          rarity: 'common',
          icon: '🏆'
        });
        fetchAchievements();
      } else {
        alert(data.error || 'Ошибка при выдаче достижения');
      }
    } catch (error) {
      console.error('Error granting achievement:', error);
      alert('Не удалось выдать достижение');
    }
  };

  const getRarityConfig = (rarity) => {
    const config = {
      common: { icon: FaTrophy, color: 'text-gray-400', bg: 'bg-gray-600' },
      rare: { icon: FaMedal, color: 'text-blue-400', bg: 'bg-blue-600' },
      epic: { icon: FaStar, color: 'text-purple-400', bg: 'bg-purple-600' },
      legendary: { icon: FaCrown, color: 'text-yellow-400', bg: 'bg-yellow-600' },
      mythic: { icon: FaCrown, color: 'text-red-400', bg: 'bg-red-600' }
    };
    return config[rarity] || config.common;
  };

  const getGameBadge = (game) => {
    const colors = {
      dota2: 'bg-red-500',
      cs2: 'bg-orange-500',
      general: 'bg-green-500'
    };
    const labels = {
      dota2: 'Dota 2',
      cs2: 'CS2',
      general: 'Общее'
    };
    return <span className={`px-2 py-1 ${colors[game]} text-white text-xs rounded`}>{labels[game]}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
          >
            <FaArrowLeft />
            Назад к панели
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <FaTrophy className="text-yellow-400" />
                Управление достижениями
              </h1>
              <p className="text-gray-400">
                Всего выдано: {achievements.length}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all flex items-center gap-2 font-semibold"
            >
              <FaPlus />
              Выдать достижение
            </button>
          </div>
        </motion.div>

        {/* Achievements List */}
        <div className="space-y-4">
          {achievements.map((achievement) => {
            const rarityConfig = getRarityConfig(achievement.rarity);
            const Icon = rarityConfig.icon;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-4 ${rarityConfig.bg} rounded-xl`}>
                    <Icon className="text-3xl text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {achievement.icon} {achievement.title}
                      </h3>
                      <span className={`px-3 py-1 ${rarityConfig.bg} text-white text-xs rounded-full uppercase font-semibold`}>
                        {achievement.rarity}
                      </span>
                      {getGameBadge(achievement.game)}
                    </div>

                    <p className="text-gray-300 mb-3">{achievement.description}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <FaUser className="text-purple-400" />
                        <span>{achievement.User?.username || 'Unknown'}</span>
                      </div>
                      <div className="text-gray-500">
                        {new Date(achievement.earnedAt).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-gray-500">
                        Key: <code className="bg-gray-900 px-2 py-1 rounded">{achievement.achievementKey}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {achievements.length === 0 && (
          <div className="text-center py-12">
            <FaTrophy className="text-6xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Достижения ещё не выданы</p>
          </div>
        )}

        {/* Grant Achievement Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-purple-500/30"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                  <h2 className="text-2xl font-bold text-white">Выдать достижение</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleGrantAchievement} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Пользователь
                    </label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Выберите пользователя</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </select>
                  </div>

                  {/* Game Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Категория достижения
                    </label>
                    <select
                      value={formData.game}
                      onChange={(e) => {
                        setFormData({ ...formData, game: e.target.value });
                        setSelectedPreset(null);
                      }}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="general">🌟 Общие достижения</option>
                      <option value="dota2">🔴 Dota 2</option>
                      <option value="cs2">🔫 CS2</option>
                    </select>
                  </div>

                  {/* Preset Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Выберите готовое достижение
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                      {PRESET_ACHIEVEMENTS[formData.game].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(preset);
                            setFormData({
                              ...formData,
                              achievementKey: preset.key,
                              title: preset.title,
                              description: preset.description,
                              icon: preset.icon,
                              rarity: preset.rarity
                            });
                          }}
                          className={`text-left p-3 rounded-lg transition-all ${
                            selectedPreset?.key === preset.key
                              ? 'bg-purple-600 border-purple-400'
                              : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                          } border`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{preset.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">{preset.title}</span>
                                <span className={`px-2 py-0.5 text-xs rounded uppercase font-bold ${
                                  preset.rarity === 'mythic' ? 'bg-red-600' :
                                  preset.rarity === 'legendary' ? 'bg-yellow-600' :
                                  preset.rarity === 'epic' ? 'bg-purple-600' :
                                  preset.rarity === 'rare' ? 'bg-blue-600' :
                                  'bg-gray-600'
                                } text-white`}>
                                  {preset.rarity}
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{preset.description}</p>
                              <code className="text-xs text-gray-500 mt-1 block">Key: {preset.key}</code>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-800 text-gray-400">или создайте свое</span>
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Achievement Key (уникальный идентификатор)
                    </label>
                    <input
                      type="text"
                      value={formData.achievementKey}
                      onChange={(e) => {
                        setFormData({ ...formData, achievementKey: e.target.value });
                        setSelectedPreset(null);
                      }}
                      placeholder="custom_achievement_key"
                      required
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Название
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Название достижения"
                        required
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Иконка (emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="🏆"
                        maxLength={2}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Описание достижения"
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Редкость
                    </label>
                    <select
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="common">⚪ Common (Обычное)</option>
                      <option value="rare">🔵 Rare (Редкое)</option>
                      <option value="epic">🟣 Epic (Эпическое)</option>
                      <option value="legendary">🟡 Legendary (Легендарное)</option>
                      <option value="mythic">🔴 Mythic (Мифическое)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
                    >
                      Выдать достижение
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminAchievementsPage;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaStar, FaFire, FaCheckCircle, FaLock, FaClock, FaGamepad, FaGift, FaMedal, FaCrown, FaList, FaPlus } from 'react-icons/fa';
import { useToast } from '../hooks/useToast';

const QuestsPage = () => {
  const [quests, setQuests] = useState({ daily: [], weekly: [], special: [] });
  const [availableQuests, setAvailableQuests] = useState([]);
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [claimingQuest, setClaimingQuest] = useState(null);
  const [selectedGame, setSelectedGame] = useState('all');
  const [activeTab, setActiveTab] = useState('my'); // 'my' или 'available'
  const [selectingQuest, setSelectingQuest] = useState(null);
  const toast = useToast();

  // При переключении на "Все задания" устанавливаем Dota 2 по умолчанию
  useEffect(() => {
    if (activeTab === 'available' && selectedGame === 'all') {
      setSelectedGame('dota2');
    }
  }, [activeTab]);
  
  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'info') {
      toast.info(message);
    } else {
      toast.success(message);
    }
  };

  useEffect(() => {
    fetchQuests();
    fetchLevelInfo();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableQuests();
    }
  }, [activeTab, selectedGame]);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Необходимо авторизоваться', 'error');
        return;
      }

      const response = await fetch('/api/quests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setQuests(data.quests);
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
      showToast('Ошибка загрузки заданий', 'error');
    }
  };

  const fetchAvailableQuests = async () => {
    setLoadingAvailable(true);
    try {
      const token = localStorage.getItem('token');
      const game = selectedGame === 'all' ? 'dota2' : selectedGame; // По умолчанию dota2
      const response = await fetch(`/api/quests/available?game=${game}&type=daily`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Объединяем все квесты из разных сложностей
        const allAvailable = Object.values(data.questsByDifficulty).flat();
        setAvailableQuests(allAvailable);
      }
    } catch (err) {
      console.error('Failed to fetch available quests:', err);
      showToast('Ошибка загрузки доступных заданий', 'error');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const fetchLevelInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/quests/level', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setLevelInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch level info:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectQuest = async (questId, questTitle) => {
    setSelectingQuest(questId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quests/select', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questIds: [questId],
          type: 'daily'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast(`✅ Квест "${questTitle}" добавлен!`, 'success');
        await fetchQuests();
        await fetchLevelInfo();
        if (activeTab === 'available') {
          await fetchAvailableQuests();
        }
      } else {
        showToast(data.error || 'Ошибка добавления квеста', 'error');
      }
    } catch (err) {
      console.error('Failed to select quest:', err);
      showToast('Ошибка добавления квеста', 'error');
    } finally {
      setSelectingQuest(null);
    }
  };

  const claimReward = async (questId, questTitle) => {
    setClaimingQuest(questId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quests/${questId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        showToast(`🎉 Награда получена за "${questTitle}"! +${data.reward.xp} XP`, 'success');
        await fetchQuests();
        await fetchLevelInfo();
      } else {
        showToast(data.error || 'Ошибка получения награды', 'error');
      }
    } catch (err) {
      console.error('Failed to claim reward:', err);
      showToast('Ошибка получения награды', 'error');
    } finally {
      setClaimingQuest(null);
    }
  };

  const renderQuest = (userQuest) => {
    const quest = userQuest.quest;
    const progress = userQuest.progress;
    const target = userQuest.targetValue;
    const percentage = Math.min((progress / target) * 100, 100);
    const isCompleted = userQuest.status === 'completed';
    const isClaimed = userQuest.status === 'claimed';

    const difficultyColors = {
      easy: { bg: 'from-green-600 to-green-700', border: 'border-green-500', text: 'text-green-400' },
      medium: { bg: 'from-blue-600 to-blue-700', border: 'border-blue-500', text: 'text-blue-400' },
      hard: { bg: 'from-purple-600 to-purple-700', border: 'border-purple-500', text: 'text-purple-400' },
      epic: { bg: 'from-orange-500 to-red-600', border: 'border-orange-500', text: 'text-orange-400' }
    };

    const colors = difficultyColors[quest.difficulty];

    return (
      <motion.div
        key={userQuest.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative p-5 rounded-2xl backdrop-blur-xl transition-all ${
          isClaimed ? 'bg-gray-800/30 border border-gray-700/50' :
          isCompleted ? `bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 ${colors.border} shadow-[0_0_30px_rgba(16,185,129,0.3)]` :
          'bg-gray-800/60 border border-gray-700/70 hover:border-gray-600 hover:shadow-xl'
        }`}
      >
        {/* Glow effect для completed */}
        {isCompleted && !isClaimed && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl"></div>
        )}

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              {/* Icon */}
              <motion.div
                className={`p-4 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg flex items-center justify-center`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                style={{ minWidth: '64px', minHeight: '64px' }}
              >
                <span className="text-3xl">{quest.icon}</span>
              </motion.div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-xl text-white">{quest.title}</h4>
                  {isCompleted && !isClaimed && (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <FaCheckCircle className="text-green-400 text-xl" />
                    </motion.span>
                  )}
                  {isClaimed && <FaLock className="text-gray-500" />}
                </div>
                <p className="text-sm text-gray-300 mb-2">{quest.description}</p>
                
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors.text} bg-black/30 border ${colors.border}`}>
                    {quest.difficulty}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    quest.game === 'dota2' ? 'bg-blue-900/50 text-blue-300 border border-blue-600' :
                    quest.game === 'cs2' ? 'bg-orange-900/50 text-orange-300 border border-orange-600' :
                    'bg-gray-700/50 text-gray-300 border border-gray-600'
                  }`}>
                    {quest.game === 'dota2' ? '🎮 Dota 2' : quest.game === 'cs2' ? '🔫 CS2' : '⭐ Общие'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Rewards */}
            <div className="flex flex-col items-end gap-2 ml-4">
              <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/50"
                whileHover={{ scale: 1.05 }}
              >
                <FaStar className="text-yellow-400" size={18} />
                <span className="font-black text-lg text-yellow-400">+{quest.reward.xp}</span>
                <span className="text-xs text-yellow-300">XP</span>
              </motion.div>
              
              {quest.reward.coins > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-lg border border-orange-500/50">
                  <FaTrophy className="text-orange-400" size={14} />
                  <span className="text-sm font-bold text-orange-400">+{quest.reward.coins}</span>
                </div>
              )}
              
              {quest.reward.tsRole && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-lg border border-purple-500/50">
                  <FaMedal className="text-purple-400" size={14} />
                  <span className="text-xs font-semibold text-purple-300">{quest.reward.tsRole}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {!isClaimed && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-300">Прогресс: {progress} / {target}</span>
                <span className="text-sm font-bold ${colors.text}">{percentage.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-gray-700">
                <motion.div
                  className={`h-full bg-gradient-to-r ${
                    isCompleted ? 'from-green-500 to-emerald-500' : 'from-blue-500 via-purple-500 to-pink-500'
                  } relative`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              </div>
            </div>
          )}



          {/* Claim Button */}
          {isCompleted && !isClaimed && (
            <motion.button
              onClick={() => claimReward(userQuest.id, quest.title)}
              disabled={claimingQuest === userQuest.id}
              className="mt-4 w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-black text-white shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400/50"
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16,185,129,0.5)' }}
              whileTap={{ scale: 0.98 }}
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {claimingQuest === userQuest.id ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Получаем награду...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <FaGift size={20} />
                  <span>🎉 ЗАБРАТЬ НАГРАДУ</span>
                </div>
              )}
            </motion.button>
          )}

          {isClaimed && (
            <div className="mt-4 py-3 text-center text-gray-500 font-semibold">
              ✅ Награда получена
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const allQuests = [...quests.daily, ...quests.weekly, ...quests.special];
  const filteredQuests = selectedGame === 'all' ? allQuests : allQuests.filter(q => q.quest.game === selectedGame);

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-black text-white mb-4 flex items-center justify-center gap-4">
            <FaTrophy className="text-yellow-400" />
            ЗАДАНИЯ И УРОВНИ
            <FaCrown className="text-purple-400" />
          </h1>
          <p className="text-xl text-gray-300 font-semibold">Выполняй задания, получай опыт и роли TeamSpeak!</p>
        </motion.div>

        {/* Level Info */}
        {levelInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-12 p-8 bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-orange-900/60 rounded-3xl border-2 border-purple-500/50 backdrop-blur-xl overflow-hidden shadow-2xl"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-orange-500 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <motion.div
                    className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <FaStar size={48} className="text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-5xl font-black text-white mb-2">Уровень {levelInfo.level}</h2>
                    <p className="text-xl text-purple-300 font-bold">
                      {(levelInfo.currentLevelXp || 0).toLocaleString()} / {(levelInfo.xpNeeded || 0).toLocaleString()} XP
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-7xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {levelInfo.progressPercentage || 0}%
                  </div>
                  <div className="text-purple-300 text-lg font-bold">До уровня {levelInfo.level + 1}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-8 bg-black/40 rounded-full overflow-hidden border-2 border-purple-500/50 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progressPercentage || 0}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
                
                <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {(levelInfo.currentLevelXp || 0).toLocaleString()} / {(levelInfo.xpNeeded || 0).toLocaleString()} XP
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex gap-3 p-2 bg-gray-800/60 rounded-2xl border border-gray-700">
            <motion.button
              onClick={() => setActiveTab('my')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'my' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📋 Мои задания
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('available')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'available' 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ➕ Все задания
            </motion.button>
          </div>
        </div>

        {/* Game Filter - только для вкладки "Все задания" */}
        {activeTab === 'available' && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex gap-3">
              <motion.button
                onClick={() => setSelectedGame('dota2')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'dota2' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' 
                    : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🎮 Dota 2
              </motion.button>
              <motion.button
                onClick={() => setSelectedGame('cs2')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'cs2' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105' 
                    : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔫 CS2
              </motion.button>
            </div>
          </div>
        )}

        {/* Game Filter для "Мои задания" */}
        {activeTab === 'my' && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex gap-3">
              <motion.button
                onClick={() => setSelectedGame('all')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105' 
                    : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Все
              </motion.button>
              <motion.button
                onClick={() => setSelectedGame('dota2')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'dota2' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' 
                    : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🎮 Dota 2
              </motion.button>
              <motion.button
                onClick={() => setSelectedGame('cs2')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedGame === 'cs2' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg scale-105' 
                    : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔫 CS2
              </motion.button>
            </div>
          </div>
        )}

        {activeTab === 'my' ? (
          // МОИ ЗАДАНИЯ
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Daily Quests */}
              {quests.daily.filter(q => selectedGame === 'all' || q.quest.game === selectedGame).length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <FaClock className="text-blue-400" size={28} />
                    <h2 className="text-3xl font-black text-white">Ежедневные задания</h2>
                    <span className="px-4 py-1 bg-blue-600/30 rounded-full text-blue-300 font-bold border border-blue-500/50">
                      {quests.daily.filter(q => selectedGame === 'all' || q.quest.game === selectedGame).length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {quests.daily
                      .filter(q => selectedGame === 'all' || q.quest.game === selectedGame)
                      .map(renderQuest)}
                  </div>
                </div>
              )}

              {/* Weekly Quests */}
              {quests.weekly.filter(q => selectedGame === 'all' || q.quest.game === selectedGame).length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <FaFire className="text-orange-400" size={28} />
                    <h2 className="text-3xl font-black text-white">Еженедельные задания</h2>
                    <span className="px-4 py-1 bg-orange-600/30 rounded-full text-orange-300 font-bold border border-orange-500/50">
                      {quests.weekly.filter(q => selectedGame === 'all' || q.quest.game === selectedGame).length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {quests.weekly
                      .filter(q => selectedGame === 'all' || q.quest.game === selectedGame)
                      .map(renderQuest)}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredQuests.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <FaGamepad size={80} className="mx-auto mb-6 text-gray-600" />
                  <h3 className="text-2xl font-bold text-gray-400 mb-4">У вас пока нет заданий</h3>
                  <p className="text-gray-500 mb-8">Перейдите во вкладку "Все задания" чтобы выбрать квесты!</p>
                  
                  <motion.button
                    onClick={() => setActiveTab('available')}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ➕ Выбрать задания
                  </motion.button>
                </motion.div>
              )}
            </>
          )
        ) : (
          // ВСЕ ЗАДАНИЯ
          loadingAvailable ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {availableQuests.map(quest => {
                const difficultyColors = {
                  easy: { bg: 'from-green-600 to-green-700', border: 'border-green-500', text: 'text-green-400' },
                  medium: { bg: 'from-blue-600 to-blue-700', border: 'border-blue-500', text: 'text-blue-400' },
                  hard: { bg: 'from-purple-600 to-purple-700', border: 'border-purple-500', text: 'text-purple-400' },
                  epic: { bg: 'from-orange-500 to-red-600', border: 'border-orange-500', text: 'text-orange-400' }
                };
                const colors = difficultyColors[quest.difficulty];
                const isAssigned = quest.isAssigned;

                return (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative p-5 rounded-2xl backdrop-blur-xl transition-all ${
                      isAssigned 
                        ? 'bg-gray-800/30 border border-gray-700/50 opacity-60' 
                        : 'bg-gray-800/60 border border-gray-700/70 hover:border-gray-600 hover:shadow-xl'
                    }`}
                  >
                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icon */}
                          <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg flex items-center justify-center`}
                            style={{ minWidth: '56px', minHeight: '56px' }}
                          >
                            <span className="text-2xl">{quest.icon}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-white mb-1">{quest.title}</h4>
                            <p className="text-xs text-gray-300 mb-2">{quest.description}</p>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${colors.text} bg-black/30 border ${colors.border}`}>
                                {quest.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rewards */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                          <FaStar className="text-yellow-400" size={14} />
                          <span className="font-bold text-sm text-yellow-400">+{quest.reward.xp} XP</span>
                        </div>
                        
                        {quest.reward.coins > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-lg border border-orange-500/50">
                            <FaTrophy className="text-orange-400" size={12} />
                            <span className="text-xs font-bold text-orange-400">+{quest.reward.coins}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {isAssigned ? (
                        <div className="py-2 text-center text-gray-500 font-semibold text-sm">
                          ✅ Уже взят
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => selectQuest(quest.id, quest.title)}
                          disabled={selectingQuest === quest.id}
                          className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {selectingQuest === quest.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Добавляем...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <FaPlus size={14} />
                              <span>Взять квест</span>
                            </div>
                          )}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>
  );
};

export default QuestsPage;

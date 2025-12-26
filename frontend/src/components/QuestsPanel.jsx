import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaStar, FaFire, FaCheckCircle, FaLock, FaClock } from 'react-icons/fa';

const QuestsPanel = ({ userId }) => {
  const [quests, setQuests] = useState({ daily: [], weekly: [], special: [] });
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingQuest, setClaimingQuest] = useState(null);

  useEffect(() => {
    fetchQuests();
    fetchLevelInfo();
  }, [userId]);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setQuests(data.quests);
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    }
  };

  const fetchLevelInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quests/level/${userId}`, {
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

  const claimReward = async (questId) => {
    setClaimingQuest(questId);
    
    // ✅ Optimistic update - update UI immediately
    const previousQuests = [...quests];
    setQuests(prevQuests => 
      prevQuests.map(q => 
        q.id === questId 
          ? { ...q, status: 'claimed' }
          : q
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quests/${questId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Server confirmed - fetch fresh data
        await fetchQuests();
        await fetchLevelInfo();
      } else {
        // ✅ Rollback on error
        console.error('Failed to claim:', data.error);
        setQuests(previousQuests);
      }
    } catch (err) {
      // ✅ Rollback on error
      console.error('Failed to claim reward:', err);
      setQuests(previousQuests);
    } finally {
      setClaimingQuest(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderQuest = (userQuest) => {
    const quest = userQuest.quest;
    const progress = userQuest.progress;
    const target = userQuest.targetValue;
    const percentage = Math.min((progress / target) * 100, 100);
    const isCompleted = userQuest.status === 'completed';
    const isClaimed = userQuest.status === 'claimed';

    const difficultyColors = {
      easy: 'from-green-600 to-green-700',
      medium: 'from-blue-600 to-blue-700',
      hard: 'from-purple-600 to-purple-700',
      epic: 'from-orange-500 to-red-600'
    };

    return (
      <motion.div
        key={userQuest.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`relative p-4 rounded-xl border-2 ${
          isClaimed ? 'bg-gray-800/50 border-gray-700' :
          isCompleted ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500' :
          'bg-gray-800/70 border-gray-700'
        } backdrop-blur-sm transition-all hover:scale-102`}
      >
        {/* Иконка и заголовок */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${difficultyColors[quest.difficulty]} shadow-lg`}>
              <span className="text-2xl">{quest.icon}</span>
            </div>
            <div>
              <h4 className="font-bold text-white flex items-center gap-2">
                {quest.title}
                {isCompleted && !isClaimed && (
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                    <FaCheckCircle className="text-green-400" />
                  </motion.span>
                )}
                {isClaimed && <FaLock className="text-gray-500" />}
              </h4>
              <p className="text-sm text-gray-400">{quest.description}</p>
            </div>
          </div>
          
          {/* Награда */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-yellow-400">
              <FaStar size={14} />
              <span className="font-bold text-sm">+{quest.reward.xp} XP</span>
            </div>
            {quest.reward.coins > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <FaTrophy size={12} />
                <span className="text-xs font-semibold">+{quest.reward.coins}</span>
              </div>
            )}
          </div>
        </div>

        {/* Прогресс */}
        {!isClaimed && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1 text-xs text-gray-400">
              <span>Прогресс: {progress} / {target}</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${
                  isCompleted ? 'from-green-500 to-emerald-500' : 'from-blue-500 to-purple-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Кнопка забрать награду */}
        {isCompleted && !isClaimed && (
          <motion.button
            onClick={() => claimReward(userQuest.id)}
            disabled={claimingQuest === userQuest.id}
            className="mt-3 w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-bold text-white shadow-lg disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {claimingQuest === userQuest.id ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Забираем...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FaTrophy />
                <span>Забрать награду</span>
              </div>
            )}
          </motion.button>
        )}
      </motion.div>
    );
  };

  const totalQuests = [...quests.daily, ...quests.weekly, ...quests.special].length;

  return (
    <div className="space-y-6">
      {/* Информация об уровне */}
      {levelInfo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl border-2 border-purple-500/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Анимированный фон */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <FaStar size={32} className="text-white" />
                </motion.div>
                <div>
                  <h3 className="text-3xl font-black text-white">Уровень {levelInfo.level}</h3>
                  <p className="text-purple-300 font-semibold">
                    {levelInfo.experience.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-5xl font-black text-white/80">{levelInfo.progress.percentage}%</div>
                <div className="text-purple-300 text-sm font-semibold">До уровня {levelInfo.level + 1}</div>
              </div>
            </div>

            {/* Прогресс-бар */}
            <div className="relative h-6 bg-black/30 rounded-full overflow-hidden border-2 border-purple-500/30">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progress.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                <motion.div
                  className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
              
              {/* Текст */}
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg">
                {levelInfo.progress.current.toLocaleString()} / {levelInfo.progress.needed.toLocaleString()} XP
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ежедневные задания */}
      {quests.daily.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaClock className="text-blue-400" size={20} />
            <h3 className="text-xl font-bold text-white">Ежедневные задания</h3>
            <span className="text-sm text-gray-400">({quests.daily.length})</span>
          </div>
          <div className="space-y-3">
            {quests.daily.map(renderQuest)}
          </div>
        </div>
      )}

      {/* Еженедельные задания */}
      {quests.weekly.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaFire className="text-orange-400" size={20} />
            <h3 className="text-xl font-bold text-white">Еженедельные задания</h3>
            <span className="text-sm text-gray-400">({quests.weekly.length})</span>
          </div>
          <div className="space-y-3">
            {quests.weekly.map(renderQuest)}
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {totalQuests === 0 && (
        <div className="text-center py-12">
          <FaTrophy size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">Заданий пока нет</p>
          <p className="text-gray-500 text-sm mt-2">Задания появятся после анализа ваших матчей</p>
        </div>
      )}
    </div>
  );
};

export default QuestsPanel;

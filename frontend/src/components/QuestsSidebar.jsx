import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaStar, FaChevronRight, FaChevronLeft, FaGamepad } from 'react-icons/fa';
import { GiTrophy, GiLevelEndFlag } from 'react-icons/gi';

const QuestsSidebar = () => {
  const [quests, setQuests] = useState([]);
  const [levelInfo, setLevelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    let interval = null;

    const loadData = async () => {
      if (!isMounted) return;
      await Promise.all([fetchQuests(), fetchLevelInfo()]);
    };

    loadData();
    
    // Увеличиваем интервал до 2 минут (квесты не обновляются так часто)
    interval = setInterval(loadData, 120000);
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setQuests([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/quests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        setQuests([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Объединяем все квесты из daily, weekly, special в один массив
        const allQuests = [
          ...(data.quests.daily || []),
          ...(data.quests.weekly || []),
          ...(data.quests.special || [])
        ].filter(q => q.status === 'active');
        
        setQuests(allQuests);
      }
    } catch (err) {
      console.error('Error fetching quests:', err);
      setQuests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevelInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLevelInfo(null);
        return;
      }
      
      const response = await fetch('/api/quests/level', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        setLevelInfo(null);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLevelInfo(data);
      }
    } catch (err) {
      console.error('Error fetching level info:', err);
    }
  };

  const claimReward = async (questId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quests/${questId}/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        fetchQuests();
        fetchLevelInfo();
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'from-green-500 to-emerald-600',
      medium: 'from-blue-500 to-cyan-600',
      hard: 'from-purple-500 to-pink-600',
      extreme: 'from-orange-500 to-red-600'
    };
    return colors[difficulty] || colors.easy;
  };

  const getGameIcon = (game) => {
    return game === 'dota2' ? '🎮' : game === 'cs2' ? '🔫' : '🏆';
  };

  const filteredQuests = filter === 'all' 
    ? quests 
    : quests.filter(q => q.quest.game === filter);

  const hasToken = localStorage.getItem('token');

  return (
    <>
      <AnimatePresence>
        {hasToken && !isCollapsed && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-b from-gray-900/95 via-gray-900/98 to-black/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl z-40 overflow-hidden flex flex-col"
          >
            {/* Header с уровнем */}
            {levelInfo && (
              <div className="relative p-4 border-b border-gray-700/50">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GiTrophy className="text-yellow-400 text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      <div>
                        <div className="text-white font-black text-lg">Уровень {levelInfo.level}</div>
                        <div className="text-xs text-gray-400">{levelInfo.xp} / {levelInfo.xpForNextLevel} XP</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    >
                      <FaChevronRight className="text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progressPercentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </motion.div>
                  </div>
                  <div className="text-xs text-right text-gray-500 mt-1">{levelInfo.progressPercentage}%</div>
                </div>
              </div>
            )}

            {/* Фильтры */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-700/50">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                Все ({quests.length})
              </button>
              <button
                onClick={() => setFilter('dota2')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'dota2' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' 
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                🎮 Dota 2
              </button>
              <button
                onClick={() => setFilter('cs2')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === 'cs2' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg' 
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                🔫 CS2
              </button>
            </div>

            {/* Квесты */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : filteredQuests.length === 0 ? (
                <div className="text-center py-12">
                  <GiLevelEndFlag className="mx-auto text-4xl text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">Нет активных квестов</p>
                  <p className="text-gray-600 text-xs mt-1">Заходи позже!</p>
                </div>
              ) : (
                filteredQuests.map((quest) => {
                  const isCompleted = quest.progress >= quest.targetValue;
                  const progressPercentage = Math.min((quest.progress / quest.targetValue) * 100, 100);
                  
                  return (
                    <motion.div
                      key={quest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative group"
                    >
                      <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        isCompleted 
                          ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border-gray-700/50 hover:border-gray-600/50'
                      }`}>
                        {/* Фон с градиентом */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${getDifficultyColor(quest.quest.difficulty)} opacity-10`}></div>
                        
                        <div className="relative p-3 space-y-2">
                          {/* Заголовок */}
                          <div className="flex items-start gap-2">
                            <div className="text-2xl">{quest.quest.icon || getGameIcon(quest.quest.game)}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-white truncate">{quest.quest.title}</h4>
                              <p className="text-xs text-gray-400 line-clamp-2">{quest.quest.description}</p>
                            </div>
                          </div>

                          {/* Прогресс */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">
                                {quest.progress} / {quest.targetValue}
                              </span>
                              <span className="text-gray-500">{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getDifficultyColor(quest.quest.difficulty)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>

                          {/* Награда и кнопка */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-yellow-400 font-bold">+{quest.quest.reward.xp} XP</span>
                              {quest.quest.reward.coins > 0 && (
                                <span className="text-orange-400 font-bold">+{quest.quest.reward.coins} 🪙</span>
                              )}
                            </div>
                            
                            {isCompleted && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => claimReward(quest.id)}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold shadow-lg hover:shadow-green-500/50 transition-shadow"
                              >
                                Забрать
                              </motion.button>
                            )}
                          </div>

                          {/* Срок действия */}
                          {quest.expiresAt && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              ⏰ До {new Date(quest.expiresAt).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer с кнопкой */}
            <div className="p-3 border-t border-gray-700/50">
              <a
                href="/quests"
                className="block w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white text-sm font-bold text-center hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Все задания →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка открытия */}
      <AnimatePresence>
        {hasToken && isCollapsed && (
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            onClick={() => setIsCollapsed(false)}
            className="fixed right-0 top-32 z-40 p-3 rounded-l-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-2xl hover:shadow-purple-500/50 transition-all group"
          >
            <FaChevronLeft className="group-hover:scale-110 transition-transform" />
            {quests.length > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                {quests.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #9333ea, #ec4899);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #a855f7, #f472b6);
        }
      `}</style>
    </>
  );
};

export default QuestsSidebar;

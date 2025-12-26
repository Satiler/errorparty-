import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaStar, FaTrophy, FaMedal, FaCheckCircle, FaLock } from 'react-icons/fa';

const QuestSelector = ({ isOpen, onClose, game, type, onQuestsSelected }) => {
  const [available, setAvailable] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableQuests();
    }
  }, [isOpen, game, type]);

  const loadAvailableQuests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quests/available?game=${game}&type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAvailable(data);
        setSelected([]);
      }
    } catch (err) {
      console.error('Failed to load available quests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuest = (questId) => {
    if (selected.includes(questId)) {
      setSelected(selected.filter(id => id !== questId));
    } else if (selected.length < available.maxQuests) {
      setSelected([...selected, questId]);
    }
  };

  const handleConfirm = async () => {
    if (selected.length !== available.maxQuests) {
      alert(`Выберите ${available.maxQuests} ${type === 'daily' ? 'ежедневных' : 'еженедельных'} заданий`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quests/select', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questIds: selected,
          type
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onQuestsSelected(data.message);
        onClose();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to select quests:', err);
      alert('❌ Ошибка выбора заданий');
    } finally {
      setSubmitting(false);
    }
  };

  const difficultyColors = {
    easy: { bg: 'from-green-600 to-green-700', border: 'border-green-500', text: 'text-green-400', name: 'Легкие' },
    medium: { bg: 'from-blue-600 to-blue-700', border: 'border-blue-500', text: 'text-blue-400', name: 'Средние' },
    hard: { bg: 'from-purple-600 to-purple-700', border: 'border-purple-500', text: 'text-purple-400', name: 'Сложные' },
    epic: { bg: 'from-orange-500 to-red-600', border: 'border-orange-500', text: 'text-orange-400', name: 'Эпические' }
  };

  const renderQuestCard = (quest) => {
    const isSelected = selected.includes(quest.id);
    const isDisabled = quest.isAssigned;
    const colors = difficultyColors[quest.difficulty];
    const canSelect = !isDisabled && (isSelected || selected.length < available.maxQuests);

    return (
      <motion.div
        key={quest.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
          isSelected
            ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg scale-105`
            : isDisabled
            ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
            : canSelect
            ? 'bg-gray-800/60 border-gray-700 hover:border-gray-500 hover:shadow-md'
            : 'bg-gray-800/40 border-gray-700 opacity-60 cursor-not-allowed'
        }`}
        onClick={() => canSelect && handleSelectQuest(quest.id)}
        whileHover={canSelect ? { scale: 1.02 } : {}}
        whileTap={canSelect ? { scale: 0.98 } : {}}
      >
        {/* Selection indicator */}
        <div className="absolute top-2 right-2">
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
            >
              <FaCheckCircle className="text-white" size={20} />
            </motion.div>
          )}
          {isDisabled && (
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <FaLock className="text-gray-400" size={16} />
            </div>
          )}
        </div>

        {/* Quest Icon */}
        <div className={`mb-3 p-3 rounded-lg bg-gradient-to-br ${colors.bg} inline-block`}>
          <span className="text-2xl">{quest.icon}</span>
        </div>

        {/* Quest Info */}
        <h4 className="font-bold text-white mb-1">{quest.title}</h4>
        <p className="text-xs text-gray-300 mb-3 line-clamp-2">{quest.description}</p>

        {/* Rewards */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded border border-yellow-500/50">
            <FaStar className="text-yellow-400" size={12} />
            <span className="text-xs font-bold text-yellow-400">+{quest.reward.xp}</span>
          </div>
          {quest.reward.coins > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded border border-orange-500/50">
              <FaTrophy className="text-orange-400" size={12} />
              <span className="text-xs font-bold text-orange-400">+{quest.reward.coins}</span>
            </div>
          )}
          {quest.reward.tsRole && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded border border-purple-500/50">
              <FaMedal className="text-purple-400" size={10} />
              <span className="text-xs font-semibold text-purple-300">{quest.reward.tsRole}</span>
            </div>
          )}
        </div>

        {isDisabled && (
          <div className="mt-2 text-xs text-gray-500 font-semibold">
            ✓ Уже назначен
          </div>
        )}
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-2 border-purple-500/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">
                  Выбор {type === 'daily' ? 'ежедневных' : 'еженедельных'} заданий
                </h2>
                <p className="text-gray-300">
                  {game === 'dota2' ? '🎮 Dota 2' : '🔫 CS2'} • 
                  Выберите {available?.maxQuests || 3} {type === 'daily' ? 'ежедневных' : 'еженедельных'} заданий
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FaTimes className="text-gray-400" size={24} />
              </button>
            </div>

            {/* Selection Counter */}
            {available && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(selected.length / available.maxQuests) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-white font-bold">
                  {selected.length} / {available.maxQuests}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            ) : available ? (
              <>
                {/* Level Info */}
                <div className="mb-6 p-4 bg-gray-800/60 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold mb-1">Ваш уровень: {available.userLevel}</h3>
                      <p className="text-sm text-gray-400">
                        Доступные сложности: {available.availableDifficulties.map(d => difficultyColors[d].name).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Уже назначено</div>
                      <div className="text-2xl font-bold text-purple-400">{available.currentlyAssigned}</div>
                    </div>
                  </div>
                </div>

                {/* Quests by Difficulty */}
                {Object.entries(available.questsByDifficulty).map(([difficulty, quests]) => {
                  if (quests.length === 0) return null;
                  const colors = difficultyColors[difficulty];
                  
                  return (
                    <div key={difficulty} className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className={`text-xl font-bold ${colors.text}`}>
                          {colors.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.text} bg-black/30 border ${colors.border}`}>
                          {quests.length} заданий
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quests.map(renderQuestCard)}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                Не удалось загрузить задания
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-800/60 border-t border-gray-700">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.length !== available?.maxQuests || submitting}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Назначаем...
                  </div>
                ) : (
                  `✅ Подтвердить выбор (${selected.length}/${available?.maxQuests || 3})`
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestSelector;

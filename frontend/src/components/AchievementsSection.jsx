import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaStar, FaMedal, FaCrown } from 'react-icons/fa';

const AchievementBadge = ({ achievement }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const rarityConfig = {
    common: {
      icon: FaTrophy,
      bgClass: 'from-gray-700 to-gray-900',
      borderClass: 'border-gray-600',
      textClass: 'text-gray-200',
      glow: 'shadow-[0_0_24px_2px_rgba(156,163,175,0.4)]'
    },
    rare: {
      icon: FaMedal,
      bgClass: 'from-blue-700 to-blue-900',
      borderClass: 'border-blue-500',
      textClass: 'text-blue-200',
      glow: 'shadow-[0_0_32px_4px_rgba(59,130,246,0.4)]'
    },
    epic: {
      icon: FaStar,
      bgClass: 'from-purple-700 to-purple-900',
      borderClass: 'border-purple-500',
      textClass: 'text-purple-200',
      glow: 'shadow-[0_0_32px_4px_rgba(168,85,247,0.4)]'
    },
    legendary: {
      icon: FaCrown,
      bgClass: 'from-yellow-500 to-orange-700',
      borderClass: 'border-yellow-400',
      textClass: 'text-yellow-200',
      glow: 'shadow-[0_0_40px_6px_rgba(251,191,36,0.5)]'
    }
  };

  const config = rarityConfig[achievement.rarity] || rarityConfig.common;
  const Icon = config.icon;

  // Превью-картинка из metadata или генерируем
  const preview = achievement.metadata?.imageUrl || achievement.preview;
  
  const generateImage = async () => {
    if (isGenerating || preview) return;
    
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/user/achievement/${achievement.id}/generate-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        achievement.metadata = { ...achievement.metadata, imageUrl: data.imageUrl };
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Автогенерация при монтировании, если нет картинки
  useEffect(() => {
    if (!preview && achievement.metadata?.kda) {
      generateImage();
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, rotateX: -15 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      whileHover={{ scale: 1.05, y: -10, rotateX: 5 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`relative rounded-3xl overflow-hidden cursor-pointer group shadow-2xl`}
      style={{ 
        minHeight: 280,
        background: `linear-gradient(135deg, ${config.bgClass.includes('gray') ? '#1f2937, #111827' : config.bgClass.includes('blue') ? '#1e40af, #1e3a8a' : config.bgClass.includes('purple') ? '#6b21a8, #581c87' : '#b45309, #92400e'})`,
      }}
    >
      {/* Неоновый border эффект */}
      <div className={`absolute inset-0 rounded-3xl border-2 ${config.borderClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} 
           style={{ 
             boxShadow: `0 0 20px ${config.borderClass.includes('gray') ? '#9ca3af' : config.borderClass.includes('blue') ? '#3b82f6' : config.borderClass.includes('purple') ? '#a855f7' : '#fbbf24'}, inset 0 0 20px rgba(255,255,255,0.1)`
           }}>
      </div>

      {/* Картинка-превью или градиент */}
      {preview ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={preview}
            alt={achievement.name}
            className="w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            loading="lazy"
          />
          {/* Градиент overlay для текста */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80"></div>
          {/* Сканирующая линия */}
          <motion.div 
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
            animate={{ y: [0, 160, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      ) : isGenerating ? (
        <div className="relative h-40 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl animate-ping"></div>
          </div>
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-purple-500/30 rounded-full"></div>
              <div className="absolute inset-0 w-14 h-14 border-4 border-t-purple-500 border-r-pink-500 rounded-full animate-spin"></div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white text-sm font-black tracking-wider">🎨 AI ГЕНЕРАЦИЯ</span>
              <span className="text-purple-400 text-xs font-semibold">Создаю шедевр...</span>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="relative h-40 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden group/gen hover:from-purple-900 hover:via-pink-900 hover:to-orange-900 transition-all duration-500 cursor-pointer"
          onClick={generateImage}
        >
          {/* Анимированный фон */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <motion.div 
            className="flex flex-col items-center gap-3 z-10"
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Icon size={64} className="text-white/40 group-hover/gen:text-white/80 transition-colors" />
            <div className="flex flex-col items-center">
              <span className="text-white/80 text-sm font-black tracking-wider group-hover/gen:text-white transition-colors">🎨 ГЕНЕРАЦИЯ AI</span>
              <span className="text-white/50 text-xs font-semibold">Нажми для создания</span>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Светящийся эффект при hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-300" 
           style={{ 
             background: `radial-gradient(circle at 50% 50%, ${config.borderClass.includes('gray') ? 'rgba(156,163,175,0.3)' : config.borderClass.includes('blue') ? 'rgba(59,130,246,0.3)' : config.borderClass.includes('purple') ? 'rgba(168,85,247,0.3)' : 'rgba(251,191,36,0.3)'}, transparent 70%)`,
             filter: 'blur(30px)'
           }}>
      </div>

      {/* Контент */}
      <div className="relative px-6 pb-5 pt-4">
        {/* Иконка с неоном */}
        <div className="absolute -top-8 left-6 z-20">
          <motion.div 
            className={`p-4 rounded-2xl backdrop-blur-xl border-2 ${config.borderClass} shadow-2xl`}
            style={{ 
              background: 'rgba(0,0,0,0.7)',
              boxShadow: `0 0 30px ${config.borderClass.includes('gray') ? 'rgba(156,163,175,0.5)' : config.borderClass.includes('blue') ? 'rgba(59,130,246,0.5)' : config.borderClass.includes('purple') ? 'rgba(168,85,247,0.5)' : 'rgba(251,191,36,0.5)'}`
            }}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Icon size={36} className={`${config.textClass} drop-shadow-[0_0_10px_currentColor]`} />
          </motion.div>
        </div>

        {/* Текст */}
        <div className="ml-20 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-black text-xl text-white truncate drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-tight">
              {achievement.name}
            </h4>
            {achievement.rarity === 'legendary' && (
              <motion.span 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
              >
                🔥
              </motion.span>
            )}
          </div>
          
          <p className="text-sm text-gray-300 leading-relaxed line-clamp-2 font-medium">
            {achievement.description || '💀 Безумное достижение для настоящих психов!'}
          </p>
          
          {/* Метаинфо */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <motion.span 
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${config.textClass} backdrop-blur-sm`}
              style={{ 
                background: 'rgba(0,0,0,0.4)',
                textShadow: '0 0 10px currentColor',
                border: `1px solid ${config.borderClass.includes('gray') ? '#9ca3af' : config.borderClass.includes('blue') ? '#3b82f6' : config.borderClass.includes('purple') ? '#a855f7' : '#fbbf24'}`
              }}
              whileHover={{ scale: 1.1 }}
            >
              {achievement.rarity}
            </motion.span>
            <span className="text-xs text-gray-500 font-semibold">
              {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString('ru-RU') : '🔒 Заблокировано'}
            </span>
          </div>
        </div>
      </div>

      {/* Анимированные частицы */}
      {achievement.rarity === 'legendary' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{ 
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -60],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const AchievementsSection = ({ userId }) => {
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch(`/api/user/${userId}/achievements`);
        const data = await response.json();
        
        if (data.success) {
          setAchievements(data);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!achievements || achievements.stats.total === 0) {
    return (
      <div className="text-center py-12">
        <FaTrophy size={48} className="mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400 text-lg">Достижения пока не получены</p>
        <p className="text-gray-500 text-sm mt-2">Играйте и выполняйте задания, чтобы получить достижения!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{achievements.stats.total}</div>
          <div className="text-sm text-gray-400">Всего</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{achievements.stats.byCategory.dota2}</div>
          <div className="text-sm text-gray-400">Dota 2</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-orange-400">{achievements.stats.byCategory.cs2}</div>
          <div className="text-sm text-gray-400">CS2</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{achievements.stats.byCategory.general}</div>
          <div className="text-sm text-gray-400">Общие</div>
        </div>
      </div>

      {/* Dota 2 Achievements */}
      {achievements.achievements?.dota2 && achievements.achievements.dota2.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-blue-400">Dota 2</span>
            <span className="text-sm text-gray-500">({achievements.achievements.dota2.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.achievements.dota2.map((ach) => (
              <AchievementBadge key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>
      )}

      {/* CS2 Achievements */}
      {achievements.achievements?.cs2 && achievements.achievements.cs2.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-orange-400">CS2</span>
            <span className="text-sm text-gray-500">({achievements.achievements.cs2.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.achievements.cs2.map((ach) => (
              <AchievementBadge key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>
      )}

      {/* General Achievements */}
      {achievements.achievements?.general && achievements.achievements.general.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-green-400">Общие</span>
            <span className="text-sm text-gray-500">({achievements.achievements.general.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.achievements.general.map((ach) => (
              <AchievementBadge key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { AchievementBadge, AchievementsSection };
export default AchievementsSection;

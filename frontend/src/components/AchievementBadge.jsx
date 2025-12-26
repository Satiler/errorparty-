import { motion } from 'framer-motion';

const AchievementBadge = ({ achievement, size = 'md', showDetails = true }) => {
  const rarityColors = {
    common: 'from-gray-600 to-gray-700 border-gray-500',
    rare: 'from-blue-600 to-blue-700 border-blue-500',
    epic: 'from-purple-600 to-purple-700 border-purple-500',
    legendary: 'from-orange-600 to-orange-700 border-orange-500',
    mythic: 'from-pink-600 to-red-700 border-pink-500'
  };

  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  };

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`bg-gradient-to-br ${rarityColors[achievement.rarity]} rounded-lg border-2 ${sizeClasses[size]} cursor-pointer hover:shadow-lg transition-shadow`}
      title={showDetails ? undefined : `${achievement.title}\n${achievement.description}`}
    >
      <div className="text-center">
        <div className={iconSizes[size]} style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}>
          {achievement.icon}
        </div>
        {showDetails && (
          <>
            <div className="text-white font-bold mt-2">{achievement.title}</div>
            <div className="text-gray-200 text-xs mt-1">{achievement.description}</div>
            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                achievement.rarity === 'mythic' ? 'bg-pink-500/50' :
                achievement.rarity === 'legendary' ? 'bg-orange-500/50' :
                achievement.rarity === 'epic' ? 'bg-purple-500/50' :
                achievement.rarity === 'rare' ? 'bg-blue-500/50' :
                'bg-gray-500/50'
              }`}>
                {achievement.rarity.toUpperCase()}
              </span>
            </div>
            {achievement.earnedAt && (
              <div className="text-gray-300 text-xs mt-2">
                Получено: {new Date(achievement.earnedAt).toLocaleDateString('ru-RU')}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AchievementBadge;

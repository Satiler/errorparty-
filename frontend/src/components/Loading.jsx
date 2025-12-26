import { motion } from 'framer-motion';

// Простой спиннер
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  return (
    <div className={`${sizes[size]} border-neon-cyan border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

// Spinner с текстом
export function LoadingSpinner({ text = 'Загрузка...', size = 'md' }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <Spinner size={size} />
      <p className="text-gray-600 dark:text-gray-400 font-medium">{text}</p>
    </div>
  );
}

// Skeleton для карточек
export function SkeletonCard() {
  return (
    <div className="bg-gray-200 dark:bg-dark-light rounded-lg p-6 border border-gray-300 dark:border-gray-800 animate-pulse">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
    </div>
  );
}

// Skeleton для мемов - современный стиль с темами игр
export function SkeletonMeme() {
  // Случайная тема для разнообразия скелетонов
  const themes = [
    'from-red-900/10 to-orange-900/10 border-red-800', // Dota 2
    'from-blue-900/10 to-cyan-900/10 border-blue-800',  // CS2
    'from-purple-900/10 to-pink-900/10 border-purple-800' // Generic
  ];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="animate-pulse"
    >
      <div className={`bg-gradient-to-br ${randomTheme} backdrop-blur-sm rounded-xl overflow-hidden border-2 shadow-lg`}>
        {/* Image skeleton */}
        <div className="aspect-square bg-gray-800/50 relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          {/* Top badges */}
          <div className="absolute top-2 left-2 right-2 flex justify-between">
            <div className="h-7 w-20 bg-gray-700/50 rounded-lg" />
            <div className="h-7 w-7 bg-gray-700/50 rounded-lg" />
          </div>
          
          {/* Bottom stats */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between">
            <div className="h-7 w-24 bg-black/40 rounded-full" />
            <div className="h-7 w-28 bg-black/40 rounded-full" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="p-4 bg-black/30 space-y-3">
          {/* Title */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-700/50 rounded w-4/5" />
            <div className="h-3 bg-gray-700/50 rounded w-3/5" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-700/50 rounded-full" />
              <div className="space-y-1">
                <div className="h-2.5 bg-gray-700/50 rounded w-16" />
                <div className="h-2 bg-gray-700/50 rounded w-12" />
              </div>
            </div>
            <div className="h-4 w-12 bg-gray-700/50 rounded" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton для списка пользователей
export function SkeletonUser() {
  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-200 dark:bg-dark-light rounded-lg border border-gray-300 dark:border-gray-800 animate-pulse">
      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24" />
      </div>
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-16" />
    </div>
  );
}

// Полноэкранный загрузчик
export function FullScreenLoader({ text = 'Загрузка...' }) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="text-xl text-gray-700 dark:text-gray-300 font-medium mt-6">{text}</p>
      </div>
    </div>
  );
}

// Overlay загрузчик для компонентов
export function LoadingOverlay({ text = 'Загрузка...' }) {
  return (
    <div className="absolute inset-0 bg-white/60 dark:bg-dark/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-gray-700 dark:text-gray-300 font-medium mt-4">{text}</p>
      </div>
    </div>
  );
}

export default Spinner;

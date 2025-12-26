import { FaPlay } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';

/**
 * Карточка быстрого доступа к плейлисту
 */
export default function QuickAccessCard({ playlist, onPlay }) {
  const navigate = useNavigate();
  const { playMyWave } = useMusicPlayer();

  const handleClick = () => {
    // Если это "Моя волна", запускаем режим волны
    if (playlist.isSpecial && playlist.slug === 'my-wave') {
      playMyWave();
    } else if (playlist.isSpecial && playlist.url) {
      // Другие специальные карточки переходят на свои страницы
      navigate(playlist.url);
    } else {
      onPlay();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className="relative rounded-lg overflow-hidden cursor-pointer group"
    >
      {/* Background with gradient */}
      <div className="relative h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg overflow-hidden">
        {/* Special styling for "Моя волна" */}
        {playlist.isSpecial && playlist.slug === 'my-wave' ? (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-800 to-indigo-900 flex items-center justify-center">
            <span className="text-5xl opacity-20">{playlist.icon}</span>
          </div>
        ) : playlist.image ? (
          <img
            src={playlist.image}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

        {/* Play button */}
        {!playlist.isSpecial && (
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute bottom-2 right-2 bg-green-500 hover:bg-green-400 text-black p-2 rounded-full shadow-lg transition-all"
          >
            <FaPlay size={12} />
          </motion.button>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 text-sm font-semibold text-white truncate">
        {playlist.icon && `${playlist.icon} `}{playlist.name}
      </h3>
      <p className="text-xs text-gray-400 truncate">
        {playlist.trackCount} {playlist.isSpecial ? '' : 'треков'}
      </p>
    </motion.div>
  );
}

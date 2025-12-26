import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaMusic } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';

/**
 * Карточка плейлиста в стиле Spotify
 */
export default function PlaylistCard({ playlist, index = 0 }) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack } = useMusicPlayer();
  
  const isCurrentPlaylist = currentTrack?.playlistId === playlist.id;
  const showPlayButton = isCurrentPlaylist && isPlaying;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleCardClick = () => {
    navigate(`/music/playlist/${playlist.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleCardClick}
      className="group relative bg-gray-900/40 hover:bg-gray-800/60 rounded-lg p-3 cursor-pointer transition-all duration-300 backdrop-blur-sm"
    >
      {/* Обложка */}
      <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaMusic className="w-10 h-10 text-white/30" />
          </div>
        )}
        
        {/* Кнопка воспроизведения */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-1.5 right-1.5 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={handlePlayClick}
        >
          {showPlayButton ? (
            <FaPause className="w-4 h-4 text-black" />
          ) : (
            <FaPlay className="w-4 h-4 text-black ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Информация */}
      <div className="space-y-0.5">
        <h3 className="text-white font-semibold text-sm truncate group-hover:text-green-400 transition-colors">
          {playlist.name}
        </h3>
        <p className="text-gray-400 text-xs truncate">
          {playlist.description || `${playlist.trackCount || 0} треков`}
        </p>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaHeart, FaRegHeart, FaClock, FaMusic } from 'react-icons/fa';
import { useMusicPlayer } from '../../contexts/MusicPlayerContext';
import { useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../utils/apiConfig';

const API_URL = getApiUrl();

/**
 * Строка трека в стиле Spotify
 */
export default function TrackRow({ track, index, showCover = true, showAlbum = true, queue = [] }) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();
  const [isFavorite, setIsFavorite] = useState(track.isFavorite || false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isCurrentTrack = currentTrack?.id === track.id;
  const token = localStorage.getItem('token');

  const handlePlayClick = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track, queue);
    }
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    if (!token) return;

    try {
      if (isFavorite) {
        await axios.delete(`${API_URL}/music/tracks/${track.id}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
      } else {
        await axios.post(`${API_URL}/music/tracks/${track.id}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group grid grid-cols-[40px_1fr_1fr_auto_auto] md:grid-cols-[40px_6fr_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 py-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer items-center ${
        isCurrentTrack ? 'bg-white/10' : ''
      }`}
      onClick={handlePlayClick}
    >
      {/* Номер / Кнопка воспроизведения */}
      <div className="flex items-center justify-center">
        {isHovered || isCurrentTrack ? (
          <button className="text-white hover:scale-110 transition-transform">
            {isCurrentTrack && isPlaying ? (
              <FaPause className="w-4 h-4" />
            ) : (
              <FaPlay className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className={`text-sm ${isCurrentTrack ? 'text-green-400' : 'text-gray-400'}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Информация о треке */}
      <div className="flex items-center gap-3 min-w-0">
        {showCover && (
          <div className="w-10 h-10 rounded bg-gray-800 flex-shrink-0 overflow-hidden">
            {track.coverUrl ? (
              <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FaMusic className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        )}
        <div className="min-w-0">
          <p className={`font-medium truncate ${isCurrentTrack ? 'text-green-400' : 'text-white'}`}>
            {track.title}
          </p>
          <p className="text-sm text-gray-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Альбом */}
      {showAlbum && (
        <div className="hidden md:block text-sm text-gray-400 truncate">
          {track.albumTitle || '—'}
        </div>
      )}

      {/* Избранное */}
      <div className="flex items-center justify-center">
        {token ? (
          <button
            onClick={handleToggleFavorite}
            className={`transition-colors ${
              isFavorite 
                ? 'text-green-500 hover:text-green-400 opacity-100' 
                : 'text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            {isFavorite ? (
              <FaHeart className="w-4 h-4" />
            ) : (
              <FaRegHeart className="w-4 h-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* Длительность */}
      <div className="flex items-center justify-end text-sm text-gray-400">
        <FaClock className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100" />
        {formatDuration(track.duration)}
      </div>
    </motion.div>
  );
}

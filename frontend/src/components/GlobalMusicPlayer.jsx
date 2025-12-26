import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaVolumeUp,
  FaVolumeMute,
  FaRedo,
  FaChevronUp,
  FaChevronDown,
  FaList,
  FaTimes
} from 'react-icons/fa';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import axios from 'axios';

import { getApiUrl } from '../utils/apiConfig';
import { getImageUrl } from '../utils/resourceHelper';

const API_URL = getApiUrl();

export default function GlobalMusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    currentIndex,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    playTrackAt,
    removeFromQueue
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentTrack && token) {
      checkFavoriteStatus();
    }
  }, [currentTrack?.id]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favoriteIds = response.data.tracks?.map(t => t.id) || [];
      setIsFavorite(favoriteIds.includes(currentTrack.id));
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Добавление в избранное
  const handleToggleFavorite = async () => {
    if (!token || !currentTrack) return;

    try {
      if (isFavorite) {
        await axios.delete(`${API_URL}/music/tracks/${currentTrack.id}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
      } else {
        await axios.post(`${API_URL}/music/tracks/${currentTrack.id}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Основной плеер */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-800 backdrop-blur-xl shadow-2xl">
          {/* Прогресс-бар */}
          <div
            className="relative h-1 bg-gray-800 cursor-pointer group"
            onClick={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - bounds.left) / bounds.width;
              seekTo(percent * duration);
            }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 relative"
              style={{ width: `${(progress / duration) * 100}%` }}
              initial={false}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </motion.div>
          </div>

          {/* Контролы */}
          <div className="px-6 py-3">
            <div className="flex items-center justify-between gap-6">
              {/* Левая часть - Информация о треке */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <motion.div
                  className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-xl cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {currentTrack.coverUrl ? (
                    <img
                      src={getImageUrl(currentTrack.coverUrl)}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center text-3xl">
                      🎵
                    </div>
                  )}
                </motion.div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white truncate text-lg">
                    {currentTrack.title}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {currentTrack.artist || 'Unknown Artist'}
                  </div>
                </div>

                <motion.button
                  onClick={handleToggleFavorite}
                  className={`flex-shrink-0 transition-colors ${
                    isFavorite ? 'text-green-500' : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isFavorite ? <FaHeart size={24} /> : <FaRegHeart size={24} />}
                </motion.button>
              </div>

              {/* Центр - Кнопки управления */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={toggleShuffle}
                    className={`transition-colors ${
                      shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaRandom size={18} />
                  </motion.button>

                  <motion.button
                    onClick={playPrevious}
                    className="text-gray-300 hover:text-white transition-colors"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaStepBackward size={20} />
                  </motion.button>

                  <motion.button
                    onClick={togglePlayPause}
                    className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-green-500/50 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
                  </motion.button>

                  <motion.button
                    onClick={playNext}
                    className="text-gray-300 hover:text-white transition-colors"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaStepForward size={20} />
                  </motion.button>

                  <motion.button
                    onClick={toggleRepeat}
                    className={`transition-colors ${
                      repeat ? 'text-green-500' : 'text-gray-400 hover:text-white'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaRedo size={18} />
                  </motion.button>
                </div>
                
                {/* Время */}
                <div className="text-xs text-gray-400">
                  {formatTime(progress)} / {formatTime(duration)}
                </div>
              </div>

              {/* Правая часть */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Кнопка очереди */}
                <motion.button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`transition-colors ${
                    showQueue ? 'text-green-500' : 'text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaList size={20} />
                </motion.button>

                {/* Громкость */}
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={toggleMute}
                    className="text-gray-400 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isMuted || volume === 0 ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                  </motion.button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 slider"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Модальное окно очереди */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setShowQueue(false)}
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-full md:w-[400px] bg-gray-900 shadow-2xl overflow-hidden"
            >
              {/* Заголовок */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h2 className="text-2xl font-bold text-white">Очередь</h2>
                <button
                  onClick={() => setShowQueue(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Список треков */}
              <div className="overflow-y-auto h-[calc(100%-80px)] p-4">
                {queue && queue.length > 0 ? (
                  <div className="space-y-2">
                    {queue.map((track, index) => (
                      <motion.div
                        key={`${track.id}-${index}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => playTrackAt(index)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          index === currentIndex
                            ? 'bg-green-500/20 border border-green-500/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {/* Номер или иконка играющего */}
                        <div className="w-8 text-center">
                          {index === currentIndex && isPlaying ? (
                            <div className="flex items-center justify-center">
                              <div className="w-1 h-3 bg-green-500 animate-pulse mx-0.5"></div>
                              <div className="w-1 h-4 bg-green-500 animate-pulse mx-0.5 animation-delay-150"></div>
                              <div className="w-1 h-3 bg-green-500 animate-pulse mx-0.5 animation-delay-300"></div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">{index + 1}</span>
                          )}
                        </div>

                        {/* Обложка */}
                        <div className="w-12 h-12 rounded bg-gray-800 flex-shrink-0 overflow-hidden">
                          {track.coverUrl ? (
                            <img src={getImageUrl(track.coverUrl)} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              🎵
                            </div>
                          )}
                        </div>

                        {/* Информация */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            index === currentIndex ? 'text-green-400' : 'text-white'
                          }`}>
                            {track.title}
                          </p>
                          <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                        </div>

                        {/* Длительность */}
                        <div className="text-sm text-gray-500">
                          {formatTime(track.duration)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Очередь пуста</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #22c55e;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #22c55e;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        @keyframes pulse {
          0%, 100% { height: 0.75rem; }
          50% { height: 1rem; }
        }

        .animation-delay-150 {
          animation-delay: 150ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </>
  );
}

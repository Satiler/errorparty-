import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaClock,
  FaArrowLeft
} from 'react-icons/fa';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function PlaylistDetailPageSpotify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPlaylist();
    if (token) {
      fetchFavorites();
    }
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/music/playlists/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const playlistData = response.data.playlist || response.data;
      setPlaylist(playlistData);
      setTracks(playlistData.tracks || []);
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favoriteIds = new Set(response.data.tracks.map(t => t.id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handlePlayTrack = async (track) => {
    const tracksList = tracks.map(t => t.track || t).filter(t => t && t.streamUrl);
    await playTrack(track, tracksList);
    
    if (token) {
      axios.post(`${API_URL}/music/tracks/${track.id}/listen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error('Error recording listen:', err));
    }
  };

  const toggleLike = async (trackId) => {
    if (!token) {
      alert('Войдите, чтобы добавить в избранное');
      return;
    }

    try {
      const isLiked = favorites.has(trackId);
      
      if (isLiked) {
        await axios.delete(`${API_URL}/music/tracks/${trackId}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
      } else {
        await axios.post(`${API_URL}/music/tracks/${trackId}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => new Set([...prev, trackId]));
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Подборка не найдена</p>
          <button
            onClick={() => navigate('/music')}
            className="text-white hover:text-green-500 transition"
          >
            Вернуться к музыке
          </button>
        </div>
      </div>
    );
  }

  const playlistColor = playlist.metadata?.color || '#8b5cf6';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-32">
      {/* Header with Gradient */}
      <div 
        className="relative pb-12 mb-8"
        style={{
          background: `linear-gradient(180deg, ${playlistColor}60 0%, ${playlistColor}20 50%, transparent 100%)`
        }}
      >
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/music')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-8 group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-semibold">Назад</span>
          </motion.button>

          {/* Playlist Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-8"
          >
            {/* Cover */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-72 h-72 flex-shrink-0 rounded-3xl shadow-2xl flex items-center justify-center text-9xl relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${playlistColor}, ${playlistColor}80)`,
                boxShadow: `0 30px 80px ${playlistColor}60`
              }}
            >
              <div className="relative z-10">
                {playlist.metadata?.icon || '🎵'}
              </div>
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            </motion.div>

            {/* Info */}
            <div className="flex-1 pb-8">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm font-bold mb-3 uppercase tracking-wider"
              >
                Подборка
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-8xl font-black mb-8 leading-none bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent"
              >
                {playlist.name}
              </motion.h1>
              {playlist.description && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-300 mb-6 text-xl leading-relaxed"
                >
                  {playlist.description}
                </motion.p>
              )}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 text-base"
              >
                <span className="font-bold hover:underline cursor-pointer">ErrorParty</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300">{tracks.length} треков</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-[1800px] mx-auto px-8 mb-8">
        <div className="flex items-center gap-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (tracks.length > 0) {
                const firstTrack = tracks[0].track || tracks[0];
                const tracksList = tracks.map(t => t.track || t).filter(t => t && t.streamUrl);
                playTrack(firstTrack, tracksList);
                
                if (token) {
                  axios.post(`${API_URL}/music/tracks/${firstTrack.id}/listen`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  }).catch(err => console.error('Error recording listen:', err));
                }
              }
            }}
            className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center hover:from-green-300 hover:to-green-500 transition-all shadow-2xl shadow-green-500/50 hover:shadow-green-500/80"
          >
            <FaPlay className="text-black text-3xl ml-1" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-400 hover:text-green-400 text-4xl transition-all"
          >
            <FaHeart />
          </motion.button>
        </div>
      </div>

      {/* Track List */}
      <div className="max-w-[1800px] mx-auto px-8">
        <div className="mb-4 px-6 text-sm text-gray-500 grid grid-cols-[40px_6fr_4fr_3fr_80px] gap-6 items-center pb-3 border-b border-gray-800/50">
          <div className="text-center">#</div>
          <div>НАЗВАНИЕ</div>
          <div>АЛЬБОМ</div>
          <div>ДОБАВЛЕНО</div>
          <div className="flex justify-end">
            <FaClock />
          </div>
        </div>

        {tracks.map((trackItem, index) => {
          const track = trackItem.track || trackItem;
          return (
          <motion.div
            key={`track-${track.id}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            onDoubleClick={() => handlePlayTrack(track)}
            className="group px-6 py-3 rounded-xl hover:bg-white/5 transition-all grid grid-cols-[40px_6fr_4fr_3fr_80px] gap-6 items-center cursor-pointer"
          >
            {/* Index / Play */}
            <div className="flex items-center justify-center">
              <span className="text-gray-400 group-hover:hidden text-base font-medium">
                {index + 1}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentTrack?.id === track.id) {
                    togglePlayPause();
                  } else {
                    handlePlayTrack(track);
                  }
                }}
                className="text-white hidden group-hover:block hover:scale-110 transition-transform"
              >
                {currentTrack?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
              </button>
            </div>

            {/* Title & Artist */}
            <div className="min-w-0 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center text-lg">
                  🎵
                </div>
              </div>
              <div className="min-w-0">
                <div className={`font-semibold truncate text-base transition-colors ${
                  currentTrack?.id === track.id ? 'text-green-400' : 'text-white group-hover:text-green-400'
                }`}>
                  {track.title}
                </div>
                <div className="text-sm text-gray-400 truncate hover:text-white hover:underline cursor-pointer">
                  {track.artist}
                </div>
              </div>
            </div>

            {/* Album */}
            <div className="text-sm text-gray-400 truncate hover:text-white hover:underline cursor-pointer">
              {track.Album?.title || track.albumTitle || 'Сингл'}
            </div>

            {/* Date */}
            <div className="text-sm text-gray-400">
              {new Date(trackItem.addedAt || track.createdAt).toLocaleDateString('ru-RU', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>

            {/* Duration & Like */}
            <div className="flex items-center justify-end gap-6">
              <motion.button
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(track.id);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-all ${
                  favorites.has(track.id) ? 'text-green-400 opacity-100' : 'text-gray-400 hover:text-white'
                }`}
              >
                {favorites.has(track.id) ? <FaHeart /> : <FaRegHeart />}
              </motion.button>
              <span className="text-sm text-gray-400 w-12 text-right">
                {formatTime(track.duration)}
              </span>
            </div>
          </motion.div>
        )})}


        {tracks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            В этой подборке пока нет треков
          </div>
        )}
      </div>
    </div>
  );
}

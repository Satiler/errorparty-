import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, TrendingUp, Zap, Music, Brain, Loader2 } from 'lucide-react';
import axios from 'axios';

/**
 * 🤖 Smart Music Recommendations Page
 * Умная система подбора музыки с AI
 */
export default function SmartRecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [similarTracks, setSimilarTracks] = useState([]);
  const [moodPlaylists, setMoodPlaylists] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [selectedMood, setSelectedMood] = useState('Энергичная');

  const moods = [
    { name: 'Энергичная', icon: '⚡', color: 'from-orange-500 to-red-500' },
    { name: 'Спокойная', icon: '🌊', color: 'from-blue-500 to-cyan-500' },
    { name: 'Счастливая', icon: '😊', color: 'from-yellow-500 to-orange-400' },
    { name: 'Грустная', icon: '💔', color: 'from-purple-500 to-indigo-600' },
    { name: 'Мотивирующая', icon: '🔥', color: 'from-red-500 to-pink-600' }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedMood) {
      loadMoodRecommendations(selectedMood);
    }
  }, [selectedMood]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Загружаем персональные рекомендации
      const recsResponse = await axios.get('/api/music/ai/recommendations?limit=30', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecommendations(recsResponse.data.recommendations || []);

      // Загружаем статистику пользователя
      const statsResponse = await axios.get('/api/music/ai/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUserStats(statsResponse.data.stats);

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoodRecommendations = async (mood) => {
    try {
      const response = await axios.get(`/api/music/ai/mood/${mood}?limit=20`);
      setMoodPlaylists(response.data.recommendations || []);
    } catch (error) {
      console.error('Ошибка загрузки по настроению:', error);
    }
  };

  const loadSimilarTracks = async (trackId) => {
    try {
      const response = await axios.get(`/api/music/ai/similar/${trackId}?limit=10`);
      setSimilarTracks(response.data.similar || []);
    } catch (error) {
      console.error('Ошибка загрузки похожих:', error);
    }
  };

  const playTrack = (track) => {
    setCurrentTrack(track);
    loadSimilarTracks(track.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header */}
      <div className="h-96 bg-gradient-to-b from-purple-900/50 via-indigo-900/30 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-blue-600/20 to-purple-600/20 animate-gradient-x" />
        
        <div className="relative z-10 container mx-auto px-6 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="w-16 h-16 text-purple-400" />
              <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />
            </div>
            
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Умные рекомендации
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              AI подбирает музыку специально для вас на основе ваших предпочтений
            </p>

            {/* User Stats */}
            {userStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-8 mt-8"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{userStats.totalLikes}</div>
                  <div className="text-sm text-gray-400">Любимых треков</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{userStats.totalListens}</div>
                  <div className="text-sm text-gray-400">Прослушиваний</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {userStats.favoriteGenres?.[0]?.genre || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-400">Любимый жанр</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 -mt-12 relative z-20">
        
        {/* Mood Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold">Выбери настроение</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMood(mood.name)}
                className={`
                  relative p-6 rounded-2xl overflow-hidden
                  backdrop-blur-sm border-2 transition-all
                  ${selectedMood === mood.name 
                    ? 'border-white shadow-lg shadow-white/20' 
                    : 'border-white/10 hover:border-white/30'
                  }
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-20`} />
                
                <div className="relative z-10 text-center">
                  <div className="text-5xl mb-3">{mood.icon}</div>
                  <div className="font-bold text-lg">{mood.name}</div>
                </div>

                {selectedMood === mood.name && (
                  <motion.div
                    layoutId="mood-indicator"
                    className="absolute inset-0 border-4 border-white rounded-2xl"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* For You (Персональные рекомендации) */}
        {recommendations.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-7 h-7 text-green-400" />
              <h2 className="text-3xl font-black">Для тебя</h2>
              <div className="ml-auto text-sm text-gray-400">
                На основе твоих предпочтений
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recommendations.slice(0, 18).map((track, index) => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  index={index}
                  onPlay={playTrack}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* By Mood */}
        {moodPlaylists.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-7 h-7 text-yellow-400" />
              <h2 className="text-3xl font-black">{selectedMood} музыка</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {moodPlaylists.map((track, index) => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  index={index}
                  onPlay={playTrack}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Similar Tracks (если выбран трек) */}
        {similarTracks.length > 0 && currentTrack && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-7 h-7 text-blue-400" />
              <h2 className="text-3xl font-black">Похожие на "{currentTrack.title}"</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {similarTracks.map((track, index) => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  index={index}
                  onPlay={playTrack}
                  showSimilarityScore={true}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-16"
        >
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Чем больше слушаешь, тем умнее рекомендации</h3>
          <p className="text-gray-400">
            AI анализирует твои предпочтения и подбирает идеальную музыку
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * 🎵 Track Card Component
 */
function TrackCard({ track, index, onPlay, showSimilarityScore = false }) {
  const [liked, setLiked] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      if (liked) {
        await axios.delete(`/api/music/tracks/${track.id}/like`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`/api/music/tracks/${track.id}/like`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setLiked(!liked);
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  // Определяем цвет по confidence или similarityScore
  const getScoreColor = () => {
    const score = track.recommendationScore || track.similarityScore || 0;
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-white/5 backdrop-blur-sm p-4 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
      onClick={() => onPlay(track)}
    >
      {/* Cover */}
      <div className="aspect-square bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl mb-4 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Music className="w-16 h-16 text-white/40" />
        </div>
        
        {/* Play Button Overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
            <div className="w-0 h-0 border-l-[16px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
          </div>
        </motion.div>

        {/* Confidence Badge */}
        {track.confidence && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-bold">
            {track.confidence === 'high' && '🔥'}
            {track.confidence === 'medium' && '👍'}
            {track.confidence === 'low' && '💫'}
          </div>
        )}

        {/* Similarity Score */}
        {showSimilarityScore && track.similarityScore && (
          <div className={`absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-bold ${getScoreColor()}`}>
            {Math.round(track.similarityScore * 100)}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mb-2">
        <h3 className="font-bold text-sm line-clamp-1 mb-1">{track.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-1">{track.artist}</p>
      </div>

      {/* Like Button */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Heart 
          className={`w-6 h-6 ${liked ? 'fill-green-500 text-green-500' : 'text-white'}`}
        />
      </motion.button>
    </motion.div>
  );
}

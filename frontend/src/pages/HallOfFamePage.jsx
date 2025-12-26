import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaMicrophone, FaImage, FaGamepad, FaFire, FaCrown, FaMedal, FaStar } from 'react-icons/fa';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MemeRating from '../components/MemeRating';
import { LoadingSpinner, SkeletonCard, SkeletonMeme } from '../components/Loading';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';

export default function HallOfFamePage() {
  const [topUsers, setTopUsers] = useState([]);
  const [weeklyTopUsers, setWeeklyTopUsers] = useState([]);
  const [topMemes, setTopMemes] = useState([]);
  const [gamingStats, setGamingStats] = useState(null);
  const [championHistory, setChampionHistory] = useState([]);
  const [userAchievements, setUserAchievements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, voice, memes, games
  const [historyCategory, setHistoryCategory] = useState('voice');
  const toast = useToast();

  useEffect(() => {
    fetchLeaderboards();
    fetchChampionHistory(historyCategory);
  }, []);

  useEffect(() => {
    fetchChampionHistory(historyCategory);
  }, [historyCategory]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      
      // Получаем топ пользователей за всё время
      const usersResponse = await axios.get('/api/users/top?limit=10');
      if (usersResponse.data.success && Array.isArray(usersResponse.data.users)) {
        setTopUsers(usersResponse.data.users);
      }

      // Получаем топ пользователей за неделю
      const weeklyUsersResponse = await axios.get('/api/users/top?limit=10&period=week');
      if (weeklyUsersResponse.data.success && Array.isArray(weeklyUsersResponse.data.users)) {
        setWeeklyTopUsers(weeklyUsersResponse.data.users);
      }

      // Получаем топ мемов
      const memesResponse = await axios.get('/api/memes/top?limit=5');
      if (memesResponse.data.success && Array.isArray(memesResponse.data.memes)) {
        setTopMemes(memesResponse.data.memes);
      }

      // Получаем игровые достижения
      const gamingResponse = await axios.get('/api/halloffame/gaming');
      if (gamingResponse.data.success) {
        setGamingStats(gamingResponse.data.gaming);
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      toast.error('Не удалось загрузить доску почёта');
    } finally {
      setLoading(false);
    }
  };

  const fetchChampionHistory = async (category) => {
    try {
      const response = await axios.get(`/api/halloffame/champions-history?limit=10&category=${category}`);
      if (response.data.success && Array.isArray(response.data.champions)) {
        setChampionHistory(response.data.champions);
      }
    } catch (error) {
      console.error('Error fetching champion history:', error);
    }
  };

  const fetchUserAchievements = async (userId) => {
    try {
      const response = await axios.get(`/api/halloffame/achievements?userId=${userId}`);
      if (response.data.success) {
        setUserAchievements(response.data);
      } else {
        toast.error('Не удалось загрузить достижения');
        setUserAchievements(null);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Ошибка при загрузке достижений');
      setUserAchievements(null);
    }
  };

  const getMedalColor = (index) => {
    if (index === 0) return 'from-yellow-400 to-yellow-600';
    if (index === 1) return 'from-gray-300 to-gray-500';
    if (index === 2) return 'from-orange-400 to-orange-600';
    return 'from-gray-600 to-gray-800';
  };

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      case 'common': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-6 sm:py-8 lg:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
            <FaTrophy className="inline mr-2 sm:mr-4 text-yellow-400 text-2xl sm:text-4xl lg:text-5xl" />
            Доска почёта
          </h1>
          <p className="text-gray-400 text-base sm:text-lg lg:text-xl">Лучшие из лучших нашего сообщества</p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 flex-wrap"
        >
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <FaCrown className="inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Все категории</span>
            <span className="sm:hidden">Все</span>
          </button>
          <button
            onClick={() => setSelectedCategory('voice')}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              selectedCategory === 'voice'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <FaMicrophone className="inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Голосовая активность</span>
            <span className="sm:hidden">Голос</span>
          </button>
          <button
            onClick={() => setSelectedCategory('memes')}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              selectedCategory === 'memes'
                ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <FaImage className="inline mr-2" />
            Мастера мемов
          </button>
          <button
            onClick={() => setSelectedCategory('games')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedCategory === 'games'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <FaGamepad className="inline mr-2" />
            Игровые достижения
          </button>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
            <p className="text-gray-400 mt-4">Загрузка рейтингов...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Top 3 Podium */}
            {(selectedCategory === 'all' || selectedCategory === 'voice') && weeklyTopUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-16"
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
                  <FaMicrophone className="text-cyan-400" />
                  Короли микрофона недели
                </h2>
                
                <div className="flex items-end justify-center gap-8 mb-8">
                  {/* 2nd Place */}
                  {weeklyTopUsers[1] && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-4 border-gray-400 flex items-center justify-center mb-4 shadow-2xl">
                        <div className="text-5xl">🥈</div>
                      </div>
                      <div className="bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg p-6 w-48 text-center h-40 flex flex-col justify-center">
                        <div className="text-2xl font-bold text-gray-900 mb-2">{weeklyTopUsers[1].username}</div>
                        <div className="text-gray-700 text-sm mb-2">Уровень {weeklyTopUsers[1].level || 1}</div>
                        <div className="text-gray-800 font-semibold">{weeklyTopUsers[1].onlineTime || '0'} ч</div>
                      </div>
                    </motion.div>
                  )}

                  {/* 1st Place */}
                  {weeklyTopUsers[0] && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <FaCrown className="text-6xl text-yellow-400 mb-2 animate-bounce" />
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-300 flex items-center justify-center mb-4 shadow-2xl">
                        <div className="text-6xl">🥇</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-8 w-56 text-center h-48 flex flex-col justify-center shadow-2xl">
                        <div className="text-3xl font-bold text-gray-900 mb-2">{weeklyTopUsers[0].username}</div>
                        <div className="text-gray-800 text-sm mb-2">Уровень {weeklyTopUsers[0].level || 1}</div>
                        <div className="text-gray-900 font-bold text-xl">{weeklyTopUsers[0].onlineTime || '0'} часов</div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3rd Place */}
                  {weeklyTopUsers[2] && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-4 border-orange-300 flex items-center justify-center mb-4 shadow-2xl">
                        <div className="text-5xl">🥉</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-6 w-48 text-center h-40 flex flex-col justify-center">
                        <div className="text-2xl font-bold text-gray-900 mb-2">{weeklyTopUsers[2].username}</div>
                        <div className="text-gray-700 text-sm mb-2">Уровень {weeklyTopUsers[2].level || 1}</div>
                        <div className="text-gray-800 font-semibold">{weeklyTopUsers[2].onlineTime || '0'} ч</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Top Users List */}
            {(selectedCategory === 'all' || selectedCategory === 'voice') && topUsers.length > 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-purple-500/30"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaMedal className="text-purple-400" />
                  Топ участников
                </h3>
                <div className="space-y-4">
                  {topUsers.slice(3).map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getMedalColor(index + 3)} flex items-center justify-center text-white font-bold text-xl`}>
                          #{index + 4}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{user.username}</div>
                          <div className="text-gray-400 text-sm">Уровень {user.level || 1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-400 font-bold text-xl">{user.onlineTime || '0'} ч</div>
                        <div className="text-gray-500 text-sm">онлайн</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Top Memes */}
            {(selectedCategory === 'all' || selectedCategory === 'memes') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-pink-500/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FaImage className="text-pink-400" />
                    Мастера мемов
                  </h3>
                  <Link
                    to="/memes"
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 rounded-lg transition-colors text-white font-semibold"
                  >
                    Все мемы →
                  </Link>
                </div>
                
                {topMemes.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Пока нет мемов 😢</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topMemes.map((meme, index) => (
                      <motion.div
                        key={meme.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative bg-gray-700/50 rounded-lg overflow-hidden group cursor-pointer hover:scale-105 transition-transform"
                      >
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-gradient-to-r from-pink-600 to-red-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                            {getMedalEmoji(index)}
                          </div>
                        </div>
                        <img
                          src={meme.imageUrl}
                          alt={meme.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h4 className="text-white font-semibold mb-2">{meme.title}</h4>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-400 text-sm">{meme.author?.username}</span>
                          </div>
                          <MemeRating 
                            memeId={meme.id} 
                            initialLikes={meme.likes} 
                            initialDislikes={meme.dislikes}
                            className="justify-center"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Gaming Achievements */}
            {(selectedCategory === 'all' || selectedCategory === 'games') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-green-500/30"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaGamepad className="text-green-400" />
                  Игровые легенды
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-lg p-6 text-white">
                    <div className="text-4xl mb-4">🎯</div>
                    <div className="text-xl font-bold mb-2">Dota 2 Pro</div>
                    <div className="text-white/80 text-sm mb-4">
                      {gamingStats?.dota2 ? 'Король Dota 2' : 'Пока нет данных'}
                    </div>
                    {gamingStats?.dota2 ? (
                      <>
                        <div className="text-2xl font-bold mb-1">{gamingStats.dota2.username}</div>
                        <div className="text-sm text-white/80">
                          Среднее убийств: {gamingStats.dota2.avgKills}
                        </div>
                        <div className="text-sm text-white/80">
                          Игр сыграно: {gamingStats.dota2.gamesPlayed}
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold">—</div>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
                    <div className="text-4xl mb-4">🔫</div>
                    <div className="text-xl font-bold mb-2">CS2 Sniper</div>
                    <div className="text-white/80 text-sm mb-4">
                      {gamingStats?.cs2 ? 'Мастер CS2' : 'Пока нет данных'}
                    </div>
                    {gamingStats?.cs2 ? (
                      <>
                        <div className="text-2xl font-bold mb-1">{gamingStats.cs2.username}</div>
                        <div className="text-sm text-white/80">
                          Среднее убийств: {gamingStats.cs2.avgKills}
                        </div>
                        <div className="text-sm text-white/80">
                          Игр сыграно: {gamingStats.cs2.gamesPlayed}
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold">—</div>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-6 text-white">
                    <div className="text-4xl mb-4">🏆</div>
                    <div className="text-xl font-bold mb-2">Multi-Game King</div>
                    <div className="text-white/80 text-sm mb-4">
                      {gamingStats?.multiGame ? 'Универсал' : 'Пока нет данных'}
                    </div>
                    {gamingStats?.multiGame ? (
                      <>
                        <div className="text-2xl font-bold mb-1">{gamingStats.multiGame.username}</div>
                        <div className="text-sm text-white/80">
                          Всего игр: {gamingStats.multiGame.totalGames}
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold">—</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Champion History */}
            {(selectedCategory === 'all' || selectedCategory === 'voice') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-yellow-500/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FaStar className="text-yellow-400" />
                    История чемпионов
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryCategory('voice')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        historyCategory === 'voice'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Голос
                    </button>
                    <button
                      onClick={() => setHistoryCategory('memes')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        historyCategory === 'memes'
                          ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Мемы
                    </button>
                    <button
                      onClick={() => setHistoryCategory('gaming')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        historyCategory === 'gaming'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Игры
                    </button>
                  </div>
                </div>

                {championHistory.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">История пока пуста</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {championHistory.map((champion, index) => (
                      <motion.div
                        key={`${champion.year}-${champion.weekNumber}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4 border border-yellow-500/20 hover:border-yellow-500/50 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl">
                            👑
                          </div>
                          <div>
                            <div className="text-white font-bold">{champion.user.username}</div>
                            <div className="text-gray-400 text-xs">{champion.weekLabel}</div>
                          </div>
                        </div>
                        <div className="text-yellow-400 font-semibold text-lg">
                          {champion.metadata?.formatted || `${champion.score} очков`}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Achievements Showcase */}
            {weeklyTopUsers.length > 0 && weeklyTopUsers[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-purple-500/30"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaTrophy className="text-purple-400" />
                  Достижения чемпиона
                  <button
                    onClick={() => fetchUserAchievements(weeklyTopUsers[0].id)}
                    className="ml-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Показать достижения
                  </button>
                </h3>

                {userAchievements && userAchievements.user ? (
                  <div>
                    <div className="mb-6 text-center">
                      <div className="text-white text-lg mb-2">
                        <span className="font-bold text-2xl text-purple-400">{userAchievements.user.username}</span>
                        {' '}собрал{' '}
                        <span className="font-bold text-2xl text-yellow-400">{userAchievements.totalAchievements || 0}</span>
                        {' '}достижений
                      </div>
                      <div className="text-gray-400">Уровень {userAchievements.user.level || 1}</div>
                    </div>

                    {!userAchievements.achievements || userAchievements.achievements.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Пока нет достижений</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userAchievements.achievements.map((achievement, index) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-gradient-to-br ${getRarityColor(achievement.rarity)} rounded-lg p-4 text-center hover:scale-105 transition-transform cursor-pointer`}
                            title={achievement.description}
                          >
                            <div className="text-4xl mb-2">{achievement.icon}</div>
                            <div className="text-white font-bold text-sm mb-1">{achievement.name}</div>
                            <div className="text-white/80 text-xs">{achievement.description}</div>
                            <div className="mt-2 text-white/60 text-xs uppercase font-semibold">
                              {achievement.rarity}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    Нажмите кнопку выше, чтобы посмотреть достижения {weeklyTopUsers[0].username}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )}

        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSteam, FaSignOutAlt, FaTrophy, FaClock, FaGamepad, FaUsers, FaImage, FaLink, FaUnlink, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import { LoadingSpinner, SkeletonCard } from '../components/Loading';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';
import EditProfileModal from '../components/EditProfileModal';
import AchievementsSection from '../components/AchievementsSection';
import ActivityGraph from '../components/ActivityGraph';
import { apiFetch } from '../utils/apiConfig';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [memes, setMemes] = useState([]);
  const [tsLinked, setTsLinked] = useState(false);
  const [linkToken, setLinkToken] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, memes, games, achievements, settings
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        // Fetch user profile
        const profileRes = await apiFetch('/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            localStorage.removeItem('token');
            navigate('/');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileRes.json();
        setUser(profileData.user);
        setTsLinked(!!profileData.user.tsDbid);

        // Fetch user's memes
        const memesRes = await axios.get('/api/memes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (memesRes.data.success) {
          // Filter memes by current user
          const userMemes = memesRes.data.memes.filter(m => m.userId === profileData.user.id);
          setMemes(userMemes);
        }

        // Fetch Steam games if user has Steam ID
        if (profileData.user.steamId) {
          const gamesRes = await fetch(`/api/steam/games/${profileData.user.steamId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (gamesRes.ok) {
            const gamesData = await gamesRes.json();
            setGames(gamesData.games || []);
          }

          // Fetch stats
          if (profileData.user.stats) {
            setStats(profileData.user.stats);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const generateLinkToken = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/user/generate-link-token', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setLinkToken(response.data.token);
        toast.success('Токен создан! Отправьте команду в TeamSpeak');
      }
    } catch (err) {
      console.error('Error generating link token:', err);
      console.error('Response data:', err.response?.data);
      
      if (err.response?.status === 400 && err.response?.data?.error) {
        const errorMsg = err.response.data.error;
        toast.error(errorMsg);
        alert(errorMsg); // Явное уведомление
      } else {
        toast.error('Ошибка создания токена привязки');
        alert('Ошибка создания токена привязки');
      }
    }
  };

  const unlinkTeamSpeak = async () => {
    if (!confirm('Отвязать аккаунт TeamSpeak?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/user/unlink-teamspeak', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setTsLinked(false);
        setUser({ ...user, teamspeakUid: null, tsNickname: null });
        toast.success('TeamSpeak аккаунт отвязан');
        // Перезагружаем профиль
        const profileResponse = await axios.get('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileResponse.data.success) {
          setUser(profileResponse.data.user);
        }
      }
    } catch (err) {
      console.error('Error unlinking TeamSpeak:', err);
      toast.error('Ошибка отвязки TeamSpeak');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 ч';
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days} дн ${hours % 24} ч`;
    }
    return `${hours} ч`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <LoadingSpinner text="Загрузка профиля..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-red-400 text-center">
          <p className="text-xl mb-2">Ошибка загрузки</p>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-6 sm:py-8 lg:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 border border-cyan-500/30"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-cyan-500"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  <FaSteam className="text-3xl sm:text-4xl text-white" />
                </div>
              )}
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{user.username}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-gray-600 dark:text-gray-400 text-sm">
                  {user.steamId && (
                    <div className="flex items-center gap-2">
                      <FaSteam className="text-cyan-400" />
                      <span className="text-xs sm:text-sm hidden sm:inline">{user.steamId}</span>
                      <span className="text-xs sm:text-sm sm:hidden">Steam ID</span>
                    </div>
                  )}
                  {user.tsNickname && (
                    <div className="flex items-center gap-2">
                      <FaUsers className="text-green-400" />
                      <span className="text-xs sm:text-sm">{user.tsNickname}</span>
                    </div>
                  )}
                  <span className="px-2 sm:px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs sm:text-sm">
                    {user.role === 'admin' ? 'Администратор' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              <FaSignOutAlt />
              Выйти
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Обзор', icon: <FaTrophy /> },
            { id: 'memes', label: `Мемы (${memes.length})`, icon: <FaImage /> },
            { id: 'games', label: `Игры (${games.length})`, icon: <FaGamepad /> },
            { id: 'achievements', label: 'Достижения', icon: <FaTrophy /> },
            { id: 'settings', label: 'Настройки', icon: <FaEdit /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="hidden sm:inline">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Stats Grid */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <FaTrophy className="text-4xl text-yellow-400" />
                      <div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Уровень</div>
                        <div className="text-3xl font-bold text-white">{stats.level || 1}</div>
                      </div>
                    </div>
                    <div className="mt-4 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${((stats.experience || 0) % 1000) / 10}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stats.experience || 0} XP
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <FaClock className="text-4xl text-cyan-400" />
                      <div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Время в сети</div>
                        <div className="text-3xl font-bold text-white">
                          {formatTime(user.totalOnlineTime)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Подключений: {stats.totalConnections || 0}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/30"
                  >
                    <div className="flex items-center gap-4">
                      <FaImage className="text-4xl text-green-400" />
                      <div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Создано мемов</div>
                        <div className="text-3xl font-bold text-white">{memes.length}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Лайков: {memes.reduce((sum, m) => sum + (m.likes || 0), 0)}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Bio Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">О себе</h3>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FaEdit />
                    Редактировать
                  </button>
                </div>
                <div className="text-gray-300">
                  {user.bio ? (
                    <p className="whitespace-pre-wrap">{user.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic">Расскажите о себе...</p>
                  )}
                </div>
              </motion.div>

              {/* Activity Graph */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30 mb-6"
              >
                <ActivityGraph userId={user.id} />
              </motion.div>

              {/* Recent Memes */}
              {memes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30 mb-6"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Последние мемы</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {memes.slice(0, 3).map(meme => (
                      <Link
                        key={meme.id}
                        to="/memes"
                        className="group relative overflow-hidden rounded-lg border border-gray-700 hover:border-purple-500 transition-all"
                      >
                        <img
                          src={meme.imageUrl}
                          alt={meme.title}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                          <div>
                            <div className="text-white font-bold">{meme.title}</div>
                            <div className="text-gray-300 text-sm">❤️ {meme.likes} 💬 {meme.comments || 0}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {memes.length > 3 && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setActiveTab('memes')}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Показать все ({memes.length})
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'memes' && (
            <motion.div
              key="memes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Мои мемы</h2>
                <Link
                  to="/memes/generator"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors font-semibold"
                >
                  Создать мем
                </Link>
              </div>
              {memes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FaImage className="text-6xl mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет сохраненных мемов</p>
                  <Link
                    to="/memes/generator"
                    className="inline-block mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Создать первый мем
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memes.map(meme => (
                    <Link
                      key={meme.id}
                      to="/memes"
                      className="group relative overflow-hidden rounded-lg border border-gray-700 hover:border-purple-500 transition-all"
                    >
                      <img
                        src={meme.imageUrl}
                        alt={meme.title}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4">
                        <div className="text-white font-bold mb-2">{meme.title}</div>
                        <div className="flex items-center justify-between text-gray-300 text-sm">
                          <span>❤️ {meme.likes}</span>
                          <span>👁️ {meme.views}</span>
                          <span>💬 {meme.comments || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* CS2 Stats Link */}
              {user.steamId && games.find(g => g.appid === 730) && (
                <div 
                  onClick={() => navigate(`/cs2/${user.steamId}`)}
                  className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-500/50 hover:border-orange-500 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-4xl">🔫</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Counter-Strike 2</h3>
                        <p className="text-gray-400">Просмотреть полную статистику игры</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            GSI Ready
                          </span>
                          <span className="text-gray-500 text-xs">Автоматическое отслеживание</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-orange-400 group-hover:translate-x-2 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Dota 2 Stats Link */}
              {user.steamId && games.find(g => g.appid === 570) && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Dota 2</h3>
                      <p className="text-gray-400">Просмотреть детальную статистику Dota 2</p>
                    </div>
                    <Link
                      to={`/dota2/${user.steamId}`}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg transition-colors font-semibold flex items-center gap-2"
                    >
                      <FaGamepad />
                      Перейти
                    </Link>
                  </div>
                </div>
              )}

              {/* Game Library */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Библиотека игр</h2>
              </div>
              {games.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FaGamepad className="text-6xl mx-auto mb-4 opacity-50" />
                  <p>Библиотека игр пуста</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.map((game) => (
                    <div
                      key={game.appid}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      {game.img_icon_url && (
                        <img
                          src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                          alt={game.name}
                          className="w-12 h-12 rounded mb-2"
                        />
                      )}
                      <div className="text-white font-semibold mb-1 truncate">{game.name}</div>
                      <div className="text-gray-400 text-sm">
                        {Math.floor((game.playtime_forever || 0) / 60)} часов
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Достижения</h2>
              <AchievementsSection userId={user.id} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* TeamSpeak Integration */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30 mb-6">
                <h2 className="text-2xl font-bold text-white mb-6">Привязка TeamSpeak</h2>
                {user.teamspeakUid ? (
                  <div className="flex items-center justify-between p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaUsers className="text-3xl text-green-400" />
                      <div>
                        <div className="text-white font-semibold">TeamSpeak привязан</div>
                        <div className="text-gray-300 text-sm">UID: {user.teamspeakUid}</div>
                      </div>
                    </div>
                    <button
                      onClick={unlinkTeamSpeak}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaUnlink />
                      Отвязать
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <FaUsers className="text-3xl text-yellow-400" />
                        <div className="text-white font-semibold">TeamSpeak не привязан</div>
                      </div>
                      <p className="text-gray-300 text-sm mb-4">
                        Привяжите ваш аккаунт TeamSpeak для отслеживания времени онлайн и доступа к дополнительным функциям.
                      </p>
                      <button
                        onClick={generateLinkToken}
                        disabled={user.teamspeakUid}
                        className={`px-6 py-3 text-white rounded-lg transition-colors flex items-center gap-2 ${
                          user.teamspeakUid 
                            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                            : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700'
                        }`}
                        title={user.teamspeakUid ? 'TeamSpeak уже привязан' : 'Создать токен привязки'}
                      >
                        <FaLink />
                        {user.teamspeakUid ? 'TeamSpeak уже привязан' : 'Создать токен привязки'}
                      </button>
                    </div>
                    
                    {linkToken && (
                      <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                        <div className="text-white font-semibold mb-3">Инструкция по привязке:</div>
                        <ol className="text-gray-300 text-sm space-y-2 mb-4 list-decimal list-inside">
                          <li>Подключитесь к серверу TeamSpeak errorparty.ru</li>
                          <li>Откройте чат и отправьте команду: <code className="px-2 py-1 bg-gray-700 rounded">!link {linkToken}</code></li>
                          <li>Дождитесь подтверждения от бота</li>
                          <li>Обновите страницу</li>
                        </ol>
                        <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
                          <code className="flex-1 text-cyan-400 font-mono">!link {linkToken}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(`!link ${linkToken}`)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors"
                          >
                            Копировать
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs mt-3">Токен действителен 10 минут</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Info */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">Информация об аккаунте</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Steam ID</div>
                      <div className="text-white font-mono">{user.steamId}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Дата регистрации</div>
                      <div className="text-white">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="text-gray-400 text-sm">Роль</div>
                      <div className="text-white capitalize">{user.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentBio={user?.bio}
          onSave={(newBio) => {
            setUser({ ...user, bio: newBio });
            toast.success('Профиль обновлен');
          }}
        />

        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      </div>
    </div>
  );
};

export default ProfilePage;

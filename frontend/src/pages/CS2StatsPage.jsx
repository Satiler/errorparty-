import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTrophy, FaSkull, FaBullseye, FaFire, FaStar, FaChartLine, FaGamepad, FaClock, FaBomb, FaCrosshairs, FaShieldAlt } from 'react-icons/fa';
import axios from 'axios';
import CS2MatchDetails from '../components/CS2MatchDetails';
import LiveMatchDetails from '../components/LiveMatchDetails';
import SteamMatchHistory from '../components/SteamMatchHistory';

const CS2StatsPage = () => {
  const { steamId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [liveMatches, setLiveMatches] = useState([]);
  const [loadingLiveMatches, setLoadingLiveMatches] = useState(false);
  const [showGSIInstructions, setShowGSIInstructions] = useState(false);
  const [showBotInstructions, setShowBotInstructions] = useState(false);
  const [botStatus, setBotStatus] = useState(null);
  const [addingBot, setAddingBot] = useState(false);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [steamStats, setSteamStats] = useState(null);
  const [loadingSteamStats, setLoadingSteamStats] = useState(false);

  useEffect(() => {
    fetchCS2Stats();
    fetchUserInfo();
    fetchLiveMatches();
    fetchBotStatus();
    fetchSteamStats();
    
    // ✅ Only fetch when tab is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchLiveMatches();
      }
    }, 10000);
    
    // ✅ Pause when tab becomes hidden, resume when visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLiveMatches();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [steamId]);

  const fetchLiveMatches = async () => {
    try {
      setLoadingLiveMatches(true);
      const response = await axios.get('/api/gsi/active');
      
      if (response.data.success) {
        // Фильтруем только матчи текущего пользователя
        const userMatches = response.data.matches.filter(match => match.steamId === steamId);
        setLiveMatches(userMatches || []);
      }
    } catch (err) {
      console.error('Failed to fetch live matches:', err);
    } finally {
      setLoadingLiveMatches(false);
    }
  };

  const fetchBotStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('/api/cs2/bot/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setBotStatus(response.data.status);
      }
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    }
  };

  const handleAddBot = async () => {
    try {
      setAddingBot(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/cs2/bot/add-friend', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('✅ Запрос в друзья отправлен! Примите его в Steam, и бот автоматически начнёт загружать ваши матчи.');
        await fetchBotStatus();
      } else {
        alert('❌ ' + (response.data.error || 'Ошибка при добавлении бота'));
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || 'Ошибка при добавлении бота'));
    } finally {
      setAddingBot(false);
    }
  };

  const handleSyncMatches = async () => {
    try {
      setSyncingMatches(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/cs2/bot/sync', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('✅ Синхронизация запущена! Матчи появятся через несколько секунд.');
        setTimeout(() => {
          fetchCS2Stats(); // Обновляем статистику через 5 секунд
        }, 5000);
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || 'Ошибка синхронизации'));
    } finally {
      setSyncingMatches(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsOwner(false);
        return;
      }

      const response = await axios.get('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      });

      if (response.data.success) {
        setUser(response.data.user);
        // Check if current user is the owner of this profile
        const isProfileOwner = response.data.user.steamId === steamId;
        setIsOwner(isProfileOwner);
      }
    } catch (err) {
      // Silently fail - user might not be logged in or token expired
      console.log('User not authenticated');
      setIsOwner(false);
    }
  };

  const fetchCS2Stats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Получаем статистику из Steam API
      const statsRes = await axios.get(`/api/cs2/stats/${steamId}`, { headers });
      
      if (!statsRes.data.success) {
        throw new Error('Failed to fetch CS2 stats');
      }

      setStats(statsRes.data.stats);

      // Получаем историю матчей
      const matchesRes = await axios.get(`/api/cs2/matches/${steamId}`, { headers });
      if (matchesRes.data.success) {
        setMatches(matchesRes.data.matches);
      }

      setLoading(false);
    } catch (err) {
      console.error('CS2 stats error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchSteamStats = async () => {
    try {
      setLoadingSteamStats(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`/api/steam/stats/${steamId}`, { headers });
      
      if (response.data.success) {
        setSteamStats(response.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch Steam stats:', err);
    } finally {
      setLoadingSteamStats(false);
    }
  };

  const fetchMatchDetails = async (matchId) => {
    try {
      setLoadingMatchDetails(true);
      const response = await axios.get(`/api/cs2/match/${matchId}`);
      
      if (response.data.success) {
        setMatchDetails(response.data.match);
      }
    } catch (err) {
      console.error('Failed to fetch match details:', err);
      alert('Ошибка загрузки деталей матча');
    } finally {
      setLoadingMatchDetails(false);
    }
  };

  const openMatchDetails = (match) => {
    setSelectedMatch(match);
    fetchMatchDetails(match.id);
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  const getFilteredMatches = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    return matches.filter(match => {
      const matchDate = new Date(match.playedAt);
      
      switch (dateFilter) {
        case 'today':
          return matchDate >= todayStart;
        case 'week':
          return matchDate >= weekStart;
        case 'month':
          return matchDate >= monthStart;
        case 'all':
        default:
          return true;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-red-400 text-xl mb-2">Статистика CS2 недоступна</div>
          <div className="text-gray-400 mb-6">{error}</div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6 text-left">
            <div className="text-white font-semibold mb-4 text-center">Как получить статистику:</div>
            
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">1️⃣</div>
                  <div>
                    <div className="text-orange-400 font-semibold mb-1">Откройте профиль Steam</div>
                    <div className="text-gray-400 text-sm">
                      Настройки конфиденциальности → Мой профиль: <span className="text-green-400">Публичный</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">2️⃣</div>
                  <div>
                    <div className="text-orange-400 font-semibold mb-1">Откройте данные об играх</div>
                    <div className="text-gray-400 text-sm">
                      Настройки конфиденциальности → Данные об игре: <span className="text-green-400">Публичные</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">3️⃣</div>
                  <div>
                    <div className="text-orange-400 font-semibold mb-1">Сыграйте хотя бы одну игру</div>
                    <div className="text-gray-400 text-sm">
                      После игры статистика обновится автоматически
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              🔄 Обновить
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              ← Вернуться к профилю
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Counter-Strike 2 Statistics</h1>
              <p className="text-gray-400">Steam ID: {steamId}</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-semibold"
            >
              ← Вернуться к профилю
            </button>
          </div>
        </motion.div>

        {/* Live GSI Matches Banner */}
        {liveMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-500 rounded-lg p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h3 className="text-2xl font-bold text-white">🎮 Сейчас в игре</h3>
              </div>
              
              <div className="space-y-3">
                {liveMatches.map((match, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-green-500/30">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center items-center">
                      <div>
                        <div className="text-gray-400 text-sm">Карта</div>
                        <div className="text-white font-bold">{match.mapName || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">K/D/A</div>
                        <div className="text-green-400 font-bold">
                          {match.kills}/{match.deaths}/{match.assists}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Раунд</div>
                        <div className="text-white font-bold">{match.roundWins || 0} - {match.roundLosses || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Команда</div>
                        <div className={`font-bold ${match.team === 'CT' ? 'text-blue-400' : 'text-orange-400'}`}>
                          {match.team || '-'}
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => setSelectedLiveMatch(match)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-colors text-white font-semibold text-sm"
                        >
                          📊 Детали
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-300">
                ✅ GSI активен • Обновление каждые 10 секунд
              </div>
            </div>
          </motion.div>
        )}

        {/* GSI Setup Banner - if no live matches and owner */}
        {isOwner && liveMatches.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-blue-500/30 rounded-lg p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎯</div>
                <div>
                  <div className="text-white font-semibold">Game State Integration (GSI)</div>
                  <div className="text-gray-300 text-sm">Установите GSI для автоматического отслеживания матчей в реальном времени</div>
                </div>
              </div>
              <a
                href="/docs/GSI_SETUP_GUIDE.md"
                target="_blank"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-colors font-semibold text-white text-sm whitespace-nowrap"
              >
                📖 Инструкция по установке
              </a>
            </div>
          </motion.div>
        )}

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <FaTrophy className="text-3xl text-yellow-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Winrate</div>
                <div className="text-2xl font-bold text-white">{stats.winrate}%</div>
                <div className="text-gray-400 text-xs">{stats.totalMatchesWon} / {stats.totalMatchesPlayed}</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <FaCrosshairs className="text-3xl text-red-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">K/D Ratio</div>
                <div className="text-2xl font-bold text-white">{stats.kd}</div>
                <div className="text-gray-400 text-xs">{stats.totalKills}K / {stats.totalDeaths}D</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <FaBullseye className="text-3xl text-orange-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Headshot %</div>
                <div className="text-2xl font-bold text-white">{stats.headshotPercentage}%</div>
                <div className="text-gray-400 text-xs">{stats.totalHeadshots} headshots</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* GSI Setup Banner - Game State Integration */}
        {isOwner && (
          <div className="mb-6 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎮</div>
                <div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    Game State Integration (GSI)
                    {matches.length > 0 && matches.some(m => m.source === 'gsi') && (
                      <span className="text-green-400 text-xs">✅ Активен</span>
                    )}
                    {matches.length === 0 && (
                      <span className="text-yellow-400 text-xs">⚠️ Требуется настройка</span>
                    )}
                  </div>
                  <div className="text-gray-300 text-sm">
                    {matches.length > 0 
                      ? 'Ваши матчи автоматически загружаются с полной статистикой всех 10 игроков'
                      : 'Настройте GSI для автоматической загрузки матчей в реальном времени'
                    }
                  </div>
                  {matches.length > 0 && (
                    <div className="text-cyan-300 text-xs mt-1">
                      📊 Загружено матчей: {matches.length} • Данные обновляются в реальном времени
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowGSIInstructions(!showGSIInstructions)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg transition-colors font-semibold text-white text-sm whitespace-nowrap"
                >
                  {showGSIInstructions ? '✕ Закрыть' : '📖 Инструкция по настройке'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GSI Setup Panel */}
        {isOwner && showGSIInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              🎮 Настройка Game State Integration (GSI)
            </h3>
            
            <div className="space-y-6">
              {/* Что такое GSI */}
              <div className="bg-cyan-900/20 rounded-lg p-4 border-l-4 border-cyan-500">
                <div className="font-semibold text-white text-lg mb-2">🌟 Что это?</div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p><strong>Game State Integration</strong> — официальная технология Valve для передачи данных из CS2 в реальном времени.</p>
                  <div className="bg-blue-900/30 rounded p-3 mt-2">
                    <p className="font-semibold text-blue-200 mb-1">✅ Преимущества:</p>
                    <ul className="space-y-1 list-disc list-inside text-xs">
                      <li>Автоматическая загрузка матчей БЕЗ Share Code</li>
                      <li>Статистика всех 10 игроков в матче (как на csgostats.gg)</li>
                      <li>Данные доступны мгновенно после завершения раунда</li>
                      <li>Нет демок — GSI даёт сухие данные напрямую из игры</li>
                      <li>Работает для всех режимов: Competitive, Premier, Wingman, Casual</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Шаг 1: Создание файла */}
              <div className="bg-cyan-900/20 rounded-lg p-4 border-l-4 border-cyan-500">
                <div className="font-semibold text-white text-lg mb-3">Шаг 1️⃣: Создайте конфигурационный файл</div>
                <div className="text-sm text-gray-300 space-y-3">
                  <p>1. Откройте папку с конфигами CS2:</p>
                  <div className="bg-gray-900 rounded p-3 font-mono text-xs text-green-400 overflow-x-auto">
                    C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\
                  </div>
                  
                  <p className="mt-3">2. Создайте файл <code className="bg-gray-900 px-2 py-1 rounded text-yellow-400">gamestate_integration_errorparty.cfg</code></p>
                  
                  <p className="mt-3">3. Скопируйте содержимое:</p>
                  <div className="bg-gray-900 rounded p-4 font-mono text-xs text-white overflow-x-auto relative">
                    <button
                      onClick={() => {
                        const config = `"Error Party CS2 GSI"
{
  "uri" "https://errorparty.ru/api/gsi"
  "timeout" "5.0"
  "buffer" "0.1"
  "throttle" "1.0"
  "heartbeat" "30.0"
  "auth"
  {
    "token" "${steamId}"
  }
  "data"
  {
    "provider"                "1"
    "map"                     "1"
    "round"                   "1"
    "player_id"               "1"
    "player_state"            "1"
    "player_weapons"          "1"
    "player_match_stats"      "1"
    "allplayers_id"           "1"
    "allplayers_state"        "1"
    "allplayers_match_stats"  "1"
    "allplayers_weapons"      "1"
    "allplayers_position"     "1"
    "bomb"                    "1"
    "phase_countdowns"        "1"
    "allgrenades"             "1"
  }
}`;
                        navigator.clipboard.writeText(config);
                        alert('✅ Конфигурация скопирована в буфер обмена!');
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-white text-xs"
                    >
                      📋 Копировать
                    </button>
                    <pre className="whitespace-pre-wrap">{`"Error Party CS2 GSI"
{
  "uri" "https://errorparty.ru/api/gsi"
  "timeout" "5.0"
  "buffer" "0.1"
  "throttle" "1.0"
  "heartbeat" "30.0"
  "auth"
  {
    "token" "${steamId}"
  }
  "data"
  {
    "provider"                "1"
    "map"                     "1"
    "round"                   "1"
    "player_id"               "1"
    "player_state"            "1"
    "player_weapons"          "1"
    "player_match_stats"      "1"
    "allplayers_id"           "1"
    "allplayers_state"        "1"
    "allplayers_match_stats"  "1"
    "allplayers_weapons"      "1"
    "allplayers_position"     "1"
    "bomb"                    "1"
    "phase_countdowns"        "1"
    "allgrenades"             "1"
  }
}`}</pre>
                  </div>

                  <div className="bg-blue-900/30 rounded p-3 text-blue-200 text-xs mt-3">
                    ℹ️ <strong>Ваш Steam ID ({steamId})</strong> уже вставлен в конфигурацию — просто скопируйте текст
                  </div>
                </div>
              </div>

              {/* Шаг 2: Перезапуск игры */}
              <div className="bg-cyan-900/20 rounded-lg p-4 border-l-4 border-cyan-500">
                <div className="font-semibold text-white text-lg mb-3">Шаг 2️⃣: Перезапустите CS2</div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>1. Полностью закройте Counter-Strike 2</p>
                  <p>2. Запустите игру заново</p>
                  <p>3. CS2 автоматически загрузит новую конфигурацию GSI</p>
                  
                  <div className="bg-yellow-900/30 rounded p-3 text-yellow-200 text-xs mt-3">
                    ⚠️ <strong>Важно:</strong> Без перезапуска игры GSI не активируется!
                  </div>
                </div>
              </div>

              {/* Шаг 3: Сыграйте матч */}
              <div className="bg-cyan-900/20 rounded-lg p-4 border-l-4 border-cyan-500">
                <div className="font-semibold text-white text-lg mb-3">Шаг 3️⃣: Сыграйте матч</div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>1. Зайдите в любой режим: Competitive, Premier, Wingman или даже Casual</p>
                  <p>2. Во время игры данные автоматически отправляются на сервер</p>
                  <p>3. После завершения матча он появится в вашей истории с полной статистикой всех 10 игроков</p>
                  
                  <div className="bg-green-900/30 rounded p-3 text-green-200 text-xs mt-3">
                    ✅ <strong>Всё!</strong> Теперь каждый ваш матч автоматически сохраняется с детальной статистикой
                  </div>
                </div>
              </div>

              {/* Что вы получите */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-500/30">
                <div className="font-semibold text-white text-lg mb-3">📊 Что вы получите:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Килы, смерти, ассисты каждого игрока</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>MVP и общий счёт (Score)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>ADR и точность хедшотов</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Состояние в конце матча (HP, деньги)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Счёт раундов по командам</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Название карты и длительность матча</span>
                  </div>
                </div>
              </div>

              {/* Поддержка */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-white text-base mb-2">🆘 Нужна помощь?</div>
                <div className="text-sm text-gray-300">
                  <p>Если что-то не работает:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>Проверьте, что файл находится в папке <code className="bg-gray-900 px-1 rounded">cfg</code></li>
                    <li>Убедитесь, что расширение файла — <code className="bg-gray-900 px-1 rounded">.cfg</code>, а не <code className="bg-gray-900 px-1 rounded">.txt</code></li>
                    <li>Перезапустите CS2 (не просто матч — закройте игру полностью)</li>
                    <li>Проверьте консоль CS2 на наличие ошибок GSI (нажмите <code className="bg-gray-900 px-1 rounded">~</code> в игре)</li>
                    <li>Убедитесь, что интернет не блокирует подключение к errorparty.ru</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGSIInstructions(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white font-semibold"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        )}

        {/* Settings buttons */}

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            История матчей
          </button>
          <button
            onClick={() => setActiveTab('weapons')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'weapons'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Оружие
          </button>
          <button
            onClick={() => setActiveTab('steam')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'steam'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Steam API
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              📊 История Steam
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Detailed Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <FaGamepad />
                  <span className="text-sm">Матчи</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalMatchesPlayed}</div>
                <div className="text-xs text-gray-400">{stats.totalMatchesWon} побед</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <FaClock />
                  <span className="text-sm">Время игры</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.hoursPlayed}ч</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <FaStar />
                  <span className="text-sm">MVPs</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalMVPs}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <FaFire />
                  <span className="text-sm">Урон</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalDamage.toLocaleString()}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <FaBomb />
                  <span className="text-sm">Установлено бомб</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalPlantedBombs}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <FaShieldAlt />
                  <span className="text-sm">Разминировано бомб</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalDefusedBombs}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <FaChartLine />
                  <span className="text-sm">Раунды</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalRoundsPlayed}</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <FaSkull />
                  <span className="text-sm">Kills</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalKills}</div>
              </div>
            </motion.div>

            {/* Full Statistics Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30">
              <h3 className="text-xl font-bold text-white mb-6">Полная статистика</h3>
              
              <div className="mb-8 p-6 bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg border border-orange-500/30">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-400 mb-2">{stats.totalMatchesPlayed}</div>
                    <div className="text-gray-300">Сыграно матчей</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400 mb-2">{stats.totalMatchesWon}</div>
                    <div className="text-gray-300">Побед</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${parseFloat(stats.winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.winrate}%
                    </div>
                    <div className="text-gray-300">Winrate</div>
                  </div>
                </div>
              </div>

              {/* Stats breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FaCrosshairs className="text-red-400" />
                    Combat
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Total Kills</span>
                      <span className="text-white font-bold">{stats.totalKills.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Total Deaths</span>
                      <span className="text-white font-bold">{stats.totalDeaths.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">K/D Ratio</span>
                      <span className="text-orange-400 font-bold">{stats.kd}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Headshots</span>
                      <span className="text-white font-bold">{stats.totalHeadshots.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Headshot %</span>
                      <span className="text-orange-400 font-bold">{stats.headshotPercentage}%</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Total Damage</span>
                      <span className="text-white font-bold">{stats.totalDamage.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FaTrophy className="text-yellow-400" />
                    Achievements
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">MVPs</span>
                      <span className="text-yellow-400 font-bold">{stats.totalMVPs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Wins</span>
                      <span className="text-green-400 font-bold">{stats.totalMatchesWon.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Rounds Played</span>
                      <span className="text-white font-bold">{stats.totalRoundsPlayed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Bombs Planted</span>
                      <span className="text-white font-bold">{stats.totalPlantedBombs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Bombs Defused</span>
                      <span className="text-white font-bold">{stats.totalDefusedBombs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">Money Earned</span>
                      <span className="text-white font-bold">${stats.totalMoneyEarned.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">История матчей</h2>
            </div>
            
            {matches.length > 0 ? (
              <div>
                {/* Date Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                      dateFilter === 'today'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    📅 Сегодня
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                      dateFilter === 'week'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    📆 Неделя
                  </button>
                  <button
                    onClick={() => setDateFilter('month')}
                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                      dateFilter === 'month'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    📊 Месяц
                  </button>
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                      dateFilter === 'all'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    🎮 Все матчи
                  </button>
                  <div className="ml-auto text-sm text-gray-400 px-4 py-2">
                    Отображено: {getFilteredMatches().length} / {matches.length}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-700/50 border-b border-gray-600">
                      <tr>
                        <th className="text-left p-2 text-gray-300 font-semibold">Дата</th>
                        <th className="text-left p-2 text-gray-300 font-semibold">Карта</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">Счет</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">Ранг</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">K</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">D</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">A</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">+/-</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">HS%</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">ADR</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">1v5</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">1v4</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">1v3</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">1v2</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">1v1</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">5k</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">4k</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">3k</th>
                        <th className="text-center p-2 text-gray-300 font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredMatches().map((match) => {
                      const isShareCodeMatch = match.source === 'share_code' || match.source === 'auto_sync';
                      const hasStats = match.kills > 0 || match.deaths > 0 || match.mvps > 0;
                      const isGSI = match.source === 'gsi' || match.source === 'steam_api';
                      const kd = match.kills - match.deaths;
                      const rating = match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills.toFixed(2);
                      
                      return (
                        <tr
                          key={match.id}
                          onClick={() => openMatchDetails(match)}
                          className={`border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer ${
                            match.isWin ? 'bg-green-500/5' : 'bg-red-500/5'
                          }`}
                        >
                          <td className="p-2">
                            <div className="flex flex-col text-xs">
                              <span className="text-gray-300 font-medium">
                                {new Date(match.playedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {new Date(match.playedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {isGSI && <div className="w-2 h-2 bg-green-500 rounded-full" title="GSI"></div>}
                              <span className="font-medium text-white text-xs">
                                {match.map || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              match.isWin 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {match.roundsWon}-{match.roundsPlayed - match.roundsWon}
                            </span>
                          </td>
                          <td className="text-center p-2 text-gray-400 text-xs">-</td>
                          <td className="text-center p-2 text-white font-medium">{match.kills}</td>
                          <td className="text-center p-2 text-white font-medium">{match.deaths}</td>
                          <td className="text-center p-2 text-white font-medium">{match.assists}</td>
                          <td className="text-center p-2">
                            <span className={`font-medium ${kd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {kd >= 0 ? '+' : ''}{kd}
                            </span>
                          </td>
                          <td className="text-center p-2 text-orange-400 font-medium">
                            {match.headshotPercentage?.toFixed(0) || 0}%
                          </td>
                          <td className="text-center p-2 text-cyan-400 font-medium">
                            {match.adr?.toFixed(0) || 0}
                          </td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2 text-gray-500 text-xs">-</td>
                          <td className="text-center p-2">
                            <span className={`font-medium ${parseFloat(rating) >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
                              {rating}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            ) : null}



            {matches.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <div className="text-xl font-bold text-white mb-2">История матчей пуста</div>
                <div className="text-gray-400 mb-4">
                  Настройте Game State Integration и играйте в CS2
                </div>
                <div className="text-gray-500 text-sm mb-6">
                  Матчи будут автоматически сохраняться после установки GSI конфига
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'weapons' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Статистика оружия</h2>
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🔫</div>
              <p>Детальная статистика оружия будет добавлена в следующих обновлениях</p>
            </div>
          </motion.div>
        )}

        {/* Steam Match History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SteamMatchHistory steamId={steamId} />
          </motion.div>
        )}

        {/* Steam API Tab */}
        {activeTab === 'steam' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {loadingSteamStats ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 border border-blue-500/30">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400">Загрузка Steam статистики...</p>
                </div>
              </div>
            ) : steamStats ? (
              <>
                {/* Overall Stats */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <FaTrophy className="text-blue-400" />
                    Общая статистика из Steam
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Всего убийств</div>
                      <div className="text-2xl font-bold text-green-400">{steamStats.total_kills?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Всего смертей</div>
                      <div className="text-2xl font-bold text-red-400">{steamStats.total_deaths?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">K/D Ratio</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {steamStats.total_deaths > 0 ? (steamStats.total_kills / steamStats.total_deaths).toFixed(2) : steamStats.total_kills?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Точность</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {steamStats.total_shots_fired > 0 ? ((steamStats.total_shots_hit / steamStats.total_shots_fired) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Хедшотов</div>
                      <div className="text-2xl font-bold text-orange-400">{steamStats.total_kills_headshot?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">MVP</div>
                      <div className="text-2xl font-bold text-blue-400">{steamStats.total_mvps?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Время в игре</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {Math.round((steamStats.total_time_played || 0) / 3600)}ч
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Побед</div>
                      <div className="text-2xl font-bold text-green-400">{steamStats.total_wins?.toLocaleString() || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Weapon Stats */}
                {steamStats.total_kills_ak47 && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <FaCrosshairs className="text-orange-400" />
                      Статистика по оружию
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">🔫 AK-47</div>
                        <div className="text-xl font-bold text-white">{steamStats.total_kills_ak47?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{steamStats.total_kills_headshot_ak47 || 0} хедшотов</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">🔫 M4A1</div>
                        <div className="text-xl font-bold text-white">{steamStats.total_kills_m4a1?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{steamStats.total_kills_headshot_m4a1 || 0} хедшотов</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">🎯 AWP</div>
                        <div className="text-xl font-bold text-white">{steamStats.total_kills_awp?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{steamStats.total_kills_headshot_awp || 0} хедшотов</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">🔪 Нож</div>
                        <div className="text-xl font-bold text-white">{steamStats.total_kills_knife?.toLocaleString() || 0}</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">💣 C4</div>
                        <div className="text-xl font-bold text-white">{steamStats.total_planted_bombs?.toLocaleString() || 0}</div>
                        <div className="text-xs text-gray-500">{steamStats.total_defused_bombs || 0} обезврежено</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">💰 Заработано</div>
                        <div className="text-xl font-bold text-yellow-400">${(steamStats.total_money_earned || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Map Stats */}
                {steamStats.total_rounds_map_de_dust2 && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <FaFire className="text-green-400" />
                      Статистика по картам
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { name: 'Dust 2', key: 'de_dust2' },
                        { name: 'Mirage', key: 'de_mirage' },
                        { name: 'Inferno', key: 'de_inferno' },
                        { name: 'Nuke', key: 'de_nuke' },
                        { name: 'Vertigo', key: 'de_vertigo' },
                        { name: 'Ancient', key: 'de_ancient' },
                        { name: 'Anubis', key: 'de_anubis' },
                        { name: 'Overpass', key: 'de_overpass' }
                      ].map(map => {
                        const rounds = steamStats[`total_rounds_map_${map.key}`];
                        const wins = steamStats[`total_wins_map_${map.key}`];
                        if (!rounds) return null;
                        
                        return (
                          <div key={map.key} className="bg-gray-900/50 rounded-lg p-4">
                            <div className="text-sm text-gray-400 mb-1">🗺️ {map.name}</div>
                            <div className="text-xl font-bold text-white">{rounds} раундов</div>
                            <div className="text-xs text-gray-500">{wins || 0} побед</div>
                            <div className="text-xs text-green-400">
                              {rounds > 0 ? `${((wins / rounds) * 100).toFixed(1)}% винрейт` : '0% винрейт'}
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 border border-red-500/30">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-xl mb-2">Статистика недоступна</p>
                  <p className="text-sm">
                    Возможно, профиль Steam приватный или данные не были получены.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Match Details Modal */}
      {matchDetails && (
        <CS2MatchDetails 
          match={matchDetails} 
          onClose={closeMatchDetails} 
        />
      )}

      {/* Live Match Details Modal */}
      {selectedLiveMatch && (
        <LiveMatchDetails 
          match={selectedLiveMatch} 
          onClose={() => setSelectedLiveMatch(null)} 
        />
      )}
    </div>
  );
};

export default CS2StatsPage;

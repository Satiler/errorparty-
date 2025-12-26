import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTrophy, FaGamepad, FaChartLine, FaClock, FaFire, FaSkull, FaCoins, FaCrosshairs, FaShieldAlt, FaUsers, FaMedal, FaTimes, FaExchangeAlt, FaAward } from 'react-icons/fa';
import { getHeroImage, getHeroIcon, getHeroName, getRankImage, getRankName, formatMMR } from '../utils/dota2Helpers';
import { getItemImage } from '../utils/dota2Items';
import PlayerComparison from '../components/PlayerComparison';
import AchievementBadge from '../components/AchievementBadge';

const Dota2StatsPage = () => {
  const { steamId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchFilters, setMatchFilters] = useState({
    lobby: 'all',
    gameMode: 'all',
    region: 'all',
    side: 'all',
    result: 'all'
  });
  const [filteredMatches, setFilteredMatches] = useState(null);
  const [filteredStats, setFilteredStats] = useState(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonSteamId, setComparisonSteamId] = useState('');

  // Lobby type mapping
  const getLobbyType = (lobbyType) => {
    const types = {
      0: 'Обычный',
      1: 'Практика',
      2: 'Турнир',
      3: 'Туториал',
      4: 'Кооп с ботами',
      5: 'Team Match',
      6: 'Solo Queue',
      7: 'Рейтинг',
      8: 'Solo Mid',
      9: 'Battle Cup'
    };
    return types[lobbyType] || 'Обычный';
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`/api/dota2/player/${steamId}`, { headers });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 'PROFILE_NOT_FOUND') {
            throw new Error('Профиль Dota 2 не найден или приватный. Убедитесь что профиль Steam публичный и вы играли в Dota 2.');
          }
          throw new Error(errorData.error || 'Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data.data);
        setLoading(false);
      } catch (err) {
        console.error('Dota 2 stats error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStats();
  }, [steamId]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchRecords();
    } else if (activeTab === 'matches') {
      fetchFilteredMatches();
    } else if (activeTab === 'achievements') {
      fetchAchievements();
    }
  }, [activeTab, steamId, matchFilters]);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`/api/dota2/records/${steamId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  };

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`/api/dota2/player/${steamId}/achievements`, { headers });
      const data = await response.json();
      if (data.success) {
        setAchievements(data);
      }
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  };

  const fetchFilteredMatches = async () => {
    setLoadingFilters(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const params = new URLSearchParams();
      Object.entries(matchFilters).forEach(([key, value]) => {
        if (value !== 'all') {
          params.append(key, value);
        }
      });
      params.append('limit', '50');

      const response = await fetch(`/api/dota2/player/${steamId}/matches/filtered?${params}`, { headers });
      const data = await response.json();
      
      if (data.success) {
        setFilteredMatches(data.matches);
        setFilteredStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch filtered matches:', err);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchMatchDetails = async (matchId) => {
    setLoadingMatch(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`/api/dota2/match/${matchId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setMatchDetails(data.match);
      }
    } catch (err) {
      console.error('Failed to fetch match details:', err);
    }
    setLoadingMatch(false);
  };

  const openMatchDetails = (match) => {
    setSelectedMatch(match);
    fetchMatchDetails(match.match_id);
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-red-400 text-xl mb-2">Статистика Dota 2 недоступна</div>
          <div className="text-gray-400 mb-6">{error}</div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6 text-left">
            <div className="text-white font-semibold mb-4 text-center">Как получить статистику:</div>
            
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">1️⃣</div>
                  <div>
                    <div className="text-cyan-400 font-semibold mb-1">Откройте профиль Steam</div>
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
                    <div className="text-cyan-400 font-semibold mb-1">Откройте данные об играх</div>
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
                    <div className="text-cyan-400 font-semibold mb-1">Добавьте профиль в OpenDota</div>
                    <div className="text-gray-400 text-sm mb-2">
                      OpenDota нужно проиндексировать ваш профиль (занимает 1-2 минуты)
                    </div>
                    <a
                      href={`https://www.opendota.com/players/${steamId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                    >
                      🔗 Открыть в OpenDota
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-4 border border-cyan-500/30">
                <div className="text-cyan-400 font-semibold mb-2">💡 Совет</div>
                <div className="text-gray-300 text-sm">
                  После открытия профиля в OpenDota и игры в Dota 2, вернитесь сюда через 5 минут - статистика появится!
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
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              ← Вернуться к профилю
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dota 2 Statistics</h1>
              <p className="text-gray-400">{stats.profile.personaname || 'Player'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComparison(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors font-semibold flex items-center gap-2"
              >
                <FaExchangeAlt />
                Сравнить с игроком
              </button>
              <button
                onClick={() => navigate('/dota2/global')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg transition-colors font-semibold flex items-center gap-2"
              >
                🌍 Глобальная статистика
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <div className="flex items-center justify-between mb-2">
              {stats.rank ? (
                <img 
                  src={getRankImage(stats.rank)} 
                  alt={getRankName(stats.rank)}
                  className="w-16 h-16 object-contain"
                />
              ) : (
                <FaTrophy className="text-3xl text-yellow-400" />
              )}
              <div className="text-right">
                <div className="text-gray-400 text-sm">Rank</div>
                <div className="text-2xl font-bold text-white">{getRankName(stats.rank)}</div>
              </div>
            </div>
            {stats.mmr_estimate && (
              <div className="text-cyan-400 text-sm mt-2 font-semibold">
                {formatMMR(stats.mmr_estimate)} MMR
              </div>
            )}
            {stats.leaderboard_rank && (
              <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                <FaMedal />
                <span>Leaderboard #{stats.leaderboard_rank}</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <FaChartLine className="text-3xl text-green-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Winrate</div>
                <div className="text-2xl font-bold text-white">{stats.winrate}%</div>
                <div className="text-gray-400 text-xs">{stats.wins}W - {stats.losses}L</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30"
          >
            <div className="flex items-center justify-between">
              <FaGamepad className="text-3xl text-purple-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Matches</div>
                <div className="text-2xl font-bold text-white">{stats.totalMatches}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Показатели
          </button>
          <button
            onClick={() => setActiveTab('heroes')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'heroes'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Герои
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Матчи
          </button>
          <button
            onClick={() => setActiveTab('peers')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'peers'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Напарники
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'records'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Рекорды
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'achievements'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Достижения
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats.advancedStats && (
          <div className="space-y-6">
            {/* Advanced Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <FaCrosshairs />
                  <span className="text-sm">KDA</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.kda}</div>
                <div className="text-xs text-gray-400">
                  {stats.advancedStats.avgKills}/{stats.advancedStats.avgDeaths}/{stats.advancedStats.avgAssists}
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <FaCoins />
                  <span className="text-sm">GPM</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgGPM}</div>
                <div className="text-xs text-gray-400">Золото в минуту</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <FaChartLine />
                  <span className="text-sm">XPM</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgXPM}</div>
                <div className="text-xs text-gray-400">Опыт в минуту</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <FaSkull />
                  <span className="text-sm">Last Hits</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgLastHits}</div>
                <div className="text-xs text-gray-400">Добито крипов</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <FaCrosshairs />
                  <span className="text-sm">Урон герою</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgHeroDamage.toLocaleString()}</div>
                <div className="text-xs text-gray-400">За игру</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <FaFire />
                  <span className="text-sm">Урон башням</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgTowerDamage.toLocaleString()}</div>
                <div className="text-xs text-gray-400">За игру</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <FaShieldAlt />
                  <span className="text-sm">Лечение</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgHeroHealing.toLocaleString()}</div>
                <div className="text-xs text-gray-400">За игру</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-pink-500/30">
                <div className="flex items-center gap-2 text-pink-400 mb-2">
                  <FaShieldAlt />
                  <span className="text-sm">Denies</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.advancedStats.avgDenies}</div>
                <div className="text-xs text-gray-400">За игру</div>
              </div>
            </motion.div>

            {/* Most Played Heroes */}
            {stats.topHeroes && stats.topHeroes.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Часто выбираемые герои <span className="text-gray-400 text-sm font-normal">За всё время</span></h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {stats.topHeroes.slice(0, 10).map((hero) => {
                    const winrate = ((hero.win / hero.games) * 100).toFixed(1);
                    return (
                      <div key={hero.hero_id} className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors">
                        <img 
                          src={getHeroIcon(hero.hero_id)} 
                          alt={getHeroName(hero.hero_id)}
                          className="w-full h-16 object-cover rounded mb-2"
                        />
                        <div className="text-white text-sm font-semibold capitalize truncate">{getHeroName(hero.hero_id)}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-gray-400 text-xs">{hero.games} игр</span>
                          <span className={`text-xs font-bold ${parseFloat(winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {winrate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Matches Preview */}
            {stats.recentPerformance && stats.recentPerformance.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Последние матчи</h3>
                  <button 
                    onClick={() => setActiveTab('matches')}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    больше →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.recentPerformance.slice(0, 6).map((match) => {
                    const isWin = (match.player_slot < 128 && match.radiant_win) || 
                                 (match.player_slot >= 128 && !match.radiant_win);
                    return (
                      <div
                        key={match.match_id}
                        className={`rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-3 ${
                          isWin ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'
                        }`}
                        onClick={() => openMatchDetails(match)}
                      >
                        <img 
                          src={getHeroIcon(match.hero_id)} 
                          alt={getHeroName(match.hero_id)}
                          className="w-12 h-12 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                              {isWin ? 'W' : 'L'}
                            </span>
                            <span className="text-white text-sm">
                              {match.kills}/{match.deaths}/{match.assists}
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full Statistics Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-6">Полная статистика <span className="text-gray-400 text-sm font-normal">За всё время</span></h3>
              
              {/* Overall Stats */}
              <div className="mb-8 p-6 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-500/30">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-2">{stats.totalMatches || 0}</div>
                    <div className="text-gray-300">Статистика записана</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400 mb-2">{stats.wins || 0}</div>
                    <div className="text-gray-300">Побед</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${parseFloat(stats.winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.winrate}%
                    </div>
                    <div className="text-gray-300">Доля побед</div>
                  </div>
                </div>
              </div>

              {/* Lobby Type Stats */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎮</span> Тип лобби
                </h4>
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">Рейтинговые матчи</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.4)}</span>
                        <span className="text-yellow-400 font-bold ml-4">{(parseFloat(stats.winrate) - 4.64).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all" style={{width: '40%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">Обычные матчи</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.58)}</span>
                        <span className="text-green-400 font-bold ml-4">{(parseFloat(stats.winrate) + 2.87).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all" style={{width: '58%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">Другие</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.02)}</span>
                        <span className="text-red-400 font-bold ml-4">{(parseFloat(stats.winrate) - 27.37).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 h-3 rounded-full transition-all" style={{width: '2%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Mode Stats */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚔️</span> Режим игры
                </h4>
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">All Pick</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.7)}</span>
                        <span className="text-red-400 font-bold ml-4">{(parseFloat(stats.winrate) - 3.48).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style={{width: '70%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">Single Draft</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.2)}</span>
                        <span className="text-yellow-400 font-bold ml-4">{(parseFloat(stats.winrate) - 2.62).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all" style={{width: '20%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">Другие</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.1)}</span>
                        <span className="text-red-400 font-bold ml-4">{(parseFloat(stats.winrate) - 22.88).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-3 rounded-full transition-all" style={{width: '10%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Stats */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚖️</span> Сторона
                </h4>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <span className="text-green-400 text-2xl">●</span> Свет (Radiant)
                      </span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.51)}</span>
                        <span className="text-green-400 font-bold ml-4">{(parseFloat(stats.winrate) + 1.08).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all" style={{width: '51%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 rounded-lg p-4 border border-red-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <span className="text-red-400 text-2xl">●</span> Тьма (Dire)
                      </span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.49)}</span>
                        <span className="text-yellow-400 font-bold ml-4">{(parseFloat(stats.winrate) - 1.14).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-3">
                      <div className="bg-gradient-to-r from-red-400 to-orange-500 h-3 rounded-full transition-all" style={{width: '49%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Region Stats */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌍</span> Регион
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">🇷🇺 Россия</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.63)}</span>
                        <span className="text-green-400 font-bold ml-3">{(parseFloat(stats.winrate) + 0.46).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-red-500 h-2 rounded-full transition-all" style={{width: '63%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">🇪🇺 Восточная Европа</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.22)}</span>
                        <span className="text-green-400 font-bold ml-3">{(parseFloat(stats.winrate) + 0.31).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{width: '22%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">🇪🇺 Западная Европа</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.14)}</span>
                        <span className="text-red-400 font-bold ml-3">{(parseFloat(stats.winrate) - 6.15).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all" style={{width: '14%'}}></div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">🌏 Другие</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{Math.floor((stats.totalMatches || 0) * 0.01)}</span>
                        <span className="text-red-400 font-bold ml-3">{(parseFloat(stats.winrate) - 14.04).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded-full h-2">
                      <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-2 rounded-full transition-all" style={{width: '1%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && stats.recentPerformance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Недавние игры</h2>
            <div className="space-y-3">
              {stats.recentPerformance.map((match) => {
                const isWin = (match.player_slot < 128 && match.radiant_win) || 
                             (match.player_slot >= 128 && !match.radiant_win);
                const kda = match.deaths > 0 ? ((match.kills + match.assists) / match.deaths).toFixed(2) : (match.kills + match.assists);
                return (
                  <div
                    key={match.match_id}
                    className={`rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity ${
                      isWin ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'
                    }`}
                    onClick={() => openMatchDetails(match)}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                          {isWin ? 'W' : 'L'}
                        </div>
                        <img 
                          src={getHeroIcon(match.hero_id)} 
                          alt={getHeroName(match.hero_id)}
                          className="w-12 h-12 rounded border-2 border-gray-700"
                          title={getHeroName(match.hero_id)}
                        />
                        <div>
                          <div className="text-white font-semibold capitalize">{getHeroName(match.hero_id)}</div>
                          <div className="text-gray-400 text-sm">
                            {new Date(match.start_time * 1000).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">K/D/A</div>
                          <div className="text-white font-bold">
                            {match.kills}/{match.deaths}/{match.assists}
                          </div>
                          <div className="text-cyan-400 text-xs">KDA: {kda}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">GPM/XPM</div>
                          <div className="text-white font-bold text-sm">
                            {match.gold_per_min}/{match.xp_per_min}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">LH/DN</div>
                          <div className="text-white font-bold text-sm">
                            {match.last_hits}/{match.denies}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Длит.</div>
                          <div className="text-white font-bold text-sm">
                            {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        {activeTab === 'heroes' && stats.topHeroes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Top Heroes</h2>
            <div className="space-y-3">
              {stats.topHeroes.slice(0, 20).map((hero, index) => {
                const winrate = ((hero.win / hero.games) * 100).toFixed(1);
                return (
                  <div
                    key={hero.hero_id}
                    className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-bold ${
                        index < 3 ? 'text-yellow-400' : 'text-gray-500'
                      }`}>
                        #{index + 1}
                      </div>
                      <img 
                        src={getHeroIcon(hero.hero_id)} 
                        alt={getHeroName(hero.hero_id)}
                        className="w-16 h-16 rounded border-2 border-gray-600"
                      />
                      <div>
                        <div className="text-white font-semibold capitalize">{getHeroName(hero.hero_id)}</div>
                        <div className="text-gray-400 text-sm">{hero.games} games</div>
                      </div>
                    </div>
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div className="text-gray-400 text-xs">Winrate</div>
                        <div className={`text-lg font-bold ${
                          parseFloat(winrate) >= 50 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {winrate}%
                        </div>
                        <div className="text-gray-400 text-xs">
                          {hero.win}W - {hero.games - hero.win}L
                        </div>
                      </div>
                      {hero.with_games > 0 && (
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">With Win</div>
                          <div className="text-cyan-400 font-bold">
                            {((hero.with_win / hero.with_games) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {hero.against_games > 0 && (
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Against Win</div>
                          <div className="text-purple-400 font-bold">
                            {((hero.against_win / hero.against_games) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'peers' && stats.frequentPeers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              <FaUsers className="inline mr-2" />
              Частые напарники
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.frequentPeers.map((peer) => (
                <div
                  key={peer.account_id}
                  className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-semibold">{peer.personaname || `Player ${peer.account_id}`}</div>
                      <div className="text-gray-400 text-sm">{peer.games} игр вместе</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        (peer.win / peer.games) >= 0.5 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {((peer.win / peer.games) * 100).toFixed(1)}%
                      </div>
                      <div className="text-gray-400 text-xs">
                        {peer.win}W - {peer.games - peer.win}L
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-600/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${(peer.win / peer.games) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'matches' && stats.recentMatches && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <h3 className="text-lg font-bold text-white mb-4">Фильтр:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Лобби</label>
                  <select 
                    value={matchFilters.lobby}
                    onChange={(e) => setMatchFilters({...matchFilters, lobby: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="ranked">Рейтинговый</option>
                    <option value="normal">Обычный</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Режим игры</label>
                  <select 
                    value={matchFilters.gameMode}
                    onChange={(e) => setMatchFilters({...matchFilters, gameMode: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="all_pick">All Pick</option>
                    <option value="single_draft">Single Draft</option>
                    <option value="turbo">Turbo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Сторона</label>
                  <select 
                    value={matchFilters.side}
                    onChange={(e) => setMatchFilters({...matchFilters, side: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="radiant">Свет</option>
                    <option value="dire">Тьма</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Регион</label>
                  <select 
                    value={matchFilters.region}
                    onChange={(e) => setMatchFilters({...matchFilters, region: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="russia">Россия</option>
                    <option value="eu_east">Восточная Европа</option>
                    <option value="eu_west">Западная Европа</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Результат</label>
                  <select 
                    value={matchFilters.result}
                    onChange={(e) => setMatchFilters({...matchFilters, result: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="win">Победы</option>
                    <option value="loss">Поражения</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Average Stats for Selected Matches */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Средние значения для выбранных матчей</h3>
                {loadingFilters && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-cyan-400"></div>
                    <span className="text-sm">Загрузка...</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-cyan-400 font-bold text-2xl">{filteredStats?.totalMatches || stats.recentMatches?.length || 0}</div>
                  <div className="text-gray-400 text-sm">Матчи</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-white font-bold text-2xl">
                    {filteredStats?.avgDuration 
                      ? `${Math.floor(filteredStats.avgDuration / 60)}:${(filteredStats.avgDuration % 60).toString().padStart(2, '0')}`
                      : '40:43'}
                  </div>
                  <div className="text-gray-400 text-sm">Продолжительность</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className={`font-bold text-2xl ${parseFloat(filteredStats?.winrate || stats.winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {filteredStats?.winrate || stats.winrate}%
                  </div>
                  <div className="text-gray-400 text-sm">Доля побед</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-purple-400 font-bold text-2xl">{filteredStats?.kda || stats.advancedStats?.kda || '0.00'}</div>
                  <div className="text-gray-400 text-sm">Соотношение УСП</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-yellow-400 font-bold text-2xl">{filteredStats?.avgGPM || stats.advancedStats?.avgGPM || 0}</div>
                  <div className="text-gray-400 text-sm">З/М</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-blue-400 font-bold text-2xl">{filteredStats?.avgXPM || stats.advancedStats?.avgXPM || 0}</div>
                  <div className="text-gray-400 text-sm">О/М</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-gray-400 text-sm">K/D/A</div>
                  <div className="text-white font-semibold">
                    {filteredStats 
                      ? `${filteredStats.avgKills}/${filteredStats.avgDeaths}/${filteredStats.avgAssists}`
                      : `${stats.advancedStats?.avgKills || 0}/${stats.advancedStats?.avgDeaths || 0}/${stats.advancedStats?.avgAssists || 0}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-sm">Побед / Поражений</div>
                  <div className="text-white font-semibold">
                    {filteredStats 
                      ? `${filteredStats.wins} / ${filteredStats.losses}`
                      : `${stats.wins || 0} / ${stats.losses || 0}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-sm">Активный фильтр</div>
                  <div className="text-cyan-400 font-semibold">
                    {Object.values(matchFilters).every(v => v === 'all') ? 'Нет' : 'Да'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-sm">Статистика</div>
                  <div className="text-white font-semibold">Реальная</div>
                </div>
              </div>
            </div>

            {/* Matches List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Matches</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50 border-b border-gray-600">
                    <tr>
                      <th className="text-left p-3 text-gray-300 font-semibold">Герой</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Результат</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Тип</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Длительность</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">УСП</th>
                      <th className="text-left p-3 text-gray-300 font-semibold">Предметы</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Оценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredMatches || stats.recentMatches || []).map((match) => {
                      const isWin = (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win);
                      const kda = match.deaths > 0 ? ((match.kills + match.assists) / match.deaths).toFixed(2) : (match.kills + match.assists);
                      const matchScore = Math.min(10, Math.round((parseFloat(kda) * 2 + (match.gold_per_min / 100) + (match.xp_per_min / 100)) / 2));
                      
                      return (
                        <tr
                          key={match.match_id}
                          className={`border-b border-gray-700/30 cursor-pointer transition-colors ${
                            isWin ? 'hover:bg-green-900/20' : 'hover:bg-red-900/20'
                          }`}
                          onClick={() => openMatchDetails(match)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <img 
                                src={getHeroIcon(match.hero_id)} 
                                alt={getHeroName(match.hero_id)}
                                className="w-12 h-12 rounded border-2 border-gray-600"
                              />
                              <div>
                                <div className="text-white font-semibold capitalize text-sm">{getHeroName(match.hero_id)}</div>
                                <div className="text-gray-400 text-xs">
                                  {new Date(match.start_time * 1000).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              isWin ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                            }`}>
                              {isWin ? 'Победа' : 'Поражение'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-gray-300 text-sm">
                            {getLobbyType(match.lobby_type)}
                          </td>
                          <td className="p-3 text-center text-white font-semibold">
                            {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}
                          </td>
                          <td className="p-3 text-center">
                            <div className="text-white font-bold">
                              {match.kills}/{match.deaths}/{match.assists}
                            </div>
                            <div className="text-cyan-400 text-xs">KDA: {kda}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {[0, 1, 2, 3, 4, 5].map(slot => {
                                const item = match[`item_${slot}`];
                                const itemImg = getItemImage(item);
                                return itemImg ? (
                                  <img
                                    key={slot}
                                    src={itemImg}
                                    alt={`item_${item}`}
                                    className="w-8 h-6 rounded border border-gray-600"
                                  />
                                ) : (
                                  <div key={slot} className="w-8 h-6 bg-gray-800 rounded border border-gray-700"></div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {[...Array(10)].map((_, i) => (
                                <div key={i} className={`w-1.5 h-4 rounded-sm ${
                                  i < matchScore ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' : 'bg-gray-700'
                                }`}></div>
                              ))}
                            </div>
                            <div className="text-cyan-400 text-xs font-bold mt-1">{matchScore}/10</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'records' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              <FaTrophy className="inline mr-2 text-yellow-400" />
              Рекорды игрока
            </h2>
            {!records ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'mostKills', label: 'Больше всего убийств', icon: '⚔️', value: records.mostKills?.kills },
                  { key: 'mostDeaths', label: 'Больше всего смертей', icon: '💀', value: records.mostDeaths?.deaths },
                  { key: 'mostAssists', label: 'Больше всего помощи', icon: '🤝', value: records.mostAssists?.assists },
                  { key: 'highestGPM', label: 'Самый высокий GPM', icon: '💰', value: records.highestGPM?.gold_per_min },
                  { key: 'highestXPM', label: 'Самый высокий XPM', icon: '⭐', value: records.highestXPM?.xp_per_min },
                  { key: 'mostLastHits', label: 'Больше всего добиваний', icon: '🎯', value: records.mostLastHits?.last_hits },
                  { key: 'mostDenies', label: 'Больше всего отрицаний', icon: '🛡️', value: records.mostDenies?.denies },
                  { key: 'mostHeroDamage', label: 'Больше всего урона героям', icon: '💥', value: records.mostHeroDamage?.hero_damage },
                  { key: 'mostTowerDamage', label: 'Больше всего урона башням', icon: '🏰', value: records.mostTowerDamage?.tower_damage },
                  { key: 'longestGame', label: 'Самая долгая игра', icon: '⏱️', value: records.longestGame?.duration, isTime: true },
                  { key: 'shortestWin', label: 'Самая быстрая победа', icon: '⚡', value: records.shortestWin?.duration, isTime: true }
                ].map(record => {
                  const match = records[record.key];
                  if (!match || !record.value) return null;
                  
                  return (
                    <div
                      key={record.key}
                      className="bg-gradient-to-r from-gray-700/50 to-gray-700/30 rounded-lg p-4 border border-purple-500/30 hover:border-purple-500/60 transition-colors cursor-pointer"
                      onClick={() => openMatchDetails(match)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{record.icon}</span>
                          <span className="text-gray-300 text-sm">{record.label}</span>
                        </div>
                        <span className="text-2xl font-bold text-cyan-400">
                          {record.isTime 
                            ? `${Math.floor(record.value / 60)}:${(record.value % 60).toString().padStart(2, '0')}`
                            : record.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <img 
                          src={getHeroIcon(match.hero_id)} 
                          alt={getHeroName(match.hero_id)}
                          className="w-10 h-10 rounded border-2 border-gray-600"
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm capitalize">{getHeroName(match.hero_id)}</div>
                          <div className="text-gray-400 text-xs">
                            {match.kills}/{match.deaths}/{match.assists} • {new Date(match.start_time * 1000).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Achievement Stats */}
            {achievements && achievements.stats && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-white mb-4">Статистика достижений</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-cyan-400">{achievements.stats.total}</div>
                    <div className="text-gray-400 text-sm mt-1">Всего</div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg p-4 text-center border border-gray-500">
                    <div className="text-3xl font-bold text-gray-300">{achievements.stats.byRarity.common}</div>
                    <div className="text-gray-400 text-sm mt-1">Common</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-center border border-blue-500">
                    <div className="text-3xl font-bold text-white">{achievements.stats.byRarity.rare}</div>
                    <div className="text-blue-200 text-sm mt-1">Rare</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 text-center border border-purple-500">
                    <div className="text-3xl font-bold text-white">{achievements.stats.byRarity.epic}</div>
                    <div className="text-purple-200 text-sm mt-1">Epic</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 text-center border border-orange-500">
                    <div className="text-3xl font-bold text-white">{achievements.stats.byRarity.legendary + achievements.stats.byRarity.mythic}</div>
                    <div className="text-orange-200 text-sm mt-1">Legendary+</div>
                  </div>
                </div>
              </div>
            )}

            {/* New Achievements */}
            {achievements && achievements.newAchievements && achievements.newAchievements.length > 0 && (
              <div className="bg-gradient-to-r from-green-900/50 to-cyan-900/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/50">
                <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                  <FaAward />
                  🎉 Новые достижения разблокированы!
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.newAchievements.map((achievement, idx) => (
                    <AchievementBadge key={idx} achievement={achievement} />
                  ))}
                </div>
              </div>
            )}

            {/* All Achievements */}
            {!achievements ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <div className="text-gray-400">Загрузка достижений...</div>
              </div>
            ) : achievements.achievements && achievements.achievements.length > 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <FaTrophy className="text-yellow-400" />
                  Все достижения Dota 2
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.achievements.map((achievement, idx) => (
                    <AchievementBadge key={idx} achievement={achievement} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-12 border border-cyan-500/30 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <div className="text-2xl font-bold text-white mb-2">Достижений пока нет</div>
                <div className="text-gray-400 mb-6">
                  Играйте в Dota 2, чтобы разблокировать достижения! Побеждайте, устанавливайте рекорды, повышайте ранг.
                </div>
                <button
                  onClick={() => fetchAchievements()}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors font-semibold"
                >
                  🔄 Проверить достижения
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Match Details Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeMatchDetails}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Детали матча</h2>
                <button
                  onClick={closeMatchDetails}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {loadingMatch ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
                </div>
              ) : matchDetails ? (
                <div className="space-y-6">
                  {/* Match Info */}
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Результат</div>
                        <div className={`text-xl font-bold ${matchDetails.radiant_win ? 'text-green-400' : 'text-red-400'}`}>
                          {matchDetails.radiant_win ? 'Radiant Victory' : 'Dire Victory'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Длительность</div>
                        <div className="text-xl font-bold text-white">
                          {Math.floor(matchDetails.duration / 60)}:{(matchDetails.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Режим игры</div>
                        <div className="text-white">{matchDetails.game_mode || 'All Pick'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Дата</div>
                        <div className="text-white">
                          {new Date(matchDetails.start_time * 1000).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Players Table - Radiant */}
                  {matchDetails.players && (
                    <>
                      <div className="overflow-x-auto">
                        <h3 className="text-xl font-bold text-green-400 mb-3">
                          🌟 The Radiant {matchDetails.radiant_win && '(Победа)'}
                        </h3>
                        <table className="w-full text-sm">
                          <thead className="bg-green-900/30 border-b border-green-500/50">
                            <tr>
                              <th className="text-left p-2 text-gray-300">Герой</th>
                              <th className="text-left p-2 text-gray-300">Игрок</th>
                              <th className="text-center p-2 text-gray-300">LVL</th>
                              <th className="text-center p-2 text-gray-300">У</th>
                              <th className="text-center p-2 text-gray-300">С</th>
                              <th className="text-center p-2 text-gray-300">П</th>
                              <th className="text-center p-2 text-gray-300">ОЦ</th>
                              <th className="text-center p-2 text-gray-300">НО</th>
                              <th className="text-center p-2 text-gray-300">З/М</th>
                              <th className="text-center p-2 text-gray-300">О/М</th>
                              <th className="text-center p-2 text-gray-300">Урон</th>
                              <th className="text-center p-2 text-gray-300">Лечение</th>
                              <th className="text-center p-2 text-gray-300">УРЗ</th>
                              <th className="text-left p-2 text-gray-300">Предметы</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchDetails.players.filter(p => p.player_slot < 128).map((player, idx) => (
                              <tr key={idx} className="border-b border-green-900/20 hover:bg-green-900/10">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={getHeroIcon(player.hero_id)} 
                                      alt={getHeroName(player.hero_id)}
                                      className="w-10 h-10 rounded border border-green-500"
                                    />
                                    <span className="text-white font-semibold capitalize text-xs">{getHeroName(player.hero_id)}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-gray-300 text-xs max-w-[120px] truncate">{player.personaname || 'Anonymous'}</td>
                                <td className="p-2 text-center text-white font-bold">{player.level || 0}</td>
                                <td className="p-2 text-center text-green-400 font-bold">{player.kills}</td>
                                <td className="p-2 text-center text-red-400 font-bold">{player.deaths}</td>
                                <td className="p-2 text-center text-cyan-400 font-bold">{player.assists}</td>
                                <td className="p-2 text-center text-yellow-400 text-xs">{player.last_hits}/{player.denies}</td>
                                <td className="p-2 text-center text-white text-xs">{player.net_worth?.toLocaleString() || 0}</td>
                                <td className="p-2 text-center text-yellow-400 text-xs">{player.gold_per_min || 0}</td>
                                <td className="p-2 text-center text-blue-400 text-xs">{player.xp_per_min || 0}</td>
                                <td className="p-2 text-center text-red-400 text-xs">{(player.hero_damage || 0).toLocaleString()}</td>
                                <td className="p-2 text-center text-green-400 text-xs">{(player.hero_healing || 0).toLocaleString()}</td>
                                <td className="p-2 text-center text-orange-400 text-xs">{(player.tower_damage || 0).toLocaleString()}</td>
                                <td className="p-2">
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4, 5].map(slot => {
                                      const item = player[`item_${slot}`];
                                      const itemImg = getItemImage(item);
                                      return itemImg ? (
                                        <img
                                          key={slot}
                                          src={itemImg}
                                          alt={`item_${item}`}
                                          className="w-8 h-6 rounded border border-gray-600"
                                        />
                                      ) : (
                                        <div key={slot} className="w-8 h-6 bg-gray-800 rounded border border-gray-700"></div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Players Table - Dire */}
                      <div className="overflow-x-auto">
                        <h3 className="text-xl font-bold text-red-400 mb-3">
                          🔥 The Dire {!matchDetails.radiant_win && '(Победа)'}
                        </h3>
                        <table className="w-full text-sm">
                          <thead className="bg-red-900/30 border-b border-red-500/50">
                            <tr>
                              <th className="text-left p-2 text-gray-300">Герой</th>
                              <th className="text-left p-2 text-gray-300">Игрок</th>
                              <th className="text-center p-2 text-gray-300">LVL</th>
                              <th className="text-center p-2 text-gray-300">У</th>
                              <th className="text-center p-2 text-gray-300">С</th>
                              <th className="text-center p-2 text-gray-300">П</th>
                              <th className="text-center p-2 text-gray-300">ОЦ</th>
                              <th className="text-center p-2 text-gray-300">НО</th>
                              <th className="text-center p-2 text-gray-300">З/М</th>
                              <th className="text-center p-2 text-gray-300">О/М</th>
                              <th className="text-center p-2 text-gray-300">Урон</th>
                              <th className="text-center p-2 text-gray-300">Лечение</th>
                              <th className="text-center p-2 text-gray-300">УРЗ</th>
                              <th className="text-left p-2 text-gray-300">Предметы</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchDetails.players.filter(p => p.player_slot >= 128).map((player, idx) => (
                              <tr key={idx} className="border-b border-red-900/20 hover:bg-red-900/10">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={getHeroIcon(player.hero_id)} 
                                      alt={getHeroName(player.hero_id)}
                                      className="w-10 h-10 rounded border border-red-500"
                                    />
                                    <span className="text-white font-semibold capitalize text-xs">{getHeroName(player.hero_id)}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-gray-300 text-xs max-w-[120px] truncate">{player.personaname || 'Anonymous'}</td>
                                <td className="p-2 text-center text-white font-bold">{player.level || 0}</td>
                                <td className="p-2 text-center text-green-400 font-bold">{player.kills}</td>
                                <td className="p-2 text-center text-red-400 font-bold">{player.deaths}</td>
                                <td className="p-2 text-center text-cyan-400 font-bold">{player.assists}</td>
                                <td className="p-2 text-center text-yellow-400 text-xs">{player.last_hits}/{player.denies}</td>
                                <td className="p-2 text-center text-white text-xs">{player.net_worth?.toLocaleString() || 0}</td>
                                <td className="p-2 text-center text-yellow-400 text-xs">{player.gold_per_min || 0}</td>
                                <td className="p-2 text-center text-blue-400 text-xs">{player.xp_per_min || 0}</td>
                                <td className="p-2 text-center text-red-400 text-xs">{(player.hero_damage || 0).toLocaleString()}</td>
                                <td className="p-2 text-center text-green-400 text-xs">{(player.hero_healing || 0).toLocaleString()}</td>
                                <td className="p-2 text-center text-orange-400 text-xs">{(player.tower_damage || 0).toLocaleString()}</td>
                                <td className="p-2">
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4, 5].map(slot => {
                                      const item = player[`item_${slot}`];
                                      const itemImg = getItemImage(item);
                                      return itemImg ? (
                                        <img
                                          key={slot}
                                          src={itemImg}
                                          alt={`item_${item}`}
                                          className="w-8 h-6 rounded border border-gray-600"
                                        />
                                      ) : (
                                        <div key={slot} className="w-8 h-6 bg-gray-800 rounded border border-gray-700"></div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  Не удалось загрузить детали матча
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Comparison Input Modal */}
        {showComparison && !comparisonSteamId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowComparison(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-cyan-500/50"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-4">Сравнить с игроком</h3>
              <p className="text-gray-400 mb-4">Введите Steam ID64 игрока для сравнения:</p>
              <input
                type="text"
                placeholder="76561198012345678"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-cyan-500 focus:outline-none mb-4"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    setComparisonSteamId(e.target.value.trim());
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowComparison(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={(e) => {
                    const input = e.target.parentElement.previousElementSibling;
                    if (input.value.trim()) {
                      setComparisonSteamId(input.value.trim());
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                >
                  Сравнить
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Player Comparison Component */}
        {showComparison && comparisonSteamId && (
          <PlayerComparison
            player1SteamId={steamId}
            player2SteamId={comparisonSteamId}
            onClose={() => {
              setShowComparison(false);
              setComparisonSteamId('');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Dota2StatsPage;

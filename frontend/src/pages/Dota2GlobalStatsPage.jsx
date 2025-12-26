import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaUsers, FaGamepad, FaChartLine, FaFire, FaSearch, FaTimes } from 'react-icons/fa';
import { getRankImage, getRankName, getHeroIcon, getHeroName, formatMMR, getHeroImage } from '../utils/dota2Helpers';

const Dota2GlobalStatsPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [heroStats, setHeroStats] = useState([]);
  const [globalMatches, setGlobalMatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [heroFilter, setHeroFilter] = useState('all');
  const [selectedHero, setSelectedHero] = useState(null);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeTab === 'heroes') {
      fetchHeroStats();
    } else if (activeTab === 'matches') {
      fetchGlobalMatches();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch('/api/dota2/global/leaderboard', { headers });
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.players || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
    setLoading(false);
  };

  const fetchHeroStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch('/api/dota2/global/hero-stats', { headers });
      const data = await response.json();
      if (data.success) {
        setHeroStats(data.heroes || []);
      }
    } catch (err) {
      console.error('Failed to fetch hero stats:', err);
    }
    setLoading(false);
  };

  const fetchGlobalMatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch('/api/dota2/global/recent-matches', { headers });
      const data = await response.json();
      if (data.success) {
        setGlobalMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Failed to fetch global matches:', err);
    }
    setLoading(false);
  };

  const searchPlayers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`/api/dota2/global/search?q=${encodeURIComponent(searchQuery)}`, { headers });
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.players || []);
      }
    } catch (err) {
      console.error('Failed to search players:', err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaTrophy className="text-yellow-400" />
            Глобальная статистика Dota 2
          </h1>
          <p className="text-gray-400">Лучшие игроки и герои со всего мира</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
          >
            <div className="flex items-center justify-between">
              <FaUsers className="text-3xl text-cyan-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Активных игроков</div>
                <div className="text-2xl font-bold text-white">11M+</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <FaGamepad className="text-3xl text-green-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Матчей сегодня</div>
                <div className="text-2xl font-bold text-white">500K+</div>
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
              <FaChartLine className="text-3xl text-purple-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Средний MMR</div>
                <div className="text-2xl font-bold text-white">2,250</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <FaFire className="text-3xl text-orange-400" />
              <div className="text-right">
                <div className="text-gray-400 text-sm">Популярных героев</div>
                <div className="text-2xl font-bold text-white">138</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск игрока по никнейму или Steam ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={searchPlayers}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors font-semibold"
            >
              Найти
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('heroes')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'heroes'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⚔️ Статистика героев
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎮 Глобальные матчи
          </button>
          <button
            onClick={() => setActiveTab('regions')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'regions'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌍 Регионы
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <>
            {activeTab === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  🏆 Top 100 Immortal Players
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 border-b border-gray-600">
                      <tr>
                        <th className="text-left p-3 text-gray-300">Место</th>
                        <th className="text-left p-3 text-gray-300">Игрок</th>
                        <th className="text-center p-3 text-gray-300">Ранг</th>
                        <th className="text-center p-3 text-gray-300">MMR</th>
                        <th className="text-center p-3 text-gray-300">Побед</th>
                        <th className="text-center p-3 text-gray-300">Поражений</th>
                        <th className="text-center p-3 text-gray-300">Винрейт</th>
                        <th className="text-center p-3 text-gray-300">Регион</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length > 0 ? (
                        leaderboard.map((player, index) => (
                          <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                            <td className="p-3">
                              <div className={`font-bold text-lg ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-300' :
                                index === 2 ? 'text-orange-400' :
                                'text-white'
                              }`}>
                                #{player.rank || index + 1}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {player.avatar && (
                                  <img 
                                    src={player.avatar} 
                                    alt={player.name}
                                    className="w-10 h-10 rounded-full border-2 border-cyan-500"
                                  />
                                )}
                                <div>
                                  <div className="text-white font-semibold">{player.name || 'Anonymous'}</div>
                                  <div className="text-gray-400 text-sm">{player.team_name || 'No Team'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {player.rank_tier && (
                                <div className="flex items-center justify-center gap-2">
                                  <img 
                                    src={getRankImage(player.rank_tier)} 
                                    alt={getRankName(player.rank_tier)}
                                    className="w-8 h-8"
                                  />
                                  <span className="text-gray-300 text-sm">{getRankName(player.rank_tier)}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-cyan-400 font-bold text-lg">{formatMMR(player.mmr || 0)}</span>
                            </td>
                            <td className="p-3 text-center text-green-400 font-semibold">{player.wins || 0}</td>
                            <td className="p-3 text-center text-red-400 font-semibold">{player.losses || 0}</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${
                                (player.wins / (player.wins + player.losses) * 100) >= 50 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {((player.wins / (player.wins + player.losses)) * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-center text-gray-300">{player.country || 'Unknown'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-gray-400">
                            <div className="text-4xl mb-2">🔍</div>
                            <div>Данные временно недоступны</div>
                            <div className="text-sm mt-2">OpenDota API может быть перегружен, попробуйте позже</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'heroes' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    ⚔️ Глобальная статистика героев
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHeroFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        heroFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Все герои
                    </button>
                    <button
                      onClick={() => setHeroFilter('popular')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        heroFilter === 'popular' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🔥 Популярные
                    </button>
                    <button
                      onClick={() => setHeroFilter('pro')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        heroFilter === 'pro' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      ⭐ Pro-сцена
                    </button>
                    <button
                      onClick={() => setHeroFilter('winrate')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        heroFilter === 'winrate' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      📊 Винрейт
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {heroStats.length > 0 ? (
                    (() => {
                      let filteredHeroes = [...heroStats];
                      if (heroFilter === 'popular') {
                        filteredHeroes.sort((a, b) => b.picks - a.picks);
                      } else if (heroFilter === 'pro') {
                        filteredHeroes.sort((a, b) => b.pro_pick - a.pro_pick);
                      } else if (heroFilter === 'winrate') {
                        filteredHeroes.sort((a, b) => (b.wins / b.picks) - (a.wins / a.picks));
                      }
                      
                      return filteredHeroes.slice(0, 30).map((hero, index) => {
                        const winrate = hero.picks > 0 ? (hero.wins / hero.picks * 100) : 0;
                        const proWinrate = hero.pro_pick > 0 ? (hero.pro_win / hero.pro_pick * 100) : 0;
                        
                        return (
                          <div
                            key={index}
                            onClick={() => setSelectedHero(hero)}
                            className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors border border-gray-600 cursor-pointer hover:border-cyan-500"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={getHeroIcon(hero.hero_id)} 
                                  alt={getHeroName(hero.hero_id)}
                                  className="w-12 h-12 rounded border-2 border-cyan-500"
                                />
                                <div>
                                  <div className="text-white font-semibold capitalize">{getHeroName(hero.hero_id)}</div>
                                  <div className="text-gray-400 text-xs">{hero.picks?.toLocaleString() || 0} picks</div>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-gray-400 text-xs">Pub Винрейт</div>
                                <div className={`font-bold ${winrate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                  {winrate.toFixed(1)}%
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-xs">Pro Винрейт</div>
                                <div className={`font-bold ${proWinrate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                  {proWinrate > 0 ? proWinrate.toFixed(1) + '%' : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-xs">Pro Picks</div>
                                <div className="text-cyan-400 font-bold">{hero.pro_pick || 0}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-xs">Pro Bans</div>
                                <div className="text-orange-400 font-bold">{hero.pro_ban || 0}</div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">⚔️</div>
                      <div>Загрузка статистики героев...</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'matches' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  🎮 Последние публичные матчи
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 border-b border-gray-600">
                      <tr>
                        <th className="text-left p-3 text-gray-300">Номер матча</th>
                        <th className="text-center p-3 text-gray-300">Режим игры</th>
                        <th className="text-center p-3 text-gray-300">Результат</th>
                        <th className="text-center p-3 text-gray-300">Длительность</th>
                        <th className="text-left p-3 text-gray-300">Силы Света</th>
                        <th className="text-left p-3 text-gray-300">Силы Тьмы</th>
                        <th className="text-center p-3 text-gray-300">Ср. MMR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalMatches.length > 0 ? (
                        globalMatches.map((match, index) => {
                          const gameModes = {
                            0: 'All Pick',
                            1: 'Captains Mode',
                            2: 'Random Draft',
                            3: 'Single Draft',
                            4: 'All Random',
                            5: 'Intro',
                            22: 'Ranked All Pick',
                            23: 'Turbo'
                          };
                          
                          return (
                            <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                              <td className="p-3">
                                <div className="text-cyan-400 font-mono text-sm">{match.match_id}</div>
                              </td>
                              <td className="p-3 text-center text-gray-300 text-sm">
                                {gameModes[match.game_mode] || `Mode ${match.game_mode}`}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                                  match.radiant_win ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                }`}>
                                  {match.radiant_win ? 'Radiant Win' : 'Dire Win'}
                                </span>
                              </td>
                              <td className="p-3 text-center text-white">
                                {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  {(() => {
                                    const radiantTeam = Array.isArray(match.radiant_team) 
                                      ? match.radiant_team 
                                      : (typeof match.radiant_team === 'string' ? match.radiant_team.split(',') : []);
                                    return radiantTeam.slice(0, 5).map((heroId, idx) => (
                                      <img
                                        key={idx}
                                        src={getHeroIcon(parseInt(heroId))}
                                        alt={getHeroName(parseInt(heroId))}
                                        className="w-8 h-8 rounded border border-green-500"
                                        title={getHeroName(parseInt(heroId))}
                                      />
                                    ));
                                  })()}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  {(() => {
                                    const direTeam = Array.isArray(match.dire_team) 
                                      ? match.dire_team 
                                      : (typeof match.dire_team === 'string' ? match.dire_team.split(',') : []);
                                    return direTeam.slice(0, 5).map((heroId, idx) => (
                                      <img
                                        key={idx}
                                        src={getHeroIcon(parseInt(heroId))}
                                        alt={getHeroName(parseInt(heroId))}
                                        className="w-8 h-8 rounded border border-red-500"
                                        title={getHeroName(parseInt(heroId))}
                                      />
                                    ));
                                  })()}
                                </div>
                              </td>
                              <td className="p-3 text-center text-cyan-400 font-semibold">
                                {match.avg_mmr || 'N/A'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-gray-400">
                            <div className="text-4xl mb-2">🎮</div>
                            <div>Загрузка последних матчей...</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'regions' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  🌍 Статистика по регионам
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { region: 'Europe West', players: '2.4M', avgMMR: 2420, bgClass: 'bg-gradient-to-r from-cyan-900/30 to-cyan-900/10', borderClass: 'border-cyan-500/30', textClass: 'text-cyan-400' },
                    { region: 'Europe East', players: '1.8M', avgMMR: 2380, bgClass: 'bg-gradient-to-r from-blue-900/30 to-blue-900/10', borderClass: 'border-blue-500/30', textClass: 'text-blue-400' },
                    { region: 'US East', players: '1.5M', avgMMR: 2340, bgClass: 'bg-gradient-to-r from-green-900/30 to-green-900/10', borderClass: 'border-green-500/30', textClass: 'text-green-400' },
                    { region: 'US West', players: '1.2M', avgMMR: 2310, bgClass: 'bg-gradient-to-r from-purple-900/30 to-purple-900/10', borderClass: 'border-purple-500/30', textClass: 'text-purple-400' },
                    { region: 'South America', players: '1.1M', avgMMR: 2280, bgClass: 'bg-gradient-to-r from-yellow-900/30 to-yellow-900/10', borderClass: 'border-yellow-500/30', textClass: 'text-yellow-400' },
                    { region: 'Southeast Asia', players: '3.2M', avgMMR: 2250, bgClass: 'bg-gradient-to-r from-red-900/30 to-red-900/10', borderClass: 'border-red-500/30', textClass: 'text-red-400' },
                    { region: 'China', players: '4.5M', avgMMR: 2460, bgClass: 'bg-gradient-to-r from-orange-900/30 to-orange-900/10', borderClass: 'border-orange-500/30', textClass: 'text-orange-400' },
                    { region: 'Russia', players: '1.6M', avgMMR: 2390, bgClass: 'bg-gradient-to-r from-pink-900/30 to-pink-900/10', borderClass: 'border-pink-500/30', textClass: 'text-pink-400' },
                  ].map((region, index) => (
                    <div
                      key={index}
                      className={`${region.bgClass} rounded-lg p-6 border ${region.borderClass}`}
                    >
                      <h3 className="text-xl font-bold text-white mb-4">{region.region}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-400 text-sm">Игроков</div>
                          <div className={`text-2xl font-bold ${region.textClass}`}>{region.players}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Средний MMR</div>
                          <div className="text-2xl font-bold text-white">{region.avgMMR}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Hero Details Modal */}
        {selectedHero && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedHero(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <img 
                    src={getHeroIcon(selectedHero.hero_id)} 
                    alt={getHeroName(selectedHero.hero_id)}
                    className="w-16 h-16 rounded border-2 border-cyan-500"
                  />
                  <span className="capitalize">{getHeroName(selectedHero.hero_id)}</span>
                </h2>
                <button
                  onClick={() => setSelectedHero(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Hero Portrait */}
              <div className="mb-6">
                <img 
                  src={getHeroImage(selectedHero.hero_id)} 
                  alt={getHeroName(selectedHero.hero_id)}
                  className="w-full h-64 object-cover rounded-lg border-2 border-cyan-500/50"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-1">Pub Picks</div>
                  <div className="text-2xl font-bold text-cyan-400">{selectedHero.picks?.toLocaleString() || 0}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-1">Pub Винрейт</div>
                  <div className={`text-2xl font-bold ${
                    (selectedHero.wins / selectedHero.picks * 100) >= 50 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {((selectedHero.wins / selectedHero.picks) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-1">Pro Picks</div>
                  <div className="text-2xl font-bold text-purple-400">{selectedHero.pro_pick || 0}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-1">Pro Винрейт</div>
                  <div className={`text-2xl font-bold ${
                    selectedHero.pro_pick > 0 && (selectedHero.pro_win / selectedHero.pro_pick * 100) >= 50 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedHero.pro_pick > 0 ? ((selectedHero.pro_win / selectedHero.pro_pick) * 100).toFixed(1) + '%' : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">📊 Детальная статистика</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm">Pub игр сыграно</div>
                      <div className="text-white font-bold">{selectedHero.picks?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Pub побед</div>
                      <div className="text-green-400 font-bold">{selectedHero.wins?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Pro игр сыграно</div>
                      <div className="text-white font-bold">{selectedHero.pro_pick || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Pro побед</div>
                      <div className="text-green-400 font-bold">{selectedHero.pro_win || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Pro банов</div>
                      <div className="text-orange-400 font-bold">{selectedHero.pro_ban || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Тип атаки</div>
                      <div className="text-cyan-400 font-bold capitalize">{selectedHero.attack_type || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {selectedHero.roles && selectedHero.roles.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-3">🎯 Роли</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedHero.roles.map((role, idx) => (
                        <span key={idx} className="px-3 py-1 bg-cyan-900/50 text-cyan-400 rounded-full text-sm font-semibold">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-3">📈 Популярность</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Pub популярность</span>
                        <span className="text-cyan-400 font-semibold">
                          {((selectedHero.picks / heroStats.reduce((sum, h) => sum + h.picks, 0)) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${((selectedHero.picks / heroStats.reduce((sum, h) => sum + h.picks, 0)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    {selectedHero.pro_pick > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Pro популярность (picks)</span>
                          <span className="text-purple-400 font-semibold">{selectedHero.pro_pick}</span>
                        </div>
                        <div className="bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                            style={{ width: `${Math.min((selectedHero.pro_pick / 100) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {selectedHero.pro_ban > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Pro популярность (bans)</span>
                          <span className="text-orange-400 font-semibold">{selectedHero.pro_ban}</span>
                        </div>
                        <div className="bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                            style={{ width: `${Math.min((selectedHero.pro_ban / 100) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dota2GlobalStatsPage;

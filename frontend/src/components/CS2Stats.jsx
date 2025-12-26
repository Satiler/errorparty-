import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaSkull, FaHandshake, FaBullseye, FaFire, FaStar, FaChartLine, FaGamepad, FaClock, FaBomb, FaInfoCircle, FaBook } from 'react-icons/fa';
import axios from 'axios';

const CS2Stats = ({ steamId }) => {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCS2Data();
  }, [steamId]);

  const fetchCS2Data = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Получаем общую статистику из Steam API
      const statsRes = await axios.get(`/api/cs2/stats/${steamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // Получаем историю матчей из нашей БД
      const matchesRes = await axios.get(`/api/cs2/matches/${steamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (matchesRes.data.success) {
        setMatches(matchesRes.data.matches);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching CS2 data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">Нет данных CS2</p>
      </div>
    );
  }

  const winRate = stats.totalMatchesPlayed > 0 
    ? ((stats.totalMatchesWon / stats.totalMatchesPlayed) * 100).toFixed(1)
    : 0;

  const kd = stats.totalDeaths > 0 
    ? (stats.totalKills / stats.totalDeaths).toFixed(2)
    : stats.totalKills.toFixed(2);

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-500/20 rounded-lg">
            <FaChartLine className="w-6 h-6 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">CS2 Статистика</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Матчи */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaGamepad className="text-blue-400" />
              <span className="text-gray-400 text-sm">Матчи</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalMatchesPlayed}</div>
            <div className="text-sm text-green-400">{stats.totalMatchesWon} побед</div>
          </div>

          {/* Винрейт */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaTrophy className="text-yellow-400" />
              <span className="text-gray-400 text-sm">Winrate</span>
            </div>
            <div className="text-2xl font-bold text-white">{winRate}%</div>
            <div className="text-sm text-gray-400">{stats.totalMatchesWon}/{stats.totalMatchesPlayed}</div>
          </div>

          {/* K/D */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaSkull className="text-red-400" />
              <span className="text-gray-400 text-sm">K/D Ratio</span>
            </div>
            <div className="text-2xl font-bold text-white">{kd}</div>
            <div className="text-sm text-gray-400">{stats.totalKills}/{stats.totalDeaths}</div>
          </div>

          {/* Headshots */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaBullseye className="text-orange-400" />
              <span className="text-gray-400 text-sm">HS%</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.headshotPercentage}%</div>
            <div className="text-sm text-gray-400">{stats.totalHeadshots} HS</div>
          </div>

          {/* MVPs */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaStar className="text-purple-400" />
              <span className="text-gray-400 text-sm">MVPs</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalMVPs}</div>
          </div>

          {/* Урон */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaFire className="text-red-500" />
              <span className="text-gray-400 text-sm">Урон</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalDamage.toLocaleString()}</div>
          </div>

          {/* Время игры */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaClock className="text-cyan-400" />
              <span className="text-gray-400 text-sm">Время</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.hoursPlayed}ч</div>
          </div>

          {/* Бомбы */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaBomb className="text-yellow-500" />
              <span className="text-gray-400 text-sm">Бомбы</span>
            </div>
            <div className="text-xl font-bold text-white">{stats.totalPlantedBombs}/{stats.totalDefusedBombs}</div>
            <div className="text-xs text-gray-400">Установок/Разминирований</div>
          </div>
        </div>
      </motion.div>

      {/* История матчей */}
      {matches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-xl font-bold text-white mb-4">История матчей</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Карта</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">Результат</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">K/D/A</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">HS%</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">ADR</th>
                  <th className="text-center py-3 px-2 text-gray-400 font-medium">MVP</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 10).map((match, index) => (
                  <motion.tr
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="font-medium text-white">{match.map || 'Unknown'}</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        match.isWin 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {match.isWin ? 'Победа' : 'Поражение'} {match.roundsWon}/{match.roundsPlayed}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-white font-medium">
                        {match.kills}/{match.deaths}/{match.assists}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-orange-400 font-medium">
                        {match.headshotPercentage?.toFixed(0) || 0}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-cyan-400 font-medium">
                        {match.adr?.toFixed(0) || 0}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      {match.mvps > 0 && (
                        <span className="text-yellow-400 flex items-center justify-center gap-1">
                          <FaStar className="w-3 h-3" />
                          {match.mvps}
                        </span>
                      )}
                    </td>
                    <td className="text-right py-3 px-2 text-gray-400 text-xs">
                      {new Date(match.playedAt).toLocaleDateString('ru-RU')}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {matches.length > 10 && (
            <div className="mt-4 text-center">
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                Показать все матчи ({matches.length})
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Инструкция по настройке GSI */}
      {matches.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-500/30"
        >
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FaInfoCircle className="text-blue-400" />
            Автоматическая загрузка статистики
          </h3>
          <p className="text-gray-300 mb-4">
            Настрой Game State Integration для автоматической загрузки статистики после каждого матча, как на csstats.gg
          </p>
          <a 
            href="/docs/GSI_SETUP.md" 
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FaBook />
            Инструкция по настройке
          </a>
        </motion.div>
      )}
    </div>
  );
};

export default CS2Stats;

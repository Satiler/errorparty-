import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const LiveMatchDetails = ({ match, onClose }) => {
  if (!match || !match.gsiData) return null;

  const gsiData = match.gsiData;
  const allPlayers = gsiData.allplayers || {};
  
  // Проверка наличия данных о всех игроках
  const hasPlayerData = Object.keys(allPlayers).length > 0;
  
  console.log('[LiveMatchDetails] GSI Data:', {
    hasGsiData: !!gsiData,
    allPlayersCount: Object.keys(allPlayers).length,
    allPlayers: allPlayers
  });
  
  // Разделяем игроков по командам
  const ctPlayers = [];
  const tPlayers = [];
  
  Object.entries(allPlayers).forEach(([slot, player]) => {
    const playerStats = {
      name: player.name || `Player ${slot}`,
      steamId: player.steamid || '',
      kills: player.match_stats?.kills || 0,
      deaths: player.match_stats?.deaths || 0,
      assists: player.match_stats?.assists || 0,
      mvps: player.match_stats?.mvps || 0,
      score: player.match_stats?.score || 0,
      health: player.state?.health || 0,
      armor: player.state?.armor || 0,
      money: player.state?.money || 0,
      equipment_value: player.state?.equip_value || 0,
      round_kills: player.state?.round_kills || 0,
      round_killhs: player.state?.round_killhs || 0,
      weapons: player.weapons || {}
    };
    
    if (player.team === 'CT') {
      ctPlayers.push(playerStats);
    } else if (player.team === 'T') {
      tPlayers.push(playerStats);
    }
  });

  // Сортируем по счёту (score)
  ctPlayers.sort((a, b) => b.score - a.score);
  tPlayers.sort((a, b) => b.score - a.score);

  const renderPlayerRow = (player, index) => {
    const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
    const plusMinus = player.kills - player.deaths;
    
    return (
      <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-700/20">
        <td className="p-3">
          <div className="flex items-center gap-2">
            <div className="text-white font-medium">{player.name}</div>
          </div>
        </td>
        <td className="text-center p-3 text-white font-bold">{player.kills}</td>
        <td className="text-center p-3 text-gray-300">{player.deaths}</td>
        <td className="text-center p-3 text-blue-300">{player.assists}</td>
        <td className={`text-center p-3 font-bold ${plusMinus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {plusMinus > 0 ? '+' : ''}{plusMinus}
        </td>
        <td className="text-center p-3">
          <span className={`font-medium ${parseFloat(kd) >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
            {kd}
          </span>
        </td>
        <td className="text-center p-3 text-purple-300">{player.mvps}</td>
        <td className="text-center p-3 text-gray-400">{player.score}</td>
        <td className="text-center p-3">
          <span className={`font-medium ${player.health > 50 ? 'text-green-400' : player.health > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {player.health}
          </span>
        </td>
        <td className="text-center p-3 text-yellow-400">${player.money}</td>
      </tr>
    );
  };

  const ctScore = gsiData.map?.team_ct?.score || 0;
  const tScore = gsiData.map?.team_t?.score || 0;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-7xl w-full mx-auto my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-xl relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <FaTimes size={24} />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <h2 className="text-3xl font-bold text-white">🎮 Live Match</h2>
                </div>
                <p className="text-green-100 text-lg">{match.mapName}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-white">
                  {ctScore} : {tScore}
                </div>
                <div className="text-green-200 text-sm">Раунды</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Если нет данных о всех игроках - показываем статистику игрока */}
            {!hasPlayerData && (
              <div className="space-y-6">
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
                  <div className="text-5xl mb-4">⚠️</div>
                  <div className="text-xl font-bold text-white mb-2">Данные о других игроках недоступны</div>
                  <div className="text-yellow-300 text-sm mb-4">
                    GSI не предоставляет информацию о всех игроках в следующих случаях:
                  </div>
                  <div className="text-gray-300 text-sm space-y-2 max-w-2xl mx-auto text-left">
                    <div>• 🔴 <strong>Режим наблюдателя</strong> - вы наблюдаете за игрой, а не играете</div>
                    <div>• 🔥 <strong>Warmup/Разминка</strong> - матч еще не начался</div>
                    <div>• 🏠 <strong>Offline матч</strong> - игра с ботами или локальная</div>
                    <div>• ⚙️ <strong>Некоторые режимы</strong> - Casual, Arms Race, Wingman могут не передавать данные</div>
                  </div>
                  <div className="mt-4 text-gray-400 text-xs">
                    Полные данные доступны в Competitive и Premier режимах после начала первого раунда
                  </div>
                </div>

                {/* Показываем статистику самого игрока */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">👤</div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Ваша статистика</h3>
                      <div className="text-sm text-gray-400">Личные показатели в текущем матче</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">K/D/A</div>
                      <div className="text-2xl font-bold text-green-400">
                        {match.kills}/{match.deaths}/{match.assists}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">K/D Ratio</div>
                      <div className="text-2xl font-bold text-white">
                        {match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">MVP</div>
                      <div className="text-2xl font-bold text-purple-400">{match.mvps || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Score</div>
                      <div className="text-2xl font-bold text-yellow-400">{match.score || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Health</div>
                      <div className={`text-2xl font-bold ${match.health > 50 ? 'text-green-400' : match.health > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {match.health || 0} HP
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Money</div>
                      <div className="text-2xl font-bold text-green-400">${match.money || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Раунд K/HS</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {match.roundKills || 0}/{match.roundKillhs || 0}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Команда</div>
                      <div className={`text-2xl font-bold ${match.team === 'CT' ? 'text-blue-400' : 'text-orange-400'}`}>
                        {match.team || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CT Team */}
            {hasPlayerData && (
            <>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">CT</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Counter-Terrorists</h3>
                  <div className="text-sm text-gray-400">Раунды: {ctScore}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 border-b border-gray-600">
                    <tr>
                      <th className="text-left p-3 text-gray-300 font-semibold">Игрок</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">K</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">D</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">A</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">+/-</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">K/D</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">MVP</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Score</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">HP</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">💰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctPlayers.map((player, idx) => renderPlayerRow(player, idx))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* T Team */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">T</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Terrorists</h3>
                  <div className="text-sm text-gray-400">Раунды: {tScore}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 border-b border-gray-600">
                    <tr>
                      <th className="text-left p-3 text-gray-300 font-semibold">Игрок</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">K</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">D</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">A</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">+/-</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">K/D</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">MVP</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">Score</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">HP</th>
                      <th className="text-center p-3 text-gray-300 font-semibold">💰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tPlayers.map((player, idx) => renderPlayerRow(player, idx))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}

            {/* Info Banner */}
            <div className={`${hasPlayerData ? 'bg-green-900/20 border-green-500/30' : 'bg-blue-900/20 border-blue-500/30'} border rounded-lg p-4 text-center`}>
              <div className={`${hasPlayerData ? 'text-green-400' : 'text-blue-400'} text-sm`}>
                {hasPlayerData 
                  ? '✅ Live данные обновляются в реальном времени через GSI'
                  : '💡 Для получения статистики всех игроков играйте в Competitive или Premier режиме'
                }
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Последнее обновление: {new Date(match.lastUpdate).toLocaleTimeString('ru-RU')}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800/50 p-4 rounded-b-xl border-t border-gray-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Матч начат: {new Date(match.startedAt).toLocaleString('ru-RU')}
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white font-semibold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LiveMatchDetails;

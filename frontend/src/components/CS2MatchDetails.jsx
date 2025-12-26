import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTrophy, FaSkull, FaCrosshairs, FaFire, FaStar, FaBomb } from 'react-icons/fa';

const CS2MatchDetails = ({ match, onClose }) => {
  if (!match) return null;

  // Extract GSI data if available
  const gsiData = match.gsiData || {};
  const allPlayersGSI = gsiData.allplayers || {};
  
  // Handle both flat array (match.players) and nested structure (match.teams.ct/t.players)
  let allPlayers = [];
  let team1Players = [];
  let team2Players = [];
  let hasDetailedStats = false;

  // Priority 1: GSI allplayers data (most detailed)
  if (Object.keys(allPlayersGSI).length > 0) {
    allPlayers = Object.entries(allPlayersGSI).map(([slot, playerData]) => ({
      name: playerData.name,
      steamId: playerData.match_stats?.steamid || '',
      team: playerData.team?.toLowerCase() || 'spectator',
      kills: playerData.match_stats?.kills || 0,
      deaths: playerData.match_stats?.deaths || 0,
      assists: playerData.match_stats?.assists || 0,
      mvps: playerData.match_stats?.mvps || 0,
      score: playerData.match_stats?.score || 0,
      health: playerData.state?.health || 0,
      armor: playerData.state?.armor || 0,
      money: playerData.state?.money || 0,
      // Calculate additional stats
      headshots: 0, // GSI doesn't track this per player
      damage: 0,
      adr: 0,
      hsPercentage: 0,
      kd: playerData.match_stats?.deaths > 0 ? (playerData.match_stats?.kills / playerData.match_stats?.deaths).toFixed(2) : playerData.match_stats?.kills?.toFixed(2) || '0.00',
      rating: '—',
      kast: '—'
    }));
    
    team1Players = allPlayers.filter(p => p.team === 'ct');
    team2Players = allPlayers.filter(p => p.team === 't');
    hasDetailedStats = team1Players.length > 0 || team2Players.length > 0;
  }
  // Priority 2: Parsed demo data
  else if (match.players && Array.isArray(match.players) && match.players.length > 0) {
    allPlayers = match.players;
    team1Players = allPlayers.filter(p => p.team === 'ct');
    team2Players = allPlayers.filter(p => p.team === 't');
    hasDetailedStats = true;
  } else if (match.teams?.ct?.players?.length > 0 || match.teams?.t?.players?.length > 0) {
    team1Players = match.teams?.ct?.players || [];
    team2Players = match.teams?.t?.players || [];
    hasDetailedStats = true;
  }

  // Calculate team scores
  let team1Score = 0;
  let team2Score = 0;
  
  if (gsiData.map?.team_ct?.score !== undefined && gsiData.map?.team_t?.score !== undefined) {
    team1Score = gsiData.map.team_ct.score;
    team2Score = gsiData.map.team_t.score;
  } else if (match.teams?.ct?.score !== undefined && match.teams?.t?.score !== undefined) {
    team1Score = match.teams.ct.score;
    team2Score = match.teams.t.score;
  } else if (match.roundsWon !== undefined && match.roundsPlayed !== undefined) {
    team1Score = match.roundsWon || 0;
    team2Score = (match.roundsPlayed || 0) - (match.roundsWon || 0);
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-xl relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <FaTimes size={24} />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  🗺️ {match.map || 'Unknown Map'}
                </h2>
                <div className="flex gap-4 text-sm text-white/90">
                  <span>⏱️ {formatDuration(match.duration)}</span>
                  <span>📅 {new Date(match.playedAt).toLocaleDateString('ru-RU')}</span>
                  {match.roundsPlayed > 0 && (
                    <span>🎯 {match.roundsPlayed} раундов</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className={`text-5xl font-bold ${match.isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {team1Score} - {team2Score}
                </div>
                <div className={`text-xl font-semibold ${match.isWin ? 'text-green-300' : 'text-red-300'}`}>
                  {match.isWin ? '🏆 Победа' : '💀 Поражение'}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {match.source === 'gsi' && !hasDetailedStats ? (
              // GSI match - show player's personal stats (no demo needed)
              <div className="text-center py-12">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="text-3xl font-bold text-white">GSI Live Match</div>
                  </div>
                  <p className="text-gray-400 mb-6">
                    ✅ Данные получены через Game State Integration - demo не требуется
                  </p>
                  
                  {/* Player's personal stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-800/50 rounded-lg p-6 border border-green-500/30">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">{match.kills || 0}</div>
                      <div className="text-sm text-gray-400">Kills</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400">{match.deaths || 0}</div>
                      <div className="text-sm text-gray-400">Deaths</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">{match.assists || 0}</div>
                      <div className="text-sm text-gray-400">Assists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">{match.mvps || 0}</div>
                      <div className="text-sm text-gray-400">MVPs</div>
                    </div>
                    
                    {match.headshotPercentage > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-400">{match.headshotPercentage?.toFixed(1)}%</div>
                        <div className="text-sm text-gray-400">Headshot %</div>
                      </div>
                    )}
                    
                    {match.adr > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-cyan-400">{match.adr?.toFixed(1)}</div>
                        <div className="text-sm text-gray-400">ADR</div>
                      </div>
                    )}
                    
                    {match.damage > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400">{match.damage}</div>
                        <div className="text-sm text-gray-400">Total Damage</div>
                      </div>
                    )}
                    
                    {match.headshots > 0 && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-400">{match.headshots}</div>
                        <div className="text-sm text-gray-400">Headshots</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-blue-300">
                      💡 <strong>Подсказка:</strong> Для получения статистики всех игроков используйте Share Code или автосинхронизацию с Auth Token
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasDetailedStats ? (
              // No detailed team/player stats available (demo-based matches)
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {match.demoStatus === 'unavailable' ? '⏰' : '⏳'}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {match.demoStatus === 'unavailable' 
                    ? 'Demo временно недоступен' 
                    : 'Загрузка детальной статистики...'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {match.demoStatus === 'unavailable'
                    ? 'Valve еще не опубликовал demo-файл для этого матча. Автоматическая повторная попытка через несколько часов.'
                    : 'Demo-файл обрабатывается. Это может занять 5-10 минут.'}
                </p>
                <div className={`border rounded-lg p-4 max-w-md mx-auto ${
                  match.demoStatus === 'unavailable' 
                    ? 'bg-yellow-500/20 border-yellow-500/50' 
                    : match.demoStatus === 'failed'
                    ? 'bg-red-500/20 border-red-500/50'
                    : 'bg-blue-500/20 border-blue-500/50'
                }`}>
                  <div className={`text-sm ${
                    match.demoStatus === 'unavailable' 
                      ? 'text-yellow-300' 
                      : match.demoStatus === 'failed'
                      ? 'text-red-300'
                      : 'text-blue-300'
                  }`}>
                    <strong>Статус:</strong> {match.demoStatus === 'pending' && 'Ожидание загрузки'}
                    {match.demoStatus === 'downloading' && 'Загрузка demo...'}
                    {match.demoStatus === 'downloaded' && 'Парсинг данных...'}
                    {match.demoStatus === 'parsing' && 'Извлечение статистики...'}
                    {match.demoStatus === 'unavailable' && '⏰ Ожидание публикации (автоматически загрузится позже)'}
                    {match.demoStatus === 'failed' && '❌ Ошибка обработки'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Team 1 (CT) */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">CT</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Counter-Terrorists</h3>
                      <div className="text-sm text-gray-400">Раунды: {team1Score}</div>
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
                          {match.source === 'gsi' && (
                            <>
                              <th className="text-center p-3 text-gray-300 font-semibold">💰</th>
                              <th className="text-center p-3 text-gray-300 font-semibold">❤️</th>
                            </>
                          )}
                          <th className="text-center p-3 text-gray-300 font-semibold">ADR</th>
                          <th className="text-center p-3 text-gray-300 font-semibold">HS%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team1Players.map((player, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={`https://avatars.akamai.steamstatic.com/${player.steamId}_medium.jpg`}
                                  alt={player.name}
                                  className="w-8 h-8 rounded-full border border-blue-600/50"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect fill="%234B5563" width="32" height="32"/%3E%3Ccircle cx="16" cy="10" r="5" fill="%23B0B8C1"/%3E%3Cpath d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="%23B0B8C1"/%3E%3C/svg%3E';
                                  }}
                                />
                                <span className="text-white font-medium">{player.name}</span>
                              </div>
                            </td>
                            <td className="text-center p-3 text-white font-semibold">{player.kills}</td>
                            <td className="text-center p-3 text-gray-300">{player.deaths}</td>
                            <td className="text-center p-3 text-gray-300">{player.assists}</td>
                            <td className={`text-center p-3 font-semibold ${
                              player.kills - player.deaths > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {player.kills - player.deaths > 0 ? '+' : ''}{player.kills - player.deaths}
                            </td>
                            <td className="text-center p-3 text-white">{player.kd}</td>
                            <td className="text-center p-3 text-yellow-400 font-semibold">
                              {player.mvps > 0 ? `⭐ ${player.mvps}` : '—'}
                            </td>
                            <td className="text-center p-3 text-cyan-400">{player.score || 0}</td>
                            {match.source === 'gsi' && (
                              <>
                                <td className="text-center p-3 text-green-400">${player.money || 0}</td>
                                <td className="text-center p-3 text-red-400">{player.health || 0}</td>
                              </>
                            )}
                            <td className="text-center p-3 text-orange-400">{player.adr}</td>
                            <td className="text-center p-3 text-purple-400">{player.hsPercentage}%</td>
                            <td className="text-center p-3 text-gray-400">{player.kast}</td>
                            <td className={`text-center p-3 font-bold ${
                              parseFloat(player.rating) >= 1.0 ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {player.rating}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Team 2 (T) */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">T</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Terrorists</h3>
                      <div className="text-sm text-gray-400">Раунды: {team2Score}</div>
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
                          <th className="text-center p-3 text-gray-300 font-semibold">ADR</th>
                          <th className="text-center p-3 text-gray-300 font-semibold">HS%</th>
                          <th className="text-center p-3 text-gray-300 font-semibold">KAST</th>
                          <th className="text-center p-3 text-gray-300 font-semibold">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team2Players.map((player, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={`https://avatars.akamai.steamstatic.com/${player.steamId}_medium.jpg`}
                                  alt={player.name}
                                  className="w-8 h-8 rounded-full border border-orange-600/50"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect fill="%234B5563" width="32" height="32"/%3E%3Ccircle cx="16" cy="10" r="5" fill="%23B0B8C1"/%3E%3Cpath d="M8 26c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="%23B0B8C1"/%3E%3C/svg%3E';
                                  }}
                                />
                                <span className="text-white font-medium">{player.name}</span>
                              </div>
                            </td>
                            <td className="text-center p-3 text-white font-semibold">{player.kills}</td>
                            <td className="text-center p-3 text-gray-300">{player.deaths}</td>
                            <td className="text-center p-3 text-gray-300">{player.assists}</td>
                            <td className={`text-center p-3 font-semibold ${
                              player.kills - player.deaths > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {player.kills - player.deaths > 0 ? '+' : ''}{player.kills - player.deaths}
                            </td>
                            <td className="text-center p-3 text-white">{player.kd}</td>
                            <td className="text-center p-3 text-orange-400">{player.adr}</td>
                            <td className="text-center p-3 text-purple-400">{player.hsPercentage}%</td>
                            <td className="text-center p-3 text-gray-400">{player.kast}</td>
                            <td className={`text-center p-3 font-bold ${
                              parseFloat(player.rating) >= 1.0 ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {player.rating}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800/50 p-4 rounded-b-xl border-t border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <div>
                Share Code: <code className="text-orange-400 bg-gray-900/50 px-2 py-1 rounded">{match.shareCode}</code>
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

export default CS2MatchDetails;

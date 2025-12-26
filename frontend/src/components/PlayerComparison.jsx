import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaChartLine, FaGamepad, FaCrosshairs, FaCoins, FaSkull, FaTimes } from 'react-icons/fa';
import { getHeroIcon, getHeroName, getRankImage, getRankName, formatMMR } from '../utils/dota2Helpers';

const PlayerComparison = ({ player1SteamId, player2SteamId, onClose }) => {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [p1Response, p2Response] = await Promise.all([
          fetch(`/api/dota2/player/${player1SteamId}`, { headers }),
          fetch(`/api/dota2/player/${player2SteamId}`, { headers })
        ]);

        if (!p1Response.ok || !p2Response.ok) {
          throw new Error('Не удалось загрузить данные игроков');
        }

        const p1Data = await p1Response.json();
        const p2Data = await p2Response.json();

        setPlayer1(p1Data.data);
        setPlayer2(p2Data.data);
      } catch (err) {
        console.error('Player comparison error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (player1SteamId && player2SteamId) {
      fetchPlayers();
    }
  }, [player1SteamId, player2SteamId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !player1 || !player2) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-900 rounded-lg p-8 max-w-md text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-red-400 text-xl mb-4">Ошибка загрузки</div>
          <div className="text-gray-400 mb-6">{error}</div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  const ComparisonStat = ({ label, value1, value2, icon, isBetter, format = 'number' }) => {
    const formatted1 = format === 'percent' ? `${value1}%` : format === 'mmr' ? formatMMR(value1) : value1;
    const formatted2 = format === 'percent' ? `${value2}%` : format === 'mmr' ? formatMMR(value2) : value2;
    
    let winner = null;
    if (isBetter === 'higher') {
      winner = parseFloat(value1) > parseFloat(value2) ? 'p1' : parseFloat(value2) > parseFloat(value1) ? 'p2' : null;
    } else if (isBetter === 'lower') {
      winner = parseFloat(value1) < parseFloat(value2) ? 'p1' : parseFloat(value2) < parseFloat(value1) ? 'p2' : null;
    }

    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-center gap-2 text-gray-400 mb-3">
          {icon}
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className={`text-right text-xl font-bold ${winner === 'p1' ? 'text-green-400' : 'text-white'}`}>
            {formatted1}
          </div>
          <div className="text-center text-gray-500 text-sm">VS</div>
          <div className={`text-left text-xl font-bold ${winner === 'p2' ? 'text-green-400' : 'text-white'}`}>
            {formatted2}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-lg p-6 max-w-6xl w-full my-8 border border-cyan-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Сравнение игроков</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Player Headers */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-lg p-6 border border-cyan-500/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {player1.profile?.personaname || 'Player 1'}
              </div>
              {player1.rank && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <img 
                    src={getRankImage(player1.rank)} 
                    alt={getRankName(player1.rank)}
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-left">
                    <div className="text-sm text-gray-400">Rank</div>
                    <div className="text-white font-semibold">{getRankName(player1.rank)}</div>
                    {player1.mmr_estimate && (
                      <div className="text-cyan-400 text-sm">{formatMMR(player1.mmr_estimate)} MMR</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              VS
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {player2.profile?.personaname || 'Player 2'}
              </div>
              {player2.rank && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <img 
                    src={getRankImage(player2.rank)} 
                    alt={getRankName(player2.rank)}
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-left">
                    <div className="text-sm text-gray-400">Rank</div>
                    <div className="text-white font-semibold">{getRankName(player2.rank)}</div>
                    {player2.mmr_estimate && (
                      <div className="text-cyan-400 text-sm">{formatMMR(player2.mmr_estimate)} MMR</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* General Stats */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Общая статистика</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ComparisonStat
              label="Winrate"
              value1={player1.winrate}
              value2={player2.winrate}
              icon={<FaTrophy className="text-yellow-400" />}
              isBetter="higher"
              format="percent"
            />
            <ComparisonStat
              label="Total Matches"
              value1={player1.totalMatches}
              value2={player2.totalMatches}
              icon={<FaGamepad className="text-purple-400" />}
            />
            <ComparisonStat
              label="MMR Estimate"
              value1={player1.mmr_estimate || 0}
              value2={player2.mmr_estimate || 0}
              icon={<FaChartLine className="text-green-400" />}
              isBetter="higher"
              format="mmr"
            />
          </div>
        </div>

        {/* Advanced Stats */}
        {player1.advancedStats && player2.advancedStats && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Детальная статистика</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ComparisonStat
                label="KDA"
                value1={player1.advancedStats.kda}
                value2={player2.advancedStats.kda}
                icon={<FaCrosshairs className="text-purple-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="GPM (Gold/min)"
                value1={player1.advancedStats.avgGPM}
                value2={player2.advancedStats.avgGPM}
                icon={<FaCoins className="text-yellow-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="XPM (Experience/min)"
                value1={player1.advancedStats.avgXPM}
                value2={player2.advancedStats.avgXPM}
                icon={<FaChartLine className="text-blue-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="Avg Kills"
                value1={player1.advancedStats.avgKills}
                value2={player2.advancedStats.avgKills}
                icon={<FaCrosshairs className="text-green-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="Avg Deaths"
                value1={player1.advancedStats.avgDeaths}
                value2={player2.advancedStats.avgDeaths}
                icon={<FaSkull className="text-red-400" />}
                isBetter="lower"
              />
              <ComparisonStat
                label="Avg Assists"
                value1={player1.advancedStats.avgAssists}
                value2={player2.advancedStats.avgAssists}
                icon={<FaTrophy className="text-cyan-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="Hero Damage"
                value1={Math.round(player1.advancedStats.avgHeroDamage)}
                value2={Math.round(player2.advancedStats.avgHeroDamage)}
                icon={<FaCrosshairs className="text-red-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="Tower Damage"
                value1={Math.round(player1.advancedStats.avgTowerDamage)}
                value2={Math.round(player2.advancedStats.avgTowerDamage)}
                icon={<FaSkull className="text-orange-400" />}
                isBetter="higher"
              />
              <ComparisonStat
                label="Last Hits"
                value1={player1.advancedStats.avgLastHits}
                value2={player2.advancedStats.avgLastHits}
                icon={<FaTrophy className="text-green-400" />}
                isBetter="higher"
              />
            </div>
          </div>
        )}

        {/* Top Heroes Comparison */}
        {player1.topHeroes && player2.topHeroes && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Топ-5 героев</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Player 1 Heroes */}
              <div>
                <div className="text-cyan-400 font-semibold mb-3 text-center">
                  {player1.profile?.personaname || 'Player 1'}
                </div>
                <div className="space-y-2">
                  {player1.topHeroes.slice(0, 5).map((hero, idx) => {
                    const winrate = ((hero.win / hero.games) * 100).toFixed(1);
                    return (
                      <div key={hero.hero_id} className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-gray-500 font-bold w-6">#{idx + 1}</span>
                        <img 
                          src={getHeroIcon(hero.hero_id)} 
                          alt={getHeroName(hero.hero_id)}
                          className="w-10 h-10 rounded border border-cyan-500/50"
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm capitalize">{getHeroName(hero.hero_id)}</div>
                          <div className="text-gray-400 text-xs">{hero.games} игр</div>
                        </div>
                        <div className={`text-sm font-bold ${parseFloat(winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {winrate}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Player 2 Heroes */}
              <div>
                <div className="text-purple-400 font-semibold mb-3 text-center">
                  {player2.profile?.personaname || 'Player 2'}
                </div>
                <div className="space-y-2">
                  {player2.topHeroes.slice(0, 5).map((hero, idx) => {
                    const winrate = ((hero.win / hero.games) * 100).toFixed(1);
                    return (
                      <div key={hero.hero_id} className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-gray-500 font-bold w-6">#{idx + 1}</span>
                        <img 
                          src={getHeroIcon(hero.hero_id)} 
                          alt={getHeroName(hero.hero_id)}
                          className="w-10 h-10 rounded border border-purple-500/50"
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm capitalize">{getHeroName(hero.hero_id)}</div>
                          <div className="text-gray-400 text-xs">{hero.games} игр</div>
                        </div>
                        <div className={`text-sm font-bold ${parseFloat(winrate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {winrate}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Winner Declaration */}
        <div className="mt-8 p-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/30">
          <div className="text-center">
            <div className="text-yellow-400 text-sm font-semibold mb-2">🏆 ПОБЕДИТЕЛЬ СРАВНЕНИЯ 🏆</div>
            {(() => {
              const p1Score = parseFloat(player1.winrate) + (player1.mmr_estimate || 0) / 100 + parseFloat(player1.advancedStats?.kda || 0) * 5;
              const p2Score = parseFloat(player2.winrate) + (player2.mmr_estimate || 0) / 100 + parseFloat(player2.advancedStats?.kda || 0) * 5;
              
              const winner = p1Score > p2Score ? player1 : p2Score > p1Score ? player2 : null;
              
              if (!winner) {
                return <div className="text-2xl font-bold text-white">🤝 Ничья!</div>;
              }
              
              return (
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                  {winner.profile?.personaname || 'Неизвестный игрок'}
                </div>
              );
            })()}
            <div className="text-gray-400 text-sm mt-2">
              На основе Winrate, MMR и KDA
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PlayerComparison;

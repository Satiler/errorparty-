import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const GSIStatus = ({ steamId }) => {
  const [status, setStatus] = useState({
    isActive: false,
    lastUpdate: null,
    activeMatches: 0,
    matches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGSIStatus();
    
    // Проверяем статус каждые 10 секунд
    const interval = setInterval(checkGSIStatus, 10000);
    
    return () => clearInterval(interval);
  }, [steamId]);

  const checkGSIStatus = async () => {
    try {
      const response = await axios.get('/api/gsi/active');
      
      if (response.data.success) {
        // Фильтруем только матчи текущего пользователя
        const userMatches = steamId 
          ? response.data.matches.filter(match => match.steamId === steamId)
          : response.data.matches;
        
        setStatus({
          isActive: userMatches?.length > 0,
          lastUpdate: new Date(),
          activeMatches: userMatches?.length || 0,
          matches: userMatches || []
        });
      } else {
        setStatus({
          isActive: false,
          lastUpdate: new Date(),
          activeMatches: 0,
          matches: []
        });
      }
    } catch (err) {
      console.error('GSI status check failed:', err);
      setStatus({
        isActive: false,
        lastUpdate: new Date(),
        activeMatches: 0,
        matches: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-48"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`backdrop-blur-sm rounded-lg p-4 border ${
        status.isActive 
          ? 'bg-green-900/20 border-green-500/50' 
          : 'bg-gray-800/50 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {status.isActive ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              </>
            ) : (
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            )}
          </div>
          
          <div>
            <div className="text-white font-semibold text-sm">
              {status.isActive ? '✅ GSI Активен' : '⚪ GSI Неактивен'}
            </div>
            <div className="text-gray-400 text-xs">
              {status.activeMatches > 0 
                ? `${status.activeMatches} активных ${status.activeMatches === 1 ? 'матч' : 'матчей'}`
                : 'Нет активных матчей'
              }
            </div>
          </div>
        </div>

        {status.lastUpdate && (
          <div className="text-gray-500 text-xs">
            Обновлено {status.lastUpdate.toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {status.activeMatches > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-green-500/30"
          >
            <div className="text-green-400 text-xs font-semibold mb-3">
              🎮 Матч в процессе! Статистика обновляется в реальном времени
            </div>
            
            {/* Отображение активных матчей */}
            <div className="space-y-2">
              {status.matches.map((match, index) => (
                <div key={index} className="bg-gray-900/50 rounded-lg p-3 border border-green-500/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">Карта</div>
                      <div className="text-white font-semibold">{match.mapName || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">K/D/A</div>
                      <div className="text-white font-semibold">
                        {match.kills || 0}/{match.deaths || 0}/{match.assists || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Раунд</div>
                      <div className="text-white font-semibold">
                        {match.roundWins || 0} - {match.roundLosses || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Команда</div>
                      <div className={`font-semibold ${match.team === 'CT' ? 'text-blue-400' : 'text-orange-400'}`}>
                        {match.team || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-gray-400 text-xs mt-2 text-center">
              ✅ GSI активен • Обновление каждые 10 секунд
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GSIStatus;

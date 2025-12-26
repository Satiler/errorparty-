import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaRobot, FaPlay, FaStop, FaSync, FaExchangeAlt, FaShieldAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import io from 'socket.io-client';

const AdminBotPage = () => {
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [steamGuardCode, setSteamGuardCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Initial fetch
    fetchBotStatus();
    
    // ✅ Setup Socket.IO for real-time updates
    const socket = io({
      auth: {
        token: localStorage.getItem('token')
      }
    });
    
    socket.on('connect', () => {
      console.log('Socket.IO connected');
      socket.emit('admin:subscribeBotStatus');
    });
    
    socket.on('bot:statusUpdate', (status) => {
      console.log('Received bot status update:', status);
      setBotStatus(status);
      setLoading(false);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchBotStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch('/api/admin/bot/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('У вас нет прав доступа к админ-панели');
        navigate('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setBotStatus(data.status);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bot status:', error);
      setLoading(false);
    }
  };

  const performAction = async (action, endpoint, body = {}) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/bot/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        if (endpoint === 'steam-guard') {
          setSteamGuardCode('');
        }
        // Обновляем статус сразу после действия
        setTimeout(fetchBotStatus, 500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Произошла ошибка' });
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      setMessage({ type: 'error', text: 'Ошибка при выполнении действия' });
    }
    setActionLoading(false);
  };

  const handleStartBot = () => performAction('start', 'start');
  const handleStopBot = () => performAction('stop', 'stop');
  const handleRestartBot = () => performAction('restart', 'restart');
  const handleSwitchAccount = () => performAction('switch', 'switch-account');
  const handleResetRateLimit = () => performAction('reset', 'reset-rate-limit');
  const handleSubmitGuard = () => {
    if (!steamGuardCode.trim()) {
      setMessage({ type: 'error', text: 'Введите код Steam Guard' });
      return;
    }
    performAction('submit-guard', 'steam-guard', { code: steamGuardCode });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Назад к админ-панели
          </button>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <FaRobot className="text-purple-500" />
            Управление Steam Bot
          </h1>
          <p className="text-gray-400 mt-2">
            Управление ботом для автоматической синхронизации CS2 матчей
          </p>
        </motion.div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Connection Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Подключение</h3>
              {botStatus?.connected ? (
                <FaCheckCircle className="text-green-500 text-2xl" />
              ) : (
                <FaTimesCircle className="text-red-500 text-2xl" />
              )}
            </div>
            <div className="text-gray-400 text-sm space-y-2">
              <div>
                Статус: <span className={botStatus?.connected ? 'text-green-500' : 'text-red-500'}>
                  {botStatus?.connected ? '🟢 Онлайн' : '🔴 Офлайн'}
                </span>
              </div>
              <div>
                GC: <span className={botStatus?.gcReady ? 'text-green-500' : 'text-yellow-500'}>
                  {botStatus?.gcReady ? '✅ Готов' : '⏳ Ожидание'}
                </span>
              </div>
              {botStatus?.botSteamId && (
                <div className="text-xs text-gray-500 mt-2">
                  ID: {botStatus.botSteamId}
                </div>
              )}
            </div>
          </motion.div>

          {/* Account Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Аккаунт</h3>
              <FaShieldAlt className="text-purple-500 text-2xl" />
            </div>
            <div className="text-gray-400 text-sm space-y-2">
              <div>
                Текущий: <span className="text-white">
                  {botStatus?.currentAccount || 'Не указан'}
                </span>
              </div>
              <div>
                Режим: <span className={botStatus?.usingBackup ? 'text-yellow-500' : 'text-green-500'}>
                  {botStatus?.usingBackup ? '🔶 Резервный' : '🔷 Основной'}
                </span>
              </div>
              <div>
                Backup: <span className={botStatus?.hasBackup ? 'text-green-500' : 'text-red-500'}>
                  {botStatus?.hasBackup ? '✅ Есть' : '❌ Нет'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Статистика</h3>
              <FaRobot className="text-blue-500 text-2xl" />
            </div>
            <div className="text-gray-400 text-sm space-y-2">
              <div>
                Друзей: <span className="text-white">{botStatus?.friends || 0}</span>
              </div>
              <div>
                Запросов: <span className="text-white">{botStatus?.pendingRequests || 0}</span>
              </div>
              <div>
                Попыток входа: <span className="text-white">{botStatus?.loginAttempts || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Alert Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Rate Limit Warning */}
        {botStatus?.rateLimited && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 text-yellow-400">
              <FaShieldAlt className="text-2xl" />
              <div>
                <div className="font-semibold">⚠️ Rate Limit активен</div>
                <div className="text-sm text-yellow-300 mt-1">
                  Аккаунт временно заблокирован Steam. Бот автоматически переподключится после cooldown.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Steam Guard Input */}
        {botStatus?.pendingSteamGuard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FaShieldAlt className="text-purple-400 text-3xl" />
              <div>
                <h3 className="text-white text-xl font-semibold">🔐 Требуется Steam Guard код</h3>
                <p className="text-gray-300 text-sm mt-1">
                  {botStatus.pendingSteamGuard.domain 
                    ? `Код отправлен на email: ***@${botStatus.pendingSteamGuard.domain}`
                    : 'Код отправлен в мобильное приложение Steam'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Аккаунт: {botStatus.pendingSteamGuard.account === 'backup' ? 'резервный' : 'основной'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={steamGuardCode}
                onChange={(e) => setSteamGuardCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuard()}
                placeholder="Введите код (например: F5CC6)"
                maxLength={5}
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-2xl tracking-widest font-mono"
                disabled={actionLoading}
              />
              <button
                onClick={handleSubmitGuard}
                disabled={actionLoading || !steamGuardCode.trim()}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? '⏳' : '✅ Отправить'}
              </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-400">
              💡 Подсказка: Код состоит из 5 символов и отправляется на ваш email или в мобильное приложение Steam
            </div>
          </motion.div>
        )}

        {/* Control Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50"
        >
          <h3 className="text-white text-xl font-semibold mb-6">Управление</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Start Bot */}
            <button
              onClick={handleStartBot}
              disabled={actionLoading || botStatus?.connected}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlay />
              Запустить
            </button>

            {/* Stop Bot */}
            <button
              onClick={handleStopBot}
              disabled={actionLoading || !botStatus?.connected}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaStop />
              Остановить
            </button>

            {/* Restart Bot */}
            <button
              onClick={handleRestartBot}
              disabled={actionLoading}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSync />
              Перезапустить
            </button>

            {/* Switch Account */}
            <button
              onClick={handleSwitchAccount}
              disabled={actionLoading || !botStatus?.hasBackup}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaExchangeAlt />
              Сменить аккаунт
            </button>

            {/* Reset Rate Limit */}
            <button
              onClick={handleResetRateLimit}
              disabled={actionLoading || !botStatus?.rateLimited}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg font-semibold hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaShieldAlt />
              Сбросить Rate Limit
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <h4 className="text-white font-semibold mb-3">📖 Справка</h4>
            <div className="text-gray-400 text-sm space-y-2">
              <div>• <strong className="text-white">Запустить:</strong> Подключить бота к Steam и Game Coordinator</div>
              <div>• <strong className="text-white">Остановить:</strong> Отключить бота от Steam</div>
              <div>• <strong className="text-white">Перезапустить:</strong> Переподключить бота (полезно при зависании)</div>
              <div>• <strong className="text-white">Сменить аккаунт:</strong> Переключиться между основным и резервным аккаунтом</div>
              <div>• <strong className="text-white">Сбросить Rate Limit:</strong> Попытаться переподключиться при блокировке</div>
            </div>
          </div>
        </motion.div>

        {/* Configuration Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50"
        >
          <h3 className="text-white text-xl font-semibold mb-4">⚙️ Конфигурация</h3>
          <div className="text-gray-400 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Credentials настроены:</span>
              <span className={botStatus?.configured ? 'text-green-500' : 'text-red-500'}>
                {botStatus?.configured ? '✅ Да' : '❌ Нет'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Резервный аккаунт:</span>
              <span className={botStatus?.hasBackup ? 'text-green-500' : 'text-red-500'}>
                {botStatus?.hasBackup ? '✅ Настроен' : '❌ Не настроен'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Текущий аккаунт:</span>
              <span className="text-white">{botStatus?.currentAccount || 'Не указан'}</span>
            </div>
          </div>

          {!botStatus?.configured && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              ⚠️ Bot credentials не настроены. Установите STEAM_BOT_USERNAME и STEAM_BOT_PASSWORD в .env
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminBotPage;

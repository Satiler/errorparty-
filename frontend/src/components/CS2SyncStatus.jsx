import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const CS2SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [addingMatch, setAddingMatch] = useState(false);

  useEffect(() => {
    fetchSyncStatus();
    
    // Обновляем статус каждые 30 секунд
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/cs2/sync/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setSyncStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');

      const response = await axios.post('/api/cs2/sync/trigger', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const newMatches = response.data.stats?.newMatches || 0;
        if (newMatches > 0) {
          alert(`✅ Синхронизация завершена!\n\nНовых матчей: ${newMatches}\nПропущено: ${response.data.stats?.skippedMatches || 0}\n\n📥 Demo-файлы загружаются в фоновом режиме...`);
        } else {
          const totalMatches = response.data.stats?.totalMatches || 0;
          if (totalMatches === 0) {
            alert(`⚠️ Матчи не найдены\n\n🚀 Первый запуск:\n1. Откройте CS2 → Ваши матчи\n2. Скопируйте Share Code любого матча (Shift+F2)\n3. Добавьте его через кнопку "➕ Добавить матч" ниже\n4. После этого все последующие матчи загрузятся автоматически!`);
          } else {
            alert(`ℹ️ Синхронизация завершена\n\nНовых матчей не найдено.\nВсего в базе: ${totalMatches}\n\n💡 Сыграйте новые матчи или добавьте их вручную через Share Code.`);
          }
        }
        await fetchSyncStatus();
      } else {
        const message = response.data.message || 'Ошибка синхронизации';
        if (message.includes('No matches to sync from')) {
          alert(`⚠️ Нет начальной точки для синхронизации\n\n🎯 Что делать:\n1. Нажмите "➕ Добавить матч" ниже\n2. Вставьте Share Code из CS2 (любой матч)\n3. Система автоматически загрузит остальные матчи\n\n📋 Как получить Share Code:\nCS2 → Матчи → Выбрать матч → Shift+F2`);
        } else {
          alert(`⚠️ ${message}\n\n💡 Попробуйте добавить матчи вручную через Share Code.`);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Ошибка синхронизации: ' + (error.response?.data?.error || error.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleAddMatch = async () => {
    if (!shareCode.trim()) {
      alert('⚠️ Введите Share Code');
      return;
    }

    try {
      setAddingMatch(true);
      const token = localStorage.getItem('token');

      const response = await axios.post('/api/cs2/match/add', {
        shareCode: shareCode.trim()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('✅ Матч добавлен успешно!\n\n📥 Demo-файл загружается в фоновом режиме...\n\n💡 Теперь можно запустить синхронизацию для загрузки остальных матчей.');
        setShareCode('');
        setShowAddMatch(false);
        await fetchSyncStatus();
        
        // Reload page to show new match
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error('Add match error:', error);
      const errorMsg = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details || '';
      
      if (errorMsg.includes('duplicate')) {
        alert('⚠️ Этот матч уже добавлен');
      } else if (error.response?.status === 400) {
        alert(`❌ Ошибка валидации:\n\n${errorMsg}\n${errorDetails ? '\nДетали: ' + errorDetails : ''}\n\n💡 Проверьте формат Share Code`);
      } else {
        alert('❌ Ошибка добавления матча: ' + errorMsg);
      }
    } finally {
      setAddingMatch(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (!syncStatus) {
    return null;
  }

  const formatDate = (date) => {
    if (!date) return 'Никогда';
    return new Date(date).toLocaleString('ru-RU');
  };

  // Если нет токена, показываем только форму добавления матча
  if (!syncStatus.hasAuthToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm rounded-lg p-6 border border-orange-500/30"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⚠️</span>
              <span>Начните загрузку матчей</span>
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Добавьте первый матч чтобы система могла синхронизировать остальные
            </p>
          </div>
          <button
            onClick={() => setShowAddMatch(!showAddMatch)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-colors font-semibold text-white shadow-lg"
          >
            {showAddMatch ? '✕ Закрыть' : '➕ Добавить матч'}
          </button>
        </div>

        {/* Add Match Form */}
        {showAddMatch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg p-6 border border-green-500/30"
          >
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>➕</span>
              <span>Добавить матч по Share Code</span>
            </h4>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-300 space-y-2">
                  <p className="font-semibold text-white">📋 Как получить Share Code:</p>
                  <ol className="ml-4 space-y-1 list-decimal">
                    <li>Откройте CS2 → Ваши матчи</li>
                    <li>Выберите любой матч</li>
                    <li>Нажмите "Скопировать Share Code" или <kbd className="bg-gray-800 px-2 py-1 rounded">Shift+F2</kbd></li>
                    <li>Вставьте код в поле ниже</li>
                  </ol>
                </div>
              </div>

              {/* Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Share Code:
                </label>
                <input
                  type="text"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value)}
                  placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 font-mono text-center text-lg"
                />
                <div className="text-xs text-gray-400 mt-2 text-center">
                  Формат: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAddMatch}
                disabled={addingMatch || !shareCode.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold text-white shadow-lg"
              >
                {addingMatch ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Добавление матча...
                  </span>
                ) : (
                  '✅ Добавить матч'
                )}
              </button>

              {/* Info */}
              <div className="bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-500">
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-yellow-400">💡 Важно:</span> После добавления первого матча привяжите Authentication Token для автоматической синхронизации новых матчей
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔄</span>
            <span>Автоматическая синхронизация</span>
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Ваши матчи синхронизируются автоматически каждые 6 часов
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddMatch(!showAddMatch)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-colors font-semibold text-white shadow-lg"
          >
            {showAddMatch ? '✕ Закрыть' : '➕ Добавить матч'}
          </button>
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold text-white shadow-lg"
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Синхронизация...
              </span>
            ) : (
              '🔄 Синхронизировать сейчас'
            )}
          </button>
        </div>
      </div>

      {/* Add Match Form */}
      {showAddMatch && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg p-6 border border-green-500/30"
        >
          <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>➕</span>
            <span>Добавить матч по Share Code</span>
          </h4>

          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="text-sm text-gray-300 space-y-2">
                <p className="font-semibold text-white">📋 Как получить Share Code:</p>
                <ol className="ml-4 space-y-1 list-decimal">
                  <li>Откройте CS2 → Ваши матчи</li>
                  <li>Выберите любой матч</li>
                  <li>Нажмите "Скопировать Share Code" или <kbd className="bg-gray-800 px-2 py-1 rounded">Shift+F2</kbd></li>
                  <li>Вставьте код в поле ниже</li>
                </ol>
              </div>
            </div>

            {/* Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Share Code:
              </label>
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 font-mono text-center text-lg"
              />
              <div className="text-xs text-gray-400 mt-2 text-center">
                Формат: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAddMatch}
              disabled={addingMatch || !shareCode.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold text-white shadow-lg"
            >
              {addingMatch ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Добавление матча...
                </span>
              ) : (
                '✅ Добавить матч'
              )}
            </button>

            {/* Info */}
            <div className="bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-500">
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-yellow-400">💡 Важно:</span> После добавления первого матча система автоматически загрузит ВСЕ последующие матчи при нажатии "Синхронизировать сейчас"
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Всего матчей</div>
          <div className="text-2xl font-bold text-white">{syncStatus.stats?.total || 0}</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Авто-синхр.</div>
          <div className="text-2xl font-bold text-blue-400">{syncStatus.stats?.fromAutoSync || 0}</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Share Code</div>
          <div className="text-2xl font-bold text-purple-400">{syncStatus.stats?.fromShareCode || 0}</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">GSI</div>
          <div className="text-2xl font-bold text-green-400">{syncStatus.stats?.fromGSI || 0}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Токен привязан:</span>
            <span className="text-green-400 font-semibold">
              {syncStatus.hasAuthToken ? '✓ Да' : '✗ Нет'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Дата привязки:</span>
            <span className="text-white">{formatDate(syncStatus.tokenLinkedAt)}</span>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <span className="text-gray-400">Последняя синхронизация:</span>
            <span className="text-white">{formatDate(syncStatus.stats?.lastSync)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {syncStatus.stats?.total === 0 && (
          <div className="bg-orange-900/20 rounded-lg p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-orange-400">🚀 Первый запуск:</span>
              <div className="mt-2 space-y-2">
                <div>Для начала работы автоматической синхронизации добавьте <strong className="text-white">хотя бы один матч вручную</strong>:</div>
                <ol className="ml-6 space-y-1 list-decimal">
                  <li>Откройте CS2 → Ваши матчи → выберите любой матч</li>
                  <li>Нажмите "Скопировать Share Code" (или Shift+F2)</li>
                  <li>Вставьте код в форму ниже (кнопка "➕ Добавить матч")</li>
                  <li>После этого система автоматически загрузит ВСЕ последующие матчи ✨</li>
                </ol>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-500">
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-white">💡 Как работает синхронизация:</span>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Steam API требует <strong>известный Share Code</strong> как стартовую точку</li>
              <li>После первого матча система загружает все последующие автоматически</li>
              <li>Demo-файлы загружаются и парсятся в фоне (5-10 минут на матч)</li>
              <li>Автосинхронизация запускается каждые 6 часов</li>
            </ul>
          </div>
        </div>
        
        {syncStatus.stats?.total > 0 && (
          <div className="bg-green-900/20 rounded-lg p-3 border-l-4 border-green-500">
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-green-400">✅ Всё настроено!</span> Новые матчи будут загружаться автоматически. 
              Можете добавлять матчи вручную для ускорения процесса.
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CS2SyncStatus;

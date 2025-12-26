import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiConfig';

function SettingsPage() {
  const [user, setUser] = useState(null);
  const [linkToken, setLinkToken] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    online: false,
    clients: 0,
    maxClients: 32
  });

  useEffect(() => {
    checkAuthAndLinkStatus();
    
    // Проверяем статус связывания каждые 3 секунды, если токен активен
    const interval = setInterval(() => {
      if (linkToken && !isLinked) {
        checkLinkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [linkToken, isLinked]);

  const checkAuthAndLinkStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      // Получаем информацию о пользователе
      const response = await apiFetch('/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLinked(!!data.user.teamspeakUid);
      }

      // Проверяем статус связывания
      await checkLinkStatus();
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const checkLinkStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setChecking(true);
      const response = await apiFetch('/user/check-link-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.linked) {
          setIsLinked(true);
          setLinkToken('');
          setMessage('✅ TeamSpeak успешно связан!');
          // Обновляем информацию о пользователе
          checkAuthAndLinkStatus();
        } else if (data.hasActiveToken && data.token) {
          setLinkToken(data.token);
        }
      }
    } catch (error) {
      console.error('Error checking link status:', error);
    } finally {
      setChecking(false);
    }
  };

  const generateToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      setMessage('');

      const response = await apiFetch('/user/generate-link-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setLinkToken(data.token);
        setMessage('');
      } else {
        setMessage(data.error || 'Ошибка при генерации токена');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setMessage('Ошибка при генерации токена');
    } finally {
      setLoading(false);
    }
  };

  const unlinkTeamspeak = async () => {
    if (!confirm('Вы уверены, что хотите отвязать TeamSpeak?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiFetch('/user/unlink-teamspeak', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsLinked(false);
        setMessage('TeamSpeak отвязан');
        checkAuthAndLinkStatus();
      }
    } catch (error) {
      console.error('Error unlinking:', error);
      setMessage('Ошибка при отвязке');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(linkToken);
    setMessage('✅ Токен скопирован в буфер обмена!');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            ⚙️ Настройки
          </h1>

          {/* User Info Card */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-200 dark:border-purple-500/30">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Информация о профиле</h2>
            <div className="flex items-center gap-4">
              {user.avatar && (
                <img src={user.avatar} alt={user.username} className="w-16 h-16 rounded-full" />
              )}
              <div>
                <p className="text-gray-900 dark:text-white text-xl font-semibold">{user.username}</p>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
          </div>

          {/* TeamSpeak Linking Card */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200 dark:border-purple-500/30">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🎤 Связывание TeamSpeak</h2>
            
            {isLinked ? (
              <div>
                <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-4">
                  <p className="text-green-400 font-semibold">✅ TeamSpeak успешно связан!</p>
                  <p className="text-gray-300 text-sm mt-2">
                    Ваш аккаунт связан с TeamSpeak. Время онлайн автоматически отслеживается.
                  </p>
                </div>
                
                <button
                  onClick={unlinkTeamspeak}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  Отвязать TeamSpeak
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-300 mb-4">
                  Свяжите свой аккаунт с TeamSpeak для автоматического отслеживания времени онлайн и других функций.
                </p>

                {!linkToken ? (
                  <button
                    onClick={generateToken}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? 'Генерация...' : 'Связать TeamSpeak'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                      <p className="text-blue-600 dark:text-blue-400 font-semibold mb-3">📋 Инструкция по связыванию:</p>
                      <ol className="text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                        <li>Подключитесь к серверу TeamSpeak <span className="text-purple-400 font-mono">errorparty.ru</span></li>
                        <li>Откройте чат (нажмите Enter)</li>
                        <li>Введите команду: <span className="text-purple-400 font-mono">!link {linkToken}</span></li>
                        <li>Дождитесь подтверждения</li>
                      </ol>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-2">Ваш токен:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-900 text-purple-400 text-2xl font-bold p-3 rounded text-center tracking-wider">
                          {linkToken}
                        </code>
                        <button
                          onClick={copyToken}
                          className="px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
                          title="Скопировать токен"
                        >
                          📋
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">Токен действителен 15 минут</p>
                    </div>

                    {checking && (
                      <div className="text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        <p className="mt-2">Ожидание связывания...</p>
                      </div>
                    )}

                    <button
                      onClick={generateToken}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition disabled:opacity-50 text-sm"
                    >
                      Сгенерировать новый токен
                    </button>
                  </div>
                )}
              </div>
            )}

            {message && (
              <div className={`mt-4 p-3 rounded ${
                message.includes('✅') 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBell, FaBellSlash, FaMobileAlt, FaDownload, FaCheckCircle, 
  FaTimesCircle, FaExclamationTriangle, FaCog, FaRocket 
} from 'react-icons/fa';
import { 
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptionStatus,
  sendTestNotification,
  isAppInstalled,
  showInstallPrompt,
  isInstallPromptAvailable
} from '../utils/pwaHelper';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    supported: false,
    subscribed: false,
    permission: 'default'
  });
  const [swRegistered, setSwRegistered] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const toast = useToast();

  useEffect(() => {
    checkStatus();
    setInstalled(isAppInstalled());
    setCanInstall(isInstallPromptAvailable());
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const pushStatus = await getPushSubscriptionStatus();
      setStatus(pushStatus);
      
      const registration = await navigator.serviceWorker.getRegistration();
      setSwRegistered(!!registration);
    } catch (error) {
      console.error('Error checking status:', error);
    }
    setLoading(false);
  };

  const handleRegisterSW = async () => {
    try {
      const registration = await registerServiceWorker();
      if (registration) {
        setSwRegistered(true);
        toast.success('Service Worker зарегистрирован!');
        await checkStatus();
      } else {
        toast.error('Не удалось зарегистрировать Service Worker');
      }
    } catch (error) {
      toast.error('Ошибка регистрации: ' + error.message);
    }
  };

  const handleSubscribe = async () => {
    try {
      const result = await subscribeToPushNotifications();
      if (result.success) {
        toast.success('Уведомления включены!');
        await checkStatus();
      } else {
        toast.error('Не удалось подписаться: ' + result.error);
      }
    } catch (error) {
      toast.error('Ошибка подписки: ' + error.message);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const result = await unsubscribeFromPushNotifications();
      if (result.success) {
        toast.success('Уведомления отключены');
        await checkStatus();
      } else {
        toast.error('Не удалось отписаться: ' + result.error);
      }
    } catch (error) {
      toast.error('Ошибка отписки: ' + error.message);
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await sendTestNotification();
      if (result.success) {
        toast.success('Тестовое уведомление отправлено!');
      } else {
        toast.error('Не удалось отправить уведомление');
      }
    } catch (error) {
      toast.error('Ошибка: ' + error.message);
    }
  };

  const handleInstallApp = async () => {
    try {
      const result = await showInstallPrompt();
      if (result.success) {
        toast.success('Приложение установлено!');
        setInstalled(true);
        setCanInstall(false);
      }
    } catch (error) {
      toast.error('Ошибка установки: ' + error.message);
    }
  };

  const getPermissionIcon = () => {
    switch (status.permission) {
      case 'granted':
        return <FaCheckCircle className="text-green-500" />;
      case 'denied':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaExclamationTriangle className="text-yellow-500" />;
    }
  };

  const getPermissionText = () => {
    switch (status.permission) {
      case 'granted':
        return 'Разрешено';
      case 'denied':
        return 'Запрещено';
      default:
        return 'Не запрошено';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <FaBell className="text-6xl text-neon-cyan mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">
            Push-уведомления
          </h1>
          <p className="text-gray-400">
            Получайте уведомления о квестах, матчах и событиях
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Support Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Поддержка браузера</span>
              {status.supported ? (
                <FaCheckCircle className="text-green-500" />
              ) : (
                <FaTimesCircle className="text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-white">
              {status.supported ? 'Поддерживается' : 'Не поддерживается'}
            </div>
          </div>

          {/* Permission Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Разрешения</span>
              {getPermissionIcon()}
            </div>
            <div className="text-2xl font-bold text-white">
              {getPermissionText()}
            </div>
          </div>

          {/* Subscription Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Подписка</span>
              {status.subscribed ? (
                <FaCheckCircle className="text-green-500" />
              ) : (
                <FaTimesCircle className="text-gray-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-white">
              {status.subscribed ? 'Активна' : 'Неактивна'}
            </div>
          </div>
        </div>

        {/* PWA Install */}
        {!installed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50"
          >
            <div className="flex items-start space-x-4">
              <FaRocket className="text-4xl text-purple-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  Установите приложение
                </h3>
                <p className="text-gray-300 mb-4">
                  Установите ErrorParty как приложение для быстрого доступа и лучшего опыта
                </p>
                {canInstall ? (
                  <button
                    onClick={handleInstallApp}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <FaDownload />
                    <span>Установить приложение</span>
                  </button>
                ) : (
                  <p className="text-sm text-gray-400">
                    Приложение можно установить через меню браузера
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {installed && (
          <div className="card bg-green-500/10 border-green-500/50">
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-2xl text-green-500" />
              <span className="text-white font-semibold">
                Приложение установлено!
              </span>
            </div>
          </div>
        )}

        {/* Service Worker */}
        {!swRegistered && status.supported && (
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-3">
              1. Зарегистрировать Service Worker
            </h3>
            <p className="text-gray-400 mb-4">
              Service Worker необходим для работы push-уведомлений
            </p>
            <button
              onClick={handleRegisterSW}
              className="btn-primary w-full"
            >
              Зарегистрировать
            </button>
          </div>
        )}

        {/* Subscribe/Unsubscribe */}
        {status.supported && swRegistered && (
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-3">
              2. Управление уведомлениями
            </h3>
            
            {!status.subscribed ? (
              <div>
                <p className="text-gray-400 mb-4">
                  Подпишитесь на уведомления, чтобы не пропустить важные события
                </p>
                <button
                  onClick={handleSubscribe}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <FaBell />
                  <span>Включить уведомления</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-400 mb-2">
                    <FaCheckCircle />
                    <span className="font-semibold">Уведомления включены</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Вы будете получать уведомления о квестах, матчах и достижениях
                  </p>
                </div>

                <button
                  onClick={handleTestNotification}
                  className="btn-secondary w-full"
                >
                  Отправить тестовое уведомление
                </button>

                <button
                  onClick={handleUnsubscribe}
                  className="btn-danger w-full flex items-center justify-center space-x-2"
                >
                  <FaBellSlash />
                  <span>Отключить уведомления</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Not Supported */}
        {!status.supported && (
          <div className="card bg-red-500/10 border-red-500/50">
            <div className="flex items-start space-x-4">
              <FaTimesCircle className="text-3xl text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Браузер не поддерживается
                </h3>
                <p className="text-gray-400 mb-4">
                  Ваш браузер не поддерживает push-уведомления. 
                  Попробуйте использовать Chrome, Firefox, Edge или Safari.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied */}
        {status.permission === 'denied' && (
          <div className="card bg-yellow-500/10 border-yellow-500/50">
            <div className="flex items-start space-x-4">
              <FaExclamationTriangle className="text-3xl text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Разрешения отклонены
                </h3>
                <p className="text-gray-400 mb-4">
                  Вы отклонили разрешения на уведомления. 
                  Чтобы включить их, измените настройки в браузере:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 text-sm">
                  <li>Chrome: Настройки → Конфиденциальность → Уведомления</li>
                  <li>Firefox: Настройки → Приватность → Разрешения</li>
                  <li>Safari: Настройки → Веб-сайты → Уведомления</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <FaCog />
            <span>О push-уведомлениях</span>
          </h3>
          
          <div className="space-y-4 text-gray-400">
            <div>
              <h4 className="text-white font-semibold mb-2">Вы будете получать:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>🎯 Уведомления о выполненных квестах</li>
                <li>🎉 Сообщения о новых уровнях и достижениях</li>
                <li>🎮 Информацию о новых матчах</li>
                <li>❤️ Лайки и комментарии к вашим мемам</li>
                <li>👥 Заявки в друзья</li>
                <li>🏆 Напоминания о турнирах</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">Конфиденциальность:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Вы можете отключить уведомления в любой момент</li>
                <li>Мы не продаем ваши данные третьим лицам</li>
                <li>Уведомления отправляются только на этом устройстве</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </div>
  );
}

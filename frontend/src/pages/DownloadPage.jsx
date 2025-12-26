import React from 'react';
import { motion } from 'framer-motion';
import { FaWindows, FaApple, FaLinux, FaDownload, FaCheckCircle } from 'react-icons/fa';

export default function DownloadPage() {
  const features = [
    { icon: '🎵', text: 'Системный трей с управлением' },
    { icon: '⌨️', text: 'Медиа-клавиши Play/Pause/Next/Prev' },
    { icon: '🔔', text: 'Нативные уведомления' },
    { icon: '⚡', text: 'Размер всего 5 МБ' },
    { icon: '🚀', text: 'В 30 раз быстрее Electron' },
    { icon: '🔒', text: 'Безопасность на Rust' }
  ];

  const downloads = [
    {
      os: 'Windows',
      icon: FaWindows,
      color: 'from-blue-500 to-blue-600',
      version: '1.0.0',
      size: '5.2 MB',
      file: 'ErrorParty_1.0.0_x64-setup.exe',
      url: '/downloads/windows/ErrorParty_1.0.0_x64-setup.exe',
      requirements: 'Windows 7/8/10/11 (64-bit)',
      available: true
    },
    {
      os: 'macOS',
      icon: FaApple,
      color: 'from-gray-700 to-gray-800',
      version: '1.0.0',
      size: '4.8 MB',
      file: 'ErrorParty_1.0.0_x64.dmg',
      url: '/downloads/macos/ErrorParty_1.0.0_x64.dmg',
      requirements: 'macOS 10.13+ (64-bit)',
      available: false
    },
    {
      os: 'Linux',
      icon: FaLinux,
      color: 'from-yellow-500 to-orange-500',
      version: '1.0.0',
      size: '5.5 MB',
      file: 'ErrorParty_1.0.0_amd64.AppImage',
      url: '/downloads/linux/ErrorParty_1.0.0_amd64.AppImage',
      requirements: 'glibc 2.18+ (64-bit)',
      available: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-800 to-dark-900 text-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Скачать ErrorParty Desktop
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Полноценное desktop приложение для Windows, macOS и Linux
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-cyan-400">Последняя версия: 1.0.0</span>
          </div>
        </motion.div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {downloads.map((download, index) => (
            <motion.div
              key={download.os}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-700 rounded-xl p-6 border border-dark-600 hover:border-cyan-500/50 transition-all"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${download.color} flex items-center justify-center mb-4`}>
                <download.icon className="text-3xl text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">{download.os}</h3>
              <p className="text-gray-400 text-sm mb-4">{download.requirements}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>v{download.version}</span>
                <span>•</span>
                <span>{download.size}</span>
                {!download.available && (
                  <span className="text-yellow-500">• Скоро</span>
                )}
              </div>

              {download.available ? (
                <a
                  href={download.url}
                  download={download.file}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${download.color} rounded-lg font-semibold hover:scale-105 transition-transform`}
                >
                  <FaDownload />
                  Скачать
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 rounded-lg font-semibold opacity-50 cursor-not-allowed"
                >
                  Скоро
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-700 rounded-xl p-8 border border-dark-600 mb-16"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Возможности</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-gray-300">{feature.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Installation Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-dark-700 rounded-xl p-8 border border-dark-600"
        >
          <h2 className="text-3xl font-bold mb-6">Установка</h2>
          
          <div className="space-y-6">
            {/* Windows */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaWindows className="text-blue-500 text-xl" />
                <h3 className="text-xl font-semibold">Windows</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-400 ml-4">
                <li>Скачайте <code className="text-cyan-400">ErrorParty_setup.exe</code></li>
                <li>Запустите установщик</li>
                <li>Следуйте инструкциям мастера установки</li>
                <li>Приложение появится в меню Пуск и на рабочем столе</li>
              </ol>
            </div>

            {/* macOS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaApple className="text-gray-500 text-xl" />
                <h3 className="text-xl font-semibold">macOS</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-400 ml-4">
                <li>Скачайте <code className="text-cyan-400">ErrorParty.dmg</code></li>
                <li>Откройте DMG файл</li>
                <li>Перетащите ErrorParty в папку Applications</li>
                <li>При первом запуске: Системные настройки → Безопасность → Разрешить</li>
              </ol>
            </div>

            {/* Linux */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FaLinux className="text-yellow-500 text-xl" />
                <h3 className="text-xl font-semibold">Linux</h3>
              </div>
              <div className="space-y-2 text-gray-400 ml-4">
                <p className="font-semibold text-white">AppImage (универсальный):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Скачайте <code className="text-cyan-400">ErrorParty.AppImage</code></li>
                  <li>Сделайте файл исполняемым: <code className="text-cyan-400">chmod +x ErrorParty.AppImage</code></li>
                  <li>Запустите: <code className="text-cyan-400">./ErrorParty.AppImage</code></li>
                </ol>
                <p className="font-semibold text-white mt-4">DEB пакет (Debian/Ubuntu):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li><code className="text-cyan-400">sudo dpkg -i errorparty_1.0.0_amd64.deb</code></li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Windows SmartScreen Warning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-yellow-900/20 rounded-xl p-6 border border-yellow-600/30"
        >
          <div className="flex items-start gap-4">
            <div className="text-yellow-400 text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Windows SmartScreen может заблокировать установку
              </h3>
              <p className="text-gray-300 mb-3">
                Это нормально для неподписанных приложений. Windows блокирует все .exe файлы без цифровой подписи.
              </p>
              <div className="bg-dark-700/50 rounded-lg p-4 border border-dark-600">
                <p className="font-semibold text-white mb-2">Как установить:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>При появлении окна "Windows защитила ваш компьютер" нажмите <span className="text-cyan-400 font-semibold">"Подробнее"</span></li>
                  <li>Появится кнопка <span className="text-cyan-400 font-semibold">"Выполнить в любом случае"</span></li>
                  <li>Нажмите её - установка начнётся</li>
                </ol>
              </div>
              <p className="text-sm text-gray-400 mt-3">
                🔒 В будущем мы получим сертификат подписи кода, и это предупреждение исчезнет.
              </p>
            </div>
          </div>
        </motion.div>

        {/* System Requirements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-8 bg-dark-700 rounded-xl p-8 border border-dark-600"
        >
          <h2 className="text-2xl font-bold mb-4">Системные требования</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2">Минимальные</h3>
              <ul className="space-y-1 text-gray-400">
                <li>• ОЗУ: 256 МБ</li>
                <li>• Диск: 50 МБ</li>
                <li>• CPU: Intel Core 2</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2">Рекомендуемые</h3>
              <ul className="space-y-1 text-gray-400">
                <li>• ОЗУ: 512 МБ</li>
                <li>• Диск: 100 МБ</li>
                <li>• CPU: Intel Core i3</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2">Интернет</h3>
              <ul className="space-y-1 text-gray-400">
                <li>• Требуется для стриминга</li>
                <li>• Offline кеширование скоро</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center text-gray-400"
        >
          <p className="mb-2">
            Проблемы с установкой? 
            <a href="/docs/desktop-guide" className="text-cyan-400 hover:underline ml-2">
              Читайте документацию
            </a>
          </p>
          <p>
            Или пишите в 
            <a href="https://t.me/errorparty" className="text-cyan-400 hover:underline ml-2">
              Telegram
            </a>
          </p>
        </motion.div>

      </div>
    </div>
  );
}

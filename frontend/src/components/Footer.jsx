import { FaDiscord, FaTelegram, FaGithub, FaHeart } from 'react-icons/fa'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-100 dark:bg-dark-light border-t border-gray-300 dark:border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-display font-bold text-neon-cyan mb-4">ErrorParty.ru</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Официальный портал сообщества TeamSpeak-сервера. 
              Орден Шумоподавителей приветствует вас! 🎮
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-display font-bold text-neon-pink mb-4">Ссылки</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-neon-cyan transition-colors">О нас</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-neon-cyan transition-colors">Правила</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-neon-cyan transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-neon-cyan transition-colors">Скачать TeamSpeak</a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-lg font-display font-bold text-neon-purple mb-4">Социальные сети</h3>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-200 dark:bg-dark rounded-lg flex items-center justify-center hover:bg-neon-cyan hover:text-dark dark:hover:text-dark transition-all">
                <FaDiscord className="text-xl" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 dark:bg-dark rounded-lg flex items-center justify-center hover:bg-neon-pink hover:text-dark dark:hover:text-dark transition-all">
                <FaTelegram className="text-xl" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 dark:bg-dark rounded-lg flex items-center justify-center hover:bg-neon-purple hover:text-dark dark:hover:text-dark transition-all">
                <FaGithub className="text-xl" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500 dark:text-gray-500">
          <p className="flex items-center justify-center space-x-1">
            <span>Made with</span>
            <FaHeart className="text-neon-pink animate-pulse" />
            <span>by ErrorParty Community © {currentYear}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

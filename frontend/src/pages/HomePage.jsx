import { motion, AnimatePresence } from 'framer-motion'
import { FaMicrophone, FaUsers, FaFire, FaGamepad, FaTrophy, FaCopy, FaSteam, FaChartLine, FaClock, FaHeart, FaImage, FaTimes, FaEye } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MemeRating from '../components/MemeRating'
import MemeComments from '../components/MemeComments'
import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

// Component for popular memes preview
function PopularMemesPreview({ onMemeClick }) {
  const [memes, setMemes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopMemes = async () => {
      try {
        const response = await axios.get(`${API_URL}/memes/top?limit=6`)
        if (response.data.success) {
          setMemes(response.data.memes)
        }
      } catch (error) {
        console.error('Error fetching top memes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopMemes()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-video bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (memes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        <p className="text-xl">Мемы скоро появятся! 🎨</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {memes.map((meme, index) => (
        <motion.div
          key={meme.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="card cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onMemeClick(meme)}
        >
          <div className="aspect-video overflow-hidden rounded-lg mb-3">
            <img
              src={meme.imageUrl}
              alt={meme.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white truncate mb-2">
            {meme.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <FaFire className="text-orange-500" />
              {meme.totalRating || 0}
            </span>
            <span className="flex items-center gap-1">
              <FaEye />
              {meme.views || 0}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [serverStats, setServerStats] = useState({
    teamspeak: { online: false, clientsOnline: 0, maxClients: 32 },
    community: { totalUsers: 0, totalMemes: 0, totalQuotes: 0, totalOnlineHours: 0 }
  })
  const [recentEvents, setRecentEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [selectedMeme, setSelectedMeme] = useState(null)
  const [memeRating, setMemeRating] = useState(null)
  const serverAddress = 'ts.errorparty.ru'

  // Handle token from Steam redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const error = urlParams.get('error')

    if (token) {
      console.log('✅ Received auth token, saving to localStorage')
      localStorage.setItem('token', token)
      // Clear URL params and redirect to profile
      window.history.replaceState({}, document.title, '/')
      navigate('/profile', { replace: true })
    } else if (error) {
      console.error('❌ Auth error:', error)
      alert(`Ошибка авторизации: ${error}`)
      window.history.replaceState({}, document.title, '/')
    }
  }, [navigate])

  // Популярные игры в сообществе (будет заменено на реальные данные)
  const popularGames = [
    { name: 'Dota 2', icon: '🎮', players: serverStats.teamspeak.clientsOnline > 0 ? Math.floor(serverStats.teamspeak.clientsOnline * 0.4) : 0, color: 'from-red-500 to-orange-500' },
    { name: 'CS2', icon: '🔫', players: serverStats.teamspeak.clientsOnline > 0 ? Math.floor(serverStats.teamspeak.clientsOnline * 0.3) : 0, color: 'from-blue-500 to-cyan-500' },
    { name: 'GTA V', icon: '🚗', players: serverStats.teamspeak.clientsOnline > 0 ? Math.floor(serverStats.teamspeak.clientsOnline * 0.2) : 0, color: 'from-green-500 to-emerald-500' },
    { name: 'Minecraft', icon: '⛏️', players: serverStats.teamspeak.clientsOnline > 0 ? Math.floor(serverStats.teamspeak.clientsOnline * 0.1) : 0, color: 'from-green-600 to-lime-500' }
  ]

  const features = [
    {
      icon: <FaUsers className="text-4xl" />,
      title: 'Живое сообщество',
      description: `Более ${serverStats.community.totalUsers}+ активных участников`
    },
    {
      icon: <FaGamepad className="text-4xl" />,
      title: 'Игровая интеграция',
      description: 'Статистика из Steam, Minecraft, CS:GO и других игр'
    },
    {
      icon: <FaTrophy className="text-4xl" />,
      title: 'Геймификация',
      description: 'Система рангов, достижений и доска почёта'
    }
  ]

  // FAQ данные
  const faqs = [
    {
      q: 'Как присоединиться к серверу?',
      a: 'Скачайте TeamSpeak, нажмите "Подключиться к серверу" и введите адрес ts.errorparty.ru'
    },
    {
      q: 'Нужна ли регистрация?',
      a: 'Для базового доступа регистрация не нужна. Для полного функционала войдите через Steam.'
    },
    {
      q: 'Какие игры популярны?',
      a: 'Dota 2, CS2, GTA V, Minecraft и многие другие. У нас играют во всё!'
    },
    {
      q: 'Есть ли правила сервера?',
      a: 'Да, основные правила: уважай других, не спамь, не оскорбляй. Подробности в Discord.'
    }
  ]

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(serverAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnectClick = (e) => {
    // Показываем подсказку если TeamSpeak не установлен
    const isTS = /ts3server:/.test(e.currentTarget.href)
    if (isTS) {
      setShowTip(true)
      setTimeout(() => setShowTip(false), 5000)
    }
  }

  // Fetch server statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/server/stats`)
        if (response.data.success) {
          setServerStats(response.data.stats)
        }
      } catch (error) {
        console.error('Error fetching server stats:', error)
      }
    }

    const fetchRecentEvents = async () => {
      try {
        setLoadingEvents(true)
        const response = await axios.get(`${API_URL}/events/recent?limit=8`)
        if (response.data.success) {
          setRecentEvents(response.data.events)
        }
      } catch (error) {
        console.error('Error fetching recent events:', error)
      } finally {
        setLoadingEvents(false)
      }
    }

    fetchStats()
    fetchRecentEvents()
    const interval = setInterval(() => {
      fetchStats()
      fetchRecentEvents()
    }, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Анимация чисел статистики
    const counters = document.querySelectorAll('[data-counter]')
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-counter'))
      const duration = 2000
      const step = target / (duration / 16)
      let current = 0
      
      const timer = setInterval(() => {
        current += step
        if (current >= target) {
          counter.textContent = target
          clearInterval(timer)
        } else {
          counter.textContent = Math.floor(current)
        }
      }, 16)
    })
  }, [serverStats])

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-cyan-500/10 dark:bg-cyan-400/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-pink-500/10 dark:bg-pink-400/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Logo/Icon */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-8"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/50">
              <FaMicrophone className="text-6xl text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-display font-black mb-6">
            <span className="bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              ERRORPARTY.RU
            </span>
          </h1>

          <p className="text-2xl md:text-3xl font-display text-gray-600 dark:text-gray-300 mb-4">
            🎮 Орден Шумоподавителей 🎮
          </p>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Добро пожаловать в официальный портал нашего TeamSpeak-сервера! 
            Здесь тусуются настоящие микрофонные воины, мемоделы и игровые легенды.
          </p>

          {/* Server Address */}
          <div className="mb-8 inline-block">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 border-2 border-cyan-500 px-6 py-4 rounded-lg shadow-lg shadow-cyan-500/30">
              <FaFire className="text-pink-500 text-2xl" />
              <span className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400">{serverAddress}</span>
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-cyan-500/20 rounded transition-colors"
                title="Копировать адрес"
              >
                <FaCopy className={`text-lg ${copied ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`} />
              </button>
            </div>
            {copied && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-500 text-sm mt-2"
              >
                ✓ Адрес скопирован!
              </motion.p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a 
              href="ts3server://ts.errorparty.ru"
              onClick={handleConnectClick}
              className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2 relative group"
            >
              <FaMicrophone className="group-hover:scale-110 transition-transform" />
              Подключиться к серверу
              {showTip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap z-10"
                >
                  Если TeamSpeak не открылся, скачайте его ниже ↓
                </motion.div>
              )}
            </a>
            <a 
              href="https://teamspeak.com/ru/downloads/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-lg px-8 py-4 inline-flex items-center justify-center"
            >
              📥 Скачать TeamSpeak
            </a>
          </div>

          {/* Server Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <div className={`w-4 h-4 rounded-full mx-auto mb-4 ${serverStats.teamspeak.online ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Статус сервера</p>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {serverStats.teamspeak.online ? 'ОНЛАЙН' : 'ОФФЛАЙН'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaUsers className="text-4xl text-pink-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Игроков онлайн</p>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                {serverStats.teamspeak.clientsOnline} / {serverStats.teamspeak.maxClients}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaTrophy className="text-4xl text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Всего участников</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {serverStats.community.totalUsers}
              </p>
            </motion.div>
          </div>

          {/* Popular Games */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              🎮 Сейчас играют
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {popularGames.map((game, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className={`bg-gradient-to-br ${game.color} p-4 rounded-xl shadow-lg text-white text-center relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10">
                    <div className="text-4xl mb-2">{game.icon}</div>
                    <div className="font-bold mb-1">{game.name}</div>
                    <div className="text-sm opacity-90">
                      <FaUsers className="inline mr-1" />
                      {game.players} игроков
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-display font-bold text-center mb-16"
        >
          <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Почему именно мы?
          </span>
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="card text-center"
            >
              <div className="text-cyan-500 mb-4 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-3xl my-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
              Статистика в реальном времени
            </span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaUsers className="text-5xl text-cyan-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Всего пользователей</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white" data-counter={serverStats.community.totalUsers}>
                0
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaClock className="text-5xl text-pink-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Часов голосового чата</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white" data-counter={serverStats.community.totalOnlineHours}>
                0
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaImage className="text-5xl text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Создано мемов</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white" data-counter={serverStats.community.totalMemes}>
                0
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="card text-center"
            >
              <FaHeart className="text-5xl text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Цитат сохранено</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white" data-counter={serverStats.community.totalQuotes}>
                0
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Popular Memes Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                🔥 Горячие мемы
              </span>
            </h2>
            <Link 
              to="/memes"
              className="text-cyan-500 hover:text-cyan-400 font-semibold flex items-center gap-2"
            >
              Смотреть все <FaFire />
            </Link>
          </div>

          <PopularMemesPreview onMemeClick={setSelectedMeme} />
        </motion.div>
      </section>

      {/* Recent Events Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              Последние события
            </span>
          </h2>

          {loadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              <p className="text-xl">Пока нет событий 🤔</p>
              <p className="mt-2">Будь первым, кто что-то сделает!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={`card hover:scale-105 transition-transform border-l-4 ${
                    event.color === 'cyan' ? 'border-cyan-500' :
                    event.color === 'pink' ? 'border-pink-500' :
                    event.color === 'purple' ? 'border-purple-500' :
                    'border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{event.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">{event.title}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{event.description}</p>
                      {event.user && (
                        <div className="flex items-center gap-2 mt-2">
                          {event.user.avatar && (
                            <img 
                              src={event.user.avatar} 
                              alt={event.user.username}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-xs text-gray-500">{event.user.username}</span>
                        </div>
                      )}
                      {event.meme && (
                        <div 
                          className="mt-2 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedMeme(event.meme)}
                        >
                          <img 
                            src={event.meme.imageUrl} 
                            alt={event.meme.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1">
                            <p className="text-xs font-semibold truncate">{event.meme.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Часто задаваемые вопросы
            </span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card group"
              >
                <summary className="cursor-pointer font-bold text-lg text-gray-900 dark:text-white p-4 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors list-none flex items-center justify-between">
                  <span>{faq.q}</span>
                  <span className="text-cyan-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Quick Links Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/dashboard" className="card hover:scale-105 transition-transform text-center group">
            <FaChartLine className="text-5xl text-cyan-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Смотри статистику игроков и активность</p>
          </Link>

          <Link to="/memes" className="card hover:scale-105 transition-transform text-center group">
            <FaImage className="text-5xl text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Мемы</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Создавай и делись мемами с сообществом</p>
          </Link>

          <Link to="/hall-of-fame" className="card hover:scale-105 transition-transform text-center group">
            <FaTrophy className="text-5xl text-yellow-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Доска почёта</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Лучшие игроки и достижения сервера</p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="card text-center bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border-2 border-cyan-500"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-gray-900 dark:text-white">
            Готов присоединиться к безумию? 🎉
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Не стесняйся! Мы не кусаемся (обычно). Заходи, знакомься, создавай мемы и играй вместе с нами!
          </p>
          <a 
            href="/api/auth/steam"
            className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2"
          >
            <FaSteam />
            Войти через Steam
          </a>
        </motion.div>
      </section>

      {/* Meme Modal */}
      <AnimatePresence>
        {selectedMeme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedMeme(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMeme.title}</h2>
                  <button
                    onClick={() => setSelectedMeme(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl p-2"
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <img
                  src={selectedMeme.imageUrl}
                  alt={selectedMeme.title}
                  className="w-full rounded-lg mb-4"
                />
                
                {selectedMeme.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedMeme.description}</p>
                )}
                
                <div className="space-y-4">
                  <MemeRating memeId={selectedMeme.id} />
                  <MemeComments memeId={selectedMeme.id} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

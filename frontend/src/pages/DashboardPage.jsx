import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaUsers, FaHeadphones, FaChartLine, FaClock, FaTrophy, FaFire } from 'react-icons/fa'
import axios from 'axios'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { SkeletonCard } from '../components/Loading'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/Toast'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function DashboardPage() {
  const [topUsers, setTopUsers] = useState([])
  const [serverStats, setServerStats] = useState({
    online: 0,
    channels: 0,
    peak: 0
  })
  const [activityHistory, setActivityHistory] = useState([])
  const [peakTimes, setPeakTimes] = useState(null)
  const [topChannels, setTopChannels] = useState([])
  const [weeklyComparison, setWeeklyComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let isMounted = true
    let interval = null

    const fetchData = async () => {
      try {
        // Only fetch live data and top users frequently
        const [
          usersResponse, 
          statsResponse, 
          channelsResponse
        ] = await Promise.all([
          axios.get(`${API_URL}/users/top?limit=12`),
          axios.get(`${API_URL}/server/teamspeak`),
          axios.get(`${API_URL}/dashboard/top-channels`)
        ])
        
        if (!isMounted) return

        setTopUsers(usersResponse.data.users || [])
        
        if (statsResponse.data.success) {
          setServerStats({
            online: statsResponse.data.server.clientsOnline || 0,
            channels: statsResponse.data.server.channelsOnline || 0,
            peak: statsResponse.data.server.clientsOnline || 0
          })
        }

        if (channelsResponse.data.success) {
          setTopChannels(channelsResponse.data.channels || [])
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching live data:', error)
        if (isMounted) {
          toast.error('Не удалось загрузить данные')
          setLoading(false)
        }
      }
    }

    const fetchStaticData = async () => {
      try {
        // Fetch historical data only once
        const [
          activityResponse, 
          peakTimesResponse,
          weeklyResponse
        ] = await Promise.all([
          axios.get(`${API_URL}/dashboard/activity-history?days=7`),
          axios.get(`${API_URL}/dashboard/peak-times?days=7`),
          axios.get(`${API_URL}/dashboard/weekly-comparison`)
        ])

        if (!isMounted) return

        if (activityResponse.data.success) {
          setActivityHistory(activityResponse.data.data || [])
        }

        if (peakTimesResponse.data.success) {
          setPeakTimes(peakTimesResponse.data)
        }

        if (weeklyResponse.data.success) {
          setWeeklyComparison(weeklyResponse.data)
        }
      } catch (error) {
        console.error('Error fetching static data:', error)
      }
    }

    // Initial load
    fetchData()
    fetchStaticData()
    
    // Update live data every 60 seconds (reduced from 30)
    interval = setInterval(fetchData, 60000)

    return () => {
      isMounted = false
      if (interval) clearInterval(interval)
    }
  }, []) // Remove toast from dependencies

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 sm:mb-12"
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-2 sm:mb-4">
          <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
            Dashboard
          </span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">Следи за активностью сервера в реальном времени</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">Онлайн сейчас</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-cyan">{serverStats.online}</p>
              {weeklyComparison && (
                <div className="flex items-center gap-1 mt-2">
                  <span className={`text-xs font-semibold ${
                    weeklyComparison.change.trend === 'up' ? 'text-green-500' : 
                    weeklyComparison.change.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {weeklyComparison.change.trend === 'up' && '↑'}
                    {weeklyComparison.change.trend === 'down' && '↓'}
                    {weeklyComparison.change.trend === 'stable' && '→'}
                    {' '}{Math.abs(weeklyComparison.change.avg)}%
                  </span>
                  <span className="text-xs text-gray-500">vs прошлая неделя</span>
                </div>
              )}
            </div>
            <FaUsers className="text-4xl sm:text-5xl text-neon-cyan opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">Активных каналов</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-pink">{serverStats.channels}</p>
              {topChannels.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {topChannels.reduce((sum, ch) => sum + ch.clientCount, 0)} игроков
                </p>
              )}
            </div>
            <FaHeadphones className="text-4xl sm:text-5xl text-neon-pink opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="card sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-1">Пик активности</p>
              <p className="text-2xl sm:text-3xl font-bold text-neon-purple">{serverStats.peak}</p>
              {peakTimes?.peakHour && (
                <p className="text-xs text-gray-500 mt-2">
                  <FaClock className="inline mr-1" />
                  {peakTimes.peakHour.timeRange}
                </p>
              )}
            </div>
            <FaChartLine className="text-4xl sm:text-5xl text-neon-purple opacity-20" />
          </div>
        </motion.div>
      </div>

      {/* Activity Chart */}
      {!loading && activityHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-4 sm:mb-6 flex items-center">
            <FaChartLine className="mr-2 sm:mr-3 text-neon-cyan" />
            История активности (7 дней)
          </h2>
          <div className="h-64 sm:h-80">
            <Line
              data={{
                labels: activityHistory.map(d => {
                  const date = new Date(d.timestamp);
                  return `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:00`;
                }),
                datasets: [{
                  label: 'Игроков онлайн',
                  data: activityHistory.map(d => d.clients),
                  borderColor: 'rgb(34, 211, 238)',
                  backgroundColor: 'rgba(34, 211, 238, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: 'rgba(156, 163, 175, 0.8)'
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)'
                    }
                  },
                  x: {
                    ticks: {
                      color: 'rgba(156, 163, 175, 0.8)',
                      maxRotation: 45,
                      minRotation: 45
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)'
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Peak Times Chart */}
      {!loading && peakTimes?.hourlyStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-4 sm:mb-6 flex items-center">
            <FaClock className="mr-2 sm:mr-3 text-neon-pink" />
            Активность по времени суток
          </h2>
          <div className="h-64 sm:h-80">
            <Bar
              data={{
                labels: peakTimes.hourlyStats.map(s => `${s.hour}:00`),
                datasets: [{
                  label: 'Средний онлайн',
                  data: peakTimes.hourlyStats.map(s => s.avgClients),
                  backgroundColor: peakTimes.hourlyStats.map(s =>
                    s.hour === peakTimes.peakHour.hour
                      ? 'rgba(236, 72, 153, 0.8)'
                      : 'rgba(34, 211, 238, 0.5)'
                  ),
                  borderColor: peakTimes.hourlyStats.map(s =>
                    s.hour === peakTimes.peakHour.hour
                      ? 'rgb(236, 72, 153)'
                      : 'rgb(34, 211, 238)'
                  ),
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      afterLabel: (context) => {
                        if (context.dataIndex === peakTimes.peakHour.hour) {
                          return '🔥 Пик активности';
                        }
                        return '';
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: 'rgba(156, 163, 175, 0.8)'
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)'
                    }
                  },
                  x: {
                    ticks: {
                      color: 'rgba(156, 163, 175, 0.8)'
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)'
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Top Channels */}
      {!loading && topChannels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card mb-8"
        >
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-4 sm:mb-6 flex items-center">
            <FaFire className="mr-2 sm:mr-3 text-neon-purple" />
            Топ активных каналов
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topChannels.map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="bg-gray-100 dark:bg-dark p-4 rounded-lg border border-gray-300 dark:border-gray-800 hover:border-neon-cyan transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {index < 3 && (
                      <span className="text-2xl">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                      </span>
                    )}
                    <h3 className="font-bold text-gray-900 dark:text-white">{channel.name}</h3>
                  </div>
                  <span className="px-2 py-1 bg-neon-cyan/20 text-neon-cyan rounded-full text-sm font-bold">
                    {channel.clientCount} чел
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {channel.clients.slice(0, 5).map((client, idx) => (
                    <span
                      key={idx}
                      className={`text-xs px-2 py-1 rounded ${
                        client.away
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}
                    >
                      {client.nickname}
                    </span>
                  ))}
                  {channel.clients.length > 5 && (
                    <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      +{channel.clients.length - 5}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-xl sm:text-2xl font-display font-bold mb-4 sm:mb-6 flex items-center">
          <FaUsers className="mr-2 sm:mr-3 text-neon-cyan" />
          Топ игроков
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">Пока никого нет 😢</p>
            <p className="text-gray-500 dark:text-gray-500 mt-2">Будь первым!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {topUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-100 dark:bg-dark p-4 sm:p-5 rounded-lg border border-gray-300 dark:border-gray-800 hover:border-neon-cyan transition-all relative overflow-hidden"
              >
                {/* Medal for top 3 */}
                {index < 3 && (
                  <div className="absolute top-2 right-2 text-xl sm:text-2xl">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                  </div>
                )}
                
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center relative flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold">{user.username[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base sm:text-lg truncate text-gray-900 dark:text-white">{user.username}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {user.role === 'admin' && '👑 Администратор'}
                      {user.role === 'moderator' && '⭐ Модератор'}
                      {user.role === 'user' && '👤 Пользователь'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">⏱️ Онлайн:</span>
                    <span className="text-neon-cyan font-mono font-bold">{user.onlineTimeFormatted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">📊 Уровень:</span>
                    <span className="text-neon-purple font-bold">LVL {user.stats?.level || 1}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">🔌 Подключений:</span>
                    <span className="text-neon-pink font-bold">{user.stats?.totalConnections || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </div>
  )
}

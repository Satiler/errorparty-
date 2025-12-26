import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaChartLine,
  FaCalendarAlt,
  FaClock,
  FaGamepad,
  FaTrophy,
  FaUsers
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch(`/api/admin/analytics/advanced?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('У вас нет прав доступа к админ-панели.');
        navigate('/');
        return;
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  // Chart configurations
  const dayOfWeekChartData = analytics ? {
    labels: analytics.dayOfWeekActivity.map(d => d.day),
    datasets: [
      {
        label: 'Среднее время в голосе (мин)',
        data: analytics.dayOfWeekActivity.map(d => d.avgVoiceTime),
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 2
      },
      {
        label: 'Подключения',
        data: analytics.dayOfWeekActivity.map(d => d.totalConnections),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    ]
  } : null;

  const userGrowthChartData = analytics && analytics.userGrowth.length > 0 ? {
    labels: analytics.userGrowth.map(u => new Date(u.date).toLocaleDateString('ru-RU')),
    datasets: [{
      label: 'Новые пользователи',
      data: analytics.userGrowth.map(u => parseInt(u.newUsers)),
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      fill: true
    }]
  } : null;

  const achievementsByGameData = analytics ? {
    labels: Object.keys(analytics.achievementsByGame).map(game => {
      const labels = { dota2: 'Dota 2', cs2: 'CS2', general: 'Общее' };
      return labels[game] || game;
    }),
    datasets: [{
      data: Object.values(analytics.achievementsByGame),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(249, 115, 22, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2
    }]
  } : null;

  const memeStatsData = analytics ? {
    labels: Object.keys(analytics.memeStats).map(status => {
      const labels = { pending: 'Ожидают', approved: 'Одобрены', rejected: 'Отклонены' };
      return labels[status] || status;
    }),
    datasets: [{
      data: Object.values(analytics.memeStats),
      backgroundColor: [
        'rgba(234, 179, 8, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgba(234, 179, 8, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 2
    }]
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
          >
            <FaArrowLeft />
            Назад к панели
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <FaChartLine className="text-purple-400" />
                Расширенная аналитика
              </h1>
              <p className="text-gray-400">
                Детальная статистика активности и трендов
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
              {['week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    period === p
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day of Week Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaCalendarAlt className="text-purple-400" />
              Активность по дням недели
            </h3>
            {dayOfWeekChartData && (
              <div style={{ height: '300px' }}>
                <Bar
                  data={dayOfWeekChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        display: true,
                        labels: { color: '#fff' }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                      },
                      x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                      }
                    }
                  }}
                />
              </div>
            )}
          </motion.div>

          {/* User Growth */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaUsers className="text-green-400" />
              Рост пользователей
            </h3>
            {userGrowthChartData && userGrowthChartData.labels.length > 0 ? (
              <div style={{ height: '300px' }}>
                <Line
                  data={userGrowthChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { 
                          color: '#9ca3af',
                          stepSize: 1
                        },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                      },
                      x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Нет данных за выбранный период
              </div>
            )}
          </motion.div>

          {/* Achievements by Game */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaTrophy className="text-yellow-400" />
              Достижения по играм
            </h3>
            {achievementsByGameData && Object.keys(analytics.achievementsByGame).length > 0 ? (
              <div style={{ height: '300px' }} className="flex items-center justify-center">
                <Doughnut
                  data={achievementsByGameData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: '#fff', padding: 20 }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af'
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Нет достижений за выбранный период
              </div>
            )}
          </motion.div>

          {/* Meme Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaGamepad className="text-pink-400" />
              Статистика мемов
            </h3>
            {memeStatsData && Object.keys(analytics.memeStats).length > 0 ? (
              <div style={{ height: '300px' }} className="flex items-center justify-center">
                <Doughnut
                  data={memeStatsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: '#fff', padding: 20 }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af'
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Нет мемов за выбранный период
              </div>
            )}
          </motion.div>
        </div>

        {/* Top Performers */}
        {analytics && analytics.topPerformers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaClock className="text-cyan-400" />
              ТОП-10 по времени онлайн за период
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {analytics.topPerformers.map((performer, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3 border border-gray-700"
                >
                  <div className="text-2xl font-bold text-purple-400">#{index + 1}</div>
                  <img
                    src={performer.avatar || '/default-avatar.png'}
                    alt={performer.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{performer.username}</div>
                    <div className="text-gray-400 text-sm">{performer.totalTime}ч</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;

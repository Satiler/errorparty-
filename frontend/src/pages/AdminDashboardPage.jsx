import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaImage, 
  FaTrophy, 
  FaChartLine,
  FaBan,
  FaUserShield,
  FaClock,
  FaStar,
  FaRobot,
  FaMusic
} from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        // Нет прав доступа - редирект на главную
        alert('У вас нет прав доступа к админ-панели. Пожалуйста, войдите как администратор.');
        navigate('/');
        return;
      }

      const data = await response.json();
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      navigate('/');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Нет доступа</div>
      </div>
    );
  }

  // Проверка данных
  if (!stats || !stats.overview || !stats.topUsers || !stats.recentActivity || !stats.roleStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Ошибка загрузки данных</div>
      </div>
    );
  }

  const { overview, topUsers, recentActivity, roleStats } = stats;

  // Activity chart data
  const activityChartData = {
    labels: recentActivity.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }).reverse(),
    datasets: [
      {
        label: 'Время в голосе (часы)',
        data: recentActivity.map(day => Math.round(day.totalVoiceTime / 3600)).reverse(),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Role distribution chart
  const roleChartData = {
    labels: Object.keys(roleStats).map(r => {
      const labels = { user: 'Пользователи', moderator: 'Модераторы', admin: 'Админы' };
      return labels[r] || r;
    }),
    datasets: [{
      data: Object.values(roleStats),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaUserShield className="text-purple-400" />
            Панель администратора
          </h1>
          <p className="text-gray-400">Управление сайтом и статистика</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm mb-1">Пользователи</p>
                <p className="text-3xl font-bold">{overview.totalUsers}</p>
                <p className="text-blue-200 text-xs mt-1">
                  +{overview.newUsersThisWeek} за неделю
                </p>
              </div>
              <FaUsers className="text-5xl text-blue-300 opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm mb-1">Мемы</p>
                <p className="text-3xl font-bold">{overview.totalMemes}</p>
                <p className="text-purple-200 text-xs mt-1">
                  +{overview.memesThisWeek} за неделю
                </p>
              </div>
              <FaImage className="text-5xl text-purple-300 opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm mb-1">Достижения</p>
                <p className="text-3xl font-bold">{overview.totalAchievements}</p>
                <p className="text-yellow-200 text-xs mt-1">
                  +{overview.achievementsUnlockedThisWeek} за неделю
                </p>
              </div>
              <FaTrophy className="text-5xl text-yellow-300 opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 text-white shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm mb-1">Забанено</p>
                <p className="text-3xl font-bold">{overview.bannedUsers}</p>
                <p className="text-red-200 text-xs mt-1">
                  {((overview.bannedUsers / overview.totalUsers) * 100).toFixed(1)}% от всех
                </p>
              </div>
              <FaBan className="text-5xl text-red-300 opacity-50" />
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaChartLine className="text-purple-400" />
              Активность (7 дней)
            </h3>
            <div style={{ height: '300px' }}>
              <Line
                data={activityChartData}
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
          </motion.div>

          {/* Role Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaUserShield className="text-purple-400" />
              Распределение ролей
            </h3>
            <div style={{ height: '300px' }} className="flex items-center justify-center">
              <Doughnut
                data={roleChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#9ca3af' }
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
          </motion.div>
        </div>

        {/* Top Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FaStar className="text-yellow-400" />
            Топ пользователей по времени в голосе
          </h3>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="text-2xl font-bold text-purple-400 w-8">
                  #{index + 1}
                </div>
                <img
                  src={user.avatar || '/default-avatar.png'}
                  alt={user.username}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="text-white font-semibold">{user.username}</div>
                  <div className="text-gray-400 text-sm flex items-center gap-2">
                    <FaClock className="text-cyan-400" />
                    {user.totalOnlineTime} часов
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <button
            onClick={() => navigate('/admin/users')}
            className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaUsers size={24} />
            Управление пользователями
          </button>
          <button
            onClick={() => navigate('/admin/memes')}
            className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaImage size={24} />
            Модерация мемов
          </button>
          <button
            onClick={() => navigate('/admin/achievements')}
            className="p-6 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaTrophy size={24} />
            Управление достижениями
          </button>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="p-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaChartLine size={24} />
            Расширенная аналитика
          </button>
          <button
            onClick={() => navigate('/admin/bot')}
            className="p-6 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaRobot size={24} />
            Steam Bot
          </button>
          <button
            onClick={() => navigate('/admin/music')}
            className="p-6 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
          >
            <FaMusic size={24} />
            Музыка
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

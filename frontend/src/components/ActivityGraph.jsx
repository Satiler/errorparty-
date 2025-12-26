import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

const ActivityGraph = ({ userId }) => {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/user/${userId}/activity?days=${period}`);
        const data = await response.json();
        
        if (data.success) {
          setActivityData(data);
        }
      } catch (err) {
        console.error('Error fetching activity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [userId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!activityData || !activityData.activity || activityData.activity.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Нет данных об активности</p>
      </div>
    );
  }

  const chartData = {
    labels: activityData.activity.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: 'Время в голосе (часы)',
        data: activityData.activity.map(day => day.voiceTime),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: 'rgba(168, 85, 247, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const date = new Date(activityData.activity[index].date);
            return date.toLocaleDateString('ru-RU', { 
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            });
          },
          label: (context) => {
            const index = context.dataIndex;
            const day = activityData.activity[index];
            return [
              `Время в голосе: ${day.voiceTime} ч`,
              `Подключений: ${day.connections}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          callback: (value) => value + ' ч'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      },
      x: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      }
    }
  };

  const totalHours = Math.round(activityData.totalVoiceTime / 3600);
  const avgHoursPerDay = (totalHours / period).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Активность</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-lg transition-all ${
              period === 7
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            7 дней
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-lg transition-all ${
              period === 30
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            30 дней
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{totalHours}ч</div>
          <div className="text-sm text-gray-400">Всего</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{avgHoursPerDay}ч</div>
          <div className="text-sm text-gray-400">В среднем/день</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{activityData.totalConnections}</div>
          <div className="text-sm text-gray-400">Подключений</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700" style={{ height: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ActivityGraph;

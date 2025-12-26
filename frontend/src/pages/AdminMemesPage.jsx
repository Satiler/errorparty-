import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaSearch,
  FaCheck,
  FaTimes,
  FaTrash,
  FaImage,
  FaUser,
  FaCalendar,
  FaThumbsUp
} from 'react-icons/fa';

const AdminMemesPage = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemes();
  }, [page, search, statusFilter]);

  const fetchMemes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const params = new URLSearchParams({
        page,
        limit: 12,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/memes?${params}`, {
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
      setMemes(Array.isArray(data.memes) ? data.memes : []);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching memes:', error);
      navigate('/');
      setLoading(false);
    }
  };

  const handleApproveMeme = async (memeId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/memes/${memeId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchMemes();
    } catch (error) {
      console.error('Error approving meme:', error);
    }
  };

  const handleRejectMeme = async (memeId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/memes/${memeId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchMemes();
    } catch (error) {
      console.error('Error rejecting meme:', error);
    }
  };

  const handleDeleteMeme = async (memeId) => {
    if (!confirm('Вы уверены, что хотите удалить этот мем?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/memes/${memeId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchMemes();
    } catch (error) {
      console.error('Error deleting meme:', error);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      approved: { label: 'Одобрен', class: 'bg-green-500' },
      pending: { label: 'На модерации', class: 'bg-yellow-500' },
      rejected: { label: 'Отклонён', class: 'bg-red-500' }
    };
    const { label, class: className } = config[status] || config.pending;
    return <span className={`px-3 py-1 ${className} text-white text-xs rounded-full`}>{label}</span>;
  };

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
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaImage className="text-purple-400" />
            Модерация мемов
          </h1>
          <p className="text-gray-400">
            Всего мемов: {pagination?.total || 0}
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Все статусы</option>
              <option value="pending">На модерации</option>
              <option value="approved">Одобренные</option>
              <option value="rejected">Отклонённые</option>
            </select>
          </div>
        </motion.div>

        {/* Memes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {memes && memes.length > 0 && memes.map((meme) => (
            <motion.div
              key={meme.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-purple-500/30 hover:border-purple-500/50 transition-all"
            >
              {/* Image */}
              <div className="relative h-64 bg-gray-900">
                <img
                  src={meme.imageUrl}
                  alt={meme.title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 right-2">
                  {getStatusBadge(meme.status)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-white font-bold text-lg mb-2 truncate">
                  {meme.title}
                </h3>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-purple-400" />
                    <span>{meme.creator?.username || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCalendar className="text-cyan-400" />
                    <span>{new Date(meme.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaThumbsUp className="text-green-400" />
                    <span>{meme.likes || 0} лайков</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {meme.status !== 'approved' && (
                    <button
                      onClick={() => handleApproveMeme(meme.id)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FaCheck />
                      Одобрить
                    </button>
                  )}
                  {meme.status !== 'rejected' && (
                    <button
                      onClick={() => handleRejectMeme(meme.id)}
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FaTimes />
                      Отклонить
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMeme(meme.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {(!memes || memes.length === 0) && (
          <div className="text-center py-12">
            <FaImage className="text-6xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Мемы не найдены</p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              Назад
            </button>
            <span className="text-white">
              Страница {page} из {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              Вперед
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMemesPage;

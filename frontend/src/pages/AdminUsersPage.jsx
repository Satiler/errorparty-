import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaSearch,
  FaBan,
  FaCheckCircle,
  FaUserShield,
  FaUser,
  FaFilter
} from 'react-icons/fa';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, bannedFilter]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(bannedFilter && { banned: bannedFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
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
      setUsers(Array.isArray(data.users) ? data.users : []);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      navigate('/');
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId, currentBanned) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: !currentBanned })
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling ban:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: newRole })
      });

      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const getRoleBadge = (role) => {
    const config = {
      admin: { label: 'Админ', class: 'bg-red-500' },
      moderator: { label: 'Модератор', class: 'bg-purple-500' },
      user: { label: 'Пользователь', class: 'bg-blue-500' }
    };
    const { label, class: className } = config[role] || config.user;
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
            <FaUserShield className="text-purple-400" />
            Управление пользователями
          </h1>
          <p className="text-gray-400">
            Всего пользователей: {pagination?.total || 0}
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Все роли</option>
              <option value="user">Пользователи</option>
              <option value="moderator">Модераторы</option>
              <option value="admin">Админы</option>
            </select>

            {/* Banned Filter */}
            <select
              value={bannedFilter}
              onChange={(e) => {
                setBannedFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Все статусы</option>
              <option value="false">Активные</option>
              <option value="true">Забаненные</option>
            </select>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Пользователь</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Роль</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Статус</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Время онлайн</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Дата регистрации</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users && users.length > 0 ? users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || '/default-avatar.png'}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                      >
                        <option value="user">Пользователь</option>
                        <option value="moderator">Модератор</option>
                        <option value="admin">Админ</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {user.banned ? (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1 w-fit">
                          <FaBan />
                          Забанен
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1 w-fit">
                          <FaCheckCircle />
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {Math.floor(user.totalOnlineTime / 3600)}ч
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleBanToggle(user.id, user.banned)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          user.banned
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {user.banned ? 'Разбанить' : 'Забанить'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      Пользователи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
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

export default AdminUsersPage;

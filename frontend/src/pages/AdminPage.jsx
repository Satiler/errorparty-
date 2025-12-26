import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaTrash, FaCheck, FaTimes, FaEye, FaFlag, FaUsers, FaImage, FaMusic, FaDownload, FaUpload, FaList, FaCog } from 'react-icons/fa'
import axios from 'axios'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/Toast'
import { LoadingSpinner } from '../components/Loading'
import UploadTrackModal from '../components/UploadTrackModal'
import AdminPlaylistsManager from '../components/AdminPlaylistsManager'
import AdminTracksManager from '../components/AdminTracksManager'

import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function AdminPage() {
  const [memes, setMemes] = useState([])
  const [users, setUsers] = useState([])
  const [musicStats, setMusicStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('memes') // memes | users | music | playlists | tracks
  const [filter, setFilter] = useState('all') // all | pending | approved | rejected
  const [importForm, setImportForm] = useState({
    source: 'jamendo',
    query: 'popular',
    limit: 10,
    genres: ''
  })
  const [importing, setImporting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [activeTab, filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      if (activeTab === 'memes') {
        const response = await axios.get(`${API_URL}/admin/memes`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: filter !== 'all' ? filter : undefined }
        })
        setMemes(response.data.memes || [])
      } else if (activeTab === 'users') {
        const response = await axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUsers(response.data.users || [])
      } else if (activeTab === 'music') {
        const response = await axios.get(`${API_URL}/admin/music/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setMusicStats(response.data)
        
        // Get auto-import stats
        const autoImportStats = await axios.get(`${API_URL}/admin/music/auto-import/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setMusicStats(prev => ({ ...prev, ...autoImportStats.data.stats }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleMemeAction = async (memeId, action) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/admin/memes/${memeId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success(
        action === 'approve' ? 'Мем одобрен' :
        action === 'reject' ? 'Мем отклонен' :
        'Мем удален'
      )
      
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Ошибка выполнения действия')
    }
  }

  const handleUserAction = async (userId, action, value) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/admin/users/${userId}/${action}`,
        { value },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success('Действие выполнено успешно')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Ошибка выполнения действия')
    }
  }

  const handleMusicImport = async () => {
    if (!importForm.query.trim()) {
      toast.error('Введите поисковый запрос')
      return
    }

    setImporting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/admin/music/import`,
        importForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast.success(`Импортировано: ${response.data.imported.albums} альбомов, ${response.data.imported.tracks} треков`)
      fetchData() // Refresh stats
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error.response?.data?.error || 'Ошибка импорта музыки')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              Панель администратора
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Управление контентом и пользователями</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('memes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'memes'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FaImage />
            Мемы ({memes.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FaUsers />
            Пользователи ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'music'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FaMusic />
            Музыка
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'playlists'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FaList />
            Плейлисты
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'tracks'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FaCog />
            Управление треками
          </button>
        </div>

        {/* Memes Tab */}
        {activeTab === 'memes' && (
          <>
            {/* Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'Все', icon: <FaEye /> },
                { id: 'pending', label: 'На модерации', icon: <FaFlag /> },
                { id: 'approved', label: 'Одобренные', icon: <FaCheck /> },
                { id: 'rejected', label: 'Отклоненные', icon: <FaTimes /> }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    filter === f.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {f.icon}
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Memes Grid */}
            {loading ? (
              <LoadingSpinner text="Загрузка мемов..." />
            ) : memes.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 text-lg">Нет мемов для отображения</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memes.map((meme, index) => (
                  <motion.div
                    key={meme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Meme Image */}
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                      {meme.imageUrl ? (
                        <img
                          src={meme.imageUrl}
                          alt={meme.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          Нет изображения
                        </div>
                      )}
                    </div>

                    {/* Meme Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{meme.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {meme.description || 'Без описания'}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>❤️ {meme.likes || 0}</span>
                        <span>💬 {meme.comments?.length || 0}</span>
                        <span>👤 {meme.user?.username || 'Unknown'}</span>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          meme.status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                          meme.status === 'rejected' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {meme.status === 'approved' ? 'Одобрен' :
                           meme.status === 'rejected' ? 'Отклонен' :
                           'На модерации'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {meme.status !== 'approved' && (
                          <button
                            onClick={() => handleMemeAction(meme.id, 'approve')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          >
                            <FaCheck />
                            Одобрить
                          </button>
                        )}
                        {meme.status !== 'rejected' && (
                          <button
                            onClick={() => handleMemeAction(meme.id, 'reject')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                          >
                            <FaTimes />
                            Отклонить
                          </button>
                        )}
                        <button
                          onClick={() => handleMemeAction(meme.id, 'delete')}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {loading ? (
              <LoadingSpinner text="Загрузка пользователей..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Steam ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Мемов
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Дата регистрации
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {user.steamId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleUserAction(user.id, 'role', e.target.value)}
                            className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none text-sm"
                          >
                            <option value="user">Пользователь</option>
                            <option value="moderator">Модератор</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {user._count?.memes || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleUserAction(user.id, 'ban', !user.banned)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              user.banned
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                          >
                            {user.banned ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Music Tab */}
        {activeTab === 'music' && (
          <div className="space-y-6">
            {/* Upload Track Button */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <FaUpload />
                Загрузить трек
              </button>
            </motion.div>

            {/* Stats */}
            {loading ? (
              <LoadingSpinner text="Загрузка статистики..." />
            ) : musicStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Всего альбомов</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{musicStats.totalAlbums}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <FaMusic className="text-white text-xl" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Всего треков</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{musicStats.totalTracks}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <FaMusic className="text-white text-xl" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Внешних источников</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{musicStats.externalTracks}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <FaDownload className="text-white text-xl" />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Import Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Импорт музыки из API
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Источник
                  </label>
                  <select
                    value={importForm.source}
                    onChange={(e) => setImportForm({ ...importForm, source: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none"
                  >
                    <option value="jamendo">Jamendo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Поисковый запрос
                  </label>
                  <input
                    type="text"
                    value={importForm.query}
                    onChange={(e) => setImportForm({ ...importForm, query: e.target.value })}
                    placeholder="popular, rock, electronic..."
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Количество альбомов
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={importForm.limit}
                    onChange={(e) => setImportForm({ ...importForm, limit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Жанры (через запятую)
                  </label>
                  <input
                    type="text"
                    value={importForm.genres}
                    onChange={(e) => setImportForm({ ...importForm, genres: e.target.value })}
                    placeholder="rock, pop, electronic..."
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none"
                  />
                </div>
              </div>

              <button
                onClick={handleMusicImport}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Импорт...
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Импортировать музыку
                  </>
                )}
              </button>
            </motion.div>

            {/* Auto Import */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Автоматический импорт новинок
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Система автоматически импортирует свежие альбомы каждый день в 3:00. 
                Вы можете запустить импорт вручную прямо сейчас.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Сегодня</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {musicStats?.today || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">За неделю</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {musicStats?.lastWeek || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Всего</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {musicStats?.total || 0}
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setImporting(true);
                  try {
                    const token = localStorage.getItem('token');
                    const response = await axios.post(
                      `${API_URL}/admin/music/auto-import`,
                      { limit: 20 },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    if (response.data.success) {
                      toast.success(response.data.message);
                      fetchData();
                    } else {
                      toast.error(response.data.error || 'Ошибка импорта');
                    }
                  } catch (error) {
                    console.error('Auto-import error:', error);
                    toast.error(error.response?.data?.error || 'Ошибка автоматического импорта');
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Импорт...
                  </>
                ) : (
                  <>
                    <FaDownload />
                    Запустить импорт новинок
                  </>
                )}
              </button>
            </motion.div>

            {/* Zaycev.net Import */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎵</span>
                Импорт с Zaycev.net
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Импортируйте популярные альбомы и треки с Zaycev.net, включая русскую музыку.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Import Albums */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Импорт альбомов</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Русский рок, поп, рэп и зарубежные хиты (демо, без воспроизведения)
                  </p>
                  <button
                    onClick={async () => {
                      setImporting(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(
                          `${API_URL}/admin/music/zaycev/import-albums`,
                          { limit: 10 },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        if (response.data.success) {
                          toast.success(response.data.message);
                          fetchData();
                        } else {
                          toast.error(response.data.error || 'Ошибка импорта');
                        }
                      } catch (error) {
                        console.error('Zaycev albums import error:', error);
                        toast.error(error.response?.data?.error || 'Ошибка импорта альбомов');
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Импорт...
                      </>
                    ) : (
                      <>
                        <FaDownload />
                        Импортировать 10 альбомов
                      </>
                    )}
                  </button>
                </div>

                {/* Import Real Playable Tracks */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    ✅ Реальные треки (Zaycev.net)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    ⚠️ Zaycev.net недоступен (SPA архитектура)
                  </p>
                  <button
                    disabled={true}
                    className="w-full bg-gray-400 text-white py-2 px-4 rounded hover:bg-gray-500 transition-colors flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
                  >
                    <FaTimes />
                    Недоступно
                  </button>
                </div>

                {/* Import Jamendo Popular Tracks */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    🎵 Популярные треки (Jamendo)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Легальная музыка с прямыми MP3 ссылками
                  </p>
                  <button
                    onClick={async () => {
                      setImporting(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(
                          `${API_URL}/admin/music/jamendo/import-popular`,
                          { limit: 50 },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        if (response.data.success) {
                          toast.success(response.data.message);
                          fetchData();
                        } else {
                          toast.error(response.data.error || 'Ошибка импорта');
                        }
                      } catch (error) {
                        console.error('Jamendo import error:', error);
                        toast.error(error.response?.data?.error || 'Ошибка импорта треков');
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={importing}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Импорт...
                      </>
                    ) : (
                      <>
                        <FaDownload />
                        Импортировать 50 треков
                      </>
                    )}
                  </button>
                </div>

                {/* Import Jamendo by Genre */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    🎸 Треки по жанрам (Jamendo)
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Rock, Electronic, Jazz, Classical
                  </p>
                  <button
                    onClick={async () => {
                      setImporting(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(
                          `${API_URL}/admin/music/jamendo/import-tracks`,
                          { 
                            queries: ['rock', 'electronic', 'jazz', 'classical', 'pop'], 
                            limit: 10 
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        if (response.data.success) {
                          toast.success(response.data.message);
                          fetchData();
                        } else {
                          toast.error(response.data.error || 'Ошибка импорта');
                        }
                      } catch (error) {
                        console.error('Jamendo genre import error:', error);
                        toast.error(error.response?.data?.error || 'Ошибка импорта по жанрам');
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={importing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2 px-4 rounded hover:from-indigo-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Импорт...
                      </>
                    ) : (
                      <>
                        <FaDownload />
                        Импортировать 50 треков
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Import Top Tracks */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Топ треки (демо)</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Популярные треки различных жанров (без воспроизведения)
                  </p>
                  <button
                    onClick={async () => {
                      setImporting(true);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.post(
                          `${API_URL}/admin/music/zaycev/import-top`,
                          { limit: 15 },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        if (response.data.success) {
                          toast.success(response.data.message);
                          fetchData();
                        } else {
                          toast.error(response.data.error || 'Ошибка импорта');
                        }
                      } catch (error) {
                        console.error('Zaycev top import error:', error);
                        toast.error(error.response?.data?.error || 'Ошибка импорта топ треков');
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Импорт...
                      </>
                    ) : (
                      <>
                        <FaDownload />
                        Импортировать 15 треков
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
                <strong>💡 Совет:</strong> Альбомы включают треки с правильной кодировкой UTF-8 для русской музыки
              </div>
            </motion.div>
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <AdminPlaylistsManager toast={toast} />
        )}

        {/* Tracks Management Tab */}
        {activeTab === 'tracks' && (
          <AdminTracksManager toast={toast} />
        )}

        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        
        {/* Upload Track Modal */}
        <UploadTrackModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(result) => {
            if (result.uploaded === 1) {
              toast.success(`Трек "${result.tracks[0].title}" успешно загружен!`)
            } else {
              toast.success(`Успешно загружено ${result.uploaded} ${result.uploaded === 1 ? 'трек' : result.uploaded < 5 ? 'трека' : 'треков'}!`)
            }
            if (activeTab === 'music') {
              fetchData() // Обновляем статистику
            }
          }}
        />
      </div>
    </div>
  )
}

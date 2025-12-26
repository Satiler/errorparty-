import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaSearch, FaEdit, FaTrash, FaPlay, FaPause, FaDownload, FaEye, FaEyeSlash, FaTimes, FaCheck, FaMusic, FaImage, FaFilter } from 'react-icons/fa'
import axios from 'axios'
import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function AdminTracksManager({ toast }) {
  const [tracks, setTracks] = useState([])
  const [filteredTracks, setFilteredTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const [playingTrackId, setPlayingTrackId] = useState(null)
  
  const [filters, setFilters] = useState({
    genre: 'all',
    visibility: 'all', // all | public | private
    source: 'all' // all | local | external
  })

  const [editForm, setEditForm] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    year: '',
    isPublic: true,
    allowDownload: true,
    coverUrl: ''
  })

  const [stats, setStats] = useState({
    total: 0,
    public: 0,
    private: 0,
    local: 0,
    external: 0
  })

  useEffect(() => {
    fetchTracks()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filters, tracks])

  const fetchTracks = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/admin/music/tracks?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const fetchedTracks = response.data.tracks || []
      setTracks(fetchedTracks)
      
      // Подсчет статистики
      const newStats = {
        total: fetchedTracks.length,
        public: fetchedTracks.filter(t => t.isPublic).length,
        private: fetchedTracks.filter(t => !t.isPublic).length,
        local: fetchedTracks.filter(t => t.sourceType === 'local').length,
        external: fetchedTracks.filter(t => t.sourceType !== 'local').length
      }
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching tracks:', error)
      toast?.error('Ошибка загрузки треков')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...tracks]

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(track => {
        const albumName = typeof track.album === 'object' && track.album?.title ? track.album.title : (track.album || '')
        return (
          track.title?.toLowerCase().includes(query) ||
          track.artist?.toLowerCase().includes(query) ||
          albumName.toLowerCase().includes(query) ||
          track.genre?.toLowerCase().includes(query)
        )
      })
    }

    // Фильтр по жанру
    if (filters.genre !== 'all') {
      filtered = filtered.filter(track => track.genre === filters.genre)
    }

    // Фильтр по видимости
    if (filters.visibility !== 'all') {
      filtered = filtered.filter(track => 
        filters.visibility === 'public' ? track.isPublic : !track.isPublic
      )
    }

    // Фильтр по источнику
    if (filters.source !== 'all') {
      filtered = filtered.filter(track =>
        filters.source === 'local' 
          ? track.sourceType === 'local' 
          : track.sourceType !== 'local'
      )
    }

    setFilteredTracks(filtered)
  }

  const handlePlayPause = (track) => {
    if (playingTrackId === track.id) {
      // Pause current track
      if (currentAudio) {
        currentAudio.pause()
        setPlayingTrackId(null)
      }
    } else {
      // Play new track
      if (currentAudio) {
        currentAudio.pause()
      }
      
      const audio = new Audio(`${API_URL}/music/tracks/${track.id}/stream`)
      audio.play()
      audio.onended = () => setPlayingTrackId(null)
      
      setCurrentAudio(audio)
      setPlayingTrackId(track.id)
    }
  }

  const openEditModal = (track) => {
    setSelectedTrack(track)
    setEditForm({
      title: track.title || '',
      artist: track.artist || '',
      album: typeof track.album === 'object' && track.album?.title ? track.album.title : (track.album || ''),
      genre: track.genre || '',
      year: track.year || '',
      isPublic: track.isPublic,
      allowDownload: track.allowDownload,
      coverUrl: track.coverUrl || ''
    })
    setEditModalOpen(true)
  }

  const handleUpdateTrack = async (e) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${API_URL}/admin/music/tracks/${selectedTrack.id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast?.success('Трек успешно обновлен')
      setEditModalOpen(false)
      fetchTracks()
    } catch (error) {
      console.error('Error updating track:', error)
      toast?.error('Ошибка обновления трека')
    }
  }

  const handleDeleteTrack = async (trackId) => {
    if (!confirm('Вы уверены, что хотите удалить этот трек?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/admin/music/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast?.success('Трек удален')
      fetchTracks()
    } catch (error) {
      console.error('Error deleting track:', error)
      toast?.error('Ошибка удаления трека')
    }
  }

  const toggleVisibility = async (track) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${API_URL}/admin/music/tracks/${track.id}`,
        { isPublic: !track.isPublic },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      toast?.success(track.isPublic ? 'Трек скрыт' : 'Трек опубликован')
      fetchTracks()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast?.error('Ошибка изменения видимости')
    }
  }

  // Получаем уникальные жанры для фильтра
  const genres = [...new Set(tracks.map(t => t.genre).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-white"
        >
          <div className="text-sm opacity-90">Всего треков</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg p-4 text-white"
        >
          <div className="text-sm opacity-90">Публичных</div>
          <div className="text-3xl font-bold">{stats.public}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-4 text-white"
        >
          <div className="text-sm opacity-90">Приватных</div>
          <div className="text-3xl font-bold">{stats.private}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-4 text-white"
        >
          <div className="text-sm opacity-90">Локальных</div>
          <div className="text-3xl font-bold">{stats.local}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg p-4 text-white"
        >
          <div className="text-sm opacity-90">Внешних</div>
          <div className="text-3xl font-bold">{stats.external}</div>
        </motion.div>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
        {/* Поиск */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию, исполнителю, альбому, жанру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaFilter className="inline mr-2" />
              Жанр
            </label>
            <select
              value={filters.genre}
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Все жанры</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaEye className="inline mr-2" />
              Видимость
            </label>
            <select
              value={filters.visibility}
              onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Все треки</option>
              <option value="public">Только публичные</option>
              <option value="private">Только приватные</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaMusic className="inline mr-2" />
              Источник
            </label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Все источники</option>
              <option value="local">Локальные</option>
              <option value="external">Внешние</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Найдено треков: {filteredTracks.length}
        </div>
      </div>

      {/* Список треков */}
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Обложка
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Название / Исполнитель
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Альбом
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Жанр
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Год
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTracks.map((track) => (
                <motion.tr
                  key={track.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-600">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaMusic className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {track.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {track.artist}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {typeof track.album === 'object' && track.album?.title ? track.album.title : (track.album || '-')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      {track.genre || 'Без жанра'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {track.year || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        track.isPublic
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {track.isPublic ? 'Публичный' : 'Приватный'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        track.sourceType === 'local'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                      }`}>
                        {track.sourceType === 'local' ? 'Локальный' : 'Внешний'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayPause(track)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title={playingTrackId === track.id ? 'Пауза' : 'Воспроизвести'}
                      >
                        {playingTrackId === track.id ? (
                          <FaPause className="text-purple-500" />
                        ) : (
                          <FaPlay className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => toggleVisibility(track)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title={track.isPublic ? 'Скрыть' : 'Опубликовать'}
                      >
                        {track.isPublic ? (
                          <FaEye className="text-green-500" />
                        ) : (
                          <FaEyeSlash className="text-gray-400" />
                        )}
                      </button>

                      <button
                        onClick={() => openEditModal(track)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <FaEdit className="text-blue-500" />
                      </button>

                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <FaTrash className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTracks.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Треки не найдены
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModalOpen && selectedTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaEdit className="text-2xl text-white" />
                  <h2 className="text-2xl font-bold text-white">Редактировать трек</h2>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdateTrack} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Название
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Исполнитель
                    </label>
                    <input
                      type="text"
                      value={editForm.artist}
                      onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Альбом
                    </label>
                    <input
                      type="text"
                      value={editForm.album}
                      onChange={(e) => setEditForm({ ...editForm, album: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Жанр
                    </label>
                    <input
                      type="text"
                      value={editForm.genre}
                      onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Год
                    </label>
                    <input
                      type="number"
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      URL обложки
                    </label>
                    <input
                      type="url"
                      value={editForm.coverUrl}
                      onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                      className="w-5 h-5 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Публичный трек (доступен всем пользователям)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.allowDownload}
                      onChange={(e) => setEditForm({ ...editForm, allowDownload: e.target.checked })}
                      className="w-5 h-5 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Разрешить скачивание
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <FaCheck className="inline mr-2" />
                    Сохранить
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

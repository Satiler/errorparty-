import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaPlus, FaEdit, FaTrash, FaMusic, FaTimes, FaSearch, FaSave, FaImage } from 'react-icons/fa'
import axios from 'axios'
import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function AdminPlaylistsManager({ toast }) {
  const [playlists, setPlaylists] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverUrl: '',
    isPublic: true,
    isFeatured: false,
    isEditorial: false,
    tags: ''
  })

  const [coverUploadMode, setCoverUploadMode] = useState('url') // 'url' или 'file'
  const [coverFile, setCoverFile] = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  
  // Управление треками
  const [showTracksModal, setShowTracksModal] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [availableTracks, setAvailableTracks] = useState([])
  const [trackSearchQuery, setTrackSearchQuery] = useState('')

  useEffect(() => {
    fetchPlaylists()
    fetchTracks()
  }, [])

  const fetchPlaylists = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/music/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPlaylists(response.data.playlists || [])
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast?.error('Ошибка загрузки плейлистов')
    } finally {
      setLoading(false)
    }
  }

  const fetchTracks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/music/tracks?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTracks(response.data.tracks || [])
    } catch (error) {
      console.error('Error fetching tracks:', error)
    }
  }

  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast?.error('Можно загружать только изображения')
      return
    }

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast?.error('Размер файла не должен превышать 5MB')
      return
    }

    setCoverFile(file)
    setUploadingCover(true)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('cover', file)

      const response = await axios.post(
        `${API_URL}/music/playlists/upload-cover`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (response.data.success) {
        setFormData(prev => ({ ...prev, coverUrl: response.data.coverUrl }))
        toast?.success('Обложка загружена')
      }
    } catch (error) {
      console.error('Error uploading cover:', error)
      toast?.error('Ошибка загрузки обложки')
    } finally {
      setUploadingCover(false)
    }
  }

  const openTracksModal = async (playlist) => {
    setSelectedPlaylist(playlist)
    setShowTracksModal(true)
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      
      // Получить треки плейлиста
      const playlistResponse = await axios.get(
        `${API_URL}/music/playlists/${playlist.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPlaylistTracks(playlistResponse.data.playlist?.tracks || [])

      // Установить доступные треки (все треки минус те, что уже в плейлисте)
      const playlistTrackIds = playlistResponse.data.playlist?.tracks?.map(t => t.id) || []
      setAvailableTracks(tracks.filter(t => !playlistTrackIds.includes(t.id)))
    } catch (error) {
      console.error('Error fetching playlist tracks:', error)
      toast?.error('Ошибка загрузки треков плейлиста')
    } finally {
      setLoading(false)
    }
  }

  const addTrackToPlaylist = async (trackId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/music/playlists/${selectedPlaylist.id}/tracks`,
        { trackId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Обновить списки
      const addedTrack = availableTracks.find(t => t.id === trackId)
      setPlaylistTracks(prev => [...prev, addedTrack])
      setAvailableTracks(prev => prev.filter(t => t.id !== trackId))
      toast?.success('Трек добавлен в плейлист')
    } catch (error) {
      console.error('Error adding track:', error)
      toast?.error('Ошибка добавления трека')
    }
  }

  const removeTrackFromPlaylist = async (trackId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${API_URL}/music/playlists/${selectedPlaylist.id}/tracks/${trackId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Обновить списки
      const removedTrack = playlistTracks.find(t => t.id === trackId)
      setPlaylistTracks(prev => prev.filter(t => t.id !== trackId))
      setAvailableTracks(prev => [...prev, removedTrack])
      toast?.success('Трек удален из плейлиста')
    } catch (error) {
      console.error('Error removing track:', error)
      toast?.error('Ошибка удаления трека')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast?.error('Введите название плейлиста')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      
      const response = await axios.post(
        `${API_URL}/music/playlists`,
        {
          ...formData,
          tags: tagsArray
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        toast?.success('Плейлист создан!')
        setShowCreateModal(false)
        resetForm()
        fetchPlaylists()
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      toast?.error(error.response?.data?.error || 'Ошибка создания плейлиста')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    
    if (!editingPlaylist) return

    try {
      const token = localStorage.getItem('token')
      const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
      
      const response = await axios.put(
        `${API_URL}/music/playlists/${editingPlaylist.id}`,
        {
          ...formData,
          tags: tagsArray
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        toast?.success('Плейлист обновлен!')
        setEditingPlaylist(null)
        resetForm()
        fetchPlaylists()
      }
    } catch (error) {
      console.error('Error updating playlist:', error)
      toast?.error(error.response?.data?.error || 'Ошибка обновления плейлиста')
    }
  }

  const handleDelete = async (playlistId) => {
    if (!confirm('Удалить этот плейлист?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/music/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast?.success('Плейлист удален')
      fetchPlaylists()
    } catch (error) {
      console.error('Error deleting playlist:', error)
      toast?.error('Ошибка удаления плейлиста')
    }
  }

  const openEditModal = (playlist) => {
    setEditingPlaylist(playlist)
    setFormData({
      name: playlist.name || '',
      description: playlist.description || '',
      coverUrl: playlist.coverUrl || '',
      isPublic: playlist.isPublic !== false,
      isFeatured: playlist.isFeatured || false,
      isEditorial: playlist.isEditorial || false,
      tags: Array.isArray(playlist.tags) ? playlist.tags.join(', ') : ''
    })
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      coverUrl: '',
      isPublic: true,
      isFeatured: false,
      isEditorial: false,
      tags: ''
    })
    setEditingPlaylist(null)
    setCoverUploadMode('url')
    setCoverFile(null)
  }

  const filteredPlaylists = playlists.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Управление плейлистами
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Создавайте и редактируйте плейлисты
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
        >
          <FaPlus />
          Создать плейлист
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск плейлистов..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Всего плейлистов</p>
          <p className="text-3xl font-bold">{playlists.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Публичных</p>
          <p className="text-3xl font-bold">{playlists.filter(p => p.isPublic).length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Редакционных</p>
          <p className="text-3xl font-bold">{playlists.filter(p => p.isEditorial).length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Избранных</p>
          <p className="text-3xl font-bold">{playlists.filter(p => p.isFeatured).length}</p>
        </div>
      </div>

      {/* Playlists Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Загрузка...</p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FaMusic className="text-5xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Плейлисты не найдены' : 'Нет плейлистов'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaylists.map((playlist) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Cover */}
              <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
                {playlist.coverUrl ? (
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaMusic className="text-6xl text-white opacity-50" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {playlist.isFeatured && (
                    <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                      ⭐ Избранный
                    </span>
                  )}
                  {playlist.isEditorial && (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                      📝 Редакционный
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">
                  {playlist.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {playlist.description || 'Без описания'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span>🎵 {playlist.trackCount || 0} треков</span>
                  <span>👥 {playlist.subscriberCount || 0}</span>
                  <span>❤️ {playlist.likeCount || 0}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openTracksModal(playlist)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <FaMusic />
                    Треки
                  </button>
                  <button
                    onClick={() => openEditModal(playlist)}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(playlist.id)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateModal(false)
              resetForm()
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingPlaylist ? 'Редактировать плейлист' : 'Создать плейлист'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={editingPlaylist ? handleUpdate : handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Название плейлиста"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="Описание плейлиста"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Обложка плейлиста
                  </label>
                  
                  {/* Переключатель режима */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setCoverUploadMode('url')}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        coverUploadMode === 'url'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      URL ссылка
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverUploadMode('file')}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        coverUploadMode === 'file'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <FaImage className="inline mr-2" />
                      Загрузить файл
                    </button>
                  </div>

                  {/* URL mode */}
                  {coverUploadMode === 'url' && (
                    <input
                      type="url"
                      value={formData.coverUrl}
                      onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="https://example.com/cover.jpg"
                    />
                  )}

                  {/* File upload mode */}
                  {coverUploadMode === 'file' && (
                    <div className="space-y-2">
                      <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                        <div className="text-center">
                          <FaImage className="mx-auto text-4xl text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {uploadingCover ? 'Загрузка...' : 'Нажмите для выбора файла'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (макс. 5MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileChange}
                          className="hidden"
                          disabled={uploadingCover}
                        />
                      </label>
                      {coverFile && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          ✓ {coverFile.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Preview */}
                  {formData.coverUrl && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Предпросмотр:</p>
                      <img
                        src={formData.coverUrl.startsWith('http') ? formData.coverUrl : `${API_URL}${formData.coverUrl}`}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          toast?.error('Не удалось загрузить изображение')
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Теги (через запятую)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="рок, поп, энергичная"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Публичный плейлист
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Избранный плейлист (показывается на главной)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isEditorial}
                      onChange={(e) => setFormData({ ...formData, isEditorial: e.target.checked })}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Редакционный плейлист (составлен редакторами)
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <FaSave />
                    {editingPlaylist ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracks Management Modal */}
      <AnimatePresence>
        {showTracksModal && selectedPlaylist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTracksModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-bold text-white">Управление треками</h2>
                  <p className="text-white/80 text-sm mt-1">{selectedPlaylist.name}</p>
                </div>
                <button
                  onClick={() => setShowTracksModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Tracks */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Треки в плейлисте ({playlistTracks.length})
                  </h3>
                  {playlistTracks.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FaMusic className="text-4xl text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Плейлист пуст</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {playlistTracks.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <FaMusic className="text-purple-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                              {track.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                          <button
                            onClick={() => removeTrackFromPlaylist(track.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Tracks */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Добавить треки
                  </h3>
                  <div className="mb-4">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={trackSearchQuery}
                        onChange={(e) => setTrackSearchQuery(e.target.value)}
                        placeholder="Поиск треков..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                  </div>
                  {availableTracks.filter(t => 
                    !trackSearchQuery || 
                    t.title.toLowerCase().includes(trackSearchQuery.toLowerCase()) ||
                    t.artist.toLowerCase().includes(trackSearchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {trackSearchQuery ? 'Треки не найдены' : 'Все треки добавлены'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableTracks
                        .filter(t => 
                          !trackSearchQuery || 
                          t.title.toLowerCase().includes(trackSearchQuery.toLowerCase()) ||
                          t.artist.toLowerCase().includes(trackSearchQuery.toLowerCase())
                        )
                        .map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <FaMusic className="text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                {track.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {track.artist}
                              </p>
                            </div>
                            <button
                              onClick={() => addTrackToPlaylist(track.id)}
                              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                              <FaPlus size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

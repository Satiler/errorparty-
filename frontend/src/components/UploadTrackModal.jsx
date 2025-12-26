import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUpload, FaTimes, FaMusic, FaImage, FaSpinner, FaTrash } from 'react-icons/fa'
import axios from 'axios'
import * as musicMetadata from 'music-metadata-browser'
import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function UploadTrackModal({ isOpen, onClose, onSuccess }) {
  const [tracks, setTracks] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [error, setError] = useState(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    isPublic: true,
    allowDownload: true
  })

  const genres = [
    'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 
    'Classical', 'R&B', 'Country', 'Metal', 'Indie',
    'Dance', 'Reggae', 'Blues', 'Folk', 'Punk'
  ]

  // Функция извлечения метаданных из аудиофайла
  const extractMetadata = async (file) => {
    try {
      const metadata = await musicMetadata.parseBlob(file)
      const { common, format } = metadata

      let coverPreview = null
      let coverFile = null

      // Извлекаем обложку если есть
      if (common.picture && common.picture.length > 0) {
        const picture = common.picture[0]
        const blob = new Blob([picture.data], { type: picture.format })
        coverPreview = URL.createObjectURL(blob)
        coverFile = new File([blob], 'cover.jpg', { type: picture.format })
      }

      return {
        title: common.title || null,
        artist: common.artist || null,
        album: common.album || null,
        genre: common.genre ? common.genre[0] : null,
        year: common.year || null,
        coverPreview,
        coverFile
      }
    } catch (error) {
      console.error('Error extracting metadata:', error)
      return null
    }
  }

  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setError(null)
    setLoadingMetadata(true)
    const newTracks = []

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`Файл ${file.name} слишком большой (макс 50 МБ)`)
        continue
      }
      
      const allowedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/ogg']
      if (!allowedFormats.includes(file.type) && !file.name.match(/\.(mp3|flac|wav|m4a|ogg)$/i)) {
        setError(`Файл ${file.name} имеет неподдерживаемый формат`)
        continue
      }

      // Извлекаем метаданные из файла
      const metadata = await extractMetadata(file)

      // Fallback: извлекаем из имени файла если метаданных нет
      let filename = file.name.replace(/\.[^/.]+$/, '')
      filename = filename.replace(/^\d+\.\s*/, '').replace(/^\d+\.\d+\.\s*/, '')
      
      let title = filename
      let artist = ''
      
      if (filename.includes(' - ')) {
        const parts = filename.split(' - ')
        artist = parts[0].trim()
        title = parts[1].trim()
      } else if (filename.includes('-')) {
        const parts = filename.split('-')
        if (parts.length >= 2) {
          artist = parts[0].trim()
          title = parts.slice(1).join('-').trim()
        }
      }

      newTracks.push({
        id: Date.now() + Math.random(),
        file: file,
        // Приоритет: метаданные из файла -> данные из имени -> значения по умолчанию
        title: metadata?.title || title,
        artist: metadata?.artist || artist || 'Unknown Artist',
        album: metadata?.album || '',
        genre: metadata?.genre || '',
        year: metadata?.year || new Date().getFullYear(),
        tags: '',
        coverFile: metadata?.coverFile || null,
        coverPreview: metadata?.coverPreview || null
      })
    }

    setTracks([...tracks, ...newTracks])
    setLoadingMetadata(false)
  }

  const handleCoverChange = (trackId, e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер обложки не должен превышать 5 МБ')
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setTracks(tracks.map(t => 
        t.id === trackId 
          ? { ...t, coverFile: file, coverPreview: reader.result }
          : t
      ))
    }
    reader.readAsDataURL(file)
  }

  const updateTrack = (trackId, field, value) => {
    setTracks(tracks.map(t => 
      t.id === trackId ? { ...t, [field]: value } : t
    ))
  }

  const removeTrack = (trackId) => {
    setTracks(tracks.filter(t => t.id !== trackId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (tracks.length === 0) {
      setError('Добавьте хотя бы один аудио файл')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)
    setCurrentTrack(0)

    const token = localStorage.getItem('token')
    const uploadedTracks = []
    const failedTracks = []

    try {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i]
        setCurrentTrack(i + 1)

        try {
          const uploadFormData = new FormData()
          uploadFormData.append('track', track.file)
          
          if (track.coverFile) {
            uploadFormData.append('cover', track.coverFile)
          }
          
          uploadFormData.append('title', track.title || track.file.name)
          uploadFormData.append('artist', track.artist || 'Unknown Artist')
          uploadFormData.append('album', track.album || '')
          uploadFormData.append('genre', track.genre || '')
          uploadFormData.append('year', track.year || new Date().getFullYear())
          uploadFormData.append('isPublic', globalSettings.isPublic)
          uploadFormData.append('allowDownload', globalSettings.allowDownload)
          
          if (track.tags) {
            const tagsArray = track.tags.split(',').map(t => t.trim()).filter(t => t)
            uploadFormData.append('tags', JSON.stringify(tagsArray))
          }

          const response = await axios.post(
            `${API_URL}/music/tracks/upload`,
            uploadFormData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                const totalProgress = Math.round(((i + percentCompleted / 100) / tracks.length) * 100)
                setUploadProgress(totalProgress)
              }
            }
          )

          if (response.data.success) {
            uploadedTracks.push(response.data.track)
          }
        } catch (error) {
          console.error(`Error uploading ${track.file.name}:`, error)
          failedTracks.push({ track, error: error.response?.data?.error || 'Ошибка загрузки' })
        }
      }

      if (uploadedTracks.length > 0) {
        onSuccess && onSuccess({ 
          uploaded: uploadedTracks.length, 
          failed: failedTracks.length,
          tracks: uploadedTracks 
        })
        
        if (failedTracks.length === 0) {
          handleClose()
        } else {
          setError(`Загружено ${uploadedTracks.length} из ${tracks.length} треков. ${failedTracks.length} не удалось загрузить.`)
        }
      } else {
        setError('Не удалось загрузить ни одного трека')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message || 'Ошибка загрузки треков')
    } finally {
      setUploading(false)
      setCurrentTrack(0)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setTracks([])
      setError(null)
      setUploadProgress(0)
      setCurrentTrack(0)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaMusic className="text-2xl text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Массовая загрузка треков</h2>
                  <p className="text-sm text-white/80">
                    {tracks.length > 0 ? `${tracks.length} ${tracks.length === 1 ? 'трек' : tracks.length < 5 ? 'трека' : 'треков'} готово к загрузке` : 'Выберите аудио файлы'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}

              {/* File Upload */}
              <div>
                <input
                  type="file"
                  accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg"
                  onChange={handleFilesChange}
                  disabled={uploading || loadingMetadata}
                  className="hidden"
                  id="audio-upload"
                  multiple
                />
                <label
                  htmlFor="audio-upload"
                  className={`flex items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-gray-50 dark:bg-gray-700/50 ${(uploading || loadingMetadata) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingMetadata ? (
                    <>
                      <FaSpinner className="text-3xl text-purple-500 animate-spin" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          Извлечение метаданных из файлов...
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Автоматически считываем название, исполнителя, альбом и обложку
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FaUpload className="text-3xl text-purple-500" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          Перетащите файлы сюда или нажмите для выбора
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Поддерживаются: MP3, FLAC, WAV, M4A, OGG (макс 50 МБ каждый)
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
                          ✨ Метаданные загружаются автоматически
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Global Settings */}
              {tracks.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Общие настройки для всех треков:
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalSettings.isPublic}
                      onChange={(e) => setGlobalSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                      disabled={uploading}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Публичные треки (доступны всем пользователям)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalSettings.allowDownload}
                      onChange={(e) => setGlobalSettings(prev => ({ ...prev, allowDownload: e.target.checked }))}
                      disabled={uploading}
                      className="w-4 h-4 text-purple-500 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Разрешить скачивание
                    </span>
                  </label>
                </div>
              )}

              {/* Tracks List */}
              {tracks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Треки для загрузки ({tracks.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTracks([])}
                      disabled={uploading}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      Очистить все
                    </button>
                  </div>

                  {tracks.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {track.coverPreview ? (
                            <img
                              src={track.coverPreview}
                              alt="Cover"
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                              <FaMusic className="text-white text-2xl" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {index + 1}. {track.file.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(track.file.size / 1024 / 1024).toFixed(2)} МБ
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTrack(track.id)}
                          disabled={uploading}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 disabled:opacity-50"
                        >
                          <FaTrash />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) => updateTrack(track.id, 'title', e.target.value)}
                          disabled={uploading}
                          placeholder="Название *"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        />
                        <input
                          type="text"
                          value={track.artist}
                          onChange={(e) => updateTrack(track.id, 'artist', e.target.value)}
                          disabled={uploading}
                          placeholder="Исполнитель *"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        />
                        <input
                          type="text"
                          value={track.album}
                          onChange={(e) => updateTrack(track.id, 'album', e.target.value)}
                          disabled={uploading}
                          placeholder="Альбом"
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        />
                        <select
                          value={track.genre}
                          onChange={(e) => updateTrack(track.id, 'genre', e.target.value)}
                          disabled={uploading}
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          <option value="">Жанр</option>
                          {genres.map(genre => (
                            <option key={genre} value={genre}>{genre}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={track.year}
                          onChange={(e) => updateTrack(track.id, 'year', parseInt(e.target.value) || new Date().getFullYear())}
                          disabled={uploading}
                          placeholder="Год"
                          min="1900"
                          max={new Date().getFullYear()}
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        />
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCoverChange(track.id, e)}
                            disabled={uploading}
                            className="hidden"
                            id={`cover-${track.id}`}
                          />
                          <label
                            htmlFor={`cover-${track.id}`}
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer hover:border-purple-500 transition-colors w-full"
                          >
                            <FaImage />
                            {track.coverFile ? 'Обложка ✓' : 'Обложка'}
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Загрузка трека {currentTrack} из {tracks.length}...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              )}

              {/* Info */}
              {tracks.length > 0 && !uploading && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>💡 Подсказка:</strong> Метаданные автоматически извлекаются из имён файлов. 
                  Используйте формат "Исполнитель - Название.mp3" для лучшего результата.
                  Система также извлечёт метаданные из ID3-тегов при загрузке.
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={uploading || tracks.length === 0}
                  className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Загрузка {currentTrack}/{tracks.length}...
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      Загрузить {tracks.length} {tracks.length === 1 ? 'трек' : tracks.length < 5 ? 'трека' : 'треков'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

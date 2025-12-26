import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUpload, FaTimes, FaMusic, FaImage, FaCheck } from 'react-icons/fa'
import axios from 'axios'

import { getApiUrl } from '../utils/apiConfig'

const API_URL = getApiUrl()

export default function UploadAlbumModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    description: '',
    genre: '',
    releaseYear: new Date().getFullYear(),
    isPublic: true,
    allowDownload: true
  })
  
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [trackFiles, setTrackFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Размер обложки не должен превышать 5 МБ')
        return
      }
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setError(null)
    }
  }

  const handleTracksChange = (e) => {
    const files = Array.from(e.target.files)
    
    if (files.length > 200) {
      setError('Максимум 200 треков за раз')
      return
    }

    // Check file sizes
    const oversized = files.filter(f => f.size > 20 * 1024 * 1024)
    if (oversized.length > 0) {
      setError(`${oversized.length} файл(ов) превышают 20 МБ`)
      return
    }

    setTrackFiles(files)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Only require at least one track - title and artist will be extracted from files
    if (trackFiles.length === 0) {
      setError('Добавьте хотя бы один трек')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formDataToSend = new FormData()
      
      // Add metadata
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key])
      })

      // Add cover
      if (coverFile) {
        formDataToSend.append('cover', coverFile)
      }

      // Add tracks
      trackFiles.forEach(file => {
        formDataToSend.append('tracks', file)
      })

      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/music/albums/create`,
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(percentCompleted)
          }
        }
      )

      // Success
      onSuccess && onSuccess(response.data.album)
      resetForm()
      onClose()

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.response?.data?.error || 'Ошибка загрузки альбома')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      artist: '',
      description: '',
      genre: '',
      releaseYear: new Date().getFullYear(),
      isPublic: true,
      allowDownload: true
    })
    setCoverFile(null)
    setCoverPreview(null)
    setTrackFiles([])
    setError(null)
  }

  const removeTrack = (index) => {
    setTrackFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaMusic className="text-purple-500" />
              Загрузить альбом
            </h2>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <FaTimes className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название альбома
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Будет определено из файлов"
                    disabled={uploading}
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Исполнитель
                  </label>
                  <input
                    type="text"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Будет определено из файлов"
                    disabled={uploading}
                  />
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Жанр
                  </label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Rock, Pop, Electronic..."
                    disabled={uploading}
                  />
                </div>

                {/* Release Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Год релиза
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.releaseYear}
                    onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-purple-500"
                    disabled={uploading}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows="3"
                    placeholder="Описание альбома..."
                    disabled={uploading}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                      disabled={uploading}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Публичный альбом</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDownload}
                      onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500"
                      disabled={uploading}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Разрешить скачивание</span>
                  </label>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Cover Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Обложка альбома
                  </label>
                  <div className="relative">
                    {coverPreview ? (
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoverFile(null)
                              setCoverPreview(null)
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                        <FaImage className="text-4xl text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Выберите обложку</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">JPG, PNG, WEBP до 5 МБ</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCoverChange}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Tracks Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Треки * (до 200 файлов)
                  </label>
                  <label className="w-full p-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                    <FaMusic className="text-3xl text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {trackFiles.length > 0 ? `${trackFiles.length} файл(ов) выбрано` : 'Выберите аудио файлы'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">MP3, WAV, OGG, M4A, FLAC до 20 МБ</span>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/flac"
                      multiple
                      onChange={handleTracksChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                {/* Track List */}
                {trackFiles.length > 0 && (
                  <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                    {trackFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FaMusic className="text-purple-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {(file.size / 1024 / 1024).toFixed(1)} МБ
                          </span>
                        </div>
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => removeTrack(index)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Загрузка...</span>
                  <span className="text-sm font-semibold text-purple-500">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={uploading || trackFiles.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    Загрузить альбом
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

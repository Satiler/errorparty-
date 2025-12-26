import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Play, Settings, BarChart3, 
  CheckCircle2, AlertCircle, Loader2, Zap,
  Music, TrendingUp, Clock, Database
} from 'lucide-react';
import axios from 'axios';

/**
 * 🤖 Music Auto-Import Admin Panel
 * Панель управления автоматическим импортом музыки
 */
export default function MusicAutoImportAdmin() {
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState(['Electronic', 'Pop', 'Hip-Hop']);
  const [tracksPerGenre, setTracksPerGenre] = useState(10);

  const availableGenres = [
    { name: 'Pop', lmusicId: 'pop-music', icon: '🎵', color: 'from-pink-500 to-rose-500' },
    { name: 'Rock', lmusicId: 'rock', icon: '🎸', color: 'from-red-500 to-orange-600' },
    { name: 'Hip-Hop', lmusicId: 'rap', icon: '🎤', color: 'from-orange-500 to-yellow-500' },
    { name: 'Chanson', lmusicId: 'chanson', icon: '🎺', color: 'from-amber-600 to-orange-700' },
    { name: 'Electronic', lmusicId: 'electronic', icon: '⚡', color: 'from-blue-500 to-cyan-500' },
    { name: 'Dance', lmusicId: 'dance', icon: '💃', color: 'from-purple-500 to-pink-500' },
    { name: 'Folk', lmusicId: 'folk', icon: '🪕', color: 'from-green-500 to-teal-500' },
    { name: 'Jazz', lmusicId: 'jazz', icon: '🎷', color: 'from-purple-600 to-indigo-600' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Статус планировщика
      const statusResponse = await axios.get('/api/music/ai/scheduler-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedulerStatus(statusResponse.data.status);

      // Статистика импорта
      const statsResponse = await axios.get('/api/music/ai/import-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setImportStats(statsResponse.data.stats);

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const handleManualImport = async () => {
    setImporting(true);
    setImportResult(null);

    try {
      const token = localStorage.getItem('token');

      const response = await axios.post('/api/music/ai/manual-import', {
        genres: selectedGenres,
        tracksPerGenre: parseInt(tracksPerGenre),
        createPlaylists: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setImportResult(response.data);

      // Обновляем статистику
      setTimeout(() => loadData(), 2000);

    } catch (error) {
      console.error('Ошибка импорта:', error);
      setImportResult({
        success: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* Header */}
      <div className="h-72 bg-gradient-to-b from-green-900/50 via-blue-900/30 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-blue-600/20 to-purple-600/20 animate-gradient-x" />
        
        <div className="relative z-10 container mx-auto px-6 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Zap className="w-14 h-14 text-green-400" />
              <Settings className="w-10 h-10 text-blue-400" />
            </div>
            
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Импорт из Lmusic.kz
            </h1>
            
            <p className="text-lg text-gray-300">
              Автоматическая загрузка музыки с lmusic.kz - лучшая русская и казахская музыка
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 -mt-12 relative z-20">
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Scheduler Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-blue-400" />
              {schedulerStatus?.isRunning ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                  Запущен
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                  Остановлен
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-bold mb-2">Планировщик</h3>
            <p className="text-gray-400 text-sm mb-3">
              Автоматические задачи: {schedulerStatus?.activeTasks || 0}
            </p>

            {schedulerStatus?.tasks && schedulerStatus.tasks.length > 0 && (
              <div className="space-y-1">
                {schedulerStatus.tasks.map((task, i) => (
                  <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    {task}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Import Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <Database className="w-8 h-8 text-purple-400 mb-4" />
            
            <h3 className="text-xl font-bold mb-2">Статистика</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-black text-purple-400">
                  {importStats?.autoImportedTracks || 0}
                </div>
                <div className="text-xs text-gray-400">Автоимпортировано треков</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {importStats?.autoGeneratedPlaylists || 0}
                </div>
                <div className="text-xs text-gray-400">Авто-плейлистов создано</div>
              </div>

              {importStats?.lastImportDate && (
                <div className="text-xs text-gray-500">
                  Последний импорт: {new Date(importStats.lastImportDate).toLocaleDateString('ru-RU')}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <TrendingUp className="w-8 h-8 text-green-400 mb-4" />
            
            <h3 className="text-xl font-bold mb-4">Быстрые действия</h3>
            
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors">
                Обновить рекомендации
              </button>
              
              <button className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm font-medium transition-colors">
                Анализ популярности
              </button>
              
              <button className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors">
                Очистка кеша
              </button>
            </div>
          </motion.div>
        </div>

        {/* Manual Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 mb-12"
        >
          <div className="flex items-center gap-3 mb-8">
            <Download className="w-8 h-8 text-green-400" />
            <h2 className="text-3xl font-black">Импорт с Lmusic.kz</h2>
          </div>

          {/* Genre Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2">Выберите жанры для импорта</h3>
            <p className="text-sm text-gray-400 mb-4">
              Музыка будет загружена с lmusic.kz - большой каталог русской и казахской музыки
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableGenres.map((genre, index) => (
                <motion.button
                  key={genre.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleGenre(genre.name)}
                  className={`
                    relative p-4 rounded-xl overflow-hidden
                    backdrop-blur-sm border-2 transition-all
                    ${selectedGenres.includes(genre.name)
                      ? 'border-green-400 shadow-lg shadow-green-400/20'
                      : 'border-white/10 hover:border-white/30'
                    }
                  `}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-20`} />
                  
                  <div className="relative z-10 text-center">
                    <div className="text-3xl mb-2">{genre.icon}</div>
                    <div className="text-sm font-bold">{genre.name}</div>
                  </div>

                  {selectedGenres.includes(genre.name) && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tracks Per Genre */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Треков на жанр</h3>
            
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="50"
                value={tracksPerGenre}
                onChange={(e) => setTracksPerGenre(e.target.value)}
                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:bg-green-500
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-green-500/50"
              />
              
              <div className="w-16 text-center">
                <div className="text-3xl font-black text-green-400">{tracksPerGenre}</div>
                <div className="text-xs text-gray-400">треков</div>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-400">
              Всего будет загружено примерно: <span className="text-white font-bold">
                {selectedGenres.length * tracksPerGenre} треков
              </span>
            </div>
          </div>

          {/* Import Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleManualImport}
            disabled={importing || selectedGenres.length === 0}
            className={`
              w-full py-5 rounded-2xl font-bold text-lg
              flex items-center justify-center gap-3
              transition-all
              ${importing || selectedGenres.length === 0
                ? 'bg-gray-500/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg shadow-green-500/30'
              }
            `}
          >
            {importing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Импорт в процессе...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Запустить импорт
              </>
            )}
          </motion.button>

          {/* Import Result */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                mt-6 p-6 rounded-2xl border-2
                ${importResult.success
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
                }
              `}
            >
              {importResult.success ? (
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-green-400 mb-2">Импорт запущен!</h4>
                    <p className="text-sm text-gray-300">
                      {importResult.message}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-red-400 mb-2">Ошибка импорта</h4>
                    <p className="text-sm text-gray-300">{importResult.error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
        >
          <Music className="w-10 h-10 text-blue-400 mb-4" />
          
          <h3 className="text-2xl font-bold mb-4">Как работает автоимпорт?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-bold text-white mb-2">🎵 Источник: Lmusic.kz</h4>
              <p>Один из крупнейших каталогов русской и казахской музыки с прямыми ссылками на MP3</p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">📥 Автоматический импорт</h4>
              <p>Треки автоматически парсятся и добавляются в вашу библиотеку</p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">📋 Умная категоризация</h4>
              <p>AI определяет жанр, настроение и создаёт плейлисты автоматически</p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-2">⏰ Ежедневное обновление</h4>
              <p>Планировщик автоматически добавляет новую музыку каждый день в 03:00</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaImage, FaFire, FaClock, FaUser, FaRobot, FaEye, FaThumbsUp, FaThumbsDown,
  FaComment, FaTimes, FaChartLine, FaTrophy, FaSkull, FaGamepad
} from 'react-icons/fa';
import MemeRating from '../components/MemeRating';
import MemeComments from '../components/MemeComments';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/Toast';
import { LoadingSpinner, SkeletonMeme } from '../components/Loading';
import axios from 'axios';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();

function MemesPage() {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('recent'); // recent, popular, generator
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [gameType, setGameType] = useState('dota2');
  const [humorType, setHumorType] = useState('dark'); // dark, light, savage
  const toast = useToast();

  useEffect(() => {
    fetchMemes();
  }, [filter, page]);

  const fetchMemes = async () => {
    if (filter === 'generator') return;
    
    setLoading(true);
    try {
      let url = `/api/memes?page=${page}&limit=12`;
      
      if (filter === 'popular') {
        url = `/api/memes/top?limit=12`;
      }

      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setMemes(data.memes || []);
        
        if (data.pagination) {
          setTotalPages(data.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMeme = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Необходимо войти в систему для генерации мемов');
        return;
      }

      const response = await axios.post(`${API_URL}/memes/generate`, {
        gameType: gameType,
        humorType: humorType
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Мем успешно создан на основе ваших матчей!');
        setFilter('recent');
        setPage(1);
        fetchMemes();
      } else {
        toast.error(response.data.error || 'Ошибка при создании мема');
      }
    } catch (error) {
      console.error('Error generating meme:', error);
      const errorMsg = error.response?.data?.error || 'Ошибка при генерации мема';
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-8">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-cyan-900/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-4 mb-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-8 py-4 rounded-2xl backdrop-blur-xl border border-purple-500/30">
            <FaImage className="text-5xl text-pink-400 drop-shadow-glow" />
            <div className="text-left">
              <h1 className="text-5xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                МЕМЫ
              </h1>
              <p className="text-gray-400 text-sm mt-1">Лучшее от ErrorParty</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setFilter('recent'); setPage(1); }}
            className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 backdrop-blur-xl ${
              filter === 'recent'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 border-2 border-purple-400'
                : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            <FaClock className="text-xl" />
            <span>Свежие</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setFilter('popular'); setPage(1); }}
            className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 backdrop-blur-xl ${
              filter === 'popular'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/50 border-2 border-orange-400'
                : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            <FaFire className="text-xl" />
            <span>Топ</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('generator')}
            className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 backdrop-blur-xl ${
              filter === 'generator'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/50 border-2 border-cyan-400'
                : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-gray-600'
            }`}
          >
            <FaRobot className="text-xl" />
            <span>Генератор</span>
          </motion.button>
        </div>

        {/* Meme Generator */}
        {filter === 'generator' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-10 border-2 border-purple-500/50 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="text-center mb-10">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="inline-block"
                >
                  <FaRobot className="text-8xl text-cyan-400 mx-auto mb-6 drop-shadow-2xl" />
                </motion.div>
                <h2 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                  ГЕНЕРАТОР МЕМОВ
                </h2>
                <p className="text-gray-400 text-lg">Создай уникальный мем с AI и черным юмором</p>
              </div>

              <div className="space-y-8">
                {/* Game Type Selection */}
                <div>
                  <label className="block text-white font-bold text-xl mb-4 flex items-center gap-2">
                    <FaGamepad className="text-purple-400" />
                    Выбери игру
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGameType('dota2')}
                      className={`relative overflow-hidden px-8 py-8 rounded-2xl font-bold text-xl transition-all border-2 ${
                        gameType === 'dota2'
                          ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white border-red-400 shadow-lg shadow-red-500/50'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border-gray-600'
                      }`}
                    >
                      <div className="text-5xl mb-3">🎮</div>
                      <div className="font-black">DOTA 2</div>
                      <div className="text-sm font-normal mt-1 opacity-80">MOBA жесть</div>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGameType('cs2')}
                      className={`relative overflow-hidden px-8 py-8 rounded-2xl font-bold text-xl transition-all border-2 ${
                        gameType === 'cs2'
                          ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/50'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border-gray-600'
                      }`}
                    >
                      <div className="text-5xl mb-3">🔫</div>
                      <div className="font-black">CS2</div>
                      <div className="text-sm font-normal mt-1 opacity-80">Тактический шутер</div>
                    </motion.button>
                  </div>
                </div>

                {/* Humor Type Selection */}
                <div>
                  <label className="block text-white font-bold text-xl mb-4 flex items-center gap-2">
                    <FaSkull className="text-pink-400" />
                    Выбери уровень жести
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setHumorType('light')}
                      className={`px-4 py-6 rounded-xl font-bold text-sm transition-all border-2 ${
                        humorType === 'light'
                          ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white border-green-400 shadow-lg shadow-green-500/50'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border-gray-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">😊</div>
                      <div className="font-black">ЛЁГКИЙ</div>
                      <div className="text-xs font-normal mt-1 opacity-80">Добрый юмор</div>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setHumorType('dark')}
                      className={`px-4 py-6 rounded-xl font-bold text-sm transition-all border-2 ${
                        humorType === 'dark'
                          ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white border-orange-400 shadow-lg shadow-orange-500/50'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border-gray-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">😈</div>
                      <div className="font-black">ТЁМНЫЙ</div>
                      <div className="text-xs font-normal mt-1 opacity-80">Чёрный юмор</div>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setHumorType('savage')}
                      className={`px-4 py-6 rounded-xl font-bold text-sm transition-all border-2 ${
                        humorType === 'savage'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white border-purple-400 shadow-lg shadow-purple-500/50'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 border-gray-600'
                      }`}
                    >
                      <div className="text-3xl mb-2">💀</div>
                      <div className="font-black">SAVAGE</div>
                      <div className="text-xs font-normal mt-1 opacity-80">Беспощадный</div>
                    </motion.button>
                  </div>
                </div>

                {/* Warning Box */}
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className={`relative overflow-hidden rounded-2xl p-6 shadow-xl border-2 ${
                    humorType === 'light' 
                      ? 'bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-green-500/70'
                      : humorType === 'savage'
                      ? 'bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-purple-500/70'
                      : 'bg-gradient-to-r from-red-900/60 to-orange-900/60 border-red-500/70'
                  }`}
                >
                  <div className="absolute top-0 right-0 text-9xl opacity-5">
                    {humorType === 'light' ? '😊' : humorType === 'savage' ? '💀' : '⚠️'}
                  </div>
                  <h3 className={`font-black text-xl mb-3 flex items-center gap-3 ${
                    humorType === 'light' ? 'text-green-300' : humorType === 'savage' ? 'text-purple-300' : 'text-white'
                  }`}>
                    {humorType === 'light' && '😊 ДРУЖЕСКИЙ РЕЖИМ'}
                    {humorType === 'dark' && '🔞 ЖЁСТКИЙ ЮМОР'}
                    {humorType === 'savage' && '💀 БЕСПОЩАДНЫЙ РЕЖИМ'}
                  </h3>
                  <p className="text-gray-200 text-sm mb-3 leading-relaxed">
                    {humorType === 'light' && `Система найдёт забавные моменты из твоих игр в ${gameType === 'dota2' ? 'Dota 2' : 'CS2'} и создаст весёлый позитивный мем.`}
                    {humorType === 'dark' && `Система проанализирует твои позорные матчи в ${gameType === 'dota2' ? 'Dota 2' : 'CS2'} и создаст мем с чёрным юмором.`}
                    {humorType === 'savage' && `Система найдёт твои самые унизительные провалы в ${gameType === 'dota2' ? 'Dota 2' : 'CS2'} и создаст мем, который уничтожит твоё эго.`}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {humorType === 'light' ? (
                      <>
                        <div className="bg-black/30 rounded-lg p-2 border border-green-500/30">
                          <div className="text-green-400 font-bold">✓ Позитивный настрой</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-emerald-500/30">
                          <div className="text-emerald-400 font-bold">✓ Смешно без обид</div>
                        </div>
                      </>
                    ) : humorType === 'savage' ? (
                      <>
                        <div className="bg-black/30 rounded-lg p-2 border border-purple-500/30">
                          <div className="text-purple-400 font-bold">✓ Максимальная жесть</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-pink-500/30">
                          <div className="text-pink-400 font-bold">✓ Без пощады</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-black/30 rounded-lg p-2 border border-red-500/30">
                          <div className="text-red-400 font-bold">✓ Чёрный юмор</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-orange-500/30">
                          <div className="text-orange-400 font-bold">✓ Токсично</div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Generate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateMeme}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white px-12 py-6 rounded-2xl font-black text-2xl hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-2xl shadow-cyan-500/30 border-2 border-cyan-400"
                >
                  {generating ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>АНАЛИЗИРУЮ ТВОИ ФЕЙЛЫ...</span>
                    </>
                  ) : (
                    <>
                      <FaRobot className="text-4xl" />
                      <span>СГЕНЕРИРОВАТЬ МЕМ</span>
                    </>
                  )}
                </motion.button>

                {/* Bottom Warning */}
                <div className="bg-red-900/40 border-2 border-red-500/60 rounded-xl p-5 backdrop-blur-sm">
                  <p className="text-red-200 text-sm leading-relaxed">
                    <strong className="text-red-300 text-base">⚠️ ВНИМАНИЕ:</strong> Требуется привязанный Steam аккаунт и недавние матчи. 
                    Мем будет содержать <strong className="text-red-300">максимально токсичный и беспощадный юмор</strong> о твоих игровых неудачах. 
                    Только для тех, кто готов посмеяться над собой! 💀
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonMeme key={i} />
            ))}
          </div>
        ) : memes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-16 border-2 border-gray-700 text-center backdrop-blur-xl"
          >
            <FaImage className="text-7xl text-gray-600 mx-auto mb-6 opacity-50" />
            <h3 className="text-white text-2xl font-bold mb-2">Мемов пока нет</h3>
            <p className="text-gray-400 text-lg mb-6">Будьте первым, кто создаст мем!</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('generator')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg inline-flex items-center gap-3"
            >
              <FaRobot className="text-xl" />
              Создать мем
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              <AnimatePresence>
                {memes.map((meme, index) => {
                  // Определяем игру из тегов или matchData
                  const isDota2 = meme.tags?.includes('dota2') || meme.matchData?.game === 'dota2';
                  const isCS2 = meme.tags?.includes('cs2') || meme.matchData?.game === 'cs2';
                  
                  // Цветовые схемы для разных игр
                  const gameTheme = isDota2 
                    ? {
                        primary: 'from-red-900/20 to-orange-900/20',
                        border: 'border-red-800 hover:border-red-500',
                        badge: 'bg-gradient-to-r from-red-600 to-orange-600',
                        accent: 'text-red-400',
                        glow: 'shadow-red-500/20',
                        icon: '🎮'
                      }
                    : isCS2
                    ? {
                        primary: 'from-blue-900/20 to-cyan-900/20',
                        border: 'border-blue-800 hover:border-cyan-500',
                        badge: 'bg-gradient-to-r from-blue-600 to-cyan-600',
                        accent: 'text-cyan-400',
                        glow: 'shadow-cyan-500/20',
                        icon: '🔫'
                      }
                    : {
                        primary: 'from-purple-900/20 to-pink-900/20',
                        border: 'border-purple-800 hover:border-purple-500',
                        badge: 'bg-gradient-to-r from-purple-600 to-pink-600',
                        accent: 'text-purple-400',
                        glow: 'shadow-purple-500/20',
                        icon: '🎭'
                      };

                  return (
                    <motion.div
                      key={meme.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="group cursor-pointer"
                      onClick={() => setSelectedMeme(meme)}
                    >
                      {/* Внешний контейнер с эффектом свечения */}
                      <div className="relative">
                        {/* Эффект свечения при наведении */}
                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${gameTheme.badge} rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity`} />
                        
                        {/* Основная карточка */}
                        <div className={`relative bg-gradient-to-br ${gameTheme.primary} backdrop-blur-sm rounded-xl overflow-hidden border-2 ${gameTheme.border} transition-all shadow-xl group-hover:${gameTheme.glow}`}>
                          {/* Изображение */}
                          <div className="relative aspect-square overflow-hidden bg-black/50">
                            <img
                              src={meme.imageUrl}
                              alt={meme.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            
                            {/* Оверлей градиента */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                            
                            {/* Бейджи игры */}
                            <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                              {/* Тип игры */}
                              {(isDota2 || isCS2) && (
                                <div className={`${gameTheme.badge} text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-sm`}>
                                  <span className="text-base">{gameTheme.icon}</span>
                                  <span>{isDota2 ? 'DOTA 2' : 'CS2'}</span>
                                </div>
                              )}
                              
                              {/* Бейдж матча */}
                              {meme.matchId && (
                                <div className={`${gameTheme.badge} text-white text-xs px-2 py-1 rounded-lg font-bold shadow-lg backdrop-blur-sm`}>
                                  <FaGamepad />
                                </div>
                              )}
                            </div>
                            
                            {/* Быстрая статистика снизу */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <div className="flex items-center justify-between text-xs">
                                {/* Левая группа */}
                                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                  <span className="flex items-center gap-1 text-white">
                                    <FaEye className={gameTheme.accent} />
                                    {meme.views || 0}
                                  </span>
                                  <span className="flex items-center gap-1 text-white">
                                    <FaComment className={gameTheme.accent} />
                                    {meme.commentsCount || 0}
                                  </span>
                                </div>
                                
                                {/* Правая группа - рейтинг */}
                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                  <span className="flex items-center gap-1 text-green-400 font-bold">
                                    <FaThumbsUp className="text-xs" />
                                    {meme.likes || 0}
                                  </span>
                                  <span className="text-gray-500">|</span>
                                  <span className="flex items-center gap-1 text-red-400 font-bold">
                                    <FaThumbsDown className="text-xs" />
                                    {meme.dislikes || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Контент карточки */}
                          <div className="p-4 bg-black/30 backdrop-blur-sm">
                            {/* Заголовок */}
                            <h3 className={`text-white font-bold text-sm mb-3 line-clamp-2 leading-tight group-hover:${gameTheme.accent} transition-colors`}>
                              {meme.title}
                            </h3>
                            
                            {/* Футер */}
                            <div className="flex items-center justify-between">
                              {/* Автор */}
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 ${gameTheme.badge} rounded-full flex items-center justify-center shadow-lg`}>
                                  <FaUser className="text-white text-xs" />
                                </div>
                                <div className="text-xs">
                                  <div className="text-white font-semibold">{meme.author?.username}</div>
                                  <div className="text-gray-400 text-xs">
                                    {new Date(meme.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Скор */}
                              <div className={`flex items-center gap-1.5 ${gameTheme.accent} font-bold`}>
                                <FaTrophy className="text-yellow-500" />
                                <span className="text-white">
                                  {(meme.likes || 0) - (meme.dislikes || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-gray-600 hover:border-purple-500 transition-all"
                >
                  ← Назад
                </motion.button>
                
                <div className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg border-2 border-purple-400">
                  {page} / {totalPages}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-gray-600 hover:border-purple-500 transition-all"
                >
                  Вперёд →
                </motion.button>
              </motion.div>
            )}
          </>
        )}

        {/* Meme Modal */}
        <AnimatePresence>
          {selectedMeme && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={() => setSelectedMeme(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{selectedMeme.title}</h2>
                    <button
                      onClick={() => setSelectedMeme(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <img
                    src={selectedMeme.imageUrl}
                    alt={selectedMeme.title}
                    className="w-full rounded-lg mb-4"
                  />
                  
                  {/* Meme Text with Black Humor */}
                  {selectedMeme.memeText && (
                    <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border-2 border-red-500/50 rounded-xl p-6 mb-4">
                      <div className="text-center">
                        {selectedMeme.memeText.split('\n').map((line, idx) => (
                          <div key={idx} className={`${
                            idx === 0 ? 'text-3xl font-black text-red-400 mb-3' :
                            idx === 1 ? 'text-2xl font-bold text-orange-300 mb-2' :
                            'text-xl font-semibold text-yellow-200'
                          }`}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedMeme.description && (
                    <p className="text-gray-300 mb-4">{selectedMeme.description}</p>
                  )}
                  
                  {/* Match Statistics Button */}
                  {selectedMeme.matchId && selectedMeme.matchData && (() => {
                    const matchData = JSON.parse(selectedMeme.matchData);
                    return (
                      <div className="mb-6">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/50 rounded-xl overflow-hidden">
                          {/* Header */}
                          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                🎮 Статистика матча #{selectedMeme.matchId}
                              </h3>
                              <span className={`px-4 py-2 rounded-lg font-bold ${
                                matchData.result === 'win' 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {matchData.result === 'win' ? '✅ ПОБЕДА' : '❌ ПОРАЖЕНИЕ'}
                              </span>
                            </div>
                          </div>

                          <div className="p-6">
                            {/* Main Stats Table - All Players */}
                            <div className="bg-gray-800/50 rounded-lg overflow-hidden mb-4">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-700/50">
                                  <tr className="text-gray-300">
                                    <th className="p-3 text-left">Команда</th>
                                    <th className="p-3 text-left">Герой</th>
                                    <th className="p-3 text-center">LVL</th>
                                    <th className="p-3 text-center">У</th>
                                    <th className="p-3 text-center">С</th>
                                    <th className="p-3 text-center">П</th>
                                    <th className="p-3 text-center">З/М</th>
                                    <th className="p-3 text-center">О/М</th>
                                    <th className="p-3 text-right">ОЦ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {matchData.allPlayers && matchData.allPlayers.length > 0 ? (
                                    <>
                                      {/* Radiant Team */}
                                      {matchData.allPlayers.filter(p => p.isRadiant).map((player, idx) => (
                                        <tr key={idx} className={`border-t border-gray-700 ${
                                          player.playerSlot === matchData.playerSlot ? 'bg-green-900/30' : ''
                                        }`}>
                                          <td className="p-3">
                                            <span className="text-green-400 font-bold">RAD</span>
                                          </td>
                                          <td className="p-3">
                                            <div className="flex items-center gap-2">
                                              <div className="w-10 h-10 bg-green-600/30 rounded flex items-center justify-center text-white text-xs font-bold">
                                                {player.heroId}
                                              </div>
                                              <span className="text-white text-xs">{player.personaname}</span>
                                            </div>
                                          </td>
                                          <td className="p-3 text-center text-yellow-400 font-bold">{player.level}</td>
                                          <td className="p-3 text-center text-green-400 font-bold">{player.kills}</td>
                                          <td className="p-3 text-center text-red-400 font-bold">{player.deaths}</td>
                                          <td className="p-3 text-center text-blue-400 font-bold">{player.assists}</td>
                                          <td className="p-3 text-center text-yellow-300">{player.gpm}</td>
                                          <td className="p-3 text-center text-purple-300">{player.xpm}</td>
                                          <td className="p-3 text-right text-orange-400 font-semibold">{player.netWorth.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                      {/* Separator */}
                                      <tr className="bg-gray-700/30">
                                        <td colSpan="9" className="p-1"></td>
                                      </tr>
                                      {/* Dire Team */}
                                      {matchData.allPlayers.filter(p => !p.isRadiant).map((player, idx) => (
                                        <tr key={idx} className={`border-t border-gray-700 ${
                                          player.playerSlot === matchData.playerSlot ? 'bg-red-900/30' : ''
                                        }`}>
                                          <td className="p-3">
                                            <span className="text-red-400 font-bold">DIRE</span>
                                          </td>
                                          <td className="p-3">
                                            <div className="flex items-center gap-2">
                                              <div className="w-10 h-10 bg-red-600/30 rounded flex items-center justify-center text-white text-xs font-bold">
                                                {player.heroId}
                                              </div>
                                              <span className="text-white text-xs">{player.personaname}</span>
                                            </div>
                                          </td>
                                          <td className="p-3 text-center text-yellow-400 font-bold">{player.level}</td>
                                          <td className="p-3 text-center text-green-400 font-bold">{player.kills}</td>
                                          <td className="p-3 text-center text-red-400 font-bold">{player.deaths}</td>
                                          <td className="p-3 text-center text-blue-400 font-bold">{player.assists}</td>
                                          <td className="p-3 text-center text-yellow-300">{player.gpm}</td>
                                          <td className="p-3 text-center text-purple-300">{player.xpm}</td>
                                          <td className="p-3 text-right text-orange-400 font-semibold">{player.netWorth.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </>
                                  ) : (
                                    <tr className="border-t border-gray-700">
                                      <td className="p-3">
                                        <span className={matchData.result === 'win' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                          {matchData.result === 'win' ? 'RAD' : 'DIRE'}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-10 h-10 bg-purple-600/30 rounded flex items-center justify-center text-white text-xs font-bold">
                                            {matchData.heroId}
                                          </div>
                                          <span className="text-white text-xs">{selectedMeme.author?.username}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-center text-yellow-400 font-bold">{matchData.level || 1}</td>
                                      <td className="p-3 text-center text-green-400 font-bold">{matchData.kills}</td>
                                      <td className="p-3 text-center text-red-400 font-bold">{matchData.deaths}</td>
                                      <td className="p-3 text-center text-blue-400 font-bold">{matchData.assists}</td>
                                      <td className="p-3 text-center text-yellow-300">{matchData.gpm || 0}</td>
                                      <td className="p-3 text-center text-purple-300">{matchData.xpm || 0}</td>
                                      <td className="p-3 text-right text-orange-400 font-semibold">{(matchData.netWorth || 0).toLocaleString()}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Detailed Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Урон героям</div>
                                <div className="text-red-400 text-xl font-bold">{(matchData.heroDamage || 0).toLocaleString()}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Урон зданиям</div>
                                <div className="text-orange-400 text-xl font-bold">{(matchData.towerDamage || 0).toLocaleString()}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Лечение</div>
                                <div className="text-green-400 text-xl font-bold">{(matchData.heroHealing || 0).toLocaleString()}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Длительность</div>
                                <div className="text-blue-400 text-xl font-bold">{matchData.duration} мин</div>
                              </div>
                            </div>

                            {/* Last Hits & Denies */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Добито крипов</div>
                                <div className="text-green-300 text-2xl font-bold">{matchData.lastHits || 0}</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <div className="text-gray-400 text-xs mb-1">Заблокировано</div>
                                <div className="text-red-300 text-2xl font-bold">{matchData.denies || 0}</div>
                              </div>
                            </div>

                            {/* Items */}
                            {matchData.items && matchData.items.length > 0 && (
                              <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                                <div className="text-gray-300 font-semibold mb-3">🎒 Предметы</div>
                                <div className="flex flex-wrap gap-2">
                                  {matchData.items.map((itemId, idx) => (
                                    <div key={idx} className="w-14 h-14 bg-gray-700 rounded border border-purple-500/30 flex items-center justify-center">
                                      <span className="text-xs text-gray-400">#{itemId}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Match Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                <div className="text-gray-400 text-xs mb-1">Продолжительность</div>
                                <div className="text-white font-bold text-lg">
                                  {Math.floor(matchData.duration / 60)}:{(matchData.duration % 60).toString().padStart(2, '0')}
                                </div>
                              </div>
                              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                <div className="text-gray-400 text-xs mb-1">Общий GPM</div>
                                <div className="text-yellow-400 font-bold text-lg">
                                  {matchData.goldPerMin || 0}
                                </div>
                              </div>
                              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                <div className="text-gray-400 text-xs mb-1">Общий XPM</div>
                                <div className="text-purple-400 font-bold text-lg">
                                  {matchData.xpPerMin || 0}
                                </div>
                              </div>
                              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                                <div className="text-gray-400 text-xs mb-1">Рейтинг матча</div>
                                <div className="text-cyan-400 font-bold text-lg">
                                  {matchData.averageRank || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="flex items-center gap-3 mb-6 text-gray-400">
                    <FaUser className="text-purple-400" />
                    <span className="font-semibold">{selectedMeme.author?.username}</span>
                    <span>•</span>
                    <span>{new Date(selectedMeme.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  
                  <MemeRating
                    memeId={selectedMeme.id}
                    initialLikes={selectedMeme.likes}
                    initialDislikes={selectedMeme.dislikes}
                    className="mb-8"
                    toast={toast}
                  />
                  
                  <MemeComments memeId={selectedMeme.id} toast={toast} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      </div>
    </div>
  );
}

export default MemesPage;

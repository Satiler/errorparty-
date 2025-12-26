import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaChevronRight, FaFire, FaGripHorizontal } from 'react-icons/fa';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import MusicSidebar from '../components/music/MusicSidebar';
import TrackRow from '../components/music/TrackRow';
import HorizontalCarousel from '../components/music/HorizontalCarousel';
import QuickAccessCard from '../components/music/QuickAccessCard';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();

/**
 * Главная страница музыки в стиле Spotify/Яндекс Музыки
 */
export default function MusicHomePage() {
  const [personalPlaylists, setPersonalPlaylists] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [recentlyPlayedPlaylists, setRecentlyPlayedPlaylists] = useState([]);
  const [discoverPlaylists, setDiscoverPlaylists] = useState([]);
  const [popularTracks, setPopularTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  
  const { playTrack, currentTrack } = useMusicPlayer();

  useEffect(() => {
    setGreeting(getGreeting());
    loadContent();
  }, []);

  // Стили для скроллбара
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollable-tracks::-webkit-scrollbar {
        width: 6px;
      }
      .scrollable-tracks::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollable-tracks::-webkit-scrollbar-thumb {
        background: #404040;
        border-radius: 3px;
      }
      .scrollable-tracks::-webkit-scrollbar-thumb:hover {
        background: #606060;
      }
      .scrollable-tracks {
        scrollbar-color: #404040 transparent;
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      const [personalRes, featuredRes, tracksRes] = await Promise.all([
        axios.get(`${API_URL}/music/personal-playlists`).catch(() => ({ data: { playlists: [] } })),
        axios.get(`${API_URL}/music/playlists/editorial`).catch(() => ({ data: { playlists: [] } })),
        axios.get(`${API_URL}/music/tracks/popular?limit=100`).catch(() => ({ data: { tracks: [] } }))
      ]);

      const personal = personalRes.data.playlists || [];
      const featured = featuredRes.data.playlists || [];
      
      setPersonalPlaylists(personal);
      setFeaturedPlaylists(featured);
      setRecentlyPlayedPlaylists(featured.slice(0, 6));
      setDiscoverPlaylists(featured.slice(6, 12));
      setPopularTracks(tracksRes.data.tracks || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-black">
        <MusicSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
        </div>
      </div>
    );
  }

  const playPlaylist = async (playlist) => {
    try {
      if (playlist.tracks && playlist.tracks.length > 0) {
        playTrack(playlist.tracks[0], playlist.tracks);
      } else {
        // Загружаем плейлист с его треками
        const response = await axios.get(`${API_URL}/music/playlists/${playlist.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const playlistData = response.data?.playlist || response.data;
        const tracks = playlistData.tracks || [];
        
        console.log(`📀 Playlist "${playlistData.name}" loaded with ${tracks.length} tracks`);
        
        if (tracks.length > 0) {
          playTrack(tracks[0], tracks);
        } else {
          console.warn(`⚠️ Playlist "${playlistData.name}" has no available tracks`);
          alert(`Плейлист "${playlistData.name}" не содержит доступных треков`);
        }
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <MusicSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-950 via-gray-900 to-black pb-32">
        <div className="px-8 py-6">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-6xl font-black text-white mb-2">{greeting}</h1>
            <p className="text-gray-400 text-lg">Слушай то, что нравится</p>
          </motion.div>

          {/* Моя музыка - быстрый доступ */}
          {personalPlaylists.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-4">Моя музыка</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {personalPlaylists.map((playlist) => (
                  <QuickAccessCard
                    key={playlist.id}
                    playlist={playlist}
                    onPlay={() => playPlaylist(playlist)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Недавно слушал */}
          {recentlyPlayedPlaylists.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Недавно слушал</h2>
                <a href="/music/playlists" className="text-green-500 hover:text-green-400 flex items-center gap-2 text-sm">
                  Все подборки <FaChevronRight size={14} />
                </a>
              </div>
              <HorizontalCarousel
                items={recentlyPlayedPlaylists}
                renderItem={(playlist) => (
                  <PlaylistCardHorizontal
                    playlist={playlist}
                    onPlay={() => playPlaylist(playlist)}
                  />
                )}
              />
            </section>
          )}

          {/* Рекомендации */}
          {discoverPlaylists.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Для вас</h2>
              </div>
              <HorizontalCarousel
                items={discoverPlaylists}
                renderItem={(playlist) => (
                  <PlaylistCardHorizontal
                    playlist={playlist}
                    onPlay={() => playPlaylist(playlist)}
                  />
                )}
              />
            </section>
          )}

          {/* Все плейлисты */}
          {featuredPlaylists.length > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Все подборки</h2>
                <a href="/music/playlists" className="text-green-500 hover:text-green-400 flex items-center gap-2 text-sm">
                  Просмотреть все <FaChevronRight size={14} />
                </a>
              </div>
              <HorizontalCarousel
                items={featuredPlaylists.slice(0, 20)}
                renderItem={(playlist) => (
                  <PlaylistCardHorizontal
                    playlist={playlist}
                    onPlay={() => playPlaylist(playlist)}
                  />
                )}
              />
            </section>
          )}

          {/* Топ 100 треков */}
          {popularTracks.length > 0 && (
            <section className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FaFire className="text-orange-500" />
                  Топ 100 треков
                </h2>
                <span className="text-gray-400 text-sm">{popularTracks.length} треков</span>
              </div>
              
              <div className="bg-gradient-to-b from-gray-800/50 to-transparent rounded-lg p-6 max-h-96 overflow-y-auto scrollable-tracks">
                <div className="space-y-1">
                  {popularTracks.slice(0, 100).map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.005 }}
                      className="group hover:bg-gray-800/80 rounded px-4 py-2 cursor-pointer transition flex items-center gap-3"
                      onClick={() => playTrack(track, popularTracks)}
                    >
                      <div className="w-10 text-center text-gray-400 text-sm font-semibold flex-shrink-0">
                        {currentTrack?.id === track.id ? (
                          <span className="text-green-500">▶</span>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      
                      {/* Album art */}
                      {track.Album?.image && (
                        <img
                          src={track.Album.image}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <TrackRow track={track} showAlbum={false} compact={true} />
                      </div>
                      
                      {/* Duration */}
                      <div className="text-gray-400 text-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        {formatDuration(track.duration)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Градиенты для плейлистов (CSS цвета для inline стилей)
 */
const GRADIENTS = {
  'purple-blue': { from: '#9333ea', to: '#2563eb' },
  'orange-red': { from: '#f97316', to: '#dc2626' },
  'emerald-teal': { from: '#10b981', to: '#0d9488' },
  'pink-purple': { from: '#ec4899', to: '#9333ea' },
  'cyan-blue': { from: '#06b6d4', to: '#2563eb' },
  'yellow-orange': { from: '#eab308', to: '#ea580c' },
  'indigo-purple': { from: '#4f46e5', to: '#9333ea' },
  'slate-blue': { from: '#475569', to: '#2563eb' },
  'red-pink': { from: '#dc2626', to: '#ec4899' },
  'green-emerald': { from: '#16a34a', to: '#10b981' }
};

/**
 * Горизонтальная карточка плейлиста
 */
function PlaylistCardHorizontal({ playlist, onPlay }) {
  // Определяем градиент
  let gradientStyle = {};
  let isGradient = false;
  
  if (playlist.image && playlist.image.startsWith('gradient://')) {
    const gradientName = playlist.image.replace('gradient://', '');
    const colors = GRADIENTS[gradientName] || GRADIENTS['purple-blue'];
    gradientStyle = {
      backgroundImage: `linear-gradient(to bottom right, ${colors.from}, ${colors.to})`
    };
    isGradient = true;
  } else if (!playlist.image) {
    // Дефолтный градиент если нет картинки
    gradientStyle = {
      backgroundImage: 'linear-gradient(to bottom right, #9333ea, #2563eb)'
    };
  }
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="group w-48 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden bg-gray-800/50 hover:bg-gray-700/50 transition"
      onClick={onPlay}
    >
      {/* Image */}
      <div 
        className="relative overflow-hidden h-48" 
        style={playlist.image && !isGradient ? {} : gradientStyle}
      >
        {playlist.image && !isGradient && (
          <img
            src={playlist.image}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-400 text-black p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <FaPlay size={18} />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 h-10">{playlist.name}</h3>
        <p className="text-gray-400 text-xs line-clamp-1">{playlist.description || 'Подборка'}</p>
      </div>
    </motion.div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Карточка личного плейлиста (Моя волна, Премьера и т.д.)
 */
function PersonalPlaylistCard({ playlist, isExpanded, onExpand, onPlay }) {
  const icons = {
    'Моя волна': '🌊',
    'Новое на KissVK': '✨',
    'Хиты': '🔥',
    'Премьера': '🎬',
    'Недавно добавлено': '🆕'
  };

  const icon = icons[playlist.name] || '🎵';

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative group cursor-pointer rounded-lg overflow-hidden transition ${
        isExpanded ? 'bg-gradient-to-br from-purple-600 to-purple-900' : 'bg-gradient-to-br from-gray-800 to-gray-900'
      }`}
      onClick={onExpand}
    >
      {/* Background с иконкой */}
      <div className="p-6 h-40 flex flex-col justify-between">
        <div className="text-5xl opacity-80">{icon}</div>
        <div>
          <h3 className="text-white font-bold text-sm mb-1 truncate">{playlist.name}</h3>
          <p className="text-gray-300 text-xs">{playlist.trackCount || 0} треков</p>
        </div>
      </div>

      {/* Play button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-400 text-black p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
      >
        <FaPlay size={16} />
      </motion.button>

      {isExpanded && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
      )}
    </motion.div>
  );
}

/**
 * Развёрнутый плейлист
 */
function ExpandedPlaylist({ playlistId, personalPlaylists, onClose }) {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const slugMap = {
        1: 'my-wave',
        2: 'new-tracks',
        3: 'hits',
        4: 'premiere',
        5: 'recently-added'
      };

      const currentPlaylist = personalPlaylists.find(p => p.id === playlistId);
      const slug = currentPlaylist?.slug || slugMap[playlistId];

      const res = await axios.get(`${API_URL}/music/personal-playlists/${slug}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setPlaylist(res.data.playlist);
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="animate-pulse h-10 bg-gray-700 rounded w-1/4"></div>
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-8 border border-gray-700"
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-2xl font-bold text-white">{playlist.name}</h3>
          <p className="text-gray-400">{playlist.trackCount} треков</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {playlist.tracks?.map((track, index) => (
          <div
            key={track.id}
            className="hover:bg-gray-700 rounded px-3 py-2 cursor-pointer transition flex items-center gap-3"
            onClick={() => playTrack(track, playlist.tracks)}
          >
            <span className="text-gray-400 text-sm w-6 text-right">{index + 1}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium truncate">{track.title}</p>
              <p className="text-gray-400 text-xs truncate">
                {track.artist || track.User?.username || 'Неизвестно'}
              </p>
            </div>
            {track.Album && (
              <img
                src={track.Album.image}
                alt={track.Album.title}
                className="w-8 h-8 rounded object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Карточка редакционного плейлиста (оставляю для обратной совместимости)
 */
function FeaturedPlaylistCard({ playlist, onPlay }) {
  // Определяем градиент
  let gradientStyle = {};
  let isGradient = false;
  
  if (playlist.image && playlist.image.startsWith('gradient://')) {
    const gradientName = playlist.image.replace('gradient://', '');
    const colors = GRADIENTS[gradientName] || GRADIENTS['purple-blue'];
    gradientStyle = {
      backgroundImage: `linear-gradient(to bottom right, ${colors.from}, ${colors.to})`
    };
    isGradient = true;
  } else if (!playlist.image) {
    gradientStyle = {
      backgroundImage: 'linear-gradient(to bottom right, #9333ea, #2563eb)'
    };
  }
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="group cursor-pointer rounded-lg overflow-hidden bg-gray-800 hover:bg-gray-700 transition"
      onClick={onPlay}
    >
      {/* Image */}
      <div 
        className="relative overflow-hidden h-40" 
        style={playlist.image && !isGradient ? {} : gradientStyle}
      >
        {playlist.image && !isGradient && (
          <img
            src={playlist.image}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition"
          />
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-400 text-black p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <FaPlay size={16} />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-bold text-sm mb-1 truncate">{playlist.name}</h3>
        <p className="text-gray-400 text-xs truncate">{playlist.description}</p>
      </div>
    </motion.div>
  );
}


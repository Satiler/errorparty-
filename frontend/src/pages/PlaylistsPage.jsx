import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaPlay, FaSearch } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import MusicSidebar from '../components/music/MusicSidebar';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();

/**
 * Страница со всеми плейлистами
 */
export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, personal, featured
  
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const [personalRes, featuredRes] = await Promise.all([
        axios.get(`${API_URL}/music/personal-playlists`).catch(() => ({ data: { playlists: [] } })),
        axios.get(`${API_URL}/music/playlists/editorial`).catch(() => ({ data: { playlists: [] } }))
      ]);

      const personal = personalRes.data.playlists || [];
      const featured = featuredRes.data.playlists || [];
      
      setPlaylists([
        ...personal.map(p => ({ ...p, type: 'personal' })),
        ...featured.map(p => ({ ...p, type: 'featured' }))
      ]);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = playlists.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePlayPlaylist = async (playlist) => {
    try {
      let tracks = [];

      if (playlist.type === 'personal') {
        const res = await axios.get(`${API_URL}/music/personal-playlists/${playlist.slug}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        tracks = res.data.playlist?.tracks || [];
      } else {
        const res = await axios.get(`${API_URL}/music/playlists/${playlist.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        tracks = res.data.playlist?.tracks || [];
      }

      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
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

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <MusicSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black pb-32">
        <div className="px-8 py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link to="/music" className="flex items-center gap-2 text-green-500 hover:text-green-400 mb-4">
              <FaChevronLeft size={18} />
              Вернуться на главную
            </Link>
            <h1 className="text-5xl font-black text-white mb-2">Все подборки</h1>
            <p className="text-gray-400">Найди плейлист по душе</p>
          </motion.div>

          {/* Search and Filter */}
          <div className="mb-8 flex gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {[
                { label: 'Все', value: 'all' },
                { label: 'Личные', value: 'personal' },
                { label: 'Подборки', value: 'featured' }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === f.value
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Playlists Grid */}
          {filteredPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlaylists.map((playlist) => (
                <PlaylistGridCard
                  key={`${playlist.type}-${playlist.id}`}
                  playlist={playlist}
                  onPlay={() => handlePlayPlaylist(playlist)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-xl">Плейлисты не найдены</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Карточка плейлиста в сетке
 */
function PlaylistGridCard({ playlist, onPlay }) {
  const icons = {
    'Моя волна': '🌊',
    'Новое на KissVK': '✨',
    'Хиты': '🔥',
    'Премьера': '🎬',
    'Недавно добавлено': '🆕'
  };

  const icon = playlist.type === 'personal' ? (icons[playlist.name] || '🎵') : null;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden hover:from-gray-700 hover:to-gray-800 transition"
    >
      {/* Image/Background */}
      <div className="relative overflow-hidden h-48 bg-gradient-to-br from-purple-600 to-blue-600">
        {icon ? (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {icon}
          </div>
        ) : playlist.image ? (
          <img
            src={playlist.image}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition"
          />
        ) : null}

        {/* Play Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={onPlay}
          className="absolute bottom-3 right-3 bg-green-500 hover:bg-green-400 text-black p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
        >
          <FaPlay size={18} />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{playlist.name}</h3>
        <p className="text-gray-400 text-xs mb-2">
          {playlist.type === 'personal' ? '🎵 Личный плейлист' : '📋 Подборка'}
        </p>
        <p className="text-gray-500 text-xs line-clamp-1">
          {playlist.trackCount || 0} треков
        </p>
        {playlist.description && (
          <p className="text-gray-500 text-xs mt-2 line-clamp-2">{playlist.description}</p>
        )}
      </div>
    </motion.div>
  );
}

import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaHome, 
  FaSearch, 
  FaBookmark, 
  FaMusic,
  FaHeart,
  FaPlus,
  FaClock
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../utils/apiConfig';

const API_URL = getApiUrl();

/**
 * Боковое меню для музыкального модуля в стиле Spotify
 */
export default function MusicSidebar() {
  const [playlists, setPlaylists] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      fetchUserPlaylists();
    }
  }, []);

  const fetchUserPlaylists = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/playlists/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaylists(response.data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const menuItems = [
    { path: '/music', icon: FaHome, label: 'Главная', exact: true },
    { path: '/music/search', icon: FaSearch, label: 'Поиск' },
    { path: '/music/library', icon: FaBookmark, label: 'Моя библиотека' }
  ];

  const libraryItems = [
    { path: '/music/liked', icon: FaHeart, label: 'Любимые треки' },
    { path: '/music/recent', icon: FaClock, label: 'Недавние' }
  ];

  return (
    <aside className="w-64 bg-black flex-shrink-0 h-full overflow-y-auto">
      <div className="p-6">
        {/* Логотип */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaMusic className="text-green-500" />
            ErrorParty Music
          </h1>
        </div>

        {/* Основное меню */}
        <nav className="space-y-2 mb-8">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Быстрые ссылки */}
        <div className="mb-8">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 px-4">
            Коллекция
          </h2>
          <nav className="space-y-2">
            {libraryItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Плейлисты */}
        {token && (
          <div>
            <div className="flex items-center justify-between mb-4 px-4">
              <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                Плейлисты
              </h2>
              <button className="text-gray-400 hover:text-white transition-colors">
                <FaPlus className="w-4 h-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <NavLink
                    key={playlist.id}
                    to={`/music/playlist/${playlist.id}`}
                    className={({ isActive }) =>
                      `block px-4 py-2 rounded-lg transition-colors truncate ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }`
                    }
                  >
                    {playlist.name}
                  </NavLink>
                ))
              ) : (
                <p className="text-gray-500 text-sm px-4 py-2">
                  Нет плейлистов
                </p>
              )}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}

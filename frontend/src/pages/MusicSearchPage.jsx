import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import MusicSidebar from '../components/music/MusicSidebar';
import PlaylistCard from '../components/music/PlaylistCard';
import AlbumCard from '../components/music/AlbumCard';
import TrackRow from '../components/music/TrackRow';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Страница поиска в стиле Spotify
 */
export default function MusicSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ tracks: [], albums: [], playlists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGenres();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setResults({ tracks: [], albums: [], playlists: [] });
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadGenres = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/playlists/editorial`);
      // Используем все редакционные плейлисты как жанры (убираем строгий фильтр с эмодзи)
      const genrePlaylists = (response.data.playlists || []).filter(p =>
        (p.trackCount || 0) > 0
      );
      setGenres(genrePlaylists);
    } catch (error) {
      console.error('Error loading genres:', error);
      setGenres([]);
    }
  };

  const performSearch = async (query) => {
    setLoading(true);
    setIsSearching(true);

    try {
      const [tracksRes, albumsRes, playlistsRes] = await Promise.all([
        axios.get(`${API_URL}/music/tracks/search?q=${encodeURIComponent(query)}&limit=20`),
        axios.get(`${API_URL}/music/albums?search=${encodeURIComponent(query)}&limit=10`),
        axios.get(`${API_URL}/music/playlists?search=${encodeURIComponent(query)}&limit=10`)
      ]);

      setResults({
        tracks: tracksRes.data.tracks || [],
        albums: albumsRes.data.albums || [],
        playlists: playlistsRes.data.playlists || []
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ tracks: [], albums: [], playlists: [] });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults({ tracks: [], albums: [], playlists: [] });
    setIsSearching(false);
  };

  const hasResults = results.tracks.length > 0 || results.albums.length > 0 || results.playlists.length > 0;

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <MusicSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black pb-32">
        <div className="px-8 py-6">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="relative max-w-2xl">
              <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-2xl" />
              <input
                type="text"
                placeholder="Что хочешь послушать?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white/10 border-2 border-white/20 rounded-full pl-16 pr-16 py-5 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Search Results */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
            </div>
          ) : isSearching && searchQuery ? (
            hasResults ? (
              <div className="space-y-12">
                {/* Tracks */}
                {results.tracks.length > 0 && (
                  <section>
                    <h2 className="text-3xl font-bold text-white mb-6">Треки</h2>
                    <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm">
                      <div className="space-y-1">
                        {results.tracks.map((track, index) => (
                          <TrackRow
                            key={track.id}
                            track={track}
                            index={index}
                            queue={results.tracks}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Albums */}
                {results.albums.length > 0 && (
                  <section>
                    <h2 className="text-3xl font-bold text-white mb-6">Альбомы</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {results.albums.map((album, index) => (
                        <AlbumCard key={album.id} album={album} index={index} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Playlists */}
                {results.playlists.length > 0 && (
                  <section>
                    <h2 className="text-3xl font-bold text-white mb-6">Плейлисты</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {results.playlists.map((playlist, index) => (
                        <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-2xl">
                  Ничего не найдено по запросу "{searchQuery}"
                </p>
              </div>
            )
          ) : (
            /* Browse Genres */
            <section>
              <h2 className="text-3xl font-bold text-white mb-8">Обзор жанров</h2>
              {genres.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {genres.map((genre, index) => (
                    <GenreCard key={genre.id} genre={genre} index={index} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="text-6xl mb-6 text-gray-600">🎵</div>
                  <p className="text-gray-400 text-xl">Жанры загружаются...</p>
                  <p className="text-gray-500 text-sm mt-2">Если жанры не появляются, обновите страницу</p>
                </motion.div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Карточка жанра
 */
function GenreCard({ genre, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.05 }}
      className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: genre.metadata?.color
          ? `linear-gradient(135deg, ${genre.metadata.color}, ${genre.metadata.color}80)`
          : 'linear-gradient(135deg, #8b5cf6, #ec4899)'
      }}
      onClick={() => window.location.href = `/music/playlists/${genre.id}`}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        <h3 className="text-white text-2xl font-black">
          {genre.name.replace('🎼 ', '')}
        </h3>
        <div className="text-7xl self-end">
          {genre.metadata?.icon || '🎵'}
        </div>
      </div>
    </motion.div>
  );
}

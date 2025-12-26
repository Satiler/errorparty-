import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
  FaClock,
  FaFire,
  FaSearch,
  FaMusic
} from 'react-icons/fa';
import axios from 'axios';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MusicPageSpotify() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ tracks: [], albums: [], playlists: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicPlayer();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPlaylists();
    fetchAlbums();
    if (token) {
      fetchFavorites();
    }
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/music/playlists/editorial`);
      setPlaylists(response.data.playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/albums?limit=30&sortBy=createdAt&order=DESC`);
      setAlbums(response.data.albums || []);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/music/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favoriteIds = new Set(response.data.tracks.map(t => t.id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handlePlayTrack = async (track, queue = []) => {
    // Используем глобальный playTrack из контекста с очередью
    await playTrack(track, queue);
    
    // Записываем прослушивание
    if (token) {
      axios.post(`${API_URL}/music/tracks/${track.id}/listen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error('Error recording listen:', err));
    }
  };

  const toggleLike = async (trackId) => {
    if (!token) {
      alert('Войдите, чтобы добавить в избранное');
      return;
    }

    try {
      const isLiked = favorites.has(trackId);
      
      if (isLiked) {
        await axios.delete(`${API_URL}/music/tracks/${trackId}/like`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
      } else {
        await axios.post(`${API_URL}/music/tracks/${trackId}/like`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(prev => new Set([...prev, trackId]));
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults({ tracks: [], albums: [], playlists: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const [tracksRes, albumsRes, playlistsRes] = await Promise.all([
        axios.get(`${API_URL}/music/tracks/search?q=${encodeURIComponent(query)}&limit=20`),
        axios.get(`${API_URL}/music/albums?search=${encodeURIComponent(query)}&limit=10`),
        axios.get(`${API_URL}/music/playlists?search=${encodeURIComponent(query)}&limit=10`)
      ]);

      setSearchResults({
        tracks: tracksRes.data.tracks || [],
        albums: albumsRes.data.albums || [],
        playlists: playlistsRes.data.playlists || []
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ tracks: [], albums: [], playlists: [] });
    }
  };

  // Группировка плейлистов по типу
  const featuredPlaylists = playlists
    .filter(p => {
      // Показываем только жанровые и специальные плейлисты, не исполнителей
      const name = p.name || '';
      const isArtistPlaylist = name.startsWith('🎤');
      const isGenrePlaylist = name.startsWith('🎼');
      const isSpecialPlaylist = name.startsWith('🆕') || name.startsWith('🎲') || name.startsWith('🗓️');
      
      return (isGenrePlaylist || isSpecialPlaylist) && p.metadata?.priority <= 3 && (p.trackCount || 0) > 0;
    })
    .sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0)); // Сортировка по количеству треков
  const genrePlaylists = playlists.filter(p => 
    p.name.includes('Electronic') || 
    p.name.includes('Hip-Hop') || 
    p.name.includes('Rock') || 
    p.name.includes('Jazz') || 
    p.name.includes('Soul') || 
    p.name.includes('Synthwave') ||
    p.name.includes('Metal') ||
    p.name.includes('Metal Thunder') ||
    ['Electronic Vibes', 'Hip-Hop Nation', 'Rock Legends', 'Jazz & Chill', 'Soul Sessions', 'Synthwave Dreams'].includes(p.name)
  );
  const moodPlaylists = playlists.filter(p => 
    p.name.includes('Энергия') || 
    p.name.includes('Чилл') || 
    p.name.includes('Chill') || 
    p.name.includes('Романтика') || 
    p.name.includes('Город') ||
    p.name.includes('Ночной')
  );
  const activityPlaylists = playlists.filter(p => 
    p.name.includes('Тренировка') || 
    p.name.includes('Работа') || 
    p.name.includes('Дорога') ||
    p.name.includes('Party') ||
    p.name.includes('Акустика')
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white pb-32">
      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-8xl font-black mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Музыка
          </h1>
          <p className="text-gray-400 text-xl">Открой для себя лучшие треки и подборки</p>
          
          {/* Search Bar */}
          <div className="mt-8 relative">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Найти треки, альбомы, исполнителей..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-14 pr-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-16">
            {searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.playlists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-xl">Ничего не найдено по запросу "{searchQuery}"</p>
              </div>
            ) : (
              <>
                {/* Search Tracks */}
                {searchResults.tracks.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Треки</h2>
                    <div className="space-y-2">
                      {searchResults.tracks.map(track => (
                        <motion.div
                          key={track.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handlePlayTrack(track, searchResults.tracks)}
                          className="group bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-4"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            {currentTrack?.id === track.id && isPlaying ? (
                              <FaPause className="text-white" />
                            ) : (
                              <FaPlay className="text-white ml-0.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">{track.title}</p>
                            <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track.id);
                            }}
                            className="text-gray-400 hover:text-green-500 transition-colors"
                          >
                            {favorites.has(track.id) ? (
                              <FaHeart className="text-green-500" />
                            ) : (
                              <FaRegHeart />
                            )}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Search Albums */}
                {searchResults.albums.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Альбомы</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {searchResults.albums.map(album => (
                        <motion.div
                          key={album.id}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => navigate(`/music/albums/${album.id}`)}
                          className="group bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-all"
                        >
                          <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mb-3 flex items-center justify-center">
                            <FaMusic className="text-white text-3xl" />
                          </div>
                          <p className="text-white font-semibold truncate text-sm">{album.title}</p>
                          <p className="text-gray-400 text-xs truncate">{album.artist}</p>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Search Playlists */}
                {searchResults.playlists.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Плейлисты</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {searchResults.playlists.map(playlist => (
                        <motion.div
                          key={playlist.id}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => navigate(`/music/playlists/${playlist.id}`)}
                          className="group bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-all"
                        >
                          <div className="aspect-square bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg mb-3 flex items-center justify-center">
                            <FaMusic className="text-white text-3xl" />
                          </div>
                          <p className="text-white font-semibold truncate text-sm">{playlist.name}</p>
                          <p className="text-gray-400 text-xs">{playlist.trackCount} треков</p>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500"></div>
          </div>
        ) : !searchQuery && (
          <>
            {/* Featured Playlists */}
            {featuredPlaylists.length > 0 && (
              <section className="mb-16">
                <h2 className="text-4xl font-black mb-8 flex items-center gap-3">
                  <FaFire className="text-orange-500 animate-pulse" />
                  Популярное сегодня
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPlaylists.slice(0, 12).map((playlist, index) => (
                    <motion.div
                      key={playlist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      onClick={(e) => {
                        // Проверяем, был ли клик на кнопке Play
                        if (!e.target.closest('button')) {
                          navigate(`/music/playlists/${playlist.id}`);
                        }
                      }}
                      className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl cursor-pointer hover:shadow-2xl hover:shadow-purple-500/20 transition-all group overflow-hidden"
                      style={{
                        background: playlist.metadata?.color 
                          ? `linear-gradient(135deg, ${playlist.metadata.color}30, #0a0a0a)` 
                          : undefined
                      }}
                    >
                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 group-hover:translate-x-full" />
                      
                      <div className="relative flex items-center gap-6">
                        <div 
                          className="w-32 h-32 rounded-xl flex items-center justify-center text-6xl shadow-2xl transform group-hover:scale-110 transition-transform duration-300"
                          style={{
                            background: playlist.metadata?.color 
                              ? `linear-gradient(135deg, ${playlist.metadata.color}, ${playlist.metadata.color}80)` 
                              : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            boxShadow: playlist.metadata?.color 
                              ? `0 20px 60px ${playlist.metadata.color}40` 
                              : '0 20px 60px rgba(139, 92, 246, 0.4)'
                          }}
                        >
                          {playlist.metadata?.icon || '🎵'}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-3xl font-black mb-3 line-clamp-1">{playlist.name}</h3>
                          <p className="text-gray-400 line-clamp-2 mb-3 text-lg leading-relaxed">
                            {playlist.description || 'Лучшая подборка треков'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="font-semibold">{playlist.trackCount || 0} треков</span>
                            <span>•</span>
                            <span>ErrorParty</span>
                          </div>
                        </div>
                        <motion.button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await axios.get(`${API_URL}/music/playlists/${playlist.id}`);
                              const playlistTracks = response.data.playlist?.tracks || response.data.tracks || [];
                              if (playlistTracks.length > 0) {
                                const firstTrack = playlistTracks[0].track || playlistTracks[0];
                                const tracksList = playlistTracks.map(t => t.track || t).filter(t => t && t.streamUrl);
                                await handlePlayTrack(firstTrack, tracksList);
                              }
                            } catch (error) {
                              console.error('Error loading playlist:', error);
                            }
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="focus:outline-none"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 hover:shadow-green-500/80 transition-shadow">
                            <FaPlay className="text-black text-xl ml-1" />
                          </div>
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Genre Playlists */}
            {genrePlaylists.length > 0 && (
              <section className="mb-16">
                <h2 className="text-4xl font-black mb-8">Жанры</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {genrePlaylists.map((playlist, index) => (
                    <motion.div
                      key={playlist.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlaylistCard playlist={playlist} navigate={navigate} playTrack={handlePlayTrack} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Mood Playlists */}
            {moodPlaylists.length > 0 && (
              <section className="mb-16">
                <h2 className="text-4xl font-black mb-8">Твоё настроение</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {moodPlaylists.map((playlist, index) => (
                    <motion.div
                      key={playlist.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlaylistCard playlist={playlist} navigate={navigate} playTrack={handlePlayTrack} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Playlists */}
            {activityPlaylists.length > 0 && (
              <section className="mb-16">
                <h2 className="text-4xl font-black mb-8">Для любой активности</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {activityPlaylists.map((playlist, index) => (
                    <motion.div
                      key={playlist.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlaylistCard playlist={playlist} navigate={navigate} playTrack={handlePlayTrack} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All Other Playlists */}
            {playlists.filter(p => 
              !featuredPlaylists.includes(p) && 
              !genrePlaylists.includes(p) && 
              !moodPlaylists.includes(p) && 
              !activityPlaylists.includes(p)
            ).length > 0 && (
              <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6">Все подборки</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {playlists.filter(p => 
                    !featuredPlaylists.includes(p) && 
                    !genrePlaylists.includes(p) && 
                    !moodPlaylists.includes(p) && 
                    !activityPlaylists.includes(p)
                  ).map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} navigate={navigate} playTrack={handlePlayTrack} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* NEW: Albums Section */}
        {albums.length > 0 && (
          <section className="mb-16">
            <h2 className="text-4xl font-black mb-8">💿 Новые альбомы</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {albums.slice(0, 18).map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  onClick={() => navigate(`/music/albums/${album.id}`)}
                  className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-2xl cursor-pointer hover:bg-gray-800/60 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative">
                    <div className="aspect-square mb-3 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
                      {album.coverUrl ? (
                        <img 
                          src={album.coverUrl} 
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          💿
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-base line-clamp-1 group-hover:text-green-400 transition-colors">
                        {album.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-1">
                        {album.artist}
                      </p>
                      {album.releaseYear && (
                        <p className="text-xs text-gray-500">
                          {album.releaseYear}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Playlist Card Component
function PlaylistCard({ playlist, navigate, playTrack }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handlePlayClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await axios.get(`${API_URL}/music/playlists/${playlist.id}`);
      const tracks = response.data.playlist?.tracks || response.data.tracks || [];
      
      if (tracks.length > 0) {
        const firstTrackItem = tracks[0];
        const firstTrack = firstTrackItem.track || firstTrackItem;
        
        // Используем глобальный playTrack с очередью из всех треков плейлиста
        const tracksList = tracks.map(t => t.track || t);
        await playTrack(firstTrack, tracksList);
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  };
  
  const handleCardClick = (e) => {
    // Проверить, был ли клик на кнопке Play
    if (e.target.closest('button')) {
      return; // Не переходить если клик на кнопке
    }
    navigate(`/music/playlists/${playlist.id}`);
  };
  
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      className="bg-gray-900/40 backdrop-blur-sm p-5 rounded-2xl cursor-pointer hover:bg-gray-800/60 transition-all group relative overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div 
          className="aspect-square mb-4 rounded-xl overflow-hidden relative shadow-2xl transform group-hover:shadow-purple-500/30 transition-shadow duration-300"
          style={{
            background: playlist.metadata?.color 
              ? `linear-gradient(135deg, ${playlist.metadata.color}, ${playlist.metadata.color}80)` 
              : 'linear-gradient(135deg, #8b5cf6, #ec4899)'
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-7xl">
            {playlist.metadata?.icon || '🎵'}
          </div>
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Play button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 10
            }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-2 right-2"
          >
            <button
              onClick={handlePlayClick}
              className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 hover:scale-110 transition-transform focus:outline-none"
            >
              <FaPlay className="text-black text-lg ml-0.5" />
            </button>
          </motion.div>
        </div>
        
        <h3 className="font-black text-lg mb-2 truncate group-hover:text-green-400 transition-colors">
          {playlist.name}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
          {playlist.description || 'Подборка треков'}
        </p>
      </div>
    </motion.div>
  );
}

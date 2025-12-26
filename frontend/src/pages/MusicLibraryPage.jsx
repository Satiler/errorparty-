import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaClock, FaMusic, FaCompactDisc, FaList } from 'react-icons/fa';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { usePlaylists, useAlbums, useFavorites, useRecentTracks } from '../hooks/useMusic';
import { LoadingSpinner } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import MusicSidebar from '../components/music/MusicSidebar';
import PlaylistCard from '../components/music/PlaylistCard';
import AlbumCard from '../components/music/AlbumCard';
import TrackRow from '../components/music/TrackRow';

/**
 * Страница библиотеки в стиле Spotify
 */
export default function MusicLibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists'); // playlists, albums, liked, recent
  
  // React Query hooks с автоматическим кешированием
  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError, refetch: refetchPlaylists } = usePlaylists();
  const { data: albums = [], isLoading: albumsLoading, error: albumsError, refetch: refetchAlbums } = useAlbums();
  const { data: likedTracks = [], isLoading: likedLoading, error: likedError, refetch: refetchLiked } = useFavorites();
  const { data: recentTracks = [], isLoading: recentLoading, error: recentError, refetch: refetchRecent } = useRecentTracks(50);
  
  const token = localStorage.getItem('token');

  // Определяем состояние загрузки и ошибки в зависимости от активной вкладки
  const loading = {
    playlists: playlistsLoading,
    albums: albumsLoading,
    liked: likedLoading,
    recent: recentLoading
  }[activeTab];

  const error = {
    playlists: playlistsError,
    albums: albumsError,
    liked: likedError,
    recent: recentError
  }[activeTab];

  const retry = {
    playlists: refetchPlaylists,
    albums: refetchAlbums,
    liked: refetchLiked,
    recent: refetchRecent
  }[activeTab];

  const tabs = [
    { id: 'playlists', label: 'Плейлисты', icon: FaList },
    { id: 'albums', label: 'Альбомы', icon: FaCompactDisc },
    { id: 'liked', label: 'Любимые треки', icon: FaHeart },
    { id: 'recent', label: 'Недавние', icon: FaClock }
  ];

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
            <h1 className="text-5xl font-black text-white mb-4">Моя библиотека</h1>
            
            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          {loading ? (
            <LoadingSpinner size="lg" className="py-20" />
          ) : error ? (
            <ErrorState
              message={error.response?.data?.error || error.message || 'Не удалось загрузить данные'}
              retry={retry}
            />
          ) : (
            <>
              {/* Playlists Grid */}
              {activeTab === 'playlists' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {playlists.length > 0 ? (
                    playlists.map((playlist, index) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} index={index} />
                    ))
                  ) : (
                    <div className="col-span-full">
                      <EmptyState
                        icon={<FaMusic className="w-16 h-16" />}
                        title="У вас пока нет плейлистов"
                        description="Создайте свой первый плейлист или добавьте понравившиеся треки"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Albums Grid */}
              {activeTab === 'albums' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {albums.length > 0 ? (
                    albums.map((album, index) => (
                      <AlbumCard key={album.id} album={album} index={index} />
                    ))
                  ) : (
                    <div className="col-span-full">
                      <EmptyState
                        icon={<FaCompactDisc className="w-16 h-16" />}
                        title="У вас пока нет сохраненных альбомов"
                        description="Начните сохранять любимые альбомы для быстрого доступа"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Liked Tracks List */}
              {activeTab === 'liked' && (
                <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm">
                  {likedTracks.length > 0 ? (
                    <div className="space-y-1">
                      {likedTracks.map((track, index) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={index}
                          queue={likedTracks}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaHeart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-xl">Вы еще не добавили любимые треки</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Tracks List */}
              {activeTab === 'recent' && (
                <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm">
                  {recentTracks.length > 0 ? (
                    <div className="space-y-1">
                      {recentTracks.map((track, index) => (
                        <TrackRow
                          key={`${track.id}-${index}`}
                          track={track}
                          index={index}
                          queue={recentTracks}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaClock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-xl">История прослушиваний пуста</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

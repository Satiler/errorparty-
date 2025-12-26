import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const PlaylistContext = createContext();

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within PlaylistProvider');
  }
  return context;
};

export const PlaylistProvider = ({ children }) => {
  // State для плейлистов
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  
  // Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка всех плейлистов пользователя
  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/music/playlists');
      setPlaylists(response.data || []);
    } catch (err) {
      console.error('Error loading playlists:', err);
      setError(err.response?.data?.message || 'Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка треков плейлиста
  const loadPlaylistTracks = useCallback(async (playlistId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/music/playlists/${playlistId}`);
      setPlaylistTracks(response.data.playlist?.tracks || []);
      
      // Обновляем информацию о текущем плейлисте
      if (response.data.playlist) {
        setCurrentPlaylist(response.data.playlist);
      }
    } catch (err) {
      console.error('Error loading playlist tracks:', err);
      setError(err.response?.data?.message || 'Failed to load playlist tracks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Создание нового плейлиста
  const createPlaylist = useCallback(async (name, description = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/music/playlists', {
        name,
        description
      });
      
      const newPlaylist = response.data;
      setPlaylists(prev => [...prev, newPlaylist]);
      
      return newPlaylist;
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(err.response?.data?.message || 'Failed to create playlist');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обновление плейлиста
  const updatePlaylist = useCallback(async (playlistId, updates) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/api/music/playlists/${playlistId}`, updates);
      
      const updatedPlaylist = response.data;
      setPlaylists(prev => 
        prev.map(p => p.id === playlistId ? updatedPlaylist : p)
      );
      
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(updatedPlaylist);
      }
      
      return updatedPlaylist;
    } catch (err) {
      console.error('Error updating playlist:', err);
      setError(err.response?.data?.message || 'Failed to update playlist');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylist]);

  // Удаление плейлиста
  const deletePlaylist = useCallback(async (playlistId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.delete(`/api/music/playlists/${playlistId}`);
      
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(null);
        setPlaylistTracks([]);
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to delete playlist';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylist]);

  // Добавление трека в плейлист
  const addTrackToPlaylist = useCallback(async (playlistId, trackId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post(`/api/music/playlists/${playlistId}/tracks`, {
        trackId
      });
      
      // Если это текущий плейлист, перезагружаем его треки
      if (currentPlaylist?.id === playlistId) {
        await loadPlaylistTracks(playlistId);
      }
      
      // Обновляем счетчик треков в плейлисте
      setPlaylists(prev =>
        prev.map(p => {
          if (p.id === playlistId) {
            return { ...p, trackCount: (p.trackCount || 0) + 1 };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error adding track to playlist:', err);
      setError(err.response?.data?.message || 'Failed to add track to playlist');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylist, loadPlaylistTracks]);

  // Удаление трека из плейлиста
  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.delete(`/api/music/playlists/${playlistId}/tracks/${trackId}`);
      
      // Если это текущий плейлист, обновляем локальный список
      if (currentPlaylist?.id === playlistId) {
        setPlaylistTracks(prev => prev.filter(t => t.id !== trackId));
      }
      
      // Обновляем счетчик треков в плейлисте
      setPlaylists(prev =>
        prev.map(p => {
          if (p.id === playlistId) {
            return { ...p, trackCount: Math.max((p.trackCount || 1) - 1, 0) };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error removing track from playlist:', err);
      setError(err.response?.data?.message || 'Failed to remove track from playlist');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylist]);

  // Изменение порядка треков в плейлисте
  const reorderPlaylistTracks = useCallback(async (playlistId, trackIds) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.put(`/api/music/playlists/${playlistId}/reorder`, {
        trackIds
      });
      
      // Если это текущий плейлист, обновляем локальный порядок
      if (currentPlaylist?.id === playlistId) {
        const reorderedTracks = trackIds
          .map(id => playlistTracks.find(t => t.id === id))
          .filter(Boolean);
        setPlaylistTracks(reorderedTracks);
      }
    } catch (err) {
      console.error('Error reordering playlist tracks:', err);
      setError(err.response?.data?.message || 'Failed to reorder tracks');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPlaylist, playlistTracks]);

  // Генерация Radio из плейлиста
  const generateRadioFromPlaylist = useCallback(async (playlistId, limit = 30) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/music/playlists/${playlistId}/radio`, {
        params: { limit }
      });
      
      return response.data.tracks || [];
    } catch (err) {
      console.error('Error generating radio from playlist:', err);
      setError(err.response?.data?.message || 'Failed to generate radio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Получение системных плейлистов (Discover Weekly, Smart Mixes и т.д.)
  const loadSystemPlaylists = useCallback(async () => {
    try {
      const [discoverWeekly, smartMixes, trending] = await Promise.all([
        axios.get('/api/music/recommendations/discover-weekly').catch(() => ({ data: null })),
        axios.get('/api/music/recommendations/smart-mixes/current').catch(() => ({ data: null })),
        axios.get('/api/music/playlists/generated/trending').catch(() => ({ data: null }))
      ]);

      return {
        discoverWeekly: discoverWeekly.data,
        smartMix: smartMixes.data,
        trending: trending.data
      };
    } catch (err) {
      console.error('Error loading system playlists:', err);
      return {
        discoverWeekly: null,
        smartMix: null,
        trending: null
      };
    }
  }, []);

  // Загрузка плейлистов при монтировании
  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const value = {
    // Data
    playlists,
    currentPlaylist,
    playlistTracks,
    
    // Loading & Error
    isLoading,
    error,
    
    // Methods
    loadPlaylists,
    loadPlaylistTracks,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    generateRadioFromPlaylist,
    loadSystemPlaylists,
    setCurrentPlaylist
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};

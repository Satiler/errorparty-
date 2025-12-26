import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';

/**
 * Hook для получения списка треков
 */
export const useTracks = (params = {}) => {
  return useQuery({
    queryKey: ['tracks', params],
    queryFn: async () => {
      const response = await apiClient.get('/music/tracks', { params });
      return response.data;
    },
  });
};

/**
 * Hook для получения одного трека
 */
export const useTrack = (id) => {
  return useQuery({
    queryKey: ['track', id],
    queryFn: async () => {
      const response = await apiClient.get(`/music/tracks/${id}`);
      return response.data.track;
    },
    enabled: !!id,
  });
};

/**
 * Hook для поиска треков
 */
export const useTrackSearch = (query) => {
  return useQuery({
    queryKey: ['tracks', 'search', query],
    queryFn: async () => {
      const response = await apiClient.get('/music/tracks/search', {
        params: { q: query, limit: 20 }
      });
      return response.data.tracks || [];
    },
    enabled: !!query && query.trim().length > 0,
  });
};

/**
 * Hook для получения плейлистов пользователя
 */
export const usePlaylists = () => {
  return useQuery({
    queryKey: ['playlists', 'my'],
    queryFn: async () => {
      const response = await apiClient.get('/music/playlists/my');
      return response.data.playlists || [];
    },
  });
};

/**
 * Hook для получения редакционных плейлистов
 */
export const useEditorialPlaylists = () => {
  return useQuery({
    queryKey: ['playlists', 'editorial'],
    queryFn: async () => {
      const response = await apiClient.get('/music/playlists/editorial');
      return response.data.playlists || [];
    },
  });
};

/**
 * Hook для получения одного плейлиста
 */
export const usePlaylist = (id) => {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const response = await apiClient.get(`/music/playlists/${id}`);
      return response.data.playlist;
    },
    enabled: !!id,
  });
};

/**
 * Hook для получения альбомов
 */
export const useAlbums = (params = {}) => {
  return useQuery({
    queryKey: ['albums', params],
    queryFn: async () => {
      const response = await apiClient.get('/music/albums', { params });
      return response.data.albums || [];
    },
  });
};

/**
 * Hook для получения одного альбома
 */
export const useAlbum = (id) => {
  return useQuery({
    queryKey: ['album', id],
    queryFn: async () => {
      const response = await apiClient.get(`/music/albums/${id}`);
      return response.data.album;
    },
    enabled: !!id,
  });
};

/**
 * Hook для получения избранных треков
 */
export const useFavorites = () => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await apiClient.get('/music/favorites');
      return response.data.tracks || [];
    },
  });
};

/**
 * Hook для получения недавно прослушанных треков
 */
export const useRecentTracks = (limit = 50) => {
  return useQuery({
    queryKey: ['recent', limit],
    queryFn: async () => {
      const response = await apiClient.get('/music/history/recent', {
        params: { limit }
      });
      return response.data.tracks || [];
    },
  });
};

/**
 * Hook для лайка трека
 */
export const useLikeTrack = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trackId) => {
      const response = await apiClient.post(`/music/tracks/${trackId}/like`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Добавлено в избранное');
      // Инвалидируем кеш избранного
      queryClient.invalidateQueries(['favorites']);
      queryClient.invalidateQueries(['tracks']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Не удалось добавить в избранное');
    },
  });
};

/**
 * Hook для удаления трека из избранного
 */
export const useUnlikeTrack = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trackId) => {
      const response = await apiClient.delete(`/music/tracks/${trackId}/like`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Удалено из избранного');
      queryClient.invalidateQueries(['favorites']);
      queryClient.invalidateQueries(['tracks']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Не удалось удалить из избранного');
    },
  });
};

/**
 * Hook для создания плейлиста
 */
export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (playlistData) => {
      const response = await apiClient.post('/music/playlists', playlistData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Плейлист создан');
      queryClient.invalidateQueries(['playlists']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Не удалось создать плейлист');
    },
  });
};

/**
 * Hook для добавления трека в плейлист
 */
export const useAddTrackToPlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ playlistId, trackId }) => {
      const response = await apiClient.post(`/music/playlists/${playlistId}/tracks`, {
        trackId
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Трек добавлен в плейлист');
      queryClient.invalidateQueries(['playlist', variables.playlistId]);
      queryClient.invalidateQueries(['playlists']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Не удалось добавить трек');
    },
  });
};

/**
 * Hook для удаления трека из плейлиста
 */
export const useRemoveTrackFromPlaylist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ playlistId, trackId }) => {
      const response = await apiClient.delete(`/music/playlists/${playlistId}/tracks/${trackId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Трек удален из плейлиста');
      queryClient.invalidateQueries(['playlist', variables.playlistId]);
      queryClient.invalidateQueries(['playlists']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Не удалось удалить трек');
    },
  });
};

/**
 * Hook для получения AI рекомендаций
 */
export const useAIRecommendations = (limit = 30) => {
  return useQuery({
    queryKey: ['ai', 'recommendations', limit],
    queryFn: async () => {
      const response = await apiClient.get('/music/ai/recommendations', {
        params: { limit }
      });
      return response.data.recommendations || [];
    },
  });
};

/**
 * Hook для получения треков по настроению
 */
export const useMoodTracks = (mood, limit = 20) => {
  return useQuery({
    queryKey: ['ai', 'mood', mood, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/music/ai/mood/${mood}`, {
        params: { limit }
      });
      return response.data.tracks || [];
    },
    enabled: !!mood,
  });
};

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const MusicLibraryContext = createContext();

export const useMusicLibrary = () => {
  const context = useContext(MusicLibraryContext);
  if (!context) {
    throw new Error('useMusicLibrary must be used within MusicLibraryProvider');
  }
  return context;
};

export const MusicLibraryProvider = ({ children }) => {
  // State для треков и альбомов
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  
  // State для загрузки и ошибок
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State для фильтров и поиска
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    genre: '',
    yearFrom: '',
    yearTo: '',
    durationMin: '',
    durationMax: '',
    onlyVerified: false,
    provider: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  // State для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTracks, setTotalTracks] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Загрузка треков с фильтрами
  const loadTracks = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.genre && { genre: filters.genre }),
        ...(filters.yearFrom && { yearFrom: filters.yearFrom }),
        ...(filters.yearTo && { yearTo: filters.yearTo }),
        ...(filters.durationMin && { durationMin: filters.durationMin }),
        ...(filters.durationMax && { durationMax: filters.durationMax }),
        ...(filters.onlyVerified && { onlyVerified: true }),
        ...(filters.provider && { provider: filters.provider })
      };

      const response = await axios.get('/api/music/tracks', { params });
      
      setTracks(response.data.tracks || []);
      setCurrentPage(response.data.page || 1);
      setTotalPages(response.data.totalPages || 1);
      setTotalTracks(response.data.total || 0);
    } catch (err) {
      console.error('Error loading tracks:', err);
      setError(err.response?.data?.message || 'Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, sortBy, sortOrder, searchQuery, filters]);

  // Расширенный поиск (включая внешние источники)
  const advancedSearch = useCallback(async (query) => {
    if (!query || query.length < 2) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        query,
        ...filters
      };

      const response = await axios.get('/api/music/search/advanced', { params });
      return response.data.results || [];
    } catch (err) {
      console.error('Error in advanced search:', err);
      setError(err.response?.data?.message || 'Search failed');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Получение автодополнения
  const getSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) return [];
    
    try {
      const response = await axios.get('/api/music/search/suggestions', {
        params: { query }
      });
      return response.data.suggestions || [];
    } catch (err) {
      console.error('Error getting suggestions:', err);
      return [];
    }
  }, []);

  // Загрузка альбомов
  const loadAlbums = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/music/albums');
      setAlbums(response.data.albums || []);
    } catch (err) {
      console.error('Error loading albums:', err);
      setError(err.response?.data?.message || 'Failed to load albums');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка жанров
  const loadGenres = useCallback(async () => {
    try {
      const response = await axios.get('/api/music/genres');
      setGenres(response.data.genres || []);
    } catch (err) {
      console.error('Error loading genres:', err);
    }
  }, []);

  // Получение деталей трека
  const getTrackDetails = useCallback(async (trackId) => {
    try {
      const response = await axios.get(`/api/music/tracks/${trackId}`);
      return response.data;
    } catch (err) {
      console.error('Error getting track details:', err);
      throw err;
    }
  }, []);

  // Импорт трека из внешнего источника
  const importTrack = useCallback(async (trackData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/music/search/import', trackData);
      
      // Обновляем локальный список треков
      await loadTracks(currentPage);
      
      return response.data;
    } catch (err) {
      console.error('Error importing track:', err);
      setError(err.response?.data?.message || 'Failed to import track');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, loadTracks]);

  // Обновление фильтров
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Сбрасываем на первую страницу
  }, []);

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    setFilters({
      genre: '',
      yearFrom: '',
      yearTo: '',
      durationMin: '',
      durationMax: '',
      onlyVerified: false,
      provider: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Обновление поиска
  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Обновление сортировки
  const updateSort = useCallback((field, order = 'DESC') => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  // Переход на страницу
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  // Перезагрузка треков при изменении фильтров, поиска, сортировки или страницы
  useEffect(() => {
    loadTracks(currentPage);
  }, [loadTracks, currentPage]);

  const value = {
    // Data
    tracks,
    albums,
    genres,
    
    // Loading & Error
    isLoading,
    error,
    
    // Filters & Search
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    
    // Pagination
    currentPage,
    totalPages,
    totalTracks,
    pageSize,
    
    // Methods
    loadTracks,
    loadAlbums,
    loadGenres,
    advancedSearch,
    getSuggestions,
    getTrackDetails,
    importTrack,
    updateFilters,
    resetFilters,
    updateSearch,
    updateSort,
    goToPage,
    setPageSize
  };

  return (
    <MusicLibraryContext.Provider value={value}>
      {children}
    </MusicLibraryContext.Provider>
  );
};

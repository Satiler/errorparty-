import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TrackRow from '../components/music/TrackRow';
import { LoadingSpinner } from '../components/SkeletonLoader';
import { getApiUrl } from '../utils/apiConfig';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';

const API_URL = getApiUrl();

export default function MyWave() {
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [isWavePlaying, setIsWavePlaying] = useState(false);
  const [dislikedTracks, setDislikedTracks] = useState(new Set());
  
  const observerTarget = useRef(null);
  const loadedTrackIds = useRef(new Set());

  // Загрузка начальной порции
  useEffect(() => {
    loadInitialWave();
  }, []);

  // Бесконечная прокрутка
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadMoreTracks();
        }
      },
      { threshold: 1.0, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadingMore, hasMore]);

  const loadInitialWave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/music/my-wave`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 20 }
      });

      if (response.data.success) {
        const newTracks = response.data.tracks || [];
        newTracks.forEach(t => loadedTrackIds.current.add(t.id));
        
        setTracks(newTracks);
        setStats(response.data.metadata);
        setHasMore(newTracks.length === 20);
      } else {
        setError(response.data.error || 'Не удалось загрузить волну');
      }
    } catch (err) {
      console.error('Error loading wave:', err);
      setError('Ошибка при загрузке волны');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTracks = async () => {
    const token = localStorage.getItem('token');
    if (!token || loadingMore) return;

    try {
      setLoadingMore(true);
      
      const excludeIds = Array.from(loadedTrackIds.current).join(',');
      const response = await axios.get(`${API_URL}/music/my-wave`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          size: 20,
          exclude: excludeIds
        }
      });

      if (response.data.success) {
        const newTracks = response.data.tracks || [];
        
        // Фильтруем дубликаты
        const uniqueNewTracks = newTracks.filter(t => !loadedTrackIds.current.has(t.id));
        uniqueNewTracks.forEach(t => loadedTrackIds.current.add(t.id));
        
        setTracks(prev => [...prev, ...uniqueNewTracks]);
        setHasMore(uniqueNewTracks.length > 0);
        
        // Обновляем статистику
        if (response.data.metadata) {
          setStats(prev => ({
            familiar: (prev?.familiar || 0) + (response.data.metadata.familiar || 0),
            similar: (prev?.similar || 0) + (response.data.metadata.similar || 0),
            discovery: (prev?.discovery || 0) + (response.data.metadata.discovery || 0),
            trending: (prev?.trending || 0) + (response.data.metadata.trending || 0)
          }));
        }
      }
    } catch (err) {
      console.error('Error loading more tracks:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshWave = () => {
    loadedTrackIds.current.clear();
    setTracks([]);
    setHasMore(true);
    setDislikedTracks(new Set());
    loadInitialWave();
  };

  const startWave = () => {
    if (tracks.length > 0) {
      const firstTrack = tracks[0];
      playTrack(firstTrack, 0, tracks);
      setIsWavePlaying(true);
    }
  };

  const dislikeTrack = async (trackId) => {
    // Добавляем в список дизлайкнутых
    setDislikedTracks(prev => new Set([...prev, trackId]));
    
    // Убираем из текущего списка
    setTracks(prev => prev.filter(t => t.id !== trackId));
    
    // TODO: Отправить дизлайк на backend для будущих рекомендаций
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.post(`${API_URL}/music/my-wave/dislike`, 
          { trackId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Error disliking track:', err);
      }
    }
  };

  // Проверяем, играет ли трек из волны
  useEffect(() => {
    if (currentTrack && tracks.some(t => t.id === currentTrack.id)) {
      setIsWavePlaying(isPlaying);
    }
  }, [currentTrack, isPlaying, tracks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Большой баннер "Моя волна" в стиле Яндекс.Музыки */}
      <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-1">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 animate-pulse"></div>
        
        <div className="relative bg-gray-900/90 backdrop-blur-sm rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Иконка волны */}
            <div className="flex-shrink-0 w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center shadow-2xl">
              <svg className="w-16 h-16 md:w-24 md:h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>

            {/* Информация */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Моя волна
              </h1>
              <p className="text-lg text-gray-300 mb-6">
                Бесконечный поток музыки, подобранный специально для вас
              </p>

              {/* Кнопки управления */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <button
                  onClick={startWave}
                  disabled={tracks.length === 0}
                  className="px-8 py-4 bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-3"
                >
                  {isWavePlaying ? (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                      Пауза
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      {tracks.length === 0 ? 'Загрузка...' : 'Запустить волну'}
                    </>
                  )}
                </button>

                <button
                  onClick={refreshWave}
                  className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors flex items-center gap-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Обновить
                </button>
              </div>

              {/* Счетчик треков */}
              {tracks.length > 0 && (
                <div className="mt-4 text-gray-400 text-sm">
                  {tracks.length} {tracks.length === 1 ? 'трек' : 'треков'} в волне
                </div>
              )}
            </div>
          </div>

          {/* Статистика волны */}
          {stats && !stats.fallback && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-1">Знакомые</div>
                <div className="text-green-400 text-2xl font-bold">{stats.familiar || 0}</div>
                <div className="text-gray-500 text-xs mt-1">От любимых</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-1">Похожие</div>
                <div className="text-blue-400 text-2xl font-bold">{stats.similar || 0}</div>
                <div className="text-gray-500 text-xs mt-1">По вкусу</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-1">Открытия</div>
                <div className="text-purple-400 text-2xl font-bold">{stats.discovery || 0}</div>
                <div className="text-gray-500 text-xs mt-1">Новое</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-sm mb-1">Тренды</div>
                <div className="text-yellow-400 text-2xl font-bold">{stats.trending || 0}</div>
                <div className="text-gray-500 text-xs mt-1">Популярное</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Предупреждение о недостаточных данных */}
      {stats?.fallback && (
        <div className="mb-8 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-yellow-400 font-semibold text-lg mb-2">Недостаточно данных для персональных рекомендаций</div>
              <div className="text-gray-300 text-sm">
                Слушайте музыку, ставьте лайки и создавайте плейлисты — это поможет нам лучше понять ваш вкус и составить идеальную волну.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список треков */}
      {error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-2xl p-6 text-red-400 backdrop-blur">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      ) : tracks.length === 0 ? (
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-12 text-center border border-gray-700/50">
          <svg className="w-20 h-20 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-xl text-white mb-3 font-medium">Нет доступных треков</p>
          <p className="text-gray-400">Послушайте немного музыки, чтобы мы могли подобрать волну для вас</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900/50 backdrop-blur rounded-2xl overflow-hidden border border-gray-800">
            {tracks.map((track, index) => (
              <div key={`${track.id}-${index}`} className="relative group">
                <TrackRow 
                  track={track}
                  index={index}
                  tracks={tracks}
                  showAlbum={true}
                  showAddedDate={false}
                />
                
                {/* Кнопка "Не нравится" при наведении */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dislikeTrack(track.id);
                    }}
                    className="p-2 bg-gray-800 hover:bg-red-600 rounded-full transition-colors text-gray-400 hover:text-white"
                    title="Не рекомендовать больше"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Индикатор загрузки следующей порции */}
          <div ref={observerTarget} className="py-8 flex justify-center">
            {loadingMore ? (
              <div className="flex items-center gap-3 text-gray-400">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Подбираем следующие треки...</span>
              </div>
            ) : hasMore ? (
              <div className="text-gray-500 text-sm bg-gray-800/30 px-4 py-2 rounded-full">
                Прокрутите вниз, чтобы загрузить ещё
              </div>
            ) : (
              <button
                onClick={refreshWave}
                className="text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить волну
              </button>
            )}
          </div>
        </>
      )}

      {/* Информационный блок */}
      <div className="mt-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-8 border border-gray-700/50">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-xl mb-2">Как работает Моя волна?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Алгоритм анализирует вашу историю прослушиваний и лайки, чтобы создать идеальный микс из знакомых и новых треков.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-medium">30% — Знакомые</span>
            </div>
            <p className="text-gray-400 text-sm">Треки от ваших любимых исполнителей</p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-blue-400 font-medium">40% — Похожие</span>
            </div>
            <p className="text-gray-400 text-sm">Музыка в жанрах, которые вы слушаете</p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-purple-400 font-medium">20% — Открытия</span>
            </div>
            <p className="text-gray-400 text-sm">Новые исполнители в знакомых жанрах</p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400 font-medium">10% — Тренды</span>
            </div>
            <p className="text-gray-400 text-sm">Популярные треки и хиты</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Чем больше вы слушаете и ставите лайки, тем точнее становятся рекомендации
          </div>
        </div>
      </div>
    </div>
  );
}

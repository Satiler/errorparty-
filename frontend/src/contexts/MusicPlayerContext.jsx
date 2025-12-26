import { createContext, useContext, useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import axios from 'axios';
import { getApiUrl, getApiEndpoint } from '../utils/apiConfig';

const MusicPlayerContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
};

export const MusicPlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.05);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Моя волна
  const [isMyWaveMode, setIsMyWaveMode] = useState(false);
  const [waveExcludedIds, setWaveExcludedIds] = useState([]);
  const [isLoadingWave, setIsLoadingWave] = useState(false);
  
  // Защита от повторных попыток сломанных треков
  const failedTracksRef = useRef(new Set());
  
  // Защита от одновременной загрузки треков
  const isLoadingTrackRef = useRef(false);
  
  const audioRef = useRef(null);
  const hlsRef = useRef(null);

  // Инициализация audio элемента
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, []);

  // Отдельный useEffect для handleEnded чтобы обновлять слушатель при изменении queue и repeat
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [queue, currentIndex, repeat, shuffle]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (queue.length > 0) {
      // В режиме волны проверяем нужно ли подгрузить треки
      if (isMyWaveMode && currentIndex >= queue.length - 3 && !isLoadingWave) {
        loadMoreWaveTracks();
      }
      // Автоматически переключаемся на следующий трек
      playNext();
    } else {
      // Если очереди нет, просто останавливаемся
      setIsPlaying(false);
    }
  };

  // Воспроизведение трека
  const playTrack = async (track, newQueue = []) => {
    if (!track?.id) {
      console.error('Track has no ID:', track);
      return;
    }
    
    // Защита от одновременной загрузки треков
    if (isLoadingTrackRef.current) {
      console.warn('⏸️ Already loading a track, skipping...');
      return;
    }
    
    // Защита от повторных попыток сломанных треков
    if (failedTracksRef.current.has(track.id)) {
      console.warn(`⏭️ Track ${track.id} previously failed, was already skipped`);
      // playNext() теперь автоматически пропускает failed треки
      return;
    }

    // Если трек уже играет, просто toggle паузу
    if (currentTrack?.id === track.id && audioRef.current?.src) {
      togglePlayPause();
      return;
    }

    try {
      isLoadingTrackRef.current = true;
      setCurrentTrack(track);
      
      // Обновляем очередь если передана
      if (newQueue.length > 0) {
        // Если новая очередь не из волны, выходим из режима волны
        // Проверяем только если уже есть треки в текущей очереди
        if (queue.length > 0 && !isMyWaveMode) {
          stopMyWave();
        }
        setQueue(newQueue);
        const index = newQueue.findIndex(t => t.id === track.id);
        setCurrentIndex(index !== -1 ? index : 0);
      }

      // Очищаем предыдущий HLS instance если был
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Проверяем, является ли URL HLS потоком
      // Backend сохраняет оригинальный URL в _originalStreamUrl
      // VK Audio треки всегда HLS (m3u8)
      const originalUrl = track._originalStreamUrl || track.streamUrl;
      const isHLS = originalUrl && (
        originalUrl.includes('.m3u8') || 
        originalUrl.includes('m3u8') ||
        originalUrl.includes('vkuseraudio.net')  // VK Audio всегда HLS
      );

      // Для всех треков используем прокси /api/music/tracks/:id/stream
      // Backend автоматически определит тип и вернет правильный контент
      const streamUrl = getApiEndpoint(`/music/tracks/${track.id}/stream`);

      if (isHLS && Hls.isSupported()) {
        // Используем HLS.js для HLS потоков через прокси
        console.log('🎵 Using HLS.js for streaming');
        console.log('Stream URL:', streamUrl);
        
        // Убедимся, что audio готов к новому источнику
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        hlsRef.current = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,  // 60MB
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeMaxRetry: 5,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 4,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false;
            xhr.timeout = 20000;
          },
        });

        // Обработчик завершения манифеста - безопасное воспроизведение
        const onManifestParsed = async () => {
          console.log('✅ HLS manifest parsed successfully');
          if (!audioRef.current || !hlsRef.current) return;
          
          try {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              await playPromise;
              setIsPlaying(true);
              isLoadingTrackRef.current = false; // Снимаем блокировку после успешного запуска
            } else {
              setIsPlaying(true);
              isLoadingTrackRef.current = false;
            }
          } catch (err) {
            console.error('❌ HLS play error:', err.message);
            setIsPlaying(false);
            isLoadingTrackRef.current = false; // Снимаем блокировку при ошибке
            // Пропускаем на следующий трек
            if (queue.length > 0) {
              setTimeout(() => playNext(), 1000);
            }
          }
        };

        // Обработчик ошибок с восстановлением
        const onHlsError = (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('🔄 Network error, attempting recovery...');
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('🔄 Media error, attempting recovery...');
                if (hlsRef.current) {
                  hlsRef.current.recoverMediaError();
                }
                break;
              default:
                console.error('❌ Fatal HLS error:', data.type);
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
                // Пропускаем на следующий трек
                if (queue.length > 0) {
                  setTimeout(() => playNext(), 500);
                }
                break;
            }
          } else {
            // Non-fatal ошибки - пробуем восстановить
            console.warn('⚠️ HLS Error (non-fatal):', data.type, data.details);
            
            // Для ошибок буферизации пробуем перезапустить загрузку
            if (data.details === 'bufferStalledError' && hlsRef.current) {
              console.log('🔄 Recovering from buffer stall...');
              hlsRef.current.startLoad();
            }
            
            // Для ошибок буфера пробуем восстановить медиа
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && hlsRef.current) {
              console.log('🔄 Attempting media error recovery...');
              hlsRef.current.recoverMediaError();
            }
          }
        };

        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hlsRef.current.on(Hls.Events.ERROR, onHlsError);

        try {
          hlsRef.current.loadSource(streamUrl);
          hlsRef.current.attachMedia(audioRef.current);
        } catch (err) {
          console.error('❌ HLS initialization error:', err);
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          // Fallback - пропускаем трек
          if (queue.length > 0) {
            setTimeout(() => playNext(), 500);
          }
        }
      } else if (isHLS && audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('🎵 Using native HLS support (Safari)');
        audioRef.current.src = streamUrl;
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        // Обычный MP3/audio поток
        console.log('🎵 Using standard audio playback');
        console.log('Track data:', { id: track.id, title: track.title, streamUrl: track.streamUrl });
        console.log('Resolved stream URL:', streamUrl);
        console.log('Current audio.src:', audioRef.current.src);
        if (audioRef.current.src !== streamUrl) {
          audioRef.current.src = streamUrl;
          console.log('Set audio.src to:', streamUrl);
        }
        console.log('Final audio.src:', audioRef.current.src);
        await audioRef.current.play();
        setIsPlaying(true);
      }
      
      // Успешная загрузка - снимаем блокировку
      isLoadingTrackRef.current = false;
    } catch (error) {
      // Снимаем блокировку при ошибке
      isLoadingTrackRef.current = false;
      
      console.error('❌ Error playing track:', error);
      console.error('❌ Failed track:', { 
        id: track?.id, 
        title: track?.title, 
        artist: track?.artist,
        streamUrl: track?.streamUrl,
        _originalStreamUrl: track?._originalStreamUrl
      });
      
      // Добавляем трек в список неудачных
      if (track?.id) {
        failedTracksRef.current.add(track.id);
        console.warn(`🚫 Track ${track.id} marked as failed`);
      }
      
      // Автопропуск неподдерживаемых источников
      const msg = String(error && (error.message || error));
      const isNotSupported = msg.includes('NotSupportedError') || msg.includes('no supported source');
      const isAbort = msg.includes('AbortError');
      const isNetworkError = msg.includes('NetworkError') || msg.includes('fetch');
      
      // Если это ошибка неподдерживаемого источника и есть очередь - пропускаем
      if ((isNotSupported || isAbort || isNetworkError) && queue.length > 1 && currentIndex < queue.length - 1) {
        console.warn(`⏭️ Skipping track "${track?.artist} - ${track?.title}" due to playback error, trying next...`);
        // Задержка перед следующим треком чтобы не спамить
        setTimeout(() => {
          playNext();
        }, 500);
      } else {
        console.error('❌ Cannot play track and no more tracks in queue');
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    }
  };

  // Toggle воспроизведения
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Следующий трек
  const playNext = () => {
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }

    // Ищем следующий трек, который НЕ в failedTracksRef
    let attempts = 0;
    let nextIndex = currentIndex;
    let nextTrack = null;

    while (attempts < queue.length) {
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else {
        nextIndex = (nextIndex + 1) % queue.length;
      }

      const candidate = queue[nextIndex];
      
      // Если трек НЕ в списке failed, используем его
      if (candidate && !failedTracksRef.current.has(candidate.id)) {
        nextTrack = candidate;
        break;
      }
      
      attempts++;
    }

    // Если все треки failed, выходим
    if (!nextTrack) {
      console.warn('⚠️ All tracks in queue have failed, stopping playback');
      setIsPlaying(false);
      return;
    }
    
    setCurrentIndex(nextIndex);
    // НЕ передаем queue второй раз, чтобы не пересчитывать индекс
    playTrack(nextTrack, []);
  };

  // Предыдущий трек
  const playPrevious = () => {
    if (queue.length === 0) return;

    let prevIndex;
    if (currentIndex === 0) {
      prevIndex = queue.length - 1;
    } else {
      prevIndex = currentIndex - 1;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      setCurrentIndex(prevIndex);
      // НЕ передаем queue второй раз, чтобы не пересчитывать индекс
      playTrack(prevTrack, []);
    }
  };

  // Перемотка
  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  // Изменение громкости
  const changeVolume = (newVolume) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume > 0) {
        setIsMuted(false);
      }
    }
  };

  // Mute/unmute
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    setShuffle(!shuffle);
  };

  // Toggle repeat
  const toggleRepeat = () => {
    setRepeat(!repeat);
  };

  // Запуск "Моя волна"
  const playMyWave = async () => {
    try {
      setIsLoadingWave(true);
      setIsMyWaveMode(true);
      setWaveExcludedIds([]);

      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl()}/music/my-wave`, {
        params: { size: 10 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const waveTracks = response.data.tracks || [];
      
      if (waveTracks.length > 0) {
        setQueue(waveTracks);
        setWaveExcludedIds(waveTracks.map(t => t.id));
        await playTrack(waveTracks[0], waveTracks);
      }
    } catch (error) {
      console.error('Ошибка загрузки волны:', error);
    } finally {
      setIsLoadingWave(false);
    }
  };

  // Подгрузка новых треков волны
  const loadMoreWaveTracks = async () => {
    if (isLoadingWave) return;

    try {
      setIsLoadingWave(true);

      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl()}/music/my-wave`, {
        params: { 
          size: 10,
          exclude: waveExcludedIds.join(',')
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const newTracks = response.data.tracks || [];
      
      if (newTracks.length > 0) {
        const newExcluded = [...waveExcludedIds, ...newTracks.map(t => t.id)];
        setWaveExcludedIds(newExcluded);
        setQueue(prev => [...prev, ...newTracks]);
        console.log(`🌊 Подгружено ${newTracks.length} новых треков волны`);
      }
    } catch (error) {
      console.error('Ошибка подгрузки треков волны:', error);
    } finally {
      setIsLoadingWave(false);
    }
  };

  // Выход из режима волны
  const stopMyWave = () => {
    setIsMyWaveMode(false);
    setWaveExcludedIds([]);
  };

  const value = {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    isMyWaveMode,
    playTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    playMyWave,
    stopMyWave
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

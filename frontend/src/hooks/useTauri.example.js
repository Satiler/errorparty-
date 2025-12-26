// Пример интеграции Tauri с MusicPlayer компонентом
// Добавить этот код в ваш существующий музыкальный плеер

import React, { useRef, useEffect } from 'react';
import { useTauriMediaKeys, useTauriNotifications, isTauriApp } from '@/hooks/useTauri';

function MusicPlayer() {
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { showNotification } = useTauriNotifications();
  
  // ✅ 1. Подключить обработку медиа-клавиш
  useTauriMediaKeys(audioRef);
  
  // ✅ 2. Обработать Next/Prev треки
  useEffect(() => {
    const handleNext = () => {
      if (currentIndex < playlist.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };
    
    const handlePrev = () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    };
    
    window.addEventListener('tauri-next-track', handleNext);
    window.addEventListener('tauri-prev-track', handlePrev);
    
    return () => {
      window.removeEventListener('tauri-next-track', handleNext);
      window.removeEventListener('tauri-prev-track', handlePrev);
    };
  }, [currentIndex, playlist]);
  
  // ✅ 3. Показать уведомление при смене трека
  useEffect(() => {
    if (!currentTrack) return;
    
    // Показывать уведомления только в desktop приложении
    if (isTauriApp()) {
      showNotification(
        '🎵 Сейчас играет',
        `${currentTrack.artist} - ${currentTrack.title}`,
        currentTrack.coverUrl
      );
    }
  }, [currentTrack?.id]);
  
  // ✅ 4. Обновить трек при изменении индекса
  useEffect(() => {
    if (playlist[currentIndex]) {
      setCurrentTrack(playlist[currentIndex]);
    }
  }, [currentIndex, playlist]);
  
  return (
    <div className="music-player">
      {/* Ваш существующий UI */}
      
      {/* Audio элемент - ВАЖНО: используйте ref! */}
      <audio
        ref={audioRef}
        src={currentTrack?.streamUrl}
        autoPlay
        onEnded={() => {
          // Автоматически следующий трек
          window.dispatchEvent(new CustomEvent('tauri-next-track'));
        }}
      />
      
      {/* Desktop App индикатор (опционально) */}
      {isTauriApp() && (
        <div className="desktop-badge">
          🖥️ Desktop
        </div>
      )}
    </div>
  );
}

export default MusicPlayer;


// ═══════════════════════════════════════════════════════════
// ВАРИАНТ 2: Минимальная интеграция (если уже есть плеер)
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useTauriMediaKeys } from '@/hooks/useTauri';

function ExistingMusicPlayer() {
  const audioRef = useRef(null); // Ваш существующий ref
  
  // Просто добавьте эту одну строку:
  useTauriMediaKeys(audioRef);
  
  // Всё! Медиа-клавиши теперь работают ✅
  
  return (
    // ... ваш существующий код
  );
}


// ═══════════════════════════════════════════════════════════
// ВАРИАНТ 3: Context API интеграция
// ═══════════════════════════════════════════════════════════

// MusicContext.jsx
import { createContext, useContext, useRef, useState } from 'react';
import { useTauriMediaKeys, useTauriNotifications } from '@/hooks/useTauri';

const MusicContext = createContext();

export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const { showNotification } = useTauriNotifications();
  
  // Подключить Tauri
  useTauriMediaKeys(audioRef);
  
  // Уведомления
  useEffect(() => {
    if (currentTrack) {
      showNotification(
        'Сейчас играет',
        `${currentTrack.artist} - ${currentTrack.title}`
      );
    }
  }, [currentTrack?.id]);
  
  const value = {
    audioRef,
    currentTrack,
    setCurrentTrack,
    // ... остальные методы
  };
  
  return (
    <MusicContext.Provider value={value}>
      <audio ref={audioRef} />
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => useContext(MusicContext);


// ═══════════════════════════════════════════════════════════
// ТЕСТИРОВАНИЕ
// ═══════════════════════════════════════════════════════════

// Запустить в dev режиме:
// npm run tauri:dev

// Проверить:
// 1. ⏯️  Нажать MediaPlayPause на клавиатуре
//    → Должен play/pause трек
//
// 2. ⏭️  Нажать MediaTrackNext
//    → Должен переключиться на следующий трек
//
// 3. ⏮️  Нажать MediaTrackPrevious
//    → Должен переключиться на предыдущий трек
//
// 4. 🔔 При смене трека
//    → Должно появиться Windows уведомление
//
// 5. 🖱️  Кликнуть на иконку в трее
//    → Меню с Play/Pause/Next/Prev
//
// 6. ❌ Закрыть окно
//    → Должно свернуться в трей (не закрыться полностью)

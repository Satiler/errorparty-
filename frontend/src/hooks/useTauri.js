import { useEffect } from 'react';

/**
 * Хук для обработки системных медиа-событий от Tauri
 * Поддерживает глобальные медиа-клавиши и системный трей
 */
export function useTauriMediaKeys(audioRef) {
  useEffect(() => {
    // Проверяем, запущено ли приложение в Tauri
    if (typeof window.__TAURI__ === 'undefined') {
      return;
    }

    const { event } = window.__TAURI__;

    // Подписываемся на события от системного трея и глобальных хоткеев
    const unlisten = event.listen('media-key', (event) => {
      const action = event.payload;
      
      if (!audioRef?.current) return;

      switch (action) {
        case 'play-pause':
          if (audioRef.current.paused) {
            audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
          break;
        
        case 'next':
          // Событие будет обработано родительским компонентом
          window.dispatchEvent(new CustomEvent('tauri-next-track'));
          break;
        
        case 'prev':
          // Событие будет обработано родительским компонентом
          window.dispatchEvent(new CustomEvent('tauri-prev-track'));
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [audioRef]);
}

/**
 * Хук для Tauri-специфичных уведомлений
 */
export function useTauriNotifications() {
  const showNotification = async (title, body, icon = null) => {
    if (typeof window.__TAURI__ === 'undefined') {
      // Fallback на браузерные уведомления
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon });
      }
      return;
    }

    const { notification } = window.__TAURI__;
    
    await notification.sendNotification({
      title,
      body,
      icon: icon || 'Default'
    });
  };

  return { showNotification };
}

/**
 * Определяет, запущено ли приложение в Tauri
 */
export function isTauriApp() {
  return typeof window.__TAURI__ !== 'undefined';
}

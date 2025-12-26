/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'errorparty-music-v2';
const RUNTIME_CACHE = 'errorparty-runtime-v2';
const MUSIC_CACHE = 'errorparty-music-cache-v2';

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/music',
  '/music/library',
  '/music/playlists',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && 
                     name !== RUNTIME_CACHE && 
                     name !== MUSIC_CACHE;
            })
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except music streams)
  if (url.origin !== self.location.origin && 
      !url.pathname.includes('/stream') &&
      !url.pathname.includes('.m3u8')) {
    return;
  }

  // Music streaming strategy - Network first, then cache
  if (url.pathname.includes('/api/music/tracks/') && url.pathname.includes('/stream')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();
          
          caches.open(MUSIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving cached music:', url.pathname);
                return cachedResponse;
              }
              // Return offline page if no cache
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // API requests - Network first, then cache
  // НЕ кэшируем запросы данных треков/плейлистов (только streaming)
  if (url.pathname.startsWith('/api/')) {
    // Исключаем из кэша: /api/music/tracks/{id} (данные треков), /api/music/playlists/{id} (данные плейлистов)
    const skipCache = url.pathname.match(/\/api\/music\/(tracks|playlists)\/\d+$/);
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кэшируем только если это не данные треков/плейлистов
          if (response.ok && !skipCache) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Пропускаем кэш для данных треков/плейлистов
          if (skipCache) {
            throw new Error('Network unavailable');
          }
          // Try to serve from cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving cached API response');
                return cachedResponse;
              }
              throw new Error('No cache available');
            });
        })
    );
    return;
  }

  // Static assets - Cache first, then network
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving cached asset:', url.pathname);
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // HTML pages - Network first, then cache
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear all caches
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }

  // Clear music cache only
  if (event.data && event.data.type === 'CLEAR_MUSIC_CACHE') {
    event.waitUntil(
      caches.delete(MUSIC_CACHE)
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-listening-history') {
    event.waitUntil(syncListeningHistory());
  }
});

// Sync listening history when back online
async function syncListeningHistory() {
  try {
    // Get pending history from IndexedDB or localStorage
    const pendingHistory = await getPendingHistory();
    
    if (pendingHistory.length > 0) {
      const response = await fetch('/api/music/history/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history: pendingHistory })
      });
      
      if (response.ok) {
        await clearPendingHistory();
        console.log('[Service Worker] Synced listening history');
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to sync history:', error);
  }
}

async function getPendingHistory() {
  // Implement IndexedDB/localStorage read
  return [];
}

async function clearPendingHistory() {
  // Implement IndexedDB/localStorage clear
}

console.log('[Service Worker] Loaded');

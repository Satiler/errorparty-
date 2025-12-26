import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './utils/pwaHelper'

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 минут - данные считаются свежими
      cacheTime: 10 * 60 * 1000,     // 10 минут - кеш хранится в памяти
      retry: 1,                       // 1 повтор при ошибке
      refetchOnWindowFocus: false,    // Не обновлять при фокусе окна
      refetchOnReconnect: true,       // Обновить при восстановлении соединения
    },
    mutations: {
      retry: 0,                       // Не повторять мутации при ошибке
    }
  }
})

// Register Service Worker for PWA (только в браузере, не в Tauri)
if ('serviceWorker' in navigator && !window.__TAURI__) {
  window.addEventListener('load', () => {
    registerServiceWorker()
      .then(() => console.log('✅ PWA ready'))
      .catch(err => console.error('❌ SW registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

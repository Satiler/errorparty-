/**
 * Конфигурация для интеграции с мировыми музыкальными чартами
 * Поддержка: Spotify Charts, Apple Music Top, Billboard, Shazam
 */

module.exports = {
  // Настройки обновления
  updateSchedule: {
    enabled: true,
    cronExpression: '0 3 * * *', // Ежедневно в 3 утра
    timezone: 'Europe/Moscow'
  },

  // Spotify Charts API
  spotify: {
    enabled: true,
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    endpoints: {
      globalTop50: 'https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF',
      globalViral50: 'https://api.spotify.com/v1/playlists/37i9dQZEVXbLiRSasKsNU9',
      charts: 'https://api.spotify.com/v1/browse/featured-playlists'
    },
    regions: ['global', 'us', 'ru', 'gb'],
    maxTracks: 100
  },

  // Apple Music API
  appleMusic: {
    enabled: true,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    endpoints: {
      charts: 'https://api.music.apple.com/v1/catalog/{storefront}/charts',
      search: 'https://api.music.apple.com/v1/catalog/{storefront}/search'
    },
    storefronts: ['us', 'ru', 'gb'],
    chartTypes: ['songs', 'albums'],
    maxTracks: 100
  },

  // Billboard (web scraping)
  billboard: {
    enabled: true,
    baseUrl: 'https://www.billboard.com',
    charts: [
      { name: 'hot-100', url: '/charts/hot-100' },
      { name: 'billboard-200', url: '/charts/billboard-200' },
      { name: 'global-200', url: '/charts/billboard-global-200' },
      { name: 'streaming-songs', url: '/charts/streaming-songs' }
    ],
    maxTracks: 100,
    requestDelay: 2000 // Задержка между запросами (мс)
  },

  // Shazam API
  shazam: {
    enabled: true,
    apiKey: process.env.SHAZAM_API_KEY,
    endpoints: {
      topTracks: 'https://shazam.p.rapidapi.com/charts/track',
      search: 'https://shazam.p.rapidapi.com/search'
    },
    regions: ['world', 'US', 'RU', 'GB'],
    maxTracks: 100
  },

  // Настройки алгоритма актуализации
  playlistUpdate: {
    // Веса источников при формировании рейтинга
    sourceWeights: {
      spotify: 0.30,
      appleMusic: 0.25,
      billboard: 0.25,
      shazam: 0.20
    },
    
    // Минимальный балл для добавления трека
    minScoreThreshold: 0.6,
    
    // Максимальное количество треков в плейлисте
    maxPlaylistSize: 100,
    
    // Процент обновления за раз (для плавной актуализации)
    updatePercentage: 0.15, // 15% треков могут быть заменены
    
    // Время жизни трека в плейлисте (дни)
    trackTTL: 30,
    
    // Требуется модерация для изменений
    requireModeration: true,
    
    // Автоматическое применение изменений (если moderation=false)
    autoApply: false
  },

  // Логирование
  logging: {
    enabled: true,
    logFile: 'logs/playlist-updates.log',
    logLevel: 'info', // debug, info, warn, error
    logChanges: true,
    notifyAdmins: true
  },

  // Кэширование
  cache: {
    enabled: true,
    ttl: 3600, // 1 час
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 2
    }
  },

  // Плейлисты для автоматического обновления
  managedPlaylists: [
    {
      id: 'global-top-100',
      name: 'Глобальный топ-100',
      sources: ['spotify', 'appleMusic', 'billboard', 'shazam'],
      updateFrequency: 'daily',
      genre: null // все жанры
    },
    {
      id: 'trending-now',
      name: 'Сейчас в тренде',
      sources: ['shazam', 'spotify'],
      updateFrequency: 'daily',
      genre: null
    },
    {
      id: 'new-releases',
      name: 'Новые релизы',
      sources: ['spotify', 'appleMusic'],
      updateFrequency: 'daily',
      genre: null
    },
    {
      id: 'viral-hits',
      name: 'Вирусные хиты',
      sources: ['spotify', 'shazam'],
      updateFrequency: 'daily',
      genre: null
    }
  ]
};

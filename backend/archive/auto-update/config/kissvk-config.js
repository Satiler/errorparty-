/**
 * Конфигурация для автоматической интеграции с kissvk
 * Импорт новых релизов и треков
 */

module.exports = {
  // Основные настройки
  baseUrl: 'https://kissvk.com',
  apiUrl: process.env.KISSVK_API_URL || 'https://kissvk.com/api',
  
  // Расписание обновлений
  updateSchedule: {
    enabled: true,
    cronExpression: '0 4 * * *', // Ежедневно в 4 утра
    timezone: 'Europe/Moscow'
  },

  // Категории для импорта
  importCategories: {
    newReleases: {
      enabled: true,
      url: '/new-releases',
      maxItems: 50,
      frequency: 'daily'
    },
    topCharts: {
      enabled: true,
      url: '/charts',
      maxItems: 100,
      frequency: 'daily'
    },
    albums: {
      enabled: true,
      url: '/albums',
      maxItems: 30,
      frequency: 'daily'
    },
    artists: {
      enabled: false, // Импорт по конкретным артистам
      watchList: [], // Список артистов для отслеживания
      frequency: 'daily'
    }
  },

  // Настройки парсинга
  scraping: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 5000,
    concurrency: 3, // Одновременных запросов
    requestDelay: 2000 // Задержка между запросами
  },

  // Фильтры качества
  qualityFilters: {
    minBitrate: 128, // kbps
    preferredFormats: ['mp3', 'aac'],
    minDuration: 60, // секунд
    maxDuration: 600 // секунд (10 минут)
  },

  // Обработка метаданных
  metadata: {
    extractFromTags: true,
    useFilename: true,
    validateArtist: true,
    validateTitle: true,
    downloadCovers: true,
    coverMaxSize: 1024 // KB
  },

  // Хранилище
  storage: {
    localPath: process.env.MUSIC_STORAGE_PATH || 'd:/МОЙ САЙТ/uploads/music',
    cdnUrl: process.env.CDN_URL || 'https://yourdomain.com/uploads/music',
    organizeByArtist: true,
    organizeByAlbum: true,
    filenamePattern: '{artist} - {title}',
    maxFileSize: 20 * 1024 * 1024 // 20 MB
  },

  // База данных
  database: {
    checkDuplicates: true,
    updateExisting: false, // Обновлять существующие треки
    createAlbums: true,
    linkArtists: true,
    autoGenreDetection: true
  },

  // Дедупликация
  deduplication: {
    enabled: true,
    matchThreshold: 0.85, // Порог схожести (0-1)
    compareFields: ['title', 'artist', 'duration'],
    fuzzyMatch: true
  },

  // Уведомления
  notifications: {
    enabled: true,
    notifyOnNewReleases: true,
    notifyOnErrors: true,
    emailRecipients: ['admin@yourdomain.com'],
    telegramChatId: process.env.TELEGRAM_CHAT_ID
  },

  // Лимиты и безопасность
  limits: {
    maxDailyImports: 200,
    maxConcurrentDownloads: 5,
    bandwidthLimit: 500 * 1024 * 1024, // 500 MB в день
    rateLimitPerHour: 100
  },

  // Логирование
  logging: {
    enabled: true,
    logFile: 'logs/kissvk-imports.log',
    logLevel: 'info',
    logDownloads: true,
    logErrors: true
  },

  // Прокси (опционально)
  proxy: {
    enabled: false,
    host: process.env.PROXY_HOST,
    port: process.env.PROXY_PORT,
    auth: {
      username: process.env.PROXY_USER,
      password: process.env.PROXY_PASS
    }
  },

  // Отслеживание артистов (для уведомлений)
  artistTracking: {
    enabled: true,
    checkFrequency: 'daily',
    notifyUsers: true,
    // Список будет загружаться из БД
    watchedArtists: []
  }
};

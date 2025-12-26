/**
 * Music Middleware
 * Multer для загрузки треков и обложек
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Разрешённые аудио форматы
const ALLOWED_AUDIO_FORMATS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg'];
const ALLOWED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];

// Максимальный размер файлов
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB

/**
 * Storage для треков
 */
const trackStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/music');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `track-${uniqueSuffix}${ext}`);
  }
});

/**
 * Storage для обложек
 */
const coverStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/covers');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cover-${uniqueSuffix}${ext}`);
  }
});

/**
 * Фильтр для аудио файлов
 */
const audioFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_AUDIO_FORMATS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый формат аудио. Разрешены: ${ALLOWED_AUDIO_FORMATS.join(', ')}`), false);
  }
};

/**
 * Фильтр для изображений
 */
const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_FORMATS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый формат изображения. Разрешены: ${ALLOWED_IMAGE_FORMATS.join(', ')}`), false);
  }
};

/**
 * Комбинированный фильтр для загрузки трека с обложкой
 */
const trackWithCoverFilter = (req, file, cb) => {
  if (file.fieldname === 'track') {
    return audioFilter(req, file, cb);
  } else if (file.fieldname === 'cover') {
    return imageFilter(req, file, cb);
  } else {
    cb(new Error(`Неизвестное поле: ${file.fieldname}`), false);
  }
};

/**
 * Multer для загрузки треков
 */
const uploadTrack = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadPath = file.fieldname === 'cover' 
        ? path.join(__dirname, '../../../uploads/covers')
        : path.join(__dirname, '../../../uploads/music');
      try {
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const prefix = file.fieldname === 'cover' ? 'cover-' : 'track-';
      cb(null, `${prefix}${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: trackWithCoverFilter,
  limits: {
    fileSize: MAX_AUDIO_SIZE
  }
}).fields([
  { name: 'track', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

/**
 * Multer для загрузки обложек
 */
const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE
  }
});

module.exports = {
  uploadTrack,
  uploadCover,
  ALLOWED_AUDIO_FORMATS,
  ALLOWED_IMAGE_FORMATS
};

/**
 * Music Upload Middleware
 * Загрузка музыки и обложек альбомов
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directories
const musicDir = path.join(__dirname, '../../uploads/music');
const coversDir = path.join(__dirname, '../../uploads/covers');

// Create directories if they don't exist
[musicDir, coversDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage for album covers
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage for music tracks
const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'track-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

// File filter for audio
const audioFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|ogg|m4a|flac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /audio/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, flac)'));
  }
};

// Upload configurations
const uploadCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: imageFilter
});

const uploadTracks = multer({
  storage: trackStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per track
    files: 200 // Max 200 tracks
  },
  fileFilter: audioFilter
});

// Combined upload for album creation (cover + tracks)
const uploadAlbum = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'cover') {
        cb(null, coversDir);
      } else {
        cb(null, musicDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const prefix = file.fieldname === 'cover' ? 'cover-' : 'track-';
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 201 // 1 cover + 200 tracks max
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      return imageFilter(req, file, cb);
    } else {
      return audioFilter(req, file, cb);
    }
  }
});

module.exports = {
  uploadCover: uploadCover.single('cover'),
  uploadTracks: uploadTracks.array('tracks', 200),
  uploadAlbum: uploadAlbum.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'tracks', maxCount: 200 }
  ]),
  musicDir,
  coversDir
};

/**
 * Track Model
 * Модель для музыкальных треков
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Track = sequelize.define('Track', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Основная информация
  title: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  artist: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // в секундах
    allowNull: true
  },
  
  // Файлы
  filePath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Путь к аудио файлу (null для внешних источников)'
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Прямая ссылка на аудио файл (для внешних источников)'
  },
  streamUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL для стриминга (может отличаться от fileUrl)'
  },
  coverPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Путь к обложке (локальный файл)'
  },
  coverUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL обложки (для внешних источников)'
  },
  fileFormat: {
    type: DataTypes.STRING, // mp3, flac, wav
    allowNull: true
  },
  fileSize: {
    type: DataTypes.BIGINT, // в байтах
    allowNull: true
  },
  bitrate: {
    type: DataTypes.INTEGER, // kbps
    allowNull: true
  },
  
  // Владелец и права
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Пользователь загрузивший трек (null для внешних)'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Публичный доступ'
  },
  allowDownload: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Разрешить скачивание'
  },
  
  // Статистика
  playCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Внешние источники (DEPRECATED - использовать provider)
  externalSource: {
    type: DataTypes.STRING, // spotify, youtube, apple_music, lmusic.kz, jamendo
    allowNull: true,
    comment: 'DEPRECATED: использовать provider'
  },
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'DEPRECATED: использовать providerTrackId'
  },
  externalUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'DEPRECATED: использовать streamUrl'
  },
  sourceType: {
    type: DataTypes.STRING, // local, external, zaycev
    allowNull: true,
    comment: 'DEPRECATED: использовать provider'
  },
  sourceUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'DEPRECATED: использовать streamUrl'
  },
  
  // Новая система провайдеров
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'manual',
    comment: 'Источник трека: manual (загружен пользователем), kissvk, lmusic, vk, jamendo'
  },
  provider: {
    type: DataTypes.STRING, // 'local', 'lmusic', 'vk', 'jamendo'
    allowNull: true,
    defaultValue: 'lmusic',
    comment: 'Провайдер музыки: local (локальный файл), lmusic (lmusic.kz), vk (VK Music), jamendo'
  },
  providerTrackId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID трека у провайдера (для повторного получения)'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: null,
    comment: 'Статус проверки: true (работает), false (не работает), null (не проверялся)'
  },
  lastChecked: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Дата последней проверки доступности'
  },
  
  // Аудио фичи для ML
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Аудио фичи для рекомендаций: tempo, energy, valence, etc'
  },
  
  // Аналитика для Smart Mixes
  bpm: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Темп композиции (beats per minute) для умных миксов'
  },
  energy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Энергетика трека от 0.0 до 1.0 (ML-анализ)'
  },
  isInstrumental: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Является ли трек инструментальным (без вокала)'
  },
  
  // Связь с альбомом
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Albums',
      key: 'id'
    }
  },
  trackNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Номер трека в альбоме'
  },
  discNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Номер диска (для многодисковых альбомов)'
  }
}, {
  tableName: 'Tracks',
  timestamps: true,
  indexes: [
    { fields: ['uploadedBy'] },
    { fields: ['genre'] },
    { fields: ['artist'] },
    { fields: ['playCount'] },
    { fields: ['createdAt'] },
    { fields: ['externalSource', 'externalId'] },
    { fields: ['albumId'] },
    { fields: ['provider'] },
    { fields: ['isVerified'] },
    { fields: ['lastChecked'] },
    { fields: ['bpm'] },
    { fields: ['energy'] },
    { fields: ['isInstrumental'] }
  ]
});

module.exports = Track;

/**
 * Music Controller
 * Контроллеры для музыкального модуля
 */
const fs = require('fs').promises;
const path = require('path');
const { Sequelize } = require('sequelize');
const musicService = require('./music.service');
const trackDiscoveryService = require('./track-discovery.service');
const myWaveService = require('./my-wave.service');
const { Track, TrackLike, ListeningHistory, Playlist, PlaylistTrack, User, Album, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * GET /api/music/tracks
 * Получить список треков с фильтрацией
 */
exports.getTracks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      genre, 
      artist, 
      search,
      sortBy = 'playCount',  // 🔥 Изменено: теперь по умолчанию сортировка по популярности
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isPublic: true };

    // 🔥 Фильтруем треки с минимальной активностью (опционально)
    // Если пользователь не ищет что-то конкретное, показываем только качественный контент
    if (!search && !artist && !genre) {
      where[Op.or] = [
        { playCount: { [Op.gte]: 5 } },  // Треки с хотя бы 5 прослушиваниями
        { likeCount: { [Op.gte]: 1 } },  // Или хотя бы 1 лайком
        { 
          createdAt: { 
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Или новые за последнюю неделю
          } 
        }
      ];
    }

    if (genre) where.genre = genre;
    if (artist) where.artist = { [Op.iLike]: `%${artist}%` };
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { artist: { [Op.iLike]: `%${search}%` } },
        { album: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows: tracks, count } = await Track.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [
        [sortBy, order],
        ['likeCount', 'DESC'],  // 🔥 Вторичная сортировка по лайкам
        ['createdAt', 'DESC']   // 🔥 Третичная сортировка по дате
      ],
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }, {
        model: Album,
        as: 'album',
        attributes: ['id', 'title', 'coverUrl'],
        required: false
      }]
    });

    // Проверяем лайки текущего пользователя
    let userLikes = new Set();
    if (req.user) {
      const likes = await TrackLike.findAll({
        where: { 
          userId: req.user.id,
          trackId: tracks.map(t => t.id)
        },
        attributes: ['trackId']
      });
      userLikes = new Set(likes.map(l => l.trackId));
    }

    // Всегда используем прокси endpoint для треков и фильтруем невалидные
    const tracksWithStreamUrl = tracks.map(track => {
      const trackData = track.toJSON();
      
      // ✅ Fallback на обложку альбома если у трека нет своей
      if (!trackData.coverUrl && trackData.album?.coverUrl) {
        trackData.coverUrl = trackData.album.coverUrl;
      }
      
      // Проверяем наличие хоть какого-то источника
      const hasStreamUrl = trackData.streamUrl && trackData.streamUrl.trim() !== '';
      const hasFilePath = trackData.filePath && trackData.filePath.trim() !== '';
      const hasExternalUrl = trackData.externalUrl && trackData.externalUrl.trim() !== '';
      
      if (!hasStreamUrl && !hasFilePath && !hasExternalUrl) {
        console.warn(`[getTracks] Track ${track.id} "${track.artist} - ${track.title}" has NO valid source - SKIPPING`);
        return null;  // Будет отфильтрован
      }
      
      const isExternalUrl = hasStreamUrl && (trackData.streamUrl.startsWith('http://') || trackData.streamUrl.startsWith('https://'));
      const isEncrypted = hasStreamUrl && trackData.streamUrl.startsWith('encrypted:');
      const hasFileSource = hasFilePath || hasExternalUrl;
      
      if (isExternalUrl || isEncrypted || hasFileSource || !trackData.streamUrl) {
        trackData.streamUrl = `/api/music/tracks/${track.id}/stream`;
      }
      
      // Добавляем информацию о лайке
      trackData.isFavorite = userLikes.has(track.id);
      
      return trackData;
    }).filter(t => t !== null);

    res.json({
      success: true,
      tracks: tracksWithStreamUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracks' });
  }
};

/**
 * GET /api/music/tracks/:id
 * Получить информацию о треке
 */
exports.getTrack = async (req, res) => {
  try {
    const { id } = req.params;
    
    const track = await Track.findByPk(id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    // Проверка доступа
    if (!track.isPublic && (!req.user || track.uploadedBy !== req.user.id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Всегда используем прокси endpoint для внешних источников, encrypted URL и локальных файлов
    const trackData = track.toJSON();
    
    // Проверяем наличие хоть какого-то источника
    const hasStreamUrl = trackData.streamUrl && trackData.streamUrl.trim() !== '';
    const hasFilePath = trackData.filePath && trackData.filePath.trim() !== '';
    const hasExternalUrl = trackData.externalUrl && trackData.externalUrl.trim() !== '';
    
    if (!hasStreamUrl && !hasFilePath && !hasExternalUrl) {
      console.warn(`[getTrack] Track ${track.id} "${track.artist} - ${track.title}" has NO valid source`);
      return res.status(404).json({ 
        success: false, 
        error: 'Track source unavailable',
        message: 'This track has no valid audio source'
      });
    }
    
    const isExternalUrl = hasStreamUrl && (trackData.streamUrl.startsWith('http://') || trackData.streamUrl.startsWith('https://'));
    const isEncrypted = hasStreamUrl && trackData.streamUrl.startsWith('encrypted:');
    const hasFileSource = hasFilePath || hasExternalUrl;
    
    if (isExternalUrl || isEncrypted || hasFileSource || !trackData.streamUrl) {
      trackData.streamUrl = `/api/music/tracks/${track.id}/stream`;
    }

    res.json({ success: true, track: trackData });
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch track' });
  }
};

/**
 * GET /api/music/tracks/search
 * Поиск треков с расширенными фильтрами
 */
exports.searchTracks = async (req, res) => {
  try {
    const { 
      q, 
      limit = 100,
      genre,
      yearFrom,
      yearTo,
      durationMin,
      durationMax,
      onlyVerified = false,
      provider,
      sortBy = 'playCount',
      order = 'DESC'
    } = req.query;

    // Базовое условие поиска
    const whereCondition = {};

    // Текстовый поиск
    if (q && q.trim().length > 0) {
      whereCondition[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { artist: { [Op.iLike]: `%${q}%` } },
        { album: { [Op.iLike]: `%${q}%` } },
        { genre: { [Op.iLike]: `%${q}%` } }
      ];
    }

    // Фильтр по жанру
    if (genre) {
      whereCondition.genre = { [Op.iLike]: `%${genre}%` };
    }

    // Фильтр по году
    if (yearFrom || yearTo) {
      whereCondition.year = {};
      if (yearFrom) whereCondition.year[Op.gte] = parseInt(yearFrom);
      if (yearTo) whereCondition.year[Op.lte] = parseInt(yearTo);
    }

    // Фильтр по длительности (в секундах)
    if (durationMin || durationMax) {
      whereCondition.duration = {};
      if (durationMin) whereCondition.duration[Op.gte] = parseInt(durationMin);
      if (durationMax) whereCondition.duration[Op.lte] = parseInt(durationMax);
    }

    // Фильтр по верификации
    if (onlyVerified === 'true' || onlyVerified === true) {
      whereCondition.isVerified = true;
    }

    // Фильтр по провайдеру
    if (provider) {
      whereCondition.provider = provider;
    }

    // Валидация sortBy
    const allowedSortFields = ['playCount', 'likeCount', 'createdAt', 'title', 'artist', 'year', 'duration'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'playCount';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const tracks = await Track.findAll({
      where: whereCondition,
      limit: parseInt(limit),
      order: [
        [sortField, sortOrder],
        ['createdAt', 'DESC'] // Вторичная сортировка
      ],
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({ 
      success: true, 
      tracks,
      filters: {
        genre,
        yearFrom,
        yearTo,
        durationMin,
        durationMax,
        onlyVerified,
        provider
      },
      total: tracks.length
    });
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to search tracks' });
  }
};

/**
 * GET /api/music/tracks/popular
 * Получить популярные треки из KissVK Chart
 */
exports.getPopularTracks = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const requestedLimit = parseInt(limit);
    let allTracks = [];
    let trackIds = new Set();

    // Сначала берём треки из KissVK Chart (приоритет чарту)
    const chartPlaylist = await Playlist.findOne({
      where: {
        name: { [Op.like]: '%KissVK Chart%' }
      },
      order: [['createdAt', 'DESC']]
    });

    if (chartPlaylist) {
      const playlistTracks = await PlaylistTrack.findAll({
        where: { playlistId: chartPlaylist.id },
        include: [{
          model: Track,
          as: 'track',
          where: { 
            isPublic: true,
            streamUrl: { 
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.notLike]: 'encrypted:%' }
              ]
            }
          },
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'avatar']
          }, {
            model: Album,
            as: 'album',
            attributes: ['id', 'title', 'coverUrl']
          }]
        }],
        order: [['position', 'ASC']]
      });

      // Добавляем треки из чарта - исключаем дубли
      for (const pt of playlistTracks) {
        if (pt.track && !trackIds.has(pt.track.id)) {
          allTracks.push(pt.track);
          trackIds.add(pt.track.id);
        }
        // Останавливаемся когда достаточно уникальных треков
        if (allTracks.length >= requestedLimit) break;
      }
    }

    // Если треков меньше лимита, дополняем остальными треками
    if (allTracks.length < requestedLimit) {
      const remainingLimit = requestedLimit - allTracks.length;
      const additionalTracks = await Track.findAll({
        where: { 
          isPublic: true,
          id: { [Op.notIn]: Array.from(trackIds) }, // Исключаем уже добавленные
          streamUrl: { 
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.notLike]: 'encrypted:%' }
            ]
          }
        },
        limit: remainingLimit,
        order: [['createdAt', 'DESC']],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }, {
          model: Album,
          as: 'album',
          attributes: ['id', 'title', 'coverUrl']
        }]
      });

      allTracks = allTracks.concat(additionalTracks);
    }

    res.json({ success: true, tracks: allTracks.slice(0, requestedLimit) });
  } catch (error) {
    console.error('Error fetching popular tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch popular tracks' });
  }
};

/**
 * POST /api/music/tracks/upload
 * Загрузить трек
 */
exports.uploadTrack = async (req, res) => {
  try {
    if (!req.files || !req.files.track) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const audioFile = req.files.track[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    // Извлечение метаданных из файла
    const metadata = await musicService.extractMetadata(audioFile.path);

    console.log('📝 Form data:', {
      title: req.body.title,
      artist: req.body.artist,
      album: req.body.album,
      genre: req.body.genre,
      year: req.body.year
    });

    console.log('🎵 Metadata from file:', metadata);

    // Создание трека в БД
    const track = await Track.create({
      title: req.body.title || metadata.title || path.basename(audioFile.originalname, path.extname(audioFile.originalname)),
      artist: (req.body.artist && req.body.artist !== 'Unknown Artist') ? req.body.artist : (metadata.artist || 'Unknown Artist'),
      album: req.body.album || metadata.album,
      genre: req.body.genre || metadata.genre,
      year: req.body.year || metadata.year,
      duration: metadata.duration,
      filePath: audioFile.path,
      coverPath: coverFile ? coverFile.path : metadata.coverPath,
      coverUrl: coverFile ? `/uploads/covers/${path.basename(coverFile.path)}` : null,
      fileFormat: path.extname(audioFile.originalname).slice(1),
      fileSize: audioFile.size,
      bitrate: metadata.bitrate,
      uploadedBy: req.user.id,
      isPublic: req.body.isPublic !== 'false',
      allowDownload: req.body.allowDownload !== 'false',
      sourceType: 'local', // Локальный трек
      tags: req.body.tags ? JSON.parse(req.body.tags) : []
    });

    // Извлечение аудио фичей для ML (async)
    musicService.extractAudioFeatures(track.id, audioFile.path).catch(err => {
      console.error('Error extracting audio features:', err);
    });

    // Возвращаем трек с правильными URL для фронтенда
    const trackData = track.toJSON();
    trackData.streamUrl = `/api/music/tracks/${track.id}/stream`;
    if (trackData.coverUrl) {
      trackData.coverUrl = trackData.coverUrl.startsWith('http') 
        ? trackData.coverUrl 
        : trackData.coverUrl;
    }

    res.json({ 
      success: true, 
      track: trackData,
      message: 'Track uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading track:', error);
    res.status(500).json({ success: false, error: 'Failed to upload track' });
  }
};

/**
 * GET /api/music/tracks/:id/stream
 * Стриминг трека через интеллектуальную стратегию
 */
exports.streamTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const streamingStrategy = require('./streaming-strategy.service');
    
    const track = await Track.findByPk(id);

    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    if (!track.isPublic && (!req.user || track.uploadedBy !== req.user.id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Получаем стратегию стриминга
    let streamInfo;
    try {
      streamInfo = await streamingStrategy.getStreamUrl(track, req.user);
    } catch (error) {
      console.error(`[Stream] Strategy error for track ${id}:`, error.message);
      return res.status(404).json({ 
        success: false, 
        error: 'Track unavailable',
        message: error.message
      });
    }

    // Обработка по типу стриминга
    if (streamInfo.type === 'local') {
      // Локальный файл
      return await this.streamLocalFile(streamInfo.filePath, track, req, res);
    } else if (streamInfo.type === 'proxy') {
      // Проксирование внешнего URL
      return await this.proxyExternalStream(streamInfo.externalUrl, track, req, res);
    }

  } catch (error) {
    console.error('Error streaming track:', error);
    res.status(500).json({ success: false, error: 'Failed to stream track' });
  }
};

/**
 * Стриминг локального файла
 * @private
 */
exports.streamLocalFile = async (filePath, track, req, res) => {
  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = require('fs').createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': track.fileFormat ? `audio/${track.fileFormat}` : 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000'
      });
      
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': track.fileFormat ? `audio/${track.fileFormat}` : 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000'
      });
      
      require('fs').createReadStream(filePath).pipe(res);
    }

    // Increment play count
    track.increment('playCount').catch(err => console.error('Failed to increment playCount:', err));
    
  } catch (error) {
    console.error('[Stream] Local file error:', error);
    res.status(500).json({ success: false, error: 'Failed to stream local file' });
  }
};

/**
 * Проксирование внешнего стрима
 * @private
 */
exports.proxyExternalStream = async (externalUrl, track, req, res) => {
  const axios = require('axios');
  const hlsProxy = require('./hls-proxy.service');
  
  try {
    // Валидация URL перед проксированием
    if (!externalUrl || typeof externalUrl !== 'string' || externalUrl.trim() === '') {
      console.error(`[Stream] Invalid external URL for track ${track.id}: "${externalUrl}"`);
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid stream URL',
        trackId: track.id,
        trackTitle: `${track.artist} - ${track.title}`
      });
    }
    
    console.log(`[Stream] Proxying external URL for track ${track.id}: ${externalUrl}`);
    
    // Обработка HLS манифестов (m3u8) - переписываем URLs сегментов через прокси
    if (hlsProxy.isHlsUrl(externalUrl)) {
      // Для локальной разработки всегда используем относительный путь
      // В продакшене nginx сам добавит правильный host
      const baseProxyUrl = '/api/music';
      const manifestContent = await hlsProxy.fetchAndRewriteManifest(externalUrl, track.id, baseProxyUrl);
      
      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type'
      });
      
      res.send(manifestContent);
      track.increment('playCount').catch(err => console.error('Failed to increment playCount:', err));
      return;
    }
    
    // Обычное проксирование для MP3 и других форматов
    const response = await axios({
      method: 'GET',
      url: externalUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'Range': req.headers.range || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': externalUrl.includes('vkuseraudio.net') ? 'https://vk.com' : 
                  externalUrl.includes('lmusic') ? 'https://lmusic.kz' : undefined
      }
    });

    // Copy headers from external source
    res.set({
      'Content-Type': response.headers['content-type'] || 'audio/mpeg',
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': response.headers['accept-ranges'] || 'bytes',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    });

    if (response.headers['content-range']) {
      res.status(206);
      res.set('Content-Range', response.headers['content-range']);
    }

    response.data.pipe(res);

    // Increment play count
    track.increment('playCount').catch(err => console.error('Failed to increment playCount:', err));

  } catch (error) {
    console.error(`[Stream] Proxy error:`, error.message);
    
    // Помечаем трек как неверифицированный
    track.update({ 
      isVerified: false, 
      lastChecked: new Date() 
    }).catch(err => console.error('Failed to update verification status:', err));
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stream from external source',
      message: error.message
    });
  }
};

/**
 * GET /api/music/hls-segment
 * Прокси для HLS сегментов из VK с правильными headers
 */
exports.proxyHlsSegment = async (req, res) => {
  const hlsProxy = require('./hls-proxy.service');
  const axios = require('axios');
  
  try {
    const { url, trackId } = req.query;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }
    
    // Декодируем URL
    const segmentUrl = decodeURIComponent(url);
    console.log(`[HLS Segment] Proxying: ${segmentUrl.substring(0, 60)}...`);
    
    const segment = await hlsProxy.fetchSegment(segmentUrl);
    
    res.set({
      'Content-Type': segment.contentType,
      'Content-Length': segment.contentLength,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });
    
    res.send(segment.data);
    
    // Increment play count for the track if valid
    if (trackId) {
      const track = await Track.findByPk(trackId);
      if (track) {
        track.increment('playCount').catch(err => console.error('Failed to increment playCount:', err));
      }
    }
    
  } catch (error) {
    console.error(`[HLS Segment] Proxy error:`, error.message);
    
    // Determine error response
    if (error.message.includes('URL may have expired')) {
      res.status(410).json({ 
        success: false, 
        error: 'HLS URL expired',
        message: 'The audio URL has expired. Please refresh and try again.'
      });
    } else {
      res.status(502).json({ 
        success: false, 
        error: 'Failed to proxy HLS segment',
        message: error.message
      });
    }
  }
};

/**
 * GET /api/music/tracks/:id/download
 * Скачать трек
 */
exports.downloadTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const track = await Track.findByPk(id);

    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    if (!track.allowDownload) {
      return res.status(403).json({ success: false, error: 'Download not allowed' });
    }

    if (!track.isPublic && track.uploadedBy !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const filename = `${track.artist} - ${track.title}.${track.fileFormat}`;
    
    res.download(track.filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).json({ success: false, error: 'Download failed' });
      }
      
      // Increment download count
      track.increment('downloadCount');
    });
  } catch (error) {
    console.error('Error downloading track:', error);
    res.status(500).json({ success: false, error: 'Failed to download track' });
  }
};

/**
 * DELETE /api/music/tracks/:id
 * Удалить трек
 */
exports.deleteTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const track = await Track.findByPk(id);

    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    if (track.uploadedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Удаление файлов
    try {
      await fs.unlink(track.filePath);
      if (track.coverPath) {
        await fs.unlink(track.coverPath);
      }
    } catch (err) {
      console.error('Error deleting files:', err);
    }

    await track.destroy();

    res.json({ success: true, message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ success: false, error: 'Failed to delete track' });
  }
};

/**
 * POST /api/music/tracks/:id/like
 * Добавить трек в избранное
 */
exports.likeTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const track = await Track.findByPk(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    const [like, created] = await TrackLike.findOrCreate({
      where: { userId, trackId: id }
    });

    if (created) {
      await track.increment('likeCount');
    }

    res.json({ success: true, liked: true });
  } catch (error) {
    console.error('Error liking track:', error);
    res.status(500).json({ success: false, error: 'Failed to like track' });
  }
};

/**
 * DELETE /api/music/tracks/:id/like
 * Убрать трек из избранного
 */
exports.unlikeTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await TrackLike.destroy({
      where: { userId, trackId: id }
    });

    if (deleted) {
      await Track.decrement('likeCount', { where: { id } });
    }

    res.json({ success: true, liked: false });
  } catch (error) {
    console.error('Error unliking track:', error);
    res.status(500).json({ success: false, error: 'Failed to unlike track' });
  }
};

/**
 * GET /api/music/favorites
 * Получить избранные треки
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: likes, count } = await TrackLike.findAndCountAll({
      where: { userId },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Track,
        as: 'track',
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }]
      }]
    });

    const tracks = likes.map(like => like.track);

    res.json({
      success: true,
      tracks,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
  }
};

/**
 * POST /api/music/tracks/:id/listen
 * Записать прослушивание
 */
exports.recordListen = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { duration, completed } = req.body;

    await ListeningHistory.create({
      userId,
      trackId: id,
      duration: duration || 0,
      completed: completed || false,
      context: {
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording listen:', error);
    res.status(500).json({ success: false, error: 'Failed to record listen' });
  }
};

/**
 * GET /api/music/history
 * История прослушиваний
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: history, count } = await ListeningHistory.findAndCountAll({
      where: { userId },
      limit: parseInt(limit),
      offset,
      order: [['listenedAt', 'DESC']],
      include: [{
        model: Track,
        as: 'track',
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }]
      }]
    });

    res.json({
      success: true,
      history,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};

// ============ ПЛЕЙЛИСТЫ ============

/**
 * GET /api/music/playlists
 * Получить плейлисты пользователя
 */
/**
 * POST /api/music/playlists/upload-cover
 * Загрузить обложку для плейлиста
 */
exports.uploadPlaylistCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл обложки не найден' });
    }

    const coverUrl = `/uploads/covers/${path.basename(req.file.path)}`;
    res.json({ success: true, coverUrl });
  } catch (error) {
    console.error('Error uploading playlist cover:', error);
    res.status(500).json({ success: false, error: 'Failed to upload cover' });
  }
};

exports.getPlaylists = async (req, res) => {
  try {
    const { search, limit = 10 } = req.query;
    console.log('📋 getPlaylists called:', { search, hasUser: !!req.user, userRole: req.user?.role });

    // Если есть поиск - публичный доступ
    if (search) {
      const playlists = await Playlist.findAll({
        where: {
          isPublic: true,
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
          ]
        },
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM "PlaylistTracks" WHERE "PlaylistTracks"."playlistId" = "Playlist"."id")'), 'trackCount']
          ]
        },
        limit: parseInt(limit),
        order: [['subscriberCount', 'DESC'], ['createdAt', 'DESC']]
      });
      return res.json({ success: true, playlists });
    }

    // Иначе требуется авторизация
    if (!req.user) {
      console.log('❌ getPlaylists: No user, returning 401');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Админы получают все плейлисты
    if (req.user.role === 'admin') {
      const playlists = await Playlist.findAll({
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM "PlaylistTracks" WHERE "PlaylistTracks"."playlistId" = "Playlist"."id")'), 'trackCount']
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      return res.json({ success: true, playlists });
    }

    // Обычные пользователи - только свои
    const userId = req.user.id;
    const playlists = await Playlist.findAll({
      where: { userId },
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM "PlaylistTracks" WHERE "PlaylistTracks"."playlistId" = "Playlist"."id")'), 'trackCount']
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
};

/**
 * GET /api/music/playlists/featured
 * Получить editorial плейлисты для главной страницы (публичный доступ)
 */
exports.getFeaturedPlaylists = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const playlists = await Playlist.findAll({
      where: { 
        type: 'editorial',
        isPublic: true
      },
      attributes: {
        include: [
          'id',
          'name',
          'description',
          'coverUrl',
          'type',
          'isPublic',
          'playCount',
          'subscriberCount',
          'createdAt',
          'updatedAt',
          [sequelize.literal('(SELECT COUNT(*) FROM "PlaylistTracks" WHERE "PlaylistTracks"."playlistId" = "Playlist"."id")'), 'trackCount']
        ]
      },
      limit: parseInt(limit),
      order: [['id', 'DESC']] // Новые сначала
    });

    res.json({ success: true, playlists });
  } catch (error) {
    console.error('Error fetching featured playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured playlists' });
  }
};

/**
 * POST /api/music/playlists
 * Создать плейлист
 */
exports.createPlaylist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, isPublic = false, coverUrl, isFeatured = false, isEditorial = false, tags = [] } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Playlist name required' });
    }

    const playlist = await Playlist.create({
      userId,
      name,
      description,
      isPublic,
      coverPath: coverUrl || null,
      isFeatured,
      isEditorial,
      tags: Array.isArray(tags) ? tags : []
    });

    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to create playlist' });
  }
};

/**
 * PUT /api/music/playlists/:id
 * Обновить плейлист
 */
exports.updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, isPublic, coverUrl, isFeatured, isEditorial, tags } = req.body;

    const playlist = await Playlist.findByPk(id);
    
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    // Проверка прав доступа (владелец или админ)
    if (playlist.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Обновляем поля
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (coverUrl !== undefined) updates.coverPath = coverUrl;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (isEditorial !== undefined) updates.isEditorial = isEditorial;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];

    await playlist.update(updates);

    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to update playlist' });
  }
};

/**
 * GET /api/music/playlists/:id
 * Получить треки плейлиста
 */
exports.getPlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findByPk(id, {
      include: [{
        model: PlaylistTrack,
        as: 'tracks',
        include: [{
          model: Track,
          as: 'track',
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'avatar']
          }, {
            model: Album,
            as: 'album',
            attributes: ['id', 'title', 'coverUrl']
          }]
        }],
        order: [['position', 'ASC']]
      }]
    });

    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    // Проверка доступа - для приватных плейлистов нужна авторизация и принадлежность
    if (!playlist.isPublic && (!req.user || playlist.userId !== req.user.id)) {
      console.warn(`[Playlist] 403 Access Denied for playlist ${id}: isPublic=${playlist.isPublic}, userId=${req.user?.id}, playlistUserId=${playlist.userId}`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Преобразуем в plain object
    let playlistData = playlist.toJSON ? playlist.toJSON() : playlist;

    // Извлекаем данные треков из PlaylistTrack и добавляем streamUrl
    if (playlistData.tracks && Array.isArray(playlistData.tracks)) {
      const originalTrackCount = playlistData.tracks.length;
      console.log(`[Playlist ${id}] Processing ${originalTrackCount} tracks`);
      
      playlistData.tracks = playlistData.tracks.map(pt => {
        const track = pt.track || pt;
        
        // Проверяем наличие хоть какого-то источника
        const hasStreamUrl = track.streamUrl && track.streamUrl.trim() !== '';
        const hasFilePath = track.filePath && track.filePath.trim() !== '';
        const hasExternalUrl = track.externalUrl && track.externalUrl.trim() !== '';
        
        if (!hasStreamUrl && !hasFilePath && !hasExternalUrl) {
          console.warn(`[Playlist ${id}] Track ${track.id} "${track.artist} - ${track.title}" has NO valid source - SKIPPING`);
          return null;  // Будет отфильтрован
        }
        
        // Всегда используем прокси endpoint
        const isExternalUrl = hasStreamUrl && (track.streamUrl.startsWith('http://') || track.streamUrl.startsWith('https://'));
        const isEncrypted = hasStreamUrl && track.streamUrl.startsWith('encrypted:');
        const hasFileSource = hasFilePath || hasExternalUrl;
        
        // Сохраняем оригинальный URL для определения типа на frontend
        if (track.streamUrl) {
          track._originalStreamUrl = track.streamUrl;
        }
        
        // Переписываем на прокси endpoint для всех треков
        track.streamUrl = `/api/music/tracks/${track.id}/stream`;
        
        return track;
      }).filter(t => t !== null);  // Удаляем треки без источников
      
      const filteredCount = playlistData.tracks.length;
      if (filteredCount < originalTrackCount) {
        console.warn(`[Playlist ${id}] Filtered out ${originalTrackCount - filteredCount} tracks without valid sources`);
      }
      console.log(`[Playlist ${id}] Returning ${filteredCount} valid tracks`);
    }
    
    // Нормализация полей изображений для фронтенда
    // Frontend ожидает: image, coverUrl
    // Backend хранит: coverPath
    if (playlistData.coverPath) {
      playlistData.image = playlistData.coverPath;
      playlistData.coverUrl = playlistData.coverPath;
    } else if (playlistData.tracks && playlistData.tracks.length > 0) {
      // Если нет coverPath у плейлиста, берём из первого трека с обложкой
      const firstTrackWithCover = playlistData.tracks.find(t => t.album?.coverUrl || t.coverUrl);
      if (firstTrackWithCover) {
        const coverUrl = firstTrackWithCover.album?.coverUrl || firstTrackWithCover.coverUrl;
        playlistData.image = coverUrl;
        playlistData.coverUrl = coverUrl;
      }
    }

    res.json({ success: true, playlist: playlistData });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlist' });
  }
};

/**
 * POST /api/music/playlists/:id/tracks
 * Добавить трек в плейлист
 */
exports.addTrackToPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackId } = req.body;
    const userId = req.user.id;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const track = await Track.findByPk(trackId);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }

    // Проверка дубликата
    const existing = await PlaylistTrack.findOne({
      where: { playlistId: id, trackId }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Track already in playlist' });
    }

    // Получаем максимальную позицию
    const maxPosition = await PlaylistTrack.max('position', { where: { playlistId: id } }) || 0;

    await PlaylistTrack.create({
      playlistId: id,
      trackId,
      position: maxPosition + 1
    });

    res.json({ success: true, message: 'Track added to playlist' });
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to add track' });
  }
};

/**
 * DELETE /api/music/playlists/:id/tracks/:trackId
 * Удалить трек из плейлиста
 */
exports.removeTrackFromPlaylist = async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const deleted = await PlaylistTrack.destroy({
      where: { playlistId: id, trackId }
    });

    res.json({ success: true, message: 'Track removed from playlist' });
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove track' });
  }
};

/**
 * DELETE /api/music/playlists/:id
 * Удалить плейлист
 */
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findByPk(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    // Запрет удаления системных и редакционных плейлистов
    if (playlist.isSystem || ['editorial', 'auto', 'smart'].includes(playlist.type)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete system, editorial or auto-generated playlists' 
      });
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await playlist.destroy();

    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to delete playlist' });
  }
};

// ============ РЕКОМЕНДАЦИИ ============

/**
 * GET /api/music/recommendations
 * Персональные рекомендации на основе ML
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Используем ML сервис для генерации рекомендаций
    const recommendations = await musicService.generateRecommendations(userId, parseInt(limit));

    res.json({ success: true, tracks: recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
  }
};

/**
 * GET /api/music/recommendations/similar/:trackId
 * Похожие треки
 */
exports.getSimilarTracks = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { limit = 10 } = req.query;

    const similar = await musicService.findSimilarTracks(trackId, parseInt(limit));

    res.json({ success: true, tracks: similar });
  } catch (error) {
    console.error('Error finding similar tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to find similar tracks' });
  }
};

// ============ ПОИСК ============

/**
 * GET /api/music/search
 * Поиск треков, исполнителей, альбомов
 */
exports.search = async (req, res) => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query too short' });
    }

    const results = await musicService.search(q, type, parseInt(limit));

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ============ ЖАНРЫ ============

/**
 * GET /api/music/genres
 * Список всех жанров
 */
exports.getGenres = async (req, res) => {
  try {
    const genres = await Track.findAll({
      attributes: [
        'genre',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        genre: { [Op.ne]: null },
        isPublic: true
      },
      group: ['genre'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json({ success: true, genres });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch genres' });
  }
};

/**
 * GET /api/music/genres/:genre/tracks
 * Треки по жанру
 */
exports.getTracksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { rows: tracks, count } = await Track.findAndCountAll({
      where: { 
        genre: { [Op.iLike]: genre },
        isPublic: true
      },
      limit: parseInt(limit),
      offset,
      order: [['playCount', 'DESC']],
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({
      success: true,
      tracks,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tracks by genre:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracks' });
  }
};

// ============ ВНЕШНИЕ ИНТЕГРАЦИИ ============

/**
 * GET /api/music/external/search
 * Поиск в Spotify/YouTube Music
 */
exports.externalSearch = async (req, res) => {
  try {
    const { q, source = 'spotify', limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const results = await musicService.searchExternal(q, source, parseInt(limit));

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching external:', error);
    res.status(500).json({ success: false, error: 'External search failed' });
  }
};

/**
 * POST /api/music/external/import
 * Импорт трека из внешнего источника
 */
exports.importTrack = async (req, res) => {
  try {
    const { externalId, source } = req.body;
    const userId = req.user.id;

    if (!externalId || !source) {
      return res.status(400).json({ success: false, error: 'External ID and source required' });
    }

    const track = await musicService.importFromExternal(externalId, source, userId);

    res.json({ success: true, track });
  } catch (error) {
    console.error('Error importing track:', error);
    res.status(500).json({ success: false, error: 'Import failed' });
  }
};

// ============ СТАТИСТИКА ============

/**
 * GET /api/music/stats/top
 * Топ треков за период
 */
exports.getTopTracks = async (req, res) => {
  try {
    const { period = 'week', limit = 20 } = req.query;

    let dateFrom;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFrom = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        dateFrom = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFrom = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'all':
      default:
        dateFrom = new Date(0);
    }

    const tracks = await Track.findAll({
      where: {
        isPublic: true,
        createdAt: { [Op.gte]: dateFrom }
      },
      limit: parseInt(limit),
      order: [['playCount', 'DESC']],
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json({ success: true, tracks });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top tracks' });
  }
};

/**
 * GET /api/music/stats/user
 * Статистика пользователя
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [uploadedCount, favoritesCount, listeningCount, totalListeningTime] = await Promise.all([
      Track.count({ where: { uploadedBy: userId } }),
      TrackLike.count({ where: { userId } }),
      ListeningHistory.count({ where: { userId } }),
      ListeningHistory.sum('duration', { where: { userId } })
    ]);

    // Топ жанры пользователя
    const topGenres = await ListeningHistory.findAll({
      attributes: [
        [sequelize.col('track.genre'), 'genre'],
        [sequelize.fn('COUNT', sequelize.col('ListeningHistory.id')), 'count']
      ],
      where: { userId },
      include: [{
        model: Track,
        as: 'track',
        attributes: [],
        where: { genre: { [Op.ne]: null } }
      }],
      group: ['track.genre'],
      order: [[sequelize.fn('COUNT', sequelize.col('ListeningHistory.id')), 'DESC']],
      limit: 5,
      raw: true
    });

    res.json({
      success: true,
      stats: {
        uploadedTracks: uploadedCount,
        favoriteTracks: favoritesCount,
        totalListenings: listeningCount,
        totalListeningTime: totalListeningTime || 0,
        topGenres
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

// ============ АВТОЗАГРУЗКА ТРЕКОВ ============

/**
 * POST /api/music/admin/discover
 * Запустить автоматическое обнаружение треков (только для админов)
 */
exports.discoverTracks = async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { limit = 20, genres, minRating = 7.0 } = req.body;

    console.log('🎵 Manual track discovery triggered by admin:', req.user.username);

    // Запускаем процесс в фоне
    trackDiscoveryService.discoverAndImportTracks({
      limit,
      genres: genres || ['pop', 'electronic', 'rock', 'jazz', 'ambient'],
      minRating
    }).then(result => {
      console.log('✅ Discovery completed:', result);
    }).catch(err => {
      console.error('❌ Discovery failed:', err);
    });

    res.json({
      success: true,
      message: 'Track discovery started in background',
      status: 'processing'
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    res.status(500).json({ success: false, error: 'Failed to start discovery' });
  }
};

/**
 * GET /api/music/admin/discovery-stats
 * Статистика автозагруженных треков
 */
exports.getDiscoveryStats = async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const stats = await trackDiscoveryService.getDiscoveryStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching discovery stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

/**
 * POST /api/music/admin/cleanup
 * Очистка старых непопулярных треков
 */
exports.cleanupTracks = async (req, res) => {
  try {
    // Проверка прав администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { maxAge = 90, minPlays = 10 } = req.body;

    const deleted = await trackDiscoveryService.cleanupUnpopularTracks({
      maxAge,
      minPlays
    });

    res.json({
      success: true,
      message: `Cleaned up ${deleted} tracks`,
      deleted
    });
  } catch (error) {
    console.error('Error cleaning up tracks:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup tracks' });
  }
};

/**
 * POST /api/music/albums/create
 * Создать альбом с загрузкой треков и обложки
 */
exports.createAlbumWithTracks = async (req, res) => {
  try {
    // Validate files
    if (!req.files || !req.files.tracks || req.files.tracks.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one track is required' 
      });
    }

    const tracks = req.files.tracks;
    const cover = req.files.cover ? req.files.cover[0] : null;

    // Validate tracks count
    if (tracks.length > 200) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 200 tracks allowed per album' 
      });
    }

    // Parse metadata
    const { title, artist, description, genre, releaseYear } = req.body;

    // Title and artist are optional now - will be extracted from files if not provided
    const albumTitle = title || 'Unnamed Album';
    const albumArtist = artist || 'Unknown Artist';

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // Create album
      const album = await Album.create({
        title: albumTitle,
        artist: albumArtist,
        description: description || null,
        genre: genre || null,
        releaseYear: releaseYear ? parseInt(releaseYear) : null,
        coverPath: cover ? `/uploads/covers/${path.basename(cover.path)}` : null,
        totalTracks: tracks.length,
        createdBy: req.user.id,
        isPublic: req.body.isPublic !== 'false',
        sourceType: 'local'
      }, { transaction: t });

      // Create tracks
      const createdTracks = [];
      let totalDuration = 0;

      for (let i = 0; i < tracks.length; i++) {
        const trackFile = tracks[i];
        
        try {
          // Extract metadata from audio file
          const metadata = await musicService.extractMetadata(trackFile.path).catch(() => ({}));
          
          const trackData = {
            title: metadata.title || path.basename(trackFile.originalname, path.extname(trackFile.originalname)),
            artist: metadata.artist || albumArtist,
            album: albumTitle,
            albumId: album.id,
            genre: metadata.genre || genre || null,
            year: metadata.year || releaseYear || null,
            duration: metadata.duration || 0,
            trackNumber: i + 1,
            filePath: `/uploads/music/${path.basename(trackFile.path)}`,
            fileFormat: path.extname(trackFile.originalname).slice(1).toLowerCase(),
            fileSize: trackFile.size,
            bitrate: metadata.bitrate || null,
            uploadedBy: req.user.id,
            isPublic: req.body.isPublic !== 'false',
            allowDownload: req.body.allowDownload !== 'false',
            sourceType: 'local'
          };

          const track = await Track.create(trackData, { transaction: t });
          createdTracks.push(track);
          totalDuration += trackData.duration;

          // Extract audio features for ML (async, non-blocking)
          musicService.extractAudioFeatures(track.id, trackFile.path).catch(err => {
            console.error(`Error extracting features for track ${track.id}:`, err.message);
          });
        } catch (trackError) {
          console.error(`Error processing track ${trackFile.originalname}:`, trackError);
          // Continue with other tracks
        }
      }

      // Update album with total duration
      await album.update({ 
        totalDuration,
        totalTracks: createdTracks.length 
      }, { transaction: t });

      return { album, tracks: createdTracks };
    });

    res.json({
      success: true,
      message: 'Album created successfully',
      album: result.album,
      tracksCount: result.tracks.length
    });

  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create album' 
    });
  }
};

/**
 * GET /api/music/my-wave
 * Получить персональную волну (бесконечный поток музыки)
 */
exports.getMyWave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { size = 20, exclude = '' } = req.query;

    // Парсим исключенные треки (переданные как comma-separated string)
    const excludeIds = exclude ? exclude.split(',').map(id => parseInt(id)).filter(Boolean) : [];

    const result = await myWaveService.generateWave(userId, parseInt(size), excludeIds);

    res.json(result);

  } catch (error) {
    console.error('Error generating wave:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate wave' 
    });
  }
};

/**
 * Отметить трек как "не нравится" для волны
 */
exports.dislikeWaveTrack = async (req, res) => {
  try {
    const userId = req.user.id;
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Track ID is required' 
      });
    }

    // Сохраняем дизлайк в таблицу UserPreferences
    const { UserPreference } = require('../../models');
    
    await UserPreference.upsert({
      userId,
      key: `wave_dislike_${trackId}`,
      value: new Date().toISOString()
    });

    console.log(`User ${userId} disliked track ${trackId} in wave`);

    res.json({ 
      success: true, 
      message: 'Track disliked successfully' 
    });

  } catch (error) {
    console.error('Error disliking wave track:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to dislike track' 
    });
  }
};

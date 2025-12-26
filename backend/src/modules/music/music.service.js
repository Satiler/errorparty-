/**
 * Music Service
 * Сервисный слой для ML рекомендаций и внешних интеграций
 */
const { Track, TrackLike, ListeningHistory, User } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const axios = require('axios');
const musicMetadata = require('music-metadata');

/**
 * Извлечь метаданные из аудио файла
 */
async function extractMetadata(filePath) {
  try {
    console.log('📀 Extracting metadata from:', filePath);
    const metadata = await musicMetadata.parseFile(filePath, {
      skipCovers: false,
      native: true,
      includeChapters: false
    });
    const { common, format } = metadata;

    console.log('🎵 Raw metadata:', {
      title: common.title,
      artist: common.artist,
      artists: common.artists,
      albumartist: common.albumartist,
      album: common.album,
      genre: common.genre
    });

    // Decode strings to handle UTF-8 properly
    const decodeText = (text) => {
      if (!text) return null;
      try {
        // Try to decode if needed
        if (typeof text === 'string') {
          // Check if string contains mojibake (broken encoding)
          if (/[А-Яа-я]/.test(text)) {
            // Try to fix UTF-8 encoding issues
            const buffer = Buffer.from(text, 'latin1');
            return buffer.toString('utf-8');
          }
          return text;
        }
        return text;
      } catch (e) {
        return text;
      }
    };

    // Извлечение исполнителя (проверка разных вариантов тегов)
    const artist = common.artist || common.artists?.[0] || common.albumartist || null;
    
    // Извлечение жанра (проверка массива)
    const genre = common.genre?.[0] || common.genre || null;

    const result = {
      title: decodeText(common.title),
      artist: decodeText(artist),
      album: decodeText(common.album),
      genre: decodeText(genre),
      year: common.year,
      duration: Math.floor(format.duration || 0),
      bitrate: format.bitrate ? Math.floor(format.bitrate / 1000) : null,
      coverPath: null // TODO: extract cover art
    };

    console.log('✅ Extracted metadata:', result);
    return result;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {
      title: null,
      artist: null,
      album: null,
      genre: null,
      year: null,
      duration: null,
      bitrate: null,
      coverPath: null
    };
  }
}

/**
 * Извлечь аудио фичи для ML (async task)
 * В production использовать библиотеки: meyda, librosa, essentia.js
 */
async function extractAudioFeatures(trackId, filePath) {
  try {
    // Simplified version - в production использовать FFT анализ
    const metadata = await musicMetadata.parseFile(filePath);
    
    // Примерные фичи (в production извлекать реальные)
    const features = {
      tempo: Math.random() * 100 + 80, // BPM
      energy: Math.random(), // 0-1
      valence: Math.random(), // 0-1 (positivity)
      danceability: Math.random(), // 0-1
      acousticness: Math.random(), // 0-1
      instrumentalness: Math.random(), // 0-1
      liveness: Math.random(), // 0-1
      speechiness: Math.random() // 0-1
    };

    await Track.update(
      { features },
      { where: { id: trackId } }
    );

    return features;
  } catch (error) {
    console.error('Error extracting audio features:', error);
    return null;
  }
}

/**
 * Генерация персональных рекомендаций с ML
 * Использует Collaborative Filtering и Content-Based подходы
 */
async function generateRecommendations(userId, limit = 20) {
  try {
    // 1. Получаем историю пользователя
    const userHistory = await ListeningHistory.findAll({
      where: { userId },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'genre', 'artist', 'features']
      }],
      order: [['listenedAt', 'DESC']],
      limit: 100
    });

    const userLikes = await TrackLike.findAll({
      where: { userId },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'genre', 'artist', 'features']
      }]
    });

    // Если нет истории - возвращаем популярные треки
    if (userHistory.length === 0 && userLikes.length === 0) {
      return await Track.findAll({
        where: { isPublic: true },
        order: [['playCount', 'DESC']],
        limit,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }]
      });
    }

    // 2. Collaborative Filtering - находим похожих пользователей
    const listenedTrackIds = userHistory.map(h => h.track.id);
    const likedTrackIds = userLikes.map(l => l.track.id);
    const allUserTrackIds = [...new Set([...listenedTrackIds, ...likedTrackIds])];

    // Находим пользователей с похожими вкусами
    const similarUsers = await sequelize.query(`
      SELECT 
        "userId",
        COUNT(*) as commonTracks
      FROM "ListeningHistory"
      WHERE "trackId" IN (:trackIds)
        AND "userId" != :userId
      GROUP BY "userId"
      ORDER BY commonTracks DESC
      LIMIT 20
    `, {
      replacements: { trackIds: allUserTrackIds, userId },
      type: sequelize.QueryTypes.SELECT
    });

    const similarUserIds = similarUsers.map(u => u.userId);

    // Треки которые слушали похожие пользователи, но не слушал текущий
    let collaborativeRecommendations = [];
    if (similarUserIds.length > 0) {
      collaborativeRecommendations = await Track.findAll({
        where: {
          isPublic: true,
          id: { [Op.notIn]: allUserTrackIds }
        },
        include: [
          {
            model: ListeningHistory,
            as: 'listeningHistory',
            where: { userId: { [Op.in]: similarUserIds } },
            attributes: []
          },
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'username', 'avatar']
          }
        ],
        group: ['Track.id', 'uploader.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('listeningHistory.id')), 'DESC']],
        limit: Math.floor(limit * 0.6)
      });
    }

    // 3. Content-Based - похожие треки по жанру и исполнителю
    const userGenres = {};
    const userArtists = {};

    [...userHistory, ...userLikes].forEach(item => {
      const track = item.track;
      if (track.genre) {
        userGenres[track.genre] = (userGenres[track.genre] || 0) + 1;
      }
      if (track.artist) {
        userArtists[track.artist] = (userArtists[track.artist] || 0) + 1;
      }
    });

    const topGenres = Object.entries(userGenres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const topArtists = Object.entries(userArtists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    let contentRecommendations = [];
    if (topGenres.length > 0 || topArtists.length > 0) {
      const contentWhere = {
        isPublic: true,
        id: { [Op.notIn]: allUserTrackIds }
      };

      if (topGenres.length > 0 || topArtists.length > 0) {
        contentWhere[Op.or] = [];
        if (topGenres.length > 0) {
          contentWhere[Op.or].push({ genre: { [Op.in]: topGenres } });
        }
        if (topArtists.length > 0) {
          contentWhere[Op.or].push({ artist: { [Op.in]: topArtists } });
        }
      }

      contentRecommendations = await Track.findAll({
        where: contentWhere,
        order: [['playCount', 'DESC']],
        limit: Math.floor(limit * 0.4),
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }]
      });
    }

    // 4. Объединяем и перемешиваем рекомендации
    const allRecommendations = [
      ...collaborativeRecommendations,
      ...contentRecommendations
    ];

    // Удаляем дубликаты
    const uniqueRecommendations = Array.from(
      new Map(allRecommendations.map(track => [track.id, track])).values()
    );

    // Перемешиваем и берем нужное количество
    return uniqueRecommendations
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Fallback - популярные треки
    return await Track.findAll({
      where: { isPublic: true },
      order: [['playCount', 'DESC']],
      limit,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });
  }
}

/**
 * Найти похожие треки на основе аудио фичей
 */
async function findSimilarTracks(trackId, limit = 10) {
  try {
    const sourceTrack = await Track.findByPk(trackId);
    if (!sourceTrack || !sourceTrack.features) {
      // Если нет фичей - ищем по жанру и исполнителю
      return await Track.findAll({
        where: {
          id: { [Op.ne]: trackId },
          isPublic: true,
          [Op.or]: [
            { genre: sourceTrack.genre },
            { artist: sourceTrack.artist }
          ]
        },
        order: [['playCount', 'DESC']],
        limit,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'avatar']
        }]
      });
    }

    // Поиск по similarity аудио фичей (euclidean distance)
    const allTracks = await Track.findAll({
      where: {
        id: { [Op.ne]: trackId },
        isPublic: true,
        features: { [Op.ne]: null }
      },
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    const sourceFeatures = sourceTrack.features;
    const tracksWithDistance = allTracks.map(track => {
      const features = track.features;
      
      // Euclidean distance
      const distance = Math.sqrt(
        Math.pow(features.tempo - sourceFeatures.tempo, 2) +
        Math.pow((features.energy - sourceFeatures.energy) * 100, 2) +
        Math.pow((features.valence - sourceFeatures.valence) * 100, 2) +
        Math.pow((features.danceability - sourceFeatures.danceability) * 100, 2)
      );

      return { track, distance };
    });

    // Сортируем по близости
    return tracksWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.track);

  } catch (error) {
    console.error('Error finding similar tracks:', error);
    return [];
  }
}

/**
 * Поиск треков
 */
async function search(query, type = 'all', limit = 20) {
  try {
    const where = { isPublic: true };
    const searchPattern = `%${query}%`;

    switch (type) {
      case 'tracks':
        where.title = { [Op.iLike]: searchPattern };
        break;
      case 'artists':
        where.artist = { [Op.iLike]: searchPattern };
        break;
      case 'albums':
        where.album = { [Op.iLike]: searchPattern };
        break;
      case 'all':
      default:
        where[Op.or] = [
          { title: { [Op.iLike]: searchPattern } },
          { artist: { [Op.iLike]: searchPattern } },
          { album: { [Op.iLike]: searchPattern } }
        ];
    }

    const tracks = await Track.findAll({
      where,
      limit,
      order: [['playCount', 'DESC']],
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    return tracks;
  } catch (error) {
    console.error('Error searching tracks:', error);
    return [];
  }
}

/**
 * Поиск в Spotify API
 */
async function searchSpotify(query, limit = 10) {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    // Получение access token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Поиск треков
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return searchResponse.data.tracks.items.map(track => ({
      externalId: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      coverUrl: track.album.images[0]?.url,
      duration: Math.floor(track.duration_ms / 1000),
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify
    }));
  } catch (error) {
    console.error('Spotify search error:', error);
    return [];
  }
}

/**
 * Поиск в YouTube Music (требует API ключ)
 */
async function searchYouTube(query, limit = 10) {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: 'snippet',
          q: query + ' music',
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: limit,
          key: process.env.YOUTUBE_API_KEY
        }
      }
    );

    return response.data.items.map(item => ({
      externalId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      coverUrl: item.snippet.thumbnails.high.url,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

/**
 * Универсальный поиск во внешних источниках
 */
async function searchExternal(query, source = 'spotify', limit = 10) {
  switch (source) {
    case 'spotify':
      return await searchSpotify(query, limit);
    case 'youtube':
      return await searchYouTube(query, limit);
    default:
      throw new Error('Unsupported source');
  }
}

/**
 * Импорт трека из внешнего источника
 * (Требует дополнительную логику для скачивания)
 */
async function importFromExternal(externalId, source, userId) {
  try {
    // Проверка существующего трека
    const existing = await Track.findOne({
      where: { externalSource: source, externalId }
    });

    if (existing) {
      return existing;
    }

    let trackData;

    if (source === 'spotify') {
      // Получение данных трека из Spotify
      // В production нужно скачивать preview или использовать легальные API
      // ВАЖНО: Напрямую скачивать с Spotify нельзя (DRM)
      
      throw new Error('Spotify import not yet implemented (DRM protected)');
    } else if (source === 'youtube') {
      // Для YouTube можно использовать ytdl или подобные библиотеки
      // ВАЖНО: Соблюдать авторские права!
      
      throw new Error('YouTube import not yet implemented');
    }

    // Создание трека в БД (после успешного скачивания)
    const track = await Track.create({
      ...trackData,
      uploadedBy: userId,
      externalSource: source,
      externalId
    });

    return track;
  } catch (error) {
    console.error('Error importing track:', error);
    throw error;
  }
}

module.exports = {
  extractMetadata,
  extractAudioFeatures,
  generateRecommendations,
  findSimilarTracks,
  search,
  searchExternal,
  importFromExternal,
  searchSpotify,
  searchYouTube
};

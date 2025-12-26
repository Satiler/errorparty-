/**
 * My Wave Service - Персональная музыкальная волна (как в Яндекс.Музыке)
 * Бесконечный поток музыки на основе машинного обучения
 */
const { Track, ListeningHistory, TrackLike, User } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const userPreferencesService = require('./user-preferences.service');

class MyWaveService {
  
  /**
   * Генерация следующей порции треков для волны
   * @param {number} userId - ID пользователя
   * @param {number} size - Количество треков (по умолчанию 20)
   * @param {Array} excludeIds - ID треков, которые уже были в волне
   */
  async generateWave(userId, size = 20, excludeIds = []) {
    console.log(`🌊 Генерация Моей волны для пользователя ${userId}`);

    try {
      // 1. Получаем профиль пользователя
      const profile = await this._getUserProfile(userId);
      
      if (!profile.hasData) {
        // Если недостаточно данных, возвращаем популярные треки
        return await this._getFallbackTracks(size, excludeIds);
      }

      // 2. Формируем волну с балансировкой
      const wave = [];
      const excludeSet = new Set(excludeIds);

      // 30% - Знакомые треки (любимые исполнители)
      const familiarTracks = await this._getFamiliarTracks(profile, Math.floor(size * 0.3), excludeSet);
      wave.push(...familiarTracks);
      familiarTracks.forEach(t => excludeSet.add(t.id));

      // 40% - Похожие на прослушанные (по жанрам)
      const similarTracks = await this._getSimilarTracks(profile, Math.floor(size * 0.4), excludeSet);
      wave.push(...similarTracks);
      similarTracks.forEach(t => excludeSet.add(t.id));

      // 20% - Открытия (новые исполнители, но похожие жанры)
      const discoveryTracks = await this._getDiscoveryTracks(profile, Math.floor(size * 0.2), excludeSet);
      wave.push(...discoveryTracks);
      discoveryTracks.forEach(t => excludeSet.add(t.id));

      // 10% - Популярное (тренды)
      const trendingTracks = await this._getTrendingTracks(profile, Math.ceil(size * 0.1), excludeSet);
      wave.push(...trendingTracks);

      // 3. Перемешиваем для разнообразия (но не полностью случайно)
      const shuffled = this._smartShuffle(wave, profile);

      console.log(`✅ Сгенерировано ${shuffled.length} треков для волны`);
      console.log(`   Знакомые: ${familiarTracks.length}, Похожие: ${similarTracks.length}`);
      console.log(`   Открытия: ${discoveryTracks.length}, Популярное: ${trendingTracks.length}`);

      return {
        success: true,
        tracks: shuffled,
        metadata: {
          familiar: familiarTracks.length,
          similar: similarTracks.length,
          discovery: discoveryTracks.length,
          trending: trendingTracks.length
        }
      };

    } catch (error) {
      console.error('❌ Ошибка генерации волны:', error);
      
      // Fallback на популярные треки
      return {
        success: true,
        tracks: await this._getFallbackTracks(size, excludeIds),
        metadata: { fallback: true }
      };
    }
  }

  /**
   * Анализ профиля пользователя
   */
  async _getUserProfile(userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Получаем дизлайкнутые треки из UserPreferences
    const { UserPreference } = require('../../models');
    const dislikedPrefs = await UserPreference.findAll({
      where: {
        userId,
        key: { [Op.like]: 'wave_dislike_%' }
      }
    });
    
    const dislikedTrackIds = dislikedPrefs.map(pref => {
      const match = pref.key.match(/wave_dislike_(\d+)/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean);

    // История прослушиваний за 90 дней
    const recentHistory = await ListeningHistory.findAll({
      where: {
        userId,
        listenedAt: { [Op.gte]: ninetyDaysAgo }
      },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'artist', 'genre', 'year', 'features']
      }],
      order: [['listenedAt', 'DESC']],
      limit: 500
    });

    // Лайки
    const likes = await TrackLike.findAll({
      where: { userId },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'artist', 'genre', 'year', 'features']
      }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Если слишком мало данных
    if (recentHistory.length < 5 && likes.length < 3) {
      return { hasData: false, dislikedTrackIds };
    }

    // Анализ жанров
    const genreWeights = {};
    const artistWeights = {};
    const yearWeights = {};
    
    // Лайки имеют больший вес (x3)
    likes.forEach(like => {
      const track = like.track;
      if (!track) return;

      if (track.genre) {
        genreWeights[track.genre] = (genreWeights[track.genre] || 0) + 3;
      }
      if (track.artist) {
        artistWeights[track.artist] = (artistWeights[track.artist] || 0) + 3;
      }
      if (track.year) {
        const decade = Math.floor(track.year / 10) * 10;
        yearWeights[decade] = (yearWeights[decade] || 0) + 3;
      }
    });

    // История прослушиваний (x1)
    recentHistory.forEach(entry => {
      const track = entry.track;
      if (!track) return;

      if (track.genre) {
        genreWeights[track.genre] = (genreWeights[track.genre] || 0) + 1;
      }
      if (track.artist) {
        artistWeights[track.artist] = (artistWeights[track.artist] || 0) + 1;
      }
      if (track.year) {
        const decade = Math.floor(track.year / 10) * 10;
        yearWeights[decade] = (yearWeights[decade] || 0) + 1;
      }
    });

    // Топ жанры, исполнители, периоды
    const topGenres = Object.entries(genreWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre]) => genre);

    const topArtists = Object.entries(artistWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([artist]) => artist);

    const topDecades = Object.entries(yearWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([decade]) => parseInt(decade));

    // ID прослушанных треков (чтобы не повторять)
    const playedTrackIds = [
      ...recentHistory.map(h => h.track?.id).filter(Boolean),
      ...likes.map(l => l.track?.id).filter(Boolean)
    ];

    return {
      hasData: true,
      topGenres,
      topArtists,
      topDecades,
      playedTrackIds: [...new Set(playedTrackIds)],
      dislikedTrackIds, // Добавляем дизлайкнутые треки
      totalListens: recentHistory.length,
      totalLikes: likes.length
    };
  }

  /**
   * Знакомые треки (от любимых исполнителей)
   */
  async _getFamiliarTracks(profile, count, excludeSet) {
    if (profile.topArtists.length === 0) return [];

    const tracks = await Track.findAll({
      where: {
        artist: { [Op.in]: profile.topArtists },
        id: { 
          [Op.notIn]: [
            ...excludeSet, 
            ...profile.playedTrackIds,
            ...(profile.dislikedTrackIds || [])
          ] 
        },
        isPublic: true
      },
      limit: count * 2, // Берем с запасом
      order: Sequelize.literal('RANDOM()')
    });

    return tracks.slice(0, count);
  }

  /**
   * Похожие треки (по жанрам)
   */
  async _getSimilarTracks(profile, count, excludeSet) {
    if (profile.topGenres.length === 0) return [];

    const tracks = await Track.findAll({
      where: {
        genre: { [Op.in]: profile.topGenres },
        artist: { [Op.notIn]: profile.topArtists }, // НЕ от знакомых исполнителей
        id: { 
          [Op.notIn]: [
            ...excludeSet, 
            ...profile.playedTrackIds,
            ...(profile.dislikedTrackIds || [])
          ] 
        },
        isPublic: true
      },
      limit: count * 2,
      order: [
        ['playCount', 'DESC'], // Предпочитаем популярные
        Sequelize.literal('RANDOM()')
      ]
    });

    return tracks.slice(0, count);
  }

  /**
   * Открытия (новые исполнители, но из смежных жанров)
   */
  async _getDiscoveryTracks(profile, count, excludeSet) {
    // Для открытий используем как топ жанры, так и все треки
    const whereClause = {
      artist: { [Op.notIn]: profile.topArtists }, // Новые исполнители
      id: { 
        [Op.notIn]: [
          ...excludeSet, 
          ...profile.playedTrackIds,
          ...(profile.dislikedTrackIds || [])
        ] 
      },
      isPublic: true
    };

    // Если есть предпочтения по годам
    if (profile.topDecades && profile.topDecades.length > 0) {
      whereClause.year = {
        [Op.between]: [
          Math.min(...profile.topDecades),
          Math.max(...profile.topDecades) + 10
        ]
      };
    }

    const tracks = await Track.findAll({
      where: whereClause,
      limit: count * 3, // Больший запас для разнообразия
      order: [
        ['playCount', 'DESC'],
        Sequelize.literal('RANDOM()')
      ]
    });

    return tracks.slice(0, count);
  }

  /**
   * Популярные треки (тренды)
   */
  async _getTrendingTracks(profile, count, excludeSet) {
    const tracks = await Track.findAll({
      where: {
        id: { 
          [Op.notIn]: [
            ...excludeSet,
            ...(profile.dislikedTrackIds || [])
          ] 
        },
        isPublic: true
      },
      limit: count * 2,
      order: [
        ['playCount', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return tracks.slice(0, count);
  }

  /**
   * Fallback треки (когда недостаточно данных)
   */
  async _getFallbackTracks(count, excludeIds) {
    const tracks = await Track.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        isPublic: true
      },
      limit: count,
      order: [
        ['playCount', 'DESC'],
        Sequelize.literal('RANDOM()')
      ]
    });

    return tracks;
  }

  /**
   * Умное перемешивание (избегаем подряд одного исполнителя)
   */
  _smartShuffle(tracks, profile) {
    if (tracks.length <= 1) return tracks;

    const shuffled = [];
    const remaining = [...tracks];
    let lastArtist = null;

    while (remaining.length > 0) {
      // Ищем трек от другого исполнителя
      let nextIndex = remaining.findIndex(t => t.artist !== lastArtist);
      
      // Если не нашли, берем случайный
      if (nextIndex === -1) {
        nextIndex = Math.floor(Math.random() * remaining.length);
      }

      const track = remaining.splice(nextIndex, 1)[0];
      shuffled.push(track);
      lastArtist = track.artist;
    }

    return shuffled;
  }

  /**
   * Обратная связь: пользователь пропустил трек
   */
  async skipTrack(userId, trackId) {
    // TODO: В будущем можно использовать для обучения
    // Создать таблицу TrackSkips и учитывать при генерации
    console.log(`⏭️ User ${userId} skipped track ${trackId}`);
  }

  /**
   * Обратная связь: пользователь прослушал трек до конца
   */
  async completedTrack(userId, trackId, listenDuration) {
    // Это уже делается через ListeningHistory
    console.log(`✅ User ${userId} completed track ${trackId} (${listenDuration}s)`);
  }
}

module.exports = new MyWaveService();

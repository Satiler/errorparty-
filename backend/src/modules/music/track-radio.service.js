/**
 * Track Radio Service
 * Генерация бесконечной очереди похожих треков
 */
const { Track, ListeningHistory } = require('../../models');
const { Op } = require('sequelize');

class TrackRadioService {
  /**
   * Генерация радио на основе трека
   * Создаёт плейлист из похожих треков
   */
  async generateRadio(trackId, userId = null, limit = 50) {
    try {
      console.log(`📻 Generating radio for track ${trackId}...`);

      // Получаем исходный трек
      const sourceTrack = await Track.findByPk(trackId);
      if (!sourceTrack) {
        return {
          success: false,
          error: 'Track not found'
        };
      }

      console.log(`🎵 Source track: "${sourceTrack.title}" by ${sourceTrack.artist}`);

      // Получаем ID уже прослушанных треков (если есть userId)
      let listenedTrackIds = [];
      if (userId) {
        const history = await ListeningHistory.findAll({
          where: { userId },
          attributes: ['trackId'],
          group: ['trackId']
        });
        listenedTrackIds = history.map(h => h.trackId);
      }

      // Поиск похожих треков
      const similarTracks = await this.findSimilarTracks(
        sourceTrack,
        listenedTrackIds,
        limit
      );

      console.log(`✅ Found ${similarTracks.length} similar tracks`);

      return {
        success: true,
        sourceTrack: {
          id: sourceTrack.id,
          title: sourceTrack.title,
          artist: sourceTrack.artist,
          genre: sourceTrack.genre
        },
        tracks: similarTracks,
        total: similarTracks.length
      };
    } catch (error) {
      console.error('❌ Radio generation failed:', error);
      throw error;
    }
  }

  /**
   * Поиск похожих треков на основе различных критериев
   */
  async findSimilarTracks(sourceTrack, excludeIds = [], limit = 50) {
    const scoredTracks = new Map(); // trackId => score

    // Критерий 1: Тот же жанр (вес: 40%)
    if (sourceTrack.genre) {
      const genreTracks = await Track.findAll({
        where: {
          genre: { [Op.iLike]: `%${sourceTrack.genre}%` },
          id: {
            [Op.and]: [
              { [Op.ne]: sourceTrack.id },
              { [Op.notIn]: excludeIds }
            ]
          },
          isPublic: true
        },
        attributes: ['id', 'title', 'artist', 'genre', 'year', 'playCount'],
        limit: 100
      });

      for (const track of genreTracks) {
        const currentScore = scoredTracks.get(track.id) || 0;
        scoredTracks.set(track.id, currentScore + 40);
      }
    }

    // Критерий 2: Тот же исполнитель (вес: 30%)
    if (sourceTrack.artist) {
      const artistTracks = await Track.findAll({
        where: {
          artist: { [Op.iLike]: `%${sourceTrack.artist}%` },
          id: {
            [Op.and]: [
              { [Op.ne]: sourceTrack.id },
              { [Op.notIn]: excludeIds }
            ]
          },
          isPublic: true
        },
        attributes: ['id', 'title', 'artist', 'genre', 'year', 'playCount'],
        limit: 50
      });

      for (const track of artistTracks) {
        const currentScore = scoredTracks.get(track.id) || 0;
        scoredTracks.set(track.id, currentScore + 30);
      }
    }

    // Критерий 3: Похожий год (вес: 20%, ±5 лет)
    if (sourceTrack.year) {
      const yearTracks = await Track.findAll({
        where: {
          year: {
            [Op.between]: [sourceTrack.year - 5, sourceTrack.year + 5]
          },
          id: {
            [Op.and]: [
              { [Op.ne]: sourceTrack.id },
              { [Op.notIn]: excludeIds }
            ]
          },
          isPublic: true
        },
        attributes: ['id', 'title', 'artist', 'genre', 'year', 'playCount'],
        limit: 100
      });

      for (const track of yearTracks) {
        const currentScore = scoredTracks.get(track.id) || 0;
        // Больше очков за более близкий год
        const yearDiff = Math.abs(track.year - sourceTrack.year);
        const yearScore = 20 * (1 - yearDiff / 5);
        scoredTracks.set(track.id, currentScore + yearScore);
      }
    }

    // Критерий 4: Популярность (вес: 10%)
    // Бонус для популярных треков
    const popularTracks = await Track.findAll({
      where: {
        playCount: { [Op.gte]: 5 },
        id: {
          [Op.and]: [
            { [Op.ne]: sourceTrack.id },
            { [Op.notIn]: excludeIds }
          ]
        },
        isPublic: true
      },
      attributes: ['id', 'title', 'artist', 'genre', 'year', 'playCount'],
      order: [['playCount', 'DESC']],
      limit: 50
    });

    for (const track of popularTracks) {
      const currentScore = scoredTracks.get(track.id) || 0;
      const popularityScore = Math.min(track.playCount / 10, 10); // Максимум 10 очков
      scoredTracks.set(track.id, currentScore + popularityScore);
    }

    // Получаем все треки с рейтингом
    const trackIds = Array.from(scoredTracks.keys());
    if (trackIds.length === 0) {
      // Fallback: возвращаем популярные треки
      console.log('⚠️ No similar tracks found, using popular tracks as fallback');
      return await Track.findAll({
        where: {
          id: { [Op.ne]: sourceTrack.id },
          isPublic: true
        },
        order: [['playCount', 'DESC']],
        limit
      });
    }

    const tracksData = await Track.findAll({
      where: { id: { [Op.in]: trackIds } }
    });

    // Сортируем по рейтингу
    const sortedTracks = tracksData
      .map(track => ({
        ...track.toJSON(),
        similarityScore: scoredTracks.get(track.id)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return sortedTracks;
  }

  /**
   * Генерация радио на основе нескольких треков (микс)
   */
  async generateMixRadio(trackIds, userId = null, limit = 50) {
    try {
      console.log(`📻 Generating mix radio from ${trackIds.length} tracks...`);

      // Получаем исходные треки
      const sourceTracks = await Track.findAll({
        where: { id: { [Op.in]: trackIds } }
      });

      if (sourceTracks.length === 0) {
        return {
          success: false,
          error: 'No valid tracks found'
        };
      }

      // Получаем ID уже прослушанных треков
      let listenedTrackIds = [...trackIds]; // Исключаем исходные треки
      if (userId) {
        const history = await ListeningHistory.findAll({
          where: { userId },
          attributes: ['trackId'],
          group: ['trackId']
        });
        listenedTrackIds.push(...history.map(h => h.trackId));
      }

      // Анализируем общие характеристики
      const genres = [...new Set(sourceTracks.map(t => t.genre).filter(Boolean))];
      const artists = [...new Set(sourceTracks.map(t => t.artist).filter(Boolean))];
      const years = sourceTracks.map(t => t.year).filter(Boolean);
      const avgYear = years.length > 0
        ? Math.round(years.reduce((a, b) => a + b, 0) / years.length)
        : null;

      console.log('📊 Mix characteristics:', { genres, avgYear });

      // Строим условия поиска
      const whereConditions = {
        id: { [Op.notIn]: listenedTrackIds },
        isPublic: true
      };

      // Добавляем фильтры по жанрам
      if (genres.length > 0) {
        whereConditions[Op.or] = genres.map(genre => ({
          genre: { [Op.iLike]: `%${genre}%` }
        }));
      }

      // Фильтр по годам (±10 лет от среднего)
      if (avgYear) {
        whereConditions.year = {
          [Op.between]: [avgYear - 10, avgYear + 10]
        };
      }

      // Получаем похожие треки
      let similarTracks = await Track.findAll({
        where: whereConditions,
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: limit * 2
      });

      // Бонусные очки для треков знакомых исполнителей
      if (artists.length > 0) {
        similarTracks = similarTracks.sort((a, b) => {
          const aHasKnownArtist = artists.some(artist =>
            a.artist && a.artist.toLowerCase().includes(artist.toLowerCase())
          );
          const bHasKnownArtist = artists.some(artist =>
            b.artist && b.artist.toLowerCase().includes(artist.toLowerCase())
          );

          if (aHasKnownArtist && !bHasKnownArtist) return -1;
          if (!aHasKnownArtist && bHasKnownArtist) return 1;
          return 0;
        });
      }

      const tracks = similarTracks.slice(0, limit);

      console.log(`✅ Generated mix radio with ${tracks.length} tracks`);

      return {
        success: true,
        sourceTracks: sourceTracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist
        })),
        characteristics: { genres, avgYear },
        tracks,
        total: tracks.length
      };
    } catch (error) {
      console.error('❌ Mix radio generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация радио на основе жанра
   */
  async generateGenreRadio(genre, userId = null, limit = 50) {
    try {
      console.log(`📻 Generating genre radio for "${genre}"...`);

      // Получаем ID прослушанных треков
      let listenedTrackIds = [];
      if (userId) {
        const history = await ListeningHistory.findAll({
          where: { userId },
          attributes: ['trackId'],
          group: ['trackId']
        });
        listenedTrackIds = history.map(h => h.trackId);
      }

      // Поиск треков жанра
      const tracks = await Track.findAll({
        where: {
          genre: { [Op.iLike]: `%${genre}%` },
          id: { [Op.notIn]: listenedTrackIds },
          isPublic: true
        },
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit
      });

      console.log(`✅ Found ${tracks.length} tracks for genre "${genre}"`);

      return {
        success: true,
        genre,
        tracks,
        total: tracks.length
      };
    } catch (error) {
      console.error('❌ Genre radio generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация радио на основе исполнителя
   */
  async generateArtistRadio(artist, userId = null, limit = 50) {
    try {
      console.log(`📻 Generating artist radio for "${artist}"...`);

      // Получаем ID прослушанных треков
      let listenedTrackIds = [];
      if (userId) {
        const history = await ListeningHistory.findAll({
          where: { userId },
          attributes: ['trackId'],
          group: ['trackId']
        });
        listenedTrackIds = history.map(h => h.trackId);
      }

      // Поиск треков исполнителя
      const tracks = await Track.findAll({
        where: {
          artist: { [Op.iLike]: `%${artist}%` },
          id: { [Op.notIn]: listenedTrackIds },
          isPublic: true
        },
        order: [
          ['playCount', 'DESC'],
          ['year', 'DESC']
        ],
        limit
      });

      console.log(`✅ Found ${tracks.length} tracks by "${artist}"`);

      return {
        success: true,
        artist,
        tracks,
        total: tracks.length
      };
    } catch (error) {
      console.error('❌ Artist radio generation failed:', error);
      throw error;
    }
  }
}

module.exports = new TrackRadioService();

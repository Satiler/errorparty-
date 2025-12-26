/**
 * Discover Weekly Service
 * Персонализированные рекомендации на основе истории прослушивания
 */
const { Track, ListeningHistory, Playlist, PlaylistTrack, User } = require('../../models');
const { Op } = require('sequelize');

class DiscoverWeeklyService {
  /**
   * Генерация персонального плейлиста Discover Weekly для пользователя
   */
  async generateDiscoverWeekly(userId) {
    try {
      console.log(`🎧 Generating Discover Weekly for user ${userId}...`);

      // 1. Анализ истории прослушивания за последние 90 дней
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const listeningHistory = await ListeningHistory.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: ninetyDaysAgo }
        },
        include: [{
          model: Track,
          as: 'track',
          attributes: ['id', 'artist', 'genre', 'year', 'playCount']
        }],
        order: [['createdAt', 'DESC']],
        limit: 500
      });

      if (listeningHistory.length < 5) {
        console.log('⚠️ Not enough listening history to generate recommendations');
        return {
          success: false,
          error: 'Not enough listening history. Listen to at least 5 tracks to get personalized recommendations.'
        };
      }

      // 2. Извлечение предпочтений пользователя
      const preferences = this.analyzeUserPreferences(listeningHistory);
      console.log('📊 User preferences:', preferences);

      // 3. Поиск рекомендованных треков
      const recommendations = await this.findRecommendations(userId, preferences, 30);

      if (recommendations.length === 0) {
        console.log('⚠️ No recommendations found');
        return {
          success: false,
          error: 'Could not find suitable recommendations. Try listening to more diverse music.'
        };
      }

      // 4. Создание/обновление плейлиста Discover Weekly
      let playlist = await Playlist.findOne({
        where: {
          userId,
          type: 'discover_weekly'
        }
      });

      if (!playlist) {
        playlist = await Playlist.create({
          name: 'Discover Weekly',
          description: 'Персональная подборка на основе ваших предпочтений',
          type: 'discover_weekly',
          isPublic: false,
          userId
        });
        console.log(`✅ Created Discover Weekly playlist for user ${userId}`);
      } else {
        console.log(`♻️ Updating existing Discover Weekly for user ${userId}`);
      }

      // 5. Обновление треков в плейлисте
      await PlaylistTrack.destroy({
        where: { playlistId: playlist.id }
      });

      const playlistTracks = recommendations.map((track, index) => ({
        playlistId: playlist.id,
        trackId: track.id,
        position: index
      }));

      await PlaylistTrack.bulkCreate(playlistTracks);

      console.log(`✅ Added ${recommendations.length} tracks to Discover Weekly`);

      return {
        success: true,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          trackCount: recommendations.length
        },
        preferences
      };
    } catch (error) {
      console.error('❌ Discover Weekly generation failed:', error);
      throw error;
    }
  }

  /**
   * Анализ предпочтений пользователя
   */
  analyzeUserPreferences(listeningHistory) {
    const genreCounts = {};
    const artistCounts = {};
    const yearRanges = [];
    const tracksListened = new Set();

    for (const entry of listeningHistory) {
      const track = entry.track;
      if (!track) continue;

      tracksListened.add(track.id);

      // Подсчет жанров
      if (track.genre) {
        const genre = track.genre.toLowerCase().trim();
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }

      // Подсчет исполнителей
      if (track.artist) {
        const artist = track.artist.toLowerCase().trim();
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      }

      // Годы выпуска
      if (track.year) {
        yearRanges.push(track.year);
      }
    }

    // Топ-3 жанра
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    // Топ-5 исполнителей
    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([artist]) => artist);

    // Средний год и диапазон
    let avgYear = null;
    let yearRange = null;
    if (yearRanges.length > 0) {
      avgYear = Math.round(yearRanges.reduce((a, b) => a + b, 0) / yearRanges.length);
      const minYear = Math.min(...yearRanges);
      const maxYear = Math.max(...yearRanges);
      yearRange = [minYear, maxYear];
    }

    return {
      topGenres,
      topArtists,
      avgYear,
      yearRange,
      totalTracksListened: tracksListened.size,
      totalListens: listeningHistory.length
    };
  }

  /**
   * Поиск рекомендаций на основе предпочтений
   */
  async findRecommendations(userId, preferences, limit = 30) {
    try {
      // Получаем ID треков, которые пользователь уже слушал
      const listenedTracks = await ListeningHistory.findAll({
        where: { userId },
        attributes: ['trackId'],
        group: ['trackId']
      });
      const listenedTrackIds = listenedTracks.map(h => h.trackId);

      // Строим условия поиска
      const whereConditions = {
        isPublic: true,
        id: { [Op.notIn]: listenedTrackIds } // Исключаем уже прослушанные
      };

      // Фильтр по жанрам
      if (preferences.topGenres && preferences.topGenres.length > 0) {
        const genreConditions = preferences.topGenres.map(genre => ({
          genre: { [Op.iLike]: `%${genre}%` }
        }));
        whereConditions[Op.or] = genreConditions;
      }

      // Фильтр по годам (±10 лет от среднего)
      if (preferences.avgYear) {
        whereConditions.year = {
          [Op.between]: [preferences.avgYear - 10, preferences.avgYear + 10]
        };
      }

      // Основной поиск рекомендаций
      let recommendations = await Track.findAll({
        where: whereConditions,
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: limit * 2 // Берем больше для последующей фильтрации
      });

      // Если не хватает, добавляем популярные треки без жанрового фильтра
      if (recommendations.length < limit) {
        const additionalTracks = await Track.findAll({
          where: {
            isPublic: true,
            id: {
              [Op.and]: [
                { [Op.notIn]: listenedTrackIds },
                { [Op.notIn]: recommendations.map(t => t.id) }
              ]
            }
          },
          order: [['playCount', 'DESC']],
          limit: limit - recommendations.length
        });
        recommendations = [...recommendations, ...additionalTracks];
      }

      // Дополнительная фильтрация по исполнителям (бонусные очки для знакомых исполнителей)
      if (preferences.topArtists && preferences.topArtists.length > 0) {
        recommendations = recommendations.sort((a, b) => {
          const aHasKnownArtist = preferences.topArtists.some(artist =>
            a.artist && a.artist.toLowerCase().includes(artist)
          );
          const bHasKnownArtist = preferences.topArtists.some(artist =>
            b.artist && b.artist.toLowerCase().includes(artist)
          );

          if (aHasKnownArtist && !bHasKnownArtist) return -1;
          if (!aHasKnownArtist && bHasKnownArtist) return 1;
          return 0;
        });
      }

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error finding recommendations:', error);
      throw error;
    }
  }

  /**
   * Генерация Discover Weekly для всех активных пользователей
   */
  async generateForAllUsers() {
    try {
      console.log('🌍 Generating Discover Weekly for all active users...');

      // Получаем пользователей, которые слушали музыку за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await ListeningHistory.findAll({
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: ['userId'],
        group: ['userId'],
        raw: true
      });

      const userIds = [...new Set(activeUsers.map(h => h.userId))];
      console.log(`📊 Found ${userIds.length} active users`);

      const results = [];
      for (const userId of userIds) {
        try {
          const result = await this.generateDiscoverWeekly(userId);
          results.push({
            userId,
            success: result.success,
            trackCount: result.playlist?.trackCount || 0
          });
        } catch (error) {
          console.error(`❌ Failed for user ${userId}:`, error.message);
          results.push({
            userId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`🎉 Discover Weekly generation complete: ${successCount}/${userIds.length} successful`);

      return {
        success: true,
        total: userIds.length,
        successful: successCount,
        failed: userIds.length - successCount,
        results
      };
    } catch (error) {
      console.error('❌ Batch Discover Weekly generation failed:', error);
      throw error;
    }
  }

  /**
   * Обновление рекомендаций для пользователя (проверка свежести)
   */
  async shouldUpdateRecommendations(userId) {
    const playlist = await Playlist.findOne({
      where: {
        userId,
        type: 'discover_weekly'
      }
    });

    if (!playlist) return true; // Плейлиста нет - нужно создать

    // Проверяем, когда последний раз обновлялся
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return playlist.updatedAt < sevenDaysAgo;
  }
}

module.exports = new DiscoverWeeklyService();

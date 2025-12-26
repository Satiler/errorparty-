const { ListeningHistory, TrackLike, Track, UserPreferences } = require('../../models');
const { Sequelize } = require('sequelize');

/**
 * Сервис анализа предпочтений пользователя
 * Строит профиль на основе истории прослушивания и лайков
 */
class UserPreferencesService {
  
  /**
   * Анализ истории прослушивания пользователя
   */
  async analyzeListeningHistory(userId, daysBack = 90) {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const history = await ListeningHistory.findAll({
      where: {
        userId,
        listenedAt: {
          [Sequelize.Op.gte]: since
        }
      },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'title', 'artist', 'genre', 'features']
      }],
      order: [['listenedAt', 'DESC']]
    });

    // Подсчет жанров
    const genreCounts = {};
    const artistCounts = {};
    const timeOfDayListens = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    history.forEach(entry => {
      const track = entry.track;
      if (!track) return;

      // Жанры
      if (track.genre) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
      }

      // Исполнители
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
      }

      // Время суток
      const hour = new Date(entry.listenedAt).getHours();
      if (hour >= 5 && hour < 12) timeOfDayListens.morning++;
      else if (hour >= 12 && hour < 17) timeOfDayListens.afternoon++;
      else if (hour >= 17 && hour < 22) timeOfDayListens.evening++;
      else timeOfDayListens.night++;
    });

    // Топ жанры и исполнители
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count, percentage: (count / history.length * 100).toFixed(1) }));

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([artist, count]) => ({ artist, count, percentage: (count / history.length * 100).toFixed(1) }));

    return {
      totalListens: history.length,
      topGenres,
      topArtists,
      timeOfDayListens,
      periodDays: daysBack
    };
  }

  /**
   * Анализ лайков
   */
  async analyzeLikes(userId) {
    const likes = await TrackLike.findAll({
      where: { userId },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'title', 'artist', 'genre', 'features']
      }]
    });

    const genreCounts = {};
    const artistCounts = {};

    likes.forEach(like => {
      const track = like.track;
      if (!track) return;

      if (track.genre) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
      }

      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, count]) => genre);

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([artist, count]) => artist);

    return {
      totalLikes: likes.length,
      topGenres,
      topArtists
    };
  }

  /**
   * Определение профиля открытости к новому
   */
  async analyzeDiscoveryProfile(userId, daysBack = 30) {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const recentHistory = await ListeningHistory.findAll({
      where: {
        userId,
        listenedAt: {
          [Sequelize.Op.gte]: since
        }
      },
      include: [{
        model: Track,
        as: 'track',
        attributes: ['id', 'features', 'artist']
      }]
    });

    const uniqueArtists = new Set();
    let newReleasesCount = 0;

    recentHistory.forEach(entry => {
      const track = entry.track;
      if (!track) return;

      if (track.artist) {
        uniqueArtists.add(track.artist);
      }

      if (track.features?.isNew) {
        newReleasesCount++;
      }
    });

    const artistDiversity = uniqueArtists.size / recentHistory.length;
    const newReleaseRatio = newReleasesCount / recentHistory.length;

    return {
      totalListens: recentHistory.length,
      uniqueArtists: uniqueArtists.size,
      artistDiversity: artistDiversity.toFixed(2),
      newReleasesCount,
      newReleaseRatio: newReleaseRatio.toFixed(2),
      openness: artistDiversity > 0.5 && newReleaseRatio > 0.2 ? 'high' : 
                 artistDiversity > 0.3 ? 'medium' : 'low'
    };
  }

  /**
   * Полный анализ и сохранение предпочтений
   */
  async buildUserProfile(userId) {
    console.log(`🔍 Анализ предпочтений пользователя ${userId}...`);

    const [historyAnalysis, likesAnalysis, discoveryProfile] = await Promise.all([
      this.analyzeListeningHistory(userId),
      this.analyzeLikes(userId),
      this.analyzeDiscoveryProfile(userId)
    ]);

    // Объединяем данные
    const favoriteGenres = [
      ...new Set([
        ...historyAnalysis.topGenres.slice(0, 5).map(g => g.genre),
        ...likesAnalysis.topGenres.slice(0, 5)
      ])
    ];

    const favoriteArtists = [
      ...new Set([
        ...historyAnalysis.topArtists.slice(0, 10).map(a => a.artist),
        ...likesAnalysis.topArtists.slice(0, 10)
      ])
    ];

    // Сохраняем или обновляем профиль
    const [preferences, created] = await UserPreferences.findOrCreate({
      where: { userId },
      defaults: {
        favoriteGenres,
        favoriteArtists,
        listeningHabits: {
          totalListens: historyAnalysis.totalListens,
          totalLikes: likesAnalysis.totalLikes,
          timeOfDay: historyAnalysis.timeOfDayListens,
          avgListensPerDay: (historyAnalysis.totalListens / historyAnalysis.periodDays).toFixed(1)
        },
        discoveryProfile: {
          openness: discoveryProfile.openness,
          artistDiversity: discoveryProfile.artistDiversity,
          newReleaseRatio: discoveryProfile.newReleaseRatio
        },
        lastAnalyzedAt: new Date()
      }
    });

    if (!created) {
      await preferences.update({
        favoriteGenres,
        favoriteArtists,
        listeningHabits: {
          totalListens: historyAnalysis.totalListens,
          totalLikes: likesAnalysis.totalLikes,
          timeOfDay: historyAnalysis.timeOfDayListens,
          avgListensPerDay: (historyAnalysis.totalListens / historyAnalysis.periodDays).toFixed(1)
        },
        discoveryProfile: {
          openness: discoveryProfile.openness,
          artistDiversity: discoveryProfile.artistDiversity,
          newReleaseRatio: discoveryProfile.newReleaseRatio
        },
        lastAnalyzedAt: new Date()
      });
    }

    console.log(`✅ Профиль пользователя ${userId} обновлен`);
    console.log(`   Жанров: ${favoriteGenres.length}`);
    console.log(`   Исполнителей: ${favoriteArtists.length}`);
    console.log(`   Открытость к новому: ${discoveryProfile.openness}`);

    return preferences;
  }

  /**
   * Получение предпочтений с автоматическим обновлением при необходимости
   */
  async getUserPreferences(userId) {
    let preferences = await UserPreferences.findOne({ where: { userId } });

    // Если профиля нет или он устарел (> 7 дней), пересоздаем
    if (!preferences || !preferences.lastAnalyzedAt) {
      preferences = await this.buildUserProfile(userId);
    } else {
      const daysSinceAnalysis = (new Date() - preferences.lastAnalyzedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceAnalysis > 7) {
        preferences = await this.buildUserProfile(userId);
      }
    }

    return preferences;
  }

  /**
   * Рекомендация треков на основе предпочтений
   */
  async getRecommendedTracks(userId, limit = 50) {
    const preferences = await this.getUserPreferences(userId);

    // Ищем треки по любимым жанрам и исполнителям
    const tracks = await Track.findAll({
      where: {
        [Sequelize.Op.or]: [
          { genre: { [Sequelize.Op.in]: preferences.favoriteGenres } },
          { artist: { [Sequelize.Op.in]: preferences.favoriteArtists } }
        ]
      },
      limit,
      order: Sequelize.literal('RANDOM()')
    });

    return tracks;
  }
}

module.exports = new UserPreferencesService();

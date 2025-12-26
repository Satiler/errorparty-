/**
 * 🧠 Smart Recommendation Engine
 * Умная система подбора музыки на основе ML и поведения пользователей
 */

const { Track, TrackLike, ListeningHistory, User, PlaylistTrack, Playlist } = require('../../models');
const { Op, literal } = require('sequelize');
const sequelize = require('../../config/database');

class SmartRecommendationService {
  constructor() {
    // Весовые коэффициенты для алгоритма
    this.weights = {
      genreSimilarity: 0.25,
      moodSimilarity: 0.20,
      audioFeatures: 0.25,
      userHistory: 0.15,
      popularity: 0.10,
      recency: 0.05
    };

    // Пороги для фильтрации
    this.thresholds = {
      minSimilarity: 0.4,
      minConfidence: 0.5
    };
  }

  /**
   * 🎯 Персональные рекомендации для пользователя
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    const {
      limit = 20,
      excludeListened = true,
      diversify = true
    } = options;

    console.log(`🎯 Генерация рекомендаций для пользователя ${userId}`);

    // 1. Анализ профиля пользователя
    const userProfile = await this.buildUserProfile(userId);
    
    if (!userProfile) {
      console.log('⚠️ Профиль не найден, возвращаем популярные треки');
      return this.getPopularTracks(limit);
    }

    // 2. Поиск похожих треков
    const candidates = await this.findSimilarTracks(userProfile, limit * 3);

    // 3. Фильтрация уже прослушанных
    let filtered = candidates;
    if (excludeListened) {
      filtered = await this.filterListenedTracks(userId, candidates);
    }

    // 4. Ранжирование по умному алгоритму
    const ranked = this.rankByMLAlgorithm(filtered, userProfile);

    // 5. Диверсификация (избегаем однообразия)
    const final = diversify ? this.diversifyResults(ranked, limit) : ranked.slice(0, limit);

    console.log(`✅ Сгенерировано ${final.length} рекомендаций`);
    return final;
  }

  /**
   * 👤 Построение профиля пользователя
   */
  async buildUserProfile(userId) {
    // Любимые треки (лайки)
    const likedTracks = await Track.findAll({
      include: [{
        model: TrackLike,
        where: { userId, liked: true },
        required: true
      }],
      limit: 50
    });

    if (likedTracks.length === 0) {
      return null;
    }

    // История прослушиваний
    const history = await ListeningHistory.findAll({
      where: { userId },
      order: [['listenedAt', 'DESC']],
      limit: 100
    });

    // Анализируем жанры
    const genreCount = {};
    likedTracks.forEach(track => {
      genreCount[track.genre] = (genreCount[track.genre] || 0) + 1;
    });

    // Анализируем настроения
    const moodCount = {};
    likedTracks.forEach(track => {
      const mood = track.metadata?.mood;
      if (mood) {
        moodCount[mood] = (moodCount[mood] || 0) + 1;
      }
    });

    // Средние аудио-характеристики
    const avgFeatures = this.calculateAverageFeatures(likedTracks);

    return {
      userId,
      preferredGenres: Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre),
      preferredMoods: Object.entries(moodCount)
        .sort((a, b) => b[1] - a[1])
        .map(([mood]) => mood),
      audioProfile: avgFeatures,
      totalLikes: likedTracks.length,
      totalListens: history.length,
      likedTrackIds: likedTracks.map(t => t.id)
    };
  }

  /**
   * 📊 Вычисление средних аудио-характеристик
   */
  calculateAverageFeatures(tracks) {
    const features = {
      tempo: 0,
      energy: 0,
      valence: 0,
      danceability: 0,
      acousticness: 0
    };

    let count = 0;

    tracks.forEach(track => {
      if (track.features) {
        features.tempo += track.features.tempo || 0;
        features.energy += track.features.energy || 0;
        features.valence += track.features.valence || 0;
        features.danceability += track.features.danceability || 0;
        features.acousticness += track.features.acousticness || 0;
        count++;
      }
    });

    if (count > 0) {
      Object.keys(features).forEach(key => {
        features[key] /= count;
      });
    }

    return features;
  }

  /**
   * 🔍 Поиск похожих треков
   */
  async findSimilarTracks(userProfile, limit = 60) {
    const { preferredGenres, preferredMoods, likedTrackIds } = userProfile;

    // Ищем треки из любимых жанров и настроений
    const whereConditions = {
      id: { [Op.notIn]: likedTrackIds } // Исключаем уже лайкнутые
    };

    if (preferredGenres.length > 0) {
      whereConditions.genre = { [Op.in]: preferredGenres };
    }

    const tracks = await Track.findAll({
      where: whereConditions,
      limit,
      order: sequelize.random()
    });

    // Фильтруем по настроениям если заданы
    if (preferredMoods.length > 0) {
      return tracks.filter(track => 
        !track.metadata?.mood || preferredMoods.includes(track.metadata.mood)
      );
    }

    return tracks;
  }

  /**
   * 🚫 Фильтрация уже прослушанных треков
   */
  async filterListenedTracks(userId, tracks) {
    const listenedIds = await ListeningHistory.findAll({
      where: { userId },
      attributes: ['trackId'],
      group: ['trackId']
    }).then(records => records.map(r => r.trackId));

    return tracks.filter(track => !listenedIds.includes(track.id));
  }

  /**
   * 🧠 Ранжирование с помощью ML-алгоритма
   */
  rankByMLAlgorithm(tracks, userProfile) {
    return tracks.map(track => {
      const score = this.calculateSimilarityScore(track, userProfile);
      return {
        ...track.toJSON(),
        recommendationScore: score,
        confidence: this.calculateConfidence(score)
      };
    })
    .filter(track => track.recommendationScore >= this.thresholds.minSimilarity)
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * 📈 Вычисление оценки похожести
   */
  calculateSimilarityScore(track, userProfile) {
    let score = 0;

    // 1. Похожесть жанра
    if (userProfile.preferredGenres.includes(track.genre)) {
      const genreIndex = userProfile.preferredGenres.indexOf(track.genre);
      score += this.weights.genreSimilarity * (1 - genreIndex / userProfile.preferredGenres.length);
    }

    // 2. Похожесть настроения
    const trackMood = track.metadata?.mood;
    if (trackMood && userProfile.preferredMoods.includes(trackMood)) {
      const moodIndex = userProfile.preferredMoods.indexOf(trackMood);
      score += this.weights.moodSimilarity * (1 - moodIndex / userProfile.preferredMoods.length);
    }

    // 3. Похожесть аудио-характеристик
    if (track.features && userProfile.audioProfile) {
      const featureSimilarity = this.calculateFeatureSimilarity(
        track.features,
        userProfile.audioProfile
      );
      score += this.weights.audioFeatures * featureSimilarity;
    }

    // 4. Популярность (из истории всех пользователей)
    // Упрощённо: чем больше лайков, тем выше
    const likesBoost = Math.min(track.likesCount || 0, 100) / 100;
    score += this.weights.popularity * likesBoost;

    // 5. Свежесть (недавно добавленные треки)
    const daysSinceAdded = (Date.now() - new Date(track.createdAt)) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - daysSinceAdded / 365);
    score += this.weights.recency * recencyBoost;

    return Math.min(score, 1); // Нормализуем 0-1
  }

  /**
   * 🎵 Сходство аудио-характеристик (евклидово расстояние)
   */
  calculateFeatureSimilarity(features1, features2) {
    const keys = ['tempo', 'energy', 'valence', 'danceability', 'acousticness'];
    
    let distance = 0;
    keys.forEach(key => {
      const diff = (features1[key] || 0) - (features2[key] || 0);
      distance += diff * diff;
    });

    // Преобразуем расстояние в похожесть (0-1)
    const similarity = 1 / (1 + Math.sqrt(distance));
    return similarity;
  }

  /**
   * 🎲 Вычисление уверенности рекомендации
   */
  calculateConfidence(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * 🌈 Диверсификация результатов (избегаем однообразия)
   */
  diversifyResults(tracks, limit) {
    const diversified = [];
    const usedGenres = new Set();
    const usedArtists = new Set();

    // Первый проход: разные жанры и артисты
    for (const track of tracks) {
      if (diversified.length >= limit) break;

      const genreKey = track.genre;
      const artistKey = track.artist.toLowerCase();

      // Ограничиваем количество треков одного жанра/артиста подряд
      const genreCount = diversified.filter(t => t.genre === genreKey).length;
      const artistCount = diversified.filter(t => t.artist.toLowerCase() === artistKey).length;

      if (genreCount < 3 && artistCount < 2) {
        diversified.push(track);
        usedGenres.add(genreKey);
        usedArtists.add(artistKey);
      }
    }

    // Второй проход: заполняем оставшиеся слоты
    for (const track of tracks) {
      if (diversified.length >= limit) break;
      if (!diversified.find(t => t.id === track.id)) {
        diversified.push(track);
      }
    }

    return diversified.slice(0, limit);
  }

  /**
   * 🔥 Популярные треки (fallback)
   */
  async getPopularTracks(limit = 20) {
    return Track.findAll({
      order: [
        [literal('COALESCE("likesCount", 0)'), 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit
    });
  }

  /**
   * 🎵 Похожие треки на основе конкретного трека
   */
  async getSimilarToTrack(trackId, limit = 10) {
    const sourceTrack = await Track.findByPk(trackId);
    if (!sourceTrack) {
      throw new Error('Трек не найден');
    }

    // Ищем треки того же жанра
    const candidates = await Track.findAll({
      where: {
        id: { [Op.ne]: trackId },
        genre: sourceTrack.genre
      },
      limit: limit * 3
    });

    // Ранжируем по похожести аудио-характеристик
    const ranked = candidates.map(track => {
      let similarity = 0.5; // Базовая похожесть (тот же жанр)

      if (track.features && sourceTrack.features) {
        similarity += 0.5 * this.calculateFeatureSimilarity(
          track.features,
          sourceTrack.features
        );
      }

      // Бонус за того же артиста
      if (track.artist === sourceTrack.artist) {
        similarity += 0.2;
      }

      return {
        ...track.toJSON(),
        similarityScore: Math.min(similarity, 1)
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);

    return ranked;
  }

  /**
   * 📊 Статистика рекомендаций
   */
  async getRecommendationStats(userId) {
    const history = await ListeningHistory.findAll({
      where: { userId },
      order: [['listenedAt', 'DESC']],
      limit: 100
    });

    const likes = await TrackLike.count({
      where: { userId, liked: true }
    });

    const genreDistribution = {};
    for (const record of history) {
      const track = await Track.findByPk(record.trackId);
      if (track) {
        genreDistribution[track.genre] = (genreDistribution[track.genre] || 0) + 1;
      }
    }

    return {
      totalListens: history.length,
      totalLikes: likes,
      favoriteGenres: Object.entries(genreDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count })),
      averageListensPerDay: history.length / 30
    };
  }

  /**
   * 🎨 Рекомендации по настроению/активности
   */
  async getRecommendationsByMood(mood, limit = 20) {
    const tracks = await Track.findAll({
      where: literal(`metadata->>'mood' = '${mood}'`),
      order: sequelize.random(),
      limit
    });

    return tracks;
  }

  /**
   * 🔄 Обновить веса алгоритма (для экспериментов)
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    console.log('⚙️ Обновлены веса алгоритма:', this.weights);
  }
}

module.exports = new SmartRecommendationService();

const logger = require('../utils/logger');
const db = require('../config/database');

class RecommendationService {
  constructor() {
    this.similarityThreshold = 0.3;
  }

  /**
   * Получить персональные рекомендации для пользователя
   */
  async getPersonalizedRecommendations(userId, limit = 20) {
    try {
      // Получение предпочтений пользователя
      const userPreferences = await this.getUserPreferences(userId);
      
      // Получение истории прослушивания
      const listeningHistory = await this.getListeningHistory(userId);
      
      // Получение мировых трендов
      const trendingTracks = await this.getTrendingTracks(100);

      // Расчёт рекомендаций
      const recommendations = this.calculateRecommendations(
        userPreferences,
        listeningHistory,
        trendingTracks
      );

      // Исключение уже прослушанных треков
      const filteredRecommendations = recommendations.filter(
        rec => !listeningHistory.some(h => h.track_id === rec.trackId)
      );

      return filteredRecommendations.slice(0, limit);
    } catch (error) {
      logger.error('Ошибка получения рекомендаций:', error);
      throw error;
    }
  }

  /**
   * Получить предпочтения пользователя
   */
  async getUserPreferences(userId) {
    try {
      const query = `
        SELECT 
          array_agg(DISTINCT t.artist) as favorite_artists,
          array_agg(DISTINCT t.genre) FILTER (WHERE t.genre IS NOT NULL) as favorite_genres,
          COUNT(DISTINCT t.id) as total_tracks,
          AVG(t.duration) as avg_duration
        FROM user_favorites uf
        JOIN tracks t ON uf.track_id = t.id
        WHERE uf.user_id = $1
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || {
        favorite_artists: [],
        favorite_genres: [],
        total_tracks: 0,
        avg_duration: 0
      };
    } catch (error) {
      logger.error('Ошибка получения предпочтений:', error);
      return { favorite_artists: [], favorite_genres: [], total_tracks: 0 };
    }
  }

  /**
   * Получить историю прослушивания
   */
  async getListeningHistory(userId, limit = 100) {
    try {
      const query = `
        SELECT 
          lh.track_id,
          t.title,
          t.artist,
          t.genre,
          lh.played_at,
          lh.play_count
        FROM listening_history lh
        JOIN tracks t ON lh.track_id = t.id
        WHERE lh.user_id = $1
        ORDER BY lh.played_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Ошибка получения истории:', error);
      return [];
    }
  }

  /**
   * Получить трендовые треки
   */
  async getTrendingTracks(limit = 100) {
    try {
      const query = `
        SELECT 
          t.id,
          t.title,
          t.artist,
          t.genre,
          t.popularity_score,
          COUNT(lh.id) as play_count
        FROM tracks t
        LEFT JOIN listening_history lh ON t.id = lh.track_id
          AND lh.played_at > NOW() - INTERVAL '7 days'
        WHERE t.created_at > NOW() - INTERVAL '30 days'
          OR t.updated_at > NOW() - INTERVAL '7 days'
        GROUP BY t.id
        ORDER BY 
          t.popularity_score DESC,
          play_count DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Ошибка получения трендов:', error);
      return [];
    }
  }

  /**
   * Расчёт рекомендаций
   */
  calculateRecommendations(userPrefs, history, trending) {
    const recommendations = [];

    trending.forEach(track => {
      let score = 0;

      // Базовый балл от популярности
      score += (track.popularity_score || 0) * 0.3;

      // Балл за совпадение артиста
      if (userPrefs.favorite_artists?.includes(track.artist)) {
        score += 0.4;
      }

      // Балл за совпадение жанра
      if (userPrefs.favorite_genres?.includes(track.genre)) {
        score += 0.3;

      }

      // Балл за схожесть с историей прослушивания
      const historySimilarity = this.calculateHistorySimilarity(track, history);
      score += historySimilarity * 0.2;

      // Балл за свежесть (новые треки)
      const daysSinceCreation = this.daysSince(track.created_at);
      if (daysSinceCreation < 7) {
        score += 0.15;
      } else if (daysSinceCreation < 30) {
        score += 0.05;
      }

      if (score >= this.similarityThreshold) {
        recommendations.push({
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          genre: track.genre,
          score: score,
          reason: this.getRecommendationReason(track, userPrefs, score)
        });
      }
    });

    // Сортировка по рейтингу
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Расчёт схожести с историей
   */
  calculateHistorySimilarity(track, history) {
    if (history.length === 0) return 0;

    let similarityScore = 0;
    let matchCount = 0;

    history.forEach(historyTrack => {
      // Совпадение артиста
      if (track.artist === historyTrack.artist) {
        similarityScore += 0.5;
        matchCount++;
      }

      // Совпадение жанра
      if (track.genre && track.genre === historyTrack.genre) {
        similarityScore += 0.3;
        matchCount++;
      }
    });

    return matchCount > 0 ? similarityScore / history.length : 0;
  }

  /**
   * Получить причину рекомендации
   */
  getRecommendationReason(track, userPrefs, score) {
    const reasons = [];

    if (userPrefs.favorite_artists?.includes(track.artist)) {
      reasons.push(`Артист из избранного: ${track.artist}`);
    }

    if (userPrefs.favorite_genres?.includes(track.genre)) {
      reasons.push(`Ваш любимый жанр: ${track.genre}`);
    }

    if (score > 0.8) {
      reasons.push('Высокая популярность');
    }

    const daysSinceCreation = this.daysSince(track.created_at);
    if (daysSinceCreation < 7) {
      reasons.push('Новый релиз');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Популярно сейчас';
  }

  /**
   * Получить рекомендации на основе трека
   */
  async getSimilarTracks(trackId, limit = 10) {
    try {
      const query = `
        SELECT 
          t2.id,
          t2.title,
          t2.artist,
          t2.genre
        FROM tracks t1
        JOIN tracks t2 ON (
          t2.artist = t1.artist 
          OR t2.genre = t1.genre
        )
        WHERE t1.id = $1 
          AND t2.id != $1
        ORDER BY 
          CASE 
            WHEN t2.artist = t1.artist THEN 1
            WHEN t2.genre = t1.genre THEN 2
            ELSE 3
          END,
          t2.popularity_score DESC
        LIMIT $2
      `;

      const result = await db.query(query, [trackId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Ошибка получения похожих треков:', error);
      return [];
    }
  }

  /**
   * Получить рекомендации для нового пользователя (cold start)
   */
  async getColdStartRecommendations(limit = 20) {
    try {
      // Для новых пользователей показываем популярные треки
      const query = `
        SELECT 
          t.id as trackId,
          t.title,
          t.artist,
          t.genre,
          t.popularity_score as score
        FROM tracks t
        WHERE t.popularity_score > 0.7
          OR t.created_at > NOW() - INTERVAL '14 days'
        ORDER BY 
          t.popularity_score DESC,
          t.created_at DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows.map(track => ({
        ...track,
        reason: 'Популярно сейчас'
      }));
    } catch (error) {
      logger.error('Ошибка cold start рекомендаций:', error);
      return [];
    }
  }

  /**
   * Обновить популярность трека
   */
  async updateTrackPopularity(trackId) {
    try {
      const query = `
        UPDATE tracks
        SET popularity_score = (
          SELECT 
            LEAST(1.0, (
              COUNT(lh.id)::float / 1000 +
              COUNT(DISTINCT lh.user_id)::float / 100 +
              CASE 
                WHEN t.created_at > NOW() - INTERVAL '7 days' THEN 0.3
                WHEN t.created_at > NOW() - INTERVAL '30 days' THEN 0.15
                ELSE 0
              END
            ))
          FROM tracks t
          LEFT JOIN listening_history lh ON t.id = lh.track_id
            AND lh.played_at > NOW() - INTERVAL '30 days'
          WHERE t.id = $1
        ),
        updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [trackId]);
    } catch (error) {
      logger.error('Ошибка обновления популярности:', error);
    }
  }

  /**
   * Вспомогательная функция: количество дней с даты
   */
  daysSince(date) {
    if (!date) return 999;
    const now = new Date();
    const then = new Date(date);
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }
}

module.exports = new RecommendationService();

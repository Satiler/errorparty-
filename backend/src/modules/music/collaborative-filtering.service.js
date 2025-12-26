/**
 * Collaborative Filtering Service
 * Система рекомендаций на основе коллаборативной фильтрации (CF)
 * Реализует user-user CF и item-item CF
 */
const { Track, ListeningHistory, TrackLike, User } = require('../../models');
const { Op } = require('sequelize');

class CollaborativeFilteringService {
  /**
   * Получить рекомендации для пользователя на основе похожих пользователей (User-User CF)
   */
  async getUserRecommendations(userId, limit = 20) {
    try {
      console.log(`🔍 Generating user-user CF recommendations for user ${userId}`);

      // 1. Получаем историю текущего пользователя
      const userHistory = await this.getUserInteractions(userId);
      if (userHistory.length < 3) {
        console.log(`⚠️ User ${userId} has insufficient history (${userHistory.length} tracks)`);
        return this.getFallbackRecommendations(limit);
      }

      // 2. Находим похожих пользователей
      const similarUsers = await this.findSimilarUsers(userId, userHistory);
      if (similarUsers.length === 0) {
        console.log(`⚠️ No similar users found for user ${userId}`);
        return this.getFallbackRecommendations(limit);
      }

      console.log(`👥 Found ${similarUsers.length} similar users`);

      // 3. Собираем треки от похожих пользователей
      const userTrackIds = new Set(userHistory.map(t => t.trackId));
      const candidateTracks = new Map();

      for (const { userId: similarUserId, similarity } of similarUsers) {
        const similarUserHistory = await this.getUserInteractions(similarUserId);
        
        for (const interaction of similarUserHistory) {
          if (userTrackIds.has(interaction.trackId)) continue; // Пропускаем уже прослушанные

          const score = candidateTracks.get(interaction.trackId) || 0;
          candidateTracks.set(
            interaction.trackId, 
            score + (similarity * interaction.weight)
          );
        }
      }

      // 4. Сортируем и берем топ-N
      const sortedCandidates = Array.from(candidateTracks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([trackId]) => trackId);

      // 5. Получаем полные данные треков
      const tracks = await Track.findAll({
        where: { id: { [Op.in]: sortedCandidates } },
        attributes: [
          'id', 'title', 'artist', 'album', 'genre', 'duration',
          'coverUrl', 'streamUrl', 'playCount', 'year'
        ]
      });

      // Сортируем в правильном порядке
      const trackMap = new Map(tracks.map(t => [t.id, t]));
      const orderedTracks = sortedCandidates
        .map(id => trackMap.get(id))
        .filter(Boolean);

      console.log(`✅ Generated ${orderedTracks.length} user-user CF recommendations`);

      return {
        success: true,
        method: 'user-user-cf',
        tracks: orderedTracks,
        total: orderedTracks.length
      };

    } catch (error) {
      console.error('Error in user-user CF:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Получить рекомендации на основе похожих треков (Item-Item CF)
   */
  async getItemRecommendations(trackId, userId = null, limit = 20) {
    try {
      console.log(`🔍 Generating item-item CF recommendations for track ${trackId}`);

      const sourceTrack = await Track.findByPk(trackId);
      if (!sourceTrack) {
        throw new Error(`Track ${trackId} not found`);
      }

      // 1. Находим пользователей, которые слушали этот трек
      const trackListeners = await ListeningHistory.findAll({
        where: { trackId },
        attributes: ['userId'],
        group: ['userId'],
        raw: true
      });

      const listenerIds = trackListeners.map(l => l.userId);
      if (listenerIds.length < 2) {
        console.log(`⚠️ Track ${trackId} has too few listeners (${listenerIds.length})`);
        return this.getFallbackRecommendations(limit);
      }

      console.log(`👥 Track has ${listenerIds.length} listeners`);

      // 2. Находим другие треки, которые слушали эти пользователи
      const coListenedTracks = await ListeningHistory.findAll({
        where: {
          userId: { [Op.in]: listenerIds },
          trackId: { [Op.ne]: trackId }
        },
        attributes: [
          'trackId',
          [ListeningHistory.sequelize.fn('COUNT', ListeningHistory.sequelize.col('id')), 'count']
        ],
        group: ['trackId'],
        having: ListeningHistory.sequelize.literal('COUNT(id) >= 2'),
        order: [[ListeningHistory.sequelize.literal('COUNT(id)'), 'DESC']],
        limit: limit * 2,
        raw: true
      });

      if (coListenedTracks.length === 0) {
        console.log(`⚠️ No co-listened tracks found`);
        return this.getFallbackRecommendations(limit);
      }

      // 3. Исключаем уже прослушанные пользователем
      let candidateIds = coListenedTracks.map(t => t.trackId);
      
      if (userId) {
        const userHistory = await this.getUserInteractions(userId);
        const userTrackIds = new Set(userHistory.map(t => t.trackId));
        candidateIds = candidateIds.filter(id => !userTrackIds.has(id));
      }

      // 4. Получаем полные данные треков
      const tracks = await Track.findAll({
        where: { 
          id: { [Op.in]: candidateIds.slice(0, limit) }
        },
        attributes: [
          'id', 'title', 'artist', 'album', 'genre', 'duration',
          'coverUrl', 'streamUrl', 'playCount', 'year'
        ]
      });

      console.log(`✅ Generated ${tracks.length} item-item CF recommendations`);

      return {
        success: true,
        method: 'item-item-cf',
        sourceTrack: sourceTrack.title,
        tracks,
        total: tracks.length
      };

    } catch (error) {
      console.error('Error in item-item CF:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Гибридная система рекомендаций (User-User + Item-Item + Content-Based)
   */
  async getHybridRecommendations(userId, limit = 30) {
    try {
      console.log(`🎯 Generating hybrid recommendations for user ${userId}`);

      const userHistory = await this.getUserInteractions(userId);
      if (userHistory.length === 0) {
        return this.getFallbackRecommendations(limit);
      }

      // 1. User-User CF (40%)
      const userCF = await this.getUserRecommendations(userId, Math.floor(limit * 0.4));
      
      // 2. Item-Item CF на основе последних прослушиваний (30%)
      const recentTracks = userHistory.slice(0, 5);
      const itemCFResults = await Promise.all(
        recentTracks.map(t => this.getItemRecommendations(t.trackId, userId, 5))
      );
      const itemCFTracks = itemCFResults.flatMap(r => r.tracks || []);
      
      // 3. Content-Based на основе жанров и исполнителей (30%)
      const contentBased = await this.getContentBasedRecommendations(userId, Math.floor(limit * 0.3));

      // 4. Объединяем и дедуплицируем
      const allTracks = [
        ...(userCF.tracks || []),
        ...itemCFTracks,
        ...(contentBased.tracks || [])
      ];

      const uniqueTracks = Array.from(
        new Map(allTracks.map(t => [t.id, t])).values()
      );

      // 5. Ранжируем по разнообразию источников
      const scoredTracks = uniqueTracks.map(track => {
        let score = 0;
        if (userCF.tracks?.find(t => t.id === track.id)) score += 40;
        if (itemCFTracks.find(t => t.id === track.id)) score += 30;
        if (contentBased.tracks?.find(t => t.id === track.id)) score += 30;
        return { ...track.toJSON ? track.toJSON() : track, score };
      });

      scoredTracks.sort((a, b) => b.score - a.score);

      const finalTracks = scoredTracks.slice(0, limit);

      console.log(`✅ Generated ${finalTracks.length} hybrid recommendations`);

      return {
        success: true,
        method: 'hybrid',
        breakdown: {
          userCF: userCF.tracks?.length || 0,
          itemCF: itemCFTracks.length,
          contentBased: contentBased.tracks?.length || 0
        },
        tracks: finalTracks,
        total: finalTracks.length
      };

    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Content-Based рекомендации на основе жанров/исполнителей
   */
  async getContentBasedRecommendations(userId, limit = 20) {
    try {
      const userHistory = await this.getUserInteractions(userId);
      if (userHistory.length === 0) {
        return this.getFallbackRecommendations(limit);
      }

      // Анализируем предпочтения
      const genres = {};
      const artists = {};
      const trackIds = userHistory.map(t => t.trackId);

      for (const interaction of userHistory) {
        const track = await Track.findByPk(interaction.trackId, { 
          attributes: ['genre', 'artist'] 
        });
        if (!track) continue;

        if (track.genre) genres[track.genre] = (genres[track.genre] || 0) + 1;
        if (track.artist) artists[track.artist] = (artists[track.artist] || 0) + 1;
      }

      const topGenres = Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

      const topArtists = Object.entries(artists)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);

      // Ищем похожие треки
      const tracks = await Track.findAll({
        where: {
          id: { [Op.notIn]: trackIds },
          [Op.or]: [
            { genre: { [Op.in]: topGenres } },
            { artist: { [Op.in]: topArtists } }
          ]
        },
        limit,
        order: [['playCount', 'DESC']],
        attributes: [
          'id', 'title', 'artist', 'album', 'genre', 'duration',
          'coverUrl', 'streamUrl', 'playCount', 'year'
        ]
      });

      return {
        success: true,
        method: 'content-based',
        tracks,
        total: tracks.length
      };

    } catch (error) {
      console.error('Error in content-based recommendations:', error);
      return { success: false, tracks: [], total: 0 };
    }
  }

  /**
   * Находим похожих пользователей (Cosine Similarity)
   */
  async findSimilarUsers(userId, userHistory, topN = 10) {
    try {
      // Получаем всех активных пользователей
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await ListeningHistory.findAll({
        where: {
          userId: { [Op.ne]: userId },
          listenedAt: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: ['userId'],
        group: ['userId'],
        having: this.sequelize.literal('COUNT(id) >= 5'),
        raw: true
      });

      const userTrackSet = new Set(userHistory.map(t => t.trackId));
      const similarities = [];

      for (const { userId: otherUserId } of activeUsers) {
        const otherHistory = await this.getUserInteractions(otherUserId);
        const otherTrackSet = new Set(otherHistory.map(t => t.trackId));

        const similarity = this.calculateCosineSimilarity(userTrackSet, otherTrackSet);
        if (similarity > 0.1) { // Минимальный порог схожести
          similarities.push({ userId: otherUserId, similarity });
        }
      }

      // Сортируем по схожести
      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, topN);

    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Cosine Similarity между двумя множествами
   */
  calculateCosineSimilarity(setA, setB) {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const intersectionSize = intersection.size;
    
    if (intersectionSize === 0) return 0;
    
    const magnitude = Math.sqrt(setA.size * setB.size);
    return intersectionSize / magnitude;
  }

  /**
   * Получить взаимодействия пользователя с треками
   */
  async getUserInteractions(userId) {
    const [history, likes] = await Promise.all([
      ListeningHistory.findAll({
        where: { userId },
        attributes: ['trackId', 'listenedAt'],
        order: [['listenedAt', 'DESC']],
        limit: 100,
        raw: true
      }),
      TrackLike.findAll({
        where: { userId },
        attributes: ['trackId', 'createdAt'],
        raw: true
      })
    ]);

    // Объединяем и взвешиваем
    const interactions = new Map();
    
    history.forEach(h => {
      interactions.set(h.trackId, {
        trackId: h.trackId,
        weight: 1.0 // Базовый вес за прослушивание
      });
    });

    likes.forEach(l => {
      const existing = interactions.get(l.trackId) || { trackId: l.trackId, weight: 0 };
      existing.weight += 2.0; // Лайк увеличивает вес
      interactions.set(l.trackId, existing);
    });

    return Array.from(interactions.values());
  }

  /**
   * Fallback рекомендации (популярные треки)
   */
  async getFallbackRecommendations(limit = 20) {
    try {
      const tracks = await Track.findAll({
        where: {
          isPublic: true,
          streamUrl: { [Op.not]: null }
        },
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit,
        attributes: [
          'id', 'title', 'artist', 'album', 'genre', 'duration',
          'coverUrl', 'streamUrl', 'playCount', 'year'
        ]
      });

      return {
        success: true,
        method: 'fallback-popular',
        tracks,
        total: tracks.length
      };
    } catch (error) {
      console.error('Error in fallback recommendations:', error);
      return { success: false, tracks: [], total: 0 };
    }
  }
}

module.exports = new CollaborativeFilteringService();

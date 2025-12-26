/**
 * Smart Mixes Service
 * Автоматическая генерация контекстных плейлистов на основе времени суток, активности и BPM
 */
const { Track, ListeningHistory, User } = require('../../models');
const { Op } = require('sequelize');

class SmartMixesService {
  /**
   * Получить все доступные типы умных миксов
   */
  getAvailableMixes() {
    return [
      {
        type: 'morning_energy',
        name: 'Morning Energy ☀️',
        description: 'Бодрые треки для энергичного утра',
        timeRange: [5, 10],
        bpmRange: [120, 180],
        genres: ['Pop', 'Electronic', 'Dance', 'Rock'],
        minEnergy: 0.6
      },
      {
        type: 'focus_flow',
        name: 'Focus Flow 🎯',
        description: 'Инструментальная музыка для концентрации',
        timeRange: [9, 17],
        bpmRange: [80, 120],
        genres: ['Ambient', 'Classical', 'Instrumental', 'Jazz', 'Lo-Fi'],
        maxEnergy: 0.5,
        preferInstrumental: true
      },
      {
        type: 'evening_chill',
        name: 'Evening Chill 🌆',
        description: 'Спокойные треки для вечернего отдыха',
        timeRange: [18, 22],
        bpmRange: [60, 100],
        genres: ['Indie', 'R&B', 'Soul', 'Jazz', 'Acoustic'],
        maxEnergy: 0.6
      },
      {
        type: 'workout_power',
        name: 'Workout Power 💪',
        description: 'Мощные треки для тренировок',
        bpmRange: [140, 180],
        genres: ['Electronic', 'Hip-Hop', 'Rock', 'Dance', 'Metal'],
        minEnergy: 0.7
      },
      {
        type: 'sleep_sounds',
        name: 'Sleep Sounds 😴',
        description: 'Успокаивающая музыка для сна',
        timeRange: [22, 5],
        bpmRange: [40, 80],
        genres: ['Ambient', 'Classical', 'Meditation', 'Nature Sounds'],
        maxEnergy: 0.3,
        preferInstrumental: true
      }
    ];
  }

  /**
   * Генерация умного микса по типу
   */
  async generateSmartMix(mixType, userId = null, limit = 50) {
    try {
      const mixConfig = this.getAvailableMixes().find(m => m.type === mixType);
      if (!mixConfig) {
        throw new Error(`Unknown mix type: ${mixType}`);
      }

      console.log(`🎵 Generating ${mixConfig.name} for user ${userId || 'anonymous'}`);

      // Базовые условия поиска
      const whereConditions = {
        isPublic: true,
        streamUrl: { [Op.not]: null }
      };

      // Фильтр по жанрам
      if (mixConfig.genres && mixConfig.genres.length > 0) {
        whereConditions.genre = {
          [Op.or]: mixConfig.genres.map(g => ({ [Op.iLike]: `%${g}%` }))
        };
      }

      // Фильтр по BPM (если есть данные)
      if (mixConfig.bpmRange) {
        whereConditions.bpm = {
          [Op.gte]: mixConfig.bpmRange[0],
          [Op.lte]: mixConfig.bpmRange[1]
        };
      }

      // Фильтр по энергетике (если есть ML-данные)
      if (mixConfig.minEnergy) {
        whereConditions.energy = { [Op.gte]: mixConfig.minEnergy };
      }
      if (mixConfig.maxEnergy) {
        whereConditions.energy = { [Op.lte]: mixConfig.maxEnergy };
      }

      // Фильтр инструментальных треков
      if (mixConfig.preferInstrumental) {
        whereConditions.isInstrumental = true;
      }

      // Персонализация на основе истории (если авторизован)
      let personalizedTrackIds = [];
      if (userId) {
        personalizedTrackIds = await this.getPersonalizedTrackIds(userId, mixConfig);
      }

      // Поиск треков
      let tracks = await Track.findAll({
        where: whereConditions,
        limit: limit * 2, // Берем больше для лучшего разнообразия
        order: [
          ['playCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        attributes: [
          'id', 'title', 'artist', 'album', 'genre', 'duration',
          'coverUrl', 'streamUrl', 'playCount', 'bpm', 'energy', 'year'
        ]
      });

      // Если недостаточно треков с BPM - ищем без этого фильтра
      if (tracks.length < limit / 2) {
        console.log(`⚠️ Not enough tracks with BPM filter, expanding search...`);
        delete whereConditions.bpm;
        delete whereConditions.energy;
        
        tracks = await Track.findAll({
          where: whereConditions,
          limit: limit * 2,
          order: [
            ['playCount', 'DESC'],
            ['createdAt', 'DESC']
          ],
          attributes: [
            'id', 'title', 'artist', 'album', 'genre', 'duration',
            'coverUrl', 'streamUrl', 'playCount', 'year'
          ]
        });
      }

      // Добавляем персонализированный скоринг
      if (personalizedTrackIds.length > 0) {
        tracks = tracks.map(track => {
          const score = personalizedTrackIds.includes(track.id) ? 10 : 0;
          return { ...track.toJSON(), personalScore: score };
        });

        // Сортируем с учетом персонализации
        tracks.sort((a, b) => {
          const scoreA = (a.personalScore || 0) + Math.log(a.playCount + 1);
          const scoreB = (b.personalScore || 0) + Math.log(b.playCount + 1);
          return scoreB - scoreA;
        });
      }

      // Применяем shuffle для разнообразия (но сохраняем топ-20%)
      const topCount = Math.floor(tracks.length * 0.2);
      const topTracks = tracks.slice(0, topCount);
      const restTracks = this.shuffleArray(tracks.slice(topCount));

      const finalTracks = [...topTracks, ...restTracks].slice(0, limit);

      console.log(`✅ Generated ${finalTracks.length} tracks for ${mixConfig.name}`);

      return {
        success: true,
        mix: mixConfig,
        tracks: finalTracks,
        total: finalTracks.length,
        isPersonalized: userId !== null
      };

    } catch (error) {
      console.error('Error generating smart mix:', error);
      throw error;
    }
  }

  /**
   * Персонализированные треки на основе истории
   */
  async getPersonalizedTrackIds(userId, mixConfig) {
    try {
      // Получаем историю прослушиваний за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const history = await ListeningHistory.findAll({
        where: {
          userId,
          listenedAt: { [Op.gte]: thirtyDaysAgo }
        },
        include: [{
          model: Track,
          as: 'track',
          attributes: ['id', 'genre', 'artist', 'bpm', 'energy']
        }],
        raw: true
      });

      if (history.length === 0) return [];

      // Извлекаем предпочтения пользователя
      const genreCount = {};
      const artistCount = {};
      const trackIds = [];

      history.forEach(entry => {
        const genre = entry['track.genre'];
        const artist = entry['track.artist'];
        const trackId = entry['track.id'];

        if (genre) genreCount[genre] = (genreCount[genre] || 0) + 1;
        if (artist) artistCount[artist] = (artistCount[artist] || 0) + 1;
        if (trackId) trackIds.push(trackId);
      });

      // Находим похожие треки по жанрам и исполнителям
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0]);

      const topArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);

      // Ищем треки этих жанров/исполнителей
      const whereConditions = {
        id: { [Op.notIn]: trackIds }, // Исключаем уже прослушанные
        [Op.or]: []
      };

      if (topGenres.length > 0) {
        whereConditions[Op.or].push({
          genre: { [Op.or]: topGenres.map(g => ({ [Op.iLike]: `%${g}%` })) }
        });
      }

      if (topArtists.length > 0) {
        whereConditions[Op.or].push({
          artist: { [Op.in]: topArtists }
        });
      }

      if (whereConditions[Op.or].length === 0) return [];

      const similarTracks = await Track.findAll({
        where: whereConditions,
        limit: 20,
        attributes: ['id']
      });

      return similarTracks.map(t => t.id);

    } catch (error) {
      console.error('Error getting personalized tracks:', error);
      return [];
    }
  }

  /**
   * Автоматический выбор микса по времени суток
   */
  async getAutoMix(userId = null, limit = 50) {
    try {
      const currentHour = new Date().getHours();
      const availableMixes = this.getAvailableMixes();

      // Находим подходящий микс по времени
      const suitableMix = availableMixes.find(mix => {
        if (!mix.timeRange) return false;
        const [startHour, endHour] = mix.timeRange;
        
        // Обработка ночного диапазона (например, 22-5)
        if (startHour > endHour) {
          return currentHour >= startHour || currentHour < endHour;
        }
        
        return currentHour >= startHour && currentHour < endHour;
      });

      if (!suitableMix) {
        // Fallback: возвращаем самый популярный микс
        console.log(`⚠️ No suitable mix for hour ${currentHour}, using default`);
        return await this.generateSmartMix('focus_flow', userId, limit);
      }

      console.log(`🕐 Auto-selected ${suitableMix.name} for hour ${currentHour}`);
      return await this.generateSmartMix(suitableMix.type, userId, limit);

    } catch (error) {
      console.error('Error getting auto mix:', error);
      throw error;
    }
  }

  /**
   * Генерация всех умных миксов для пользователя
   */
  async generateAllMixesForUser(userId, limit = 30) {
    try {
      const mixes = this.getAvailableMixes();
      const results = [];

      for (const mix of mixes) {
        try {
          const result = await this.generateSmartMix(mix.type, userId, limit);
          results.push(result);
        } catch (error) {
          console.error(`Error generating ${mix.type}:`, error.message);
        }
      }

      return {
        success: true,
        total: results.length,
        mixes: results
      };
    } catch (error) {
      console.error('Error generating all mixes:', error);
      throw error;
    }
  }

  /**
   * Обновление BPM и энергетики треков (для ML-модели)
   * Временная заглушка - позже можно интегрировать librosa или Essentia
   */
  async updateTrackAnalytics(trackId) {
    try {
      // TODO: Интеграция с Python/librosa для анализа BPM и energy
      // Пока просто логируем
      console.log(`[Smart Mixes] Track ${trackId} needs BPM/energy analysis`);
      
      // Заглушка: случайные значения для демо
      const track = await Track.findByPk(trackId);
      if (!track) return;

      // Эвристика: оцениваем по жанру
      const genreEnergyMap = {
        'Electronic': { bpm: [120, 140], energy: 0.7 },
        'Rock': { bpm: [110, 140], energy: 0.75 },
        'Pop': { bpm: [100, 130], energy: 0.65 },
        'Hip-Hop': { bpm: [80, 110], energy: 0.6 },
        'Jazz': { bpm: [90, 120], energy: 0.4 },
        'Classical': { bpm: [60, 100], energy: 0.3 },
        'Ambient': { bpm: [60, 90], energy: 0.2 }
      };

      const genre = track.genre || 'Pop';
      const genreData = Object.entries(genreEnergyMap).find(([g]) => 
        genre.toLowerCase().includes(g.toLowerCase())
      );

      if (genreData) {
        const [, data] = genreData;
        const bpmRange = data.bpm;
        const estimatedBpm = Math.floor(Math.random() * (bpmRange[1] - bpmRange[0]) + bpmRange[0]);
        const estimatedEnergy = data.energy + (Math.random() * 0.2 - 0.1);

        await track.update({
          bpm: estimatedBpm,
          energy: Math.max(0, Math.min(1, estimatedEnergy)),
          isInstrumental: !track.artist || track.genre?.toLowerCase().includes('instrumental')
        });

        console.log(`✅ Updated track ${trackId}: BPM=${estimatedBpm}, Energy=${estimatedEnergy.toFixed(2)}`);
      }

    } catch (error) {
      console.error('Error updating track analytics:', error);
    }
  }

  /**
   * Batch-обновление аналитики для всех треков без BPM
   */
  async updateAllTrackAnalytics(limit = 100) {
    try {
      console.log('🔄 Starting batch analytics update...');

      const tracksWithoutBpm = await Track.findAll({
        where: {
          [Op.or]: [
            { bpm: null },
            { energy: null }
          ]
        },
        limit
      });

      console.log(`📊 Found ${tracksWithoutBpm.length} tracks without analytics`);

      for (const track of tracksWithoutBpm) {
        await this.updateTrackAnalytics(track.id);
      }

      console.log('✅ Batch analytics update completed');

      return {
        success: true,
        updated: tracksWithoutBpm.length
      };

    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }

  /**
   * Утилита: перемешивание массива (Fisher-Yates shuffle)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = new SmartMixesService();

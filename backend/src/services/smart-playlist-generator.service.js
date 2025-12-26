/**
 * Smart Playlist Generator Service
 * Умные алгоритмы автоматического создания музыкальных подборок
 * 
 * Использует:
 * - ML-анализ аудио (energy, bpm, isInstrumental)
 * - Историю прослушиваний
 * - Предпочтения пользователя
 * - Жанровый анализ
 * - Временные паттерны
 */

const { Track, ListeningHistory, TrackLike, Album, sequelize } = require('../models');
const { Op } = require('sequelize');

class SmartPlaylistGenerator {
  /**
   * Генерация подборки по настроению
   * @param {string} mood - happy, sad, energetic, calm, romantic, melancholic
   * @param {number} limit - количество треков
   */
  async generateByMood(mood, limit = 50) {
    const moodConfigs = {
      happy: { energy: [0.6, 1.0], tempo: 'fast', excludeGenres: ['sad', 'melancholic'] },
      sad: { energy: [0.0, 0.4], tempo: 'slow', genres: ['ballad', 'blues', 'soul'] },
      energetic: { energy: [0.7, 1.0], tempo: 'fast', excludeInstrumental: true },
      calm: { energy: [0.0, 0.3], tempo: 'slow', preferInstrumental: true },
      romantic: { energy: [0.3, 0.6], tempo: 'medium', genres: ['pop', 'r&b', 'soul'] },
      melancholic: { energy: [0.2, 0.5], tempo: 'slow', genres: ['indie', 'alternative'] },
      focus: { energy: [0.3, 0.5], preferInstrumental: true },
      party: { energy: [0.8, 1.0], tempo: 'fast', genres: ['pop', 'dance', 'electronic'] }
    };

    const config = moodConfigs[mood] || moodConfigs.happy;
    const where = {
      [Op.and]: [
        this._buildValidTrackFilter(),
        config.energy ? { energy: { [Op.between]: config.energy } } : {},
        config.excludeInstrumental ? { isInstrumental: false } : {},
        config.preferInstrumental ? { isInstrumental: true } : {}
      ]
    };

    if (config.genres) {
      where.genre = { [Op.in]: config.genres };
    }
    if (config.excludeGenres) {
      where.genre = { [Op.notIn]: config.excludeGenres };
    }

    const tracks = await Track.findAll({
      where,
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['playCount', 'DESC'],
        [sequelize.fn('RANDOM')]
      ],
      limit
    });

    return {
      name: `Настроение: ${this._getMoodName(mood)}`,
      description: this._getMoodDescription(mood),
      tracks,
      mood,
      algorithm: 'mood-based'
    };
  }

  /**
   * Подборка для тренировки (высокая энергия, быстрый темп)
   */
  async generateWorkoutPlaylist(limit = 40) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { energy: { [Op.gte]: 0.7 } },
          { bpm: { [Op.gte]: 120 } },
          { isInstrumental: false }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.literal('energy * 0.6 + (bpm / 200.0) * 0.4'), 'DESC'],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: '💪 Тренировка',
      description: 'Энергичные треки для активных занятий спортом',
      tracks,
      tags: ['workout', 'energy', 'sport'],
      algorithm: 'workout'
    };
  }

  /**
   * Подборка для концентрации (средняя энергия, инструментальная музыка)
   */
  async generateFocusPlaylist(limit = 50) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { energy: { [Op.between]: [0.3, 0.6] } },
          { 
            [Op.or]: [
              { isInstrumental: true },
              { genre: { [Op.in]: ['ambient', 'classical', 'electronic', 'lo-fi'] } }
            ]
          }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.fn('RANDOM')],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: '🎯 Концентрация',
      description: 'Спокойная музыка для работы и учебы',
      tracks,
      tags: ['focus', 'work', 'study'],
      algorithm: 'focus'
    };
  }

  /**
   * Подборка для сна (очень низкая энергия)
   */
  async generateSleepPlaylist(limit = 30) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { energy: { [Op.lte]: 0.25 } },
          { bpm: { [Op.lte]: 80 } },
          { isInstrumental: true }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['energy', 'ASC'],
        [sequelize.fn('RANDOM')]
      ],
      limit
    });

    return {
      name: '😴 Для сна',
      description: 'Расслабляющая музыка для спокойного отдыха',
      tracks,
      tags: ['sleep', 'relax', 'ambient'],
      algorithm: 'sleep'
    };
  }

  /**
   * Вечерняя подборка (средне-низкая энергия)
   */
  async generateEveningPlaylist(limit = 40) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { energy: { [Op.between]: [0.25, 0.55] } },
          { genre: { [Op.in]: ['jazz', 'soul', 'r&b', 'indie', 'alternative'] } }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.fn('RANDOM')],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: '🌆 Вечерний чилл',
      description: 'Расслабленная музыка для вечера',
      tracks,
      tags: ['evening', 'chill', 'relax'],
      algorithm: 'evening'
    };
  }

  /**
   * Ретро подборка (старые треки)
   */
  async generateRetroPlaylist(limit = 50) {
    const currentYear = new Date().getFullYear();
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { year: { [Op.lte]: currentYear - 10 } },
          { year: { [Op.gte]: 1960 } }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['year', 'ASC'],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: '📻 Ретро хиты',
      description: 'Классические треки прошлых лет',
      tracks,
      tags: ['retro', 'oldies', 'classics'],
      algorithm: 'retro'
    };
  }

  /**
   * Открытия недели (новые треки с хорошей статистикой)
   */
  async generateWeeklyDiscovery(limit = 30) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { createdAt: { [Op.gte]: weekAgo } },
          { playCount: { [Op.gte]: 5 } }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.literal('"Track"."playCount" / EXTRACT(EPOCH FROM (NOW() - "Track"."createdAt")) * 86400'), 'DESC']
      ],
      limit
    });

    return {
      name: '🔥 Открытия недели',
      description: 'Лучшие новинки последних 7 дней',
      tracks,
      tags: ['new', 'trending', 'discovery'],
      algorithm: 'weekly-discovery'
    };
  }

  /**
   * Похожие треки (на основе одного трека)
   * @param {number} trackId - ID исходного трека
   */
  async generateSimilarTracks(trackId, limit = 25) {
    const sourceTrack = await Track.findByPk(trackId);
    if (!sourceTrack) throw new Error('Track not found');

    // Ищем похожие по: жанру, энергии, темпу, исполнителю
    const energyRange = 0.15;
    const bpmRange = 20;

    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { id: { [Op.ne]: trackId } },
          {
            [Op.or]: [
              { genre: sourceTrack.genre },
              { artist: sourceTrack.artist },
              sourceTrack.energy ? { energy: { [Op.between]: [sourceTrack.energy - energyRange, sourceTrack.energy + energyRange] } } : {},
              sourceTrack.bpm ? { bpm: { [Op.between]: [sourceTrack.bpm - bpmRange, sourceTrack.bpm + bpmRange] } } : {}
            ]
          }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.fn('RANDOM')],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: `Похожие на "${sourceTrack.title}"`,
      description: `Треки, похожие на ${sourceTrack.artist} - ${sourceTrack.title}`,
      tracks,
      sourceTrack,
      algorithm: 'similar-tracks'
    };
  }

  /**
   * Персональный радар (на основе истории пользователя)
   * @param {number} userId
   */
  async generatePersonalRadar(userId, limit = 50) {
    // Анализируем последние 100 прослушиваний
    const recentHistory = await ListeningHistory.findAll({
      where: { userId },
      include: [{ model: Track, as: 'track' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    if (recentHistory.length === 0) {
      // Если истории нет, возвращаем топ треки
      return this.generateTopTracks(limit);
    }

    // Извлекаем жанры, исполнителей, средние параметры
    const genres = new Map();
    const artists = new Map();
    let avgEnergy = 0;
    let energyCount = 0;

    recentHistory.forEach(item => {
      if (!item.track) return;
      
      if (item.track.genre) {
        genres.set(item.track.genre, (genres.get(item.track.genre) || 0) + 1);
      }
      if (item.track.artist) {
        artists.set(item.track.artist, (artists.get(item.track.artist) || 0) + 1);
      }
      if (item.track.energy !== null) {
        avgEnergy += item.track.energy;
        energyCount++;
      }
    });

    avgEnergy = energyCount > 0 ? avgEnergy / energyCount : 0.5;

    // Топ 3 жанра и 5 исполнителей
    const topGenres = Array.from(genres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const topArtists = Array.from(artists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    // Получаем ID уже прослушанных треков
    const listenedTrackIds = recentHistory
      .filter(item => item.track)
      .map(item => item.track.id);

    // Ищем новые треки на основе предпочтений
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { id: { [Op.notIn]: listenedTrackIds } },
          {
            [Op.or]: [
              { genre: { [Op.in]: topGenres } },
              { artist: { [Op.in]: topArtists } },
              { energy: { [Op.between]: [Math.max(0, avgEnergy - 0.2), Math.min(1, avgEnergy + 0.2)] } }
            ]
          }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        [sequelize.fn('RANDOM')],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: '🎯 Твой радар',
      description: 'Персональная подборка на основе твоих вкусов',
      tracks,
      metadata: {
        topGenres,
        topArtists: topArtists.slice(0, 3),
        avgEnergy
      },
      algorithm: 'personal-radar'
    };
  }

  /**
   * Звуковая дорожка дня (mix из разных настроений)
   */
  async generateDailySoundtrack(userId = null, limit = 60) {
    const hour = new Date().getHours();
    let moodDistribution;

    // Утро (6-12): энергичное + фокус
    if (hour >= 6 && hour < 12) {
      moodDistribution = [
        { mood: 'energetic', count: 25 },
        { mood: 'happy', count: 20 },
        { mood: 'focus', count: 15 }
      ];
    }
    // День (12-18): продуктивность + разнообразие
    else if (hour >= 12 && hour < 18) {
      moodDistribution = [
        { mood: 'focus', count: 20 },
        { mood: 'energetic', count: 20 },
        { mood: 'happy', count: 20 }
      ];
    }
    // Вечер (18-23): расслабление
    else if (hour >= 18 && hour < 23) {
      moodDistribution = [
        { mood: 'calm', count: 25 },
        { mood: 'romantic', count: 20 },
        { mood: 'happy', count: 15 }
      ];
    }
    // Ночь (23-6): спокойное
    else {
      moodDistribution = [
        { mood: 'calm', count: 30 },
        { mood: 'melancholic', count: 20 },
        { mood: 'focus', count: 10 }
      ];
    }

    const allTracks = [];
    for (const { mood, count } of moodDistribution) {
      const result = await this.generateByMood(mood, count);
      allTracks.push(...result.tracks);
    }

    // Перемешиваем плавно
    const shuffled = this._smoothShuffle(allTracks);

    return {
      name: '🎵 Звуковая дорожка дня',
      description: 'Идеальный микс на целый день',
      tracks: shuffled.slice(0, limit),
      timeOfDay: hour,
      algorithm: 'daily-soundtrack'
    };
  }

  /**
   * Топ треки платформы
   */
  async generateTopTracks(limit = 100) {
    const tracks = await Track.findAll({
      where: this._buildValidTrackFilter(),
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['playCount', 'DESC'],
        ['likeCount', 'DESC']
      ],
      limit
    });

    return {
      name: '🔥 Топ треки',
      description: 'Самые популярные треки платформы',
      tracks,
      algorithm: 'top-tracks'
    };
  }

  /**
   * Жанровая подборка
   * @param {string} genre
   */
  async generateGenrePlaylist(genre, limit = 50) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { genre: { [Op.iLike]: `%${genre}%` } }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['playCount', 'DESC'],
        [sequelize.fn('RANDOM')]
      ],
      limit
    });

    return {
      name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} хиты`,
      description: `Лучшее в жанре ${genre}`,
      tracks,
      genre,
      algorithm: 'genre-based'
    };
  }

  /**
   * Подборка по BPM диапазону (для DJ, танцев)
   */
  async generateBPMPlaylist(minBpm, maxBpm, limit = 50) {
    const tracks = await Track.findAll({
      where: {
        [Op.and]: [
          this._buildValidTrackFilter(),
          { bpm: { [Op.between]: [minBpm, maxBpm] } }
        ]
      },
      include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }],
      order: [
        ['bpm', 'ASC'],
        ['playCount', 'DESC']
      ],
      limit
    });

    return {
      name: `${minBpm}-${maxBpm} BPM Mix`,
      description: `Треки с темпом ${minBpm}-${maxBpm} ударов в минуту`,
      tracks,
      bpmRange: [minBpm, maxBpm],
      algorithm: 'bpm-based'
    };
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  /**
   * Базовый фильтр для валидных треков
   */
  _buildValidTrackFilter() {
    return {
      [Op.or]: [
        { streamUrl: { [Op.ne]: null } },
        { filePath: { [Op.like]: 'http%' } },
        {
          [Op.and]: [
            { filePath: { [Op.ne]: null } },
            { filePath: { [Op.notLike]: '/uploads/%' } }
          ]
        }
      ]
    };
  }

  /**
   * Плавное перемешивание (избегаем похожих треков подряд)
   */
  _smoothShuffle(tracks) {
    if (tracks.length <= 1) return tracks;

    const result = [];
    const remaining = [...tracks];
    let lastTrack = null;

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const track = remaining[i];
        let score = Math.random();

        // Избегаем одинаковых исполнителей подряд
        if (lastTrack && track.artist === lastTrack.artist) {
          score *= 0.3;
        }
        // Избегаем одинаковых жанров подряд
        if (lastTrack && track.genre === lastTrack.genre) {
          score *= 0.7;
        }

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      const selectedTrack = remaining.splice(bestIndex, 1)[0];
      result.push(selectedTrack);
      lastTrack = selectedTrack;
    }

    return result;
  }

  /**
   * Название настроения на русском
   */
  _getMoodName(mood) {
    const names = {
      happy: 'Веселое',
      sad: 'Грустное',
      energetic: 'Энергичное',
      calm: 'Спокойное',
      romantic: 'Романтическое',
      melancholic: 'Меланхоличное',
      focus: 'Фокус',
      party: 'Вечеринка'
    };
    return names[mood] || mood;
  }

  /**
   * Описание настроения
   */
  _getMoodDescription(mood) {
    const descriptions = {
      happy: 'Позитивные и радостные треки для хорошего настроения',
      sad: 'Грустные мелодии для размышлений',
      energetic: 'Зажигательная музыка, заряжающая энергией',
      calm: 'Спокойная музыка для расслабления',
      romantic: 'Романтические композиции для двоих',
      melancholic: 'Меланхоличные треки для задумчивого настроения',
      focus: 'Музыка для концентрации и продуктивности',
      party: 'Танцевальные хиты для вечеринки'
    };
    return descriptions[mood] || 'Подборка треков';
  }
}

module.exports = new SmartPlaylistGenerator();

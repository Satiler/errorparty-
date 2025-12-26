/**
 * Smart Playlists Controller
 * API для умных музыкальных подборок
 */

const smartPlaylistGenerator = require('../../services/smart-playlist-generator.service');
const { Playlist, PlaylistTrack, Track, Album } = require('../../models');

class SmartPlaylistsController {
  /**
   * GET /api/smart-playlists/mood/:mood
   * Генерация подборки по настроению
   */
  async getByMood(req, res) {
    try {
      const { mood } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const validMoods = ['happy', 'sad', 'energetic', 'calm', 'romantic', 'melancholic', 'focus', 'party'];
      if (!validMoods.includes(mood)) {
        return res.status(400).json({ error: `Invalid mood. Valid values: ${validMoods.join(', ')}` });
      }

      const result = await smartPlaylistGenerator.generateByMood(mood, limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating mood playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/workout
   * Подборка для тренировки
   */
  async getWorkout(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 40;
      const result = await smartPlaylistGenerator.generateWorkoutPlaylist(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating workout playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/focus
   * Подборка для концентрации
   */
  async getFocus(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const result = await smartPlaylistGenerator.generateFocusPlaylist(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating focus playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/sleep
   * Подборка для сна
   */
  async getSleep(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 30;
      const result = await smartPlaylistGenerator.generateSleepPlaylist(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating sleep playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/evening
   * Вечерняя подборка
   */
  async getEvening(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 40;
      const result = await smartPlaylistGenerator.generateEveningPlaylist(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating evening playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/retro
   * Ретро подборка
   */
  async getRetro(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const result = await smartPlaylistGenerator.generateRetroPlaylist(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating retro playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/weekly-discovery
   * Открытия недели
   */
  async getWeeklyDiscovery(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 30;
      const result = await smartPlaylistGenerator.generateWeeklyDiscovery(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating weekly discovery:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/similar/:trackId
   * Похожие треки
   */
  async getSimilar(req, res) {
    try {
      const { trackId } = req.params;
      const limit = parseInt(req.query.limit) || 25;
      const result = await smartPlaylistGenerator.generateSimilarTracks(parseInt(trackId), limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating similar tracks:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/personal-radar
   * Персональный радар (требует авторизации)
   */
  async getPersonalRadar(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = parseInt(req.query.limit) || 50;
      const result = await smartPlaylistGenerator.generatePersonalRadar(userId, limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating personal radar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/daily-soundtrack
   * Звуковая дорожка дня
   */
  async getDailySoundtrack(req, res) {
    try {
      const userId = req.user?.id || null;
      const limit = parseInt(req.query.limit) || 60;
      const result = await smartPlaylistGenerator.generateDailySoundtrack(userId, limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating daily soundtrack:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/top
   * Топ треки
   */
  async getTop(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const result = await smartPlaylistGenerator.generateTopTracks(limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating top tracks:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/genre/:genre
   * Подборка по жанру
   */
  async getByGenre(req, res) {
    try {
      const { genre } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const result = await smartPlaylistGenerator.generateGenrePlaylist(genre, limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating genre playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/bpm/:min/:max
   * Подборка по BPM диапазону
   */
  async getByBPM(req, res) {
    try {
      const { min, max } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const result = await smartPlaylistGenerator.generateBPMPlaylist(parseInt(min), parseInt(max), limit);
      res.json(result);
    } catch (error) {
      console.error('Error generating BPM playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/smart-playlists/save
   * Сохранить сгенерированную подборку как плейлист
   */
  async saveAsPlaylist(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, description, trackIds, algorithm } = req.body;

      if (!name || !trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
        return res.status(400).json({ error: 'Name and trackIds are required' });
      }

      // Создаем плейлист
      const playlist = await Playlist.create({
        userId,
        name,
        description: description || `Умная подборка (${algorithm || 'custom'})`,
        type: 'user',
        isPublic: false,
        metadata: { generatedBy: algorithm, generatedAt: new Date() }
      });

      // Добавляем треки
      for (let i = 0; i < trackIds.length; i++) {
        await PlaylistTrack.create({
          playlistId: playlist.id,
          trackId: trackIds[i],
          position: i + 1
        });
      }

      // Возвращаем с треками
      const savedPlaylist = await Playlist.findByPk(playlist.id, {
        include: [{
          model: Track,
          as: 'tracks',
          through: { attributes: ['position'] },
          include: [{ model: Album, as: 'album', attributes: ['id', 'coverUrl'] }]
        }]
      });

      res.json(savedPlaylist);
    } catch (error) {
      console.error('Error saving smart playlist:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/smart-playlists/available
   * Список доступных умных подборок
   */
  async getAvailable(req, res) {
    try {
      const playlists = [
        {
          id: 'mood-happy',
          name: 'Настроение: Веселое',
          endpoint: '/api/smart-playlists/mood/happy',
          icon: '😊',
          description: 'Позитивные и радостные треки'
        },
        {
          id: 'mood-sad',
          name: 'Настроение: Грустное',
          endpoint: '/api/smart-playlists/mood/sad',
          icon: '😢',
          description: 'Грустные мелодии для размышлений'
        },
        {
          id: 'mood-energetic',
          name: 'Настроение: Энергичное',
          endpoint: '/api/smart-playlists/mood/energetic',
          icon: '⚡',
          description: 'Зажигательная музыка'
        },
        {
          id: 'mood-calm',
          name: 'Настроение: Спокойное',
          endpoint: '/api/smart-playlists/mood/calm',
          icon: '😌',
          description: 'Спокойная музыка для расслабления'
        },
        {
          id: 'mood-party',
          name: 'Настроение: Вечеринка',
          endpoint: '/api/smart-playlists/mood/party',
          icon: '🎉',
          description: 'Танцевальные хиты'
        },
        {
          id: 'workout',
          name: 'Тренировка',
          endpoint: '/api/smart-playlists/workout',
          icon: '💪',
          description: 'Энергичные треки для спорта'
        },
        {
          id: 'focus',
          name: 'Концентрация',
          endpoint: '/api/smart-playlists/focus',
          icon: '🎯',
          description: 'Музыка для работы и учебы'
        },
        {
          id: 'sleep',
          name: 'Для сна',
          endpoint: '/api/smart-playlists/sleep',
          icon: '😴',
          description: 'Расслабляющая музыка'
        },
        {
          id: 'evening',
          name: 'Вечерний чилл',
          endpoint: '/api/smart-playlists/evening',
          icon: '🌆',
          description: 'Музыка для вечера'
        },
        {
          id: 'retro',
          name: 'Ретро хиты',
          endpoint: '/api/smart-playlists/retro',
          icon: '📻',
          description: 'Классика прошлых лет'
        },
        {
          id: 'weekly',
          name: 'Открытия недели',
          endpoint: '/api/smart-playlists/weekly-discovery',
          icon: '🔥',
          description: 'Новинки последних 7 дней'
        },
        {
          id: 'daily',
          name: 'Звуковая дорожка дня',
          endpoint: '/api/smart-playlists/daily-soundtrack',
          icon: '🎵',
          description: 'Идеальный микс на весь день'
        },
        {
          id: 'personal',
          name: 'Твой радар',
          endpoint: '/api/smart-playlists/personal-radar',
          icon: '🎯',
          requiresAuth: true,
          description: 'Персональная подборка на основе твоих вкусов'
        },
        {
          id: 'top',
          name: 'Топ треки',
          endpoint: '/api/smart-playlists/top',
          icon: '⭐',
          description: 'Самые популярные треки'
        }
      ];

      res.json(playlists);
    } catch (error) {
      console.error('Error getting available playlists:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SmartPlaylistsController();

const { Track, AutoPlaylist, ListeningHistory, TrackLike } = require('../../models');
const { Sequelize } = require('sequelize');
const userPreferencesService = require('./user-preferences.service');
const musicAutoSyncService = require('./music-auto-sync.service');

/**
 * Сервис генерации умных плейлистов (Плейлист дня, Премьеры, Тайник, Чарты)
 */
class SmartPlaylistsService {

  /**
   * Генерация "Плейлиста дня" - персональная подборка на основе предпочтений
   */
  async generateDailyPlaylist(userId, size = 30) {
    console.log(`🎵 Генерация Плейлиста дня для пользователя ${userId}`);

    const preferences = await userPreferencesService.getUserPreferences(userId);
    
    // Получаем уже прослушанные треки за последние 7 дней (чтобы не повторять)
    const recentlyPlayed = await ListeningHistory.findAll({
      where: {
        userId,
        listenedAt: {
          [Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: ['trackId']
    });
    const recentTrackIds = recentlyPlayed.map(h => h.trackId);

    // Строим запрос: 70% любимые жанры, 20% любимые исполнители, 10% случайные
    const favoriteGenreTracks = await Track.findAll({
      where: {
        genre: { [Sequelize.Op.in]: preferences.favoriteGenres },
        id: { [Sequelize.Op.notIn]: recentTrackIds }
      },
      limit: Math.floor(size * 0.7),
      order: Sequelize.literal('RANDOM()')
    });

    const favoriteArtistTracks = await Track.findAll({
      where: {
        artist: { [Sequelize.Op.in]: preferences.favoriteArtists },
        id: { [Sequelize.Op.notIn]: [...recentTrackIds, ...favoriteGenreTracks.map(t => t.id)] }
      },
      limit: Math.floor(size * 0.2),
      order: Sequelize.literal('RANDOM()')
    });

    const randomTracks = await Track.findAll({
      where: {
        id: { [Sequelize.Op.notIn]: [
          ...recentTrackIds, 
          ...favoriteGenreTracks.map(t => t.id),
          ...favoriteArtistTracks.map(t => t.id)
        ]}
      },
      limit: Math.ceil(size * 0.1),
      order: Sequelize.literal('RANDOM()')
    });

    const allTracks = [...favoriteGenreTracks, ...favoriteArtistTracks, ...randomTracks];
    const trackIds = allTracks.map(t => t.id);

    // Сохраняем плейлист
    const [playlist, created] = await AutoPlaylist.findOrCreate({
      where: { userId, type: 'daily' },
      defaults: {
        name: 'Плейлист дня',
        description: 'Персональная подборка на основе ваших предпочтений',
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires tomorrow
        metadata: {
          algorithm: 'preference-based-v1',
          genreSplit: { favorite: 70, artists: 20, random: 10 }
        }
      }
    });

    if (!created) {
      await playlist.update({
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    console.log(`✅ Плейлист дня: ${trackIds.length} треков`);
    return { playlist, tracks: allTracks };
  }

  /**
   * Генерация "Премьер" - только новые релизы
   */
  async generatePremierePlaylist(userId, size = 20) {
    console.log(`🆕 Генерация Премьер для пользователя ${userId}`);

    const preferences = await userPreferencesService.getUserPreferences(userId);

    // Ищем новинки, совпадающие с предпочтениями пользователя
    const newTracks = await Track.findAll({
      where: {
        [Sequelize.Op.and]: [
          {
            features: {
              [Sequelize.Op.contains]: { isNew: true }
            }
          },
          {
            [Sequelize.Op.or]: [
              { genre: { [Sequelize.Op.in]: preferences.favoriteGenres } },
              { artist: { [Sequelize.Op.in]: preferences.favoriteArtists } }
            ]
          }
        ]
      },
      limit: Math.floor(size * 0.8),
      order: [['createdAt', 'DESC']]
    });

    // Добавляем случайные новинки для разнообразия
    const randomNewTracks = await Track.findAll({
      where: {
        features: {
          [Sequelize.Op.contains]: { isNew: true }
        },
        id: { [Sequelize.Op.notIn]: newTracks.map(t => t.id) }
      },
      limit: Math.ceil(size * 0.2),
      order: [['createdAt', 'DESC']]
    });

    const allTracks = [...newTracks, ...randomNewTracks];
    const trackIds = allTracks.map(t => t.id);

    const [playlist, created] = await AutoPlaylist.findOrCreate({
      where: { userId, type: 'premiere' },
      defaults: {
        name: 'Премьеры',
        description: 'Свежие релизы под ваш вкус',
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          algorithm: 'new-releases-v1',
          preferenceMatch: 80
        }
      }
    });

    if (!created) {
      await playlist.update({
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    console.log(`✅ Премьеры: ${trackIds.length} треков`);
    return { playlist, tracks: allTracks };
  }

  /**
   * Генерация "Тайника" - редкие треки для исследования
   */
  async generateStashPlaylist(userId, size = 25) {
    console.log(`🔍 Генерация Тайника для пользователя ${userId}`);

    const preferences = await userPreferencesService.getUserPreferences(userId);

    // Находим треки, которые пользователь НЕ слушал
    const listenedTrackIds = await ListeningHistory.findAll({
      where: { userId },
      attributes: ['trackId'],
      raw: true
    }).then(rows => rows.map(r => r.trackId));

    // Ищем малопопулярные треки схожих жанров
    const hiddenGems = await Track.findAll({
      where: {
        id: { [Sequelize.Op.notIn]: listenedTrackIds },
        genre: { [Sequelize.Op.in]: preferences.favoriteGenres },
        playCount: { [Sequelize.Op.lt]: 50 } // мало прослушиваний
      },
      limit: Math.floor(size * 0.6),
      order: Sequelize.literal('RANDOM()')
    });

    // Треки похожих исполнителей
    const similarArtists = await Track.findAll({
      where: {
        id: { [Sequelize.Op.notIn]: [...listenedTrackIds, ...hiddenGems.map(t => t.id)] },
        artist: { [Sequelize.Op.in]: preferences.favoriteArtists }
      },
      limit: Math.floor(size * 0.4),
      order: Sequelize.literal('RANDOM()')
    });

    const allTracks = [...hiddenGems, ...similarArtists];
    const trackIds = allTracks.map(t => t.id);

    const [playlist, created] = await AutoPlaylist.findOrCreate({
      where: { userId, type: 'stash' },
      defaults: {
        name: 'Тайник',
        description: 'Скрытые жемчужины, подобранные для вас',
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          algorithm: 'hidden-gems-v1',
          criteria: { maxPlayCount: 50 }
        }
      }
    });

    if (!created) {
      await playlist.update({
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    console.log(`✅ Тайник: ${trackIds.length} треков`);
    return { playlist, tracks: allTracks };
  }

  /**
   * Генерация "Чартов" - самые популярные треки
   */
  async generateChartsPlaylist(userId, size = 50) {
    console.log(`📊 Генерация Чартов для пользователя ${userId}`);

    // Топ по прослушиваниям
    const topByPlays = await Track.findAll({
      where: {
        features: {
          [Sequelize.Op.contains]: { isChart: true }
        }
      },
      limit: Math.floor(size * 0.7),
      order: [['playCount', 'DESC']]
    });

    // Топ по лайкам
    const topByLikes = await Track.findAll({
      where: {
        id: { [Sequelize.Op.notIn]: topByPlays.map(t => t.id) }
      },
      limit: Math.ceil(size * 0.3),
      order: [['likeCount', 'DESC']]
    });

    const allTracks = [...topByPlays, ...topByLikes];
    const trackIds = allTracks.map(t => t.id);

    const [playlist, created] = await AutoPlaylist.findOrCreate({
      where: { userId, type: 'charts' },
      defaults: {
        name: 'Чарты',
        description: 'Самые популярные треки сейчас',
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          algorithm: 'charts-v1',
          ranking: { plays: 70, likes: 30 }
        }
      }
    });

    if (!created) {
      await playlist.update({
        trackIds,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }

    console.log(`✅ Чарты: ${trackIds.length} треков`);
    return { playlist, tracks: allTracks };
  }

  /**
   * Обновление всех плейлистов пользователя
   */
  async updateAllPlaylists(userId) {
    console.log(`\n🔄 Обновление всех плейлистов для пользователя ${userId}`);

    const results = await Promise.all([
      this.generateDailyPlaylist(userId),
      this.generatePremierePlaylist(userId),
      this.generateStashPlaylist(userId),
      this.generateChartsPlaylist(userId)
    ]);

    console.log(`✨ Все плейлисты обновлены!`);
    return results;
  }

  /**
   * Получение плейлиста с треками
   */
  async getPlaylistWithTracks(userId, type) {
    const playlist = await AutoPlaylist.findOne({
      where: { userId, type }
    });

    if (!playlist) {
      return null;
    }

    // Проверяем, не истек ли плейлист
    if (playlist.expiresAt && new Date() > playlist.expiresAt) {
      console.log(`♻️  Плейлист ${type} истек, генерируем новый`);
      
      switch (type) {
        case 'daily':
          return await this.generateDailyPlaylist(userId);
        case 'premiere':
          return await this.generatePremierePlaylist(userId);
        case 'stash':
          return await this.generateStashPlaylist(userId);
        case 'charts':
          return await this.generateChartsPlaylist(userId);
      }
    }

    // Загружаем треки
    const tracks = await Track.findAll({
      where: {
        id: { [Sequelize.Op.in]: playlist.trackIds }
      }
    });

    return { playlist, tracks };
  }
}

module.exports = new SmartPlaylistsService();

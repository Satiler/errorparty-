const logger = require('../utils/logger');
const config = require('../config/charts-config');
const spotifyService = require('./spotify-charts.service');
const appleMusicService = require('./apple-music-charts.service');
const billboardService = require('./billboard-charts.service');
const shazamService = require('./shazam-charts.service');
const db = require('../config/database');

class PlaylistActualizationService {
  constructor() {
    this.sourceWeights = config.playlistUpdate.sourceWeights;
    this.minScoreThreshold = config.playlistUpdate.minScoreThreshold;
  }

  /**
   * Актуализация плейлиста на основе мировых трендов
   */
  async actualizePlaylist(playlistId) {
    logger.info(`Начало актуализации плейлиста: ${playlistId}`);

    try {
      // Получение текущего состояния плейлиста
      const currentTracks = await this.getCurrentPlaylistTracks(playlistId);
      logger.info(`Текущих треков в плейлисте: ${currentTracks.length}`);

      // Сбор данных из всех источников
      const trendingTracks = await this.fetchAllTrends();
      logger.info(`Найдено трендовых треков: ${trendingTracks.length}`);

      // Расчёт рейтинга треков
      const rankedTracks = this.calculateTrackScores(trendingTracks);
      
      // Фильтрация по минимальному порогу
      const qualifiedTracks = rankedTracks.filter(
        track => track.score >= this.minScoreThreshold
      );
      logger.info(`Треков с достаточным рейтингом: ${qualifiedTracks.length}`);

      // Определение изменений
      const changes = this.calculatePlaylistChanges(
        currentTracks,
        qualifiedTracks,
        playlistId
      );

      logger.info(`Предлагаемые изменения:`, {
        toAdd: changes.toAdd.length,
        toRemove: changes.toRemove.length,
        toKeep: changes.toKeep.length
      });

      // Сохранение предложенных изменений для модерации
      if (config.playlistUpdate.requireModeration) {
        await this.savePendingChanges(playlistId, changes);
        logger.info('Изменения сохранены для модерации');
      } else if (config.playlistUpdate.autoApply) {
        await this.applyChanges(playlistId, changes);
        logger.info('Изменения применены автоматически');
      }

      return {
        playlistId,
        changes,
        requiresModeration: config.playlistUpdate.requireModeration
      };
    } catch (error) {
      logger.error(`Ошибка актуализации плейлиста ${playlistId}:`, error);
      throw error;
    }
  }

  /**
   * Получить текущие треки плейлиста
   */
  async getCurrentPlaylistTracks(playlistId) {
    try {
      const query = `
        SELECT 
          t.id,
          t.title,
          t.artist,
          pt.position,
          pt.added_at,
          EXTRACT(EPOCH FROM (NOW() - pt.added_at)) / 86400 as days_in_playlist
        FROM playlist_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        WHERE pt.playlist_id = $1
        ORDER BY pt.position
      `;

      const result = await db.query(query, [playlistId]);
      return result.rows;
    } catch (error) {
      logger.error('Ошибка получения треков плейлиста:', error);
      return [];
    }
  }

  /**
   * Сбор трендов из всех источников
   */
  async fetchAllTrends() {
    const allTracks = [];

    try {
      // Spotify
      if (config.spotify.enabled) {
        const spotifyTracks = await spotifyService.getTopTracks('global', 100);
        allTracks.push(...spotifyTracks);
        logger.info(`Spotify: ${spotifyTracks.length} треков`);
      }

      // Apple Music
      if (config.appleMusic.enabled) {
        const appleTracks = await appleMusicService.getTopTracks('us', 100);
        allTracks.push(...appleTracks);
        logger.info(`Apple Music: ${appleTracks.length} треков`);
      }

      // Billboard
      if (config.billboard.enabled) {
        const billboardTracks = await billboardService.getGlobal200(100);
        allTracks.push(...billboardTracks);
        logger.info(`Billboard: ${billboardTracks.length} треков`);
      }

      // Shazam
      if (config.shazam.enabled) {
        const shazamTracks = await shazamService.getTopTracks('world', 100);
        allTracks.push(...shazamTracks);
        logger.info(`Shazam: ${shazamTracks.length} треков`);
      }
    } catch (error) {
      logger.error('Ошибка сбора трендов:', error);
    }

    return allTracks;
  }

  /**
   * Расчёт рейтинга треков
   */
  calculateTrackScores(tracks) {
    const trackMap = new Map();

    // Группировка треков по названию и артисту
    tracks.forEach(track => {
      const key = this.normalizeTrackKey(track.title, track.artist);
      
      if (!trackMap.has(key)) {
        trackMap.set(key, {
          title: track.title,
          artist: track.artist,
          sources: [],
          positions: {},
          score: 0
        });
      }

      const trackData = trackMap.get(key);
      trackData.sources.push(track.source);
      trackData.positions[track.source] = track.position || 0;
    });

    // Расчёт взвешенного рейтинга
    const rankedTracks = Array.from(trackMap.values()).map(track => {
      let score = 0;

      // Подсчёт баллов от каждого источника
      Object.keys(this.sourceWeights).forEach(source => {
        if (track.sources.includes(source)) {
          const position = track.positions[source] || 100;
          const positionScore = 1 - (position / 100); // Чем выше позиция, тем больше баллов
          score += this.sourceWeights[source] * positionScore;
        }
      });

      // Бонус за присутствие в нескольких источниках
      const sourceBonus = (track.sources.length - 1) * 0.1;
      score += sourceBonus;

      track.score = Math.min(score, 1); // Нормализация до 0-1
      return track;
    });

    // Сортировка по рейтингу
    return rankedTracks.sort((a, b) => b.score - a.score);
  }

  /**
   * Определение изменений плейлиста
   */
  calculatePlaylistChanges(currentTracks, qualifiedTracks, playlistId) {
    const maxSize = config.playlistUpdate.maxPlaylistSize;
    const updatePercentage = config.playlistUpdate.updatePercentage;
    const trackTTL = config.playlistUpdate.trackTTL;

    // Треки, которые нужно оставить
    const toKeep = currentTracks.filter(track => {
      // Проверка срока жизни
      if (track.days_in_playlist > trackTTL) {
        return false;
      }

      // Проверка наличия в актуальных трендах
      const isStillTrending = qualifiedTracks.some(qt =>
        this.tracksMatch(track, qt)
      );

      return isStillTrending;
    });

    // Треки для удаления
    const toRemove = currentTracks.filter(track => !toKeep.includes(track));

    // Максимальное количество новых треков
    const maxNewTracks = Math.floor(maxSize * updatePercentage);
    const availableSlots = Math.min(
      maxNewTracks,
      maxSize - toKeep.length
    );

    // Треки для добавления (исключая уже существующие)
    const toAdd = qualifiedTracks
      .filter(qt => !currentTracks.some(ct => this.tracksMatch(ct, qt)))
      .slice(0, availableSlots);

    return {
      toKeep,
      toRemove,
      toAdd,
      summary: {
        currentCount: currentTracks.length,
        keepCount: toKeep.length,
        removeCount: toRemove.length,
        addCount: toAdd.length,
        finalCount: toKeep.length + toAdd.length
      }
    };
  }

  /**
   * Сохранение предложенных изменений для модерации
   */
  async savePendingChanges(playlistId, changes) {
    try {
      const query = `
        INSERT INTO playlist_pending_changes (
          playlist_id,
          changes_data,
          status,
          created_at
        ) VALUES ($1, $2, 'pending', NOW())
        RETURNING id
      `;

      const result = await db.query(query, [
        playlistId,
        JSON.stringify(changes)
      ]);

      logger.info(`Изменения сохранены с ID: ${result.rows[0].id}`);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Ошибка сохранения изменений:', error);
      throw error;
    }
  }

  /**
   * Применение изменений к плейлисту
   */
  async applyChanges(playlistId, changes) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Удаление треков
      for (const track of changes.toRemove) {
        await client.query(
          'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2',
          [playlistId, track.id]
        );
      }

      // Добавление новых треков
      for (let i = 0; i < changes.toAdd.length; i++) {
        const track = changes.toAdd[i];
        
        // Поиск трека в БД или создание нового
        const trackId = await this.findOrCreateTrack(client, track);
        
        if (trackId) {
          await client.query(
            `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (playlist_id, track_id) DO NOTHING`,
            [playlistId, trackId, changes.toKeep.length + i + 1]
          );
        }
      }

      // Обновление timestamps плейлиста
      await client.query(
        'UPDATE playlists SET updated_at = NOW() WHERE id = $1',
        [playlistId]
      );

      await client.query('COMMIT');
      logger.info(`Изменения применены к плейлисту ${playlistId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Ошибка применения изменений:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Найти или создать трек в БД
   */
  async findOrCreateTrack(client, track) {
    try {
      // Поиск существующего трека
      const findQuery = `
        SELECT id FROM tracks
        WHERE LOWER(title) = LOWER($1)
        AND LOWER(artist) = LOWER($2)
        LIMIT 1
      `;
      
      const findResult = await client.query(findQuery, [track.title, track.artist]);
      
      if (findResult.rows.length > 0) {
        return findResult.rows[0].id;
      }

      // Создание нового трека
      const insertQuery = `
        INSERT INTO tracks (title, artist, source, created_at)
        VALUES ($1, $2, 'chart', NOW())
        RETURNING id
      `;
      
      const insertResult = await client.query(insertQuery, [track.title, track.artist]);
      return insertResult.rows[0].id;
    } catch (error) {
      logger.error('Ошибка поиска/создания трека:', error);
      return null;
    }
  }

  /**
   * Нормализация ключа трека
   */
  normalizeTrackKey(title, artist) {
    return `${title.toLowerCase().trim()}_${artist.toLowerCase().trim()}`
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Проверка совпадения треков
   */
  tracksMatch(track1, track2) {
    const key1 = this.normalizeTrackKey(track1.title, track1.artist);
    const key2 = this.normalizeTrackKey(track2.title, track2.artist);
    return key1 === key2;
  }
}

module.exports = new PlaylistActualizationService();

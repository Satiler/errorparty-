/**
 * Playlist Generator Service
 * Автоматическая генерация плейлистов на основе различных критериев
 */
const { Track, Playlist, PlaylistTrack, User } = require('../../models');
const { Op } = require('sequelize');

class PlaylistGeneratorService {
  /**
   * Генерация плейлистов по жанрам
   * Создает плейлисты для каждого жанра с достаточным количеством треков
   */
  async generateGenrePlaylists(minTracks = 10) {
    try {
      console.log('🎵 Starting genre playlist generation...');
      
      // Получаем все уникальные жанры с количеством треков
      const genres = await Track.findAll({
        attributes: [
          'genre',
          [Track.sequelize.fn('COUNT', Track.sequelize.col('id')), 'trackCount']
        ],
        where: {
          genre: { [Op.not]: null },
          isPublic: true
        },
        group: ['genre'],
        having: Track.sequelize.literal(`COUNT(id) >= ${minTracks}`),
        raw: true
      });

      console.log(`📊 Found ${genres.length} genres with ${minTracks}+ tracks`);

      const results = [];
      for (const genreData of genres) {
        const genre = genreData.genre;
        const trackCount = genreData.trackCount;

        try {
          // Проверяем, существует ли уже плейлист для этого жанра
          let playlist = await Playlist.findOne({
            where: {
              type: 'genre',
              name: { [Op.iLike]: `${genre} Mix` }
            }
          });

          if (!playlist) {
            // Создаем новый плейлист
            playlist = await Playlist.create({
              name: `${genre} Mix`,
              description: `Автоматически сгенерированный плейлист с лучшими треками жанра ${genre}`,
              type: 'genre',
              isPublic: true,
              coverPath: null,
              userId: 4 // System user
            });
            console.log(`✅ Created playlist: ${playlist.name}`);
          } else {
            console.log(`♻️ Updating existing playlist: ${playlist.name}`);
          }

          // Получаем топ треков этого жанра (по количеству прослушиваний)
          const tracks = await Track.findAll({
            where: {
              genre: { [Op.iLike]: `%${genre}%` },
              isPublic: true
            },
            order: [
              ['playCount', 'DESC'],
              ['createdAt', 'DESC']
            ],
            limit: 50 // Максимум 50 треков в плейлисте
          });

          // Удаляем старые треки из плейлиста
          await PlaylistTrack.destroy({
            where: { playlistId: playlist.id }
          });

          // Добавляем треки в плейлист
          const playlistTracks = tracks.map((track, index) => ({
            playlistId: playlist.id,
            trackId: track.id,
            position: index
          }));

          await PlaylistTrack.bulkCreate(playlistTracks);

          results.push({
            genre,
            playlistId: playlist.id,
            title: playlist.name,
            trackCount: tracks.length,
            status: 'success'
          });

          console.log(`  ✓ Added ${tracks.length} tracks to "${playlist.name}"`);
        } catch (error) {
          console.error(`❌ Error creating playlist for genre "${genre}":`, error.message);
          results.push({
            genre,
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`🎉 Genre playlist generation complete: ${results.length} playlists`);
      return {
        success: true,
        playlists: results,
        total: results.length
      };
    } catch (error) {
      console.error('❌ Genre playlist generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация плейлистов по десятилетиям
   * Создает плейлисты типа "90s Hits", "2000s Hits" и т.д.
   */
  async generateDecadePlaylists(minTracks = 15) {
    try {
      console.log('📅 Starting decade playlist generation...');

      // Получаем диапазон годов из базы
      const yearStats = await Track.findOne({
        attributes: [
          [Track.sequelize.fn('MIN', Track.sequelize.col('year')), 'minYear'],
          [Track.sequelize.fn('MAX', Track.sequelize.col('year')), 'maxYear']
        ],
        where: {
          year: { [Op.not]: null },
          isPublic: true
        },
        raw: true
      });

      if (!yearStats || !yearStats.minYear) {
        console.log('⚠️ No tracks with year information found');
        return { success: true, playlists: [], total: 0 };
      }

      const startDecade = Math.floor(yearStats.minYear / 10) * 10;
      const endDecade = Math.floor(yearStats.maxYear / 10) * 10;

      console.log(`📊 Year range: ${yearStats.minYear}-${yearStats.maxYear}`);

      const results = [];
      for (let decade = startDecade; decade <= endDecade; decade += 10) {
        const decadeEnd = decade + 9;
        const decadeLabel = `${decade}s`;

        try {
          // Подсчитываем треки в этом десятилетии
          const trackCount = await Track.count({
            where: {
              year: { [Op.between]: [decade, decadeEnd] },
              isPublic: true
            }
          });

          if (trackCount < minTracks) {
            console.log(`⏭️ Skipping ${decadeLabel}: only ${trackCount} tracks (minimum: ${minTracks})`);
            continue;
          }

          // Проверяем, существует ли плейлист
          let playlist = await Playlist.findOne({
            where: {
              type: 'decade',
              name: { [Op.iLike]: `${decadeLabel} Hits` }
            }
          });

          if (!playlist) {
            playlist = await Playlist.create({
              name: `${decadeLabel} Hits`,
              description: `Лучшие хиты ${decade}-${decadeEnd} годов`,
              type: 'decade',
              isPublic: true,
              coverPath: null,
              userId: 4 // System user
            });
            console.log(`✅ Created playlist: ${playlist.name}`);
          } else {
            console.log(`♻️ Updating existing playlist: ${playlist.name}`);
          }

          // Получаем топ треки десятилетия
          const tracks = await Track.findAll({
            where: {
              year: { [Op.between]: [decade, decadeEnd] },
              isPublic: true
            },
            order: [
              ['playCount', 'DESC'],
              ['year', 'DESC']
            ],
            limit: 50
          });

          // Обновляем треки в плейлисте
          await PlaylistTrack.destroy({
            where: { playlistId: playlist.id }
          });

          const playlistTracks = tracks.map((track, index) => ({
            playlistId: playlist.id,
            trackId: track.id,
            position: index
          }));

          await PlaylistTrack.bulkCreate(playlistTracks);

          results.push({
            decade: decadeLabel,
            playlistId: playlist.id,
            title: playlist.name,
            trackCount: tracks.length,
            status: 'success'
          });

          console.log(`  ✓ Added ${tracks.length} tracks to "${playlist.name}"`);
        } catch (error) {
          console.error(`❌ Error creating playlist for ${decadeLabel}:`, error.message);
          results.push({
            decade: decadeLabel,
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`🎉 Decade playlist generation complete: ${results.length} playlists`);
      return {
        success: true,
        playlists: results,
        total: results.length
      };
    } catch (error) {
      console.error('❌ Decade playlist generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация плейлистов по настроению
   * Использует жанры и названия для определения настроения
   */
  async generateMoodPlaylists(minTracks = 12) {
    try {
      console.log('😊 Starting mood playlist generation...');

      // Определяем настроения и их критерии
      const moods = [
        {
          name: 'Энергичные',
          key: 'energetic',
          genres: ['Rock', 'Metal', 'Electronic', 'Dance', 'Hip-Hop', 'Punk'],
          keywords: ['energy', 'power', 'drive', 'jump', 'pump']
        },
        {
          name: 'Спокойные',
          key: 'chill',
          genres: ['Ambient', 'Chillout', 'Jazz', 'Classical', 'Acoustic'],
          keywords: ['relax', 'chill', 'calm', 'peaceful', 'quiet']
        },
        {
          name: 'Романтические',
          key: 'romantic',
          genres: ['Pop', 'R&B', 'Soul', 'Ballad'],
          keywords: ['love', 'heart', 'romance', 'kiss', 'dream']
        },
        {
          name: 'Танцевальные',
          key: 'dance',
          genres: ['Dance', 'Electronic', 'House', 'Disco', 'Techno'],
          keywords: ['dance', 'party', 'night', 'club', 'beat']
        },
        {
          name: 'Рабочие',
          key: 'focus',
          genres: ['Instrumental', 'Classical', 'Ambient', 'Jazz'],
          keywords: ['focus', 'study', 'work', 'concentrate']
        }
      ];

      const results = [];
      for (const mood of moods) {
        try {
          // Строим условие поиска по жанрам
          const genreConditions = mood.genres.map(genre => ({
            genre: { [Op.iLike]: `%${genre}%` }
          }));

          // Ищем треки, соответствующие настроению
          const tracks = await Track.findAll({
            where: {
              [Op.and]: [
                { isPublic: true },
                { [Op.or]: genreConditions }
              ]
            },
            order: [
              ['playCount', 'DESC'],
              ['createdAt', 'DESC']
            ],
            limit: 50
          });

          if (tracks.length < minTracks) {
            console.log(`⏭️ Skipping "${mood.name}": only ${tracks.length} tracks (minimum: ${minTracks})`);
            continue;
          }

          // Проверяем/создаем плейлист
          let playlist = await Playlist.findOne({
            where: {
              type: 'mood',
              name: { [Op.iLike]: mood.name }
            }
          });

          if (!playlist) {
            playlist = await Playlist.create({
              name: mood.name,
              description: `Плейлист для ${mood.name.toLowerCase()} настроения`,
              type: 'mood',
              isPublic: true,
              coverPath: null,
              userId: 4 // System user
            });
            console.log(`✅ Created playlist: ${playlist.name}`);
          } else {
            console.log(`♻️ Updating existing playlist: ${playlist.name}`);
          }

          // Обновляем треки
          await PlaylistTrack.destroy({
            where: { playlistId: playlist.id }
          });

          const playlistTracks = tracks.map((track, index) => ({
            playlistId: playlist.id,
            trackId: track.id,
            position: index
          }));

          await PlaylistTrack.bulkCreate(playlistTracks);

          results.push({
            mood: mood.name,
            playlistId: playlist.id,
            title: playlist.name,
            trackCount: tracks.length,
            status: 'success'
          });

          console.log(`  ✓ Added ${tracks.length} tracks to "${playlist.name}"`);
        } catch (error) {
          console.error(`❌ Error creating playlist for "${mood.name}":`, error.message);
          results.push({
            mood: mood.name,
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`🎉 Mood playlist generation complete: ${results.length} playlists`);
      return {
        success: true,
        playlists: results,
        total: results.length
      };
    } catch (error) {
      console.error('❌ Mood playlist generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация плейлиста "Популярные сейчас"
   * Топ треков по количеству прослушиваний за последние 30 дней
   */
  async generateTrendingPlaylist() {
    try {
      console.log('🔥 Generating "Trending Now" playlist...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Получаем популярные треки
      const tracks = await Track.findAll({
        where: {
          isPublic: true,
          updatedAt: { [Op.gte]: thirtyDaysAgo } // Недавно прослушанные
        },
        order: [
          ['playCount', 'DESC'],
          ['updatedAt', 'DESC']
        ],
        limit: 50
      });

      if (tracks.length === 0) {
        console.log('⚠️ No trending tracks found');
        return { success: true, playlist: null };
      }

      // Проверяем/создаем плейлист
      let playlist = await Playlist.findOne({
        where: {
          type: 'trending',
          name: 'Популярные сейчас'
        }
      });

      if (!playlist) {
        playlist = await Playlist.create({
          name: 'Популярные сейчас',
          description: 'Самые популярные треки последних 30 дней',
          type: 'trending',
          isPublic: true,
          coverPath: null,
          userId: 4 // System user
        });
        console.log(`✅ Created playlist: ${playlist.name}`);
      } else {
        console.log(`♻️ Updating existing playlist: ${playlist.name}`);
      }

      // Обновляем треки
      await PlaylistTrack.destroy({
        where: { playlistId: playlist.id }
      });

      const playlistTracks = tracks.map((track, index) => ({
        playlistId: playlist.id,
        trackId: track.id,
        position: index
      }));

      await PlaylistTrack.bulkCreate(playlistTracks);

      console.log(`  ✓ Added ${tracks.length} tracks to "Популярные сейчас"`);

      return {
        success: true,
        playlist: {
          id: playlist.id,
          title: playlist.name,
          trackCount: tracks.length
        }
      };
    } catch (error) {
      console.error('❌ Trending playlist generation failed:', error);
      throw error;
    }
  }

  /**
   * Генерация всех типов плейлистов
   */
  async generateAllPlaylists() {
    try {
      console.log('\n🎵 === STARTING COMPLETE PLAYLIST GENERATION ===\n');

      const results = {
        trending: null,
        genres: null,
        decades: null,
        moods: null
      };

      // 1. Популярные сейчас
      try {
        results.trending = await this.generateTrendingPlaylist();
      } catch (error) {
        console.error('Error in trending playlist:', error.message);
      }

      // 2. По жанрам
      try {
        results.genres = await this.generateGenrePlaylists(10);
      } catch (error) {
        console.error('Error in genre playlists:', error.message);
      }

      // 3. По десятилетиям
      try {
        results.decades = await this.generateDecadePlaylists(15);
      } catch (error) {
        console.error('Error in decade playlists:', error.message);
      }

      // 4. По настроению
      try {
        results.moods = await this.generateMoodPlaylists(12);
      } catch (error) {
        console.error('Error in mood playlists:', error.message);
      }

      const totalPlaylists = 
        (results.trending?.playlist ? 1 : 0) +
        (results.genres?.total || 0) +
        (results.decades?.total || 0) +
        (results.moods?.total || 0);

      console.log('\n🎉 === PLAYLIST GENERATION COMPLETE ===');
      console.log(`📊 Total playlists created/updated: ${totalPlaylists}`);
      console.log(`  ✓ Trending: ${results.trending?.playlist ? 1 : 0}`);
      console.log(`  ✓ Genres: ${results.genres?.total || 0}`);
      console.log(`  ✓ Decades: ${results.decades?.total || 0}`);
      console.log(`  ✓ Moods: ${results.moods?.total || 0}\n`);

      return {
        success: true,
        summary: {
          total: totalPlaylists,
          trending: results.trending?.playlist ? 1 : 0,
          genres: results.genres?.total || 0,
          decades: results.decades?.total || 0,
          moods: results.moods?.total || 0
        },
        details: results
      };
    } catch (error) {
      console.error('❌ Complete playlist generation failed:', error);
      throw error;
    }
  }
}

module.exports = new PlaylistGeneratorService();

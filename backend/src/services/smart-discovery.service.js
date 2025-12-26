/**
 * Smart Music Discovery Service
 * Интеллектуальная система подбора музыки
 * - Импорт из iTunes RSS и Яндекс.Музыка
 * - Фильтрация по жанрам и странам
 * - Импорт новых альбомов
 * - Автоматические персональные плейлисты
 */

const itunesService = require('./lastfm.service'); // iTunes RSS
const yandexService = require('./yandex-music.service');
const lmusicService = require('../modules/music/lmusic-kz.service');
const musifyService = require('./musify.service');
const { Track, Album, Playlist, PlaylistTrack, User, TrackLike } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

class SmartDiscoveryService {

  /**
   * Импорт топ-треков по странам с фильтрацией
   */
  async importTopByCountry(country = 'us', limit = 50, genres = []) {
    console.log(`\n🌍 === ИМПОРТ ТОПА СТРАНЫ: ${country.toUpperCase()} ===\n`);
    
    try {
      let topTracks = [];

      if (country === 'ru') {
        // Для России используем Яндекс.Музыка
        topTracks = await yandexService.getRussianTop100();
      } else {
        // Для остальных стран - iTunes
        topTracks = await itunesService.getTopSongs(country, limit);
      }

      // Фильтрация по жанрам если указаны
      if (genres.length > 0) {
        topTracks = topTracks.filter(track => 
          genres.some(g => track.genre?.toLowerCase().includes(g.toLowerCase()))
        );
        console.log(`📊 После фильтрации по жанрам (${genres.join(', ')}): ${topTracks.length} треков`);
      }

      let imported = 0;
      let skipped = 0;

      for (const chartTrack of topTracks) {
        // Проверяем существование
        const existing = await this.findTrackInDB(chartTrack.artist, chartTrack.title);
        
        if (existing) {
          await this.updateTrackPopularity(existing, chartTrack, country);
          skipped++;
          continue;
        }

        // Ищем на источниках
        const foundTrack = await this.searchOnSources(chartTrack);
        
        if (foundTrack) {
          await Track.create({
            ...foundTrack,
            popularityScore: (100 - (chartTrack.position || 0)) * 100,
            chartPosition: chartTrack.position,
            trendingDate: new Date(),
            importSource: `${country}-charts`,
            genre: chartTrack.genre
          });
          
          console.log(`✅ [${chartTrack.position}] ${chartTrack.artist} - ${chartTrack.title}`);
          imported++;
        }
      }

      console.log(`\n📊 Импорт ${country}: ${imported} новых, ${skipped} обновлено`);
      return { imported, skipped, country };

    } catch (error) {
      console.error(`❌ Ошибка импорта для ${country}:`, error.message);
      return { imported: 0, skipped: 0, country };
    }
  }

  /**
   * Импорт топа по жанрам
   */
  async importTopByGenre(genre, limit = 30) {
    console.log(`\n🎸 === ИМПОРТ ТОПА ЖАНРА: ${genre.toUpperCase()} ===\n`);
    
    try {
      // Получаем из обоих источников
      const [itunesTracks, yandexTracks] = await Promise.all([
        itunesService.getTopSongs('us', 100).then(tracks => 
          tracks.filter(t => t.genre?.toLowerCase().includes(genre.toLowerCase()))
        ),
        yandexService.getTopByGenre(genre, limit)
      ]);

      const allTracks = [...itunesTracks, ...yandexTracks].slice(0, limit);
      console.log(`📊 Получено ${allTracks.length} треков жанра "${genre}"`);

      let imported = 0;
      let skipped = 0;

      for (const track of allTracks) {
        const existing = await this.findTrackInDB(track.artist, track.title);
        
        if (existing) {
          await existing.update({
            genre: track.genre || existing.genre,
            popularityScore: Math.max(existing.popularityScore || 0, (track.position || 50) * 10)
          });
          skipped++;
          continue;
        }

        const foundTrack = await this.searchOnSources(track);
        
        if (foundTrack) {
          await Track.create({
            ...foundTrack,
            genre: track.genre || genre,
            popularityScore: (track.position || 50) * 10,
            importSource: `genre-${genre}`
          });
          
          console.log(`✅ ${track.artist} - ${track.title}`);
          imported++;
        }
      }

      console.log(`\n📊 Жанр ${genre}: ${imported} новых, ${skipped} обновлено`);
      return { imported, skipped, genre };

    } catch (error) {
      console.error(`❌ Ошибка импорта жанра ${genre}:`, error.message);
      return { imported: 0, skipped: 0, genre };
    }
  }

  /**
   * Импорт новых альбомов популярных исполнителей
   */
  async importNewAlbums() {
    console.log('\n💿 === ИМПОРТ НОВЫХ АЛЬБОМОВ ===\n');
    
    try {
      // Получаем популярных исполнителей из базы
      const [popularArtists] = await sequelize.query(`
        SELECT DISTINCT artist, COUNT(*) as track_count
        FROM "Tracks"
        WHERE "popularityScore" > 1000
        GROUP BY artist
        ORDER BY track_count DESC
        LIMIT 20
      `);

      console.log(`📊 Найдено ${popularArtists.length} популярных исполнителей`);

      let importedAlbums = 0;

      // Получаем новые альбомы из Яндекс.Музыка
      const yandexAlbums = await yandexService.getNewAlbums(50);

      for (const albumData of yandexAlbums) {
        // Проверяем существование альбома
        const existing = await Album.findOne({
          where: {
            title: { [Op.iLike]: albumData.title },
            artist: { [Op.iLike]: albumData.artist }
          }
        });

        if (!existing) {
          await Album.create({
            title: albumData.title,
            artist: albumData.artist,
            releaseYear: albumData.year,
            coverUrl: albumData.coverUrl,
            importSource: albumData.source
          });

          console.log(`✅ Альбом: ${albumData.artist} - ${albumData.title}`);
          importedAlbums++;
        }
      }

      // Ищем альбомы для популярных исполнителей
      for (const { artist } of popularArtists.slice(0, 10)) {
        const albums = await yandexService.getArtistAlbums(artist, 5);
        
        for (const albumData of albums) {
          const existing = await Album.findOne({
            where: {
              title: { [Op.iLike]: albumData.title },
              artist: { [Op.iLike]: albumData.artist }
            }
          });

          if (!existing) {
            await Album.create({
              title: albumData.title,
              artist: albumData.artist,
              releaseYear: albumData.year,
              coverUrl: albumData.coverUrl,
              importSource: albumData.source
            });

            console.log(`✅ Альбом: ${albumData.artist} - ${albumData.title}`);
            importedAlbums++;
          }
        }

        // Задержка
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`\n💿 Импортировано альбомов: ${importedAlbums}`);
      return { importedAlbums };

    } catch (error) {
      console.error('❌ Ошибка импорта альбомов:', error.message);
      return { importedAlbums: 0 };
    }
  }

  /**
   * Создание персонального плейлиста на основе лайков пользователя
   */
  async createPersonalPlaylist(userId) {
    console.log(`\n🎯 === СОЗДАНИЕ ПЕРСОНАЛЬНОГО ПЛЕЙЛИСТА (User ${userId}) ===\n`);
    
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Получаем лайкнутые треки
      const likedTracks = await TrackLike.findAll({
        where: { userId },
        include: [{ model: Track, as: 'track' }]
      });

      if (likedTracks.length === 0) {
        console.log('❌ У пользователя нет лайкнутых треков');
        return null;
      }

      console.log(`📊 Найдено ${likedTracks.length} лайкнутых треков`);

      // Анализируем жанры
      const genreCount = {};
      const artistCount = {};

      likedTracks.forEach(({ track }) => {
        if (track.genre) {
          genreCount[track.genre] = (genreCount[track.genre] || 0) + 1;
        }
        if (track.artist) {
          artistCount[track.artist] = (artistCount[track.artist] || 0) + 1;
        }
      });

      // Топ-3 жанра
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      // Топ-5 исполнителей
      const topArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist]) => artist);

      console.log(`🎵 Топ жанры: ${topGenres.join(', ')}`);
      console.log(`🎤 Топ исполнители: ${topArtists.join(', ')}`);

      // Ищем похожие треки
      const recommendedTracks = await Track.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { genre: { [Op.in]: topGenres } },
                { artist: { [Op.in]: topArtists } }
              ]
            },
            {
              id: {
                [Op.notIn]: likedTracks.map(lt => lt.trackId)
              }
            },
            { streamUrl: { [Op.ne]: null } }
          ]
        },
        order: [
          [Sequelize.literal('RANDOM()')],
          ['popularityScore', 'DESC']
        ],
        limit: 30
      });

      console.log(`✅ Найдено ${recommendedTracks.length} рекомендованных треков`);

      // Создаем плейлист
      const playlistName = `Мои рекомендации ${new Date().toLocaleDateString('ru-RU')}`;
      
      const playlist = await Playlist.create({
        userId: userId,
        name: playlistName,
        description: `Персональная подборка на основе ваших любимых жанров: ${topGenres.join(', ')}`,
        isPublic: false,
        type: 'auto',
        metadata: {
          type: 'personal-recommendations',
          icon: '🎯',
          color: '#8b5cf6',
          basedOnGenres: topGenres,
          basedOnArtists: topArtists,
          createdAt: new Date()
        }
      });

      // Добавляем треки (с проверкой на дубликаты)
      for (let i = 0; i < recommendedTracks.length; i++) {
        const existing = await PlaylistTrack.findOne({
          where: {
            playlistId: playlist.id,
            trackId: recommendedTracks[i].id
          }
        });
        
        if (!existing) {
          await PlaylistTrack.create({
            playlistId: playlist.id,
            trackId: recommendedTracks[i].id,
            position: i + 1
          });
        }
      }

      console.log(`✅ Создан плейлист "${playlistName}" с ${recommendedTracks.length} треками`);
      
      return {
        playlistId: playlist.id,
        playlistName: playlist.name,
        tracksCount: recommendedTracks.length,
        topGenres,
        topArtists
      };

    } catch (error) {
      console.error('❌ Ошибка создания персонального плейлиста:', error.message);
      throw error;
    }
  }

  /**
   * Вспомогательные методы
   */

  async findTrackInDB(artist, title) {
    return await Track.findOne({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('artist')),
            Sequelize.fn('LOWER', artist)
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('title')),
            { [Op.like]: `%${title.toLowerCase()}%` }
          )
        ]
      }
    });
  }

  async updateTrackPopularity(track, chartTrack, country) {
    await track.update({
      popularityScore: Math.max(track.popularityScore || 0, (100 - (chartTrack.position || 0)) * 100),
      chartPosition: chartTrack.position,
      trendingDate: new Date(),
      genre: chartTrack.genre || track.genre
    });
  }

  async searchOnSources(chartTrack) {
    const query = `${chartTrack.artist} ${chartTrack.title}`;
    
    // Каскадный поиск
    let tracks = await lmusicService.searchTracks(query, 1);
    if (tracks.length === 0) tracks = await musifyService.searchTracks(query, 1);
    
    return tracks[0] || null;
  }
}

module.exports = new SmartDiscoveryService();

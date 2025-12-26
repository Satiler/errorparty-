/**
 * Auto Import Albums Service
 * Автоматический импорт новых альбомов через API
 */
const axios = require('axios');
const { Album, Track } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

class AutoImportService {
  constructor() {
    this.jamendoClientId = process.env.JAMENDO_CLIENT_ID;
    this.lastImportDate = null;
  }

  /**
   * Импорт свежих альбомов с Jamendo
   */
  async importFreshAlbums(limit = 20) {
    if (!this.jamendoClientId) {
      console.error('❌ Jamendo API key not configured');
      return { success: false, error: 'API key not configured' };
    }

    try {
      console.log('🎵 Starting auto-import of fresh albums...');

      // Получаем дату последнего импорта
      const lastAlbum = await Album.findOne({
        where: { sourceType: 'jamendo' },
        order: [['createdAt', 'DESC']]
      });

      // Параметры поиска - свежие альбомы за последний месяц
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const datebetween = oneMonthAgo.toISOString().split('T')[0];

      // Запрос к Jamendo API
      const response = await axios.get('https://api.jamendo.com/v3.0/albums/', {
        params: {
          client_id: this.jamendoClientId,
          format: 'json',
          limit: limit,
          order: 'releasedate_desc', // Сортировка по дате релиза (новые первые)
          datebetween: datebetween, // Альбомы за последний месяц
          include: 'musicinfo',
          imagesize: 600
        }
      });

      if (!response.data || !response.data.results) {
        console.error('❌ Invalid response from Jamendo API');
        return { success: false, error: 'Invalid API response' };
      }

      const albums = response.data.results;
      console.log(`📦 Found ${albums.length} fresh albums from Jamendo`);

      let importedAlbums = 0;
      let importedTracks = 0;
      let skippedAlbums = 0;

      for (const albumData of albums) {
        try {
          // Проверяем, не импортирован ли уже этот альбом
          const existingAlbum = await Album.findOne({
            where: {
              externalId: albumData.id.toString(),
              sourceType: 'jamendo'
            }
          });

          if (existingAlbum) {
            skippedAlbums++;
            continue;
          }

          // Получаем треки альбома
          const tracksResponse = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
            params: {
              client_id: this.jamendoClientId,
              format: 'json',
              album_id: albumData.id,
              include: 'musicinfo',
              limit: 50
            }
          });

          const tracks = tracksResponse.data?.results || [];

          if (tracks.length === 0) {
            console.log(`  ⚠️ Album "${albumData.name}" has no tracks, skipping`);
            skippedAlbums++;
            continue;
          }

          // Импортируем альбом с треками в транзакции
          await sequelize.transaction(async (t) => {
            // Создаем альбом
            const album = await Album.create({
              title: albumData.name || 'Unknown Album',
              artist: albumData.artist_name || 'Unknown Artist',
              description: null,
              coverUrl: albumData.image || null,
              externalId: albumData.id.toString(),
              sourceType: 'jamendo',
              sourceUrl: albumData.shareurl,
              releaseDate: albumData.releasedate || null,
              genre: tracks[0]?.musicinfo?.tags?.genres?.[0] || null,
              totalTracks: tracks.length,
              totalDuration: tracks.reduce((sum, t) => sum + (t.duration || 0), 0),
              isPublic: true,
              createdBy: 1 // System user
            }, { transaction: t });

            // Создаем треки
            for (let i = 0; i < tracks.length; i++) {
              const trackData = tracks[i];
              
              await Track.create({
                title: trackData.name || 'Unknown Track',
                artist: trackData.artist_name || albumData.artist_name || 'Unknown Artist',
                album: albumData.name,
                albumId: album.id,
                genre: trackData.musicinfo?.tags?.genres?.[0] || null,
                year: albumData.releasedate ? new Date(albumData.releasedate).getFullYear() : null,
                duration: trackData.duration || 0,
                trackNumber: i + 1,
                filePath: trackData.audio || trackData.audiodownload,
                fileFormat: 'mp3',
                bitrate: null,
                uploadedBy: 1,
                isPublic: true,
                allowDownload: true,
                sourceType: 'jamendo',
                externalId: trackData.id.toString(),
                sourceUrl: trackData.shareurl
              }, { transaction: t });

              importedTracks++;
            }

            importedAlbums++;
          });

          console.log(`  ✅ Imported: "${albumData.name}" by ${albumData.artist_name} (${tracks.length} tracks)`);

        } catch (albumError) {
          console.error(`  ❌ Error importing album "${albumData.name}":`, albumError.message);
        }
      }

      const result = {
        success: true,
        imported: {
          albums: importedAlbums,
          tracks: importedTracks
        },
        skipped: skippedAlbums,
        timestamp: new Date()
      };

      console.log(`✅ Auto-import completed: ${importedAlbums} albums, ${importedTracks} tracks imported`);
      if (skippedAlbums > 0) {
        console.log(`  ℹ️ ${skippedAlbums} albums already exist, skipped`);
      }

      this.lastImportDate = new Date();
      return result;

    } catch (error) {
      console.error('❌ Error in auto-import:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Запуск регулярного импорта
   */
  startScheduledImport() {
    // Импорт каждый день в 3:00 ночи
    const cronTime = '0 3 * * *'; // Cron: каждый день в 3:00
    
    console.log('⏰ Scheduled auto-import task configured for 03:00 daily');
    
    // Первый импорт при запуске (если не было импорта сегодня)
    this.checkAndImport();
    
    // Запуск по расписанию
    const cron = require('node-cron');
    cron.schedule(cronTime, () => {
      console.log('🕐 Running scheduled album import...');
      this.importFreshAlbums(20);
    });
  }

  /**
   * Проверка и импорт если не было сегодня
   */
  async checkAndImport() {
    try {
      const lastAlbum = await Album.findOne({
        where: { sourceType: 'jamendo' },
        order: [['createdAt', 'DESC']]
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Если последний импорт был не сегодня или не было импорта вообще
      if (!lastAlbum || new Date(lastAlbum.createdAt) < today) {
        console.log('ℹ️ No import today, starting initial import...');
        await this.importFreshAlbums(15);
      } else {
        console.log('✅ Albums already imported today');
      }
    } catch (error) {
      console.error('Error checking import status:', error.message);
    }
  }

  /**
   * Получить статистику импортов
   */
  async getImportStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayCount, weekCount, totalCount] = await Promise.all([
        Album.count({
          where: {
            sourceType: 'jamendo',
            createdAt: { [Op.gte]: today }
          }
        }),
        Album.count({
          where: {
            sourceType: 'jamendo',
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        Album.count({
          where: { sourceType: 'jamendo' }
        })
      ]);

      return {
        today: todayCount,
        lastWeek: weekCount,
        total: totalCount,
        lastImportDate: this.lastImportDate
      };
    } catch (error) {
      console.error('Error getting import stats:', error.message);
      return null;
    }
  }
}

module.exports = new AutoImportService();

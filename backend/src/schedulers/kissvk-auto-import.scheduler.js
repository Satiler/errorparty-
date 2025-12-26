/**
 * KissVK Auto Import Scheduler
 * Автоматический импорт новых треков из kissvk.top
 */

const cron = require('node-cron');
const kissvkService = require('../services/kissvk.service');
const Track = require('../models/Track');
const Album = require('../models/Album');

class KissVKAutoImportScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalImported: 0,
      totalUpdated: 0,
      totalFailed: 0
    };
  }

  /**
   * Запуск scheduler
   * Расписание: каждые 2 часа
   */
  start() {
    console.log('🔄 [KissVK Scheduler] Инициализация автоматического импорта...');
    
    // Расписание: каждые 2 часа
    cron.schedule('0 */2 * * *', async () => {
      await this.runImport();
    });

    // Также запустить при старте сервера (опционально, можно отключить)
    // this.runImport();

    console.log('✅ [KissVK Scheduler] Scheduler запущен (каждые 2 часа)');
  }

  /**
   * Ручной запуск импорта (для тестирования или API endpoint)
   */
  async runImport() {
    if (this.isRunning) {
      console.log('⚠️ [KissVK Scheduler] Импорт уже выполняется, пропускаем...');
      return {
        success: false,
        message: 'Import already in progress'
      };
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.stats.totalRuns++;

    const startTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎵 [KissVK Scheduler] Начало автоматического импорта - ${this.lastRun.toLocaleString('ru-RU')}`);
    console.log('='.repeat(80));

    try {
      const service = kissvkService.getInstance();
      
      // 1. Получение новых треков (топ-50)
      console.log('1️⃣ Получение топ-50 треков с kissvk.top...');
      const result = await service.extractTracks('/', 50);
      
      if (!result.success) {
        throw new Error(`Ошибка получения треков: ${result.message}`);
      }
      
      console.log(`✅ Получено ${result.tracks.length} треков`);
      
      // 2. Расшифровка URL
      console.log('2️⃣ Расшифровка URL треков...');
      const decryptedTracks = await service.decryptTracks(result.tracks);
      const successCount = decryptedTracks.filter(t => t.streamUrl).length;
      console.log(`✅ Расшифровано ${successCount}/${decryptedTracks.length} треков`);
      
      // 🔍 DEBUG: Проверка coverUrl после декодирования
      console.log('\n🔍 DEBUG: Первые 3 трека после декодирования:');
      decryptedTracks.slice(0, 3).forEach((t, i) => {
        console.log(`${i+1}. ${t.artist} - ${t.title}`);
        console.log(`   coverUrl: ${t.coverUrl ? '✅ ' + t.coverUrl.substring(0, 50) + '...' : '❌ null'}`);
      });
      console.log('');
      
      // 3. Создание/обновление альбома "KissVK Auto Import"
      console.log('3️⃣ Создание/обновление альбома...');
      let album = await Album.findOne({
        where: {
          source: 'kissvk',
          title: 'KissVK Auto Import'
        }
      });
      
      // Собираем первую доступную обложку для альбома
      const firstTrackWithCover = decryptedTracks.find(t => t.coverUrl);
      const albumCoverUrl = firstTrackWithCover?.coverUrl || null;
      
      if (!album) {
        album = await Album.create({
          title: 'KissVK Auto Import',
          artist: 'Various Artists',
          description: 'Автоматический ежедневный импорт топ-треков из kissvk.top',
          coverUrl: albumCoverUrl,  // ✅ Добавляем обложку
          totalTracks: 0,
          isPublic: true,
          source: 'kissvk',
          provider: 'kissvk',
          sourceUrl: 'https://kissvk.top'
        });
        console.log(`✅ Создан новый альбом (ID: ${album.id})`);
      } else {
        // Обновляем обложку альбома если её нет
        if (!album.coverUrl && albumCoverUrl) {
          await album.update({ coverUrl: albumCoverUrl });
          console.log(`✅ Обновлена обложка альбома`);
        }
        console.log(`✅ Используется существующий альбом (ID: ${album.id})`);
      }
      
      // 4. Импорт треков
      console.log('4️⃣ Импорт треков в базу данных...');
      let imported = 0;
      let updated = 0;
      let failed = 0;
      
      for (const track of decryptedTracks) {
        if (!track.streamUrl) {
          failed++;
          continue;
        }
        
        try {
          // Проверка существования по providerTrackId
          const existing = await Track.findOne({
            where: {
              provider: 'kissvk',
              providerTrackId: track.trackId
            }
          });
          
          if (existing) {
            // Обновляем URL, обложку и время проверки
            console.log(`   [UPDATE] ${track.artist} - ${track.title}`);
            console.log(`      coverUrl from track: ${track.coverUrl ? '✅' : '❌'}`);
            await existing.update({
              streamUrl: track.streamUrl,
              coverUrl: track.coverUrl || existing.coverUrl,  // ✅ Обновляем обложку если есть
              isVerified: true,
              lastChecked: new Date()
            });
            updated++;
          } else {
            // Создаем новый трек
            console.log(`   [CREATE] ${track.artist} - ${track.title}`);
            console.log(`      coverUrl from track: ${track.coverUrl ? '✅' : '❌'}`);
            await Track.create({
              title: track.title,
              artist: track.artist,
              duration: track.duration,
              streamUrl: track.streamUrl,
              coverUrl: track.coverUrl,  // ✅ Исправлено: было track.imageUrl
              source: 'kissvk',
              provider: 'kissvk',
              providerTrackId: track.trackId,
              albumId: album.id,
              uploadedBy: 1,
              isPublic: true,
              allowDownload: false,
              isVerified: true,
              lastChecked: new Date()
            });
            imported++;
          }
        } catch (err) {
          console.error(`❌ Ошибка обработки трека "${track.title}":`, err.message);
          failed++;
        }
      }
      
      // 5. Обновление статистики альбома
      const totalTracksInAlbum = await Track.count({
        where: { albumId: album.id }
      });
      
      await album.update({ totalTracks: totalTracksInAlbum });
      
      // 6. Финальная статистика
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n✅ Импорт завершен!');
      console.log(`   • Новых треков: ${imported}`);
      console.log(`   • Обновлено: ${updated}`);
      console.log(`   • Ошибок: ${failed}`);
      console.log(`   • Время выполнения: ${duration}с`);
      
      // Обновление глобальной статистики
      this.stats.successfulRuns++;
      this.stats.totalImported += imported;
      this.stats.totalUpdated += updated;
      this.stats.totalFailed += failed;
      
      console.log('='.repeat(80) + '\n');
      
      return {
        success: true,
        imported,
        updated,
        failed,
        duration: parseFloat(duration)
      };
      
    } catch (error) {
      console.error('❌ [KissVK Scheduler] Критическая ошибка:', error.message);
      this.stats.failedRuns++;
      
      return {
        success: false,
        message: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Получить статистику scheduler
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: 'Every 2 hours'
    };
  }
}

// Singleton instance
let schedulerInstance = null;

function getInstance() {
  if (!schedulerInstance) {
    schedulerInstance = new KissVKAutoImportScheduler();
  }
  return schedulerInstance;
}

module.exports = {
  getInstance,
  KissVKAutoImportScheduler
};

const { Track } = require('../models');
const { KissVKLightweightService } = require('./kissvk-lightweight.service');

/**
 * Сервис умного кэширования треков
 * Автоматически обновляет устаревшие URL от VK
 */
class SmartCacheService {
    constructor() {
        this.kissvk = new KissVKLightweightService();
        this.URL_LIFETIME_HOURS = 4; // URL живёт 4 часа
        this.updateQueue = new Map(); // Очередь обновлений
    }

    /**
     * Проверяет, не устарел ли URL трека
     */
    isUrlExpired(track) {
        if (!track.updatedAt) return true;
        
        const ageHours = (Date.now() - track.updatedAt.getTime()) / (1000 * 60 * 60);
        return ageHours > this.URL_LIFETIME_HOURS;
    }

    /**
     * Получает актуальный URL трека
     * Если URL устарел - обновляет автоматически
     */
    async getFreshUrl(trackId) {
        try {
            const track = await Track.findByPk(trackId);
            
            if (!track) {
                throw new Error(`Track ${trackId} not found`);
            }

            // Если URL свежий - возвращаем как есть
            if (!this.isUrlExpired(track)) {
                return {
                    url: track.streamUrl,
                    cached: true,
                    ageHours: Math.floor((Date.now() - track.updatedAt.getTime()) / (1000 * 60 * 60))
                };
            }

            // Проверяем, не обновляется ли уже этот трек
            if (this.updateQueue.has(trackId)) {
                console.log(`[SmartCache] Track ${trackId} is already updating, waiting...`);
                await this.updateQueue.get(trackId);
                
                // Перечитываем из базы после обновления
                const updatedTrack = await Track.findByPk(trackId);
                return {
                    url: updatedTrack.streamUrl,
                    cached: false,
                    refreshed: true
                };
            }

            // Добавляем в очередь и обновляем URL
            console.log(`[SmartCache] 🔄 Refreshing URL for track ${trackId}: ${track.artist} - ${track.title}`);
            
            const updatePromise = this.refreshTrackUrl(track);
            this.updateQueue.set(trackId, updatePromise);
            
            try {
                const newUrl = await updatePromise;
                return {
                    url: newUrl,
                    cached: false,
                    refreshed: true
                };
            } finally {
                this.updateQueue.delete(trackId);
            }

        } catch (error) {
            console.error(`[SmartCache] ❌ Error getting fresh URL for track ${trackId}:`, error.message);
            
            // В случае ошибки возвращаем старый URL
            const track = await Track.findByPk(trackId);
            return {
                url: track?.streamUrl,
                cached: true,
                error: error.message
            };
        }
    }

    /**
     * Обновляет URL трека с KissVK
     */
    async refreshTrackUrl(track) {
        try {
            const query = `${track.artist} ${track.title}`;
            const results = await this.kissvk.searchTracks(query, 3);

            if (!results.success || results.tracks.length === 0) {
                throw new Error('Track not found on KissVK');
            }

            const freshTrack = results.tracks[0];
            
            // Обновляем в базе
            await track.update({
                streamUrl: freshTrack.streamUrl,
                duration: freshTrack.duration || track.duration,
                coverUrl: freshTrack.coverUrl || track.coverUrl
            });

            console.log(`[SmartCache] ✅ URL refreshed for track ${track.id}`);
            return freshTrack.streamUrl;

        } catch (error) {
            console.error(`[SmartCache] ❌ Failed to refresh URL for track ${track.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Пакетное обновление устаревших URL
     * Запускается по крону или вручную
     */
    async refreshExpiredUrls(limit = 50) {
        console.log(`\n[SmartCache] 🔄 Starting batch URL refresh (limit: ${limit})`);
        
        const { Op } = require('sequelize');
        const expirationTime = new Date(Date.now() - this.URL_LIFETIME_HOURS * 60 * 60 * 1000);

        const expiredTracks = await Track.findAll({
            where: {
                provider: 'kissvk',
                updatedAt: {
                    [Op.lt]: expirationTime
                }
            },
            order: [['updatedAt', 'ASC']],
            limit: limit
        });

        console.log(`[SmartCache] Found ${expiredTracks.length} expired tracks`);

        let updated = 0;
        let failed = 0;

        for (const track of expiredTracks) {
            try {
                await this.refreshTrackUrl(track);
                updated++;
                
                // Задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 800));
                
            } catch (error) {
                failed++;
            }
        }

        console.log(`[SmartCache] ✅ Batch refresh completed: ${updated} updated, ${failed} failed`);
        
        return { updated, failed, total: expiredTracks.length };
    }
}

// Singleton instance
let instance = null;

function getInstance() {
    if (!instance) {
        instance = new SmartCacheService();
    }
    return instance;
}

module.exports = {
    SmartCacheService,
    getInstance
};

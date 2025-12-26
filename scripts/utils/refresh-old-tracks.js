const { Track } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

async function refreshOldTracks() {
    console.log('\n🔄 ОБНОВЛЕНИЕ СТАРЫХ URL ТРЕКОВ');
    console.log('=' .repeat(60));
    
    // Находим треки старше 4 часов
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    const oldTracks = await Track.findAll({
        where: {
            provider: 'kissvk',
            createdAt: {
                [require('sequelize').Op.lt]: fourHoursAgo
            }
        },
        order: [['createdAt', 'ASC']],
        limit: 50, // Обновляем только 50 самых старых
        attributes: ['id', 'title', 'artist', 'createdAt', 'streamUrl']
    });
    
    console.log(`\n📊 Найдено старых треков: ${oldTracks.length}`);
    
    if (oldTracks.length === 0) {
        console.log('✅ Все треки свежие!');
        process.exit(0);
    }
    
    const kissvk = new KissVKLightweightService();
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const track of oldTracks) {
        const ageHours = Math.floor((Date.now() - track.createdAt) / 1000 / 60 / 60);
        console.log(`\n[${track.id}] ${track.artist} - ${track.title}`);
        console.log(`   ⏰ Возраст: ${ageHours} часов`);
        
        try {
            // Ищем трек заново
            const query = `${track.artist} ${track.title}`;
            const results = await kissvk.searchTracks(query, 3);
            
            if (!results.success || results.tracks.length === 0) {
                console.log(`   ❌ Не найден на KissVK`);
                failed++;
                continue;
            }
            
            const newTrack = results.tracks[0];
            
            // Проверяем, изменился ли URL
            if (newTrack.streamUrl === track.streamUrl) {
                console.log(`   ⏭️  URL не изменился`);
                skipped++;
                continue;
            }
            
            // Обновляем
            await track.update({
                streamUrl: newTrack.streamUrl,
                duration: newTrack.duration || track.duration,
                coverUrl: newTrack.coverUrl || track.coverUrl
            });
            
            console.log(`   ✅ URL обновлён`);
            updated++;
            
        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
            failed++;
        }
        
        // Задержка
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`⏭️  Пропущено (не изменились): ${skipped}`);
    console.log(`❌ Ошибок: ${failed}`);
    console.log('='.repeat(60));
    
    process.exit(0);
}

refreshOldTracks().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});

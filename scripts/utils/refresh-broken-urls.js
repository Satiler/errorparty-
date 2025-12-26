const { Track } = require('./src/models');
const { KissVKLightweightService } = require('./src/services/kissvk-lightweight.service');

async function refreshBrokenTracks() {
    console.log('\n🔄 ОБНОВЛЕНИЕ БИТЫХ URL ТРЕКОВ');
    console.log('=' .repeat(60));
    
    const brokenIds = [9962, 9947, 9950];
    const kissvk = new KissVKLightweightService();
    
    let fixed = 0;
    let failed = 0;
    
    for (const id of brokenIds) {
        const track = await Track.findByPk(id);
        
        if (!track) {
            console.log(`\n[${id}] ❌ Трек не найден в базе`);
            failed++;
            continue;
        }
        
        console.log(`\n[${id}] 🔍 ${track.artist} - ${track.title}`);
        console.log(`   📅 Создан: ${track.createdAt.toLocaleString('ru-RU')}`);
        console.log(`   🔗 Старый URL: ${track.streamUrl.substring(0, 60)}...`);
        
        try {
            // Ищем трек заново на KissVK
            const query = `${track.artist} ${track.title}`;
            console.log(`   🔍 Поиск: ${query}`);
            
            const results = await kissvk.searchTracks(query, 3);
            
            if (!results.success || results.tracks.length === 0) {
                console.log(`   ❌ Не найден на KissVK`);
                failed++;
                continue;
            }
            
            const newTrack = results.tracks[0];
            console.log(`   ✅ Найдено: ${newTrack.artist} - ${newTrack.title}`);
            
            // Обновляем URL
            await track.update({
                streamUrl: newTrack.streamUrl,
                duration: newTrack.duration || track.duration,
                coverUrl: newTrack.coverUrl || track.coverUrl
            });
            
            console.log(`   💾 URL обновлён: ${newTrack.streamUrl.substring(0, 60)}...`);
            fixed++;
            
        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
            failed++;
        }
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ');
    console.log('='.repeat(60));
    console.log(`✅ Исправлено: ${fixed}`);
    console.log(`❌ Ошибок: ${failed}`);
    console.log('='.repeat(60));
    
    process.exit(0);
}

refreshBrokenTracks().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});

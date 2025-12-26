const { Track } = require('./src/models');
const axios = require('axios');

async function checkAndRemoveBrokenTracks() {
  try {
    console.log('🔍 Проверка треков на доступность...\n');
    
    const tracks = await Track.findAll({
      where: {
        streamUrl: { [require('sequelize').Op.ne]: null }
      },
      order: [['id', 'ASC']],
      limit: 300
    });
    
    console.log(`📊 Найдено треков для проверки: ${tracks.length}\n`);
    
    let brokenIds = [];
    let checkedCount = 0;
    
    for (const track of tracks) {
      checkedCount++;
      
      try {
        // Быстрая проверка HEAD запросом
        await axios.head(track.streamUrl, {
          timeout: 3000,
          validateStatus: status => status < 400
        });
        
        if (checkedCount % 50 === 0) {
          console.log(`✓ Проверено: ${checkedCount}/${tracks.length}`);
        }
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 403) {
          console.log(`❌ Битый трек ${track.id}: ${track.artist} - ${track.title}`);
          console.log(`   URL: ${track.streamUrl}`);
          console.log(`   Ошибка: ${error.response.status}\n`);
          brokenIds.push(track.id);
        }
      }
      
      // Небольшая задержка чтобы не DDOS
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Результаты:`);
    console.log(`  Проверено: ${checkedCount}`);
    console.log(`  Битых: ${brokenIds.length}`);
    
    if (brokenIds.length > 0) {
      console.log(`\n🗑️  Удаление битых треков...`);
      const deleted = await Track.destroy({
        where: { id: brokenIds }
      });
      console.log(`✅ Удалено: ${deleted} треков`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkAndRemoveBrokenTracks();

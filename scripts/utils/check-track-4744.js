const { Track } = require('./src/models');

async function checkTrack() {
  try {
    const track = await Track.findByPk(4744);
    
    if (!track) {
      console.log('❌ Трек ID 4744 не найден');
      process.exit(1);
    }

    console.log('\n📀 Трек ID 4744:');
    console.log('  Название:', track.title);
    console.log('  Исполнитель:', track.artist);
    console.log('  streamUrl:', track.streamUrl || 'НЕТ ❌');
    console.log('  albumId:', track.albumId || 'НЕТ');
    console.log('  source:', track.sourceType || track.externalSource || 'не указан');
    
    if (!track.streamUrl) {
      console.log('\n🔧 Трек нужно исправить!');
    } else {
      console.log('\n✅ У трека есть URL');
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

checkTrack();

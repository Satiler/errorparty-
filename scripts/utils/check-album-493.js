const { Album, Track } = require('./src/models');

async function checkAlbum() {
  try {
    const album = await Album.findByPk(493, {
      include: [{
        model: Track,
        as: 'tracks'
      }]
    });

    if (!album) {
      console.log('❌ Альбом 493 не найден');
      process.exit(1);
    }

    console.log(`\n📀 Альбом: ${album.title}`);
    console.log(`   Исполнитель: ${album.artist}`);
    console.log(`   Треков: ${album.tracks.length}\n`);

    console.log('Треки:');
    album.tracks.forEach((t, i) => {
      console.log(`\n  ${i + 1}. ${t.title}`);
      console.log(`     ID: ${t.id}`);
      console.log(`     streamUrl: ${t.streamUrl ? '✅ ЕСТЬ' : '❌ НЕТ'}`);
      if (t.streamUrl) {
        console.log(`     ${t.streamUrl.substring(0, 60)}...`);
      }
    });

    const withoutUrl = album.tracks.filter(t => !t.streamUrl);
    console.log(`\n📊 Треков без URL: ${withoutUrl.length} из ${album.tracks.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

checkAlbum();

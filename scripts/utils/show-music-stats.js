#!/usr/bin/env node
const { Album, Track } = require('./src/models');

async function showStats() {
  const jamendoAlbums = await Album.findAll({
    where: { sourceType: 'jamendo' },
    limit: 10,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'title', 'artist', 'releaseYear', 'totalTracks', 'genre']
  });

  console.log('\n🎵 Последние загруженные альбомы из Jamendo:\n');
  jamendoAlbums.forEach((album, i) => {
    console.log(`${i + 1}. ${album.title}`);
    console.log(`   Исполнитель: ${album.artist}`);
    console.log(`   Год: ${album.releaseYear || 'N/A'}`);
    console.log(`   Жанр: ${album.genre || 'N/A'}`);
    console.log(`   Треков: ${album.totalTracks}`);
    console.log('');
  });

  const trackCount = await Track.count({ where: { externalSource: 'jamendo' } });
  console.log(`📊 Всего треков из Jamendo: ${trackCount}\n`);

  process.exit(0);
}

showStats();

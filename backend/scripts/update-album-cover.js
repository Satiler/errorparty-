const Album = require('../src/models/Album');

(async () => {
  try {
    const album = await Album.findOne({
      where: {
        source: 'kissvk',
        title: 'KissVK Auto Import'
      }
    });
    
    if (!album) {
      console.log('Альбом не найден');
      process.exit(1);
    }
    
    console.log(`Альбом ID: ${album.id}`);
    console.log(`coverUrl: ${album.coverUrl ? '✅ ' + album.coverUrl : '❌ null'}`);
    
    // Обновляем вручную
    const firstTrackCover = 'https://sun1-98.userapi.com/impg/R9TSiB_Y4QTsYqBTMgJAtiZVFQ7';
    await album.update({ coverUrl: firstTrackCover + 'iGFBvfgWnZk4vI31oR8XDK7yZ3sZwjz1fRVB7Ug8lRw/HlJ0Gv4tTgs.jpg?size=600x600&quality=95&sign=aef80eeb9d13ba74c9aec2a17dcef8e0&c_uniq_tag=8Wr7xoS6rAIyV8TRMz3CW9kQUwpXbGCM2NJQY-mJKdE&type=audio' });
    
    console.log('✅ Обложка обновлена!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
})();

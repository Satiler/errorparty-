const db = require('./src/models');

const updates = [
  { id: 308, name: '🎵 iTunes Top 100' },
  { id: 309, name: '🆕 Новинки 2025' },
  { id: 310, name: '🌍 Зарубежные хиты' },
  { id: 311, name: '🔥 Топ 50' },
  { id: 312, name: '💿 KissVK Collection' },
  { id: 313, name: '😌 Chill & Relax' },
  { id: 314, name: '🎉 Party Mix' },
  { id: 315, name: '🎲 Микс дня' },
  { id: 340, name: '💋 Хиты с KissVK' },
  { id: 341, name: '🔥 Топ 100' }
];

(async () => {
  try {
    for (const update of updates) {
      await db.Playlist.update(
        { name: update.name },
        { where: { id: update.id } }
      );
      console.log(`✅ Обновлен плейлист ${update.id}: ${update.name}`);
    }
    console.log('\n✅ Все названия исправлены!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  }
})();

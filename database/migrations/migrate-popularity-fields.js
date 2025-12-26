/**
 * Миграция: Добавление полей для системы популярности
 */

const { sequelize } = require('./src/config/database');

async function migrate() {
  console.log('🔧 Применение миграции для полей популярности...\n');

  try {
    await sequelize.query(`
      ALTER TABLE "Tracks" 
      ADD COLUMN IF NOT EXISTS "popularityScore" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "chartPosition" INTEGER,
      ADD COLUMN IF NOT EXISTS "trendingDate" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "importSource" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "playCountExternal" BIGINT DEFAULT 0;
    `);

    console.log('✅ Поля добавлены:');
    console.log('  - popularityScore (рейтинг популярности)');
    console.log('  - chartPosition (позиция в чарте)');
    console.log('  - trendingDate (дата попадания в тренды)');
    console.log('  - importSource (источник импорта)');
    console.log('  - playCountExternal (прослушивания на других платформах)');

    // Создаем индексы для быстрого поиска
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tracks_popularity 
      ON "Tracks"("popularityScore" DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tracks_chart_position 
      ON "Tracks"("chartPosition" ASC) 
      WHERE "chartPosition" IS NOT NULL;
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tracks_import_source 
      ON "Tracks"("importSource");
    `);

    console.log('\n✅ Индексы созданы для оптимизации запросов');
    console.log('🎉 Миграция успешно завершена!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

migrate();

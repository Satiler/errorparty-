const { sequelize } = require('./src/config/database');

async function migrate() {
  try {
    await sequelize.query('ALTER TABLE "Tracks" ALTER COLUMN "artist" TYPE VARCHAR(1000)');
    await sequelize.query('ALTER TABLE "Tracks" ALTER COLUMN "title" TYPE VARCHAR(1000)');
    console.log('✅ Миграция выполнена');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

migrate();

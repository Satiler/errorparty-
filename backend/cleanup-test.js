const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('errorparty', 'errorparty', 'change_me_secure_password', {
  host: 'postgres',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function cleanup() {
  try {
    await sequelize.query('DELETE FROM "Tracks" WHERE id IN (10945, 10946)');
    await sequelize.query('DELETE FROM "Albums" WHERE id = 2207');
    console.log('✅ Тестовые данные удалены');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
  }
}

cleanup();

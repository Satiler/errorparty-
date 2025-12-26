/**
 * Конфигурация подключения к базе данных
 */

const { Pool } = require('pg');

// Создание пула подключений
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Максимум подключений
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Обработка ошибок пула
pool.on('error', (err) => {
  console.error('Неожиданная ошибка в pool подключений', err);
  process.exit(-1);
});

// Тестовое подключение при старте
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err);
  } else {
    console.log('Успешное подключение к БД:', res.rows[0].now);
  }
});

module.exports = pool;

// Проверка жанров в БД
const { Track, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function checkGenres() {
  try {
    const genres = await Track.findAll({
      attributes: [
        'genre',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        genre: { [Op.ne]: null }
      },
      group: ['genre'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    console.log('Жанров найдено:', genres.length);
    console.log(genres);
  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    process.exit(0);
  }
}

checkGenres();

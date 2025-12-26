const { Playlist } = require('./src/models');
const { sequelize } = require('./src/config/database');
const { Op } = require('sequelize');

async function checkPlaylists() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Проверяем артист-плейлисты
    const artistPlaylists = await Playlist.findAll({
      where: {
        name: {
          [Op.or]: [
            { [Op.iLike]: '%miyagi%' },
            { [Op.iLike]: '%eminem%' },
            { [Op.iLike]: '%rihanna%' },
            { [Op.iLike]: '%bones%' }
          ]
        }
      },
      attributes: ['id', 'name', 'trackCount', 'isPublic', 'description'],
      order: [['name', 'ASC']]
    });
    
    console.log(`Found ${artistPlaylists.length} artist playlists:\n`);
    artistPlaylists.forEach(p => {
      console.log(`${p.id}. ${p.name}`);
      console.log(`   Tracks: ${p.trackCount || 0}, Public: ${p.isPublic}`);
      console.log(`   Description: ${p.description || 'N/A'}\n`);
    });
    
    // Проверяем основные плейлисты
    const mainPlaylists = await Playlist.findAll({
      where: {
        name: {
          [Op.or]: [
            { [Op.iLike]: '%top 100%' },
            { [Op.iLike]: '%топ 100%' },
            { [Op.iLike]: '%новинки%' },
            { [Op.iLike]: '%хиты%' },
            { [Op.iLike]: '%зарубежн%' },
            { [Op.iLike]: '%billboard%' }
          ]
        }
      },
      attributes: ['id', 'name', 'trackCount', 'isPublic'],
      order: [['trackCount', 'DESC']]
    });
    
    console.log(`\nFound ${mainPlaylists.length} main playlists:\n`);
    mainPlaylists.forEach(p => {
      console.log(`${p.id}. ${p.name} - ${p.trackCount || 0} tracks (public: ${p.isPublic})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPlaylists();

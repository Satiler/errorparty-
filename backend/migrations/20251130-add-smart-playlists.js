'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Таблица для автоматических плейлистов (Плейлист дня, Премьеры, Тайник)
    await queryInterface.createTable('AutoPlaylists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'daily, premiere, stash, charts'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      trackIds: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        defaultValue: [],
        comment: 'Массив ID треков'
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Когда плейлист устареет и нужно обновить'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Параметры генерации: жанры, настроение, алгоритм'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('AutoPlaylists', ['userId', 'type'], {
      unique: true,
      name: 'auto_playlists_user_type_unique'
    });
    await queryInterface.addIndex('AutoPlaylists', ['type']);
    await queryInterface.addIndex('AutoPlaylists', ['expiresAt']);

    // Таблица предпочтений пользователя
    await queryInterface.createTable('UserPreferences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      favoriteGenres: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Любимые жанры на основе истории'
      },
      favoriteArtists: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'Любимые исполнители'
      },
      listeningHabits: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Паттерны прослушивания: время суток, частота, длительность сессий'
      },
      moodProfile: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Профиль настроения: энергичность, валентность, темп'
      },
      discoveryProfile: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Как пользователь ищет музыку: часто ли слушает новинки, открыт ли к новым жанрам'
      },
      lastAnalyzedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Когда последний раз анализировались предпочтения'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('UserPreferences', ['userId']);
    await queryInterface.addIndex('UserPreferences', ['lastAnalyzedAt']);

    // История генерации плейлистов (для A/B тестирования алгоритмов)
    await queryInterface.createTable('PlaylistHistory', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      autoPlaylistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'AutoPlaylists',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      snapshot: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Снимок плейлиста на момент генерации'
      },
      algorithm: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Какой алгоритм использовался'
      },
      engagement: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Метрики: сколько треков прослушано, лайков, скипов'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('PlaylistHistory', ['autoPlaylistId']);
    await queryInterface.addIndex('PlaylistHistory', ['userId']);
    await queryInterface.addIndex('PlaylistHistory', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PlaylistHistory');
    await queryInterface.dropTable('UserPreferences');
    await queryInterface.dropTable('AutoPlaylists');
  }
};

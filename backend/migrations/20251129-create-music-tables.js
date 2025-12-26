/**
 * Migration: Create Music Tables
 * Создание таблиц для музыкального модуля
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tracks table
    await queryInterface.createTable('Tracks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      artist: {
        type: Sequelize.STRING,
        allowNull: false
      },
      album: {
        type: Sequelize.STRING,
        allowNull: true
      },
      genre: {
        type: Sequelize.STRING,
        allowNull: true
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      coverPath: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fileFormat: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileSize: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      bitrate: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allowDownload: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      playCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      likeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      externalSource: {
        type: Sequelize.STRING,
        allowNull: true
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      externalUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Indexes for Tracks
    await queryInterface.addIndex('Tracks', ['uploadedBy']);
    await queryInterface.addIndex('Tracks', ['genre']);
    await queryInterface.addIndex('Tracks', ['artist']);
    await queryInterface.addIndex('Tracks', ['playCount']);
    await queryInterface.addIndex('Tracks', ['createdAt']);
    await queryInterface.addIndex('Tracks', ['externalSource', 'externalId']);

    // TrackLikes table
    await queryInterface.createTable('TrackLikes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Tracks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('TrackLikes', ['userId', 'trackId'], { unique: true });
    await queryInterface.addIndex('TrackLikes', ['trackId']);
    await queryInterface.addIndex('TrackLikes', ['userId']);

    // ListeningHistory table
    await queryInterface.createTable('ListeningHistory', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Tracks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      listenedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      context: {
        type: Sequelize.JSON,
        allowNull: true
      }
    });

    await queryInterface.addIndex('ListeningHistory', ['userId', 'listenedAt']);
    await queryInterface.addIndex('ListeningHistory', ['trackId']);
    await queryInterface.addIndex('ListeningHistory', ['listenedAt']);

    // Playlists table
    await queryInterface.createTable('Playlists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      coverPath: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      trackCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Playlists', ['userId']);
    await queryInterface.addIndex('Playlists', ['isPublic']);

    // PlaylistTracks table
    await queryInterface.createTable('PlaylistTracks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      playlistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Playlists',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trackId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Tracks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      addedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('PlaylistTracks', ['playlistId', 'trackId'], { unique: true });
    await queryInterface.addIndex('PlaylistTracks', ['playlistId', 'position']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PlaylistTracks');
    await queryInterface.dropTable('Playlists');
    await queryInterface.dropTable('ListeningHistory');
    await queryInterface.dropTable('TrackLikes');
    await queryInterface.dropTable('Tracks');
  }
};

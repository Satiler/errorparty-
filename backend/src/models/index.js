const { sequelize } = require('../config/database');

const User = require('./User');
const Meme = require('./Meme');
const Quote = require('./Quote');
const UserStats = require('./UserStats');
const ServerActivity = require('./ServerActivity');
const LinkToken = require('./LinkToken');
const MemeRating = require('./MemeRating');
const MemeComment = require('./MemeComment');
const ChampionHistory = require('./ChampionHistory');
const Achievement = require('./Achievement');
const UserActivity = require('./UserActivity');
const Quest = require('./Quest');
const UserQuest = require('./UserQuest');
const CS2Match = require('./CS2Match');
const CS2Demo = require('./CS2Demo');
const CS2WeaponStats = require('./CS2WeaponStats');
const CS2PlayerPerformance = require('./CS2PlayerPerformance');

// Music Models
const Track = require('./Track');
const TrackLike = require('./TrackLike');
const ListeningHistory = require('./ListeningHistory');
const Playlist = require('./Playlist');
const PlaylistTrack = require('./PlaylistTrack');
const Album = require('./Album');
const AlbumLike = require('./AlbumLike');
const AlbumComment = require('./AlbumComment');
const PlaylistSubscription = require('./PlaylistSubscription');
const PlaylistLike = require('./PlaylistLike');
const PlaylistComment = require('./PlaylistComment');
const AutoPlaylist = require('./AutoPlaylist');
const UserPreferences = require('./UserPreferences');

// Associations
Quest.hasMany(UserQuest, { foreignKey: 'questId', as: 'userProgress' });
UserQuest.belongsTo(Quest, { foreignKey: 'questId', as: 'quest' });
User.hasMany(UserQuest, { foreignKey: 'userId', as: 'quests' });
UserQuest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// CS2 Match associations
User.hasMany(CS2Match, { foreignKey: 'userId', as: 'cs2Matches' });
CS2Match.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// CS2 Demo associations
CS2Match.hasOne(CS2Demo, { foreignKey: 'matchId', as: 'demo' });
CS2Demo.belongsTo(CS2Match, { foreignKey: 'matchId', as: 'match' });

// CS2 Weapon Stats associations
User.hasMany(CS2WeaponStats, { foreignKey: 'userId', as: 'weaponStats' });
CS2WeaponStats.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CS2Match.hasMany(CS2WeaponStats, { foreignKey: 'matchId', as: 'weaponStats' });
CS2WeaponStats.belongsTo(CS2Match, { foreignKey: 'matchId', as: 'match' });

// CS2 Player Performance associations
User.hasOne(CS2PlayerPerformance, { foreignKey: 'userId', as: 'cs2Performance' });
CS2PlayerPerformance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Music associations
User.hasMany(Track, { foreignKey: 'uploadedBy', as: 'uploadedTracks' });
Track.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(TrackLike, { foreignKey: 'userId', as: 'likedTracks' });
TrackLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Track.hasMany(TrackLike, { foreignKey: 'trackId', as: 'likes' });
TrackLike.belongsTo(Track, { foreignKey: 'trackId', as: 'track' });

User.hasMany(ListeningHistory, { foreignKey: 'userId', as: 'listeningHistory' });
ListeningHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Track.hasMany(ListeningHistory, { foreignKey: 'trackId', as: 'listeningHistory' });
ListeningHistory.belongsTo(Track, { foreignKey: 'trackId', as: 'track' });

User.hasMany(Playlist, { foreignKey: 'userId', as: 'playlists' });
Playlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Playlist.hasMany(PlaylistTrack, { foreignKey: 'playlistId', as: 'tracks' });
PlaylistTrack.belongsTo(Playlist, { foreignKey: 'playlistId', as: 'playlist' });
Track.hasMany(PlaylistTrack, { foreignKey: 'trackId', as: 'playlistTracks' });
PlaylistTrack.belongsTo(Track, { foreignKey: 'trackId', as: 'track' });

// Album associations
User.hasMany(Album, { foreignKey: 'createdBy', as: 'createdAlbums' });
Album.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Album.hasMany(Track, { foreignKey: 'albumId', as: 'tracks' });
Track.belongsTo(Album, { foreignKey: 'albumId', as: 'album' });

User.hasMany(AlbumLike, { foreignKey: 'userId', as: 'albumLikes' });
AlbumLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Album.hasMany(AlbumLike, { foreignKey: 'albumId', as: 'likes' });
AlbumLike.belongsTo(Album, { foreignKey: 'albumId', as: 'album' });

User.hasMany(AlbumComment, { foreignKey: 'userId', as: 'albumComments' });
AlbumComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Album.hasMany(AlbumComment, { foreignKey: 'albumId', as: 'comments' });
AlbumComment.belongsTo(Album, { foreignKey: 'albumId', as: 'album' });
AlbumComment.hasMany(AlbumComment, { foreignKey: 'parentId', as: 'replies' });
AlbumComment.belongsTo(AlbumComment, { foreignKey: 'parentId', as: 'parent' });

// Playlist subscriptions and likes
User.hasMany(PlaylistSubscription, { foreignKey: 'userId', as: 'playlistSubscriptions' });
PlaylistSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Playlist.hasMany(PlaylistSubscription, { foreignKey: 'playlistId', as: 'subscriptions' });
PlaylistSubscription.belongsTo(Playlist, { foreignKey: 'playlistId', as: 'playlist' });

User.hasMany(PlaylistLike, { foreignKey: 'userId', as: 'playlistLikes' });
PlaylistLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Playlist.hasMany(PlaylistLike, { foreignKey: 'playlistId', as: 'likes' });
PlaylistLike.belongsTo(Playlist, { foreignKey: 'playlistId', as: 'playlist' });

User.hasMany(PlaylistComment, { foreignKey: 'userId', as: 'playlistComments' });
PlaylistComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Playlist.hasMany(PlaylistComment, { foreignKey: 'playlistId', as: 'comments' });
PlaylistComment.belongsTo(Playlist, { foreignKey: 'playlistId', as: 'playlist' });
PlaylistComment.hasMany(PlaylistComment, { foreignKey: 'parentId', as: 'replies' });
PlaylistComment.belongsTo(PlaylistComment, { foreignKey: 'parentId', as: 'parent' });

module.exports = {
  sequelize,
  User,
  Meme,
  Quote,
  UserStats,
  ServerActivity,
  LinkToken,
  MemeRating,
  MemeComment,
  ChampionHistory,
  Achievement,
  UserActivity,
  Quest,
  UserQuest,
  CS2Match,
  CS2Demo,
  CS2WeaponStats,
  CS2PlayerPerformance,
  Track,
  TrackLike,
  ListeningHistory,
  Playlist,
  PlaylistTrack,
  Album,
  AlbumLike,
  AlbumComment,
  PlaylistSubscription,
  PlaylistLike,
  PlaylistComment,
  AutoPlaylist,
  UserPreferences
};

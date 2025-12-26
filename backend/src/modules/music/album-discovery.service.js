const axios = require('axios');
const { Album, Track } = require('../../models');
const { Op } = require('sequelize');

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID || 'f531a9ea';
const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0';

class AlbumDiscoveryService {
  /**
   * Create albums from existing tracks by grouping them
   */
  async createAlbumsFromTracks() {
    try {
      console.log('[Album Discovery] Creating albums from existing tracks...');

      // Find all tracks with album info
      const tracks = await Track.findAll({
        where: {
          albumId: null,
          externalId: { [Op.like]: 'jamendo_%' }
        },
        attributes: ['id', 'externalId', 'artist', 'album', 'coverPath', 'genre']
      });

      console.log(`[Album Discovery] Found ${tracks.length} tracks without albums`);

      // Group tracks by artist + album name
      const albumGroups = {};
      for (const track of tracks) {
        if (!track.album) continue;
        
        const key = `${track.artist}||${track.album}`;
        if (!albumGroups[key]) {
          albumGroups[key] = {
            artist: track.artist,
            title: track.album,
            tracks: [],
            coverUrl: track.coverPath,
            genre: track.genre
          };
        }
        albumGroups[key].tracks.push(track.id);
      }

      console.log(`[Album Discovery] Found ${Object.keys(albumGroups).length} unique albums`);

      let created = 0;
      for (const [key, albumData] of Object.entries(albumGroups)) {
        try {
          // Check if album already exists
          const existing = await Album.findOne({
            where: {
              artist: albumData.artist,
              title: albumData.title
            }
          });

          if (existing) continue;

          // Create album
          const album = await Album.create({
            title: albumData.title,
            artist: albumData.artist,
            coverUrl: albumData.coverUrl,
            genre: albumData.genre || 'Various',
            totalTracks: albumData.tracks.length,
            sourceType: 'jamendo',
            releaseDate: new Date().toISOString().split('T')[0]
          });

          // Link tracks to album
          await Track.update(
            { albumId: album.id },
            { where: { id: albumData.tracks } }
          );

          console.log(`[Album Discovery] Created album: ${album.title} by ${album.artist} (${albumData.tracks.length} tracks)`);
          created++;

        } catch (error) {
          console.error(`[Album Discovery] Error creating album:`, error.message);
        }
      }

      return { created };

    } catch (error) {
      console.error('[Album Discovery] Error creating albums from tracks:', error);
      return { created: 0 };
    }
  }

  /**
   * Fetch popular albums from Jamendo API using tracks endpoint
   */
  async fetchPopularAlbums(limit = 20) {
    try {
      console.log(`[Album Discovery] Fetching ${limit} popular albums via tracks...`);

      // Fetch popular tracks and extract unique albums
      const response = await axios.get(`${JAMENDO_API_BASE}/tracks/`, {
        params: {
          client_id: JAMENDO_CLIENT_ID,
          format: 'json',
          limit: limit * 3, // Get more tracks to find unique albums
          order: 'popularity_month',
          include: 'musicinfo',
          imagesize: 500,
          audioformat: 'mp32',
          groupby: 'album_id'
        },
        timeout: 15000
      });

      const tracks = response.data.results || [];
      console.log(`[Album Discovery] Got ${tracks.length} tracks from API`);

      // Extract unique albums
      const albumsMap = new Map();
      for (const track of tracks) {
        if (!track.album_id || albumsMap.has(track.album_id)) continue;

        albumsMap.set(track.album_id, {
          externalId: `jamendo_album_${track.album_id}`,
          title: track.album_name,
          artist: track.artist_name,
          coverUrl: track.album_image || track.image,
          releaseDate: track.releasedate || new Date().toISOString().split('T')[0],
          genre: track.musicinfo?.tags?.genres?.[0] || 'Various',
          totalTracks: 0,
          sourceType: 'jamendo',
          sourceUrl: `https://www.jamendo.com/album/${track.album_id}`
        });
      }

      const albums = Array.from(albumsMap.values()).slice(0, limit);
      console.log(`[Album Discovery] Found ${albums.length} unique albums`);

      return albums;
    } catch (error) {
      console.error('[Album Discovery] Error fetching albums:', error.message);
      return [];
    }
  }

  /**
   * Fetch tracks for a specific album from Jamendo
   */
  async fetchAlbumTracks(albumExternalId) {
    try {
      const jamendoId = albumExternalId.replace('jamendo_', '');
      console.log(`[Album Discovery] Fetching tracks for album ${jamendoId}...`);

      const response = await axios.get(`${JAMENDO_API_BASE}/tracks/`, {
        params: {
          client_id: JAMENDO_CLIENT_ID,
          format: 'json',
          album_id: jamendoId,
          include: 'musicinfo+licenses',
          imagesize: 500,
          audioformat: 'mp32',
          limit: 50
        },
        timeout: 15000
      });

      const tracks = response.data.results || [];
      console.log(`[Album Discovery] Found ${tracks.length} tracks for album`);

      return tracks.map((track, index) => ({
        externalId: `jamendo_${track.id}`,
        title: track.name,
        artist: track.artist_name,
        duration: track.duration,
        fileUrl: track.audio || track.audiodownload,
        coverUrl: track.image || track.album_image,
        genre: track.musicinfo?.tags?.genres?.[0] || 'Unknown',
        trackNumber: index + 1,
        sourceType: 'jamendo',
        sourceUrl: track.shareurl,
        license: track.license_ccurl || 'https://creativecommons.org/licenses/by-nc-sa/3.0/'
      }));
    } catch (error) {
      console.error(`[Album Discovery] Error fetching tracks:`, error.message);
      return [];
    }
  }

  /**
   * Import albums into database (with tracks)
   */
  async importAlbums(limit = 20) {
    try {
      console.log('[Album Discovery] Starting album import process...');

      // First, try to create albums from existing tracks
      console.log('[Album Discovery] Step 1: Creating albums from existing tracks...');
      const fromTracks = await this.createAlbumsFromTracks();
      console.log(`[Album Discovery] Created ${fromTracks.created} albums from existing tracks`);

      // Then fetch new albums from API
      console.log('[Album Discovery] Step 2: Fetching new albums from API...');
      const albumsData = await this.fetchPopularAlbums(limit);
      if (!albumsData.length) {
        console.log('[Album Discovery] No new albums to import from API');
        return { 
          imported: fromTracks.created, 
          skipped: 0, 
          errors: 0,
          fromExistingTracks: fromTracks.created
        };
      }

      let imported = fromTracks.created;
      let skipped = 0;
      let errors = 0;

      for (const albumData of albumsData) {
        try {
          // Check if album already exists
          const existing = await Album.findOne({
            where: { externalId: albumData.externalId }
          });

          if (existing) {
            console.log(`[Album Discovery] Album already exists: ${albumData.title}`);
            skipped++;
            continue;
          }

          // Create album
          const album = await Album.create(albumData);
          console.log(`[Album Discovery] Created album: ${album.title} by ${album.artist}`);

          // Fetch and import tracks for this album
          const tracksData = await this.fetchAlbumTracks(albumData.externalId);
          
          if (tracksData.length > 0) {
            for (const trackData of tracksData) {
              try {
                // Check if track already exists
                const existingTrack = await Track.findOne({
                  where: { externalId: trackData.externalId }
                });

                if (!existingTrack) {
                  // Create track and link to album
                  await Track.create({
                    ...trackData,
                    albumId: album.id
                  });
                } else {
                  // Update existing track with album link
                  await existingTrack.update({ albumId: album.id });
                }
              } catch (trackError) {
                console.error(`[Album Discovery] Error importing track: ${trackError.message}`);
              }
            }

            // Update album track count
            await album.update({ totalTracks: tracksData.length });
            console.log(`[Album Discovery] Added ${tracksData.length} tracks to album ${album.title}`);
          }

          imported++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`[Album Discovery] Error importing album:`, error.message);
          errors++;
        }
      }

      const summary = { imported, skipped, errors };
      console.log('[Album Discovery] Import completed:', summary);
      return summary;

    } catch (error) {
      console.error('[Album Discovery] Fatal error during import:', error);
      throw error;
    }
  }

  /**
   * Clean up old albums with no plays or likes
   */
  async cleanupUnpopularAlbums() {
    try {
      console.log('[Album Discovery] Cleaning up unpopular albums...');

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const deleted = await Album.destroy({
        where: {
          createdAt: { [Op.lt]: threeMonthsAgo },
          playCount: 0,
          likeCount: 0,
          sourceType: 'jamendo'
        }
      });

      console.log(`[Album Discovery] Cleaned up ${deleted} unpopular albums`);
      return deleted;

    } catch (error) {
      console.error('[Album Discovery] Error during cleanup:', error);
      return 0;
    }
  }
}

module.exports = new AlbumDiscoveryService();

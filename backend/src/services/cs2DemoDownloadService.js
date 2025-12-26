const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const { CS2Match, CS2Demo } = require('../models');
const { decodeShareCode } = require('../utils/shareCodeDecoder');

const gunzip = promisify(zlib.gunzip);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * CS2 Demo Download Service
 * Handles downloading demo files from Valve's replay servers
 */
class CS2DemoDownloadService {
  constructor() {
    this.demoStoragePath = process.env.CS2_DEMO_PATH || path.join(__dirname, '../../demos');
    this.maxConcurrentDownloads = 3;
    this.downloadQueue = [];
    this.activeDownloads = 0;
  }

  /**
   * Initialize demo storage directory
   */
  async init() {
    try {
      await fs.mkdir(this.demoStoragePath, { recursive: true });
      console.log('✅ Demo storage initialized:', this.demoStoragePath);
    } catch (error) {
      console.error('Failed to create demo storage:', error);
    }
  }

  /**
   * Queue a demo download
   */
  async queueDownload(matchId, shareCode, authCode = null) {
    try {
      // Check if demo record already exists
      let demo = await CS2Demo.findOne({ where: { matchId } });
      
      if (!demo) {
        demo = await CS2Demo.create({
          matchId,
          shareCode,
          status: 'pending'
        });
      }

      if (demo.status === 'parsed' || demo.status === 'parsing') {
        console.log(`Demo already processed for match ${matchId}`);
        return demo;
      }

      // Add to download queue with auth code
      this.downloadQueue.push({ matchId, shareCode, demoId: demo.id, authCode });
      this.processQueue();

      return demo;
    } catch (error) {
      console.error('Error queueing download:', error);
      throw error;
    }
  }

  /**
   * Process download queue
   */
  async processQueue() {
    if (this.activeDownloads >= this.maxConcurrentDownloads || this.downloadQueue.length === 0) {
      return;
    }

    const task = this.downloadQueue.shift();
    this.activeDownloads++;

    try {
      await this.downloadDemo(task.matchId, task.shareCode, task.demoId, task.authCode);
    } catch (error) {
      console.error(`Failed to download demo for match ${task.matchId}:`, error);
    } finally {
      this.activeDownloads--;
      this.processQueue();
    }
  }

  /**
   * Download demo file from Valve servers using Steam Community page
   * Falls back to cluster search if Steam Community fails
   */
  async downloadDemo(matchId, shareCode, demoId, authToken = null) {
    try {
      console.log(`📥 Downloading demo for match ${matchId}...`);

      const demo = await CS2Demo.findByPk(demoId);
      if (!demo) {
        throw new Error('Demo record not found');
      }

      demo.status = 'downloading';
      await demo.save();

      // Decode share code to get match details
      const decoded = decodeShareCode(shareCode);
      const demoFileName = `${decoded.matchId}_${decoded.outcomeId}_${decoded.tokenId}.dem.bz2`;
      
      let demoUrl = null;
      let response = null;
      let foundCluster = null;
      
      // Попытка 1: Получить URL через Steam Community (если есть auth token)
      if (authToken) {
        try {
          console.log(`🔐 Trying to get demo URL from Steam Community...`);
          const steamCommunityService = require('./steamCommunityService');
          
          // Получаем Steam ID пользователя
          const match = await CS2Match.findByPk(matchId, {
            include: ['user']
          });
          
          if (match && match.user && match.user.steamId) {
            const demos = await steamCommunityService.getMatchHistoryDemos(
              match.user.steamId,
              authToken
            );
            
            // Ищем наш матч по matchId или outcomeId
            const foundDemo = demos.find(d => 
              d.matchId === decoded.matchId.toString() || 
              d.demoFile.includes(decoded.matchId.toString())
            );
            
            if (foundDemo) {
              console.log(`✅ Found demo URL via Steam Community: cluster ${foundDemo.cluster}`);
              demoUrl = foundDemo.url;
              foundCluster = foundDemo.cluster;
              
              // Скачиваем по найденному URL
              const demoData = await steamCommunityService.downloadDemoByUrl(demoUrl, matchId);
              response = { data: demoData };
            } else {
              console.log(`⚠️ Demo not found on Steam Community page (may be too old)`);
            }
          }
        } catch (communityError) {
          console.error(`⚠️ Steam Community method failed: ${communityError.message}`);
          console.log(`🔄 Falling back to cluster search...`);
        }
      }
      
      // Попытка 2: Поиск по кластерам (fallback)
      if (!response) {
        console.log(`🔍 Searching for demo across Valve replay servers...`);
        console.log(`   Match ID: ${decoded.matchId}`);
        console.log(`   Outcome ID: ${decoded.outcomeId}`);
        console.log(`   Token ID: ${decoded.tokenId}`);
        
        // Try to guess cluster from matchId (heuristic approach)
        // Valve distributes demos across ~500 clusters (0-500)
        const matchIdNum = BigInt(decoded.matchId);
        const guessedCluster = Number(matchIdNum % BigInt(512));
        
        console.log(`💡 Guessed cluster: ${guessedCluster} (from matchId % 512)`);
        
        // Priority clusters to try:
        // 1. Guessed cluster and nearby (±20)
        // 2. Common clusters (0-100)
        // 3. Rest of the range (100-500)
        const clustersToTry = [
          guessedCluster, // Primary guess
          ...Array.from({length: 20}, (_, i) => guessedCluster - 10 + i).filter(c => c >= 0 && c !== guessedCluster && c <= 500),
          ...Array.from({length: 100}, (_, i) => i).filter(c => Math.abs(c - guessedCluster) > 10),
          ...Array.from({length: 401}, (_, i) => i + 100).filter(c => Math.abs(c - guessedCluster) > 10)
        ];
        
        let attempts = 0;
        const maxAttempts = 256; // Check all clusters
        
        for (const cluster of clustersToTry) {
          if (attempts >= maxAttempts) {
            console.log(`⏸️  Checked ${maxAttempts} clusters, demo not available`);
            break;
          }
          attempts++;
          
          const url = `http://replay${cluster}.valve.net/730/${demoFileName}`;
          
          try {
            // Quick HEAD request to check if file exists
            const headResponse = await axios.head(url, {
              timeout: 3000,
              validateStatus: (status) => status === 200
            });
            
            if (headResponse.status === 200) {
              console.log(`✅ Found demo on cluster ${cluster} (attempt ${attempts})`);
              demoUrl = url;
              foundCluster = cluster;
              
              // Now download the full file
              console.log(`⬇️  Downloading demo file (${Math.round(headResponse.headers['content-length'] / 1024 / 1024)}MB)...`);
              response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 180000, // 3 minutes
                onDownloadProgress: (progressEvent) => {
                  if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    if (percentCompleted % 25 === 0) {
                      console.log(`  📊 Download progress: ${percentCompleted}%`);
                    }
                  }
                }
              });
              break;
            }
          } catch (err) {
            // Continue to next cluster
            if (attempts % 25 === 0) {
              console.log(`  ⏳ Checked ${attempts} clusters...`);
            }
            continue;
          }
        }
      }
      
      if (!response) {
        // Demo not available yet - schedule retry in 2 hours
        demo.status = 'unavailable';
        demo.parseError = 'Demo not yet available on Valve servers (common for matches <24h old)';
        demo.nextRetryAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // Retry in 2 hours
        await demo.save();
        
        console.log(`⏰ Demo unavailable, will retry at ${demo.nextRetryAt.toISOString()}`);
        throw new Error('Demo temporarily unavailable (will retry automatically)');
      }

      // Save compressed demo file
      const localPath = path.join(this.demoStoragePath, `${matchId}_${demoFileName}`);
      await fs.writeFile(localPath, response.data);

      // Update demo record
      demo.demoUrl = demoUrl;
      demo.cluster = foundCluster;
      demo.filePath = localPath;
      demo.fileSize = response.data.length;
      demo.status = 'downloaded';
      demo.downloadedAt = new Date();
      await demo.save();

      console.log(`✅ Demo downloaded successfully: ${localPath} (${Math.round(response.data.length / 1024 / 1024)}MB)`);

      return demo;

    } catch (error) {
      console.error('Download error:', error);
      
      const demo = await CS2Demo.findByPk(demoId);
      if (demo && demo.status !== 'unavailable') {
        // Only mark as failed if not already set to unavailable
        demo.status = 'failed';
        demo.parseError = error.message;
        await demo.save();
      }
      
      throw error;
    }
  }

  /**
   * Decompress BZ2 demo file
   */
  async decompressBz2(compressedData) {
    // Note: Node.js doesn't have built-in bzip2 support
    // Would need to use external library like 'unbzip2-stream' or 'seek-bzip'
    
    // For now, just return placeholder
    console.log('⚠️  BZ2 decompression requires external library');
    return compressedData;
  }

  /**
   * Get download status for a match
   */
  async getDownloadStatus(matchId) {
    try {
      const demo = await CS2Demo.findOne({ where: { matchId } });
      
      if (!demo) {
        return {
          status: 'not_started',
          message: 'Demo download not initiated'
        };
      }

      return {
        status: demo.status,
        downloadedAt: demo.downloadedAt,
        parsedAt: demo.parsedAt,
        fileSize: demo.fileSize,
        error: demo.parseError
      };

    } catch (error) {
      console.error('Error getting download status:', error);
      throw error;
    }
  }

  /**
   * Clean up old demo files to save disk space
   */
  async cleanupOldDemos(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldDemos = await CS2Demo.findAll({
        where: {
          downloadedAt: { $lt: cutoffDate },
          status: 'parsed'
        }
      });

      let deletedCount = 0;

      for (const demo of oldDemos) {
        try {
          if (demo.filePath) {
            await fs.unlink(demo.filePath);
            demo.filePath = null;
            demo.status = 'expired';
            await demo.save();
            deletedCount++;
          }
        } catch (err) {
          console.error(`Failed to delete demo file ${demo.filePath}:`, err);
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old demo files`);
      return deletedCount;

    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
}

module.exports = new CS2DemoDownloadService();

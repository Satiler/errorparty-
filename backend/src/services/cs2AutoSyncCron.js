const cron = require('node-cron');
const { User } = require('../models');
const cs2MatchSyncService = require('./cs2MatchSyncService');
const cs2DemoDownloadService = require('./cs2DemoDownloadService');

/**
 * CS2 Auto Sync Cron
 * Automatically syncs CS2 matches for users with linked authentication tokens
 */
class CS2AutoSyncCron {
  constructor() {
    this.isRunning = false;
    this.syncTask = null;
  }

  /**
   * Start the cron job
   */
  start() {
    console.log('🕐 Starting CS2 auto-sync cron job...');

    // Initialize demo download service
    cs2DemoDownloadService.init().catch(err => {
      console.error('Failed to initialize demo service:', err);
    });

    // Run every 6 hours
    this.syncTask = cron.schedule('0 */6 * * *', async () => {
      if (this.isRunning) {
        console.log('⏸️  Sync already running, skipping...');
        return;
      }

      await this.runSync();
    });

    // Also run immediately on startup (optional)
    // setTimeout(() => this.runSync(), 10000);

    console.log('✅ CS2 auto-sync cron job started (runs every 6 hours)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.syncTask) {
      this.syncTask.stop();
      console.log('⏹️  CS2 auto-sync cron job stopped');
    }
  }

  /**
   * Run sync for all users with auth tokens
   */
  async runSync() {
    try {
      this.isRunning = true;
      console.log('🔄 Starting CS2 auto-sync for all users...');

      // Find all users with CS2 auth tokens
      const users = await User.findAll({
        where: {
          cs2AuthToken: { $ne: null }
        },
        attributes: ['id', 'username', 'steamId', 'cs2AuthToken', 'cs2TokenLinkedAt']
      });

      if (users.length === 0) {
        console.log('ℹ️  No users with CS2 auth tokens found');
        return;
      }

      console.log(`📊 Found ${users.length} users with CS2 auth tokens`);

      let successCount = 0;
      let failCount = 0;
      let totalNewMatches = 0;

      for (const user of users) {
        try {
          console.log(`\n👤 Syncing matches for ${user.username} (${user.steamId})...`);

          const result = await cs2MatchSyncService.syncMatchesForUser(
            user.id,
            user.steamId,
            user.cs2AuthToken
          );

          if (result.success) {
            successCount++;
            totalNewMatches += result.stats.newMatches || 0;
            console.log(`✅ Sync completed for ${user.username}: ${result.stats.newMatches} new matches`);
          } else {
            failCount++;
            console.log(`⚠️  Sync failed for ${user.username}: ${result.message}`);
          }

          // Small delay between users to avoid rate limiting
          await this.sleep(2000);

        } catch (userError) {
          failCount++;
          console.error(`❌ Error syncing for ${user.username}:`, userError.message);
        }
      }

      console.log('\n📊 Sync Summary:');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      console.log(`   🆕 Total new matches: ${totalNewMatches}`);

    } catch (error) {
      console.error('❌ Auto-sync error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual sync trigger (for testing or admin panel)
   */
  async triggerManualSync(userId = null) {
    try {
      if (userId) {
        // Sync specific user
        const user = await User.findByPk(userId);
        
        if (!user || !user.cs2AuthToken) {
          throw new Error('User not found or auth token not linked');
        }

        console.log(`🔄 Manual sync triggered for user ${userId}`);
        
        return await cs2MatchSyncService.syncMatchesForUser(
          user.id,
          user.steamId,
          user.cs2AuthToken
        );

      } else {
        // Sync all users
        console.log('🔄 Manual sync triggered for all users');
        await this.runSync();
        return { success: true, message: 'Manual sync completed for all users' };
      }

    } catch (error) {
      console.error('Manual sync error:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const usersWithToken = await User.count({
        where: {
          cs2AuthToken: { $ne: null }
        }
      });

      return {
        isRunning: this.isRunning,
        usersWithToken,
        lastRun: null, // Would need to track this
        nextRun: this.syncTask ? 'Every 6 hours' : 'Not scheduled'
      };

    } catch (error) {
      console.error('Error getting sync stats:', error);
      return null;
    }
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CS2AutoSyncCron();

const SteamUser = require('steam-user');
const { decodeShareCode } = require('../utils/shareCodeDecoder');
const logger = console;

class SteamGCService {
  constructor() {
    this.client = null;
    this.isLoggedIn = false;
    this.isConnecting = false;
    this.gcReady = false;
    this.pendingRequests = new Map();
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Initialize and login to Steam
   * Uses anonymous login by default, or account credentials from ENV if provided
   */
  async initialize(credentials = null) {
    if (this.isLoggedIn) {
      return;
    }

    // Try to get credentials from environment variables if not provided
    if (!credentials && process.env.STEAM_GC_ACCOUNT_NAME && process.env.STEAM_GC_PASSWORD) {
      credentials = {
        accountName: process.env.STEAM_GC_ACCOUNT_NAME,
        password: process.env.STEAM_GC_PASSWORD,
      };
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.client = new SteamUser({
        enablePicsCache: false,
        autoRelogin: true,
      });

      this.client.on('loggedOn', () => {
        logger.log('✓ Steam GC: Logged in successfully');
        this.isLoggedIn = true;
        this.isConnecting = false;

        // Launch CS2 app to connect to GC
        this.client.gamesPlayed([730]); // CS2 AppID
        logger.log('✓ Steam GC: Launched CS2 app');
      });

      this.client.on('appLaunched', (appid) => {
        if (appid === 730) {
          logger.log('✓ Steam GC: CS2 app launched, GC ready');
          this.gcReady = true;
          resolve();
        }
      });

      this.client.on('error', (err) => {
        logger.error('✗ Steam GC Error:', err);
        this.isConnecting = false;
        
        // Reject pending requests
        for (const [id, request] of this.pendingRequests) {
          request.reject(err);
          this.pendingRequests.delete(id);
        }
        
        reject(err);
      });

      this.client.on('disconnected', (eresult, msg) => {
        logger.warn(`Steam GC disconnected: ${msg} (${eresult})`);
        this.isLoggedIn = false;
        this.gcReady = false;
      });

      // Listen for GC messages
      this.client.on('receivedFromGC', (appid, msgType, payload) => {
        if (appid === 730) {
          this._handleGCMessage(msgType, payload);
        }
      });

      // Login (anonymous or with credentials)
      if (credentials && credentials.accountName && credentials.password) {
        logger.log('Logging into Steam with account credentials...');
        this.client.logOn({
          accountName: credentials.accountName,
          password: credentials.password,
        });
      } else {
        logger.log('Logging into Steam anonymously...');
        this.client.logOn({
          anonymous: true,
        });
      }

      // Timeout for connection
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          reject(new Error('Steam GC connection timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Get demo download URL for a match
   * @param {string} shareCode - CS2 Share Code (e.g., "CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx")
   * @returns {Promise<{demoUrl: string, matchData: object}>}
   */
  async getDemoUrl(shareCode) {
    if (!this.isLoggedIn || !this.gcReady) {
      await this.initialize();
    }

    // Decode share code
    const decoded = decodeShareCode(shareCode);
    logger.log(`Requesting demo URL for match ${decoded.matchId}`);

    // Dynamically import csgo-protobuf (ES Module) and protobuf helpers
    const Protos = await import('csgo-protobuf');
    const { toBinary, create } = await import('@bufbuild/protobuf');

    // Create protobuf message
    const message = create(Protos.CMsgGCCStrike15_v2_MatchListRequestFullGameInfoSchema, {
      matchid: decoded.matchId,
      outcomeid: decoded.outcomeId,
      token: decoded.tokenId,
    });

    // Encode using @bufbuild/protobuf
    const payload = toBinary(
      Protos.CMsgGCCStrike15_v2_MatchListRequestFullGameInfoSchema,
      message
    );

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout: Steam GC did not respond'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
        matchId: decoded.matchId,
      });

      // Send to GC
      // Message type: k_EMsgGCCStrike15_v2_MatchListRequestFullGameInfo = 9109
      this.client.sendToGC(730, 9109, {}, Buffer.from(payload));
    });
  }

  /**
   * Handle incoming GC messages
   */
  async _handleGCMessage(msgType, payload) {
    // k_EMsgGCCStrike15_v2_MatchList = 9097
    if (msgType === 9097) {
      try {
        // Dynamically import csgo-protobuf (ES Module) and protobuf helpers
        const Protos = await import('csgo-protobuf');
        const { fromBinary } = await import('@bufbuild/protobuf');
        
        const matchList = fromBinary(
          Protos.CMsgGCCStrike15_v2_MatchListSchema,
          new Uint8Array(payload)
        );

        if (!matchList.matches || matchList.matches.length === 0) {
          logger.warn('No matches found in GC response');
          
          // Reject all pending requests
          for (const [id, request] of this.pendingRequests) {
            request.reject(new Error('No matches found'));
            this.pendingRequests.delete(id);
          }
          return;
        }

        // Process each match
        for (const match of matchList.matches) {
          const matchId = match.matchid?.toString();
          
          // Find pending request for this match
          for (const [id, request] of this.pendingRequests) {
            if (request.matchId.toString() === matchId) {
              const demoUrl = match.roundstatsall?.[0]?.map || null;
              
              if (demoUrl) {
                logger.log(`✓ Got demo URL for match ${matchId}: ${demoUrl}`);
                request.resolve({
                  demoUrl,
                  matchData: {
                    matchId: match.matchid,
                    matchTime: match.matchtime,
                    watchablematchinfo: match.watchablematchinfo,
                    roundstatsall: match.roundstatsall,
                  },
                });
              } else {
                logger.warn(`✗ No demo URL found for match ${matchId}`);
                request.reject(new Error('Demo URL not available in match data'));
              }
              
              this.pendingRequests.delete(id);
              break;
            }
          }
        }
      } catch (err) {
        logger.error('Error decoding GC message:', err);
      }
    }
  }

  /**
   * Disconnect from Steam
   */
  disconnect() {
    if (this.client) {
      this.client.logOff();
      this.client = null;
      this.isLoggedIn = false;
      this.gcReady = false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isLoggedIn && this.gcReady;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getSteamGCService: () => {
    if (!instance) {
      instance = new SteamGCService();
    }
    return instance;
  },
};

const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.config = {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null
    };
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      console.log('🔌 Connecting to Redis...');
      
      const redisConfig = {
        socket: {
          host: this.config.host,
          port: this.config.port
        }
      };

      if (this.config.password) {
        redisConfig.password = this.config.password;
      }

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.connected = true;
      });

      await this.client.connect();

      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      this.connected = false;
      return false;
    }
  }

  /**
   * Set value with TTL (Time To Live)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = 300) {
    if (!this.connected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping cache set');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('❌ Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null
   */
  async get(key) {
    if (!this.connected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('❌ Redis DELETE error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'steam:*')
   */
  async deletePattern(pattern) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('❌ Redis DELETE PATTERN error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  async exists(key) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute callback and cache result
   * @param {string} key - Cache key
   * @param {Function} callback - Async function to execute if cache miss
   * @param {number} ttl - Time to live in seconds
   */
  async getOrSet(key, callback, ttl = 300) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      console.log(`📦 Cache HIT: ${key}`);
      return cached;
    }

    console.log(`🔍 Cache MISS: ${key}`);
    
    // Execute callback to get fresh data
    const value = await callback();
    
    // Cache the result
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      console.log('🔌 Redis disconnected');
    }
  }
}

// Export singleton instance
const redisService = new RedisService();
module.exports = redisService;

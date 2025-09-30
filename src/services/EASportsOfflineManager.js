/**
 * EA Sports Offline Manager Extension
 * Extends offline capabilities specifically for EA Sports API data
 */

class EASportsOfflineManager {
  constructor() {
    this.eaSportsCache = new Map();
    this.marketDataCache = new Map();
    this.liveMatchCache = new Map();
    this.cacheTTL = {
      playerData: 30 * 60 * 1000, // 30 minutes
      marketData: 5 * 60 * 1000,  // 5 minutes
      liveMatch: 60 * 1000        // 1 minute
    };
    this.storageKey = 'ea_sports_offline_data';
    this.loadFromLocalStorage();
  }

  /**
   * Cache player data for offline access
   * @param {string} playerName - Player identifier
   * @param {Object} data - Player data to cache
   */
  cachePlayerData(playerName, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      type: 'player'
    };
    
    this.eaSportsCache.set(playerName, cacheEntry);
    this.persistToLocalStorage();
    
    console.log(`💾 Cached player data for ${playerName}`);
  }

  /**
   * Get cached player data
   * @param {string} playerName - Player identifier
   * @returns {Object|null} Cached data or null if expired/not found
   */
  getCachedPlayerData(playerName) {
    const cached = this.eaSportsCache.get(playerName);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL.playerData) {
      this.eaSportsCache.delete(playerName);
      this.persistToLocalStorage();
      return null;
    }
    
    console.log(`📦 Retrieved cached player data for ${playerName} (age: ${Math.floor(age / 1000)}s)`);
    return cached.data;
  }

  /**
   * Cache market data for offline access
   * @param {string} playerId - Player identifier
   * @param {Object} data - Market data to cache
   */
  cacheMarketData(playerId, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      type: 'market'
    };
    
    this.marketDataCache.set(playerId, cacheEntry);
    this.persistToLocalStorage();
    
    console.log(`💾 Cached market data for ${playerId}`);
  }

  /**
   * Get cached market data
   * @param {string} playerId - Player identifier
   * @returns {Object|null} Cached data or null if expired/not found
   */
  getCachedMarketData(playerId) {
    const cached = this.marketDataCache.get(playerId);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL.marketData) {
      this.marketDataCache.delete(playerId);
      this.persistToLocalStorage();
      return null;
    }
    
    console.log(`📦 Retrieved cached market data for ${playerId} (age: ${Math.floor(age / 1000)}s)`);
    return cached.data;
  }

  /**
   * Cache live match data for offline access
   * @param {string} matchId - Match identifier
   * @param {Object} data - Match data to cache
   */
  cacheLiveMatchData(matchId, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      type: 'liveMatch'
    };
    
    this.liveMatchCache.set(matchId, cacheEntry);
    // Don't persist live match data to localStorage (too volatile)
    
    console.log(`💾 Cached live match data for ${matchId}`);
  }

  /**
   * Get cached live match data
   * @param {string} matchId - Match identifier
   * @returns {Object|null} Cached data or null if expired/not found
   */
  getCachedLiveMatchData(matchId) {
    const cached = this.liveMatchCache.get(matchId);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL.liveMatch) {
      this.liveMatchCache.delete(matchId);
      return null;
    }
    
    console.log(`📦 Retrieved cached live match data for ${matchId} (age: ${Math.floor(age / 1000)}s)`);
    return cached.data;
  }

  /**
   * Persist cache to localStorage
   */
  persistToLocalStorage() {
    try {
      const dataToStore = {
        playerData: Array.from(this.eaSportsCache.entries()),
        marketData: Array.from(this.marketDataCache.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
      console.log('💾 EA Sports cache persisted to localStorage');
    } catch (error) {
      console.warn('Failed to persist EA Sports cache:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      // Restore player data cache
      if (data.playerData) {
        this.eaSportsCache = new Map(data.playerData);
        console.log(`📦 Loaded ${this.eaSportsCache.size} cached player entries`);
      }
      
      // Restore market data cache
      if (data.marketData) {
        this.marketDataCache = new Map(data.marketData);
        console.log(`📦 Loaded ${this.marketDataCache.size} cached market entries`);
      }
      
      // Clean up expired entries
      this.cleanupExpiredEntries();
    } catch (error) {
      console.warn('Failed to load EA Sports cache:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries() {
    let cleaned = 0;
    
    // Clean player data cache
    for (const [key, entry] of this.eaSportsCache.entries()) {
      const age = Date.now() - entry.timestamp;
      if (age > this.cacheTTL.playerData) {
        this.eaSportsCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean market data cache
    for (const [key, entry] of this.marketDataCache.entries()) {
      const age = Date.now() - entry.timestamp;
      if (age > this.cacheTTL.marketData) {
        this.marketDataCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
      this.persistToLocalStorage();
    }
  }

  /**
   * Clear all EA Sports caches
   */
  clearAllCaches() {
    this.eaSportsCache.clear();
    this.marketDataCache.clear();
    this.liveMatchCache.clear();
    
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
    
    console.log('🗑️ All EA Sports caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    
    const calculateStats = (cache, ttl) => {
      let valid = 0;
      let expired = 0;
      let totalSize = 0;
      
      for (const entry of cache.values()) {
        const age = now - entry.timestamp;
        if (age <= ttl) {
          valid++;
        } else {
          expired++;
        }
        totalSize += JSON.stringify(entry.data).length;
      }
      
      return { valid, expired, totalSize };
    };
    
    return {
      playerData: {
        ...calculateStats(this.eaSportsCache, this.cacheTTL.playerData),
        total: this.eaSportsCache.size
      },
      marketData: {
        ...calculateStats(this.marketDataCache, this.cacheTTL.marketData),
        total: this.marketDataCache.size
      },
      liveMatch: {
        total: this.liveMatchCache.size,
        valid: this.liveMatchCache.size, // Always considered valid until TTL
        expired: 0,
        totalSize: 0
      }
    };
  }

  /**
   * Pre-cache important players for offline access
   * @param {Array<string>} playerNames - Array of player names to cache
   */
  async preCachePlayers(playerNames) {
    console.log(`🔄 Pre-caching ${playerNames.length} players...`);
    
    // This would integrate with eaSportsIntegration
    if (typeof window !== 'undefined' && window.EASportsIntegration) {
      const results = {
        cached: 0,
        failed: 0
      };
      
      for (const playerName of playerNames) {
        try {
          const data = await window.EASportsIntegration.getPlayerData(playerName);
          if (data.data) {
            this.cachePlayerData(playerName, data.data);
            results.cached++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.warn(`Failed to pre-cache ${playerName}:`, error);
          results.failed++;
        }
      }
      
      console.log(`✅ Pre-cache completed: ${results.cached} cached, ${results.failed} failed`);
      return results;
    }
    
    console.warn('EASportsIntegration not available for pre-caching');
    return { cached: 0, failed: playerNames.length };
  }

  /**
   * Schedule automatic cache cleanup
   */
  scheduleCleanup(intervalMs = 5 * 60 * 1000) {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, intervalMs);
    
    console.log(`⏰ Scheduled cache cleanup every ${intervalMs / 1000}s`);
  }

  /**
   * Get offline fallback data for a player
   * @param {string} playerName - Player identifier
   * @returns {Object} Fallback data with offline indicator
   */
  getOfflineFallbackData(playerName) {
    const cached = this.getCachedPlayerData(playerName);
    
    if (cached) {
      return {
        ...cached,
        offline: true,
        offlineMessage: 'Cached data (offline mode)'
      };
    }
    
    // Return generic fallback if no cache available
    return {
      name: playerName,
      overall: 75,
      position: 'Unknown',
      club: 'Unknown',
      offline: true,
      offlineMessage: 'Generic data (no cache available)',
      warning: 'Unable to fetch current data. Please connect to the internet for updated information.'
    };
  }

  /**
   * Check if offline mode is active
   */
  isOfflineMode() {
    return !navigator.onLine;
  }

  /**
   * Get comprehensive offline status
   */
  getOfflineStatus() {
    const stats = this.getCacheStats();
    
    return {
      isOffline: this.isOfflineMode(),
      cacheStats: stats,
      totalCachedEntries: stats.playerData.total + stats.marketData.total + stats.liveMatch.total,
      hasValidCache: stats.playerData.valid > 0 || stats.marketData.valid > 0,
      storageSize: this.getStorageSize()
    };
  }

  /**
   * Get approximate storage size in bytes
   */
  getStorageSize() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const eaSportsOfflineManager = new EASportsOfflineManager();

// Make it available globally
if (typeof window !== 'undefined') {
  window.EASportsOfflineManager = eaSportsOfflineManager;
}

export default EASportsOfflineManager;

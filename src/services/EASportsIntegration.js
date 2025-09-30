/**
 * EA Sports API Integration Manager
 * Coordinates all EA Sports API services and integrations
 * Main entry point for EA Sports functionality
 */

import { eaFCAPIService } from './EAFCAPIService.js';
import { transferMarketService } from './TransferMarketService.js';
import { backgroundJobService } from './BackgroundJobService.js';

class EASportsIntegrationManager {
  constructor() {
    this.initialized = false;
    this.apiConnected = false;
    this.syncStatus = {
      lastPlayerSync: null,
      lastMarketSync: null,
      lastAlertCheck: null
    };
    this.stats = {
      totalApiCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cachedCalls: 0
    };
  }

  /**
   * Initialize the EA Sports integration
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    if (this.initialized) {
      console.log('ℹ️ EA Sports Integration already initialized');
      return;
    }

    console.log('🚀 Initializing EA Sports Integration...');

    try {
      // Test API connectivity
      const connectivity = await eaFCAPIService.testConnectivity();
      this.apiConnected = connectivity.connected;

      console.log(`🔌 EA Sports API: ${connectivity.message}`);

      // Initialize background jobs if enabled
      if (options.enableBackgroundJobs !== false) {
        await backgroundJobService.initialize();
      }

      // Load saved watchlist
      transferMarketService.loadWatchlist();

      // Request notification permission if needed
      if (options.enableNotifications) {
        await backgroundJobService.requestNotificationPermission();
      }

      this.initialized = true;
      console.log('✅ EA Sports Integration initialized successfully');

      // Dispatch initialization event
      this.dispatchEvent('eaSportsInitialized', {
        apiConnected: this.apiConnected,
        backgroundJobsEnabled: options.enableBackgroundJobs !== false
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize EA Sports Integration:', error);
      throw error;
    }
  }

  /**
   * Get player data with automatic fallback
   * @param {string} playerName - Player name
   * @param {Object} options - Fetch options
   */
  async getPlayerData(playerName, options = {}) {
    try {
      this.stats.totalApiCalls++;
      const result = await eaFCAPIService.getPlayerData(playerName, options);
      
      if (result.source === 'cache') {
        this.stats.cachedCalls++;
      } else if (result.data) {
        this.stats.successfulCalls++;
      } else {
        this.stats.failedCalls++;
      }

      return result;
    } catch (error) {
      this.stats.failedCalls++;
      console.error('Error fetching player data:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Batch update players from EA Sports API
   * @param {Array} players - Array of player objects
   * @param {Function} progressCallback - Progress callback function
   */
  async batchUpdatePlayers(players, progressCallback) {
    console.log(`🔄 Starting batch update for ${players.length} players...`);
    
    const results = {
      updated: [],
      failed: [],
      unchanged: [],
      progress: 0
    };

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      try {
        const playerData = await this.getPlayerData(player.name, { forceRefresh: true });
        
        if (playerData.data) {
          results.updated.push({
            ...player,
            updatedData: playerData.data
          });
        } else {
          results.unchanged.push(player);
        }
      } catch (error) {
        results.failed.push({
          ...player,
          error: error.message
        });
      }

      results.progress = Math.floor(((i + 1) / players.length) * 100);
      
      if (progressCallback) {
        progressCallback(results.progress, results);
      }
    }

    console.log(`✅ Batch update completed: ${results.updated.length} updated, ${results.failed.length} failed`);
    
    this.dispatchEvent('batchUpdateComplete', results);
    return results;
  }

  /**
   * Get live match data
   * @param {string} matchId - Match identifier
   */
  async getLiveMatchData(matchId) {
    try {
      this.stats.totalApiCalls++;
      const matchData = await eaFCAPIService.getLiveMatchData(matchId);
      this.stats.successfulCalls++;
      return { data: matchData, source: 'live' };
    } catch (error) {
      this.stats.failedCalls++;
      console.error('Error fetching live match data:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get market price for a player
   * @param {string} playerIdOrName - Player identifier
   */
  async getMarketPrice(playerIdOrName) {
    try {
      this.stats.totalApiCalls++;
      const result = await transferMarketService.getMarketPrice(playerIdOrName);
      
      if (result.source === 'cache') {
        this.stats.cachedCalls++;
      } else {
        this.stats.successfulCalls++;
      }

      return result;
    } catch (error) {
      this.stats.failedCalls++;
      console.error('Error fetching market price:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get market insights for a player
   * @param {string} playerIdOrName - Player identifier
   */
  async getMarketInsights(playerIdOrName) {
    try {
      this.stats.totalApiCalls++;
      const insights = await transferMarketService.getMarketInsights(playerIdOrName);
      this.stats.successfulCalls++;
      return insights;
    } catch (error) {
      this.stats.failedCalls++;
      console.error('Error getting market insights:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Add player to transfer market watchlist
   * @param {string} playerId - Player identifier
   * @param {Object} alertConfig - Alert configuration
   */
  addToWatchlist(playerId, alertConfig) {
    transferMarketService.addToWatchlist(playerId, alertConfig);
    this.dispatchEvent('watchlistUpdated', {
      action: 'added',
      playerId,
      alertConfig
    });
  }

  /**
   * Remove player from watchlist
   * @param {string} playerId - Player identifier
   */
  removeFromWatchlist(playerId) {
    transferMarketService.removeFromWatchlist(playerId);
    this.dispatchEvent('watchlistUpdated', {
      action: 'removed',
      playerId
    });
  }

  /**
   * Get watchlist summary
   */
  getWatchlistSummary() {
    return transferMarketService.getWatchlistSummary();
  }

  /**
   * Manually trigger player data sync
   */
  async syncPlayerData() {
    console.log('🔄 Manually triggering player data sync...');
    try {
      const result = await backgroundJobService.runJob('player_updates');
      this.syncStatus.lastPlayerSync = new Date().toISOString();
      return result;
    } catch (error) {
      console.error('Player sync failed:', error);
      throw error;
    }
  }

  /**
   * Manually trigger market price sync
   */
  async syncMarketPrices() {
    console.log('🔄 Manually triggering market price sync...');
    try {
      const result = await backgroundJobService.runJob('market_prices');
      this.syncStatus.lastMarketSync = new Date().toISOString();
      return result;
    } catch (error) {
      console.error('Market sync failed:', error);
      throw error;
    }
  }

  /**
   * Get background jobs status
   */
  getBackgroundJobsStatus() {
    return backgroundJobService.getAllJobsStatus();
  }

  /**
   * Get job history
   */
  getJobHistory(jobName = null, limit = 20) {
    return backgroundJobService.getJobHistory(jobName, limit);
  }

  /**
   * Enable/disable a background job
   */
  setJobEnabled(jobName, enabled) {
    return backgroundJobService.setJobEnabled(jobName, enabled);
  }

  /**
   * Update job interval
   */
  updateJobInterval(jobName, newInterval) {
    return backgroundJobService.updateJobInterval(jobName, newInterval);
  }

  /**
   * Get integration statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalApiCalls > 0 
        ? ((this.stats.successfulCalls / this.stats.totalApiCalls) * 100).toFixed(2) + '%'
        : '0%',
      cacheHitRate: this.stats.totalApiCalls > 0
        ? ((this.stats.cachedCalls / this.stats.totalApiCalls) * 100).toFixed(2) + '%'
        : '0%',
      syncStatus: this.syncStatus,
      initialized: this.initialized,
      apiConnected: this.apiConnected
    };
  }

  /**
   * Get comprehensive status report
   */
  getStatusReport() {
    return {
      integration: {
        initialized: this.initialized,
        apiConnected: this.apiConnected,
        version: '1.0.0'
      },
      stats: this.getStats(),
      backgroundJobs: this.getBackgroundJobsStatus(),
      watchlist: this.getWatchlistSummary(),
      lastSync: this.syncStatus
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalApiCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cachedCalls: 0
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    eaFCAPIService.clearCache();
    transferMarketService.clearCache();
    console.log('✅ All caches cleared');
  }

  /**
   * Stop all background jobs
   */
  stop() {
    backgroundJobService.stop();
    this.initialized = false;
    console.log('⏹️ EA Sports Integration stopped');
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(eventName, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`eaSports_${eventName}`, { detail }));
    }
  }

  /**
   * Test connection and get diagnostic info
   */
  async runDiagnostics() {
    console.log('🔍 Running EA Sports API diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      connectivity: null,
      samplePlayer: null,
      marketPrice: null,
      backgroundJobs: null
    };

    // Test API connectivity
    try {
      diagnostics.connectivity = await eaFCAPIService.testConnectivity();
    } catch (error) {
      diagnostics.connectivity = { error: error.message };
    }

    // Test player data fetch
    try {
      const playerTest = await this.getPlayerData('Mbappe');
      diagnostics.samplePlayer = {
        success: !!playerTest.data,
        source: playerTest.source
      };
    } catch (error) {
      diagnostics.samplePlayer = { error: error.message };
    }

    // Test market price fetch
    try {
      const priceTest = await this.getMarketPrice('test_player');
      diagnostics.marketPrice = {
        success: !!priceTest.data,
        source: priceTest.source
      };
    } catch (error) {
      diagnostics.marketPrice = { error: error.message };
    }

    // Get background jobs status
    try {
      diagnostics.backgroundJobs = this.getBackgroundJobsStatus();
    } catch (error) {
      diagnostics.backgroundJobs = { error: error.message };
    }

    console.log('✅ Diagnostics completed:', diagnostics);
    return diagnostics;
  }
}

// Export singleton instance
export const eaSportsIntegration = new EASportsIntegrationManager();

// Make it available globally for legacy compatibility
if (typeof window !== 'undefined') {
  window.EASportsIntegration = eaSportsIntegration;
}

export default EASportsIntegrationManager;

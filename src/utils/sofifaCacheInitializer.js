/**
 * SoFIFA Cache Initializer
 * This utility helps initialize the SoFIFA cache with data from the local JSON file
 * Call this on app startup to ensure cache is populated
 */

import SofifaService from '../services/sofifaService';

export class SofifaCacheInitializer {
  static initialized = false;
  static initializing = false;

  /**
   * Initialize the cache with data from local JSON file
   * This should be called once on app startup
   * @param {Object} options - Initialization options
   * @param {boolean} options.force - Force re-initialization even if already done
   * @returns {Promise<Object>} Initialization result
   */
  static async initialize(options = {}) {
    const { force = false } = options;

    // Prevent multiple simultaneous initializations
    if (this.initializing) {
      console.log('⏳ Cache initialization already in progress...');
      return { status: 'in_progress' };
    }

    // Skip if already initialized (unless force is true)
    if (this.initialized && !force) {
      console.log('✅ Cache already initialized');
      return { status: 'already_initialized' };
    }

    try {
      this.initializing = true;
      console.log('🚀 Initializing SoFIFA cache from local JSON...');

      const result = await SofifaService.populateCacheFromJSON();

      this.initialized = true;
      this.initializing = false;

      console.log(`✅ Cache initialization complete: ${result.success}/${result.total} players`);

      return {
        status: 'success',
        ...result
      };
    } catch (error) {
      this.initializing = false;
      console.error('❌ Cache initialization failed:', error);
      
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check if cache needs initialization
   * @returns {Promise<boolean>} True if initialization is needed
   */
  static async needsInitialization() {
    if (this.initialized) {
      return false;
    }

    try {
      // Check if cache has any data
      const watchlist = await SofifaService.getWatchlist();
      
      if (watchlist.length === 0) {
        return true; // No watchlist entries, needs init
      }

      // Check if at least some watchlist players have cached data
      const cachedPlayer = await SofifaService.getCachedData(watchlist[0].sofifa_id);
      
      return cachedPlayer === null; // Needs init if no cache data
    } catch (error) {
      console.warn('Error checking cache status:', error);
      return true; // Assume needs init on error
    }
  }

  /**
   * Get initialization status
   * @returns {Object} Status information
   */
  static getStatus() {
    return {
      initialized: this.initialized,
      initializing: this.initializing
    };
  }
}

export default SofifaCacheInitializer;

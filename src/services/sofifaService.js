/**
 * SoFIFA Service
 * Frontend service to interact with SoFIFA data through Supabase Edge Function proxy
 * This ensures API keys are not exposed in the client
 */

import { supabase } from '../utils/supabase';

class SofifaService {
  /**
   * Base URL for the Supabase Edge Function
   * This will be configured based on your Supabase project
   */
  static EDGE_FUNCTION_URL = null;

  /**
   * Initialize the service with Supabase configuration
   */
  static initialize() {
    if (supabase && supabase.functions) {
      this.EDGE_FUNCTION_URL = supabase.functions;
    }
  }

  /**
   * Fetch player data from SoFIFA via the proxy
   * @param {number} sofifaId - The SoFIFA player ID
   * @param {Object} options - Additional options
   * @param {boolean} options.useCache - Whether to use cached data (default: true)
   * @returns {Promise<Object>} Player data
   */
  static async fetchPlayerData(sofifaId, options = {}) {
    const { useCache = true } = options;

    try {
      if (!sofifaId || typeof sofifaId !== 'number') {
        throw new Error('Invalid sofifaId parameter');
      }

      // Initialize if not already done
      if (!this.EDGE_FUNCTION_URL) {
        this.initialize();
      }

      console.log(`🌐 Fetching SoFIFA data for ID ${sofifaId} via proxy...`);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('sofifa-proxy', {
        body: { sofifaId, useCache }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to fetch player data');
      }

      console.log(`✅ Successfully fetched data for SoFIFA ID ${sofifaId}`);
      return data;

    } catch (error) {
      console.error('Error fetching SoFIFA data:', error);
      throw error;
    }
  }

  /**
   * Fetch multiple players in batch
   * @param {number[]} sofifaIds - Array of SoFIFA player IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Object[]>} Array of player data
   */
  static async fetchMultiplePlayers(sofifaIds, options = {}) {
    try {
      if (!Array.isArray(sofifaIds) || sofifaIds.length === 0) {
        throw new Error('Invalid sofifaIds parameter');
      }

      console.log(`🌐 Fetching ${sofifaIds.length} players from SoFIFA...`);

      // Fetch all players in parallel
      const promises = sofifaIds.map(id => 
        this.fetchPlayerData(id, options).catch(err => {
          console.warn(`Failed to fetch player ${id}:`, err.message);
          return null;
        })
      );

      const results = await Promise.all(promises);
      
      // Filter out failed requests
      const successfulResults = results.filter(r => r !== null);
      
      console.log(`✅ Successfully fetched ${successfulResults.length}/${sofifaIds.length} players`);
      
      return successfulResults;
    } catch (error) {
      console.error('Error in batch fetch:', error);
      throw error;
    }
  }

  /**
   * Get the watchlist of players from the database
   * @returns {Promise<Object[]>} Array of watchlist entries
   */
  static async getWatchlist() {
    try {
      const { data, error } = await supabase
        .from('sofifa_watchlist')
        .select('sofifa_id, display_name')
        .order('display_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      throw error;
    }
  }

  /**
   * Add a player to the watchlist
   * @param {number} sofifaId - The SoFIFA player ID
   * @param {string} displayName - Display name for the player
   * @returns {Promise<Object>} Insert result
   */
  static async addToWatchlist(sofifaId, displayName) {
    try {
      const { data, error } = await supabase
        .from('sofifa_watchlist')
        .insert({ sofifa_id: sofifaId, display_name: displayName })
        .select();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  }

  /**
   * Remove a player from the watchlist
   * @param {number} sofifaId - The SoFIFA player ID
   * @returns {Promise<Object>} Delete result
   */
  static async removeFromWatchlist(sofifaId) {
    try {
      const { error } = await supabase
        .from('sofifa_watchlist')
        .delete()
        .eq('sofifa_id', sofifaId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  }

  /**
   * Get cached data for a player (if available)
   * @param {number} sofifaId - The SoFIFA player ID
   * @returns {Promise<Object|null>} Cached data or null
   */
  static async getCachedData(sofifaId) {
    try {
      const { data, error } = await supabase
        .from('sofifa_cache')
        .select('payload, cached_at, ttl_seconds')
        .eq('sofifa_id', sofifaId)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache is still valid
      const cachedAt = new Date(data.cached_at).getTime();
      const now = Date.now();
      const ttlMs = data.ttl_seconds * 1000;

      if (now - cachedAt < ttlMs) {
        return {
          ...data.payload,
          cached_at: data.cached_at,
          from_cache: true
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific player
   * @param {number} sofifaId - The SoFIFA player ID
   * @returns {Promise<Object>} Delete result
   */
  static async clearCache(sofifaId) {
    try {
      const { error } = await supabase
        .from('sofifa_cache')
        .delete()
        .eq('sofifa_id', sofifaId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get watchlist players with their data
   * Fetches the watchlist and retrieves data for each player
   * @param {Object} options - Fetch options
   * @returns {Promise<Object[]>} Array of player data with watchlist info
   */
  static async getWatchlistWithData(options = {}) {
    try {
      // Get watchlist
      const watchlist = await this.getWatchlist();
      
      if (watchlist.length === 0) {
        return [];
      }

      // Fetch data for all watchlist players
      const sofifaIds = watchlist.map(w => w.sofifa_id);
      const playersData = await this.fetchMultiplePlayers(sofifaIds, options);

      // Merge watchlist info with player data
      const result = playersData.map(playerData => {
        const watchlistEntry = watchlist.find(w => w.sofifa_id === playerData.data.id);
        return {
          ...playerData,
          display_name: watchlistEntry?.display_name
        };
      });

      return result;
    } catch (error) {
      console.error('Error fetching watchlist with data:', error);
      throw error;
    }
  }
}

// Initialize on module load
SofifaService.initialize();

export default SofifaService;

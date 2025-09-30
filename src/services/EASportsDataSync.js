/**
 * EA Sports Data Sync Adapter
 * Bridges EA Sports API integration with existing fifaDataService and dataManager
 */

import { eaSportsIntegration } from './EASportsIntegration.js';
import { dataManager } from '../../dataManager.js';
import { supabase } from '../../supabaseClient.js';

class EASportsDataSyncAdapter {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncResult = null;
  }

  /**
   * Sync all database players with EA Sports API
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncAllPlayers(options = { forceRefresh: false }) {
    if (this.syncInProgress) {
      console.warn('⚠️ Sync already in progress');
      return { error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting comprehensive player data sync...');

    const results = {
      total: 0,
      updated: 0,
      failed: 0,
      unchanged: 0,
      details: [],
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0
    };

    try {
      // Get all players from database
      const { data: players, error } = await dataManager.getAll('players');
      
      if (error) {
        throw new Error(`Failed to fetch players: ${error.message}`);
      }

      if (!players || players.length === 0) {
        console.log('ℹ️ No players found in database');
        return results;
      }

      results.total = players.length;
      console.log(`📊 Found ${results.total} players to sync`);

      // Batch update with EA Sports data
      const batchResults = await eaSportsIntegration.batchUpdatePlayers(
        players,
        (progress, intermediateResults) => {
          console.log(`Progress: ${progress}% (${intermediateResults.updated.length} updated)`);
        }
      );

      // Process results and update database
      for (const updated of batchResults.updated) {
        try {
          const updatedData = this.mergePlayerData(updated, updated.updatedData);
          
          // Update in database
          const { error: updateError } = await dataManager.update(
            'players',
            updated.id,
            updatedData
          );

          if (updateError) {
            console.warn(`Failed to update player ${updated.name}:`, updateError);
            results.failed++;
          } else {
            results.updated++;
            
            // Log the update
            await this.logPlayerUpdate(updated.id, updated.name, updated.updatedData);
          }

          results.details.push({
            id: updated.id,
            name: updated.name,
            status: updateError ? 'failed' : 'updated',
            error: updateError?.message
          });
        } catch (error) {
          console.warn(`Error processing player ${updated.name}:`, error);
          results.failed++;
          results.details.push({
            id: updated.id,
            name: updated.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      results.unchanged = batchResults.unchanged.length;
      results.failed += batchResults.failed.length;

      // Add failed players to details
      for (const failed of batchResults.failed) {
        results.details.push({
          id: failed.id,
          name: failed.name,
          status: 'failed',
          error: failed.error
        });
      }

      results.endTime = new Date().toISOString();
      results.duration = new Date(results.endTime) - new Date(results.startTime);

      console.log(`✅ Sync completed: ${results.updated} updated, ${results.failed} failed, ${results.unchanged} unchanged`);
      
      this.lastSyncResult = results;
      await this.logSyncJob(results);

      return results;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      results.error = error.message;
      return results;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single player
   * @param {number} playerId - Player ID
   * @returns {Promise<Object>} Sync result
   */
  async syncSinglePlayer(playerId) {
    try {
      // Get player from database
      const { data: player, error } = await dataManager.getById('players', playerId);
      
      if (error || !player) {
        throw new Error(`Player not found: ${error?.message || 'Unknown error'}`);
      }

      // Fetch updated data from EA Sports API
      const result = await eaSportsIntegration.getPlayerData(player.name, { forceRefresh: true });
      
      if (!result.data) {
        return { success: false, error: 'No data available from EA Sports API' };
      }

      // Merge and update
      const updatedData = this.mergePlayerData(player, result.data);
      const { error: updateError } = await dataManager.update('players', playerId, updatedData);

      if (updateError) {
        throw new Error(`Failed to update player: ${updateError.message}`);
      }

      // Log update
      await this.logPlayerUpdate(playerId, player.name, result.data);

      console.log(`✅ Player ${player.name} synced successfully`);
      return { success: true, player: updatedData };
    } catch (error) {
      console.error(`❌ Failed to sync player ${playerId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge existing player data with EA Sports data
   * @param {Object} existingPlayer - Existing player data
   * @param {Object} eaSportsData - EA Sports API data
   * @returns {Object} Merged player data
   */
  mergePlayerData(existingPlayer, eaSportsData) {
    return {
      ...existingPlayer,
      // Update EA Sports specific fields
      ea_sports_id: eaSportsData.id || existingPlayer.ea_sports_id,
      overall_rating: eaSportsData.overall || existingPlayer.overall_rating,
      potential: eaSportsData.potential || existingPlayer.potential,
      market_value: eaSportsData.value || existingPlayer.market_value,
      wage: eaSportsData.wage || existingPlayer.wage,
      nationality: eaSportsData.nationality || existingPlayer.nationality,
      age: eaSportsData.age || existingPlayer.age,
      // Update position if available
      position: eaSportsData.position || existingPlayer.position,
      // Store detailed stats as JSONB
      detailed_stats: eaSportsData.stats || existingPlayer.detailed_stats,
      // Update last sync timestamp
      last_api_sync: new Date().toISOString()
    };
  }

  /**
   * Log player update to database
   * @param {number} playerId - Player ID
   * @param {string} playerName - Player name
   * @param {Object} newData - New player data
   */
  async logPlayerUpdate(playerId, playerName, newData) {
    try {
      const updateLog = {
        player_id: playerId,
        player_name: playerName,
        update_type: 'full_sync',
        new_value: JSON.stringify({
          overall: newData.overall,
          potential: newData.potential,
          value: newData.value,
          stats: newData.stats
        }),
        source: 'ea_sports',
        sync_date: new Date().toISOString()
      };

      // Only log to database if table exists (not in demo mode)
      if (supabase) {
        const { error } = await supabase
          .from('player_updates')
          .insert([updateLog]);

        if (error && !error.message.includes('does not exist')) {
          console.warn('Failed to log player update:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to log player update:', error);
    }
  }

  /**
   * Log sync job to database
   * @param {Object} results - Sync results
   */
  async logSyncJob(results) {
    try {
      const syncLog = {
        job_name: 'player_sync',
        status: results.failed === 0 ? 'success' : (results.updated > 0 ? 'partial' : 'failed'),
        records_processed: results.total,
        records_updated: results.updated,
        records_failed: results.failed,
        error_message: results.error || null,
        duration_ms: results.duration,
        started_at: results.startTime,
        completed_at: results.endTime
      };

      // Only log to database if table exists (not in demo mode)
      if (supabase) {
        const { error } = await supabase
          .from('api_sync_logs')
          .insert([syncLog]);

        if (error && !error.message.includes('does not exist')) {
          console.warn('Failed to log sync job:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to log sync job:', error);
    }
  }

  /**
   * Archive player data for historical tracking
   * @param {Object} player - Player data to archive
   * @param {string} reason - Archive reason
   */
  async archivePlayerData(player, reason = 'weekly_backup') {
    try {
      const archive = {
        player_id: player.id,
        player_name: player.name,
        team: player.team,
        position: player.position,
        overall_rating: player.overall_rating,
        potential: player.potential,
        value: player.market_value,
        wage: player.wage,
        age: player.age,
        nationality: player.nationality,
        stats: player.detailed_stats,
        archive_date: new Date().toISOString().split('T')[0],
        archive_reason: reason
      };

      // Only archive to database if table exists (not in demo mode)
      if (supabase) {
        const { error } = await supabase
          .from('player_archives')
          .insert([archive]);

        if (error && !error.message.includes('does not exist')) {
          console.warn('Failed to archive player data:', error);
          return false;
        }
      }

      console.log(`📦 Archived data for ${player.name}`);
      return true;
    } catch (error) {
      console.warn('Failed to archive player data:', error);
      return false;
    }
  }

  /**
   * Archive all current players
   * @param {string} reason - Archive reason
   */
  async archiveAllPlayers(reason = 'weekly_backup') {
    try {
      const { data: players, error } = await dataManager.getAll('players');
      
      if (error || !players) {
        throw new Error(`Failed to fetch players: ${error?.message}`);
      }

      console.log(`📦 Archiving ${players.length} players...`);
      
      let archived = 0;
      for (const player of players) {
        const success = await this.archivePlayerData(player, reason);
        if (success) archived++;
      }

      console.log(`✅ Archived ${archived}/${players.length} players`);
      return { success: true, archived, total: players.length };
    } catch (error) {
      console.error('❌ Failed to archive players:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get last sync result
   */
  getLastSyncResult() {
    return this.lastSyncResult;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress() {
    return this.syncInProgress;
  }

  /**
   * Get sync statistics from database
   */
  async getSyncStatistics(days = 7) {
    try {
      if (!supabase) {
        return { error: 'Database not available' };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('api_sync_logs')
        .select('*')
        .eq('job_name', 'player_sync')
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (error) {
        throw error;
      }

      const stats = {
        totalRuns: data.length,
        successfulRuns: data.filter(r => r.status === 'success').length,
        failedRuns: data.filter(r => r.status === 'failed').length,
        partialRuns: data.filter(r => r.status === 'partial').length,
        totalProcessed: data.reduce((sum, r) => sum + (r.records_processed || 0), 0),
        totalUpdated: data.reduce((sum, r) => sum + (r.records_updated || 0), 0),
        avgDuration: data.length > 0 
          ? data.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / data.length 
          : 0,
        lastRun: data.length > 0 ? data[0] : null
      };

      return stats;
    } catch (error) {
      console.warn('Failed to get sync statistics:', error);
      return { error: error.message };
    }
  }

  /**
   * Get player update history
   */
  async getPlayerUpdateHistory(playerId, limit = 10) {
    try {
      if (!supabase) {
        return { error: 'Database not available' };
      }

      const { data, error } = await supabase
        .from('player_updates')
        .select('*')
        .eq('player_id', playerId)
        .order('sync_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.warn('Failed to get player update history:', error);
      return { data: null, error: error.message };
    }
  }
}

// Export singleton instance
export const eaSportsDataSync = new EASportsDataSyncAdapter();

// Make it available globally for legacy compatibility
if (typeof window !== 'undefined') {
  window.EASportsDataSync = eaSportsDataSync;
}

export default EASportsDataSyncAdapter;

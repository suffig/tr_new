/**
 * EA Sports Integration Hook
 * React hook for EA Sports API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { eaSportsIntegration } from '../services/EASportsIntegration.js';
import { eaSportsDataSync } from '../services/EASportsDataSync.js';
import { transferMarketService } from '../services/TransferMarketService.js';

export const useEASportsIntegration = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Initialize EA Sports integration
  useEffect(() => {
    const initializeEASports = async () => {
      try {
        setLoading(true);
        
        // Initialize the integration
        await eaSportsIntegration.initialize({
          enableBackgroundJobs: true,
          enableNotifications: false, // Disable in React for now
          enableOfflineCache: true
        });

        setInitialized(true);
        setStats(eaSportsIntegration.getStats());
        setError(null);

        console.log('✅ EA Sports Integration initialized in React');
      } catch (err) {
        console.error('❌ Failed to initialize EA Sports Integration:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeEASports();

    // Cleanup on unmount
    return () => {
      // Stop background jobs on unmount
      if (initialized) {
        eaSportsIntegration.stop();
      }
    };
  }, []);

  // Get player data
  const getPlayerData = useCallback(async (playerName, options = {}) => {
    if (!initialized) {
      return { data: null, error: 'EA Sports integration not initialized' };
    }
    return await eaSportsIntegration.getPlayerData(playerName, options);
  }, [initialized]);

  // Get market price
  const getMarketPrice = useCallback(async (playerIdOrName) => {
    if (!initialized) {
      return { data: null, error: 'EA Sports integration not initialized' };
    }
    return await eaSportsIntegration.getMarketPrice(playerIdOrName);
  }, [initialized]);

  // Get market insights
  const getMarketInsights = useCallback(async (playerIdOrName) => {
    if (!initialized) {
      return { data: null, error: 'EA Sports integration not initialized' };
    }
    return await eaSportsIntegration.getMarketInsights(playerIdOrName);
  }, [initialized]);

  // Add to watchlist
  const addToWatchlist = useCallback((playerId, alertConfig) => {
    if (!initialized) return false;
    eaSportsIntegration.addToWatchlist(playerId, alertConfig);
    return true;
  }, [initialized]);

  // Remove from watchlist
  const removeFromWatchlist = useCallback((playerId) => {
    if (!initialized) return false;
    eaSportsIntegration.removeFromWatchlist(playerId);
    return true;
  }, [initialized]);

  // Get watchlist summary
  const getWatchlistSummary = useCallback(() => {
    if (!initialized) return { totalPlayers: 0, activeAlerts: 0, players: [] };
    return eaSportsIntegration.getWatchlistSummary();
  }, [initialized]);

  // Sync player data manually
  const syncPlayerData = useCallback(async () => {
    if (!initialized) return { error: 'Not initialized' };
    try {
      return await eaSportsIntegration.syncPlayerData();
    } catch (err) {
      return { error: err.message };
    }
  }, [initialized]);

  // Sync market prices manually
  const syncMarketPrices = useCallback(async () => {
    if (!initialized) return { error: 'Not initialized' };
    try {
      return await eaSportsIntegration.syncMarketPrices();
    } catch (err) {
      return { error: err.message };
    }
  }, [initialized]);

  // Get status report
  const getStatusReport = useCallback(() => {
    if (!initialized) return null;
    return eaSportsIntegration.getStatusReport();
  }, [initialized]);

  // Get background jobs status
  const getBackgroundJobsStatus = useCallback(() => {
    if (!initialized) return [];
    return eaSportsIntegration.getBackgroundJobsStatus();
  }, [initialized]);

  // Run diagnostics
  const runDiagnostics = useCallback(async () => {
    if (!initialized) return null;
    return await eaSportsIntegration.runDiagnostics();
  }, [initialized]);

  // Refresh stats
  const refreshStats = useCallback(() => {
    if (initialized) {
      setStats(eaSportsIntegration.getStats());
    }
  }, [initialized]);

  return {
    // State
    initialized,
    loading,
    error,
    stats,

    // Methods
    getPlayerData,
    getMarketPrice,
    getMarketInsights,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistSummary,
    syncPlayerData,
    syncMarketPrices,
    getStatusReport,
    getBackgroundJobsStatus,
    runDiagnostics,
    refreshStats,

    // Direct access to services (for advanced use)
    integration: eaSportsIntegration,
    dataSync: eaSportsDataSync,
    marketService: transferMarketService
  };
};

export default useEASportsIntegration;

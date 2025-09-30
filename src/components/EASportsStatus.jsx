/**
 * EA Sports Status Component
 * Displays EA Sports integration status and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useEASportsIntegration } from '../hooks/useEASportsIntegration';

export const EASportsStatusBadge = () => {
  const { initialized, loading, stats } = useEASportsIntegration();

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-gray-600">EA Sports lädt...</span>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full text-xs">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-red-700">EA Sports offline</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full text-xs">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-green-700">EA Sports aktiv</span>
      {stats && (
        <span className="text-gray-500">
          ({stats.cacheHitRate} Cache)
        </span>
      )}
    </div>
  );
};

export const EASportsStatusPanel = () => {
  const {
    initialized,
    loading,
    error,
    stats,
    getStatusReport,
    getBackgroundJobsStatus,
    syncPlayerData,
    syncMarketPrices,
    refreshStats
  } = useEASportsIntegration();

  const [statusReport, setStatusReport] = useState(null);
  const [jobsStatus, setJobsStatus] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (initialized) {
      setStatusReport(getStatusReport());
      setJobsStatus(getBackgroundJobsStatus());
    }
  }, [initialized, getStatusReport, getBackgroundJobsStatus]);

  const handleSyncPlayers = async () => {
    setSyncing(true);
    try {
      await syncPlayerData();
      refreshStats();
      setStatusReport(getStatusReport());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncMarket = async () => {
    setSyncing(true);
    try {
      await syncMarketPrices();
      refreshStats();
      setStatusReport(getStatusReport());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-600">⚠️</span>
          <h3 className="font-semibold text-red-800">EA Sports Integration Fehler</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">EA Sports Integration nicht verfügbar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">EA Sports Integration</h3>
          <EASportsStatusBadge />
        </div>
        
        {stats && (
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div className="bg-blue-50 rounded p-2">
              <div className="text-blue-600 font-medium">API Calls</div>
              <div className="text-2xl font-bold text-blue-700">{stats.totalApiCalls}</div>
            </div>
            <div className="bg-green-50 rounded p-2">
              <div className="text-green-600 font-medium">Success Rate</div>
              <div className="text-2xl font-bold text-green-700">{stats.successRate}</div>
            </div>
            <div className="bg-purple-50 rounded p-2">
              <div className="text-purple-600 font-medium">Cache Hits</div>
              <div className="text-2xl font-bold text-purple-700">{stats.cachedCalls}</div>
            </div>
            <div className="bg-orange-50 rounded p-2">
              <div className="text-orange-600 font-medium">Cache Rate</div>
              <div className="text-2xl font-bold text-orange-700">{stats.cacheHitRate}</div>
            </div>
          </div>
        )}
      </div>

      {jobsStatus && jobsStatus.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Background Jobs</h4>
          <div className="space-y-2">
            {jobsStatus.map((job, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{job.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    job.status === 'completed' ? 'bg-green-100 text-green-700' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    job.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {job.status}
                  </span>
                  <span className="text-gray-500 text-xs">{job.interval}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-2">
          <button
            onClick={handleSyncPlayers}
            disabled={syncing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Players'}
          </button>
          <button
            onClick={handleSyncMarket}
            disabled={syncing}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
          >
            {syncing ? '⏳ Syncing...' : '💰 Sync Market'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EASportsStatusPanel;

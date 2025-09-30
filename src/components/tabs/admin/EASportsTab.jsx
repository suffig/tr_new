/**
 * EA Sports Admin Tab
 * Admin interface for EA Sports API integration
 */

import React, { useState } from 'react';
import { useEASportsIntegration } from '../../../hooks/useEASportsIntegration.js';
import { EASportsStatusPanel } from '../../EASportsStatus.jsx';
import PlayerMarketCard from '../../PlayerMarketCard.jsx';

export default function EASportsTab() {
  const {
    initialized,
    loading,
    error,
    stats,
    runDiagnostics,
    refreshStats
  } = useEASportsIntegration();

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showMarketCard, setShowMarketCard] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const result = await runDiagnostics();
      setDiagnosticsResult(result);
      refreshStats();
    } catch (err) {
      console.error('Diagnostics failed:', err);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleShowMarketCard = () => {
    if (selectedPlayer.trim()) {
      setShowMarketCard(true);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎮 EA Sports API Integration
        </h2>
        <p className="text-gray-600">
          Verwalte die EA Sports API Integration und überwache Live-Daten, Spieler-Updates und Transfermarkt.
        </p>
      </div>

      {/* Status Panel */}
      <EASportsStatusPanel />

      {/* Quick Actions */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Schnellaktionen</h3>
        
        <div className="space-y-4">
          {/* Player Market Search */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💰 Transfermarkt Analyse</h4>
            <p className="text-sm text-blue-700 mb-3">
              Suche einen Spieler und zeige Marktpreise und Insights an
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                placeholder="Spielername eingeben (z.B. Mbappé, Haaland)"
                className="flex-1 px-4 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleShowMarketCard()}
              />
              <button
                onClick={handleShowMarketCard}
                disabled={!selectedPlayer.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                Analysieren
              </button>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-2">🔍 System Diagnostics</h4>
            <p className="text-sm text-purple-700 mb-3">
              Führe eine vollständige Diagnose des EA Sports Systems durch
            </p>
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiagnostics || !initialized}
              className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {runningDiagnostics ? '⏳ Läuft...' : '🔍 Diagnostics ausführen'}
            </button>
          </div>
        </div>
      </div>

      {/* Market Card Modal */}
      {showMarketCard && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PlayerMarketCard
              playerName={selectedPlayer}
              onClose={() => setShowMarketCard(false)}
            />
          </div>
        </div>
      )}

      {/* Diagnostics Results */}
      {diagnosticsResult && (
        <div className="modern-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Diagnostics Ergebnisse</h3>
          
          <div className="space-y-4">
            {/* Connectivity */}
            <div className={`p-4 rounded-lg ${
              diagnosticsResult.connectivity?.connected 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {diagnosticsResult.connectivity?.connected ? '✅' : '❌'}
                </span>
                <h4 className="font-semibold">API Verbindung</h4>
              </div>
              <p className="text-sm">
                {diagnosticsResult.connectivity?.message || 'Keine Informationen verfügbar'}
              </p>
            </div>

            {/* Sample Player */}
            <div className={`p-4 rounded-lg ${
              diagnosticsResult.samplePlayer?.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {diagnosticsResult.samplePlayer?.success ? '✅' : '⚠️'}
                </span>
                <h4 className="font-semibold">Player Data Test</h4>
              </div>
              <p className="text-sm">
                {diagnosticsResult.samplePlayer?.success 
                  ? `Datenquelle: ${diagnosticsResult.samplePlayer.source}` 
                  : 'Test fehlgeschlagen oder begrenzt'}
              </p>
            </div>

            {/* Market Price */}
            <div className={`p-4 rounded-lg ${
              diagnosticsResult.marketPrice?.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {diagnosticsResult.marketPrice?.success ? '✅' : '⚠️'}
                </span>
                <h4 className="font-semibold">Market Price Test</h4>
              </div>
              <p className="text-sm">
                {diagnosticsResult.marketPrice?.success 
                  ? `Datenquelle: ${diagnosticsResult.marketPrice.source}` 
                  : 'Test fehlgeschlagen oder begrenzt'}
              </p>
            </div>

            {/* Background Jobs */}
            {diagnosticsResult.backgroundJobs && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔄</span>
                  <h4 className="font-semibold">Background Jobs</h4>
                </div>
                <p className="text-sm">
                  {diagnosticsResult.backgroundJobs.length} Jobs konfiguriert und aktiv
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
              Diagnostics ausgeführt am: {new Date(diagnosticsResult.timestamp).toLocaleString('de-DE')}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && initialized && (
        <div className="modern-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Statistiken</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-blue-600 text-sm mb-1">Total API Calls</div>
              <div className="text-3xl font-bold text-blue-700">{stats.totalApiCalls}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-green-600 text-sm mb-1">Success Rate</div>
              <div className="text-3xl font-bold text-green-700">{stats.successRate}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-purple-600 text-sm mb-1">Cache Hit Rate</div>
              <div className="text-3xl font-bold text-purple-700">{stats.cacheHitRate}</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="modern-card border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">⚠️</span>
            <h3 className="font-semibold text-red-800">Fehler</h3>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="modern-card bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">ℹ️ Information</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>EA Sports API Integration</strong> ermöglicht Live-Daten, automatische Spieler-Updates 
            und Transfermarkt-Funktionalität.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Automatische tägliche Spieler-Synchronisation</li>
            <li>Stündliche Marktpreis-Updates</li>
            <li>15-minütige Preis-Alert Überprüfungen</li>
            <li>Wöchentliche Daten-Bereinigung</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            Version 1.0.0 • Weitere Informationen in der Dokumentation (EA_SPORTS_API_INTEGRATION.md)
          </p>
        </div>
      </div>
    </div>
  );
}

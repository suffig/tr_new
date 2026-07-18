import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  exportLegacyData,
  exportVersionData,
  copyFinancialData,
  getVersionsWithFinancialData,
  importDataToVersion,
  getLegacyData,
  getVersionData
} from '../../../utils/legacyDataManager.js';
import { 
  getAvailableFifaVersions,
  getFifaVersionDisplayName,
  getCurrentFifaVersion
} from '../../../utils/fifaVersionManager.js';

const DataExportImportTab = () => {
  const [versions, setVersions] = useState([]);
  const [versionsWithFinances, setVersionsWithFinances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [copyFromVersion, setCopyFromVersion] = useState('');
  const [copyToVersion, setCopyToVersion] = useState('');
  const [overwriteFinances, setOverwriteFinances] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importTargetVersion, setImportTargetVersion] = useState('');
  const [dataStats, setDataStats] = useState({});

  useEffect(() => {
    const loadDataAndSetup = () => {
      loadData();
      
      // Listen for data changes
      const handleDataChange = () => {
        loadData();
      };

      window.addEventListener('financialDataCopied', handleDataChange);
      window.addEventListener('fifaVersionChanged', handleDataChange);

      return () => {
        window.removeEventListener('financialDataCopied', handleDataChange);
        window.removeEventListener('fifaVersionChanged', handleDataChange);
      };
    };

    return loadDataAndSetup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = () => {
    const availableVersions = getAvailableFifaVersions();
    const financialVersions = getVersionsWithFinancialData();
    const currentVersion = getCurrentFifaVersion();
    
    setVersions(availableVersions);
    setVersionsWithFinances(financialVersions);
    
    if (!copyToVersion) {
      setCopyToVersion(currentVersion);
    }
    if (!importTargetVersion) {
      setImportTargetVersion(currentVersion);
    }

    // Calculate data statistics
    calculateDataStats();
  };

  const calculateDataStats = () => {
    const stats = {};
    
    // Legacy data stats
    const legacyData = getLegacyData();
    if (legacyData) {
      stats.legacy = {
        matches: legacyData.fifa_matches?.length || 0,
        players: legacyData.fifa_players?.length || 0,
        transactions: legacyData.fifa_transactions?.length || 0,
        hasData: true
      };
    }

    // Version data stats
    const availableVersions = getAvailableFifaVersions();
    availableVersions.forEach(version => {
      const versionData = getVersionData(version.id);
      if (versionData) {
        stats[version.id] = {
          matches: versionData.matches?.length || 0,
          players: versionData.players?.length || 0,
          transactions: versionData.transactions?.length || 0,
          hasData: true
        };
      }
    });

    setDataStats(stats);
  };

  const handleExportLegacy = async () => {
    try {
      setLoading(true);
      await exportLegacyData();
      toast.success('Legacy-Daten erfolgreich exportiert');
    } catch (error) {
      console.error('Error exporting legacy data:', error);
      toast.error(`Fehler beim Export: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportVersion = async (version) => {
    try {
      setLoading(true);
      await exportVersionData(version);
      toast.success(`Daten für ${getFifaVersionDisplayName(version)} erfolgreich exportiert`);
    } catch (error) {
      console.error(`Error exporting version ${version}:`, error);
      toast.error(`Fehler beim Export: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFinances = async () => {
    if (!copyFromVersion || !copyToVersion) {
      toast.error('Bitte wählen Sie Quell- und Ziel-Version aus');
      return;
    }

    if (copyFromVersion === copyToVersion) {
      toast.error('Quell- und Ziel-Version müssen unterschiedlich sein');
      return;
    }

    try {
      setLoading(true);
      await copyFinancialData(copyFromVersion, copyToVersion, overwriteFinances);
      toast.success(`Finanzdaten von ${copyFromVersion} nach ${copyToVersion} kopiert`);
      setShowCopyModal(false);
      loadData();
    } catch (error) {
      console.error('Error copying financial data:', error);
      toast.error(`Fehler beim Kopieren: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    if (!importFile || !importTargetVersion) {
      toast.error('Bitte wählen Sie eine Datei und Ziel-Version aus');
      return;
    }

    try {
      setLoading(true);
      await importDataToVersion(importFile, importTargetVersion);
      toast.success(`Daten erfolgreich in ${importTargetVersion} importiert`);
      setShowImportModal(false);
      setImportFile(null);
      loadData();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error(`Fehler beim Import: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Daten Export & Import</h3>
            <p className="text-text-secondary mt-1">
              Legacy-Daten downloaden und Finanzdaten zwischen Versionen kopieren
            </p>
          </div>
          <div className="text-4xl">📊</div>
        </div>
      </div>

      {/* Data Overview */}
      <div className="bg-bg-secondary rounded-xl border border-border-light p-6">
        <h4 className="font-semibold text-text-primary mb-4">Datenübersicht</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Legacy Data */}
          {dataStats.legacy && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h5 className="font-medium text-amber-800 mb-2">Legacy Daten</h5>
              <div className="space-y-1 text-sm text-amber-700">
                <div>Matches: {dataStats.legacy.matches}</div>
                <div>Spieler: {dataStats.legacy.players}</div>
                <div>Transaktionen: {dataStats.legacy.transactions}</div>
              </div>
            </div>
          )}

          {/* Version Data */}
          {versions.map(version => (
            dataStats[version.id] && (
              <div key={version.id} className="bg-system-blue/10 border border-system-blue/30 rounded-lg p-4">
                <h5 className="font-medium text-system-blue mb-2">{version.name}</h5>
                <div className="space-y-1 text-sm text-system-blue">
                  <div>Matches: {dataStats[version.id].matches}</div>
                  <div>Spieler: {dataStats[version.id].players}</div>
                  <div>Transaktionen: {dataStats[version.id].transactions}</div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-bg-secondary rounded-xl border border-border-light p-6">
        <h4 className="font-semibold text-text-primary mb-4">Daten exportieren</h4>
        
        <div className="space-y-4">
          {/* Legacy Export */}
          {dataStats.legacy && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <h5 className="font-medium text-amber-800">Legacy Daten</h5>
                <p className="text-sm text-amber-600">Ursprüngliche Daten vor dem Versioning-System</p>
              </div>
              <button
                onClick={handleExportLegacy}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Exportiere...' : 'Download'}
              </button>
            </div>
          )}

          {/* Version Exports */}
          {versions.map(version => (
            dataStats[version.id] && (
              <div key={version.id} className="flex items-center justify-between p-4 bg-system-blue/10 border border-system-blue/30 rounded-lg">
                <div>
                  <h5 className="font-medium text-system-blue">{version.name}</h5>
                  <p className="text-sm text-system-blue">Versionsspezifische Daten</p>
                </div>
                <button
                  onClick={() => handleExportVersion(version.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Exportiere...' : 'Download'}
                </button>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Finance Copy Section */}
      <div className="bg-bg-secondary rounded-xl border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-text-primary">Finanzdaten kopieren</h4>
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Finanzen kopieren
          </button>
        </div>
        
        <div className="bg-system-green/10 border border-system-green/30 rounded-lg p-4">
          <p className="text-system-green text-sm">
            Kopieren Sie Transaktionen und Finanzstände zwischen verschiedenen FIFA Versionen.
            Dies ist nützlich beim Wechsel zwischen Versionen oder beim Übertragen historischer Daten.
          </p>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-bg-secondary rounded-xl border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-text-primary">Daten importieren</h4>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-system-blue text-white rounded-lg hover:bg-system-blue/90 transition-colors"
          >
            Daten importieren
          </button>
        </div>
        
        <div className="bg-bg-tertiary border border-border-light rounded-lg p-4">
          <p className="text-system-blue text-sm">
            Importieren Sie zuvor exportierte Daten in eine bestimmte FIFA Version.
            Unterstützt sowohl Legacy- als auch Versionsdatenformate.
          </p>
        </div>
      </div>

      {/* Copy Financial Data Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 max-w-md w-full mx-4">
            <h4 className="font-semibold text-text-primary mb-4">Finanzdaten kopieren</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Von Version
                </label>
                <select
                  value={copyFromVersion}
                  onChange={(e) => setCopyFromVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Version auswählen...</option>
                  {versionsWithFinances.map(version => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Zu Version
                </label>
                <select
                  value={copyToVersion}
                  onChange={(e) => setCopyToVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Version auswählen...</option>
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={overwriteFinances}
                  onChange={(e) => setOverwriteFinances(e.target.checked)}
                  className="h-4 w-4 text-system-green focus:ring-green-500 border-border-light rounded"
                />
                <label htmlFor="overwrite" className="ml-2 text-sm text-text-secondary">
                  Bestehende Daten überschreiben
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-4 py-2 border border-border-light text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCopyFinances}
                disabled={!copyFromVersion || !copyToVersion || loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Kopiere...' : 'Kopieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 max-w-md w-full mx-4">
            <h4 className="font-semibold text-text-primary mb-4">Daten importieren</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Datei auswählen
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-system-blue focus:border-system-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Ziel-Version
                </label>
                <select
                  value={importTargetVersion}
                  onChange={(e) => setImportTargetVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-system-blue focus:border-system-blue"
                >
                  <option value="">Version auswählen...</option>
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 px-4 py-2 border border-border-light text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImportData}
                disabled={!importFile || !importTargetVersion || loading}
                className="flex-1 px-4 py-2 bg-system-blue text-white rounded-lg hover:bg-system-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importiere...' : 'Importieren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExportImportTab;
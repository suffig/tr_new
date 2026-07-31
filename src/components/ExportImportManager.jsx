import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Export/Import Manager Component for React
 * Provides data backup and restore functionality
 */
export default function ExportImportManager({ onClose }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const handleExportAllData = async () => {
    setIsExporting(true);
    try {
      // Import the export functionality dynamically
      const { DataExportImport } = await import('../../exportImport.js');
      const result = await DataExportImport.exportAllData();
      
      if (result.success) {
        toast.success('Daten erfolgreich exportiert!');
      } else {
        toast.error(result.error || 'Export fehlgeschlagen');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren der Daten');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPlayerStats = async () => {
    setIsExporting(true);
    try {
      const { DataExportImport } = await import('../../exportImport.js');
      const result = await DataExportImport.exportPlayerStats();
      
      if (result.success) {
        toast.success('Spieler-Statistiken erfolgreich exportiert!');
      } else {
        toast.error(result.error || 'Export fehlgeschlagen');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren der Spieler-Statistiken');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFinancialData = async () => {
    setIsExporting(true);
    try {
      const { DataExportImport } = await import('../../exportImport.js');
      const result = await DataExportImport.exportFinancialData();
      
      if (result.success) {
        toast.success('Finanzdaten erfolgreich exportiert!');
      } else {
        toast.error(result.error || 'Export fehlgeschlagen');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren der Finanzdaten');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast.error('Bitte wählen Sie eine Datei aus');
      return;
    }

    setIsImporting(true);
    try {
      const { DataExportImport } = await import('../../exportImport.js');
      const result = await DataExportImport.importData(importFile);
      
      if (result.success) {
        toast.success('Daten erfolgreich importiert!');
        setImportFile(null);
        // Refresh the page to show imported data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(result.error || 'Import fehlgeschlagen');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Daten');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-bg-secondary rounded-lg max-w-md w-full modal-content">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-text-primary">
              📦 Export/Import Manager
            </h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          {/* Export Section */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-text-primary mb-4 flex items-center">
              <span className="mr-2">📤</span>
              Daten exportieren
            </h4>
            <div className="space-y-3">
              <button
                onClick={handleExportAllData}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-3 bg-system-blue/10 hover:bg-system-blue/15 border border-system-blue/25 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <span className="mr-3">💾</span>
                  <div className="text-left">
                    <div className="font-medium text-system-blue">Komplette Datensicherung</div>
                    <div className="text-sm text-system-blue">Alle Daten als JSON</div>
                  </div>
                </div>
                {isExporting && <div className="spinner w-4 h-4"></div>}
              </button>

              <button
                onClick={handleExportPlayerStats}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-3 bg-system-green/10 hover:bg-system-green/15 border border-system-green/25 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <span className="mr-3">👥</span>
                  <div className="text-left">
                    <div className="font-medium text-system-green">Spieler-Statistiken</div>
                    <div className="text-sm text-system-green">Detaillierte CSV-Datei</div>
                  </div>
                </div>
                {isExporting && <div className="spinner w-4 h-4"></div>}
              </button>

              <button
                onClick={handleExportFinancialData}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-3 bg-system-yellow/10 hover:bg-system-yellow/15 border border-system-yellow/25 rounded-lg transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <span className="mr-3">💰</span>
                  <div className="text-left">
                    <div className="font-medium text-system-yellow">Finanzdaten</div>
                    <div className="text-sm text-system-yellow">Alle Transaktionen</div>
                  </div>
                </div>
                {isExporting && <div className="spinner w-4 h-4"></div>}
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div>
            <h4 className="text-lg font-medium text-text-primary mb-4 flex items-center">
              <span className="mr-2">📥</span>
              Daten importieren
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Backup-Datei auswählen
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm bg-bg-secondary text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-green file:text-white hover:file:bg-primary-green-dark"
                  disabled={isImporting}
                />
                {importFile && (
                  <p className="text-sm text-text-muted mt-1">
                    Ausgewählt: {importFile.name}
                  </p>
                )}
              </div>

              <button
                onClick={handleImportData}
                disabled={!importFile || isImporting}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-4 h-4 mr-2"></div>
                    Importiere...
                  </div>
                ) : (
                  '📥 Daten importieren'
                )}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-6 p-3 bg-system-orange/10 border border-system-orange/25 rounded-lg">
            <div className="flex items-start">
              <span className="text-system-orange mr-2">⚠️</span>
              <div className="text-sm text-system-orange">
                <strong>Hinweis:</strong> Der Import überschreibt bestehende Daten. 
                Erstellen Sie vor dem Import eine Backup-Datei!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
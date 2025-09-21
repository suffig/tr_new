import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  getAvailableFifaVersions,
  addCustomFifaVersion,
  removeCustomFifaVersion,
  getCurrentFifaVersion,
  setCurrentFifaVersion,
  getFifaVersionDisplayName
} from '../../../utils/fifaVersionManager';

const FifaVersionManagerTab = () => {
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersionState] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersionData, setNewVersionData] = useState({
    version: '',
    displayName: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  // Load version data
  const loadVersions = () => {
    const availableVersions = getAvailableFifaVersions();
    const current = getCurrentFifaVersion();
    
    // Sort versions: built-in first, then custom by creation date
    const sortedVersions = availableVersions.sort((a, b) => {
      // Built-in versions first
      if (!a.isCustom && b.isCustom) return -1;
      if (a.isCustom && !b.isCustom) return 1;
      
      // For built-in versions, maintain FC25, FC26 order
      if (!a.isCustom && !b.isCustom) {
        if (a.id === 'FC25') return -1;
        if (b.id === 'FC25') return 1;
        return 0;
      }
      
      // For custom versions, sort by creation date (newest first)
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    
    setVersions(sortedVersions);
    setCurrentVersionState(current);
  };

  useEffect(() => {
    loadVersions();

    // Listen for version changes
    const handleVersionChange = () => {
      loadVersions();
    };

    window.addEventListener('fifaVersionChanged', handleVersionChange);
    window.addEventListener('fifaVersionAdded', handleVersionChange);
    window.addEventListener('fifaVersionRemoved', handleVersionChange);

    return () => {
      window.removeEventListener('fifaVersionChanged', handleVersionChange);
      window.removeEventListener('fifaVersionAdded', handleVersionChange);
      window.removeEventListener('fifaVersionRemoved', handleVersionChange);
    };
  }, []);

  const handleAddVersion = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { version, displayName, description } = newVersionData;
      
      if (!version.trim()) {
        throw new Error('Version identifier ist erforderlich');
      }

      const versionId = version.trim().toUpperCase();
      
      // Validate format
      if (!/^[A-Za-z]+\d*$/.test(versionId)) {
        throw new Error('Version Format ungültig. Verwenden Sie Formate wie FC27, EA25, etc.');
      }

      const metadata = {
        displayName: displayName.trim() || versionId,
        description: description.trim() || `Custom FIFA Version ${versionId}`,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      };

      await addCustomFifaVersion(versionId, metadata);
      
      // Reset form
      setNewVersionData({ version: '', displayName: '', description: '' });
      setShowAddForm(false);
      
      toast.success(`FIFA Version ${versionId} erfolgreich hinzugefügt!`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVersion = async (version) => {
    if (!window.confirm(`Sind Sie sicher, dass Sie Version "${version}" löschen möchten?`)) {
      return;
    }

    try {
      await removeCustomFifaVersion(version);
      toast.success(`Version ${version} erfolgreich entfernt!`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSwitchVersion = async (version) => {
    try {
      setCurrentFifaVersion(version);
      toast.success(`Zu Version ${getFifaVersionDisplayName(version)} gewechselt!`);
      
      // Reload page to ensure all components pick up the new version
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error(`Fehler beim Wechseln der Version: ${error.message}`);
    }
  };

  const getVersionTypeColor = (version) => {
    if (version.isLegacy) return 'bg-gray-100 text-gray-700';
    if (version.isCurrent) return 'bg-blue-100 text-blue-700';
    if (version.isCustom) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getVersionTypeLabel = (version) => {
    if (version.isLegacy) return 'Legacy';
    if (version.isCurrent) return 'Standard';
    if (version.isCustom) return 'Custom';
    return 'Standard';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl 
                          flex items-center justify-center text-white text-xl font-bold">
            🎮
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">FIFA Versionen-Manager</h2>
            <p className="text-gray-600">Verwalten und erstellen Sie FIFA Versionen für zukunftssichere Datenorganisation</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                     transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Neue Version
        </button>
      </div>

      {/* Current Version Status */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Aktuelle FIFA Version</h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-3xl font-bold text-purple-600">
                {currentVersion}
              </p>
              <p className="text-lg text-gray-600">
                ({getFifaVersionDisplayName(currentVersion)})
              </p>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              Alle neuen Daten werden in dieser Version gespeichert
            </p>
          </div>
          <div className="text-4xl">
            🎮
          </div>
        </div>
      </div>

      {/* Add Version Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Neue FIFA Version hinzufügen</h3>
          
          <form onSubmit={handleAddVersion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Identifier *
                </label>
                <input
                  type="text"
                  value={newVersionData.version}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="z.B. FC27, EA25, FIFA28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: Buchstaben gefolgt von optionalen Zahlen (FC27, EA25, etc.)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anzeigename
                </label>
                <input
                  type="text"
                  value={newVersionData.displayName}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="z.B. FIFA Club 27"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                           focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                value={newVersionData.description}
                onChange={(e) => setNewVersionData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibung der neuen Version..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird hinzugefügt...' : 'Version hinzufügen'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg 
                         transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Versions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Verfügbare FIFA Versionen</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {versions.map(version => (
            <div
              key={version.id}
              className={`p-6 rounded-xl border-2 ${
                version.isActive 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-gray-800">{version.id}</h4>
                      <span className="text-sm text-gray-600">({version.name})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVersionTypeColor(version)}`}>
                        {getVersionTypeLabel(version)}
                      </span>
                      {version.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Aktiv
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-2xl">
                  {version.isLegacy ? '📚' : version.isCurrent ? '⚡' : '🎮'}
                </div>
              </div>

              {/* Version Details */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  {version.description || version.metadata?.description || 'Keine Beschreibung verfügbar'}
                </p>
                
                {version.createdAt && (
                  <p className="text-xs text-gray-500">
                    Erstellt: {new Date(version.createdAt).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!version.isActive && (
                  <button
                    onClick={() => handleSwitchVersion(version.id)}
                    className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 
                             rounded-lg text-sm transition-colors"
                  >
                    Aktivieren
                  </button>
                )}
                
                {version.isCustom && (
                  <button
                    onClick={() => handleRemoveVersion(version.id)}
                    disabled={version.isActive}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg 
                             text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Löschen
                  </button>
                )}
                
                {version.isActive && (
                  <div className="flex-1 px-3 py-2 text-center text-sm">
                    <span className="text-green-600 font-medium">✓ Aktive Version</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">FIFA Versionen-System</h4>
            <div className="space-y-2 text-sm text-amber-700">
              <p>• <strong>Built-in Versionen:</strong> FC25 (Legacy) und FC26 (Standard) sind vorinstalliert</p>
              <p>• <strong>Custom Versionen:</strong> Erstellen Sie eigene Versionen für zukünftige FIFA-Editionen</p>
              <p>• <strong>Datenisolation:</strong> Jede Version hat separate Datenbanken</p>
              <p>• <strong>Zukunftssicher:</strong> System ist bereit für FC27, FC28 und weitere Versionen</p>
              <p>• <strong>Flexibilität:</strong> Wechseln Sie beliebig zwischen Versionen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-800 mb-3">Technische Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Version-Management:</strong><br />
            • Dynamisches Hinzufügen neuer Versionen<br />
            • Automatische Datenbankfilterung<br />
            • Metadaten-Unterstützung
          </div>
          <div>
            <strong>Datenformat:</strong><br />
            • Version Identifier (FC27, EA25, etc.)<br />
            • Anzeigename und Beschreibung<br />
            • Erstellungsdatum und Metadaten
          </div>
        </div>
      </div>
    </div>
  );
};

export default FifaVersionManagerTab;
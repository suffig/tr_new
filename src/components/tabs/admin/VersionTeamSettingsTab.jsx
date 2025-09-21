import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  getVersionTeams, 
  setVersionTeams, 
  uploadTeamIcon, 
  removeTeamIcon,
  copyTeamsBetweenVersions,
  resetVersionTeams
} from '../../../utils/versionTeamManager.js';
import { 
  getCurrentFifaVersion, 
  getAvailableFifaVersions,
  getFifaVersionDisplayName 
} from '../../../utils/fifaVersionManager.js';

const VersionTeamSettingsTab = () => {
  const [currentVersion, setCurrentVersion] = useState('');
  const [versions, setVersions] = useState([]);
  const [teams, setTeams] = useState({});
  const [selectedVersion, setSelectedVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromVersion, setCopyFromVersion] = useState('');

  useEffect(() => {
    const loadDataAndSetup = () => {
      loadData();
      
      // Listen for version changes
      const handleVersionChange = () => {
        loadData();
      };
      
      const handleTeamChange = () => {
        if (selectedVersion) {
          loadTeamsForVersion(selectedVersion);
        }
      };

      window.addEventListener('fifaVersionChanged', handleVersionChange);
      window.addEventListener('versionTeamsChanged', handleTeamChange);

      return () => {
        window.removeEventListener('fifaVersionChanged', handleVersionChange);
        window.removeEventListener('versionTeamsChanged', handleTeamChange);
      };
    };

    return loadDataAndSetup();
  }, [selectedVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = () => {
    const current = getCurrentFifaVersion();
    const availableVersions = getAvailableFifaVersions();
    
    setCurrentVersion(current);
    setVersions(availableVersions);
    
    if (!selectedVersion) {
      setSelectedVersion(current);
      loadTeamsForVersion(current);
    }
  };

  const loadTeamsForVersion = (version) => {
    const versionTeams = getVersionTeams(version);
    setTeams(versionTeams);
    setHasChanges(false);
  };

  const handleVersionSelect = (version) => {
    if (hasChanges) {
      const confirm = window.confirm('Sie haben ungespeicherte Änderungen. Möchten Sie trotzdem die Version wechseln?');
      if (!confirm) return;
    }
    
    setSelectedVersion(version);
    loadTeamsForVersion(version);
  };

  const handleTeamChange = (teamKey, field, value) => {
    setTeams(prev => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleIconUpload = async (teamKey, file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wählen Sie eine Bilddatei aus');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Bild zu groß. Maximum 2MB erlaubt.');
      return;
    }
    
    try {
      setLoading(true);
      const success = await uploadTeamIcon(teamKey, file, selectedVersion);
      
      if (success) {
        toast.success('Icon erfolgreich hochgeladen');
        loadTeamsForVersion(selectedVersion);
      } else {
        toast.error('Fehler beim Hochladen des Icons');
      }
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Fehler beim Hochladen des Icons');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIcon = async (teamKey) => {
    try {
      setLoading(true);
      const success = await removeTeamIcon(teamKey, selectedVersion);
      
      if (success) {
        toast.success('Icon entfernt');
        loadTeamsForVersion(selectedVersion);
      } else {
        toast.error('Fehler beim Entfernen des Icons');
      }
    } catch (error) {
      console.error('Error removing icon:', error);
      toast.error('Fehler beim Entfernen des Icons');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const success = setVersionTeams(teams, selectedVersion);
      
      if (success) {
        toast.success('Team-Einstellungen gespeichert');
        setHasChanges(false);
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving teams:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFromVersion = async () => {
    if (!copyFromVersion) {
      toast.error('Bitte wählen Sie eine Quell-Version aus');
      return;
    }
    
    try {
      setLoading(true);
      const success = copyTeamsBetweenVersions(copyFromVersion, selectedVersion);
      
      if (success) {
        toast.success(`Team-Einstellungen von ${getFifaVersionDisplayName(copyFromVersion)} kopiert`);
        loadTeamsForVersion(selectedVersion);
        setShowCopyModal(false);
        setCopyFromVersion('');
      } else {
        toast.error('Fehler beim Kopieren');
      }
    } catch (error) {
      console.error('Error copying teams:', error);
      toast.error('Fehler beim Kopieren');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const confirm = window.confirm('Möchten Sie die Team-Einstellungen für diese Version auf die Standardwerte zurücksetzen?');
    if (!confirm) return;
    
    try {
      setLoading(true);
      const success = resetVersionTeams(selectedVersion);
      
      if (success) {
        toast.success('Team-Einstellungen zurückgesetzt');
        loadTeamsForVersion(selectedVersion);
      } else {
        toast.error('Fehler beim Zurücksetzen');
      }
    } catch (error) {
      console.error('Error resetting teams:', error);
      toast.error('Fehler beim Zurücksetzen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Versions-spezifische Team-Einstellungen</h3>
            <p className="text-gray-600 mt-1">
              Konfigurieren Sie Team-Namen und Icons für verschiedene FIFA Versionen
            </p>
          </div>
          <div className="text-4xl">⚽</div>
        </div>
      </div>

      {/* Version Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Version auswählen</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {versions.map(version => (
            <button
              key={version.id}
              onClick={() => handleVersionSelect(version.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedVersion === version.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-sm font-semibold">{version.id}</div>
              <div className="text-xs mt-1">{version.name}</div>
              {version.id === currentVersion && (
                <div className="text-xs text-green-600 font-medium mt-1">Aktiv</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Team Configuration */}
      {selectedVersion && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-800">
              Team-Konfiguration für {getFifaVersionDisplayName(selectedVersion)}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCopyModal(true)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kopieren von...
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Zurücksetzen
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(teams).map(([teamKey, teamConfig]) => (
              <div key={teamKey} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                    {teamConfig.customIcon ? (
                      <img 
                        src={teamConfig.customIcon} 
                        alt={teamConfig.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">
                        {teamConfig.icon === 'aek' ? '🔵' : 
                         teamConfig.icon === 'real' ? '🔴' : teamConfig.icon}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{teamKey}</h5>
                    <p className="text-sm text-gray-600">{teamConfig.label}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team-Name
                    </label>
                    <input
                      type="text"
                      value={teamConfig.label}
                      onChange={(e) => handleTeamChange(teamKey, 'label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Team-Name eingeben"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Farbe
                    </label>
                    <select
                      value={teamConfig.color}
                      onChange={(e) => handleTeamChange(teamKey, 'color', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="blue">Blau</option>
                      <option value="red">Rot</option>
                      <option value="green">Grün</option>
                      <option value="yellow">Gelb</option>
                      <option value="purple">Lila</option>
                      <option value="orange">Orange</option>
                      <option value="gray">Grau</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon hochladen
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleIconUpload(teamKey, e.target.files[0])}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {teamConfig.customIcon && (
                        <button
                          onClick={() => handleRemoveIcon(teamKey)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximale Dateigröße: 2MB. Unterstützte Formate: JPG, PNG, GIF
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={saveChanges}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichern...' : 'Änderungen speichern'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h4 className="font-semibold text-gray-800 mb-4">Team-Einstellungen kopieren</h4>
            <p className="text-gray-600 mb-4">
              Von welcher Version möchten Sie die Team-Einstellungen kopieren?
            </p>
            
            <select
              value={copyFromVersion}
              onChange={(e) => setCopyFromVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Version auswählen...</option>
              {versions
                .filter(v => v.id !== selectedVersion)
                .map(version => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyFromVersion('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCopyFromVersion}
                disabled={!copyFromVersion || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Kopieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionTeamSettingsTab;
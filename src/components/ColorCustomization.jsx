import { useState, useEffect } from 'react';

export default function ColorCustomization() {
  const [customColors, setCustomColors] = useState({
    primaryGreen: '#10B981',
    primaryGreenDark: '#059669',
    primaryGreenLight: '#34D399',
    accentOrange: '#F59E0B',
    accentRed: '#EF4444',
    accentBlue: '#3B82F6'
  });

  const [presets] = useState([
    {
      name: 'Standard',
      colors: {
        primaryGreen: '#10B981',
        primaryGreenDark: '#059669',
        primaryGreenLight: '#34D399',
        accentOrange: '#F59E0B',
        accentRed: '#EF4444',
        accentBlue: '#3B82F6'
      }
    },
    {
      name: 'AEK Blau',
      colors: {
        primaryGreen: '#1E40AF',
        primaryGreenDark: '#1E3A8A',
        primaryGreenLight: '#3B82F6',
        accentOrange: '#F59E0B',
        accentRed: '#EF4444',
        accentBlue: '#60A5FA'
      }
    },
    {
      name: 'Real Rot',
      colors: {
        primaryGreen: '#DC2626',
        primaryGreenDark: '#B91C1C',
        primaryGreenLight: '#EF4444',
        accentOrange: '#F59E0B',
        accentRed: '#F87171',
        accentBlue: '#3B82F6'
      }
    },
    {
      name: 'Dunkles Gold',
      colors: {
        primaryGreen: '#D97706',
        primaryGreenDark: '#B45309',
        primaryGreenLight: '#F59E0B',
        accentOrange: '#FBBF24',
        accentRed: '#EF4444',
        accentBlue: '#3B82F6'
      }
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Standard');

  // Load saved colors on mount
  useEffect(() => {
    const savedColors = localStorage.getItem('fifa-tracker-custom-colors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setCustomColors(parsed);
        applyColors(parsed);
      } catch (error) {
        console.error('Error loading custom colors:', error);
      }
    }
  }, []);

  const applyColors = (colors) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-green', colors.primaryGreen);
    root.style.setProperty('--primary-green-dark', colors.primaryGreenDark);
    root.style.setProperty('--primary-green-light', colors.primaryGreenLight);
    root.style.setProperty('--accent-orange', colors.accentOrange);
    root.style.setProperty('--accent-red', colors.accentRed);
    root.style.setProperty('--accent-blue', colors.accentBlue);
  };

  const handleColorChange = (colorKey, value) => {
    const newColors = { ...customColors, [colorKey]: value };
    setCustomColors(newColors);
    setHasChanges(true);
    setSelectedPreset('Benutzerdefiniert');
    
    // Apply immediately for preview
    applyColors(newColors);
  };

  const applyPreset = (preset) => {
    setCustomColors(preset.colors);
    setSelectedPreset(preset.name);
    setHasChanges(true);
    applyColors(preset.colors);
  };

  const saveColors = () => {
    localStorage.setItem('fifa-tracker-custom-colors', JSON.stringify(customColors));
    setHasChanges(false);
    
    // Show success message
    const event = new CustomEvent('show-toast', {
      detail: { 
        message: 'Farbschema gespeichert!', 
        type: 'success' 
      }
    });
    window.dispatchEvent(event);
  };

  const resetToDefault = () => {
    const defaultColors = presets[0].colors;
    setCustomColors(defaultColors);
    setSelectedPreset('Standard');
    setHasChanges(true);
    applyColors(defaultColors);
  };

  const ColorPicker = ({ label, colorKey, value, description }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-border-medium cursor-pointer appearance-none"
            style={{ background: value }}
          />
          <div className="absolute inset-0 w-12 h-12 rounded-lg border-2 border-white pointer-events-none shadow-sm" />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border-medium rounded-lg bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-green/50"
            placeholder="#000000"
          />
          {description && (
            <p className="text-xs text-text-muted mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-light">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <span className="text-xl mr-2">🎨</span>
          Farbkonfiguration
        </h3>

        {/* Preset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Vorgefertigte Farbschemata
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                  selectedPreset === preset.name
                    ? 'border-primary-green bg-primary-green/10'
                    : 'border-border-medium hover:border-border-dark'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/50"
                    style={{ backgroundColor: preset.colors.primaryGreen }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/50"
                    style={{ backgroundColor: preset.colors.accentRed }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/50"
                    style={{ backgroundColor: preset.colors.accentBlue }}
                  />
                </div>
                <div className="text-xs font-medium text-text-primary">
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Pickers */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-text-primary">
            Individuelle Farbanpassung
          </h4>
          
          <div className="grid md:grid-cols-2 gap-4">
            <ColorPicker
              label="Primärfarbe"
              colorKey="primaryGreen"
              value={customColors.primaryGreen}
              description="Hauptfarbe für Buttons und Akzente"
            />
            
            <ColorPicker
              label="Primärfarbe (Dunkel)"
              colorKey="primaryGreenDark"
              value={customColors.primaryGreenDark}
              description="Dunklere Variante für Hover-Effekte"
            />
            
            <ColorPicker
              label="Primärfarbe (Hell)"
              colorKey="primaryGreenLight"
              value={customColors.primaryGreenLight}
              description="Hellere Variante für Highlights"
            />
            
            <ColorPicker
              label="Akzentfarbe Orange"
              colorKey="accentOrange"
              value={customColors.accentOrange}
              description="Orange Akzente und Warnungen"
            />
            
            <ColorPicker
              label="Akzentfarbe Rot"
              colorKey="accentRed"
              value={customColors.accentRed}
              description="Rote Akzente und Fehler"
            />
            
            <ColorPicker
              label="Akzentfarbe Blau"
              colorKey="accentBlue"
              value={customColors.accentBlue}
              description="Blaue Akzente und Informationen"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border-light">
          <button
            onClick={saveColors}
            disabled={!hasChanges}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              hasChanges
                ? 'bg-primary-green hover:bg-primary-green-dark text-white'
                : 'bg-border-medium text-text-muted cursor-not-allowed'
            }`}
          >
            {hasChanges ? 'Farben speichern' : 'Keine Änderungen'}
          </button>
          
          <button
            onClick={resetToDefault}
            className="py-3 px-4 bg-bg-tertiary hover:bg-border-light text-text-primary border border-border-medium rounded-lg font-medium transition-all duration-300"
          >
            Zurücksetzen
          </button>
        </div>

        {/* Preview Section */}
        <div className="mt-6 p-4 bg-bg-tertiary rounded-lg">
          <h5 className="text-sm font-medium text-text-primary mb-3">Vorschau</h5>
          <div className="flex flex-wrap gap-2">
            <button 
              className="btn-primary text-sm py-2 px-4"
              style={{ 
                backgroundColor: customColors.primaryGreen,
                borderColor: customColors.primaryGreen 
              }}
            >
              Primär Button
            </button>
            <div 
              className="px-3 py-2 rounded text-white text-sm"
              style={{ backgroundColor: customColors.accentRed }}
            >
              Rot Akzent
            </div>
            <div 
              className="px-3 py-2 rounded text-white text-sm"
              style={{ backgroundColor: customColors.accentBlue }}
            >
              Blau Akzent
            </div>
            <div 
              className="px-3 py-2 rounded text-white text-sm"
              style={{ backgroundColor: customColors.accentOrange }}
            >
              Orange Akzent
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 text-xl flex-shrink-0">💡</div>
            <div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Farbhinweise
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>• Änderungen werden sofort in der Vorschau angezeigt</p>
                <p>• Gespeicherte Farben werden automatisch bei der nächsten Anmeldung geladen</p>
                <p>• Verwenden Sie Hex-Codes (#RRGGBB) für präzise Farben</p>
                <p>• Team-spezifische Presets helfen bei der schnellen Anpassung</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
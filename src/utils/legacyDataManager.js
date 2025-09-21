/**
 * Legacy Data Export/Import Manager
 * Handles downloading legacy data and copying financial data between versions
 */

import { getCurrentFifaVersion, getAllFifaVersions } from './fifaVersionManager.js';

// Legacy data keys that need to be exportable
const LEGACY_DATA_KEYS = [
  'alcoholCalculatorValues',
  'fifa_matches',
  'fifa_players',
  'fifa_bans', 
  'fifa_transactions',
  'fifa_finances'
];

// Version-specific data keys
const VERSION_DATA_KEYS = [
  'matches',
  'players', 
  'bans',
  'transactions',
  'finances',
  'alcoholCalculator'
];

/**
 * Get legacy data from localStorage
 * @returns {Object} Legacy data object
 */
export const getLegacyData = () => {
  try {
    const legacyData = {};
    let hasData = false;

    LEGACY_DATA_KEYS.forEach(key => {
      const data = localStorage.getItem(key);
      if (data && data !== '[]' && data !== '{}') {
        try {
          legacyData[key] = JSON.parse(data);
          hasData = true;
        } catch (e) {
          legacyData[key] = data;
          hasData = true;
        }
      }
    });

    return hasData ? legacyData : null;
  } catch (error) {
    console.error('Error getting legacy data:', error);
    return null;
  }
};

/**
 * Get version-specific data from localStorage
 * @param {string} version - FIFA version
 * @returns {Object} Version data object
 */
export const getVersionData = (version) => {
  try {
    const versionData = {};
    let hasData = false;

    VERSION_DATA_KEYS.forEach(dataType => {
      const key = `fifa_${version}_${dataType}`;
      const data = localStorage.getItem(key);
      if (data && data !== '[]' && data !== '{}') {
        try {
          versionData[dataType] = JSON.parse(data);
          hasData = true;
        } catch (e) {
          versionData[dataType] = data;
          hasData = true;
        }
      }
    });

    return hasData ? versionData : null;
  } catch (error) {
    console.error(`Error getting data for version ${version}:`, error);
    return null;
  }
};

/**
 * Export legacy data as downloadable JSON file
 * @returns {boolean} Success status
 */
export const exportLegacyData = () => {
  try {
    const legacyData = getLegacyData();
    
    if (!legacyData) {
      throw new Error('Keine Legacy-Daten gefunden');
    }

    const exportData = {
      exportType: 'legacy',
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      data: legacyData,
      metadata: {
        recordCount: calculateRecordCount(legacyData),
        description: 'Legacy Datenexport vor FIFA Versioning System'
      }
    };

    downloadJSONFile(exportData, `legacy-data-export-${new Date().toISOString().slice(0, 10)}.json`);
    return true;
  } catch (error) {
    console.error('Error exporting legacy data:', error);
    throw error;
  }
};

/**
 * Export version-specific data as downloadable JSON file
 * @param {string} version - FIFA version
 * @returns {boolean} Success status
 */
export const exportVersionData = (version) => {
  try {
    const versionData = getVersionData(version);
    
    if (!versionData) {
      throw new Error(`Keine Daten für Version ${version} gefunden`);
    }

    const exportData = {
      exportType: 'version',
      version: version,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      data: versionData,
      metadata: {
        recordCount: calculateRecordCount(versionData),
        description: `Datenexport für FIFA Version ${version}`
      }
    };

    downloadJSONFile(exportData, `${version}-data-export-${new Date().toISOString().slice(0, 10)}.json`);
    return true;
  } catch (error) {
    console.error(`Error exporting data for version ${version}:`, error);
    throw error;
  }
};

/**
 * Copy financial data from one version to another
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @param {boolean} overwrite - Whether to overwrite existing data
 * @returns {boolean} Success status
 */
export const copyFinancialData = (fromVersion, toVersion, overwrite = false) => {
  try {
    // Get source financial data
    const sourceTransactionsKey = fromVersion === 'legacy' 
      ? 'fifa_transactions' 
      : `fifa_${fromVersion}_transactions`;
    const sourceFinancesKey = fromVersion === 'legacy' 
      ? 'fifa_finances' 
      : `fifa_${fromVersion}_finances`;

    const sourceTransactions = localStorage.getItem(sourceTransactionsKey);
    const sourceFinances = localStorage.getItem(sourceFinancesKey);

    if (!sourceTransactions && !sourceFinances) {
      throw new Error(`Keine Finanzdaten in Version ${fromVersion} gefunden`);
    }

    // Target keys
    const targetTransactionsKey = toVersion === 'legacy' 
      ? 'fifa_transactions' 
      : `fifa_${toVersion}_transactions`;
    const targetFinancesKey = toVersion === 'legacy' 
      ? 'fifa_finances' 
      : `fifa_${toVersion}_finances`;

    // Check if target already has data
    const existingTransactions = localStorage.getItem(targetTransactionsKey);
    const existingFinances = localStorage.getItem(targetFinancesKey);

    if ((existingTransactions || existingFinances) && !overwrite) {
      throw new Error(`Version ${toVersion} enthält bereits Finanzdaten. Verwenden Sie 'Überschreiben' Option.`);
    }

    // Copy data
    if (sourceTransactions) {
      localStorage.setItem(targetTransactionsKey, sourceTransactions);
    }
    if (sourceFinances) {
      localStorage.setItem(targetFinancesKey, sourceFinances);
    }

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('financialDataCopied', {
      detail: { 
        fromVersion, 
        toVersion,
        timestamp: new Date().toISOString()
      }
    }));

    return true;
  } catch (error) {
    console.error('Error copying financial data:', error);
    throw error;
  }
};

/**
 * Get available versions for financial data copying
 * @returns {Array} Array of versions with financial data
 */
export const getVersionsWithFinancialData = () => {
  try {
    const versions = [];
    
    // Check legacy data
    const legacyTransactions = localStorage.getItem('fifa_transactions');
    const legacyFinances = localStorage.getItem('fifa_finances');
    
    if (legacyTransactions || legacyFinances) {
      versions.push({
        id: 'legacy',
        name: 'Legacy Daten',
        hasTransactions: !!legacyTransactions,
        hasFinances: !!legacyFinances
      });
    }

    // Check version-specific data
    const allVersions = getAllFifaVersions();
    Object.keys(allVersions).forEach(version => {
      const transactionsKey = `fifa_${version}_transactions`;
      const financesKey = `fifa_${version}_finances`;
      
      const hasTransactions = !!localStorage.getItem(transactionsKey);
      const hasFinances = !!localStorage.getItem(financesKey);
      
      if (hasTransactions || hasFinances) {
        versions.push({
          id: version,
          name: `${version} (${allVersions[version]})`,
          hasTransactions,
          hasFinances
        });
      }
    });

    return versions;
  } catch (error) {
    console.error('Error getting versions with financial data:', error);
    return [];
  }
};

/**
 * Calculate record count in data object
 * @param {Object} data - Data object
 * @returns {number} Total record count
 */
const calculateRecordCount = (data) => {
  let count = 0;
  
  Object.values(data).forEach(value => {
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      count += Object.keys(value).length;
    } else {
      count += 1;
    }
  });
  
  return count;
};

/**
 * Download data as JSON file
 * @param {Object} data - Data to download
 * @param {string} filename - File name
 */
const downloadJSONFile = (data, filename) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Import data from uploaded file
 * @param {File} file - JSON file to import
 * @param {string} targetVersion - Target version for import
 * @returns {Promise<boolean>} Success status
 */
export const importDataToVersion = async (file, targetVersion) => {
  try {
    const fileContent = await readFileAsText(file);
    const importData = JSON.parse(fileContent);
    
    // Validate import data structure
    if (!importData.data || !importData.exportType) {
      throw new Error('Ungültiges Datenformat');
    }
    
    const { data, exportType } = importData;
    
    // Map data to target version format
    if (exportType === 'legacy') {
      // Convert legacy data to version format
      Object.entries(data).forEach(([legacyKey, value]) => {
        const dataType = mapLegacyKeyToDataType(legacyKey);
        if (dataType) {
          const targetKey = `fifa_${targetVersion}_${dataType}`;
          localStorage.setItem(targetKey, JSON.stringify(value));
        }
      });
    } else if (exportType === 'version') {
      // Copy version data
      Object.entries(data).forEach(([dataType, value]) => {
        const targetKey = `fifa_${targetVersion}_${dataType}`;
        localStorage.setItem(targetKey, JSON.stringify(value));
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
};

/**
 * Map legacy key to data type
 * @param {string} legacyKey - Legacy storage key
 * @returns {string|null} Data type
 */
const mapLegacyKeyToDataType = (legacyKey) => {
  const mapping = {
    'fifa_matches': 'matches',
    'fifa_players': 'players',
    'fifa_bans': 'bans',
    'fifa_transactions': 'transactions',
    'fifa_finances': 'finances',
    'alcoholCalculatorValues': 'alcoholCalculator'
  };
  
  return mapping[legacyKey] || null;
};

/**
 * Read file as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
/**
 * FIFA Version Manager
 * Manages FIFA version switching and database filtering
 * Ensures all database operations include the correct fifa_version
 */

// FIFA Version constants
export const FIFA_VERSIONS = {
  FC25: 'FC25',
  FC26: 'FC26'
};

// Default values
export const DEFAULT_FIFA_VERSION = FIFA_VERSIONS.FC25; // Existing data
export const CURRENT_FIFA_VERSION = FIFA_VERSIONS.FC26; // New data

// Storage key for current FIFA version
const FIFA_VERSION_STORAGE_KEY = 'fifa_current_version';

/**
 * Get the current active FIFA version
 * @returns {string} Current FIFA version (FC25 or FC26)
 */
export const getCurrentFifaVersion = () => {
  try {
    const stored = localStorage.getItem(FIFA_VERSION_STORAGE_KEY);
    if (stored && Object.values(FIFA_VERSIONS).includes(stored)) {
      return stored;
    }
    // Default to FC26 for new installations, FC25 for existing data
    return hasExistingData() ? DEFAULT_FIFA_VERSION : CURRENT_FIFA_VERSION;
  } catch (error) {
    console.error('Error getting FIFA version:', error);
    return DEFAULT_FIFA_VERSION;
  }
};

/**
 * Set the current FIFA version
 * @param {string} version - FIFA version to set (FC25 or FC26)
 * @returns {boolean} Success status
 */
export const setCurrentFifaVersion = (version) => {
  try {
    if (!Object.values(FIFA_VERSIONS).includes(version)) {
      throw new Error(`Invalid FIFA version: ${version}`);
    }
    
    localStorage.setItem(FIFA_VERSION_STORAGE_KEY, version);
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('fifaVersionChanged', {
      detail: { 
        newVersion: version,
        previousVersion: getCurrentFifaVersion()
      }
    }));
    
    console.log(`FIFA version switched to: ${version}`);
    return true;
  } catch (error) {
    console.error('Error setting FIFA version:', error);
    return false;
  }
};

/**
 * Check if there's existing data in localStorage (pre-versioning)
 * @returns {boolean} True if existing data is found
 */
const hasExistingData = () => {
  try {
    const legacyKeys = [
      'alcoholCalculatorValues',
      'fifa_matches', 
      'fifa_players',
      'fifa_bans',
      'fifa_transactions',
      'fifa_finances'
    ];
    
    return legacyKeys.some(key => {
      const data = localStorage.getItem(key);
      return data && data !== '[]' && data !== '{}';
    });
  } catch (error) {
    console.error('Error checking existing data:', error);
    return false;
  }
};

/**
 * Get FIFA version display name
 * @param {string} version - FIFA version
 * @returns {string} Display name
 */
export const getFifaVersionDisplayName = (version) => {
  const displayNames = {
    [FIFA_VERSIONS.FC25]: 'FC 25 (Legacy)',
    [FIFA_VERSIONS.FC26]: 'FC 26 (Current)'
  };
  return displayNames[version] || version;
};

/**
 * Get all available FIFA versions with metadata
 * @returns {Array} Array of FIFA version objects
 */
export const getAvailableFifaVersions = () => {
  return Object.values(FIFA_VERSIONS).map(version => ({
    id: version,
    name: getFifaVersionDisplayName(version),
    isActive: getCurrentFifaVersion() === version,
    isLegacy: version === FIFA_VERSIONS.FC25,
    isCurrent: version === FIFA_VERSIONS.FC26
  }));
};

/**
 * Add FIFA version to data object for database operations
 * @param {Object} data - Data object to enhance
 * @param {string} version - Optional version override
 * @returns {Object} Enhanced data object with fifa_version
 */
export const addFifaVersionToData = (data, version = null) => {
  const fifaVersion = version || getCurrentFifaVersion();
  return {
    ...data,
    fifa_version: fifaVersion
  };
};

/**
 * Create FIFA version filter for database queries
 * @param {string} version - Optional version override
 * @returns {Object} Filter object for database queries
 */
export const createFifaVersionFilter = (version = null) => {
  const fifaVersion = version || getCurrentFifaVersion();
  return {
    fifa_version: fifaVersion
  };
};

/**
 * Get database tables that should include FIFA version filtering
 * @returns {Array} Array of table names
 */
export const getFifaVersionedTables = () => {
  return [
    'players',
    'matches', 
    'bans',
    'transactions',
    'finances',
    'spieler_des_spiels'
  ];
};

/**
 * Check if a table should be filtered by FIFA version
 * @param {string} tableName - Name of the table
 * @returns {boolean} True if table should be FIFA version filtered
 */
export const shouldFilterByFifaVersion = (tableName) => {
  return getFifaVersionedTables().includes(tableName);
};
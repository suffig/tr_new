/**
 * FIFA Version Manager
 * Manages FIFA version switching and database filtering
 * Ensures all database operations include the correct fifa_version
 * Enhanced with dynamic version management for future-proofing
 */

// Storage keys
const FIFA_VERSION_STORAGE_KEY = 'fifa_current_version';
const CUSTOM_VERSIONS_STORAGE_KEY = 'fifa_custom_versions';

// Built-in FIFA Version constants (immutable)
export const BUILT_IN_FIFA_VERSIONS = {
  FC25: 'FC25',
  FC26: 'FC26'
};

// Default values
export const DEFAULT_FIFA_VERSION = BUILT_IN_FIFA_VERSIONS.FC25; // Existing data
export const CURRENT_FIFA_VERSION = BUILT_IN_FIFA_VERSIONS.FC26; // New data

/**
 * Get custom FIFA versions from localStorage
 * @returns {Object} Custom FIFA versions
 */
const getCustomFifaVersions = () => {
  try {
    const stored = localStorage.getItem(CUSTOM_VERSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading custom FIFA versions:', error);
    return {};
  }
};

/**
 * Save custom FIFA versions to localStorage
 * @param {Object} customVersions - Custom versions object
 */
const saveCustomFifaVersions = (customVersions) => {
  try {
    localStorage.setItem(CUSTOM_VERSIONS_STORAGE_KEY, JSON.stringify(customVersions));
  } catch (error) {
    console.error('Error saving custom FIFA versions:', error);
  }
};

/**
 * Get all FIFA versions (built-in + custom)
 * @returns {Object} All FIFA versions
 */
export const getAllFifaVersions = () => {
  const customVersions = getCustomFifaVersions();
  return { ...BUILT_IN_FIFA_VERSIONS, ...customVersions };
};

/**
 * Add a new custom FIFA version
 * @param {string} version - Version identifier (e.g., 'FC27', 'EA25')
 * @param {Object} metadata - Version metadata
 * @returns {boolean} Success status
 */
export const addCustomFifaVersion = (version, metadata = {}) => {
  try {
    if (!version || typeof version !== 'string') {
      throw new Error('Version must be a non-empty string');
    }

    // Check if version already exists
    const allVersions = getAllFifaVersions();
    if (allVersions[version]) {
      throw new Error(`Version ${version} already exists`);
    }

    // Validate version format (should start with letters, can contain numbers)
    if (!/^[A-Za-z]+\d*$/.test(version)) {
      throw new Error('Version format invalid. Use format like FC27, EA25, etc.');
    }

    const customVersions = getCustomFifaVersions();
    customVersions[version] = version;
    saveCustomFifaVersions(customVersions);

    // Save metadata if provided
    if (Object.keys(metadata).length > 0) {
      const metadataKey = `fifa_version_metadata_${version}`;
      localStorage.setItem(metadataKey, JSON.stringify(metadata));
    }

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('fifaVersionAdded', {
      detail: { 
        version: version,
        metadata: metadata
      }
    }));

    console.log(`Added custom FIFA version: ${version}`);
    return true;
  } catch (error) {
    console.error('Error adding custom FIFA version:', error);
    throw error;
  }
};

/**
 * Remove a custom FIFA version
 * @param {string} version - Version to remove
 * @returns {boolean} Success status
 */
export const removeCustomFifaVersion = (version) => {
  try {
    // Cannot remove built-in versions
    if (BUILT_IN_FIFA_VERSIONS[version]) {
      throw new Error(`Cannot remove built-in version: ${version}`);
    }

    const customVersions = getCustomFifaVersions();
    if (!customVersions[version]) {
      throw new Error(`Custom version ${version} does not exist`);
    }

    // Check if it's currently active
    if (getCurrentFifaVersion() === version) {
      throw new Error(`Cannot remove active version: ${version}. Switch to another version first.`);
    }

    delete customVersions[version];
    saveCustomFifaVersions(customVersions);

    // Remove metadata
    const metadataKey = `fifa_version_metadata_${version}`;
    localStorage.removeItem(metadataKey);

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('fifaVersionRemoved', {
      detail: { version: version }
    }));

    console.log(`Removed custom FIFA version: ${version}`);
    return true;
  } catch (error) {
    console.error('Error removing custom FIFA version:', error);
    throw error;
  }
};

/**
 * Get metadata for a FIFA version
 * @param {string} version - FIFA version
 * @returns {Object} Version metadata
 */
export const getFifaVersionMetadata = (version) => {
  try {
    const metadataKey = `fifa_version_metadata_${version}`;
    const stored = localStorage.getItem(metadataKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting FIFA version metadata:', error);
    return {};
  }
};

/**
 * Get the current active FIFA version
 * @returns {string} Current FIFA version
 */
export const getCurrentFifaVersion = () => {
  try {
    const stored = localStorage.getItem(FIFA_VERSION_STORAGE_KEY);
    const allVersions = getAllFifaVersions();
    
    if (stored && allVersions[stored]) {
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
 * @param {string} version - FIFA version to set
 * @returns {boolean} Success status
 */
export const setCurrentFifaVersion = (version) => {
  try {
    const allVersions = getAllFifaVersions();
    if (!allVersions[version]) {
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
  const builtInDisplayNames = {
    [BUILT_IN_FIFA_VERSIONS.FC25]: 'FC 25 (Legacy)',
    [BUILT_IN_FIFA_VERSIONS.FC26]: 'FC 26 (Current)'
  };
  
  // Check built-in names first
  if (builtInDisplayNames[version]) {
    return builtInDisplayNames[version];
  }
  
  // For custom versions, check if metadata exists
  const metadata = getFifaVersionMetadata(version);
  if (metadata.displayName) {
    return metadata.displayName;
  }
  
  // Default to version name
  return version;
};

/**
 * Get all available FIFA versions with metadata
 * @returns {Array} Array of FIFA version objects
 */
export const getAvailableFifaVersions = () => {
  const allVersions = getAllFifaVersions();
  const currentVersion = getCurrentFifaVersion();
  
  return Object.values(allVersions).map(version => {
    const metadata = getFifaVersionMetadata(version);
    return {
      id: version,
      name: getFifaVersionDisplayName(version),
      isActive: currentVersion === version,
      isLegacy: version === BUILT_IN_FIFA_VERSIONS.FC25,
      isCurrent: version === BUILT_IN_FIFA_VERSIONS.FC26,
      isCustom: !BUILT_IN_FIFA_VERSIONS[version],
      metadata: metadata,
      createdAt: metadata.createdAt || null,
      description: metadata.description || null
    };
  });
};

/**
 * Get built-in FIFA versions for backward compatibility
 * @returns {Object} Built-in FIFA versions
 * @deprecated Use getAllFifaVersions() instead
 */
export const FIFA_VERSIONS = BUILT_IN_FIFA_VERSIONS;

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
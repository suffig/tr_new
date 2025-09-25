/**
 * Season Manager Utility
 * Handles data versioning and migration between FIFA seasons (Legacy vs FC26)
 * Provides data isolation while preserving access to historical data
 * Now integrated with FIFA version database management
 */

import { 
  getCurrentFifaVersion, 
  setCurrentFifaVersion, 
  FIFA_VERSIONS,
  getFifaVersionDisplayName 
} from './fifaVersionManager.js';

// Season definitions (keeping legacy compatibility)
export const SEASONS = {
  LEGACY: 'legacy',
  FC26: 'fc26'
};

// Map seasons to FIFA versions
const SEASON_TO_FIFA_VERSION = {
  [SEASONS.LEGACY]: FIFA_VERSIONS.FC25,
  [SEASONS.FC26]: FIFA_VERSIONS.FC26
};

const FIFA_VERSION_TO_SEASON = {
  [FIFA_VERSIONS.FC25]: SEASONS.LEGACY,
  [FIFA_VERSIONS.FC26]: SEASONS.FC26
};

export const SEASON_NAMES = {
  [SEASONS.LEGACY]: 'Legacy FIFA (FC25)',
  [SEASONS.FC26]: 'FIFA Club 26'
};

// Storage keys for different seasons
const STORAGE_KEYS = {
  CURRENT_SEASON: 'fifa_current_season',
  SEASON_PREFIX: 'fifa_season_',
  LEGACY_MIGRATION: 'fifa_legacy_migration_status'
};

// Season metadata structure
const SEASON_METADATA = {
  [SEASONS.LEGACY]: {
    name: 'Legacy FIFA',
    description: 'Alle bisherigen Daten und Statistiken',
    icon: '📚',
    version: '1.0',
    color: '#6B7280' // Gray for legacy
  },
  [SEASONS.FC26]: {
    name: 'FIFA Club 26',
    description: 'Neue Saison mit frischen Daten',
    icon: '⚡',
    version: '2.0',
    color: '#3B82F6' // Blue for new season
  }
};

/**
 * Get current active season
 * @returns {string} Current season identifier
 */
export const getCurrentSeason = () => {
  try {
    // Use FIFA version as the primary source of truth
    const currentFifaVersion = getCurrentFifaVersion();
    const season = FIFA_VERSION_TO_SEASON[currentFifaVersion];
    
    if (season) {
      return season;
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SEASON);
    if (stored) {
      return stored;
    }
    
    // Default to Legacy for existing users, FC26 for new users
    const hasExistingData = localStorage.getItem('alcoholCalculatorValues') ||
                            localStorage.getItem('fifa_matches') ||
                            localStorage.getItem('fifa_players');
    return hasExistingData ? SEASONS.LEGACY : SEASONS.FC26;
  } catch (error) {
    console.error('Error getting current season:', error);
    return SEASONS.LEGACY;
  }
};

/**
 * Set current active season
 * @param {string} season - Season identifier
 */
export const setCurrentSeason = (season) => {
  try {
    if (!Object.values(SEASONS).includes(season)) {
      throw new Error(`Invalid season: ${season}`);
    }
    
    // Update both season and FIFA version
    localStorage.setItem(STORAGE_KEYS.CURRENT_SEASON, season);
    const fifaVersion = SEASON_TO_FIFA_VERSION[season];
    if (fifaVersion) {
      setCurrentFifaVersion(fifaVersion);
    }
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('seasonChanged', {
      detail: { 
        newSeason: season, 
        fifaVersion: fifaVersion,
        metadata: SEASON_METADATA[season] 
      }
    }));
    
    console.log(`Season switched to: ${SEASON_NAMES[season]} (FIFA Version: ${fifaVersion})`);
    return true;
  } catch (error) {
    console.error('Error setting current season:', error);
    return false;
  }
};

/**
 * Get season-specific storage key for any data type
 * @param {string} dataType - Type of data (e.g., 'matches', 'players', 'alcoholCalculator')
 * @param {string} season - Season identifier (optional, uses current season if not provided)
 * @returns {string} Season-specific storage key
 */
export const getSeasonStorageKey = (dataType, season = null) => {
  const activeSeason = season || getCurrentSeason();
  return `${STORAGE_KEYS.SEASON_PREFIX}${activeSeason}_${dataType}`;
};

/**
 * Get all available seasons with their metadata
 * @returns {Array} Array of season objects with metadata
 */
export const getAvailableSeasons = () => {
  return Object.values(SEASONS).map(season => ({
    id: season,
    ...SEASON_METADATA[season],
    isActive: getCurrentSeason() === season,
    hasData: checkSeasonHasData(season)
  }));
};

/**
 * Check if a season has any data stored
 * @param {string} season - Season identifier
 * @returns {boolean} True if season has data
 */
export const checkSeasonHasData = (season) => {
  try {
    const dataTypes = ['matches', 'players', 'bans', 'transactions', 'alcoholCalculator'];
    
    for (const dataType of dataTypes) {
      const key = getSeasonStorageKey(dataType, season);
      const data = localStorage.getItem(key);
      if (data && data !== '[]' && data !== '{}') {
        return true;
      }
    }
    
    // Special check for legacy data (pre-versioning)
    if (season === SEASONS.LEGACY) {
      const legacyKeys = ['alcoholCalculatorValues', 'fifa_matches', 'fifa_players'];
      for (const key of legacyKeys) {
        const data = localStorage.getItem(key);
        if (data && data !== '[]' && data !== '{}') {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking data for season ${season}:`, error);
    return false;
  }
};

/**
 * Get season metadata
 * @param {string} season - Season identifier
 * @returns {Object} Season metadata
 */
export const getSeasonMetadata = (season) => {
  return SEASON_METADATA[season] || null;
};

/**
 * Migrate legacy data to season-based storage
 * This is called automatically when switching from unversioned to versioned data
 */
export const migrateLegacyData = () => {
  try {
    const migrationStatus = localStorage.getItem(STORAGE_KEYS.LEGACY_MIGRATION);
    if (migrationStatus === 'completed') {
      console.log('Legacy data already migrated');
      return true;
    }

    console.log('Starting legacy data migration...');

    // Define legacy storage keys and their new data types
    const legacyMappings = {
      'alcoholCalculatorValues': 'alcoholCalculator',
      'fifa_matches': 'matches',
      'fifa_players': 'players',
      'fifa_bans': 'bans',
      'fifa_transactions': 'transactions',
      'fifa_finances': 'finances'
    };

    let migratedAny = false;

    // Migrate each data type
    Object.entries(legacyMappings).forEach(([legacyKey, dataType]) => {
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        const newKey = getSeasonStorageKey(dataType, SEASONS.LEGACY);
        localStorage.setItem(newKey, legacyData);
        console.log(`Migrated ${legacyKey} to ${newKey}`);
        migratedAny = true;
      }
    });

    // Mark migration as completed
    localStorage.setItem(STORAGE_KEYS.LEGACY_MIGRATION, 'completed');

    if (migratedAny) {
      console.log('Legacy data migration completed successfully');
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('legacyDataMigrated', {
        detail: { timestamp: new Date().toISOString() }
      }));
    } else {
      console.log('No legacy data found to migrate');
    }

    return true;
  } catch (error) {
    console.error('Error during legacy data migration:', error);
    return false;
  }
};

/**
 * Create a clean FC26 environment
 * This initializes empty data structures for the new season
 */
export const initializeFC26Environment = () => {
  try {
    console.log('Initializing clean FC26 environment...');

    // Create default empty data structures for FC26
    const defaultData = {
      alcoholCalculator: JSON.stringify({
        aekPlayer: '',
        realPlayer: '',
        aekGoals: 0,
        realGoals: 0,
        mode: 'manual',
        gameDay: new Date().toISOString().split('T')[0],
        beerCount: { aek: 0, real: 0 },
        alexanderShots: { cl40: 0, cl20: 0 },
        philipShots: { cl40: 0, cl20: 0 },
        cumulativeShots: {
          aek: 0, real: 0, total: 0,
          lastMatchId: null, lastUpdated: null
        },
        lastUpdated: new Date().toISOString(),
        drinkingStartTime: null,
        version: '2.0',
        season: SEASONS.FC26
      }),
      matches: JSON.stringify([]),
      players: JSON.stringify([]),
      bans: JSON.stringify([]),
      transactions: JSON.stringify([]),
      finances: JSON.stringify([])
    };

    // Initialize FC26 data only if it doesn't exist
    Object.entries(defaultData).forEach(([dataType, defaultValue]) => {
      const key = getSeasonStorageKey(dataType, SEASONS.FC26);
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, defaultValue);
        console.log(`Initialized FC26 ${dataType} data`);
      }
    });

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('fc26EnvironmentInitialized', {
      detail: { timestamp: new Date().toISOString() }
    }));

    console.log('FC26 environment initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing FC26 environment:', error);
    return false;
  }
};

/**
 * Switch between seasons with proper data handling
 * @param {string} targetSeason - Season to switch to
 * @returns {boolean} Success status
 */
export const switchToSeason = (targetSeason) => {
  try {
    const currentSeason = getCurrentSeason();
    
    if (currentSeason === targetSeason) {
      console.log(`Already in season: ${SEASON_NAMES[targetSeason]}`);
      return true;
    }

    // Perform any necessary migrations
    if (currentSeason === SEASONS.LEGACY) {
      migrateLegacyData();
    }

    // Initialize FC26 environment if switching to it
    if (targetSeason === SEASONS.FC26) {
      initializeFC26Environment();
    }

    // Switch the season
    const success = setCurrentSeason(targetSeason);
    
    if (success) {
      console.log(`Successfully switched from ${SEASON_NAMES[currentSeason]} to ${SEASON_NAMES[targetSeason]}`);
      
      // Reload page to ensure all components use new season data
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 100);
    }

    return success;
  } catch (error) {
    console.error('Error switching season:', error);
    return false;
  }
};

/**
 * Get summary of data across all seasons
 * @returns {Object} Data summary by season
 */
export const getSeasonDataSummary = () => {
  const summary = {};
  
  Object.values(SEASONS).forEach(season => {
    summary[season] = {
      ...SEASON_METADATA[season],
      hasData: checkSeasonHasData(season),
      isActive: getCurrentSeason() === season
    };
  });

  return summary;
};

/**
 * Export season data for backup/sharing
 * @param {string} season - Season to export
 * @returns {Object} Exported data
 */
export const exportSeasonData = (season) => {
  try {
    const dataTypes = ['matches', 'players', 'bans', 'transactions', 'alcoholCalculator'];
    const exportData = {
      season,
      metadata: SEASON_METADATA[season],
      exportedAt: new Date().toISOString(),
      data: {}
    };

    dataTypes.forEach(dataType => {
      const key = getSeasonStorageKey(dataType, season);
      const data = localStorage.getItem(key);
      if (data) {
        try {
          exportData.data[dataType] = JSON.parse(data);
        } catch (parseError) {
          exportData.data[dataType] = data; // Keep as string if not JSON
        }
      }
    });

    return exportData;
  } catch (error) {
    console.error(`Error exporting season data for ${season}:`, error);
    return null;
  }
};

// Initialize season management on module load
try {
  // Perform migration check on first load
  const currentSeason = getCurrentSeason();
  if (currentSeason === SEASONS.LEGACY) {
    migrateLegacyData();
  }
  console.log(`Season Manager initialized. Current season: ${SEASON_NAMES[currentSeason]}`);
} catch (error) {
  console.error('Error initializing Season Manager:', error);
}
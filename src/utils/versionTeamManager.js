/**
 * Version-specific Team Configuration Manager
 * Manages team settings per FIFA version including custom names and icons
 */

import { getCurrentFifaVersion, getAllFifaVersions, BUILT_IN_FIFA_VERSIONS } from './fifaVersionManager.js';

// Storage keys
const VERSION_TEAMS_STORAGE_KEY = 'fifa_version_teams';
const VERSION_ICONS_STORAGE_KEY = 'fifa_version_icons';

// Default team configurations for FC25 (Legacy)
const DEFAULT_TEAMS_FC25 = {
  AEK: { 
    label: 'AEK Athen', 
    color: 'blue', 
    icon: 'aek',
    customIcon: null
  },
  Real: { 
    label: 'Real Madrid', 
    color: 'red', 
    icon: 'real',
    customIcon: null
  },
  Ehemalige: { 
    label: 'Ehemalige', 
    color: 'gray', 
    icon: '⚫',
    customIcon: null
  }
};

// Default team configurations for FC26 (Current)
const DEFAULT_TEAMS_FC26 = {
  AEK: { 
    label: 'AEK Athen', 
    color: 'blue', 
    icon: 'aek',
    customIcon: null
  },
  Real: { 
    label: 'Rangers', 
    color: 'red', 
    icon: 'real',  // Still using 'real' icon key, but custom logo can be uploaded
    customIcon: null
  },
  Ehemalige: { 
    label: 'Ehemalige', 
    color: 'gray', 
    icon: '⚫',
    customIcon: null
  }
};

// Default team configurations (for backward compatibility)
const DEFAULT_TEAMS = DEFAULT_TEAMS_FC25;

/**
 * Get default teams for a specific FIFA version
 * @param {string} version - FIFA version
 * @returns {Object} Default team configurations for the version
 */
const getDefaultTeamsForVersion = (version) => {
  if (version === BUILT_IN_FIFA_VERSIONS.FC26) {
    return { ...DEFAULT_TEAMS_FC26 };
  }
  return { ...DEFAULT_TEAMS_FC25 };
};

/**
 * Get version-specific team configurations
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {Object} Team configurations for the version
 */
export const getVersionTeams = (version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    const stored = localStorage.getItem(VERSION_TEAMS_STORAGE_KEY);
    const allVersionTeams = stored ? JSON.parse(stored) : {};
    
    // Return version-specific teams or version-specific defaults
    return allVersionTeams[fifaVersion] || getDefaultTeamsForVersion(fifaVersion);
  } catch (error) {
    console.error('Error getting version teams:', error);
    return getDefaultTeamsForVersion(version);
  }
};

/**
 * Set version-specific team configurations
 * @param {Object} teams - Team configurations
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {boolean} Success status
 */
export const setVersionTeams = (teams, version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    const stored = localStorage.getItem(VERSION_TEAMS_STORAGE_KEY);
    const allVersionTeams = stored ? JSON.parse(stored) : {};
    
    allVersionTeams[fifaVersion] = teams;
    localStorage.setItem(VERSION_TEAMS_STORAGE_KEY, JSON.stringify(allVersionTeams));
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('versionTeamsChanged', {
      detail: { version: fifaVersion, teams }
    }));
    
    return true;
  } catch (error) {
    console.error('Error setting version teams:', error);
    return false;
  }
};

/**
 * Get all version team configurations
 * @returns {Object} All version team configurations
 */
export const getAllVersionTeams = () => {
  try {
    const stored = localStorage.getItem(VERSION_TEAMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting all version teams:', error);
    return {};
  }
};

/**
 * Copy team settings from one version to another
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {boolean} Success status
 */
export const copyTeamsBetweenVersions = (fromVersion, toVersion) => {
  try {
    const sourceTeams = getVersionTeams(fromVersion);
    return setVersionTeams(sourceTeams, toVersion);
  } catch (error) {
    console.error('Error copying teams between versions:', error);
    return false;
  }
};

/**
 * Reset team settings for a version to defaults
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {boolean} Success status
 */
export const resetVersionTeams = (version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    return setVersionTeams(getDefaultTeamsForVersion(fifaVersion), version);
  } catch (error) {
    console.error('Error resetting version teams:', error);
    return false;
  }
};

/**
 * Upload and store custom icon for a team in a specific version
 * @param {string} teamKey - Team key (AEK, Real, etc.)
 * @param {File} iconFile - Icon file
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {Promise<boolean>} Success status
 */
export const uploadTeamIcon = async (teamKey, iconFile, version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    
    // Convert file to base64
    const reader = new FileReader();
    const iconData = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(iconFile);
    });
    
    // Store icon data
    const stored = localStorage.getItem(VERSION_ICONS_STORAGE_KEY);
    const allVersionIcons = stored ? JSON.parse(stored) : {};
    
    if (!allVersionIcons[fifaVersion]) {
      allVersionIcons[fifaVersion] = {};
    }
    
    allVersionIcons[fifaVersion][teamKey] = {
      data: iconData,
      filename: iconFile.name,
      size: iconFile.size,
      type: iconFile.type,
      uploadedAt: new Date().toISOString()
    };
    
    localStorage.setItem(VERSION_ICONS_STORAGE_KEY, JSON.stringify(allVersionIcons));
    
    // Update team configuration to reference custom icon
    const currentTeams = getVersionTeams(fifaVersion);
    if (currentTeams[teamKey]) {
      currentTeams[teamKey].customIcon = iconData;
      setVersionTeams(currentTeams, fifaVersion);
    }
    
    return true;
  } catch (error) {
    console.error('Error uploading team icon:', error);
    return false;
  }
};

/**
 * Get custom icon for a team in a specific version
 * @param {string} teamKey - Team key
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {string|null} Icon data URL or null
 */
export const getTeamIcon = (teamKey, version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    const teams = getVersionTeams(fifaVersion);
    
    return teams[teamKey]?.customIcon || null;
  } catch (error) {
    console.error('Error getting team icon:', error);
    return null;
  }
};

/**
 * Remove custom icon for a team in a specific version
 * @param {string} teamKey - Team key
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {boolean} Success status
 */
export const removeTeamIcon = (teamKey, version = null) => {
  try {
    const fifaVersion = version || getCurrentFifaVersion();
    
    // Remove from icons storage
    const stored = localStorage.getItem(VERSION_ICONS_STORAGE_KEY);
    const allVersionIcons = stored ? JSON.parse(stored) : {};
    
    if (allVersionIcons[fifaVersion]?.[teamKey]) {
      delete allVersionIcons[fifaVersion][teamKey];
      localStorage.setItem(VERSION_ICONS_STORAGE_KEY, JSON.stringify(allVersionIcons));
    }
    
    // Update team configuration
    const currentTeams = getVersionTeams(fifaVersion);
    if (currentTeams[teamKey]) {
      currentTeams[teamKey].customIcon = null;
      setVersionTeams(currentTeams, fifaVersion);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing team icon:', error);
    return false;
  }
};

/**
 * Get team display information for current version
 * Backward compatibility with existing team constants
 * @param {string} teamValue - Team value
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {Object} Team display info
 */
export const getVersionTeamDisplay = (teamValue, version = null) => {
  try {
    const teams = getVersionTeams(version);
    const team = teams[teamValue];
    
    if (!team) {
      return { value: teamValue, label: teamValue, color: 'gray', icon: '⚽' };
    }
    
    return {
      value: teamValue,
      label: team.label,
      color: team.color,
      icon: team.customIcon || team.icon
    };
  } catch (error) {
    console.error('Error getting version team display:', error);
    return { value: teamValue, label: teamValue, color: 'gray', icon: '⚽' };
  }
};

/**
 * Get teams in format compatible with existing TEAMS constant
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {Array} Teams array
 */
export const getVersionTeamsArray = (version = null) => {
  try {
    const teams = getVersionTeams(version);
    return Object.entries(teams).map(([value, config]) => ({
      value,
      label: config.label,
      color: config.color,
      icon: config.customIcon || config.icon
    }));
  } catch (error) {
    console.error('Error getting version teams array:', error);
    return [];
  }
};
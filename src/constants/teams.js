import { getVersionTeamsArray, getVersionTeamDisplay } from '../utils/versionTeamManager.js';
import { getCurrentFifaVersion, BUILT_IN_FIFA_VERSIONS } from '../utils/fifaVersionManager.js';

// Legacy TEAMS constant for backward compatibility (FC25 defaults)
export const TEAMS = [
  { value: 'AEK', label: 'AEK Athen', color: 'blue', icon: 'aek' },
  { value: 'Real', label: 'Real Madrid', color: 'red', icon: 'real' },
  { value: 'Ehemalige', label: 'Ehemalige', color: 'gray', icon: '⚫' },
];

// FC26 TEAMS (with Dynamo Dresden and Rangers)
export const TEAMS_FC26 = [
  { value: 'AEK', label: 'Dynamo Dresden', color: 'blue', icon: 'dynamo' }, // Dynamo Dresden for FC26
  { value: 'Real', label: 'Rangers', color: 'red', icon: 'real' }, // Rangers for FC26
  { value: 'Ehemalige', label: 'Ehemalige', color: 'gray', icon: '⚫' },
];

/**
 * Get teams for current or specific FIFA version
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {Array} Teams array
 */
export const getTeams = (version = null) => {
  try {
    return getVersionTeamsArray(version);
  } catch (error) {
    console.error('Error getting teams:', error);
    return TEAMS; // Fallback to legacy teams
  }
};

/**
 * Get team display information (version-aware)
 * @param {string} teamValue - Team value
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {string} Team label
 */
export const getTeamDisplay = (teamValue, version = null) => {
  try {
    const teamDisplay = getVersionTeamDisplay(teamValue, version);
    return teamDisplay.label;
  } catch (error) {
    console.error('Error getting team display:', error);
    // Fallback to legacy implementation
    const team = TEAMS.find(t => t.value === teamValue);
    return team ? team.label : teamValue;
  }
};

/**
 * Get team color (version-aware)
 * @param {string} teamValue - Team value
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {string} Team color
 */
export const getTeamColor = (teamValue, version = null) => {
  try {
    const teamDisplay = getVersionTeamDisplay(teamValue, version);
    return teamDisplay.color;
  } catch (error) {
    console.error('Error getting team color:', error);
    // Fallback to legacy implementation
    const team = TEAMS.find(t => t.value === teamValue);
    return team ? team.color : 'gray';
  }
};

/**
 * Get team icon (version-aware)
 * @param {string} teamValue - Team value
 * @param {string} version - FIFA version (optional, defaults to current)
 * @returns {string} Team icon
 */
export const getTeamIcon = (teamValue, version = null) => {
  try {
    const teamDisplay = getVersionTeamDisplay(teamValue, version);
    return teamDisplay.icon;
  } catch (error) {
    console.error('Error getting team icon:', error);
    // Fallback to legacy implementation
    const team = TEAMS.find(t => t.value === teamValue);
    return team ? team.icon : '⚽';
  }
};
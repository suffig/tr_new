/**
 * Alcohol Calculator Persistence Utility
 * Handles saving and loading of alcohol calculator values over time
 */

const STORAGE_KEY = 'alcoholCalculatorValues';
const STORAGE_VERSION = '1.0';

/**
 * Default calculator values
 */
const getDefaultValues = () => ({
  aekPlayer: '',
  realPlayer: '',
  aekGoals: 0,
  realGoals: 0,
  mode: 'manual', // 'manual' or 'automatic'
  gameDay: new Date().toISOString().split('T')[0],
  beerCount: {
    aek: 0,
    real: 0
  },
  // Individual tracking for Alexander and Philip
  alexanderShots: {
    cl40: 0, // 2cl shots at 40% alcohol
    cl20: 0  // 2cl shots at 20% alcohol
  },
  philipShots: {
    cl40: 0, // 2cl shots at 40% alcohol
    cl20: 0  // 2cl shots at 20% alcohol
  },
  // Cumulative shots from all matches (automatically updated)
  cumulativeShots: {
    aek: 0,      // Total cl of shots AEK has drunk from Real goals
    real: 0,     // Total cl of shots Real has drunk from AEK goals
    total: 0,    // Total cl of shots from all matches
    lastMatchId: null, // Track last processed match to avoid duplicates
    lastUpdated: null  // When cumulative shots were last updated
  },
  // Timestamp tracking for time-based calculations
  lastUpdated: new Date().toISOString(),
  drinkingStartTime: null, // When drinking started for time decay calculations
  version: STORAGE_VERSION
});

/**
 * Load calculator values from localStorage
 * @returns {Object} Calculator values with fallback to defaults
 */
export const loadCalculatorValues = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return getDefaultValues();
    }

    const parsed = JSON.parse(saved);
    
    // Version compatibility check
    if (!parsed.version || parsed.version !== STORAGE_VERSION) {
      console.log('Alcohol calculator: Version mismatch, using defaults');
      return getDefaultValues();
    }

    // Ensure all required fields exist with defaults
    const defaults = getDefaultValues();
    const merged = {
      ...defaults,
      ...parsed,
      beerCount: {
        ...defaults.beerCount,
        ...(parsed.beerCount || {})
      },
      alexanderShots: {
        ...defaults.alexanderShots,
        ...(parsed.alexanderShots || {})
      },
      philipShots: {
        ...defaults.philipShots,
        ...(parsed.philipShots || {})
      },
      cumulativeShots: {
        ...defaults.cumulativeShots,
        ...(parsed.cumulativeShots || {})
      }
    };

    return merged;
  } catch (error) {
    console.error('Error loading alcohol calculator values:', error);
    return getDefaultValues();
  }
};

/**
 * Save calculator values to localStorage
 * @param {Object} values - Calculator values to save
 */
export const saveCalculatorValues = (values) => {
  try {
    const toSave = {
      ...values,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    
    // Dispatch custom event to notify other components if needed (browser only)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alcoholCalculatorValuesChanged', {
        detail: toSave
      }));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving alcohol calculator values:', error);
    return false;
  }
};

/**
 * Update specific calculator values and save
 * @param {Object} updates - Partial updates to merge with existing values
 * @param {Object} currentValues - Current calculator values
 * @returns {Object} Updated values
 */
export const updateCalculatorValues = (updates, currentValues) => {
  const updated = {
    ...currentValues,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  // Handle nested updates
  if (updates.beerCount) {
    updated.beerCount = {
      ...currentValues.beerCount,
      ...updates.beerCount
    };
  }
  
  if (updates.cumulativeShots) {
    updated.cumulativeShots = {
      ...currentValues.cumulativeShots,
      ...updates.cumulativeShots
    };
  }
  
  saveCalculatorValues(updated);
  return updated;
};

/**
 * Set drinking start time for time decay calculations
 * @param {Object} currentValues - Current calculator values
 * @returns {Object} Updated values with drinking start time
 */
export const setDrinkingStartTime = (currentValues) => {
  const updated = {
    ...currentValues,
    drinkingStartTime: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  saveCalculatorValues(updated);
  return updated;
};

/**
 * Clear all calculator values (reset to defaults)
 * @returns {Object} Default values
 */
export const clearCalculatorValues = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return getDefaultValues();
  } catch (error) {
    console.error('Error clearing alcohol calculator values:', error);
    return getDefaultValues();
  }
};

/**
 * Get time passed since drinking started (for BAC decay calculations)
 * @param {Object} values - Calculator values containing drinkingStartTime
 * @returns {number} Hours passed since drinking started, or 0 if no start time
 */
export const getHoursSinceDrinkingStarted = (values) => {
  if (!values.drinkingStartTime) {
    return 0;
  }
  
  try {
    const startTime = new Date(values.drinkingStartTime);
    const now = new Date();
    return (now - startTime) / (1000 * 60 * 60); // Convert to hours
  } catch (error) {
    console.error('Error calculating time since drinking started:', error);
    return 0;
  }
};

/**
 * Check if values were updated today (useful for automatic mode)
 * @param {Object} values - Calculator values
 * @returns {boolean} True if values were updated today
 */
export const wasUpdatedToday = (values) => {
  if (!values.lastUpdated) {
    return false;
  }
  
  try {
    const lastUpdated = new Date(values.lastUpdated);
    const today = new Date();
    
    return lastUpdated.toDateString() === today.toDateString();
  } catch (error) {
    console.error('Error checking if values were updated today:', error);
    return false;
  }
};

/**
 * Update cumulative shots from all matches in the database
 * This function should be called whenever a new match is added
 * @param {Array} matches - Array of all matches from the database
 * @param {Object} currentValues - Current calculator values
 * @returns {Object} Updated calculator values with new cumulative shots
 */
export const updateCumulativeShotsFromMatches = (matches, currentValues = null) => {
  try {
    const values = currentValues || loadCalculatorValues();
    
    if (!matches || !Array.isArray(matches)) {
      console.warn('Invalid matches array provided to updateCumulativeShotsFromMatches');
      return values;
    }
    
    // Calculate cumulative shots from all matches
    let aekTotalShots = 0; // Shots AEK has drunk (from Real goals)
    let realTotalShots = 0; // Shots Real has drunk (from AEK goals)
    
    // Sort matches by date to process chronologically
    const sortedMatches = matches.slice().sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateA - dateB;
    });
    
    // Group matches by day and calculate cumulative shots per day
    const matchesByDay = {};
    sortedMatches.forEach(match => {
      const matchDate = new Date(match.date || 0);
      const dayKey = matchDate.toDateString();
      
      if (!matchesByDay[dayKey]) {
        matchesByDay[dayKey] = [];
      }
      matchesByDay[dayKey].push(match);
    });
    
    // Calculate shots per day with cumulative logic
    Object.keys(matchesByDay).forEach(dayKey => {
      const dayMatches = matchesByDay[dayKey];
      let cumulativeAekGoals = 0;
      let cumulativeRealGoals = 0;
      let aekShotsGiven = 0;
      let realShotsGiven = 0;
      
      dayMatches.forEach(match => {
        const aekGoals = match.goalsa || 0;
        const realGoals = match.goalsb || 0;
        
        cumulativeAekGoals += aekGoals;
        cumulativeRealGoals += realGoals;
        
        // Calculate shots based on cumulative goals from beginning of day
        // Every 2 goals scored means 1 shot (2cl) for the opposing team
        const newAekShots = Math.floor(cumulativeRealGoals / 2);
        const newRealShots = Math.floor(cumulativeAekGoals / 2);
        
        // Only add the difference (new shots since last match)
        const aekShotsToAdd = (newAekShots - aekShotsGiven) * 2; // 2cl per shot
        const realShotsToAdd = (newRealShots - realShotsGiven) * 2; // 2cl per shot
        
        aekTotalShots += aekShotsToAdd;
        realTotalShots += realShotsToAdd;
        
        // Update counters
        aekShotsGiven = newAekShots;
        realShotsGiven = newRealShots;
      });
    });
    
    // Get the latest match ID for tracking
    const latestMatch = sortedMatches.length > 0 ? sortedMatches[sortedMatches.length - 1] : null;
    const latestMatchId = latestMatch ? latestMatch.id : null;
    
    // Update cumulative shots
    const updatedValues = updateCalculatorValues({
      cumulativeShots: {
        aek: aekTotalShots,
        real: realTotalShots,
        total: aekTotalShots + realTotalShots,
        lastMatchId: latestMatchId,
        lastUpdated: new Date().toISOString()
      }
    }, values);
    
    return updatedValues;
  } catch (error) {
    console.error('Error updating cumulative shots from matches:', error);
    return currentValues || loadCalculatorValues();
  }
};

/**
 * Update shots when a single new match is added
 * This is optimized for single match updates to avoid recalculating everything
 * @param {Object} newMatch - The newly added match
 * @param {Object} currentValues - Current calculator values
 * @returns {Object} Updated calculator values
 */
export const addShotsFromNewMatch = (newMatch, currentValues = null) => {
  try {
    const values = currentValues || loadCalculatorValues();
    
    if (!newMatch || typeof newMatch !== 'object') {
      console.warn('Invalid match object provided to addShotsFromNewMatch');
      return values;
    }
    
    const aekGoals = newMatch.goalsa || 0;
    const realGoals = newMatch.goalsb || 0;
    
    // Calculate shots from this match
    // Every 2 goals means 2cl (1 shot) for the opposing team
    const aekShotsFromThisMatch = Math.floor(realGoals / 2) * 2; // AEK drinks from Real goals
    const realShotsFromThisMatch = Math.floor(aekGoals / 2) * 2; // Real drinks from AEK goals
    
    // Add to cumulative totals
    const updatedValues = updateCalculatorValues({
      cumulativeShots: {
        aek: values.cumulativeShots.aek + aekShotsFromThisMatch,
        real: values.cumulativeShots.real + realShotsFromThisMatch,
        total: values.cumulativeShots.total + aekShotsFromThisMatch + realShotsFromThisMatch,
        lastMatchId: newMatch.id,
        lastUpdated: new Date().toISOString()
      }
    }, values);
    
    return updatedValues;
  } catch (error) {
    console.error('Error adding shots from new match:', error);
    return currentValues || loadCalculatorValues();
  }
};

/**
 * Global function to update alcohol calculator from vanilla JS
 * Exposed to window for compatibility with older parts of the app
 */
if (typeof window !== 'undefined') {
  window.updateAlcoholCalculatorFromMatch = (matchData) => {
    try {
      addShotsFromNewMatch(matchData);
    } catch (error) {
      console.warn('Failed to update alcohol calculator from match:', error);
    }
  };
}
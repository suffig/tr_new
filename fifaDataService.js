/**
 * FIFA Database Service
 * Provides integration with FIFA player statistics and ratings
 * Based on FIFA/SoFIFA data structure
 * Enhanced with real SoFIFA integration
 */

import SofifaIntegration from './src/utils/sofifaIntegration.js';

export class FIFADataService {
    
    /**
     * FIFA database - loaded from JSON file
     * Data structure based on https://sofifa.com player profiles
     */
    static fifaDatabase = {};

    /**
     * Load FIFA database from JSON file
     * @returns {Promise<boolean>} Success status
     */
    static async loadDatabase() {
        try {
            console.log('📥 Loading FIFA database from JSON...');
            
            // Try multiple paths for the JSON file
            const possiblePaths = [
                './sofifa_my_players_app.json',
                '/sofifa_my_players_app.json',
                'sofifa_my_players_app.json'
            ];
            
            let response = null;
            let loadedPath = null;
            
            for (const path of possiblePaths) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        loadedPath = path;
                        break;
                    }
                } catch (e) {
                    console.warn(`Failed to fetch from ${path}:`, e.message);
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`Failed to load JSON from any path. Last status: ${response?.status || 'No response'}`);
            }
            
            const playersArray = await response.json();
            console.log(`📊 Loaded ${playersArray.length} players from JSON at ${loadedPath}`);
            
            // Validate that we have an array
            if (!Array.isArray(playersArray)) {
                throw new Error('JSON file does not contain an array of players');
            }
            
            // Transform and populate the database
            this.fifaDatabase = {};
            let successfulTransforms = 0;
            
            for (const player of playersArray) {
                try {
                    const transformedPlayer = this.transformPlayerData(player);
                    this.fifaDatabase[player.name] = transformedPlayer;
                    successfulTransforms++;
                } catch (transformError) {
                    console.warn(`Failed to transform player data for ${player.name}:`, transformError.message);
                }
            }
            
            console.log(`✅ FIFA database loaded successfully with ${successfulTransforms}/${playersArray.length} players transformed`);
            console.log(`🎯 Sample player names:`, Object.keys(this.fifaDatabase).slice(0, 5));
            
            return true;
        } catch (error) {
            console.error('❌ Failed to load JSON database:', error.message);
            console.log('🔄 Loading fallback database...');
            this.loadFallbackDatabase();
            return false;
        }
    }

    /**
     * Transform player data from JSON format to internal format
     * @param {Object} jsonPlayer - Player data from JSON
     * @returns {Object} Transformed player data
     */
    static transformPlayerData(jsonPlayer) {
        // Calculate proper age from birth year (if it looks like a year)
        let age = jsonPlayer.age;
        if (age > 1900 && age < 2010) {
            age = new Date().getFullYear() - age;
        }
        
        // Parse positions from string to array
        const positions = jsonPlayer.positions ? 
            jsonPlayer.positions.split(',').map(p => p.trim()) : 
            ["Unknown"];

        // Flatten detailed skills into a single skills object
        const skills = this.flattenDetailedSkills(jsonPlayer.detailed_skills || {});

        return {
            overall: jsonPlayer.overall || 65,
            potential: jsonPlayer.potential || jsonPlayer.overall || 65,
            positions: positions,
            age: age,
            height: jsonPlayer.height_cm || 175,
            weight: jsonPlayer.weight_kg || 70,
            foot: jsonPlayer.preferred_foot || "Right",
            pace: jsonPlayer.main_attributes?.pace || 65,
            shooting: jsonPlayer.main_attributes?.shooting || 65,
            passing: jsonPlayer.main_attributes?.passing || 65,
            dribbling: jsonPlayer.main_attributes?.dribbling || 65,
            defending: jsonPlayer.main_attributes?.defending || 65,
            physical: jsonPlayer.main_attributes?.physical || 65,
            skills: skills,
            workrates: jsonPlayer.work_rate || "Medium/Medium",
            weakFoot: jsonPlayer.weak_foot || 3,
            skillMoves: jsonPlayer.skill_moves || 3,
            nationality: jsonPlayer.nationality || "Unknown",
            club: "Unknown", // Not provided in JSON
            value: "€1M", // Default value
            wage: "€5K", // Default wage
            contract: "2025", // Default contract
            sofifaId: parseInt(jsonPlayer.id) || null,
            sofifaUrl: jsonPlayer.id ? `https://sofifa.com/player/${jsonPlayer.id}/` : null
        };
    }

    /**
     * Flatten detailed skills from JSON structure to flat skills object
     * @param {Object} detailedSkills - Detailed skills from JSON
     * @returns {Object} Flat skills object
     */
    static flattenDetailedSkills(detailedSkills) {
        const skills = {};
        
        // Default skill values
        const defaultSkills = {
            crossing: 65, finishing: 65, headingAccuracy: 65, shortPassing: 65,
            volleys: 65, curve: 65, fkAccuracy: 65, longPassing: 65,
            ballControl: 65, acceleration: 65, sprintSpeed: 65, agility: 65,
            reactions: 65, balance: 65, shotPower: 65, jumping: 65,
            stamina: 65, strength: 65, longShots: 65, aggression: 65,
            interceptions: 65, positioning: 65, vision: 65, penalties: 65,
            composure: 65
        };

        // Start with defaults
        Object.assign(skills, defaultSkills);

        // Extract skills from detailed structure
        Object.values(detailedSkills).forEach(category => {
            if (typeof category === 'object') {
                Object.entries(category).forEach(([skillName, value]) => {
                    if (typeof value === 'number') {
                        // Map JSON skill names to our format
                        const mappedName = this.mapSkillName(skillName);
                        if (mappedName) {
                            skills[mappedName] = value;
                        }
                    }
                });
            }
        });

        return skills;
    }

    /**
     * Map skill names from JSON format to internal format
     * @param {string} jsonSkillName - Skill name from JSON
     * @returns {string|null} Mapped skill name or null
     */
    static mapSkillName(jsonSkillName) {
        const mapping = {
            // Direct mappings
            'crossing': 'crossing',
            'finishing': 'finishing',
            'volleys': 'volleys',
            'curve': 'curve',
            'vision': 'vision',
            'acceleration': 'acceleration',
            'agility': 'agility',
            'reactions': 'reactions',
            'balance': 'balance',
            'jumping': 'jumping',
            'stamina': 'stamina',
            'strength': 'strength',
            'aggression': 'aggression',
            'interceptions': 'interceptions',
            'positioning': 'positioning',
            'penalties': 'penalties',
            'composure': 'composure',
            
            // Name translations
            'short_passing': 'shortPassing',
            'long_passing': 'longPassing',
            'fk_accuracy': 'fkAccuracy',
            'ball_control': 'ballControl',
            'sprint_speed': 'sprintSpeed',
            'shot_power': 'shotPower',
            'long_shots': 'longShots',
            'defensive_awareness': 'interceptions', // Map to closest equivalent
            'dribbling': 'ballControl', // Map to ball control as closest equivalent
            'heading_accuracy': 'headingAccuracy'
        };

        return mapping[jsonSkillName] || null;
    }

    /**
     * Load fallback database with essential players if JSON loading fails
     */
    static loadFallbackDatabase() {
        this.fifaDatabase = {
            "Erling Haaland": {
                overall: 91, potential: 94, positions: ["ST", "CF"], age: 23,
                height: 195, weight: 88, foot: "Left", pace: 89, shooting: 91,
                passing: 65, dribbling: 80, defending: 45, physical: 88,
                skills: {
                    crossing: 55, finishing: 94, headingAccuracy: 85, shortPassing: 65,
                    volleys: 86, curve: 77, fkAccuracy: 84, longPassing: 65,
                    ballControl: 81, acceleration: 87, sprintSpeed: 90, agility: 77,
                    reactions: 93, balance: 70, shotPower: 94, jumping: 95,
                    stamina: 88, strength: 92, longShots: 85, aggression: 84,
                    interceptions: 30, positioning: 95, vision: 68, penalties: 85,
                    composure: 88
                },
                workrates: "High/Medium", weakFoot: 3, skillMoves: 3,
                nationality: "Norway", club: "Manchester City",
                value: "€180M", wage: "€375K", contract: "2027",
                sofifaId: 239085, sofifaUrl: "https://sofifa.com/player/239085/erling-haaland/250001/"
            }
        };
    }

    /**
     * Search for a player in the FIFA database with SoFIFA integration
     * @param {string} playerName - Name of the player to search for
     * @param {Object} options - Search options
     * @param {boolean} options.useLiveData - Whether to attempt SoFIFA fetch
     * @returns {Object|null} FIFA player data or null if not found
     */
    static async getPlayerData(playerName, options = { useLiveData: true }) {
        console.log(`🔍 Searching for player: "${playerName}"`);
        
        // Load database if not already loaded
        if (Object.keys(this.fifaDatabase).length === 0) {
            console.log('📚 Database empty, loading data...');
            const loadSuccess = await this.loadDatabase();
            console.log(`📚 Database load result: ${loadSuccess ? 'SUCCESS' : 'FALLBACK'}`);
            console.log(`📊 Database now contains ${Object.keys(this.fifaDatabase).length} players`);
        }
        
        // Validate input
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
            console.warn('⚠️ Invalid player name provided');
            return null;
        }

        const cleanPlayerName = playerName.trim();
        console.log(`🔍 Searching for exact match: "${cleanPlayerName}"`);
        console.log(`📊 Available players sample:`, Object.keys(this.fifaDatabase).slice(0, 10));
        
        // Try exact match first in mock database
        let mockData = null;
        if (this.fifaDatabase[cleanPlayerName]) {
            mockData = {
                ...this.fifaDatabase[cleanPlayerName],
                searchName: cleanPlayerName,
                found: true,
                source: 'json_database'
            };
            console.log(`✅ Found exact match in JSON database: ${cleanPlayerName}`);
        } else {
            console.log(`❌ No exact match found for: "${cleanPlayerName}"`);
            console.log(`🔍 Available names containing "${cleanPlayerName.toLowerCase()}":`, 
                Object.keys(this.fifaDatabase).filter(name => 
                    name.toLowerCase().includes(cleanPlayerName.toLowerCase())
                ).slice(0, 5)
            );
        }

        // Try fuzzy matching if no exact match
        if (!mockData) {
            console.log(`🔄 Attempting fuzzy match for: "${cleanPlayerName}"`);
            const fuzzyMatch = this.performFuzzyMatch(cleanPlayerName);
            if (fuzzyMatch) {
                mockData = {
                    ...fuzzyMatch.data,
                    searchName: cleanPlayerName,
                    suggestedName: fuzzyMatch.name,
                    found: true,
                    source: 'json_database_fuzzy'
                };
                console.log(`✅ Found fuzzy match: "${cleanPlayerName}" -> "${fuzzyMatch.name}"`);
            } else {
                console.log(`❌ No fuzzy match found for: "${cleanPlayerName}"`);
            }
        }

        // If we have mock data and should attempt live fetch
        if (mockData && options.useLiveData && mockData.sofifaUrl) {
            try {
                console.log('🌐 Attempting to fetch live data from SoFIFA...');
                const liveData = await SofifaIntegration.fetchPlayerData(mockData.sofifaUrl, mockData.sofifaId, cleanPlayerName);
                
                if (liveData) {
                    // Merge live data with mock data (live data takes precedence)
                    const enhancedData = {
                        ...mockData,
                        ...liveData,
                        searchName: cleanPlayerName,
                        found: true,
                        source: 'sofifa_enhanced',
                        lastUpdated: new Date().toISOString(),
                        mockDataAvailable: true
                    };
                    
                    console.log(`✅ Enhanced with live SoFIFA data for: ${cleanPlayerName}`);
                    return enhancedData;
                } else {
                    console.log('⚠️ Live data fetch failed, using mock data');
                    mockData.source = 'mock_fallback';
                    mockData.sofifaAttempted = true;
                    mockData.sofifaFetchTime = new Date().toISOString();
                }
            } catch (error) {
                console.error('❌ Error fetching live data:', error.message);
                if (mockData) {
                    mockData.source = 'mock_error_fallback';
                    mockData.fetchError = error.message;
                }
            }
        }

        // Return mock data if available
        if (mockData) {
            return mockData;
        }

        // No data found
        console.log(`❌ No data found for player: ${cleanPlayerName}`);
        return null;
    }

    /**
     * Perform fuzzy matching against the database
     * @param {string} playerName - Name to search for
     * @returns {Object|null} Match result or null
     */
    static performFuzzyMatch(playerName) {
        const searchTerms = playerName.toLowerCase().split(' ');
        
        for (const [dbName, data] of Object.entries(this.fifaDatabase)) {
            // Normalize the database name (remove accents, special characters)
            const dbNameNormalized = this.normalizeString(dbName.toLowerCase());
            const dbTerms = dbNameNormalized.split(' ');
            
            // Check if all search terms are found in database name
            const allTermsFound = searchTerms.every(term => {
                const normalizedTerm = this.normalizeString(term);
                return dbTerms.some(dbTerm => 
                    dbTerm.includes(normalizedTerm) || 
                    normalizedTerm.includes(dbTerm) ||
                    this.calculateSimilarity(normalizedTerm, dbTerm) > 0.7
                );
            });
            
            if (allTermsFound) {
                return { name: dbName, data };
            }
        }

        return null;
    }

    /**
     * Normalize string by removing accents and special characters
     * @param {string} str - String to normalize
     * @returns {string} Normalized string
     */
    static normalizeString(str) {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^\w\s]/g, '') // Remove special characters
            .toLowerCase();
    }

    /**
     * Calculate string similarity using simple algorithm
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string  
     * @returns {number} Edit distance
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Get all available players in the FIFA database
     * @returns {Array} List of player names available in the database
     */
    static async getAvailablePlayers() {
        // Load database if not already loaded
        if (Object.keys(this.fifaDatabase).length === 0) {
            await this.loadDatabase();
        }
        return Object.keys(this.fifaDatabase);
    }

    /**
     * Add a new player to the FIFA database (for testing/admin purposes)
     * @param {string} name - Player name
     * @param {Object} data - FIFA player data
     */
    static addPlayer(name, data) {
        this.fifaDatabase[name] = data;
    }

    /**
     * Check if a player exists in the FIFA database
     * @param {string} playerName - Player name to check
     * @returns {boolean} True if player exists
     */
    static async hasPlayer(playerName) {
        // Load database if not already loaded
        if (Object.keys(this.fifaDatabase).length === 0) {
            await this.loadDatabase();
        }
        return this.fifaDatabase.hasOwnProperty(playerName);
    }

    /**
     * Get player card color based on overall rating
     * @param {number} overall - Overall rating
     * @returns {string} CSS color class
     */
    static getPlayerCardColor(overall) {
        if (overall >= 90) return 'fifa-card-icon bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-purple-500/30'; // Icon/Legend
        if (overall >= 85) return 'fifa-card-gold bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 shadow-yellow-500/30'; // Gold
        if (overall >= 80) return 'fifa-card-silver bg-gradient-to-br from-gray-400 to-gray-500 text-gray-900 shadow-gray-500/30'; // Silver
        if (overall >= 75) return 'fifa-card-bronze bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900 shadow-orange-500/30'; // Bronze
        return 'fifa-card-common bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow-gray-600/30'; // Common
    }

    /**
     * Format overall rating with visual indicators
     * @param {number} overall - Overall rating
     * @returns {string} Formatted rating string
     */
    static formatOverallRating(overall) {
        let indicator = '';
        if (overall >= 90) indicator = '🌟'; // Icon
        else if (overall >= 85) indicator = '🥇'; // Gold
        else if (overall >= 80) indicator = '🥈'; // Silver
        else if (overall >= 75) indicator = '🥉'; // Bronze
        
        return `${overall} ${indicator}`;
    }

    /**
     * Get FIFA rating color for display
     * @param {number} rating - The rating value
     * @returns {string} Tailwind color class
     */
    static getRatingColor(rating) {
        if (rating >= 85) return 'text-green-400';
        if (rating >= 75) return 'text-yellow-400';
        if (rating >= 65) return 'text-orange-400';
        return 'text-red-400';
    }

    /**
     * Test SoFIFA connectivity
     * @returns {Promise<Object>} Test results
     */
    static async testSofifaConnectivity() {
        console.log('🧪 Testing SoFIFA connectivity...');
        
        const testPlayer = Object.entries(this.fifaDatabase)
            .find(([name, data]) => data.sofifaUrl);

        if (!testPlayer) {
            return {
                success: false,
                error: 'No players with SoFIFA URLs available for testing'
            };
        }

        const [playerName, playerData] = testPlayer;
        
        try {
            const startTime = Date.now();
            const result = await SofifaIntegration.fetchPlayerData(
                playerData.sofifaUrl, 
                playerData.sofifaId,
                playerData.name
            );
            const endTime = Date.now();

            return {
                success: !!result,
                testPlayer: playerName,
                responseTime: `${endTime - startTime}ms`,
                result: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                testPlayer: playerName,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default FIFADataService;
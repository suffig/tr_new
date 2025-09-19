/**
 * FIFA Database Service for React Application
 * Provides integration with FIFA player statistics and ratings
 * Based on FIFA/SoFIFA data structure
 * Enhanced with real SoFIFA integration
 */

import SofifaIntegration from './sofifaIntegration.js';
// Import database access functions - using relative path from src/utils to root
import { getAllPlayers } from '../../data.js';

export class FIFADataService {
    
    /**
     * Mock FIFA database - in production this would connect to SoFIFA API or similar
     * Data structure based on https://sofifa.com player profiles
     */
    static fifaDatabase = {
        // Real Madrid players
        "Erling Haaland": {
            overall: 91,
            potential: 94,
            positions: ["ST", "CF"],
            age: 23,
            height: 195,
            weight: 88,
            foot: "Left",
            pace: 89,
            shooting: 91,
            passing: 65,
            dribbling: 80,
            defending: 45,
            physical: 88,
            skills: {
                crossing: 55,
                finishing: 94,
                headingAccuracy: 85,
                shortPassing: 65,
                volleys: 86,
                curve: 77,
                fkAccuracy: 84,
                longPassing: 65,
                ballControl: 81,
                acceleration: 87,
                sprintSpeed: 90,
                agility: 77,
                reactions: 93,
                balance: 70,
                shotPower: 94,
                jumping: 95,
                stamina: 88,
                strength: 92,
                longShots: 85,
                aggression: 84,
                interceptions: 30,
                positioning: 95,
                vision: 68,
                penalties: 85,
                composure: 88
            },
            workrates: "High/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Norway",
            club: "Manchester City",
            value: "€180M",
            wage: "€375K",
            contract: "2027",
            sofifaId: 239085,
            sofifaUrl: "https://sofifa.com/player/239085/erling-haaland/250001/"
        },
        
        "Kylian Mbappé": {
            overall: 91,
            potential: 95,
            positions: ["LW", "ST", "RW"],
            age: 25,
            height: 178,
            weight: 73,
            foot: "Right",
            pace: 97,
            shooting: 89,
            passing: 80,
            dribbling: 92,
            defending: 39,
            physical: 77,
            skills: {
                crossing: 80,
                finishing: 89,
                headingAccuracy: 78,
                shortPassing: 83,
                volleys: 87,
                curve: 80,
                fkAccuracy: 79,
                longPassing: 75,
                ballControl: 92,
                acceleration: 97,
                sprintSpeed: 97,
                agility: 92,
                reactions: 92,
                balance: 84,
                shotPower: 88,
                jumping: 78,
                stamina: 88,
                strength: 76,
                longShots: 86,
                aggression: 78,
                interceptions: 41,
                positioning: 90,
                vision: 80,
                penalties: 80,
                composure: 85
            },
            workrates: "High/Low",
            weakFoot: 4,
            skillMoves: 5,
            nationality: "France",
            club: "Real Madrid",
            value: "€180M",
            wage: "€1.2M",
            contract: "2029",
            sofifaId: 231747,
            sofifaUrl: "https://sofifa.com/player/231747/kylian-mbappe/250001/"
        },

        "Jude Bellingham": {
            overall: 90,
            potential: 94,
            positions: ["CM", "CAM", "CDM"],
            age: 20,
            height: 186,
            weight: 75,
            foot: "Right",
            pace: 75,
            shooting: 83,
            passing: 88,
            dribbling: 86,
            defending: 78,
            physical: 82,
            skills: {
                crossing: 84,
                finishing: 82,
                headingAccuracy: 85,
                shortPassing: 90,
                volleys: 80,
                curve: 85,
                fkAccuracy: 81,
                longPassing: 86,
                ballControl: 87,
                acceleration: 78,
                sprintSpeed: 72,
                agility: 84,
                reactions: 89,
                balance: 86,
                shotPower: 85,
                jumping: 84,
                stamina: 88,
                strength: 79,
                longShots: 84,
                aggression: 80,
                interceptions: 76,
                positioning: 88,
                vision: 89,
                penalties: 78,
                composure: 84
            },
            workrates: "High/High",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "England",
            club: "Real Madrid",
            value: "€150M",
            wage: "€350K",
            contract: "2029",
            sofifaId: 252371,
            sofifaUrl: "https://sofifa.com/player/252371/jude-bellingham/250001/"
        },

        "Vinicius Jr.": {
            overall: 89,
            potential: 93,
            positions: ["LW", "LM"],
            age: 23,
            height: 176,
            weight: 73,
            foot: "Right",
            pace: 95,
            shooting: 83,
            passing: 78,
            dribbling: 92,
            defending: 29,
            physical: 68,
            skills: {
                crossing: 81,
                finishing: 83,
                headingAccuracy: 62,
                shortPassing: 80,
                volleys: 78,
                curve: 81,
                fkAccuracy: 76,
                longPassing: 76,
                ballControl: 93,
                acceleration: 97,
                sprintSpeed: 93,
                agility: 94,
                reactions: 90,
                balance: 82,
                shotPower: 82,
                jumping: 69,
                stamina: 83,
                strength: 53,
                longShots: 79,
                aggression: 56,
                interceptions: 25,
                positioning: 85,
                vision: 79,
                penalties: 75,
                composure: 78
            },
            workrates: "High/Low",
            weakFoot: 2,
            skillMoves: 5,
            nationality: "Brazil",
            club: "Real Madrid",
            value: "€120M",
            wage: "€200K",
            contract: "2027",
            sofifaId: 238794,
            sofifaUrl: "https://sofifa.com/player/238794/vinicius-junior/250001/"
        },

        // AEK Athens players (using more modest ratings)
        "Sergio Araújo": {
            overall: 72,
            potential: 75,
            positions: ["ST", "CF"],
            age: 32,
            height: 180,
            weight: 75,
            foot: "Left",
            pace: 68,
            shooting: 75,
            passing: 62,
            dribbling: 71,
            defending: 30,
            physical: 73,
            skills: {
                crossing: 55,
                finishing: 78,
                headingAccuracy: 72,
                shortPassing: 65,
                volleys: 74,
                curve: 68,
                fkAccuracy: 70,
                longPassing: 58,
                ballControl: 73,
                acceleration: 70,
                sprintSpeed: 66,
                agility: 72,
                reactions: 76,
                balance: 70,
                shotPower: 76,
                jumping: 71,
                stamina: 72,
                strength: 74,
                longShots: 72,
                aggression: 65,
                interceptions: 25,
                positioning: 77,
                vision: 60,
                penalties: 75,
                composure: 74
            },
            workrates: "Medium/Low",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Argentina",
            club: "AEK Athens",
            value: "€2.8M",
            wage: "€15K",
            contract: "2025",
            sofifaId: 199455,
            sofifaUrl: "https://sofifa.com/player/199455/sergio-araujo/250001/"
        },

        "Nordin Amrabat": {
            overall: 70,
            potential: 70,
            positions: ["RW", "RM", "RWB"],
            age: 37,
            height: 173,
            weight: 65,
            foot: "Right",
            pace: 76,
            shooting: 65,
            passing: 73,
            dribbling: 76,
            defending: 61,
            physical: 65,
            skills: {
                crossing: 78,
                finishing: 62,
                headingAccuracy: 55,
                shortPassing: 74,
                volleys: 68,
                curve: 71,
                fkAccuracy: 75,
                longPassing: 72,
                ballControl: 78,
                acceleration: 78,
                sprintSpeed: 74,
                agility: 80,
                reactions: 72,
                balance: 74,
                shotPower: 68,
                jumping: 58,
                stamina: 76,
                strength: 52,
                longShots: 70,
                aggression: 68,
                interceptions: 65,
                positioning: 68,
                vision: 75,
                penalties: 65,
                composure: 74
            },
            workrates: "High/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Morocco",
            club: "AEK Athens",
            value: "€800K",
            wage: "€8K",
            contract: "2024",
            sofifaId: 199014,
            sofifaUrl: "https://sofifa.com/player/199014/nordin-amrabat/250001/"
        },

        "Levi García": {
            overall: 73,
            potential: 76,
            positions: ["LW", "RW", "ST"],
            age: 26,
            height: 175,
            weight: 70,
            foot: "Left",
            pace: 82,
            shooting: 71,
            passing: 68,
            dribbling: 77,
            defending: 35,
            physical: 72,
            skills: {
                crossing: 70,
                finishing: 73,
                headingAccuracy: 65,
                shortPassing: 70,
                volleys: 68,
                curve: 72,
                fkAccuracy: 67,
                longPassing: 66,
                ballControl: 78,
                acceleration: 84,
                sprintSpeed: 80,
                agility: 81,
                reactions: 75,
                balance: 78,
                shotPower: 74,
                jumping: 68,
                stamina: 76,
                strength: 67,
                longShots: 69,
                aggression: 64,
                interceptions: 30,
                positioning: 74,
                vision: 67,
                penalties: 68,
                composure: 72
            },
            workrates: "High/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "Trinidad and Tobago",
            club: "AEK Athens",
            value: "€4.5M",
            wage: "€12K",
            contract: "2025",
            sofifaId: 236772,
            sofifaUrl: "https://sofifa.com/player/236772/levi-garcia/250001/"
        }
    };

    /**
     * Search for a player in the FIFA database with SoFIFA integration
     * @param {string} playerName - Name of the player to search for
     * @param {Object} options - Search options
     * @param {boolean} options.useLiveData - Whether to attempt SoFIFA fetch
     * @param {boolean} options.fallbackToMock - Whether to fallback to mock data
     * @returns {Object|null} FIFA player data or null if not found
     */
    static async getPlayerData(playerName, options = { useLiveData: true, fallbackToMock: true }) {
        console.log(`🔍 Searching for player: ${playerName}`);
        
        // Validate input
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
            console.warn('⚠️ Invalid player name provided');
            return this.generateDefaultPlayerData('Unknown Player');
        }

        const cleanPlayerName = playerName.trim();
        
        // Try exact match first in mock database
        let mockData = null;
        if (this.fifaDatabase[cleanPlayerName]) {
            mockData = {
                ...this.fifaDatabase[cleanPlayerName],
                searchName: cleanPlayerName,
                found: true,
                source: 'mock_database'
            };
            console.log(`✅ Found exact match in database: ${cleanPlayerName}`);
        }

        // Try fuzzy matching if no exact match
        if (!mockData) {
            const fuzzyMatch = this.performFuzzyMatch(cleanPlayerName);
            if (fuzzyMatch) {
                mockData = {
                    ...fuzzyMatch.data,
                    searchName: cleanPlayerName,
                    suggestedName: fuzzyMatch.name,
                    found: true,
                    source: 'mock_database_fuzzy'
                };
                console.log(`✅ Found fuzzy match: ${cleanPlayerName} -> ${fuzzyMatch.name}`);
            }
        }

        // If we have mock data and should attempt live fetch
        if (mockData && options.useLiveData && mockData.sofifaUrl) {
            try {
                console.log('🌐 Attempting to fetch live data from SoFIFA...');
                const liveData = await SofifaIntegration.fetchPlayerData(mockData.sofifaUrl, mockData.sofifaId);
                
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

        // If no mock data found and fallback is enabled, generate default
        if (options.fallbackToMock) {
            console.log(`🔄 Generating default data for unknown player: ${cleanPlayerName}`);
            return this.generateDefaultPlayerData(cleanPlayerName);
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
     * Generate default FIFA-style data for unknown players
     * @param {string} playerName - Name of the player
     * @returns {Object} Default FIFA player data structure
     */
    static generateDefaultPlayerData(playerName) {
        // Generate realistic but modest ratings for unknown players
        const baseRating = 65 + Math.floor(Math.random() * 15); // 65-79 overall
        
        return {
            overall: baseRating,
            potential: Math.min(baseRating + Math.floor(Math.random() * 8), 85),
            positions: ["Unknown"],
            age: 25,
            height: 175 + Math.floor(Math.random() * 15),
            weight: 70 + Math.floor(Math.random() * 15),
            foot: Math.random() > 0.5 ? "Right" : "Left",
            pace: this.generateAttribute(baseRating),
            shooting: this.generateAttribute(baseRating),
            passing: this.generateAttribute(baseRating),
            dribbling: this.generateAttribute(baseRating),
            defending: this.generateAttribute(baseRating),
            physical: this.generateAttribute(baseRating),
            skills: this.generateDetailedSkills(baseRating),
            workrates: "Medium/Medium",
            weakFoot: 2 + Math.floor(Math.random() * 3),
            skillMoves: 2 + Math.floor(Math.random() * 3),
            nationality: "Unknown",
            club: "Unknown",
            value: "€" + (Math.random() * 5 + 0.5).toFixed(1) + "M",
            wage: "€" + Math.floor(Math.random() * 20 + 5) + "K",
            contract: "2025",
            sofifaId: null,
            sofifaUrl: null,
            searchName: playerName,
            found: false,
            generated: true
        };
    }

    /**
     * Generate a realistic attribute value based on overall rating
     * @param {number} overall - Overall player rating
     * @returns {number} Attribute value
     */
    static generateAttribute(overall) {
        const variance = 15; // Attributes can vary +/- 15 from overall
        const min = Math.max(35, overall - variance);
        const max = Math.min(90, overall + variance);
        return min + Math.floor(Math.random() * (max - min));
    }

    /**
     * Generate detailed skills object
     * @param {number} baseRating - Base rating to derive skills from
     * @returns {Object} Detailed skills object
     */
    static generateDetailedSkills(baseRating) {
        const skills = {};
        const skillNames = [
            'crossing', 'finishing', 'headingAccuracy', 'shortPassing', 'volleys',
            'curve', 'fkAccuracy', 'longPassing', 'ballControl', 'acceleration',
            'sprintSpeed', 'agility', 'reactions', 'balance', 'shotPower',
            'jumping', 'stamina', 'strength', 'longShots', 'aggression',
            'interceptions', 'positioning', 'vision', 'penalties', 'composure'
        ];

        skillNames.forEach(skill => {
            skills[skill] = this.generateAttribute(baseRating);
        });

        return skills;
    }

    /**
     * Get all available players in the FIFA database
     * @returns {Array} List of player names available in the database
     */
    static getAvailablePlayers() {
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
    static hasPlayer(playerName) {
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
     * Batch fetch multiple players with SoFIFA integration
     * @param {Array<string>} playerNames - Array of player names
     * @param {Object} options - Fetch options
     * @returns {Promise<Array<Object>>} Array of player data
     */
    static async batchGetPlayerData(playerNames, options = {}) {
        console.log(`📦 Batch fetching ${playerNames.length} players...`);
        
        const results = [];
        const batchSize = options.batchSize || 3; // Limit concurrent requests
        
        for (let i = 0; i < playerNames.length; i += batchSize) {
            const batch = playerNames.slice(i, i + batchSize);
            const batchPromises = batch.map(name => 
                this.getPlayerData(name, options).catch(error => ({
                    searchName: name,
                    error: error.message,
                    found: false
                }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to be respectful
            if (i + batchSize < playerNames.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`✅ Batch fetch complete: ${results.length} players processed`);
        return results;
    }

    /**
     * Search for players by club
     * @param {string} clubName - Name of the club
     * @param {boolean} useLiveData - Whether to fetch live data
     * @returns {Promise<Array<Object>>} Array of players from the club
     */
    static async getPlayersByClub(clubName, useLiveData = false) {
        console.log(`🏟️ Searching for players from club: ${clubName}`);
        
        const clubPlayers = Object.entries(this.fifaDatabase)
            .filter(([name, data]) => 
                data.club && data.club.toLowerCase().includes(clubName.toLowerCase())
            )
            .map(([name, data]) => ({ name, ...data }));

        if (useLiveData) {
            const playerNames = clubPlayers.map(p => p.name);
            return await this.batchGetPlayerData(playerNames, { useLiveData: true });
        }

        return clubPlayers.map(player => ({
            ...player,
            searchName: player.name,
            found: true,
            source: 'mock_database'
        }));
    }

    /**
     * Get SoFIFA integration statistics
     * @returns {Object} Integration stats
     */
    static getSofifaStats() {
        const cacheStats = SofifaIntegration.getCacheStats();
        const totalPlayers = Object.keys(this.fifaDatabase).length;
        const playersWithSofifaUrls = Object.values(this.fifaDatabase)
            .filter(player => player.sofifaUrl).length;

        return {
            cache: cacheStats,
            database: {
                totalPlayers,
                playersWithSofifaUrls,
                sofifaUrlCoverage: `${((playersWithSofifaUrls / totalPlayers) * 100).toFixed(1)}%`
            },
            integration: {
                status: 'active',
                lastCheck: new Date().toISOString()
            }
        };
    }

    /**
     * Validate SoFIFA URLs in the database
     * @returns {Object} Validation results
     */
    static validateSofifaUrls() {
        console.log('🔍 Validating SoFIFA URLs in database...');
        
        const results = {
            valid: [],
            invalid: [],
            missing: []
        };

        Object.entries(this.fifaDatabase).forEach(([name, data]) => {
            if (!data.sofifaUrl) {
                results.missing.push(name);
            } else if (this.isValidSofifaUrl(data.sofifaUrl)) {
                results.valid.push({ name, url: data.sofifaUrl, id: data.sofifaId });
            } else {
                results.invalid.push({ name, url: data.sofifaUrl });
            }
        });

        console.log(`✅ URL validation complete: ${results.valid.length} valid, ${results.invalid.length} invalid, ${results.missing.length} missing`);
        return results;
    }

    /**
     * Validate a SoFIFA URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static isValidSofifaUrl(url) {
        if (typeof url !== 'string') return false;
        
        const sofifaPattern = /^https:\/\/sofifa\.com\/player\/\d+\/[^\/]+\/\d+\/?$/;
        return sofifaPattern.test(url);
    }

    /**
     * Clear all caches
     */
    static clearAllCaches() {
        SofifaIntegration.clearCache();
        console.log('🗑️ All FIFA service caches cleared');
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
                playerData.sofifaId
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

    /**
     * Get all database players with enhanced FIFA data
     * @param {Object} options - Enhancement options
     * @returns {Promise<Array<Object>>} Array of enhanced player data
     */
    static async getAllDatabasePlayersWithFIFA(options = { useLiveData: false }) {
        console.log('📋 Loading all database players with FIFA enhancement...');
        
        try {
            const databasePlayers = await getAllPlayers();
            console.log(`📊 Found ${databasePlayers.length} players in database`);
            
            if (databasePlayers.length === 0) {
                return [];
            }

            const enhancedPlayers = [];
            const batchSize = options.batchSize || 5;
            
            // Process players in batches to avoid overwhelming SoFIFA
            for (let i = 0; i < databasePlayers.length; i += batchSize) {
                const batch = databasePlayers.slice(i, i + batchSize);
                const batchPromises = batch.map(async (dbPlayer) => {
                    try {
                        // Try to get FIFA data for this player
                        const fifaData = await this.getPlayerData(dbPlayer.name, {
                            useLiveData: options.useLiveData,
                            fallbackToMock: true
                        });

                        // Merge database player data with FIFA data
                        return {
                            ...dbPlayer,
                            fifaData: fifaData,
                            enhanced: true,
                            source: fifaData?.source || 'database_only'
                        };
                    } catch (error) {
                        console.warn(`❌ Failed to enhance player ${dbPlayer.name}:`, error.message);
                        return {
                            ...dbPlayer,
                            fifaData: this.generateDefaultPlayerData(dbPlayer.name),
                            enhanced: false,
                            error: error.message
                        };
                    }
                });
                
                const batchResults = await Promise.all(batchPromises);
                enhancedPlayers.push(...batchResults);
                
                // Small delay between batches
                if (i + batchSize < databasePlayers.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            console.log(`✅ Enhanced ${enhancedPlayers.length} database players with FIFA data`);
            return enhancedPlayers;
            
        } catch (error) {
            console.error('❌ Error loading database players:', error.message);
            return [];
        }
    }

    /**
     * Search SoFIFA for a player by name (without pre-existing URL)
     * @param {string} playerName - Name of the player to search for
     * @returns {Promise<Object|null>} Player data or null if not found
     */
    static async searchSofifaByName(playerName) {
        console.log(`🔍 Searching SoFIFA for player: ${playerName}`);
        
        try {
            // Use SoFIFA search functionality
            const searchResult = await SofifaIntegration.searchPlayerByName(playerName);
            
            if (searchResult) {
                console.log(`✅ Found player on SoFIFA: ${searchResult.name || playerName}`);
                return {
                    ...searchResult,
                    searchName: playerName,
                    found: true,
                    source: 'sofifa_search'
                };
            } else {
                console.log(`❌ Player not found on SoFIFA: ${playerName}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error searching SoFIFA for ${playerName}:`, error.message);
            return null;
        }
    }

    /**
     * Enhance a single database player with FIFA/SoFIFA data
     * @param {Object} databasePlayer - Player from database
     * @param {Object} options - Enhancement options
     * @returns {Promise<Object>} Enhanced player data
     */
    static async enhanceDatabasePlayer(databasePlayer, options = { useLiveData: false }) {
        console.log(`🔧 Enhancing player: ${databasePlayer.name}`);
        
        try {
            // First try to get FIFA data using existing method
            let fifaData = await this.getPlayerData(databasePlayer.name, {
                useLiveData: options.useLiveData,
                fallbackToMock: false // Don't fallback immediately
            });

            // If no FIFA data found and we should search SoFIFA
            if (!fifaData && options.useLiveData) {
                fifaData = await this.searchSofifaByName(databasePlayer.name);
            }

            // If still no data, generate default
            if (!fifaData) {
                fifaData = this.generateDefaultPlayerData(databasePlayer.name);
                fifaData.source = 'generated_default';
            }

            return {
                ...databasePlayer,
                fifaData: fifaData,
                enhanced: true,
                enhancedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Error enhancing player ${databasePlayer.name}:`, error.message);
            return {
                ...databasePlayer,
                fifaData: this.generateDefaultPlayerData(databasePlayer.name),
                enhanced: false,
                error: error.message
            };
        }
    }

    /**
     * Get FIFA data for all stored players (main method for the requirement)
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Results with enhanced players and statistics
     */
    static async processAllStoredPlayers(options = {}) {
        const defaultOptions = {
            useLiveData: true,
            batchSize: 3,
            includeStatistics: true
        };
        const finalOptions = { ...defaultOptions, ...options };
        
        console.log('🚀 Processing all stored players with SoFIFA integration...');
        const startTime = Date.now();
        
        try {
            const enhancedPlayers = await this.getAllDatabasePlayersWithFIFA(finalOptions);
            
            const results = {
                players: enhancedPlayers,
                totalCount: enhancedPlayers.length,
                processedAt: new Date().toISOString(),
                processingTime: `${Date.now() - startTime}ms`,
                options: finalOptions
            };

            if (finalOptions.includeStatistics) {
                const stats = this.generateProcessingStatistics(enhancedPlayers);
                results.statistics = stats;
            }
            
            console.log(`✅ Completed processing ${enhancedPlayers.length} players in ${results.processingTime}`);
            return results;
            
        } catch (error) {
            console.error('❌ Error processing stored players:', error.message);
            return {
                players: [],
                totalCount: 0,
                error: error.message,
                processedAt: new Date().toISOString(),
                processingTime: `${Date.now() - startTime}ms`
            };
        }
    }

    /**
     * Generate statistics for processed players
     * @param {Array<Object>} enhancedPlayers - Array of enhanced player data
     * @returns {Object} Processing statistics
     */
    static generateProcessingStatistics(enhancedPlayers) {
        const stats = {
            total: enhancedPlayers.length,
            enhanced: 0,
            withMockData: 0,
            withLiveData: 0,
            withGeneratedData: 0,
            failed: 0,
            sourceBreakdown: {}
        };

        enhancedPlayers.forEach(player => {
            if (player.enhanced) {
                stats.enhanced++;
            } else {
                stats.failed++;
            }

            const source = player.fifaData?.source || 'unknown';
            stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + 1;

            if (source.includes('mock')) {
                stats.withMockData++;
            } else if (source.includes('sofifa')) {
                stats.withLiveData++;
            } else if (source.includes('generated')) {
                stats.withGeneratedData++;
            }
        });

        stats.successRate = stats.total > 0 ? ((stats.enhanced / stats.total) * 100).toFixed(1) + '%' : '0%';
        
        return stats;
    }
}

export default FIFADataService;
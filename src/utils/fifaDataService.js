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
        "Virgil van Dijk": {
            overall: 90,
            potential: 90,
            positions: ["CB"],
            age: 32,
            height: 193,
            weight: 92,
            foot: "Right",
            pace: 77,  // Corrected from 92 - realistic for CB
            shooting: 60, // Corrected from 91 - CB don't have high shooting
            passing: 91,  // Corrected from 97 - good but not 97
            dribbling: 72, // Corrected from 96 - too high for CB
            defending: 95, // High defending for top CB
            physical: 86,  // Corrected from 97
            skills: {
                crossing: 76,
                finishing: 60,
                headingAccuracy: 88,
                shortPassing: 84,
                volleys: 80,
                curve: 80,
                fkAccuracy: 79,
                longPassing: 81,
                ballControl: 79,
                acceleration: 73,
                sprintSpeed: 73,
                agility: 83,
                reactions: 82,
                balance: 76,
                shotPower: 71,
                jumping: 76,
                stamina: 84,
                strength: 78,
                longShots: 74,
                aggression: 74,
                interceptions: 93,
                positioning: 79,
                vision: 70,
                penalties: 77,
                composure: 81,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 3,
            nationality: "Netherlands",
            club: "Liverpool",
            value: "€104.1M",
            wage: "€455K",
            contract: "2025",
            sofifaId: 203376,
            sofifaUrl: "https://sofifa.com/player/203376/virgil-van-dijk/250001/"
        },

        "Karim Benzema": {
            overall: 91,
            potential: 91,
            positions: ["ST"],
            age: 36,
            height: 185,
            weight: 81,
            foot: "Right",
            pace: 77,     // Reduced due to age
            shooting: 90, // Corrected from 97
            passing: 83,  // Corrected from 94 
            dribbling: 88, // Corrected from 87
            defending: 39, // Corrected from 90 - striker
            physical: 78,  // Corrected from 92
            skills: {
                crossing: 71,
                finishing: 92,
                headingAccuracy: 76,
                shortPassing: 81,
                volleys: 75,
                curve: 71,
                fkAccuracy: 76,
                longPassing: 76,
                ballControl: 79,
                acceleration: 74,
                sprintSpeed: 77,
                agility: 73,
                reactions: 73,
                balance: 83,
                shotPower: 85,
                jumping: 78,
                stamina: 71,
                strength: 83,
                longShots: 79,
                aggression: 73,
                interceptions: 72,
                positioning: 82,
                vision: 83,
                penalties: 84,
                composure: 72,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "France",
            club: "Al Ittihad",
            value: "€56.3M",
            wage: "€73K",
            contract: "2025",
            sofifaId: 165153,
            sofifaUrl: "https://sofifa.com/player/165153/karim-benzema/250001/"
        },

        "Iago Aspas": {
            overall: 84,
            potential: 84,
            positions: ["ST","CF"],
            age: 36,
            height: 177,
            weight: 76,
            foot: "Right",
            pace: 83,
            shooting: 95,
            passing: 77,
            dribbling: 89,
            defending: 76,
            physical: 83,
            skills: {
                crossing: 71,
                finishing: 82,
                headingAccuracy: 68,
                shortPassing: 77,
                volleys: 78,
                curve: 65,
                fkAccuracy: 71,
                longPassing: 73,
                ballControl: 69,
                acceleration: 66,
                sprintSpeed: 71,
                agility: 75,
                reactions: 65,
                balance: 75,
                shotPower: 65,
                jumping: 66,
                stamina: 69,
                strength: 75,
                longShots: 74,
                aggression: 70,
                interceptions: 66,
                positioning: 86,
                vision: 64,
                penalties: 68,
                composure: 69,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Spain",
            club: "Celta Vigo",
            value: "€84.7M",
            wage: "€426K",
            contract: "2025",
            sofifaId: 192629,
            sofifaUrl: "https://sofifa.com/player/192629/250001/"
        },

        "Kylian Mbappé": {
            overall: 91,
            potential: 95,
            positions: ["LW","ST","RW"],
            age: 25,
            height: 178,
            weight: 73,
            foot: "Right",
            pace: 97,  // High pace makes sense for Mbappé 
            shooting: 89,  // Corrected from 95
            passing: 80,   // Corrected from 95 - way too high before
            dribbling: 92, // Corrected from 83 - this should be higher
            defending: 36, // Corrected from 83 - wingers don't defend much
            physical: 77,  // Corrected from 86
            skills: {
                crossing: 80,
                finishing: 98,
                headingAccuracy: 72,
                shortPassing: 83,
                volleys: 72,
                curve: 79,
                fkAccuracy: 77,
                longPassing: 71,
                ballControl: 85,
                acceleration: 76,
                sprintSpeed: 76,
                agility: 74,
                reactions: 84,
                balance: 79,
                shotPower: 74,
                jumping: 79,
                stamina: 72,
                strength: 77,
                longShots: 71,
                aggression: 80,
                interceptions: 81,
                positioning: 95,
                vision: 76,
                penalties: 78,
                composure: 73,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "France",
            club: "Real Madrid",
            value: "€32.0M",
            wage: "€133K",
            contract: "2025",
            sofifaId: 231747,
            sofifaUrl: "https://sofifa.com/player/231747/kylian-mbappe/250001/"
        },

        "Erling Haaland": {
            overall: 91,
            potential: 94,
            positions: ["ST","CF"],
            age: 23,
            height: 194,
            weight: 88,
            foot: "Left",
            pace: 89,     // High pace for striker
            shooting: 94, // Corrected from 99 - very high but not max
            passing: 65,  // Corrected from 89 - strikers don't need high passing
            dribbling: 80, // Corrected from 85 
            defending: 45, // Corrected from 98 - strikers don't defend
            physical: 88,  // Corrected from 87 - good for big striker
            skills: {
                crossing: 73,
                finishing: 94,
                headingAccuracy: 77,
                shortPassing: 80,
                volleys: 75,
                curve: 80,
                fkAccuracy: 77,
                longPassing: 80,
                ballControl: 81,
                acceleration: 80,
                sprintSpeed: 74,
                agility: 76,
                reactions: 82,
                balance: 71,
                shotPower: 85,
                jumping: 78,
                stamina: 80,
                strength: 82,
                longShots: 83,
                aggression: 72,
                interceptions: 77,
                positioning: 91,
                vision: 77,
                penalties: 78,
                composure: 71,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Norway",
            club: "Manchester City",
            value: "€44.4M",
            wage: "€173K",
            contract: "2025",
            sofifaId: 239085,
            sofifaUrl: "https://sofifa.com/player/239085/erling-haaland/250001/"
        },

        "Viktor Gyökeres": {
            overall: 84,
            potential: 86,
            positions: ["ST"],
            age: 26,
            height: 192,
            weight: 88,
            foot: "Left",
            pace: 86,
            shooting: 93,
            passing: 86,
            dribbling: 79,
            defending: 79,
            physical: 79,
            skills: {
                crossing: 64,
                finishing: 90,
                headingAccuracy: 64,
                shortPassing: 65,
                volleys: 64,
                curve: 75,
                fkAccuracy: 69,
                longPassing: 76,
                ballControl: 74,
                acceleration: 69,
                sprintSpeed: 68,
                agility: 67,
                reactions: 77,
                balance: 71,
                shotPower: 64,
                jumping: 70,
                stamina: 78,
                strength: 78,
                longShots: 75,
                aggression: 64,
                interceptions: 71,
                positioning: 84,
                vision: 69,
                penalties: 74,
                composure: 71,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Sweden",
            club: "Sporting CP",
            value: "€51.1M",
            wage: "€187K",
            contract: "2025",
            sofifaId: 234558,
            sofifaUrl: "https://sofifa.com/player/234558/?r=250001"
        },

        "Kevin De Bruyne": {
            overall: 91,
            potential: 91,
            positions: ["CAM","CM"],
            age: 33,
            height: 181,
            weight: 70,
            foot: "Right",
            pace: 66,    // Corrected from 96 to real EA value
            shooting: 86, // Corrected from 92
            passing: 93,  // Corrected from 96
            dribbling: 88, // Corrected from 93
            defending: 64, // Corrected from 84
            physical: 78,  // Corrected from 98
            skills: {
                crossing: 75,
                finishing: 71,
                headingAccuracy: 73,
                shortPassing: 71,
                volleys: 75,
                curve: 78,
                fkAccuracy: 73,
                longPassing: 73,
                ballControl: 85,
                acceleration: 79,
                sprintSpeed: 73,
                agility: 84,
                reactions: 77,
                balance: 85,
                shotPower: 73,
                jumping: 76,
                stamina: 73,
                strength: 80,
                longShots: 77,
                aggression: 72,
                interceptions: 72,
                positioning: 81,
                vision: 76,
                penalties: 77,
                composure: 85,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Belgium",
            club: "Manchester City",
            value: "€64.9M",
            wage: "€471K",
            contract: "2025",
            sofifaId: 192985,
            sofifaUrl: "https://sofifa.com/player/192985/kevin-de-bruyne/250001/"
        },

        "Lionel Messi": {
            overall: 90,
            potential: 90,
            positions: ["RW","CAM"],
            age: 37,
            height: 170,
            weight: 72,
            foot: "Left",
            pace: 81,     // Reduced due to age
            shooting: 89, // Corrected from 83 - should be higher
            passing: 91,  // Corrected from 99 - very high but not max
            dribbling: 94, // Corrected from 99 - very high but not max
            defending: 34, // Corrected from 92 - attacking player
            physical: 65,  // Corrected from 86 - not very physical
            skills: {
                crossing: 84,
                finishing: 84,
                headingAccuracy: 77,
                shortPassing: 78,
                volleys: 83,
                curve: 80,
                fkAccuracy: 81,
                longPassing: 76,
                ballControl: 79,
                acceleration: 77,
                sprintSpeed: 73,
                agility: 76,
                reactions: 70,
                balance: 80,
                shotPower: 79,
                jumping: 84,
                stamina: 83,
                strength: 84,
                longShots: 79,
                aggression: 78,
                interceptions: 75,
                positioning: 78,
                vision: 70,
                penalties: 79,
                composure: 81,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "Argentina",
            club: "Inter Miami",
            value: "€51.3M",
            wage: "€249K",
            contract: "2025",
            sofifaId: 158023,
            sofifaUrl: "https://sofifa.com/player/158023/lionel-messi/250001/"
        },

        "Frank Acheampong": {
            overall: 73,
            potential: 73,
            positions: ["RW","RM"],
            age: 30,
            height: 191,
            weight: 67,
            foot: "Right",
            pace: 72,
            shooting: 75,
            passing: 69,
            dribbling: 78,
            defending: 77,
            physical: 78,
            skills: {
                crossing: 55,
                finishing: 63,
                headingAccuracy: 57,
                shortPassing: 63,
                volleys: 64,
                curve: 57,
                fkAccuracy: 55,
                longPassing: 65,
                ballControl: 61,
                acceleration: 63,
                sprintSpeed: 53,
                agility: 57,
                reactions: 61,
                balance: 67,
                shotPower: 60,
                jumping: 64,
                stamina: 55,
                strength: 62,
                longShots: 62,
                aggression: 53,
                interceptions: 58,
                positioning: 63,
                vision: 67,
                penalties: 58,
                composure: 65,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 2,
            nationality: "Ghana",
            club: "AEK Athens",
            value: "€42.6M",
            wage: "€293K",
            contract: "2025",
            sofifaId: 208450,
            sofifaUrl: "https://sofifa.com/player/208450/?r=250001"
        },

        "Nestory Irankunda": {
            overall: 68,
            potential: 82,
            positions: ["RW"],
            age: 18,
            height: 178,
            weight: 87,
            foot: "Left",
            pace: 71,
            shooting: 64,
            passing: 63,
            dribbling: 67,
            defending: 61,
            physical: 71,
            skills: {
                crossing: 61,
                finishing: 53,
                headingAccuracy: 52,
                shortPassing: 58,
                volleys: 59,
                curve: 55,
                fkAccuracy: 54,
                longPassing: 52,
                ballControl: 54,
                acceleration: 57,
                sprintSpeed: 52,
                agility: 60,
                reactions: 60,
                balance: 51,
                shotPower: 59,
                jumping: 61,
                stamina: 55,
                strength: 60,
                longShots: 62,
                aggression: 48,
                interceptions: 53,
                positioning: 55,
                vision: 49,
                penalties: 57,
                composure: 61,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Australia",
            club: "Bayern Munich",
            value: "€34.9M",
            wage: "€406K",
            contract: "2025",
            sofifaId: 271416,
            sofifaUrl: "https://sofifa.com/player/271416/?r=250001"
        },

        "Pepe Reina": {
            overall: 81,
            potential: 81,
            positions: ["GK"],
            age: 41,
            height: 177,
            weight: 80,
            foot: "Right",
            pace: 70,
            shooting: 40,
            passing: 74,
            dribbling: 60,
            defending: 84,
            physical: 74,
            skills: {
                crossing: 50,
                finishing: 40,
                headingAccuracy: 64,
                shortPassing: 74,
                volleys: 70,
                curve: 70,
                fkAccuracy: 61,
                longPassing: 63,
                ballControl: 75,
                acceleration: 69,
                sprintSpeed: 67,
                agility: 74,
                reactions: 63,
                balance: 71,
                shotPower: 63,
                jumping: 74,
                stamina: 75,
                strength: 72,
                longShots: 70,
                aggression: 67,
                interceptions: 72,
                positioning: 81,
                vision: 70,
                penalties: 67,
                composure: 68,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "Spain",
            club: "Villarreal",
            value: "€93.0M",
            wage: "€139K",
            contract: "2025",
            sofifaId: 116356,
            sofifaUrl: "https://sofifa.com/player/116356/?r=250001"
        },

        "Amor Layouni": {
            overall: 72,
            potential: 75,
            positions: ["CAM","LM"],
            age: 26,
            height: 190,
            weight: 84,
            foot: "Left",
            pace: 76,
            shooting: 79,
            passing: 77,
            dribbling: 75,
            defending: 73,
            physical: 73,
            skills: {
                crossing: 60,
                finishing: 54,
                headingAccuracy: 59,
                shortPassing: 59,
                volleys: 63,
                curve: 53,
                fkAccuracy: 60,
                longPassing: 61,
                ballControl: 65,
                acceleration: 58,
                sprintSpeed: 62,
                agility: 63,
                reactions: 58,
                balance: 56,
                shotPower: 65,
                jumping: 56,
                stamina: 65,
                strength: 57,
                longShots: 62,
                aggression: 56,
                interceptions: 58,
                positioning: 66,
                vision: 54,
                penalties: 55,
                composure: 65,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 2,
            nationality: "Tunisia",
            club: "AEK Athens",
            value: "€60.6M",
            wage: "€353K",
            contract: "2025",
            sofifaId: 225257,
            sofifaUrl: "https://sofifa.com/player/225257/?r=250001"
        },

        "Luis Advíncula": {
            overall: 78,
            potential: 78,
            positions: ["RB","RWB"],
            age: 33,
            height: 179,
            weight: 83,
            foot: "Right",
            pace: 78,
            shooting: 83,
            passing: 72,
            dribbling: 84,
            defending: 78,
            physical: 72,
            skills: {
                crossing: 64,
                finishing: 66,
                headingAccuracy: 62,
                shortPassing: 63,
                volleys: 58,
                curve: 67,
                fkAccuracy: 70,
                longPassing: 72,
                ballControl: 68,
                acceleration: 61,
                sprintSpeed: 70,
                agility: 62,
                reactions: 65,
                balance: 70,
                shotPower: 60,
                jumping: 61,
                stamina: 68,
                strength: 60,
                longShots: 58,
                aggression: 71,
                interceptions: 69,
                positioning: 72,
                vision: 63,
                penalties: 68,
                composure: 71,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 3,
            nationality: "Peru",
            club: "Boca Juniors",
            value: "€47.4M",
            wage: "€398K",
            contract: "2025",
            sofifaId: 207929,
            sofifaUrl: "https://sofifa.com/player/207929/?r=250001"
        },

        "Mohamed Salah": {
            overall: 89,
            potential: 89,
            positions: ["RW","ST"],
            age: 32,
            height: 181,
            weight: 66,
            foot: "Right",
            pace: 94,
            shooting: 99,
            passing: 87,
            dribbling: 81,
            defending: 86,
            physical: 92,
            skills: {
                crossing: 79,
                finishing: 96,
                headingAccuracy: 74,
                shortPassing: 79,
                volleys: 83,
                curve: 74,
                fkAccuracy: 80,
                longPassing: 70,
                ballControl: 74,
                acceleration: 82,
                sprintSpeed: 82,
                agility: 71,
                reactions: 76,
                balance: 81,
                shotPower: 74,
                jumping: 83,
                stamina: 74,
                strength: 79,
                longShots: 69,
                aggression: 78,
                interceptions: 72,
                positioning: 82,
                vision: 70,
                penalties: 72,
                composure: 78,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 2,
            nationality: "Egypt",
            club: "Liverpool",
            value: "€84.0M",
            wage: "€71K",
            contract: "2025",
            sofifaId: 209331,
            sofifaUrl: "https://sofifa.com/player/209331/?r=250001"
        },

        "Luis Suárez": {
            overall: 86,
            potential: 86,
            positions: ["ST"],
            age: 37,
            height: 194,
            weight: 66,
            foot: "Left",
            pace: 91,
            shooting: 99,
            passing: 92,
            dribbling: 92,
            defending: 83,
            physical: 80,
            skills: {
                crossing: 74,
                finishing: 84,
                headingAccuracy: 71,
                shortPassing: 67,
                volleys: 77,
                curve: 74,
                fkAccuracy: 72,
                longPassing: 76,
                ballControl: 76,
                acceleration: 69,
                sprintSpeed: 68,
                agility: 76,
                reactions: 73,
                balance: 66,
                shotPower: 68,
                jumping: 72,
                stamina: 75,
                strength: 77,
                longShots: 70,
                aggression: 76,
                interceptions: 67,
                positioning: 81,
                vision: 69,
                penalties: 77,
                composure: 78,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 2,
            nationality: "Uruguay",
            club: "Inter Miami",
            value: "€77.0M",
            wage: "€430K",
            contract: "2025",
            sofifaId: 176580,
            sofifaUrl: "https://sofifa.com/player/176580/?r=250001"
        },

        "Antonio Rüdiger": {
            overall: 87,
            potential: 87,
            positions: ["CB"],
            age: 31,
            height: 173,
            weight: 89,
            foot: "Left",
            pace: 90,
            shooting: 94,
            passing: 86,
            dribbling: 83,
            defending: 95,
            physical: 85,
            skills: {
                crossing: 73,
                finishing: 60,
                headingAccuracy: 87,
                shortPassing: 69,
                volleys: 73,
                curve: 72,
                fkAccuracy: 80,
                longPassing: 70,
                ballControl: 77,
                acceleration: 71,
                sprintSpeed: 74,
                agility: 70,
                reactions: 79,
                balance: 75,
                shotPower: 76,
                jumping: 76,
                stamina: 77,
                strength: 78,
                longShots: 71,
                aggression: 81,
                interceptions: 79,
                positioning: 77,
                vision: 75,
                penalties: 79,
                composure: 72,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 2,
            nationality: "Germany",
            club: "Real Madrid",
            value: "€100.9M",
            wage: "€500K",
            contract: "2025",
            sofifaId: 205452,
            sofifaUrl: "https://sofifa.com/player/205452/?r=250001"
        },

        "Kalidou Koulibaly": {
            overall: 87,
            potential: 87,
            positions: ["CB"],
            age: 33,
            height: 176,
            weight: 82,
            foot: "Right",
            pace: 82,
            shooting: 82,
            passing: 79,
            dribbling: 90,
            defending: 94,
            physical: 93,
            skills: {
                crossing: 67,
                finishing: 60,
                headingAccuracy: 81,
                shortPassing: 80,
                volleys: 68,
                curve: 68,
                fkAccuracy: 78,
                longPassing: 78,
                ballControl: 80,
                acceleration: 67,
                sprintSpeed: 81,
                agility: 73,
                reactions: 76,
                balance: 74,
                shotPower: 72,
                jumping: 79,
                stamina: 76,
                strength: 67,
                longShots: 75,
                aggression: 77,
                interceptions: 82,
                positioning: 72,
                vision: 67,
                penalties: 79,
                composure: 67,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "Senegal",
            club: "Al Hilal",
            value: "€101.3M",
            wage: "€362K",
            contract: "2025",
            sofifaId: 201024,
            sofifaUrl: "https://sofifa.com/player/201024/?r=250001"
        },

        "N'Golo Kanté": {
            overall: 87,
            potential: 87,
            positions: ["CDM","CM"],
            age: 33,
            height: 191,
            weight: 72,
            foot: "Right",
            pace: 92,
            shooting: 84,
            passing: 91,
            dribbling: 94,
            defending: 93,
            physical: 81,
            skills: {
                crossing: 79,
                finishing: 74,
                headingAccuracy: 76,
                shortPassing: 79,
                volleys: 74,
                curve: 73,
                fkAccuracy: 77,
                longPassing: 78,
                ballControl: 78,
                acceleration: 75,
                sprintSpeed: 80,
                agility: 69,
                reactions: 75,
                balance: 69,
                shotPower: 70,
                jumping: 77,
                stamina: 74,
                strength: 79,
                longShots: 73,
                aggression: 69,
                interceptions: 68,
                positioning: 68,
                vision: 68,
                penalties: 67,
                composure: 75,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "France",
            club: "Al Ittihad",
            value: "€34.5M",
            wage: "€436K",
            contract: "2025",
            sofifaId: 215914,
            sofifaUrl: "https://sofifa.com/player/215914/?r=250001"
        },

        "Luka Modrić": {
            overall: 88,
            potential: 88,
            positions: ["CM","CAM"],
            age: 38,
            height: 175,
            weight: 69,
            foot: "Right",
            pace: 93,
            shooting: 93,
            passing: 99,
            dribbling: 85,
            defending: 86,
            physical: 81,
            skills: {
                crossing: 70,
                finishing: 73,
                headingAccuracy: 76,
                shortPassing: 72,
                volleys: 69,
                curve: 72,
                fkAccuracy: 72,
                longPassing: 82,
                ballControl: 77,
                acceleration: 68,
                sprintSpeed: 70,
                agility: 79,
                reactions: 68,
                balance: 74,
                shotPower: 69,
                jumping: 82,
                stamina: 79,
                strength: 68,
                longShots: 79,
                aggression: 82,
                interceptions: 72,
                positioning: 68,
                vision: 71,
                penalties: 81,
                composure: 78,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Croatia",
            club: "Real Madrid",
            value: "€13.4M",
            wage: "€169K",
            contract: "2025",
            sofifaId: 177003,
            sofifaUrl: "https://sofifa.com/player/177003/?r=250001"
        },

        "Kyle Walker": {
            overall: 84,
            potential: 84,
            positions: ["RB"],
            age: 34,
            height: 185,
            weight: 78,
            foot: "Left",
            pace: 80,
            shooting: 85,
            passing: 88,
            dribbling: 89,
            defending: 83,
            physical: 77,
            skills: {
                crossing: 67,
                finishing: 72,
                headingAccuracy: 70,
                shortPassing: 75,
                volleys: 72,
                curve: 64,
                fkAccuracy: 65,
                longPassing: 67,
                ballControl: 67,
                acceleration: 68,
                sprintSpeed: 75,
                agility: 77,
                reactions: 73,
                balance: 77,
                shotPower: 76,
                jumping: 78,
                stamina: 75,
                strength: 66,
                longShots: 73,
                aggression: 70,
                interceptions: 66,
                positioning: 64,
                vision: 78,
                penalties: 71,
                composure: 69,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 2,
            nationality: "England",
            club: "Manchester City",
            value: "€99.1M",
            wage: "€282K",
            contract: "2025",
            sofifaId: 198710,
            sofifaUrl: "https://sofifa.com/player/198710/?r=250001"
        },

        "Dominik Kohr": {
            overall: 76,
            potential: 76,
            positions: ["CDM"],
            age: 30,
            height: 193,
            weight: 71,
            foot: "Left",
            pace: 73,
            shooting: 80,
            passing: 70,
            dribbling: 70,
            defending: 77,
            physical: 72,
            skills: {
                crossing: 70,
                finishing: 67,
                headingAccuracy: 62,
                shortPassing: 56,
                volleys: 61,
                curve: 70,
                fkAccuracy: 57,
                longPassing: 64,
                ballControl: 63,
                acceleration: 64,
                sprintSpeed: 60,
                agility: 67,
                reactions: 69,
                balance: 61,
                shotPower: 65,
                jumping: 61,
                stamina: 66,
                strength: 64,
                longShots: 57,
                aggression: 63,
                interceptions: 68,
                positioning: 63,
                vision: 57,
                penalties: 56,
                composure: 66,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 2,
            nationality: "Germany",
            club: "Mainz 05",
            value: "€27.8M",
            wage: "€489K",
            contract: "2025",
            sofifaId: 199412,
            sofifaUrl: "https://sofifa.com/player/199412/?r=250001"
        },

        "Robert Lewandowski": {
            overall: 90,
            potential: 90,
            positions: ["ST"],
            age: 35,
            height: 185,
            weight: 81,
            foot: "Right",
            pace: 78,     // Corrected from 94 - age factor
            shooting: 91, // Corrected from 98
            passing: 79,  // Corrected from 89
            dribbling: 85, // Corrected from 87
            defending: 44, // Corrected from 88 - striker
            physical: 82,  // Corrected from 88
            skills: {
                crossing: 70,
                finishing: 93,
                headingAccuracy: 83,
                shortPassing: 83,
                volleys: 75,
                curve: 71,
                fkAccuracy: 72,
                longPassing: 75,
                ballControl: 75,
                acceleration: 82,
                sprintSpeed: 77,
                agility: 78,
                reactions: 80,
                balance: 81,
                shotPower: 82,
                jumping: 79,
                stamina: 75,
                strength: 72,
                longShots: 75,
                aggression: 74,
                interceptions: 74,
                positioning: 80,
                vision: 81,
                penalties: 70,
                composure: 80,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "Poland",
            club: "Barcelona",
            value: "€99.7M",
            wage: "€381K",
            contract: "2025",
            sofifaId: 188545,
            sofifaUrl: "https://sofifa.com/player/188545/?r=250001"
        },

        "Cristiano Ronaldo": {
            overall: 88,
            potential: 88,
            positions: ["ST","LW"],
            age: 39,
            height: 187,
            weight: 83,
            foot: "Right",
            pace: 81,     // Corrected from 85 - still good for age
            shooting: 92, // Corrected from 98
            passing: 82,  // Corrected from 93
            dribbling: 85, // Corrected from 89
            defending: 34, // Corrected from 87 - forward
            physical: 77,  // Corrected from 91
            skills: {
                crossing: 78,
                finishing: 87,
                headingAccuracy: 72,
                shortPassing: 73,
                volleys: 74,
                curve: 71,
                fkAccuracy: 79,
                longPassing: 73,
                ballControl: 73,
                acceleration: 81,
                sprintSpeed: 69,
                agility: 71,
                reactions: 73,
                balance: 72,
                shotPower: 79,
                jumping: 75,
                stamina: 82,
                strength: 75,
                longShots: 73,
                aggression: 69,
                interceptions: 71,
                positioning: 82,
                vision: 82,
                penalties: 68,
                composure: 80,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "Portugal",
            club: "Al Nassr",
            value: "€57.6M",
            wage: "€431K",
            contract: "2025",
            sofifaId: 20801,
            sofifaUrl: "https://sofifa.com/player/20801/?r=250001"
        },

        "Iñaki Williams": {
            overall: 81,
            potential: 81,
            positions: ["RW","ST"],
            age: 30,
            height: 185,
            weight: 65,
            foot: "Right",
            pace: 78,
            shooting: 98,
            passing: 88,
            dribbling: 79,
            defending: 75,
            physical: 77,
            skills: {
                crossing: 70,
                finishing: 83,
                headingAccuracy: 62,
                shortPassing: 71,
                volleys: 67,
                curve: 72,
                fkAccuracy: 65,
                longPassing: 68,
                ballControl: 64,
                acceleration: 74,
                sprintSpeed: 65,
                agility: 63,
                reactions: 72,
                balance: 61,
                shotPower: 69,
                jumping: 69,
                stamina: 65,
                strength: 72,
                longShots: 72,
                aggression: 69,
                interceptions: 70,
                positioning: 71,
                vision: 72,
                penalties: 67,
                composure: 63,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 4,
            nationality: "Ghana",
            club: "Athletic Bilbao",
            value: "€65.9M",
            wage: "€517K",
            contract: "2025",
            sofifaId: 215316,
            sofifaUrl: "https://sofifa.com/player/215316/?r=250001"
        },

        "Francesco Acerbi": {
            overall: 84,
            potential: 84,
            positions: ["CB"],
            age: 36,
            height: 172,
            weight: 68,
            foot: "Right",
            pace: 77,
            shooting: 86,
            passing: 76,
            dribbling: 77,
            defending: 94,
            physical: 92,
            skills: {
                crossing: 72,
                finishing: 60,
                headingAccuracy: 87,
                shortPassing: 72,
                volleys: 66,
                curve: 66,
                fkAccuracy: 76,
                longPassing: 75,
                ballControl: 70,
                acceleration: 68,
                sprintSpeed: 65,
                agility: 74,
                reactions: 67,
                balance: 64,
                shotPower: 74,
                jumping: 69,
                stamina: 68,
                strength: 69,
                longShots: 72,
                aggression: 66,
                interceptions: 80,
                positioning: 75,
                vision: 76,
                penalties: 67,
                composure: 72,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "Italy",
            club: "Inter Milan",
            value: "€22.9M",
            wage: "€272K",
            contract: "2025",
            sofifaId: 183711,
            sofifaUrl: "https://sofifa.com/player/183711/?r=250001"
        },

        "Sofyan Amrabat": {
            overall: 79,
            potential: 82,
            positions: ["CDM","CM"],
            age: 27,
            height: 190,
            weight: 65,
            foot: "Left",
            pace: 84,
            shooting: 74,
            passing: 95,
            dribbling: 82,
            defending: 85,
            physical: 80,
            skills: {
                crossing: 59,
                finishing: 62,
                headingAccuracy: 59,
                shortPassing: 69,
                volleys: 67,
                curve: 63,
                fkAccuracy: 61,
                longPassing: 71,
                ballControl: 66,
                acceleration: 69,
                sprintSpeed: 69,
                agility: 62,
                reactions: 65,
                balance: 64,
                shotPower: 59,
                jumping: 60,
                stamina: 67,
                strength: 66,
                longShots: 61,
                aggression: 63,
                interceptions: 67,
                positioning: 70,
                vision: 60,
                penalties: 69,
                composure: 60,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 3,
            nationality: "Morocco",
            club: "Fiorentina",
            value: "€29.3M",
            wage: "€242K",
            contract: "2025",
            sofifaId: 221700,
            sofifaUrl: "https://sofifa.com/player/221700/?r=250001"
        },

        "Federico Chiesa": {
            overall: 84,
            potential: 87,
            positions: ["LW","RW"],
            age: 26,
            height: 186,
            weight: 77,
            foot: "Right",
            pace: 76,
            shooting: 89,
            passing: 84,
            dribbling: 91,
            defending: 86,
            physical: 85,
            skills: {
                crossing: 70,
                finishing: 66,
                headingAccuracy: 77,
                shortPassing: 72,
                volleys: 69,
                curve: 76,
                fkAccuracy: 77,
                longPassing: 70,
                ballControl: 69,
                acceleration: 68,
                sprintSpeed: 77,
                agility: 76,
                reactions: 68,
                balance: 69,
                shotPower: 73,
                jumping: 69,
                stamina: 70,
                strength: 67,
                longShots: 64,
                aggression: 64,
                interceptions: 70,
                positioning: 72,
                vision: 77,
                penalties: 64,
                composure: 69,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Italy",
            club: "Liverpool",
            value: "€97.0M",
            wage: "€221K",
            contract: "2025",
            sofifaId: 233049,
            sofifaUrl: "https://sofifa.com/player/233049/?r=250001"
        },

        "İlkay Gündoğan": {
            overall: 85,
            potential: 85,
            positions: ["CM","CAM"],
            age: 33,
            height: 175,
            weight: 74,
            foot: "Right",
            pace: 83,
            shooting: 80,
            passing: 92,
            dribbling: 96,
            defending: 91,
            physical: 89,
            skills: {
                crossing: 76,
                finishing: 72,
                headingAccuracy: 76,
                shortPassing: 76,
                volleys: 71,
                curve: 77,
                fkAccuracy: 77,
                longPassing: 67,
                ballControl: 77,
                acceleration: 73,
                sprintSpeed: 70,
                agility: 72,
                reactions: 71,
                balance: 75,
                shotPower: 67,
                jumping: 69,
                stamina: 67,
                strength: 65,
                longShots: 76,
                aggression: 72,
                interceptions: 71,
                positioning: 68,
                vision: 71,
                penalties: 77,
                composure: 72,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Germany",
            club: "Barcelona",
            value: "€73.0M",
            wage: "€155K",
            contract: "2025",
            sofifaId: 186942,
            sofifaUrl: "https://sofifa.com/player/186942/?r=250001"
        },

        "Theo Hernández": {
            overall: 84,
            potential: 86,
            positions: ["LB"],
            age: 26,
            height: 172,
            weight: 89,
            foot: "Left",
            pace: 81,
            shooting: 81,
            passing: 81,
            dribbling: 83,
            defending: 81,
            physical: 85,
            skills: {
                crossing: 65,
                finishing: 68,
                headingAccuracy: 73,
                shortPassing: 64,
                volleys: 71,
                curve: 68,
                fkAccuracy: 71,
                longPassing: 68,
                ballControl: 75,
                acceleration: 76,
                sprintSpeed: 68,
                agility: 64,
                reactions: 69,
                balance: 69,
                shotPower: 74,
                jumping: 70,
                stamina: 67,
                strength: 74,
                longShots: 72,
                aggression: 64,
                interceptions: 68,
                positioning: 75,
                vision: 77,
                penalties: 77,
                composure: 70,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 2,
            nationality: "France",
            club: "AC Milan",
            value: "€93.8M",
            wage: "€133K",
            contract: "2025",
            sofifaId: 239062,
            sofifaUrl: "https://sofifa.com/player/239062/?r=250001"
        },

        "Jordi Alba": {
            overall: 84,
            potential: 84,
            positions: ["LB"],
            age: 35,
            height: 189,
            weight: 65,
            foot: "Right",
            pace: 77,
            shooting: 83,
            passing: 89,
            dribbling: 80,
            defending: 91,
            physical: 84,
            skills: {
                crossing: 75,
                finishing: 68,
                headingAccuracy: 66,
                shortPassing: 68,
                volleys: 66,
                curve: 64,
                fkAccuracy: 64,
                longPassing: 69,
                ballControl: 70,
                acceleration: 66,
                sprintSpeed: 71,
                agility: 76,
                reactions: 77,
                balance: 65,
                shotPower: 70,
                jumping: 65,
                stamina: 66,
                strength: 75,
                longShots: 64,
                aggression: 64,
                interceptions: 75,
                positioning: 78,
                vision: 71,
                penalties: 66,
                composure: 64,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 3,
            nationality: "Spain",
            club: "Inter Miami",
            value: "€97.1M",
            wage: "€453K",
            contract: "2025",
            sofifaId: 189332,
            sofifaUrl: "https://sofifa.com/player/189332/?r=250001"
        },

        "Nicolò Barella": {
            overall: 86,
            potential: 89,
            positions: ["CM","CAM"],
            age: 27,
            height: 177,
            weight: 73,
            foot: "Left",
            pace: 89,
            shooting: 79,
            passing: 93,
            dribbling: 98,
            defending: 92,
            physical: 85,
            skills: {
                crossing: 73,
                finishing: 77,
                headingAccuracy: 66,
                shortPassing: 76,
                volleys: 66,
                curve: 67,
                fkAccuracy: 79,
                longPassing: 67,
                ballControl: 73,
                acceleration: 80,
                sprintSpeed: 67,
                agility: 80,
                reactions: 77,
                balance: 68,
                shotPower: 73,
                jumping: 72,
                stamina: 70,
                strength: 78,
                longShots: 73,
                aggression: 70,
                interceptions: 80,
                positioning: 67,
                vision: 68,
                penalties: 80,
                composure: 72,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 3,
            nationality: "Italy",
            club: "Inter Milan",
            value: "€50.4M",
            wage: "€424K",
            contract: "2025",
            sofifaId: 235998,
            sofifaUrl: "https://sofifa.com/player/235998/?r=250001"
        },

        "Ferland Mendy": {
            overall: 82,
            potential: 84,
            positions: ["LB"],
            age: 29,
            height: 178,
            weight: 81,
            foot: "Right",
            pace: 77,
            shooting: 79,
            passing: 76,
            dribbling: 83,
            defending: 75,
            physical: 79,
            skills: {
                crossing: 70,
                finishing: 66,
                headingAccuracy: 69,
                shortPassing: 63,
                volleys: 69,
                curve: 63,
                fkAccuracy: 72,
                longPassing: 68,
                ballControl: 73,
                acceleration: 68,
                sprintSpeed: 69,
                agility: 72,
                reactions: 62,
                balance: 72,
                shotPower: 67,
                jumping: 68,
                stamina: 75,
                strength: 63,
                longShots: 67,
                aggression: 69,
                interceptions: 72,
                positioning: 70,
                vision: 62,
                penalties: 75,
                composure: 70,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 2,
            nationality: "France",
            club: "Real Madrid",
            value: "€53.9M",
            wage: "€99K",
            contract: "2025",
            sofifaId: 228845,
            sofifaUrl: "https://sofifa.com/player/228845/?r=250001"
        },

        "Raphaël Varane": {
            overall: 86,
            potential: 86,
            positions: ["CB"],
            age: 31,
            height: 188,
            weight: 68,
            foot: "Right",
            pace: 79,
            shooting: 78,
            passing: 93,
            dribbling: 85,
            defending: 99,
            physical: 92,
            skills: {
                crossing: 73,
                finishing: 60,
                headingAccuracy: 87,
                shortPassing: 78,
                volleys: 79,
                curve: 74,
                fkAccuracy: 68,
                longPassing: 76,
                ballControl: 79,
                acceleration: 69,
                sprintSpeed: 77,
                agility: 74,
                reactions: 71,
                balance: 71,
                shotPower: 78,
                jumping: 76,
                stamina: 72,
                strength: 75,
                longShots: 69,
                aggression: 72,
                interceptions: 79,
                positioning: 75,
                vision: 68,
                penalties: 69,
                composure: 80,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 2,
            nationality: "France",
            club: "Como",
            value: "€80.9M",
            wage: "€322K",
            contract: "2025",
            sofifaId: 201535,
            sofifaUrl: "https://sofifa.com/player/201535/?r=250001"
        },

        "Wojciech Szczęsny": {
            overall: 85,
            potential: 85,
            positions: ["GK"],
            age: 34,
            height: 186,
            weight: 66,
            foot: "Left",
            pace: 70,
            shooting: 40,
            passing: 92,
            dribbling: 60,
            defending: 83,
            physical: 83,
            skills: {
                crossing: 50,
                finishing: 40,
                headingAccuracy: 77,
                shortPassing: 73,
                volleys: 69,
                curve: 67,
                fkAccuracy: 76,
                longPassing: 71,
                ballControl: 73,
                acceleration: 74,
                sprintSpeed: 72,
                agility: 68,
                reactions: 70,
                balance: 71,
                shotPower: 75,
                jumping: 69,
                stamina: 69,
                strength: 70,
                longShots: 74,
                aggression: 73,
                interceptions: 68,
                positioning: 79,
                vision: 71,
                penalties: 74,
                composure: 69,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Poland",
            club: "Barcelona",
            value: "€70.4M",
            wage: "€373K",
            contract: "2025",
            sofifaId: 188390,
            sofifaUrl: "https://sofifa.com/player/188390/?r=250001"
        },

        "Jonathan Tah": {
            overall: 84,
            potential: 86,
            positions: ["CB"],
            age: 28,
            height: 186,
            weight: 74,
            foot: "Right",
            pace: 79,
            shooting: 83,
            passing: 80,
            dribbling: 82,
            defending: 96,
            physical: 87,
            skills: {
                crossing: 67,
                finishing: 60,
                headingAccuracy: 75,
                shortPassing: 64,
                volleys: 69,
                curve: 65,
                fkAccuracy: 65,
                longPassing: 69,
                ballControl: 66,
                acceleration: 75,
                sprintSpeed: 71,
                agility: 73,
                reactions: 78,
                balance: 65,
                shotPower: 64,
                jumping: 75,
                stamina: 64,
                strength: 74,
                longShots: 75,
                aggression: 78,
                interceptions: 81,
                positioning: 77,
                vision: 68,
                penalties: 76,
                composure: 66,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Germany",
            club: "Bayer Leverkusen",
            value: "€21.3M",
            wage: "€143K",
            contract: "2025",
            sofifaId: 220834,
            sofifaUrl: "https://sofifa.com/player/220834/?r=250001"
        },

        "Manuel Neuer": {
            overall: 87,
            potential: 87,
            positions: ["GK"],
            age: 38,
            height: 179,
            weight: 74,
            foot: "Left",
            pace: 70,
            shooting: 40,
            passing: 85,
            dribbling: 60,
            defending: 89,
            physical: 79,
            skills: {
                crossing: 50,
                finishing: 40,
                headingAccuracy: 67,
                shortPassing: 81,
                volleys: 75,
                curve: 67,
                fkAccuracy: 67,
                longPassing: 72,
                ballControl: 79,
                acceleration: 75,
                sprintSpeed: 77,
                agility: 71,
                reactions: 77,
                balance: 71,
                shotPower: 79,
                jumping: 75,
                stamina: 79,
                strength: 78,
                longShots: 77,
                aggression: 80,
                interceptions: 72,
                positioning: 91,
                vision: 69,
                penalties: 77,
                composure: 71,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 3,
            nationality: "Germany",
            club: "Bayern Munich",
            value: "€32.8M",
            wage: "€452K",
            contract: "2025",
            sofifaId: 167495,
            sofifaUrl: "https://sofifa.com/player/167495/?r=250001"
        },

        "Manuel Lazzari": {
            overall: 78,
            potential: 78,
            positions: ["RB","RWB"],
            age: 30,
            height: 177,
            weight: 79,
            foot: "Left",
            pace: 79,
            shooting: 83,
            passing: 78,
            dribbling: 78,
            defending: 82,
            physical: 84,
            skills: {
                crossing: 65,
                finishing: 72,
                headingAccuracy: 72,
                shortPassing: 71,
                volleys: 60,
                curve: 67,
                fkAccuracy: 67,
                longPassing: 64,
                ballControl: 67,
                acceleration: 63,
                sprintSpeed: 62,
                agility: 72,
                reactions: 66,
                balance: 70,
                shotPower: 61,
                jumping: 65,
                stamina: 59,
                strength: 70,
                longShots: 60,
                aggression: 60,
                interceptions: 66,
                positioning: 65,
                vision: 66,
                penalties: 70,
                composure: 62,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "Italy",
            club: "Lazio",
            value: "€17.1M",
            wage: "€436K",
            contract: "2025",
            sofifaId: 226978,
            sofifaUrl: "https://sofifa.com/player/226978/?r=250001"
        },

        "Jonathan Clauss": {
            overall: 78,
            potential: 78,
            positions: ["RB","RWB"],
            age: 31,
            height: 170,
            weight: 71,
            foot: "Left",
            pace: 75,
            shooting: 84,
            passing: 70,
            dribbling: 75,
            defending: 79,
            physical: 80,
            skills: {
                crossing: 67,
                finishing: 59,
                headingAccuracy: 71,
                shortPassing: 64,
                volleys: 59,
                curve: 69,
                fkAccuracy: 64,
                longPassing: 68,
                ballControl: 59,
                acceleration: 69,
                sprintSpeed: 69,
                agility: 64,
                reactions: 69,
                balance: 65,
                shotPower: 58,
                jumping: 68,
                stamina: 67,
                strength: 68,
                longShots: 70,
                aggression: 62,
                interceptions: 61,
                positioning: 65,
                vision: 70,
                penalties: 61,
                composure: 65,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "France",
            club: "Nice",
            value: "€10.7M",
            wage: "€162K",
            contract: "2025",
            sofifaId: 226221,
            sofifaUrl: "https://sofifa.com/player/226221/?r=250001"
        },

        "Jeremiah St. Juste": {
            overall: 77,
            potential: 79,
            positions: ["CB"],
            age: 27,
            height: 183,
            weight: 67,
            foot: "Right",
            pace: 72,
            shooting: 74,
            passing: 73,
            dribbling: 69,
            defending: 92,
            physical: 88,
            skills: {
                crossing: 58,
                finishing: 60,
                headingAccuracy: 71,
                shortPassing: 57,
                volleys: 61,
                curve: 59,
                fkAccuracy: 58,
                longPassing: 62,
                ballControl: 69,
                acceleration: 57,
                sprintSpeed: 69,
                agility: 67,
                reactions: 61,
                balance: 57,
                shotPower: 62,
                jumping: 58,
                stamina: 69,
                strength: 70,
                longShots: 68,
                aggression: 60,
                interceptions: 73,
                positioning: 59,
                vision: 63,
                penalties: 64,
                composure: 60,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Netherlands",
            club: "Sporting CP",
            value: "€76.7M",
            wage: "€453K",
            contract: "2025",
            sofifaId: 231442,
            sofifaUrl: "https://sofifa.com/player/231442/?r=250001"
        },

        "David Alaba": {
            overall: 84,
            potential: 84,
            positions: ["CB","LB"],
            age: 32,
            height: 191,
            weight: 76,
            foot: "Right",
            pace: 88,
            shooting: 78,
            passing: 79,
            dribbling: 88,
            defending: 90,
            physical: 82,
            skills: {
                crossing: 67,
                finishing: 60,
                headingAccuracy: 77,
                shortPassing: 72,
                volleys: 78,
                curve: 68,
                fkAccuracy: 78,
                longPassing: 67,
                ballControl: 70,
                acceleration: 71,
                sprintSpeed: 66,
                agility: 68,
                reactions: 72,
                balance: 72,
                shotPower: 73,
                jumping: 76,
                stamina: 65,
                strength: 69,
                longShots: 76,
                aggression: 73,
                interceptions: 85,
                positioning: 71,
                vision: 71,
                penalties: 73,
                composure: 64,
            },
            workrates: "Medium/Medium",
            weakFoot: 2,
            skillMoves: 2,
            nationality: "Austria",
            club: "Real Madrid",
            value: "€96.8M",
            wage: "€420K",
            contract: "2025",
            sofifaId: 197445,
            sofifaUrl: "https://sofifa.com/player/197445/?r=250001"
        },

        "Saud Abdulhamid": {
            overall: 71,
            potential: 75,
            positions: ["RB"],
            age: 25,
            height: 188,
            weight: 66,
            foot: "Right",
            pace: 75,
            shooting: 64,
            passing: 75,
            dribbling: 73,
            defending: 76,
            physical: 68,
            skills: {
                crossing: 60,
                finishing: 52,
                headingAccuracy: 62,
                shortPassing: 58,
                volleys: 60,
                curve: 57,
                fkAccuracy: 60,
                longPassing: 59,
                ballControl: 64,
                acceleration: 62,
                sprintSpeed: 60,
                agility: 53,
                reactions: 56,
                balance: 51,
                shotPower: 57,
                jumping: 64,
                stamina: 59,
                strength: 61,
                longShots: 59,
                aggression: 64,
                interceptions: 63,
                positioning: 64,
                vision: 63,
                penalties: 57,
                composure: 53,
            },
            workrates: "Medium/Medium",
            weakFoot: 4,
            skillMoves: 4,
            nationality: "Saudi Arabia",
            club: "AS Roma",
            value: "€36.8M",
            wage: "€499K",
            contract: "2025",
            sofifaId: 251880,
            sofifaUrl: "https://sofifa.com/player/251880/?r=250001"
        },

        "Lukáš Hrádecký": {
            overall: 82,
            potential: 82,
            positions: ["GK"],
            age: 34,
            height: 191,
            weight: 79,
            foot: "Right",
            pace: 70,
            shooting: 40,
            passing: 77,
            dribbling: 60,
            defending: 79,
            physical: 79,
            skills: {
                crossing: 50,
                finishing: 40,
                headingAccuracy: 73,
                shortPassing: 73,
                volleys: 75,
                curve: 63,
                fkAccuracy: 71,
                longPassing: 63,
                ballControl: 75,
                acceleration: 71,
                sprintSpeed: 69,
                agility: 74,
                reactions: 67,
                balance: 72,
                shotPower: 65,
                jumping: 76,
                stamina: 63,
                strength: 68,
                longShots: 63,
                aggression: 71,
                interceptions: 62,
                positioning: 75,
                vision: 65,
                penalties: 74,
                composure: 73,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 4,
            nationality: "Finland",
            club: "Bayer Leverkusen",
            value: "€31.4M",
            wage: "€305K",
            contract: "2025",
            sofifaId: 183705,
            sofifaUrl: "https://sofifa.com/player/183705/?r=250001"
        },

        "Alisson": {
            overall: 89,
            potential: 89,
            positions: ["GK"],
            age: 31,
            height: 181,
            weight: 87,
            foot: "Right",
            pace: 70,
            shooting: 40,
            passing: 81,
            dribbling: 60,
            defending: 90,
            physical: 87,
            skills: {
                crossing: 50,
                finishing: 40,
                headingAccuracy: 72,
                shortPassing: 77,
                volleys: 71,
                curve: 78,
                fkAccuracy: 73,
                longPassing: 69,
                ballControl: 78,
                acceleration: 77,
                sprintSpeed: 72,
                agility: 70,
                reactions: 74,
                balance: 71,
                shotPower: 71,
                jumping: 69,
                stamina: 80,
                strength: 82,
                longShots: 80,
                aggression: 72,
                interceptions: 80,
                positioning: 87,
                vision: 80,
                penalties: 76,
                composure: 74,
            },
            workrates: "Medium/Medium",
            weakFoot: 3,
            skillMoves: 3,
            nationality: "Brazil",
            club: "Liverpool",
            value: "€106.7M",
            wage: "€63K",
            contract: "2025",
            sofifaId: 212831,
            sofifaUrl: "https://sofifa.com/player/212831/?r=250001"
        }
    };

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
            
            // Merge JSON data with existing mock database
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
            console.log('🔄 Using mock database as fallback...');
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
            sofifaUrl: jsonPlayer.id ? `https://sofifa.com/player/${jsonPlayer.id}/` : null,
            source: 'json_database'
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
     * Search for a player in the FIFA database with enhanced JSON integration
     * @param {string} playerName - Name of the player to search for
     * @param {Object} options - Search options
     * @param {boolean} options.useLiveData - Whether to attempt SoFIFA fetch
     * @returns {Object|null} FIFA player data or null if not found
     */
    static async getPlayerData(playerName, options = { useLiveData: true }) {
        console.log(`🔍 Searching for player: ${playerName}`);
        
        // Load database if not already loaded or if it's mostly empty
        if (Object.keys(this.fifaDatabase).length < 50) {
            console.log('📚 Database empty or small, loading JSON data...');
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
        
        // Try exact match first in database
        let playerData = null;
        if (this.fifaDatabase[cleanPlayerName]) {
            playerData = {
                ...this.fifaDatabase[cleanPlayerName],
                searchName: cleanPlayerName,
                found: true
            };
            console.log(`✅ Found exact match in database: ${cleanPlayerName}`);
        } else {
            console.log(`❌ No exact match found for: "${cleanPlayerName}"`);
            console.log(`🔍 Available names containing "${cleanPlayerName.toLowerCase()}":`, 
                Object.keys(this.fifaDatabase).filter(name => 
                    name.toLowerCase().includes(cleanPlayerName.toLowerCase())
                ).slice(0, 5)
            );
        }

        // Try fuzzy matching if no exact match
        if (!playerData) {
            console.log(`🔄 Attempting fuzzy match for: "${cleanPlayerName}"`);
            const fuzzyMatch = this.performFuzzyMatch(cleanPlayerName);
            if (fuzzyMatch) {
                playerData = {
                    ...fuzzyMatch.data,
                    searchName: cleanPlayerName,
                    suggestedName: fuzzyMatch.name,
                    found: true,
                    source: 'database_fuzzy'
                };
                console.log(`✅ Found fuzzy match: "${cleanPlayerName}" -> "${fuzzyMatch.name}"`);
            } else {
                console.log(`❌ No fuzzy match found for: "${cleanPlayerName}"`);
            }
        }

        // If we have player data and should attempt live fetch
        if (playerData && options.useLiveData && playerData.sofifaUrl) {
            try {
                console.log('🌐 Attempting to fetch live data from SoFIFA...');
                const liveData = await SofifaIntegration.fetchPlayerData(playerData.sofifaUrl, playerData.sofifaId, cleanPlayerName);
                
                if (liveData) {
                    // Merge live data with existing data (live data takes precedence)
                    const enhancedData = {
                        ...playerData,
                        ...liveData,
                        searchName: cleanPlayerName,
                        found: true,
                        source: 'sofifa_enhanced',
                        lastUpdated: new Date().toISOString(),
                        fallbackDataAvailable: true
                    };
                    
                    console.log(`✅ Enhanced with live SoFIFA data for: ${cleanPlayerName}`);
                    return enhancedData;
                } else {
                    console.log('⚠️ Live data fetch failed, using database data');
                    if (playerData.source) {
                        playerData.source = playerData.source + '_fallback';
                    } else {
                        playerData.source = 'database_fallback';
                    }
                    playerData.sofifaAttempted = true;
                    playerData.sofifaFetchTime = new Date().toISOString();
                }
            } catch (error) {
                console.error('❌ Error fetching live data:', error.message);
                if (playerData) {
                    playerData.source = (playerData.source || 'database') + '_error_fallback';
                    playerData.fetchError = error.message;
                }
            }
        }

        // Return player data if available
        if (playerData) {
            // Ensure source is set
            if (!playerData.source) {
                playerData.source = 'database';
            }
            return playerData;
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
        const matches = [];
        
        for (const [dbName, data] of Object.entries(this.fifaDatabase)) {
            // Normalize the database name (remove accents, special characters)
            const dbNameNormalized = this.normalizeString(dbName.toLowerCase());
            const dbTerms = dbNameNormalized.split(' ');
            
            let score = 0;
            let matchedTerms = 0;
            
            // Score based on term matching
            searchTerms.forEach(searchTerm => {
                const normalizedTerm = this.normalizeString(searchTerm);
                let bestTermScore = 0;
                
                dbTerms.forEach(dbTerm => {
                    let termScore = 0;
                    
                    // Exact match gets highest score
                    if (dbTerm === normalizedTerm) {
                        termScore = 1.0;
                    }
                    // Check if one contains the other (for partial matches)
                    else if (dbTerm.includes(normalizedTerm) || normalizedTerm.includes(dbTerm)) {
                        // Give higher score for longer matches
                        const minLength = Math.min(dbTerm.length, normalizedTerm.length);
                        const maxLength = Math.max(dbTerm.length, normalizedTerm.length);
                        termScore = minLength / maxLength * 0.9;
                    }
                    // Use similarity calculation as fallback
                    else {
                        const similarity = this.calculateSimilarity(normalizedTerm, dbTerm);
                        if (similarity > 0.6) {
                            termScore = similarity * 0.8;
                        }
                    }
                    
                    bestTermScore = Math.max(bestTermScore, termScore);
                });
                
                if (bestTermScore > 0.5) {
                    matchedTerms++;
                    score += bestTermScore;
                }
            });
            
            // Special handling for single term searches (likely last names)
            if (searchTerms.length === 1) {
                const singleTerm = this.normalizeString(searchTerms[0]);
                
                // Check if the search term matches any part of the database name
                dbTerms.forEach(dbTerm => {
                    if (dbTerm.includes(singleTerm) || singleTerm.includes(dbTerm)) {
                        // Boost score for single term matches (common for last name searches)
                        const similarity = Math.min(singleTerm.length, dbTerm.length) / Math.max(singleTerm.length, dbTerm.length);
                        score = Math.max(score, similarity * 1.2);
                        matchedTerms = Math.max(matchedTerms, 1);
                    }
                });
            }
            
            // Calculate final score (normalize by number of search terms)
            const finalScore = searchTerms.length > 0 ? score / searchTerms.length : 0;
            
            // Accept if we have a good match or if we matched most terms
            if (finalScore > 0.6 || (matchedTerms >= Math.ceil(searchTerms.length * 0.7) && finalScore > 0.4)) {
                matches.push({
                    name: dbName,
                    data: data,
                    score: finalScore,
                    matchedTerms: matchedTerms
                });
            }
        }
        
        // Return the best match if any found
        if (matches.length > 0) {
            matches.sort((a, b) => {
                // First sort by score, then by number of matched terms
                if (Math.abs(a.score - b.score) < 0.1) {
                    return b.matchedTerms - a.matchedTerms;
                }
                return b.score - a.score;
            });
            
            const bestMatch = matches[0];
            console.log(`🎯 Found fuzzy match: "${playerName}" -> "${bestMatch.name}" (score: ${bestMatch.score.toFixed(2)})`);
            return { name: bestMatch.name, data: bestMatch.data };
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
        
        // Updated pattern to handle both formats: with and without player name slug
        const sofifaPattern = /^https:\/\/sofifa\.com\/player\/\d+\/([^\/]+\/)?(\d+\/?)?$/;
        return sofifaPattern.test(url);
    }

    /**
     * Update SoFIFA URLs with the correct format
     * @returns {Object} Update results
     */
    static updateSofifaUrls() {
        console.log('🔧 Updating SoFIFA URLs to correct format...');
        
        // Provided correct URLs mapping
        const correctUrls = {
            "Virgil van Dijk": { id: 203376, url: "https://sofifa.com/player/203376/virgil-van-dijk/250001/" },
            "Karim Benzema": { id: 165153, url: "https://sofifa.com/player/165153/karim-benzema/250001/" },
            "Iago Aspas": { id: 192629, url: "https://sofifa.com/player/192629/250001/" },
            "Kylian Mbappé": { id: 231747, url: "https://sofifa.com/player/231747/kylian-mbappe/250001/" },
            "Erling Haaland": { id: 239085, url: "https://sofifa.com/player/239085/erling-haaland/250001/" },
            "Viktor Gyökeres": { id: 241651, url: "https://sofifa.com/player/241651/250001/" },
            "Kevin De Bruyne": { id: 192985, url: "https://sofifa.com/player/192985/kevin-de-bruyne/250001/" },
            "Lionel Messi": { id: 158023, url: "https://sofifa.com/player/158023/lionel-messi/250001/" },
            "Frank Acheampong": { id: 213013, url: "https://sofifa.com/player/213013/250001/" },
            "Nestory Irankunda": { id: 266245, url: "https://sofifa.com/player/266245/250001/" },
            "Pepe Reina": { id: 24630, url: "https://sofifa.com/player/24630/jose-manuel-reina-paez/250001/" },
            "Amor Layouni": { id: 242166, url: "https://sofifa.com/player/242166/amor-layouni/250001/" },
            "Luis Advíncula": { id: 204539, url: "https://sofifa.com/player/204539/luis-advincula/250001/" },
            "Mohamed Salah": { id: 209331, url: "https://sofifa.com/player/209331/mohamed-salah/250001/" },
            "Luis Suárez": { id: 176580, url: "https://sofifa.com/player/176580/luis-suarez/250001/" },
            "Antonio Rüdiger": { id: 205452, url: "https://sofifa.com/player/205452/antonio-rudiger/250001/" },
            "Kalidou Koulibaly": { id: 201024, url: "https://sofifa.com/player/201024/kalidou-koulibaly/250001/" },
            "N'Golo Kanté": { id: 215914, url: "https://sofifa.com/player/215914/ngolo-kante/250001/" },
            "Luka Modrić": { id: 177003, url: "https://sofifa.com/player/177003/luka-modric/250001/" },
            "Kyle Walker": { id: 188377, url: "https://sofifa.com/player/188377/kyle-walker/250001/" },
            "Dominik Kohr": { id: 212212, url: "https://sofifa.com/player/212212/dominik-kohr/250001/" },
            "Robert Lewandowski": { id: 188545, url: "https://sofifa.com/player/188545/robert-lewandowski/250001/" },
            "Cristiano Ronaldo": { id: 20801, url: "https://sofifa.com/player/20801/cristiano-ronaldo/250001/" },
            "Iñaki Williams": { id: 216201, url: "https://sofifa.com/player/216201/inaki-williams-arthuer/250001/" },
            "Francesco Acerbi": { id: 199845, url: "https://sofifa.com/player/199845/francesco-acerbi/250001/" },
            "Nordin Amrabat": { id: 183108, url: "https://sofifa.com/player/183108/nordin-amrabat/250001/" },
            "Federico Chiesa": { id: 235805, url: "https://sofifa.com/player/235805/federico-chiesa/250001/" },
            "İlkay Gündoğan": { id: 186942, url: "https://sofifa.com/player/186942/ilkay-gundogan/250001/" },
            "Theo Hernández": { id: 232656, url: "https://sofifa.com/player/232656/theo-hernandez/250001/" },
            "Jordi Alba": { id: 189332, url: "https://sofifa.com/player/189332/jordi-alba/250001/" },
            "Nicolò Barella": { id: 224232, url: "https://sofifa.com/player/224232/nicolo-barella/250001/" },
            "Ferland Mendy": { id: 228618, url: "https://sofifa.com/player/228618/ferland-mendy/250001/" },
            "Raphaël Varane": { id: 201535, url: "https://sofifa.com/player/201535/raphael-varane/250001/" },
            "Wojciech Szczęsny": { id: 186153, url: "https://sofifa.com/player/186153/wojciech-szczesny/250001/" },
            "Jonathan Tah": { id: 213331, url: "https://sofifa.com/player/213331/jonathan-tah/250001/" },
            "Manuel Neuer": { id: 167495, url: "https://sofifa.com/player/167495/manuel-neuer/250001/" },
            "Manuel Lazzari": { id: 235374, url: "https://sofifa.com/player/235374/manuel-lazzari/250001/" },
            "Jonathan Clauss": { id: 239093, url: "https://sofifa.com/player/239093/jonathan-clauss/250001/" },
            "Jeremiah St. Juste": { id: 226853, url: "https://sofifa.com/player/226853/jeremiah-st-juste/250001/" },
            "David Alaba": { id: 197445, url: "https://sofifa.com/player/197445/david-alaba/250001/" },
            "Saud Abdulhamid": { id: 246688, url: "https://sofifa.com/player/246688/saud-abdulhamid/250001/" },
            "Lukáš Hrádecký": { id: 190941, url: "https://sofifa.com/player/190941/lukas-hradecky/250001/" },
            "Alisson": { id: 212831, url: "https://sofifa.com/player/212831/alisson/250001/" }
        };

        const results = {
            updated: [],
            unchanged: [],
            missing: [],
            errors: []
        };

        // Update existing players
        Object.entries(this.fifaDatabase).forEach(([playerName, playerData]) => {
            if (correctUrls[playerName]) {
                const correct = correctUrls[playerName];
                if (playerData.sofifaUrl !== correct.url || playerData.sofifaId !== correct.id) {
                    playerData.sofifaUrl = correct.url;
                    playerData.sofifaId = correct.id;
                    results.updated.push({
                        name: playerName,
                        newUrl: correct.url,
                        newId: correct.id
                    });
                } else {
                    results.unchanged.push(playerName);
                }
            }
        });

        // Check for missing players
        Object.keys(correctUrls).forEach(playerName => {
            if (!this.fifaDatabase[playerName]) {
                results.missing.push({
                    name: playerName,
                    url: correctUrls[playerName].url,
                    id: correctUrls[playerName].id
                });
            }
        });

        console.log(`✅ URL update complete: ${results.updated.length} updated, ${results.unchanged.length} unchanged, ${results.missing.length} missing`);
        
        if (results.missing.length > 0) {
            console.log('⚠️ Missing players that need to be added:');
            results.missing.forEach(player => {
                console.log(`  - ${player.name}: ${player.url}`);
            });
        }

        return results;
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
                            useLiveData: options.useLiveData
                        });

                        // Merge database player data with FIFA data
                        return {
                            ...dbPlayer,
                            fifaData: fifaData,
                            enhanced: !!fifaData,
                            source: fifaData?.source || 'database_only'
                        };
                    } catch (error) {
                        console.warn(`❌ Failed to enhance player ${dbPlayer.name}:`, error.message);
                        return {
                            ...dbPlayer,
                            fifaData: null,
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
                useLiveData: options.useLiveData
            });

            // If no FIFA data found and we should search SoFIFA
            if (!fifaData && options.useLiveData) {
                fifaData = await this.searchSofifaByName(databasePlayer.name);
            }

            return {
                ...databasePlayer,
                fifaData: fifaData,
                enhanced: !!fifaData,
                enhancedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Error enhancing player ${databasePlayer.name}:`, error.message);
            return {
                ...databasePlayer,
                fifaData: null,
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
#!/usr/bin/env node

// Test script for match deletion functionality
// This script tests database connectivity and the deleteMatch function

// Import required modules from the project's node_modules
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - same as used in the app
const supabaseUrl = 'https://buduldeczjwnjvsckqat.supabase.co';
const supabaseKey = 'sb_publishable_wcOHaKNEW9rQ3anrRNlEpA_r1_wGda3';

const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced deleteMatch function - extracted and adapted for Node.js testing
async function deleteMatch(id) {
    try {
        console.log(`Starting deletion of match ${id}`);
        
        // Input validation
        if (!id || typeof id !== 'number') {
            throw new Error('Invalid match ID provided for deletion');
        }
        
        // 1. Hole alle Infos des Matches - using safe array access instead of .single()
        const { data: matchesArray, error: matchError } = await supabase
            .from('matches')
            .select('date,prizeaek,prizereal,goalslista,goalslistb,manofthematch,yellowa,reda,yellowb,redb')
            .eq('id', id);

        if (matchError) {
            console.error('Error fetching match:', matchError);
            throw matchError;
        }

        if (!matchesArray || matchesArray.length === 0) {
            console.warn(`Match with id ${id} not found`);
            return;
        }

        const match = matchesArray[0];
        console.log(`Deleting match data:`, match);

        // 2. Fetch all transactions for this match BEFORE deleting them
        console.log(`Fetching transactions for match ${id} before deletion`);
        const { data: allMatchTransactions, error: fetchTransError } = await supabase
            .from('transactions')
            .select('team,amount,type')
            .eq('match_id', id);
        
        if (fetchTransError) {
            console.error('Error fetching transactions:', fetchTransError);
            throw fetchTransError;
        }
        
        const matchTransactions = allMatchTransactions || [];
        console.log(`Found ${matchTransactions.length} transactions to reverse:`, matchTransactions.map(t => `${t.type}: ${t.amount} (${t.team})`));

        // 3. Reverse financial changes
        console.log(`Reversing financial changes for ${matchTransactions?.length || 0} transactions`);
        
        if (matchTransactions && matchTransactions.length > 0) {
            for (const trans of matchTransactions) {
                if (trans.type === 'Echtgeld-Ausgleich') {
                    // For debt transactions
                    const { data: teamFinances, error: finError } = await supabase.from('finances').select('debt').eq('team', trans.team);
                    
                    if (finError) {
                        console.error(`Error fetching finances for team ${trans.team}:`, finError);
                        continue;
                    }
                    
                    const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
                    const oldDebt = teamFin?.debt || 0;
                    let newDebt = oldDebt - trans.amount;
                    if (newDebt < 0) newDebt = 0;
                    
                    await supabase.from('finances').update({ debt: newDebt }).eq('team', trans.team);
                    console.log(`Updated debt for ${trans.team}: ${oldDebt} → ${newDebt}`);
                } else {
                    // For other transactions, reverse the balance change
                    const { data: teamFinances, error: finError } = await supabase.from('finances').select('balance').eq('team', trans.team);
                    
                    if (finError) {
                        console.error(`Error fetching finances for team ${trans.team}:`, finError);
                        continue;
                    }
                    
                    const teamFin = teamFinances && teamFinances.length > 0 ? teamFinances[0] : null;
                    const oldBalance = teamFin?.balance || 0;
                    let newBalance = oldBalance - trans.amount;
                    if (newBalance < 0) newBalance = 0;
                    
                    await supabase.from('finances').update({ balance: newBalance }).eq('team', trans.team);
                    console.log(`Updated balance for ${trans.team}: ${oldBalance} → ${newBalance}`);
                }
            }
        }

        // Handle prize money from match data
        if (typeof match.prizeaek === "number" && match.prizeaek !== 0) {
            const { data: aekFinances, error: aekFinError } = await supabase.from('finances').select('balance').eq('team', 'AEK');
            
            if (aekFinError) {
                console.error('Error fetching AEK finances:', aekFinError);
            } else if (aekFinances && aekFinances.length > 0) {
                const aekFin = aekFinances[0];
                let newBal = (aekFin?.balance || 0) - match.prizeaek;
                if (newBal < 0) newBal = 0;
                await supabase.from('finances').update({ balance: newBal }).eq('team', 'AEK');
                console.log(`Reversed AEK prize money: ${match.prizeaek}`);
            }
        }
        if (typeof match.prizereal === "number" && match.prizereal !== 0) {
            const { data: realFinances, error: realFinError } = await supabase.from('finances').select('balance').eq('team', 'Real');
            
            if (realFinError) {
                console.error('Error fetching Real finances:', realFinError);
            } else if (realFinances && realFinances.length > 0) {
                const realFin = realFinances[0];
                let newBal = (realFin?.balance || 0) - match.prizereal;
                if (newBal < 0) newBal = 0;
                await supabase.from('finances').update({ balance: newBal }).eq('team', 'Real');
                console.log(`Reversed Real prize money: ${match.prizereal}`);
            }
        }

        // 4. Delete transactions
        console.log(`Deleting ${matchTransactions?.length || 0} transactions for match ${id}`);
        const { error: transactionError } = await supabase
            .from('transactions')
            .delete()
            .eq('match_id', id);
        
        if (transactionError) {
            console.error('Error deleting transactions:', transactionError);
            throw transactionError;
        }

        // 5. Remove goals from players
        const removeGoals = async (goalslist, team) => {
            if (!goalslist || !Array.isArray(goalslist)) return;
            
            const goalCounts = {};
            
            if (goalslist.length > 0 && typeof goalslist[0] === 'object' && goalslist[0].player !== undefined) {
                // New object format
                goalslist.forEach(goal => {
                    if (goal.player) {
                        goalCounts[goal.player] = (goalCounts[goal.player] || 0) + (goal.count || 1);
                    }
                });
            } else {
                // Old string array format
                for (const playerName of goalslist) {
                    if (!playerName) continue;
                    goalCounts[playerName] = (goalCounts[playerName] || 0) + 1;
                }
            }
            
            // Update each player's goal count
            for (const [playerName, count] of Object.entries(goalCounts)) {
                const { data: players, error: playerError } = await supabase.from('players').select('goals').eq('name', playerName).eq('team', team);
                
                if (playerError) {
                    console.error(`Error fetching player ${playerName} for goal removal:`, playerError);
                    continue;
                }
                
                if (!players || players.length === 0) {
                    console.warn(`Player ${playerName} not found in team ${team} for goal removal`);
                    continue;
                }
                
                const player = players[0];
                let newGoals = (player?.goals || 0) - count;
                if (newGoals < 0) newGoals = 0;
                
                const { error: updateError } = await supabase.from('players').update({ goals: newGoals }).eq('name', playerName).eq('team', team);
                if (updateError) {
                    console.error(`Error updating goals for player ${playerName}:`, updateError);
                } else {
                    console.log(`✅ Updated goals for ${playerName} (${team}): ${player.goals} → ${newGoals}`);
                }
            }
        };
        
        await removeGoals(match.goalslista, "AEK");
        await removeGoals(match.goalslistb, "Real");

        // 6. Update Spieler des Spiels
        if (match.manofthematch) {
            let sdsTeam = null;
            
            // Check if player is in goals list
            const checkPlayerInGoals = (goalsList, playerName) => {
                if (!goalsList || !goalsList.length) return false;
                if (typeof goalsList[0] === 'object' && goalsList[0].player !== undefined) {
                    return goalsList.some(goal => goal.player === playerName);
                }
                return goalsList.includes(playerName);
            };
            
            if (checkPlayerInGoals(match.goalslista, match.manofthematch)) sdsTeam = "AEK";
            else if (checkPlayerInGoals(match.goalslistb, match.manofthematch)) sdsTeam = "Real";
            else {
                // Fallback: check player's team
                const { data: players, error: playerError } = await supabase.from('players').select('team').eq('name', match.manofthematch);
                
                if (playerError) {
                    console.error(`Error fetching player ${match.manofthematch} for team lookup:`, playerError);
                } else if (players && players.length > 0) {
                    sdsTeam = players[0].team;
                } else {
                    console.warn(`Player ${match.manofthematch} not found for SdS team determination`);
                }
            }
            
            if (sdsTeam) {
                const { data: sdsEntries, error: sdsError } = await supabase.from('spieler_des_spiels').select('count').eq('name', match.manofthematch).eq('team', sdsTeam);
                
                if (sdsError) {
                    console.error(`Error fetching SdS entry for ${match.manofthematch}:`, sdsError);
                } else if (sdsEntries && sdsEntries.length > 0) {
                    const sds = sdsEntries[0];
                    const newCount = Math.max(0, sds.count - 1);
                    
                    const { error: updateError } = await supabase.from('spieler_des_spiels').update({ count: newCount }).eq('name', match.manofthematch).eq('team', sdsTeam);
                    if (updateError) {
                        console.error(`Error updating SdS count for ${match.manofthematch}:`, updateError);
                    } else {
                        console.log(`✅ Updated SdS count for ${match.manofthematch} (${sdsTeam}): ${sds.count} → ${newCount}`);
                    }
                } else {
                    console.warn(`SdS entry for ${match.manofthematch} in team ${sdsTeam} not found`);
                }
            }
        }

        // 7. Delete match
        console.log(`Deleting match ${id} from matches table`);
        const { error: deleteError } = await supabase.from('matches').delete().eq('id', id);
        if (deleteError) {
            console.error('Error deleting match:', deleteError);
            throw deleteError;
        }
        
        console.log(`✅ Successfully deleted match ${id} and all related data`);
        
        // Summary
        console.log(`📋 Deletion Summary for Match ${id}:`);
        console.log(`   - Match record: deleted`);
        console.log(`   - Transactions: ${matchTransactions.length} deleted`);
        console.log(`   - Player goals: updated for ${match.goalslista?.length || 0} AEK + ${match.goalslistb?.length || 0} Real goals`);
        console.log(`   - Player of the match: ${match.manofthematch ? 'updated' : 'none'}`);
        console.log(`   - Prize money: AEK ${match.prizeaek || 0}, Real ${match.prizereal || 0} (reversed)`);
        console.log(`   - Match date: ${match.date}`);
        
    } catch (error) {
        console.error(`Failed to delete match ${id}:`, error);
        throw error;
    }
}

// Test functions
async function testDatabaseConnection() {
    console.log('🧪 Testing database connection...');
    try {
        const { data, error } = await supabase.from('matches').select('count', { count: 'exact' });
        if (error) throw error;
        console.log(`✅ Database connected successfully. Found ${data?.[0]?.count || 0} total matches.`);
        return true;
    } catch (error) {
        console.error(`❌ Database connection failed: ${error.message}`);
        return false;
    }
}

async function findMatchesAbove140() {
    console.log('🔍 Finding matches with ID >= 140...');
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('id, date, teama, teamb, goalsa, goalsb')
            .gte('id', 140)
            .order('id');
        if (error) throw error;
        
        console.log(`Found ${matches.length} matches with ID >= 140:`);
        matches.forEach(match => {
            console.log(`  ID ${match.id}: ${match.date} - ${match.teama} ${match.goalsa} vs ${match.goalsb} ${match.teamb}`);
        });
        
        return matches;
    } catch (error) {
        console.error(`❌ Error finding matches >= 140: ${error.message}`);
        return [];
    }
}

async function bulkDeleteMatches() {
    console.log('🔥 BULK DELETE: Starting deletion of all matches with ID >= 140...');
    
    try {
        const matches = await findMatchesAbove140();
        
        if (matches.length === 0) {
            console.log('✅ No matches found with ID >= 140');
            return;
        }
        
        console.log(`⚠️ Will delete ${matches.length} matches and all related data...`);
        
        let deletedCount = 0;
        let errorCount = 0;
        
        for (const match of matches) {
            try {
                console.log(`\n--- Deleting match ${match.id} ---`);
                await deleteMatch(match.id);
                deletedCount++;
                console.log(`✅ Successfully deleted match ${match.id}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to delete match ${match.id}: ${error.message}`);
            }
        }
        
        console.log(`\n📋 BULK DELETE SUMMARY:`);
        console.log(`✅ Successfully deleted: ${deletedCount} matches`);
        if (errorCount > 0) {
            console.log(`❌ Failed to delete: ${errorCount} matches`);
        }
        
    } catch (error) {
        console.error(`❌ Error in bulk delete: ${error.message}`);
    }
}

// Main execution
async function main() {
    console.log('🏗️ Match Deletion Test Script');
    console.log('=====================================\n');
    
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
        console.log('❌ Cannot proceed without database connection');
        process.exit(1);
    }
    
    console.log('\n');
    
    // Find matches that would be deleted
    const matches = await findMatchesAbove140();
    
    if (matches.length === 0) {
        console.log('✅ No matches found with ID >= 140. Nothing to delete.');
        process.exit(0);
    }
    
    console.log('\n⚠️ WARNING: This script will delete ALL matches with ID >= 140!');
    console.log('This includes:');
    console.log('- Match records');
    console.log('- All related transactions');
    console.log('- Reversal of financial changes');
    console.log('- Player goal adjustments');
    console.log('- Spieler des Spiels adjustments');
    
    // Interactive confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const askQuestion = (question) => {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer.trim().toLowerCase());
            });
        });
    };
    
    const confirm1 = await askQuestion('\nDo you want to proceed with the bulk deletion? (yes/no): ');
    if (confirm1 !== 'yes') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
    }
    
    const confirm2 = await askQuestion('FINAL CONFIRMATION: Type "DELETE" to proceed: ');
    if (confirm2 !== 'delete') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
    }
    
    rl.close();
    
    // Execute bulk delete
    await bulkDeleteMatches();
    
    console.log('\n✅ Script completed.');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Match Deletion Test Script');
    console.log('Usage:');
    console.log('  node test-match-deletion-node.js           # Interactive bulk delete');
    console.log('  node test-match-deletion-node.js --test    # Test connection only');
    console.log('  node test-match-deletion-node.js --find    # Find matches >= 140');
    process.exit(0);
} else if (args.includes('--test')) {
    testDatabaseConnection().then(() => process.exit(0));
} else if (args.includes('--find')) {
    testDatabaseConnection().then(async (connected) => {
        if (connected) {
            await findMatchesAbove140();
        }
        process.exit(0);
    });
} else {
    // Run main interactive script
    main().catch(console.error);
}

export { deleteMatch, testDatabaseConnection, findMatchesAbove140, bulkDeleteMatches };
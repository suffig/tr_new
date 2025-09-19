// Bulk deletion script for matches with ID >= 140
// This script deletes all matches starting from ID 140 and their related data

import { deleteMatch } from './matches.js';
import { supabase } from './supabaseClient.js';

/**
 * Find all matches with ID >= 140
 */
async function findMatchesAbove140() {
    console.log('🔍 Finding matches with ID >= 140...');
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('id, date, teama, teamb, goalsa, goalsb, manofthematch')
            .gte('id', 140)
            .order('id');
        
        if (error) {
            console.error('Error finding matches:', error);
            throw error;
        }
        
        console.log(`Found ${matches.length} matches with ID >= 140:`);
        matches.forEach(match => {
            console.log(`  ID ${match.id}: ${match.date} - ${match.teama} ${match.goalsa} vs ${match.goalsb} ${match.teamb} (MoM: ${match.manofthematch || 'none'})`);
        });
        
        // Also check related data
        if (matches.length > 0) {
            const matchIds = matches.map(m => m.id);
            
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select('id, match_id, type, amount, team')
                .in('match_id', matchIds);
                
            if (!transError && transactions) {
                console.log(`Found ${transactions.length} related transactions for these matches`);
                
                // Group by match for better overview
                const transactionsByMatch = {};
                transactions.forEach(t => {
                    if (!transactionsByMatch[t.match_id]) {
                        transactionsByMatch[t.match_id] = [];
                    }
                    transactionsByMatch[t.match_id].push(t);
                });
                
                Object.entries(transactionsByMatch).forEach(([matchId, trans]) => {
                    console.log(`    Match ${matchId}: ${trans.length} transactions (${trans.map(t => `${t.type}: ${t.amount} (${t.team})`).join(', ')})`);
                });
            }
        }
        
        return matches;
    } catch (error) {
        console.error(`❌ Error finding matches >= 140: ${error.message}`);
        throw error;
    }
}

/**
 * Execute bulk deletion of all matches with ID >= 140
 */
async function bulkDeleteMatches() {
    console.log('🔥 BULK DELETE: Starting deletion of all matches with ID >= 140...');
    console.log('================================================================================');
    
    try {
        const matches = await findMatchesAbove140();
        
        if (matches.length === 0) {
            console.log('✅ No matches found with ID >= 140. Nothing to delete.');
            return { deleted: 0, failed: 0 };
        }
        
        console.log(`\n⚠️ WARNING: About to delete ${matches.length} matches and ALL related data!`);
        console.log('This includes:');
        console.log('- Match records');
        console.log('- All related transactions (Preisgeld, Bonus SdS, Echtgeld-Ausgleich, etc.)');
        console.log('- Reversal of financial changes to team balances');
        console.log('- Player goal adjustments');
        console.log('- Spieler des Spiels (SdS) count adjustments');
        console.log('');
        
        let deletedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            console.log(`\n[${i + 1}/${matches.length}] Deleting match ${match.id}: ${match.date} - ${match.teama} vs ${match.teamb}`);
            
            try {
                await deleteMatch(match.id);
                deletedCount++;
                console.log(`✅ Successfully deleted match ${match.id}`);
            } catch (error) {
                errorCount++;
                const errorMsg = `Failed to delete match ${match.id}: ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }
        
        console.log('\n================================================================================');
        console.log('📋 BULK DELETE SUMMARY:');
        console.log(`✅ Successfully deleted: ${deletedCount} matches`);
        if (errorCount > 0) {
            console.log(`❌ Failed to delete: ${errorCount} matches`);
            console.log('\nErrors encountered:');
            errors.forEach(error => console.log(`  - ${error}`));
        }
        console.log('================================================================================');
        
        return { deleted: deletedCount, failed: errorCount, errors };
        
    } catch (error) {
        console.error(`❌ Fatal error in bulk delete: ${error.message}`);
        throw error;
    }
}

/**
 * Main execution function with interactive confirmation
 */
async function main() {
    console.log('🗂️ Match Bulk Deletion Tool (ID >= 140)');
    console.log('=========================================\n');
    
    try {
        // Test database connection first
        console.log('📡 Testing database connection...');
        const { data, error } = await supabase.from('matches').select('count', { count: 'exact' });
        if (error) throw error;
        console.log(`✅ Connected to database. Found ${data?.[0]?.count || 0} total matches.\n`);
        
        // Find and preview matches to be deleted
        const matches = await findMatchesAbove140();
        
        if (matches.length === 0) {
            console.log('\n✅ No matches found with ID >= 140. Script completed successfully.');
            return;
        }
        
        console.log('\n⚠️ IMPORTANT WARNINGS:');
        console.log('1. This operation is IRREVERSIBLE!');
        console.log('2. Make sure you have a database backup!');
        console.log('3. All related data (transactions, financial changes, player stats) will be affected!');
        console.log('4. This will comprehensively clean up ALL associated data for each match.');
        
        // In browser environment, use confirm dialogs
        if (typeof window !== 'undefined') {
            const confirm1 = confirm(`⚠️ DELETE ${matches.length} matches with ID >= 140?\n\nThis will also delete all related transactions, reverse financial changes, and adjust player statistics.\n\nThis action cannot be undone!\n\nClick OK to continue, Cancel to abort.`);
            if (!confirm1) {
                console.log('Operation cancelled by user.');
                return;
            }
            
            const confirm2 = confirm(`FINAL CONFIRMATION:\n\nYou are about to permanently delete ${matches.length} matches and all their related data.\n\nType OK to proceed or Cancel to abort.`);
            if (!confirm2) {
                console.log('Operation cancelled by user.');
                return;
            }
        } else {
            // In Node.js environment, log warning and proceed (since we can't easily do interactive prompts)
            console.log('\n🚨 PROCEEDING WITH BULK DELETE (Script execution mode)');
            console.log('If you want to cancel, stop the script now with Ctrl+C');
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
        
        // Execute bulk delete
        const result = await bulkDeleteMatches();
        
        console.log(`\n🏁 Script completed. Deleted ${result.deleted} matches successfully.`);
        if (result.failed > 0) {
            console.log(`⚠️ ${result.failed} matches failed to delete. Check logs above for details.`);
        }
        
    } catch (error) {
        console.error(`💥 Script failed: ${error.message}`);
        console.error('Stack trace:', error.stack);
    }
}

// Export functions for use in other modules
export { findMatchesAbove140, bulkDeleteMatches, main };

// If running directly (in browser or as script), execute main
if (typeof window !== 'undefined') {
    // Browser environment - make functions available globally
    window.findMatchesAbove140 = findMatchesAbove140;
    window.bulkDeleteMatches = bulkDeleteMatches;
    window.bulkDeleteMain = main;
} else if (import.meta.url === `file://${process.argv[1]}`) {
    // Node.js environment - run main if script is executed directly
    main().catch(console.error);
}
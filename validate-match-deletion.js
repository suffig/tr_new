// Manual validation script for match deletion functionality
// This script helps validate that the deleteMatch function works correctly
// without accidentally deleting important data

import { supabase } from './supabaseClient.js';

async function validateMatchDeletion() {
    console.log('🔍 Match Deletion Validation Tool');
    console.log('=====================================\n');
    
    try {
        // Step 1: Check database connectivity
        console.log('📡 Checking database connectivity...');
        const { data: testData, error: testError } = await supabase.from('matches').select('count', { count: 'exact' });
        if (testError) throw testError;
        console.log(`✅ Connected to database. Found ${testData?.[0]?.count || 0} matches total.\n`);
        
        // Step 2: Find matches with associated data
        console.log('🔍 Analyzing matches with associated data...');
        
        const { data: matchesWithTransactions, error: transError } = await supabase
            .from('transactions')
            .select('match_id, type, amount, team')
            .not('match_id', 'is', null)
            .order('match_id');
            
        if (transError) throw transError;
        
        // Group transactions by match
        const transactionsByMatch = {};
        if (matchesWithTransactions) {
            matchesWithTransactions.forEach(t => {
                if (!transactionsByMatch[t.match_id]) {
                    transactionsByMatch[t.match_id] = [];
                }
                transactionsByMatch[t.match_id].push(t);
            });
        }
        
        console.log(`Found ${Object.keys(transactionsByMatch).length} matches with transactions:`);
        Object.entries(transactionsByMatch).forEach(([matchId, transactions]) => {
            console.log(`  Match ${matchId}: ${transactions.length} transactions`);
            transactions.forEach(t => {
                console.log(`    - ${t.type}: ${t.amount} (${t.team})`);
            });
        });
        
        // Step 3: Get match details for matches with transactions
        if (Object.keys(transactionsByMatch).length > 0) {
            console.log('\n📊 Match details:');
            const matchIds = Object.keys(transactionsByMatch);
            const { data: matches, error: matchError } = await supabase
                .from('matches')
                .select('id, date, teama, teamb, goalsa, goalsb, prizeaek, prizereal, manofthematch')
                .in('id', matchIds)
                .order('id');
                
            if (matchError) throw matchError;
            
            if (matches) {
                matches.forEach(match => {
                    console.log(`  Match ${match.id} (${match.date}): ${match.teama} ${match.goalsa} - ${match.goalsb} ${match.teamb}`);
                    console.log(`    Prizes: AEK ${match.prizeaek || 0}, Real ${match.prizereal || 0}`);
                    console.log(`    Man of Match: ${match.manofthematch || 'none'}`);
                });
            }
        }
        
        // Step 4: Check team finances before any deletion
        console.log('\n💰 Current team finances:');
        const { data: finances, error: finError } = await supabase
            .from('finances')
            .select('team, balance, debt')
            .order('team');
            
        if (finError) throw finError;
        
        if (finances) {
            finances.forEach(f => {
                console.log(`  ${f.team}: Balance ${f.balance}, Debt ${f.debt}`);
            });
        }
        
        // Step 5: Instructions for manual testing
        console.log('\n🧪 Manual Testing Instructions:');
        console.log('=====================================');
        console.log('To test match deletion safely:');
        console.log('');
        console.log('1. CREATE A BACKUP of your database first!');
        console.log('');
        console.log('2. If you want to test with real data:');
        if (Object.keys(transactionsByMatch).length > 0) {
            const testMatchId = Object.keys(transactionsByMatch)[0];
            console.log(`   - Consider testing with match ID ${testMatchId}`);
            console.log(`   - This match has ${transactionsByMatch[testMatchId].length} transactions`);
            console.log('');
            console.log('3. To test deletion:');
            console.log('   - Open browser console');
            console.log('   - Navigate to the matches page');
            console.log(`   - Delete match ${testMatchId} through the UI`);
            console.log('   - Watch console output for detailed deletion logs');
            console.log('');
            console.log('4. Verify deletion worked:');
            console.log(`   - Refresh page and confirm match ${testMatchId} is gone`);
            console.log('   - Check that team finances have been adjusted correctly');
            console.log('   - Check that player goals have been adjusted correctly');
        } else {
            console.log('   - No matches with transactions found');
            console.log('   - Create a test match with transactions first');
            console.log('   - Then test deletion');
        }
        
        console.log('\n✅ Validation complete. Review the data above before testing.');
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    validateMatchDeletion().catch(console.error);
}

export { validateMatchDeletion };
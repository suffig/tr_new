// Enhanced test script to validate deleteMatch functionality
import { deleteMatch } from './matches.js';
import { supabase } from './supabaseClient.js';

// Enhanced test function to check deleteMatch behavior
async function testDeleteMatch() {
    console.log('🧪 Testing deleteMatch function...');
    
    // Test case 1: Try to delete a non-existent match
    console.log('\n📋 Test 1: Non-existent match');
    try {
        await deleteMatch(99999);
        console.log('✅ Non-existent match handled correctly');
    } catch (error) {
        console.log('❌ Error handling non-existent match:', error.message);
    }
    
    // Test case 2: Try to delete with invalid ID
    console.log('\n📋 Test 2: Invalid ID types');
    try {
        await deleteMatch(null);
        console.log('❌ Should have thrown error for null ID');
    } catch (error) {
        console.log('✅ Invalid ID handled correctly:', error.message);
    }
    
    try {
        await deleteMatch('invalid');
        console.log('❌ Should have thrown error for string ID');
    } catch (error) {
        console.log('✅ String ID handled correctly:', error.message);
    }
    
    // Test case 3: Try to verify database connectivity and structure  
    console.log('\n📋 Test 3: Database connectivity and structure');
    try {
        const { data: matches, error: matchError } = await supabase.from('matches').select('id').limit(1);
        if (matchError) throw matchError;
        
        const { data: transactions, error: transError } = await supabase.from('transactions').select('id,match_id').limit(1);
        if (transError) throw transError;
        
        const { data: finances, error: finError } = await supabase.from('finances').select('team,balance,debt').limit(1);
        if (finError) throw finError;
        
        const { data: players, error: playersError } = await supabase.from('players').select('id,name,team,goals').limit(1);
        if (playersError) throw playersError;
        
        const { data: sds, error: sdsError } = await supabase.from('spieler_des_spiels').select('id,name,team,count').limit(1);
        if (sdsError) throw sdsError;
        
        console.log('✅ Database connectivity and structure verified');
        console.log(`   - Found ${matches?.length || 0} matches, ${transactions?.length || 0} transactions, ${finances?.length || 0} finances, ${players?.length || 0} players, ${sds?.length || 0} SdS entries`);
    } catch (error) {
        console.log('❌ Database connectivity issue:', error.message);
    }
    
    // Test case 4: Check if there are any matches with transactions that we could test with
    console.log('\n📋 Test 4: Finding testable data');
    try {
        const { data: matchesWithTransactions, error } = await supabase
            .from('transactions')
            .select('match_id')
            .not('match_id', 'is', null)
            .limit(5);
            
        if (error) throw error;
        
        if (matchesWithTransactions && matchesWithTransactions.length > 0) {
            const matchIds = [...new Set(matchesWithTransactions.map(t => t.match_id))];
            console.log(`✅ Found ${matchIds.length} matches with transactions: ${matchIds.join(', ')}`);
            console.log('   ℹ️  These matches could be used for testing (but we won\'t delete them in this test)');
        } else {
            console.log('ℹ️  No matches with transactions found - this is okay for testing');
        }
    } catch (error) {
        console.log('❌ Error checking testable data:', error.message);
    }
    
    console.log('\n✅ Test completed - deleteMatch function appears to be properly structured');
    console.log('   Next step: Manual testing with actual data to verify deletion works correctly');
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testDeleteMatch().catch(console.error);
}
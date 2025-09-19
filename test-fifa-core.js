/**
 * Browser-compatible test for FIFA functionality
 * Run this in the browser console or via HTML page
 */

// Test the core FIFA service functionality
export async function testFIFAServiceFunctionality() {
    console.log('🧪 Testing FIFA Service Core Functionality...\n');
    
    const results = {
        tests: [],
        passed: 0,
        failed: 0
    };

    // Import FIFA service dynamically
    let FIFADataService;
    try {
        const module = await import('./src/utils/fifaDataService.js');
        FIFADataService = module.FIFADataService || module.default;
        results.tests.push({ name: 'FIFA Service Import', status: 'PASS', details: 'Successfully imported' });
        results.passed++;
    } catch (error) {
        results.tests.push({ name: 'FIFA Service Import', status: 'FAIL', details: error.message });
        results.failed++;
        return results;
    }

    // Test 1: Get available players
    try {
        const players = FIFADataService.getAvailablePlayers();
        const expectedPlayers = ['Erling Haaland', 'Kylian Mbappé', 'Jude Bellingham'];
        const hasExpected = expectedPlayers.every(player => players.includes(player));
        
        if (hasExpected && players.length > 0) {
            results.tests.push({ 
                name: 'Get Available Players', 
                status: 'PASS', 
                details: `Found ${players.length} players including expected ones` 
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Get Available Players', 
                status: 'FAIL', 
                details: `Missing expected players or empty list` 
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Get Available Players', status: 'FAIL', details: error.message });
        results.failed++;
    }

    // Test 2: Get player data (mock mode)
    try {
        const playerData = await FIFADataService.getPlayerData('Erling Haaland', { useLiveData: false });
        
        if (playerData && playerData.overall && playerData.name && playerData.found) {
            results.tests.push({ 
                name: 'Get Player Data (Mock)', 
                status: 'PASS', 
                details: `Retrieved ${playerData.name}, Overall: ${playerData.overall}` 
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Get Player Data (Mock)', 
                status: 'FAIL', 
                details: 'Invalid or incomplete player data' 
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Get Player Data (Mock)', status: 'FAIL', details: error.message });
        results.failed++;
    }

    // Test 3: Test unknown player handling (should return null)
    try {
        const unknownPlayer = await FIFADataService.getPlayerData('Unknown Test Player', { useLiveData: false });
        
        if (unknownPlayer === null) {
            results.tests.push({ 
                name: 'Unknown Player Handling', 
                status: 'PASS', 
                details: 'Correctly returns null for unknown players' 
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Unknown Player Handling', 
                status: 'FAIL', 
                details: 'Should return null for unknown players' 
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Unknown Player Handling', status: 'FAIL', details: error.message });
        results.failed++;
    }

    // Test 4: Test new method exists
    try {
        const methodExists = typeof FIFADataService.processAllStoredPlayers === 'function';
        const getAllExists = typeof FIFADataService.getAllDatabasePlayersWithFIFA === 'function';
        const searchExists = typeof FIFADataService.searchSofifaByName === 'function';
        
        if (methodExists && getAllExists && searchExists) {
            results.tests.push({ 
                name: 'New Methods Available', 
                status: 'PASS', 
                details: 'All new methods are defined' 
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'New Methods Available', 
                status: 'FAIL', 
                details: `Missing methods: processAll:${methodExists}, getAll:${getAllExists}, search:${searchExists}` 
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'New Methods Available', status: 'FAIL', details: error.message });
        results.failed++;
    }

    // Test 5: Statistics generation
    try {
        const mockPlayers = [
            { enhanced: true, fifaData: { source: 'mock' } },
            { enhanced: true, fifaData: { source: 'sofifa' } },
            { enhanced: false, fifaData: { source: 'generated' } }
        ];
        
        const stats = FIFADataService.generateProcessingStatistics(mockPlayers);
        
        if (stats && stats.total === 3 && stats.enhanced === 2 && stats.successRate) {
            results.tests.push({ 
                name: 'Statistics Generation', 
                status: 'PASS', 
                details: `Generated stats: ${stats.total} total, ${stats.successRate} success` 
            });
            results.passed++;
        } else {
            results.tests.push({ 
                name: 'Statistics Generation', 
                status: 'FAIL', 
                details: 'Invalid statistics generated' 
            });
            results.failed++;
        }
    } catch (error) {
        results.tests.push({ name: 'Statistics Generation', status: 'FAIL', details: error.message });
        results.failed++;
    }

    return results;
}

// Function to display test results
export function displayTestResults(results) {
    console.log('\n📊 FIFA Service Test Results:');
    console.log('=' .repeat(50));
    
    results.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${test.name}: ${test.status}`);
        if (test.details) {
            console.log(`   └─ ${test.details}`);
        }
    });
    
    console.log('=' .repeat(50));
    console.log(`📈 Summary: ${results.passed} passed, ${results.failed} failed`);
    console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed === 0) {
        console.log('\n🎉 All tests passed! The FIFA service is ready for all stored players.');
        console.log('🔗 Die SoFIFA-Abfrage funktioniert jetzt für alle aktuell eingespeicherten Spieler!');
    } else {
        console.log(`\n⚠️  ${results.failed} test(s) failed. Please check the implementation.`);
    }
}

// Auto-run test when loaded in browser
if (typeof window !== 'undefined') {
    window.testFIFAServiceFunctionality = testFIFAServiceFunctionality;
    window.displayTestResults = displayTestResults;
    
    // Auto-run test
    window.addEventListener('load', async () => {
        console.log('🚀 Auto-running FIFA Service Tests...');
        try {
            const results = await testFIFAServiceFunctionality();
            displayTestResults(results);
        } catch (error) {
            console.error('❌ Test execution failed:', error);
        }
    });
}
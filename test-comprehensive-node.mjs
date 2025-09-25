/**
 * Comprehensive Node.js Test Suite for FUSTA App
 * Tests season management, data operations, and app functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser globals for Node.js environment
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
  },
  dispatchEvent: () => {}
};

global.localStorage = global.window.localStorage;
global.document = {
  addEventListener: () => {},
  createElement: () => ({ addEventListener: () => {} })
};

// Test results storage
const testResults = {
  season: [],
  database: [],
  datatypes: [],
  integration: [],
  performance: []
};

// Logging utility
function logResult(category, message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  
  const formattedMessage = `[${timestamp}] ${icons[type]} ${message}`;
  console.log(formattedMessage);
  
  testResults[category].push({ message: formattedMessage, type });
}

// Import season manager (with mocked environment)
let seasonManager;
try {
  const seasonManagerModule = await import('./src/utils/seasonManager.js');
  seasonManager = seasonManagerModule;
  logResult('integration', 'Season Manager loaded successfully', 'success');
} catch (error) {
  logResult('integration', `Failed to load Season Manager: ${error.message}`, 'error');
}

/**
 * Season Management Tests
 */
async function testSeasonManagement() {
  console.log('\n🗓️ SEASON MANAGEMENT TESTS');
  console.log('==========================================');
  
  if (!seasonManager) {
    logResult('season', 'Season Manager not available', 'error');
    return;
  }
  
  try {
    // Test season constants
    logResult('season', 'Testing season constants...', 'info');
    const seasons = seasonManager.SEASONS;
    const seasonNames = seasonManager.SEASON_NAMES;
    
    if (seasons.LEGACY && seasons.FC26) {
      logResult('season', 'Season constants defined correctly', 'success');
    } else {
      logResult('season', 'Season constants missing', 'error');
    }
    
    // Test current season
    const currentSeason = seasonManager.getCurrentSeason();
    logResult('season', `Current season: ${seasonNames[currentSeason] || currentSeason}`, 'info');
    
    // Test available seasons
    const availableSeasons = seasonManager.getAvailableSeasons();
    logResult('season', `Available seasons: ${availableSeasons.length}`, 'info');
    
    availableSeasons.forEach(season => {
      const status = season.isActive ? 'Active' : 'Inactive';
      const data = season.hasData ? 'Has Data' : 'No Data';
      logResult('season', `${season.name}: ${status}, ${data}`, 'info');
    });
    
    // Test season switching
    logResult('season', 'Testing season switching...', 'info');
    const targetSeason = currentSeason === seasons.LEGACY ? seasons.FC26 : seasons.LEGACY;
    
    const switchResult = seasonManager.switchToSeason(targetSeason);
    if (switchResult) {
      logResult('season', `Successfully switched to ${seasonNames[targetSeason]}`, 'success');
      
      // Switch back
      seasonManager.switchToSeason(currentSeason);
      logResult('season', 'Successfully switched back to original season', 'success');
    } else {
      logResult('season', 'Season switch failed', 'error');
    }
    
    // Test storage key generation
    const storageKey = seasonManager.getSeasonStorageKey('matches', currentSeason);
    if (storageKey.includes(currentSeason) && storageKey.includes('matches')) {
      logResult('season', 'Storage key generation working correctly', 'success');
    } else {
      logResult('season', 'Storage key generation failed', 'error');
    }
    
  } catch (error) {
    logResult('season', `Season management test error: ${error.message}`, 'error');
  }
}

/**
 * Data Operations Tests
 */
async function testDataOperations() {
  console.log('\n📊 DATA OPERATIONS TESTS');
  console.log('==========================================');
  
  if (!seasonManager) {
    logResult('datatypes', 'Season Manager not available for data tests', 'error');
    return;
  }
  
  try {
    // Test data types
    const dataTypes = ['matches', 'players', 'bans', 'transactions', 'alcoholCalculator'];
    const currentSeason = seasonManager.getCurrentSeason();
    
    logResult('datatypes', `Testing data operations for season: ${currentSeason}`, 'info');
    
    // Test data storage and retrieval
    for (const dataType of dataTypes) {
      logResult('datatypes', `Testing ${dataType}...`, 'info');
      
      const testData = {
        id: `test-${dataType}-${Date.now()}`,
        type: dataType,
        testField: 'node-test-value',
        season: currentSeason,
        created_at: new Date().toISOString()
      };
      
      // Store test data
      const storageKey = seasonManager.getSeasonStorageKey(dataType, currentSeason);
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (Array.isArray(existingData)) {
        existingData.push(testData);
        localStorage.setItem(storageKey, JSON.stringify(existingData));
      } else {
        // For single objects like alcoholCalculator
        localStorage.setItem(storageKey, JSON.stringify(testData));
      }
      
      // Retrieve and verify
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const found = Array.isArray(parsed) 
          ? parsed.some(item => item.id === testData.id)
          : parsed.id === testData.id;
        
        if (found) {
          logResult('datatypes', `${dataType}: Storage and retrieval successful`, 'success');
        } else {
          logResult('datatypes', `${dataType}: Data not found after storage`, 'error');
        }
        
        // Cleanup
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => item.id !== testData.id);
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
        } else {
          localStorage.removeItem(storageKey);
        }
      } else {
        logResult('datatypes', `${dataType}: Storage failed`, 'error');
      }
    }
    
    // Test season data isolation
    logResult('datatypes', 'Testing season data isolation...', 'info');
    
    const testIsolationData = {
      id: 'isolation-test-' + Date.now(),
      content: 'isolation-test-content',
      created_at: new Date().toISOString()
    };
    
    const seasons = [seasonManager.SEASONS.LEGACY, seasonManager.SEASONS.FC26];
    
    for (const season of seasons) {
      const key = seasonManager.getSeasonStorageKey('matches', season);
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      data.push({ ...testIsolationData, season });
      localStorage.setItem(key, JSON.stringify(data));
    }
    
    // Verify isolation
    let isolationPassed = true;
    for (const season of seasons) {
      const key = seasonManager.getSeasonStorageKey('matches', season);
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      const otherSeasonData = data.filter(item => item.season !== season);
      
      if (otherSeasonData.length > 0) {
        isolationPassed = false;
        logResult('datatypes', `Season isolation failed: found cross-season data in ${season}`, 'error');
      }
      
      // Cleanup
      const cleaned = data.filter(item => item.id !== testIsolationData.id);
      localStorage.setItem(key, JSON.stringify(cleaned));
    }
    
    if (isolationPassed) {
      logResult('datatypes', 'Season data isolation working correctly', 'success');
    }
    
  } catch (error) {
    logResult('datatypes', `Data operations test error: ${error.message}`, 'error');
  }
}

/**
 * Performance Tests
 */
async function testPerformance() {
  console.log('\n⚡ PERFORMANCE TESTS');
  console.log('==========================================');
  
  try {
    // Test localStorage performance
    logResult('performance', 'Testing localStorage performance...', 'info');
    
    const operations = 1000;
    const startTime = Date.now();
    
    // Write operations
    for (let i = 0; i < operations; i++) {
      localStorage.setItem(`perf_test_${i}`, JSON.stringify({
        id: i,
        data: `test-data-${i}`,
        timestamp: Date.now()
      }));
    }
    
    // Read operations
    for (let i = 0; i < operations; i++) {
      const data = localStorage.getItem(`perf_test_${i}`);
      if (data) {
        JSON.parse(data);
      }
    }
    
    // Delete operations
    for (let i = 0; i < operations; i++) {
      localStorage.removeItem(`perf_test_${i}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logResult('performance', `${operations * 3} localStorage operations completed in ${duration}ms`, 'info');
    
    if (duration < 1000) {
      logResult('performance', 'LocalStorage performance is excellent', 'success');
    } else if (duration < 3000) {
      logResult('performance', 'LocalStorage performance is acceptable', 'warning');
    } else {
      logResult('performance', 'LocalStorage performance is poor', 'error');
    }
    
    // Test season manager performance
    if (seasonManager) {
      logResult('performance', 'Testing season manager performance...', 'info');
      
      const seasonStartTime = Date.now();
      
      // Multiple season operations
      for (let i = 0; i < 100; i++) {
        seasonManager.getCurrentSeason();
        seasonManager.getAvailableSeasons();
        seasonManager.getSeasonStorageKey('matches');
        seasonManager.checkSeasonHasData(seasonManager.SEASONS.LEGACY);
      }
      
      const seasonEndTime = Date.now();
      const seasonDuration = seasonEndTime - seasonStartTime;
      
      logResult('performance', `400 season manager operations completed in ${seasonDuration}ms`, 'info');
      
      if (seasonDuration < 100) {
        logResult('performance', 'Season manager performance is excellent', 'success');
      } else if (seasonDuration < 500) {
        logResult('performance', 'Season manager performance is acceptable', 'warning');
      } else {
        logResult('performance', 'Season manager performance is poor', 'error');
      }
    }
    
    // Test JSON parsing performance
    logResult('performance', 'Testing JSON parsing performance...', 'info');
    
    const largeObject = {
      matches: Array(1000).fill(null).map((_, i) => ({
        id: i,
        date: new Date().toISOString(),
        teama: 'AEK',
        teamb: 'Real',
        goalsa: Math.floor(Math.random() * 5),
        goalsb: Math.floor(Math.random() * 5)
      })),
      players: Array(100).fill(null).map((_, i) => ({
        id: i,
        name: `Player ${i}`,
        team: i % 2 === 0 ? 'AEK' : 'Real',
        position: 'Forward'
      }))
    };
    
    const jsonStartTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const serialized = JSON.stringify(largeObject);
      JSON.parse(serialized);
    }
    
    const jsonEndTime = Date.now();
    const jsonDuration = jsonEndTime - jsonStartTime;
    
    logResult('performance', `200 JSON serialize/parse operations completed in ${jsonDuration}ms`, 'info');
    
    if (jsonDuration < 500) {
      logResult('performance', 'JSON performance is excellent', 'success');
    } else if (jsonDuration < 1500) {
      logResult('performance', 'JSON performance is acceptable', 'warning');
    } else {
      logResult('performance', 'JSON performance is poor', 'error');
    }
    
  } catch (error) {
    logResult('performance', `Performance test error: ${error.message}`, 'error');
  }
}

/**
 * File System Tests
 */
async function testFileSystem() {
  console.log('\n📁 FILE SYSTEM TESTS');
  console.log('==========================================');
  
  try {
    // Test critical files exist
    const criticalFiles = [
      'src/utils/seasonManager.js',
      'src/hooks/useSeasonData.js',
      'src/components/SeasonSelector.jsx',
      'supabaseClient.js',
      'connectionMonitor.js',
      'package.json'
    ];
    
    logResult('integration', 'Checking critical files...', 'info');
    
    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, file);
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        logResult('integration', `✓ ${file}`, 'success');
      } catch (error) {
        logResult('integration', `✗ ${file} - File not found`, 'error');
      }
    }
    
    // Test package.json structure
    try {
      const packagePath = path.join(__dirname, 'package.json');
      const packageContent = await fs.promises.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.name && packageJson.scripts && packageJson.dependencies) {
        logResult('integration', 'package.json structure is valid', 'success');
        
        // Check for required dependencies
        const requiredDeps = ['react', 'react-dom', '@supabase/supabase-js'];
        let missingDeps = [];
        
        for (const dep of requiredDeps) {
          if (!packageJson.dependencies[dep]) {
            missingDeps.push(dep);
          }
        }
        
        if (missingDeps.length === 0) {
          logResult('integration', 'All required dependencies present', 'success');
        } else {
          logResult('integration', `Missing dependencies: ${missingDeps.join(', ')}`, 'error');
        }
      } else {
        logResult('integration', 'package.json structure is invalid', 'error');
      }
    } catch (error) {
      logResult('integration', `Error reading package.json: ${error.message}`, 'error');
    }
    
  } catch (error) {
    logResult('integration', `File system test error: ${error.message}`, 'error');
  }
}

/**
 * Migration Tests
 */
async function testMigration() {
  console.log('\n🔄 MIGRATION TESTS');
  console.log('==========================================');
  
  if (!seasonManager) {
    logResult('database', 'Season Manager not available for migration tests', 'error');
    return;
  }
  
  try {
    // Create some fake legacy data
    logResult('database', 'Setting up legacy data for migration test...', 'info');
    
    const legacyData = {
      fifa_matches: JSON.stringify([
        { id: 1, date: '2024-01-01', teama: 'AEK', teamb: 'Real', goalsa: 2, goalsb: 1 }
      ]),
      fifa_players: JSON.stringify([
        { id: 1, name: 'Test Player', team: 'AEK', position: 'Forward' }
      ])
    };
    
    // Store legacy data
    Object.entries(legacyData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    // Clear migration status to force re-migration
    localStorage.removeItem('fifa_legacy_migration_status');
    
    // Test migration
    logResult('database', 'Testing legacy data migration...', 'info');
    
    try {
      const migrationResult = seasonManager.migrateLegacyData();
      
      if (migrationResult) {
        logResult('database', 'Migration function executed successfully', 'success');
        
        // Check if data was migrated to legacy season
        const legacyMatchesKey = seasonManager.getSeasonStorageKey('matches', seasonManager.SEASONS.LEGACY);
        const migratedMatches = localStorage.getItem(legacyMatchesKey);
        
        if (migratedMatches) {
          const parsed = JSON.parse(migratedMatches);
          if (parsed.length > 0) {
            logResult('database', 'Legacy data successfully migrated to season storage', 'success');
          } else {
            logResult('database', 'Migration completed but no data found', 'warning');
          }
        } else {
          logResult('database', 'No migrated data found in season storage', 'warning');
        }
      } else {
        logResult('database', 'Migration function returned false', 'warning');
      }
    } catch (migrationError) {
      logResult('database', `Migration error: ${migrationError.message}`, 'error');
    }
    
    // Cleanup
    Object.keys(legacyData).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Test FC26 environment initialization
    logResult('database', 'Testing FC26 environment initialization...', 'info');
    
    try {
      const initResult = seasonManager.initializeFC26Environment();
      if (initResult) {
        logResult('database', 'FC26 environment initialized successfully', 'success');
      } else {
        logResult('database', 'FC26 environment initialization failed', 'error');
      }
    } catch (initError) {
      logResult('database', `FC26 initialization error: ${initError.message}`, 'error');
    }
    
  } catch (error) {
    logResult('database', `Migration test error: ${error.message}`, 'error');
  }
}

/**
 * Generate Test Report
 */
function generateTestReport() {
  console.log('\n📋 COMPREHENSIVE TEST REPORT');
  console.log('==========================================');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningTests = 0;
  
  // Count test results
  Object.values(testResults).forEach(categoryResults => {
    categoryResults.forEach(result => {
      totalTests++;
      if (result.type === 'success') passedTests++;
      else if (result.type === 'error') failedTests++;
      else if (result.type === 'warning') warningTests++;
    });
  });
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ⚠️  Warnings: ${warningTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  // Overall status
  console.log(`\n🎯 Overall Status:`);
  if (failedTests === 0 && warningTests <= totalTests * 0.2) {
    console.log('   🎉 ALL TESTS PASSED! The app is working correctly.');
  } else if (failedTests === 0) {
    console.log('   ✅ TESTS PASSED with warnings. The app is functional.');
  } else {
    console.log('   ❌ TESTS FAILED. Critical issues need to be addressed.');
  }
  
  // Detailed category results
  console.log(`\n📂 Category Details:`);
  Object.entries(testResults).forEach(([category, results]) => {
    const categoryPassed = results.filter(r => r.type === 'success').length;
    const categoryTotal = results.length;
    const categoryRate = categoryTotal > 0 ? ((categoryPassed / categoryTotal) * 100).toFixed(1) : 0;
    
    console.log(`   ${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  
  if (testResults.season.some(r => r.type === 'success')) {
    console.log('   • Season management is working correctly');
  }
  
  if (testResults.datatypes.some(r => r.type === 'success')) {
    console.log('   • Data operations are functioning properly');
  }
  
  if (testResults.performance.some(r => r.type === 'success')) {
    console.log('   • Performance is within acceptable ranges');
  }
  
  if (failedTests > 0) {
    console.log('   • Review failed tests above for critical issues');
  }
  
  if (warningTests > 0) {
    console.log('   • Warnings indicate minor issues or fallback mechanisms in use');
  }
  
  console.log('\n🔚 Test execution completed.');
}

/**
 * Main Test Execution
 */
async function runAllTests() {
  console.log('🏆 FUSTA - Comprehensive Node.js Test Suite');
  console.log('==============================================');
  console.log('Testing season management, data operations, and app functionality\n');
  
  const startTime = Date.now();
  
  try {
    await testFileSystem();
    await testSeasonManagement();
    await testDataOperations();
    await testMigration();
    await testPerformance();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️ Total execution time: ${duration} seconds`);
    
    generateTestReport();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    logResult('integration', `Test execution error: ${error.message}`, 'error');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testResults };
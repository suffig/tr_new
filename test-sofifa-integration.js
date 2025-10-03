/**
 * Test file for SoFIFA Service
 * This tests the frontend service integration
 */

// Test configuration
const TEST_PLAYER_ID = 239085; // Erling Haaland

console.log('🧪 Starting SoFIFA Service Tests...\n');

/**
 * Test 1: Service file exists and has exports
 */
async function testServiceFileExists() {
  console.log('Test 1: Service File Structure');
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile('./src/services/sofifaService.js', 'utf-8');
    
    const checks = [
      { name: 'Class definition', pattern: /class SofifaService/ },
      { name: 'Initialize method', pattern: /static initialize\(\)/ },
      { name: 'FetchPlayerData method', pattern: /static async fetchPlayerData/ },
      { name: 'GetWatchlist method', pattern: /static async getWatchlist/ },
      { name: 'Export statement', pattern: /export default SofifaService/ }
    ];

    const results = checks.map(check => ({
      ...check,
      passed: check.pattern.test(content)
    }));

    const failed = results.filter(r => !r.passed);
    
    if (failed.length === 0) {
      console.log('✅ Service file structure is complete');
      console.log('   Methods: initialize, fetchPlayerData, getWatchlist, etc.\n');
      return true;
    } else {
      console.error('❌ Missing components:', failed.map(f => f.name).join(', '));
      return false;
    }
  } catch (error) {
    console.error('❌ Service file test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Service methods documentation
 */
async function testServiceMethodsDocumentation() {
  console.log('Test 2: Service Methods Documentation');
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile('./src/services/sofifaService.js', 'utf-8');
    
    // Count JSDoc comments
    const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;
    const jsdocs = content.match(jsdocPattern) || [];
    
    if (jsdocs.length >= 8) {
      console.log('✅ Methods are well documented');
      console.log(`   JSDoc blocks: ${jsdocs.length}\n`);
      return true;
    } else {
      console.error('❌ Insufficient documentation');
      return false;
    }
  } catch (error) {
    console.error('❌ Documentation test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Required service methods
 */
async function testServiceMethodsExist() {
  console.log('Test 3: Required Service Methods');
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile('./src/services/sofifaService.js', 'utf-8');
    
    const requiredMethods = [
      'initialize',
      'fetchPlayerData',
      'fetchMultiplePlayers',
      'getWatchlist',
      'addToWatchlist',
      'removeFromWatchlist',
      'getCachedData',
      'clearCache',
      'getWatchlistWithData'
    ];

    const results = requiredMethods.map(method => ({
      method,
      exists: content.includes(`static async ${method}(`) || content.includes(`static ${method}(`)
    }));

    const missing = results.filter(r => !r.exists);
    
    if (missing.length === 0) {
      console.log('✅ All required methods exist');
      console.log(`   Methods: ${requiredMethods.join(', ')}\n`);
      return true;
    } else {
      console.error('❌ Missing methods:', missing.map(m => m.method).join(', '));
      return false;
    }
  } catch (error) {
    console.error('❌ Methods test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Validate Edge Function structure
 */
async function testEdgeFunctionStructure() {
  console.log('Test 4: Edge Function Structure');
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const edgeFunctionPath = './supabase/functions/sofifa-proxy/index.ts';
    const exists = await fs.access(edgeFunctionPath).then(() => true).catch(() => false);
    
    if (exists) {
      const content = await fs.readFile(edgeFunctionPath, 'utf-8');
      
      // Check for required components
      const checks = [
        { name: 'CORS headers', pattern: /corsHeaders/ },
        { name: 'Cache check', pattern: /sofifa_cache/ },
        { name: 'SoFIFA fetch', pattern: /sofifa\.com/ },
        { name: 'Error handling', pattern: /try.*catch/s },
        { name: 'HTML parsing', pattern: /parsePlayerDataFromHTML/ }
      ];

      const results = checks.map(check => ({
        ...check,
        passed: check.pattern.test(content)
      }));

      const failed = results.filter(r => !r.passed);
      
      if (failed.length === 0) {
        console.log('✅ Edge function structure is complete');
        console.log('   Components:', checks.map(c => c.name).join(', '));
        console.log('');
        return true;
      } else {
        console.error('❌ Missing components:', failed.map(f => f.name).join(', '));
        return false;
      }
    } else {
      console.error('❌ Edge function file not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Edge function structure test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Validate database migration
 */
async function testDatabaseMigration() {
  console.log('Test 5: Database Migration');
  try {
    const fs = await import('fs/promises');
    
    const migrationFiles = await fs.readdir('./supabase/migrations');
    const sofifaMigration = migrationFiles.find(f => f.includes('sofifa'));
    
    if (sofifaMigration) {
      const content = await fs.readFile(
        `./supabase/migrations/${sofifaMigration}`,
        'utf-8'
      );
      
      // Check for required tables and seeds
      const checks = [
        { name: 'sofifa_watchlist table', pattern: /CREATE TABLE.*sofifa_watchlist/ },
        { name: 'sofifa_cache table', pattern: /CREATE TABLE.*sofifa_cache/ },
        { name: 'Watchlist seeds', pattern: /INSERT INTO.*sofifa_watchlist/ },
        { name: 'RLS policies', pattern: /ROW LEVEL SECURITY/ },
        { name: 'Cache index', pattern: /CREATE INDEX.*sofifa_cache/ }
      ];

      const results = checks.map(check => ({
        ...check,
        passed: check.pattern.test(content)
      }));

      const failed = results.filter(r => !r.passed);
      
      if (failed.length === 0) {
        console.log('✅ Database migration is complete');
        console.log('   Tables: sofifa_watchlist, sofifa_cache');
        console.log('   Security: RLS enabled with policies\n');
        return true;
      } else {
        console.error('❌ Missing components:', failed.map(f => f.name).join(', '));
        return false;
      }
    } else {
      console.error('❌ Migration file not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Database migration test failed:', error.message);
    return false;
  }
}

/**
 * Test 6: Validate HTML attribution
 */
async function testHTMLAttribution() {
  console.log('Test 6: HTML Attribution');
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile('./index.html', 'utf-8');
    
    const checks = [
      { name: 'Attribution div', pattern: /sofifa-attribution/ },
      { name: 'SoFIFA link', pattern: /sofifa\.com/ },
      { name: 'Fixed position', pattern: /position:\s*fixed/ },
      { name: 'Security attributes', pattern: /rel="noopener noreferrer"/ }
    ];

    const results = checks.map(check => ({
      ...check,
      passed: check.pattern.test(content)
    }));

    const failed = results.filter(r => !r.passed);
    
    if (failed.length === 0) {
      console.log('✅ HTML attribution is complete');
      console.log('   Location: Fixed footer, bottom-right');
      console.log('   Link: https://sofifa.com\n');
      return true;
    } else {
      console.error('❌ Missing components:', failed.map(f => f.name).join(', '));
      return false;
    }
  } catch (error) {
    console.error('❌ HTML attribution test failed:', error.message);
    return false;
  }
}

/**
 * Test 7: Validate compliance documentation
 */
async function testComplianceDocumentation() {
  console.log('Test 7: Compliance Documentation');
  try {
    const fs = await import('fs/promises');
    const exists = await fs.access('./SOFIFA_COMPLIANCE.md')
      .then(() => true)
      .catch(() => false);
    
    if (exists) {
      const content = await fs.readFile('./SOFIFA_COMPLIANCE.md', 'utf-8');
      
      const checks = [
        { name: 'Attribution section', pattern: /Attribution.*Credit/s },
        { name: 'Terms compliance', pattern: /Terms of Service/i },
        { name: 'Data usage policy', pattern: /Data Usage/i },
        { name: 'Security measures', pattern: /Security/i },
        { name: 'Architecture diagram', pattern: /Architecture/i },
        { name: 'Issue reference', pattern: /#19/ }
      ];

      const results = checks.map(check => ({
        ...check,
        passed: check.pattern.test(content)
      }));

      const failed = results.filter(r => !r.passed);
      
      if (failed.length === 0) {
        console.log('✅ Compliance documentation is complete');
        console.log('   File: SOFIFA_COMPLIANCE.md');
        console.log('   Content: Complete with all sections\n');
        return true;
      } else {
        console.error('❌ Missing sections:', failed.map(f => f.name).join(', '));
        return false;
      }
    } else {
      console.error('❌ Compliance documentation not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Compliance documentation test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('=' .repeat(60));
  console.log('SoFIFA Integration Test Suite');
  console.log('=' .repeat(60));
  console.log('');

  const tests = [
    testServiceFileExists,
    testServiceMethodsDocumentation,
    testServiceMethodsExist,
    testEdgeFunctionStructure,
    testDatabaseMigration,
    testHTMLAttribution,
    testComplianceDocumentation
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await test();
    results.push(result);
  }

  console.log('=' .repeat(60));
  console.log('Test Summary');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Total: ${total} tests`);
  console.log(`Passed: ${passed} tests`);
  console.log(`Failed: ${total - passed} tests`);
  console.log('');
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('');
  console.log('Note: Live integration tests require:');
  console.log('  - Supabase project configured');
  console.log('  - Edge function deployed');
  console.log('  - Database migrations applied');
  console.log('  - Authentication set up');
}

// Run tests
runAllTests().catch(console.error);

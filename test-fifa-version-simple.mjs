#!/usr/bin/env node
/**
 * Simple FIFA Version Test - validates the core functionality
 */

// Mock browser globals
global.window = { addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {} };
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

console.log('🧪 FIFA Version Insertion Validation');
console.log('=====================================');

try {
  // Import FIFA Version Manager only
  const fifaVersionManager = await import('./src/utils/fifaVersionManager.js');
  
  console.log('✅ FIFA Version Manager loaded successfully');
  
  // Test current version
  const currentVersion = fifaVersionManager.getCurrentFifaVersion();
  console.log(`📊 Current FIFA Version: ${currentVersion}`);
  
  // Test versioned tables
  const versionedTables = fifaVersionManager.getFifaVersionedTables();
  console.log(`📋 Versioned Tables: ${versionedTables.join(', ')}`);
  
  // Validate database schema requirements
  const databaseTables = ['players', 'matches', 'bans', 'transactions', 'finances', 'spieler_des_spiels'];
  console.log('\n🔍 Validating FIFA version support for database tables:');
  
  let allTablesVersioned = true;
  databaseTables.forEach(table => {
    const isVersioned = fifaVersionManager.shouldFilterByFifaVersion(table);
    console.log(`  ${table}: ${isVersioned ? '✅ VERSIONED' : '❌ NOT VERSIONED'}`);
    if (!isVersioned) allTablesVersioned = false;
  });
  
  // Test data enhancement
  console.log('\n📝 Testing data enhancement:');
  const testData = {
    name: 'Test Player',
    team: 'AEK',
    position: 'ST'
  };
  
  const enhancedData = fifaVersionManager.addFifaVersionToData(testData);
  console.log(`Original: ${JSON.stringify(testData)}`);
  console.log(`Enhanced: ${JSON.stringify(enhancedData)}`);
  
  const hasVersionField = enhancedData.hasOwnProperty('fifa_version');
  console.log(`FIFA version field added: ${hasVersionField ? '✅ YES' : '❌ NO'}`);
  
  if (hasVersionField) {
    console.log(`FIFA version value: ${enhancedData.fifa_version}`);
  }
  
  console.log('\n🎯 VALIDATION RESULTS:');
  console.log('======================');
  
  if (allTablesVersioned && hasVersionField) {
    console.log('✅ SUCCESS: FIFA version system is properly configured');
    console.log('✅ All database tables support FIFA versioning');
    console.log('✅ Data enhancement adds fifa_version field correctly');
    console.log('✅ Database inserts should include fifa_version automatically');
  } else {
    console.log('❌ ISSUES FOUND:');
    if (!allTablesVersioned) {
      console.log('  - Some database tables are not configured for FIFA versioning');
    }
    if (!hasVersionField) {
      console.log('  - Data enhancement is not adding fifa_version field');
    }
  }
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
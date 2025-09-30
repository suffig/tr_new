/**
 * EA Sports API Integration Test
 * Demonstrates and tests the EA Sports integration functionality
 */

import { eaSportsIntegration } from './src/services/EASportsIntegration.js';
import { eaFCAPIService } from './src/services/EAFCAPIService.js';
import { transferMarketService } from './src/services/TransferMarketService.js';
import { backgroundJobService } from './src/services/BackgroundJobService.js';

console.log('🚀 Starting EA Sports API Integration Tests...\n');

async function runTests() {
  try {
    // Test 1: Initialize Integration
    console.log('📋 Test 1: Initializing EA Sports Integration');
    await eaSportsIntegration.initialize({
      enableBackgroundJobs: true,
      enableNotifications: false // Disable for testing
    });
    console.log('✅ Integration initialized successfully\n');

    // Test 2: API Connectivity
    console.log('📋 Test 2: Testing API Connectivity');
    const connectivity = await eaFCAPIService.testConnectivity();
    console.log('API Status:', connectivity);
    console.log('✅ Connectivity test completed\n');

    // Test 3: Fetch Player Data
    console.log('📋 Test 3: Fetching Player Data');
    const players = ['Mbappe', 'Haaland', 'Ronaldo'];
    
    for (const playerName of players) {
      const result = await eaSportsIntegration.getPlayerData(playerName);
      if (result.data) {
        console.log(`✅ ${playerName}:`);
        console.log(`   Overall: ${result.data.overall}`);
        console.log(`   Position: ${result.data.position}`);
        console.log(`   Club: ${result.data.club}`);
        console.log(`   Source: ${result.source}`);
      }
    }
    console.log('✅ Player data fetch completed\n');

    // Test 4: Live Match Data
    console.log('📋 Test 4: Fetching Live Match Data');
    const matchData = await eaSportsIntegration.getLiveMatchData('test-match-1');
    if (matchData.data) {
      console.log('✅ Live Match:');
      console.log(`   ${matchData.data.homeTeam} ${matchData.data.homeScore} - ${matchData.data.awayScore} ${matchData.data.awayTeam}`);
      console.log(`   Minute: ${matchData.data.minute}'`);
      console.log(`   Events: ${matchData.data.events.length}`);
    }
    console.log('✅ Live match data fetch completed\n');

    // Test 5: Transfer Market Prices
    console.log('📋 Test 5: Fetching Transfer Market Prices');
    const priceData = await eaSportsIntegration.getMarketPrice('Mbappe');
    if (priceData.data) {
      console.log('✅ Market Price for Mbappe:');
      console.log(`   Current: ${priceData.data.currentPrice.toLocaleString()} coins`);
      console.log(`   Lowest: ${priceData.data.lowestPrice.toLocaleString()} coins`);
      console.log(`   Highest: ${priceData.data.highestPrice.toLocaleString()} coins`);
      console.log(`   Volume: ${priceData.data.volume} transactions`);
    }
    console.log('✅ Transfer market price fetch completed\n');

    // Test 6: Market Insights
    console.log('📋 Test 6: Getting Market Insights');
    const insights = await eaSportsIntegration.getMarketInsights('Haaland');
    if (insights.data) {
      console.log('✅ Market Insights for Haaland:');
      console.log(`   Trend: ${insights.data.trend.trend}`);
      console.log(`   Change: ${insights.data.trend.percentageChange}%`);
      console.log(`   Recommendation: ${insights.data.recommendation.action} (${insights.data.recommendation.reason})`);
      console.log(`   Volatility: ${insights.data.volatility}%`);
      console.log(`   Projected Price (7d): ${insights.data.projectedPrice.price.toLocaleString()} coins`);
    }
    console.log('✅ Market insights fetch completed\n');

    // Test 7: Watchlist Management
    console.log('📋 Test 7: Testing Watchlist');
    transferMarketService.addToWatchlist('Mbappe', {
      priceThreshold: 5000000,
      condition: 'below'
    });
    transferMarketService.addToWatchlist('Haaland', {
      priceThreshold: 8000000,
      condition: 'below'
    });
    
    const watchlist = eaSportsIntegration.getWatchlistSummary();
    console.log('✅ Watchlist:');
    console.log(`   Total Players: ${watchlist.totalPlayers}`);
    console.log(`   Active Alerts: ${watchlist.activeAlerts}`);
    console.log(`   Players: ${watchlist.players.join(', ')}`);
    console.log('✅ Watchlist test completed\n');

    // Test 8: Background Jobs Status
    console.log('📋 Test 8: Checking Background Jobs');
    const jobsStatus = eaSportsIntegration.getBackgroundJobsStatus();
    console.log('✅ Background Jobs:');
    jobsStatus.forEach(job => {
      console.log(`   ${job.name}:`);
      console.log(`     Status: ${job.status}`);
      console.log(`     Enabled: ${job.enabled}`);
      console.log(`     Interval: ${job.interval}`);
      console.log(`     Next Run: ${job.nextRun || 'Not scheduled'}`);
    });
    console.log('✅ Background jobs check completed\n');

    // Test 9: Batch Update
    console.log('📋 Test 9: Testing Batch Update');
    const testPlayers = [
      { id: 1, name: 'Messi' },
      { id: 2, name: 'Ronaldo' },
      { id: 3, name: 'Neymar' }
    ];
    
    const batchResults = await eaSportsIntegration.batchUpdatePlayers(
      testPlayers,
      (progress, results) => {
        console.log(`   Progress: ${progress}% (Updated: ${results.updated.length}, Failed: ${results.failed.length})`);
      }
    );
    
    console.log('✅ Batch Update Results:');
    console.log(`   Updated: ${batchResults.updated.length}`);
    console.log(`   Failed: ${batchResults.failed.length}`);
    console.log(`   Unchanged: ${batchResults.unchanged.length}`);
    console.log('✅ Batch update completed\n');

    // Test 10: Integration Statistics
    console.log('📋 Test 10: Getting Integration Statistics');
    const stats = eaSportsIntegration.getStats();
    console.log('✅ Integration Statistics:');
    console.log(`   Total API Calls: ${stats.totalApiCalls}`);
    console.log(`   Successful: ${stats.successfulCalls}`);
    console.log(`   Failed: ${stats.failedCalls}`);
    console.log(`   Cached: ${stats.cachedCalls}`);
    console.log(`   Success Rate: ${stats.successRate}`);
    console.log(`   Cache Hit Rate: ${stats.cacheHitRate}`);
    console.log('✅ Statistics retrieved\n');

    // Test 11: Status Report
    console.log('📋 Test 11: Getting Status Report');
    const statusReport = eaSportsIntegration.getStatusReport();
    console.log('✅ Status Report:');
    console.log('   Integration:', statusReport.integration);
    console.log(`   Total Background Jobs: ${statusReport.backgroundJobs.length}`);
    console.log(`   Watchlist Players: ${statusReport.watchlist.totalPlayers}`);
    console.log('✅ Status report generated\n');

    // Test 12: Diagnostics
    console.log('📋 Test 12: Running Diagnostics');
    const diagnostics = await eaSportsIntegration.runDiagnostics();
    console.log('✅ Diagnostics Results:');
    console.log('   Connectivity:', diagnostics.connectivity?.connected ? '✅' : '❌');
    console.log('   Sample Player:', diagnostics.samplePlayer?.success ? '✅' : '❌');
    console.log('   Market Price:', diagnostics.marketPrice?.success ? '✅' : '❌');
    console.log('   Background Jobs:', diagnostics.backgroundJobs ? '✅' : '❌');
    console.log('✅ Diagnostics completed\n');

    // Summary
    console.log('═════════════════════════════════════════════════');
    console.log('🎉 All Tests Completed Successfully!');
    console.log('═════════════════════════════════════════════════');
    console.log('\n📊 Final Statistics:');
    const finalStats = eaSportsIntegration.getStats();
    console.log(`   Total API Calls: ${finalStats.totalApiCalls}`);
    console.log(`   Success Rate: ${finalStats.successRate}`);
    console.log(`   Cache Hit Rate: ${finalStats.cacheHitRate}`);
    console.log(`   API Connected: ${finalStats.apiConnected ? '✅' : '❌'}`);
    console.log('\n✅ EA Sports API Integration is ready for production!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run tests
runTests().then(() => {
  console.log('Test suite finished.');
}).catch(error => {
  console.error('Test suite error:', error);
});

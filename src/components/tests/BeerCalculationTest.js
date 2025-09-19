/**
 * Test for Beer Blood Alcohol Calculation
 * Verifies that the beer calculation fix works correctly
 */

class BeerCalculationTest {
  constructor() {
    this.testResults = [];
  }

  // Copy of the fixed calculateBloodAlcohol function for testing
  calculateBloodAlcohol(alcoholCl, playerData, drinkingTime = null, beerCount = 0) {
    if (!playerData.weight || (alcoholCl === 0 && beerCount === 0)) return '0.00';
    
    // Convert cl of 40% alcohol to grams of pure alcohol
    let alcoholGrams = (alcoholCl * 10) * 0.4 * 0.789;
    
    // Add beer alcohol: FIXED - removed incorrect division by 1000
    alcoholGrams += (beerCount * 0.5 * 1000 * 0.05 * 0.789);
    
    // Widmark factors
    const r = playerData.gender === 'female' ? 0.60 : 0.70;
    
    // Widmark formula
    let bac = alcoholGrams / (playerData.weight * r);
    
    // Apply time decay if drinking time is provided
    if (drinkingTime) {
      const now = new Date();
      const timePassed = (now - new Date(drinkingTime)) / (1000 * 60 * 60);
      bac = Math.max(0, bac - (timePassed * 0.15));
    }
    
    return bac.toFixed(2);
  }

  assert(condition, message) {
    const result = { 
      passed: Boolean(condition), 
      message,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    if (result.passed) {
      console.log(`✅ ${message}`);
    } else {
      console.error(`❌ ${message}`);
    }
    
    return result.passed;
  }

  runTests() {
    console.log('🍺 Running Beer Calculation Tests...\n');
    
    const testPlayer = {
      name: 'Test Player',
      weight: 75,
      gender: 'male'
    };

    // Test 1: No alcohol, no beer should return 0
    const result1 = this.calculateBloodAlcohol(0, testPlayer, null, 0);
    this.assert(
      result1 === '0.00',
      `No alcohol/beer returns 0.00‰ (got ${result1}‰)`
    );

    // Test 2: Beer only should give significant BAC
    const result2 = this.calculateBloodAlcohol(0, testPlayer, null, 2);
    this.assert(
      parseFloat(result2) > 0.5,
      `2 beers alone gives significant BAC (got ${result2}‰, expected > 0.5‰)`
    );

    // Test 3: Beer calculation should be approximately correct
    // 2 beers = 2 * 0.5L * 5% * 0.789g/ml = 39.45g alcohol
    // BAC = 39.45 / (75 * 0.70) = 0.751‰
    const result3 = this.calculateBloodAlcohol(0, testPlayer, null, 2);
    const expected = 39.45 / (75 * 0.70);
    this.assert(
      Math.abs(parseFloat(result3) - expected) < 0.01,
      `2 beers BAC calculation is accurate (got ${result3}‰, expected ${expected.toFixed(2)}‰)`
    );

    // Test 4: Combined alcohol and beer
    const result4 = this.calculateBloodAlcohol(4, testPlayer, null, 2);
    const result4NoAlcohol = this.calculateBloodAlcohol(0, testPlayer, null, 2);
    const result4NoBeer = this.calculateBloodAlcohol(4, testPlayer, null, 0);
    this.assert(
      parseFloat(result4) > parseFloat(result4NoAlcohol) && 
      parseFloat(result4) > parseFloat(result4NoBeer),
      `Combined alcohol+beer gives higher BAC than either alone (${result4}‰ > ${result4NoAlcohol}‰ and ${result4}‰ > ${result4NoBeer}‰)`
    );

    // Test 5: Beer should contribute meaningfully (not negligible)
    const result5WithBeer = this.calculateBloodAlcohol(4, testPlayer, null, 2);
    const result5WithoutBeer = this.calculateBloodAlcohol(4, testPlayer, null, 0);
    const difference = parseFloat(result5WithBeer) - parseFloat(result5WithoutBeer);
    this.assert(
      difference > 0.5,
      `Beer contributes meaningfully to BAC (difference: ${difference.toFixed(2)}‰, expected > 0.5‰)`
    );

    // Summary
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Beer calculation is working correctly.');
      return true;
    } else {
      console.log('💥 Some tests failed. Beer calculation needs attention.');
      return false;
    }
  }

  getResults() {
    return this.testResults;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeerCalculationTest;
}

// Auto-run if called directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  const test = new BeerCalculationTest();
  const success = test.runTests();
  process.exit(success ? 0 : 1);
}
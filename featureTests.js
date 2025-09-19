/**
 * Test Suite for FIFA Tracker Enhanced Features
 * Tests export/import, offline mode, formation visualizer, etc.
 */

import { DataExportImport } from './exportImport.js';
import { FormationVisualizer } from './formationVisualizer.js';
import { OfflineManager } from './offlineManager.js';
import TouchGestureHandler from './touchGestures.js';

class FeatureTestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🚀 Starting FIFA Tracker Enhanced Features Test Suite');
        
        // Test Export/Import
        await this.testExportImport();
        
        // Test Formation Visualizer
        await this.testFormationVisualizer();
        
        // Test Offline Manager
        await this.testOfflineManager();
        
        // Test Touch Gestures
        await this.testTouchGestures();
        
        // Test Mobile UI Enhancements
        await this.testMobileUI();
        
        // Generate report
        this.generateTestReport();
    }

    async testExportImport() {
        console.log('📦 Testing Export/Import System...');
        
        try {
            // Test data export structure
            const mockData = {
                players: [{ id: 1, name: 'Test Player', team: 'AEK' }],
                matches: [{ id: 1, goalsa: 2, goalsb: 1 }],
                transactions: [],
                finances: { AEK: { balance: 1000 }, Real: { balance: 1000 } }
            };
            
            // Test total records calculation
            const totalRecords = DataExportImport.calculateTotalRecords(mockData);
            this.assert(totalRecords === 2, 'Total records calculation is correct');
            
            // Test import data validation
            const validImportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                data: mockData,
                totalRecords: 2
            };
            
            const isValid = DataExportImport.validateImportData(validImportData);
            this.assert(isValid, 'Import data validation works for valid data');
            
            const isInvalid = DataExportImport.validateImportData({ invalid: true });
            this.assert(!isInvalid, 'Import data validation rejects invalid data');
            
        } catch (error) {
            this.fail('Export/Import System test failed: ' + error.message);
        }
    }

    async testFormationVisualizer() {
        console.log('⚽ Testing Formation Visualizer...');
        
        try {
            const visualizer = new FormationVisualizer();
            
            // Test formation definitions
            this.assert(
                Object.keys(visualizer.formations).length >= 3,
                'Multiple formations are defined'
            );
            
            // Test 4-4-2 formation
            const formation442 = visualizer.formations['4-4-2'];
            this.assert(
                formation442 && formation442.positions.GK,
                '4-4-2 formation has goalkeeper position'
            );
            
            // Test position categorization
            const category = visualizer.getPositionCategory('ST');
            this.assert(category === 'attack', 'Striker correctly categorized as attack position');
            
            // Test formation stats calculation
            const mockPlayers = [
                { id: 1, name: 'Player 1', position: 'GK' },
                { id: 2, name: 'Player 2', position: 'CB' }
            ];
            
            const stats = visualizer.calculateFormationStats(mockPlayers);
            this.assert(
                typeof stats.attack === 'number' && typeof stats.defense === 'number',
                'Formation stats calculation returns valid numbers'
            );
            
        } catch (error) {
            this.fail('Formation Visualizer test failed: ' + error.message);
        }
    }

    async testOfflineManager() {
        console.log('🔌 Testing Offline Manager...');
        
        try {
            const offlineManager = new OfflineManager();
            
            // Test offline status
            const status = offlineManager.getOfflineStatus();
            this.assert(
                typeof status.isOnline === 'boolean',
                'Offline status returns boolean for online state'
            );
            
            // Test pending action addition
            const actionId = offlineManager.addPendingAction({
                type: 'test_action',
                data: { test: true }
            });
            
            this.assert(
                typeof actionId === 'number',
                'Pending action returns valid ID'
            );
            
            this.assert(
                offlineManager.pendingActions.length > 0,
                'Pending action was added to queue'
            );
            
            // Test offline data storage
            const testData = { id: 1, test: true };
            await offlineManager.saveOfflineData('test_type', testData);
            
            const retrievedData = offlineManager.getOfflineData('test_type');
            this.assert(
                retrievedData.length > 0 && retrievedData[0].test === true,
                'Offline data storage and retrieval works'
            );
            
        } catch (error) {
            this.fail('Offline Manager test failed: ' + error.message);
        }
    }

    async testTouchGestures() {
        console.log('👆 Testing Touch Gesture Handler...');
        
        try {
            // Test touch gesture configuration
            const gestureHandler = new TouchGestureHandler();
            
            this.assert(
                typeof gestureHandler.minSwipeDistance === 'number',
                'Touch gesture has valid swipe distance configuration'
            );
            
            this.assert(
                typeof gestureHandler.isGestureEnabled === 'boolean',
                'Touch gesture has enable/disable state'
            );
            
            // Test enable/disable functionality
            gestureHandler.disable();
            this.assert(!gestureHandler.isGestureEnabled, 'Touch gesture can be disabled');
            
            gestureHandler.enable();
            this.assert(gestureHandler.isGestureEnabled, 'Touch gesture can be re-enabled');
            
            // Test excluded area detection
            const mockInput = document.createElement('input');
            const isExcluded = gestureHandler.isInExcludedArea(mockInput);
            this.assert(isExcluded, 'Input elements are correctly excluded from gestures');
            
        } catch (error) {
            this.fail('Touch Gesture Handler test failed: ' + error.message);
        }
    }

    async testMobileUI() {
        console.log('📱 Testing Mobile UI Enhancements...');
        
        try {
            // Test CSS classes exist
            const testDiv = document.createElement('div');
            testDiv.className = 'modern-bottom-nav';
            document.body.appendChild(testDiv);
            
            const styles = window.getComputedStyle(testDiv);
            this.assert(
                styles.position === 'fixed',
                'Bottom navigation has fixed positioning'
            );
            
            // Test responsive button sizing
            const testButton = document.createElement('button');
            testButton.className = 'btn';
            document.body.appendChild(testButton);
            
            const buttonStyles = window.getComputedStyle(testButton);
            this.assert(
                buttonStyles.minHeight !== 'auto',
                'Buttons have minimum height set for better touch targets'
            );
            
            // Cleanup
            document.body.removeChild(testDiv);
            document.body.removeChild(testButton);
            
        } catch (error) {
            this.fail('Mobile UI test failed: ' + error.message);
        }
    }

    // Test helper methods
    assert(condition, message) {
        this.totalTests++;
        if (condition) {
            this.passedTests++;
            console.log(`✅ ${message}`);
            this.testResults.push({ test: message, status: 'PASS' });
        } else {
            this.failedTests++;
            console.log(`❌ ${message}`);
            this.testResults.push({ test: message, status: 'FAIL' });
        }
    }

    fail(message) {
        this.totalTests++;
        this.failedTests++;
        console.log(`❌ ${message}`);
        this.testResults.push({ test: message, status: 'FAIL' });
    }

    generateTestReport() {
        const passPercentage = ((this.passedTests / this.totalTests) * 100).toFixed(1);
        
        console.log('\n🏁 Test Suite Complete!');
        console.log(`📊 Results: ${this.passedTests}/${this.totalTests} tests passed (${passPercentage}%)`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.test}`));
        }
        
        // Show test report in UI
        this.showTestReportModal();
    }

    showTestReportModal() {
        const passPercentage = ((this.passedTests / this.totalTests) * 100).toFixed(1);
        const statusColor = this.failedTests === 0 ? 'green' : (passPercentage >= 80 ? 'orange' : 'red');
        
        const modalHTML = `
            <div id="test-report-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="modal-content bg-slate-800 rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-white font-semibold text-lg">🧪 Feature Test Report</h3>
                        <button onclick="document.getElementById('test-report-modal').remove()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4">
                        <div class="text-${statusColor}-400 text-lg font-bold">
                            ${this.passedTests}/${this.totalTests} Tests Passed (${passPercentage}%)
                        </div>
                    </div>
                    
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${this.testResults.map(result => `
                            <div class="flex items-center space-x-2 text-sm">
                                <span class="${result.status === 'PASS' ? 'text-green-400' : 'text-red-400'}">
                                    ${result.status === 'PASS' ? '✅' : '❌'}
                                </span>
                                <span class="text-gray-300">${result.test}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.failedTests === 0 ? 
                        '<div class="mt-4 p-3 bg-green-600 rounded text-white text-center font-semibold">🎉 All tests passed! New features are working correctly.</div>' :
                        '<div class="mt-4 p-3 bg-orange-600 rounded text-white text-center font-semibold">⚠️ Some tests failed. Check console for details.</div>'
                    }
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
    window.runFeatureTests = async function() {
        const testSuite = new FeatureTestSuite();
        await testSuite.runAllTests();
    };
    
    // Add test button to UI for manual testing
    window.addEventListener('DOMContentLoaded', () => {
        // Add test button to any existing admin or debug area
        setTimeout(() => {
            const testButton = document.createElement('button');
            testButton.textContent = '🧪 Test Features';
            testButton.className = 'fixed bottom-20 left-4 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium z-40';
            testButton.onclick = window.runFeatureTests;
            document.body.appendChild(testButton);
        }, 2000);
    });
}

export default FeatureTestSuite;
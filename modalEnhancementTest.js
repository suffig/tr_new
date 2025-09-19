/**
 * Modal Enhancement Test Suite
 * Tests the improved modal system, overlap fixes, and design enhancements
 */

import { modalManager, showModal, createModal, openModal, closeModal } from './modal.js';

class ModalEnhancementTestSuite {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🎭 Starting Modal Enhancement Test Suite');
        
        // Test basic modal functionality
        await this.testBasicModalFunctionality();
        
        // Test modal stacking and z-index management
        await this.testModalStacking();
        
        // Test mobile responsiveness and overlap prevention
        await this.testMobileResponsiveness();
        
        // Test animations and transitions
        await this.testAnimations();
        
        // Test touch interactions
        await this.testTouchInteractions();
        
        // Test accessibility features
        await this.testAccessibility();
        
        // Generate comprehensive report
        this.generateReport();
    }

    async testBasicModalFunctionality() {
        console.log('📋 Testing Basic Modal Functionality...');
        
        try {
            // Test modal creation
            const modal = createModal('test-modal', '<h2>Test Modal</h2><p>This is a test modal.</p>');
            this.assert(modal && modal.id === 'test-modal', 'Modal creation works');
            
            // Test modal opening
            await openModal('test-modal');
            this.assert(modalManager.hasOpenModals(), 'Modal opens successfully');
            
            // Test modal closing
            await closeModal('test-modal');
            this.assert(!modalManager.hasOpenModals(), 'Modal closes successfully');
            
            // Test legacy API compatibility
            showModal('<p>Legacy modal test</p>');
            this.assert(modalManager.hasOpenModals(), 'Legacy API still works');
            
            closeModal();
            this.assert(!modalManager.hasOpenModals(), 'Legacy close works');
            
        } catch (error) {
            this.fail('Basic modal functionality test failed: ' + error.message);
        }
    }

    async testModalStacking() {
        console.log('📚 Testing Modal Stacking...');
        
        try {
            // Create multiple modals
            createModal('modal1', '<h2>First Modal</h2>');
            createModal('modal2', '<h2>Second Modal</h2>');
            createModal('modal3', '<h2>Third Modal</h2>');
            
            // Open modals in sequence
            await openModal('modal1');
            await openModal('modal2');
            await openModal('modal3');
            
            // Check modal stack
            this.assert(modalManager.modalStack.length === 3, 'Modal stack manages multiple modals');
            
            // Test z-index ordering
            const modal3Element = modalManager.activeModals.get('modal3').element;
            const modal1Element = modalManager.activeModals.get('modal1').element;
            
            const modal3ZIndex = parseInt(modal3Element.style.zIndex);
            const modal1ZIndex = parseInt(modal1Element.style.zIndex);
            
            this.assert(modal3ZIndex > modal1ZIndex, 'Z-index ordering is correct');
            
            // Close top modal
            await closeModal('modal3');
            this.assert(modalManager.modalStack.length === 2, 'Closing top modal works');
            
            // Close all modals
            modalManager.hideAllModals();
            this.assert(!modalManager.hasOpenModals(), 'Close all modals works');
            
        } catch (error) {
            this.fail('Modal stacking test failed: ' + error.message);
        }
    }

    async testMobileResponsiveness() {
        console.log('📱 Testing Mobile Responsiveness...');
        
        try {
            // Simulate mobile viewport
            const originalInnerHeight = window.innerHeight;
            const originalInnerWidth = window.innerWidth;
            
            // Mock mobile dimensions
            Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
            Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
            
            // Create and open modal
            createModal('mobile-test', '<div style="height: 800px;">Long content</div>', {
                size: 'default'
            });
            await openModal('mobile-test');
            
            const modalElement = modalManager.activeModals.get('mobile-test').element;
            const modalContent = modalElement.querySelector('.modal-content');
            
            // Check if modal fits within viewport accounting for bottom nav
            const modalHeight = modalContent.offsetHeight;
            const maxAllowedHeight = window.innerHeight - 160; // Bottom nav + padding
            
            this.assert(modalHeight <= maxAllowedHeight, 'Modal fits within mobile viewport');
            
            // Check if modal has proper safe area handling
            const hasBottomPadding = modalElement.style.paddingBottom || 
                                   getComputedStyle(modalElement).paddingBottom;
            this.assert(hasBottomPadding !== '1rem', 'Modal has proper bottom padding for nav');
            
            // Restore original dimensions
            Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight });
            Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth });
            
            await closeModal('mobile-test');
            
        } catch (error) {
            this.fail('Mobile responsiveness test failed: ' + error.message);
        }
    }

    async testAnimations() {
        console.log('✨ Testing Animations...');
        
        try {
            // Test different animation types
            const animations = ['slideUp', 'fadeIn', 'scaleIn'];
            
            for (const animation of animations) {
                createModal(`anim-test-${animation}`, '<p>Animation test</p>', {
                    animation: animation
                });
                
                const startTime = performance.now();
                await openModal(`anim-test-${animation}`);
                const endTime = performance.now();
                
                // Animation should take reasonable time (between 100ms and 1000ms)
                const animationTime = endTime - startTime;
                this.assert(
                    animationTime >= 100 && animationTime <= 1000,
                    `${animation} animation takes reasonable time`
                );
                
                await closeModal(`anim-test-${animation}`);
            }
            
        } catch (error) {
            this.fail('Animations test failed: ' + error.message);
        }
    }

    async testTouchInteractions() {
        console.log('👆 Testing Touch Interactions...');
        
        try {
            // Create modal with touch-friendly elements
            createModal('touch-test', `
                <div>
                    <button class="test-button" style="min-height: 48px; min-width: 48px;">Touch Button</button>
                    <input type="text" class="test-input" style="min-height: 48px;">
                </div>
            `);
            
            await openModal('touch-test');
            
            const modalElement = modalManager.activeModals.get('touch-test').element;
            const button = modalElement.querySelector('.test-button');
            const input = modalElement.querySelector('.test-input');
            
            // Check minimum touch target sizes
            const buttonRect = button.getBoundingClientRect();
            const inputRect = input.getBoundingClientRect();
            
            this.assert(
                buttonRect.height >= 48 && buttonRect.width >= 48,
                'Touch targets meet minimum size requirements'
            );
            
            this.assert(
                inputRect.height >= 48,
                'Input fields meet minimum height requirements'
            );
            
            // Test close button touch target
            const closeButton = modalElement.querySelector('.modal-close');
            const closeButtonRect = closeButton.getBoundingClientRect();
            
            this.assert(
                closeButtonRect.height >= 44 && closeButtonRect.width >= 44,
                'Close button meets touch target requirements'
            );
            
            await closeModal('touch-test');
            
        } catch (error) {
            this.fail('Touch interactions test failed: ' + error.message);
        }
    }

    async testAccessibility() {
        console.log('♿ Testing Accessibility...');
        
        try {
            // Create modal with accessibility features
            createModal('a11y-test', '<h2>Accessibility Test</h2><p>Test content</p>', {
                closeOnEscape: true
            });
            
            await openModal('a11y-test');
            
            const modalElement = modalManager.activeModals.get('a11y-test').element;
            
            // Check if modal traps focus
            this.assert(
                document.body.style.overflow === 'hidden',
                'Body scroll is prevented when modal is open'
            );
            
            // Test escape key functionality
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            // Give it a moment to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.assert(
                !modalManager.hasOpenModals(),
                'Escape key closes modal'
            );
            
            // Check if body scroll is restored
            this.assert(
                document.body.style.overflow !== 'hidden',
                'Body scroll is restored when modal closes'
            );
            
        } catch (error) {
            this.fail('Accessibility test failed: ' + error.message);
        }
    }

    // Test utilities
    assert(condition, message) {
        if (condition) {
            this.passedTests++;
            this.testResults.push({ status: 'PASS', message });
            console.log(`✅ ${message}`);
        } else {
            this.failedTests++;
            this.testResults.push({ status: 'FAIL', message });
            console.log(`❌ ${message}`);
        }
    }

    fail(message) {
        this.failedTests++;
        this.testResults.push({ status: 'FAIL', message });
        console.log(`❌ ${message}`);
    }

    generateReport() {
        const totalTests = this.passedTests + this.failedTests;
        const passRate = totalTests > 0 ? ((this.passedTests / totalTests) * 100).toFixed(1) : 0;
        
        console.log('\n🎭 Modal Enhancement Test Suite Results');
        console.log('==========================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log(`Pass Rate: ${passRate}%`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(result => result.status === 'FAIL')
                .forEach(result => console.log(`  - ${result.message}`));
        }
        
        console.log('\n✨ Enhancement Features Tested:');
        console.log('  - Modal overlap prevention');
        console.log('  - Mobile responsiveness');
        console.log('  - Enhanced animations');
        console.log('  - Touch-friendly interactions');
        console.log('  - Z-index management');
        console.log('  - Accessibility improvements');
        
        return {
            totalTests,
            passedTests: this.passedTests,
            failedTests: this.failedTests,
            passRate: parseFloat(passRate),
            results: this.testResults
        };
    }
}

// Export for use in other modules
export default ModalEnhancementTestSuite;

// Auto-run tests if called directly
if (typeof window !== 'undefined') {
    window.runModalEnhancementTests = async () => {
        const testSuite = new ModalEnhancementTestSuite();
        return await testSuite.runAllTests();
    };
}
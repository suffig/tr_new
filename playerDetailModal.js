/**
 * Player Detail Modal Component
 * Shows detailed FIFA statistics when clicking on a player
 */

import FIFADataService from './fifaDataService.js';

export class PlayerDetailModal {
    constructor() {
        this.modal = null;
        this.isVisible = false;
        this.currentPlayer = null;
        this.fifaData = null;
    }

    /**
     * Show the player detail modal
     * @param {Object} player - Player data from the database
     */
    async show(player) {
        this.currentPlayer = player;
        this.createModal();
        await this.loadFIFAData();
        this.renderModal();
        this.showModal();
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.add('fade-out');
            this.removeResizeListener();
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
                this.isVisible = false;
                document.body.style.overflow = '';
            }, 300);
        }
    }

    /**
     * Create the modal DOM structure
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'player-detail-modal modal-mobile-safe';
        this.modal.innerHTML = `
            <div class="modal-backdrop" onclick="playerDetailModal.hide()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Loading Player Data...</h2>
                    <button class="modal-close" onclick="playerDetailModal.hide()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading FIFA data...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    /**
     * Load FIFA data for the current player
     */
    async loadFIFAData() {
        try {
            this.fifaData = await FIFADataService.getPlayerData(this.currentPlayer.name);
        } catch (error) {
            console.error('Error loading FIFA data:', error);
            this.fifaData = null;
        }
    }

    /**
     * Render the modal content with player data
     */
    renderModal() {
        if (!this.modal || !this.currentPlayer) return;

        const modalContent = this.modal.querySelector('.modal-content');
        const hasValidFIFAData = this.fifaData && this.fifaData.found;
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="player-title-section">
                    <h2 class="modal-title">${this.currentPlayer.name}</h2>
                    <div class="player-subtitle">
                        <span class="team-badge ${this.getTeamClass()}">${this.currentPlayer.team}</span>
                        <span class="position-badge">${this.currentPlayer.position || 'N/A'}</span>
                        ${hasValidFIFAData ? `<span class="fifa-badge">FIFA ${this.fifaData.overall}</span>` : ''}
                    </div>
                </div>
                <button class="modal-close" onclick="playerDetailModal.hide()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                ${this.renderPlayerContent()}
            </div>
        `;
        
        // Ensure modal positioning is correct after content update
        this.ensureModalPositioning();
    }

    /**
     * Ensure proper modal positioning and height constraints
     */
    ensureModalPositioning() {
        if (!this.modal) return;
        
        // Force a reflow to ensure height calculations are correct
        requestAnimationFrame(() => {
            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent) {
                // Ensure the modal content respects max-height constraints
                const viewportHeight = window.innerHeight;
                const safeAreaBottom = this.getSafeAreaBottom();
                const availableHeight = viewportHeight - 128 - safeAreaBottom; // 8rem = 128px
                
                modalContent.style.maxHeight = `${availableHeight}px`;
                
                // Ensure modal body also respects height constraints
                const modalBody = modalContent.querySelector('.modal-body');
                if (modalBody) {
                    const headerHeight = modalContent.querySelector('.modal-header')?.offsetHeight || 0;
                    const bodyMaxHeight = availableHeight - headerHeight;
                    modalBody.style.maxHeight = `${bodyMaxHeight}px`;
                }
            }
        });
    }

    /**
     * Get safe area bottom value in pixels
     */
    getSafeAreaBottom() {
        // Try to get the CSS custom property value
        const testEl = document.createElement('div');
        testEl.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
        document.body.appendChild(testEl);
        const computedPadding = getComputedStyle(testEl).paddingBottom;
        document.body.removeChild(testEl);
        return parseInt(computedPadding) || 0;
    }

    /**
     * Render the main player content
     */
    renderPlayerContent() {
        const hasValidFIFAData = this.fifaData && this.fifaData.found;
        
        return `
            <div class="player-content">
                ${this.renderBasicInfo()}
                ${hasValidFIFAData ? this.renderFIFAStats() : this.renderNoFIFAData()}
            </div>
        `;
    }

    /**
     * Render basic player information
     */
    renderBasicInfo() {
        const marketValue = typeof this.currentPlayer.value === 'number' 
            ? this.currentPlayer.value 
            : (this.currentPlayer.value ? parseFloat(this.currentPlayer.value) : 0);
        
        return `
            <div class="basic-info-section">
                <h3 class="section-title">
                    <i class="fas fa-user"></i>
                    Basic Information
                </h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Team</label>
                        <span class="team-name ${this.getTeamClass()}">${this.getTeamDisplayName()}</span>
                    </div>
                    <div class="info-item">
                        <label>Position</label>
                        <span>${this.currentPlayer.position || 'Not specified'}</span>
                    </div>
                    <div class="info-item">
                        <label>Market Value</label>
                        <span class="market-value">${marketValue ? marketValue + 'M €' : 'Not valued'}</span>
                    </div>
                    <div class="info-item">
                        <label>Goals Scored</label>
                        <span class="goals">${this.currentPlayer.goals || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render FIFA statistics section
     */
    renderFIFAStats() {
        if (!this.fifaData) return '';

        return `
            <div class="fifa-stats-section">
                <h3 class="section-title">
                    <i class="fas fa-chart-bar"></i>
                    FIFA Statistics
                    ${this.fifaData.sofifaUrl ? `<a href="${this.fifaData.sofifaUrl}" target="_blank" class="sofifa-link">
                        <i class="fas fa-external-link-alt"></i>
                        View on SoFIFA
                    </a>` : ''}
                </h3>
                
                ${this.renderFIFAOverview()}
                ${this.renderFIFAAttributes()}
                ${this.renderFIFASkills()}
            </div>
        `;
    }

    /**
     * Render FIFA overview section
     */
    renderFIFAOverview() {
        return `
            <div class="fifa-overview">
                <div class="fifa-card ${FIFADataService.getPlayerCardColor(this.fifaData.overall)}">
                    <div class="fifa-rating">
                        <span class="overall-rating">${this.fifaData.overall}</span>
                        <span class="rating-label">OVR</span>
                    </div>
                    <div class="fifa-positions">
                        ${this.fifaData.positions.map(pos => `<span class="fifa-position">${pos}</span>`).join('')}
                    </div>
                    <div class="fifa-potential">
                        <span class="potential-rating">${this.fifaData.potential}</span>
                        <span class="potential-label">POT</span>
                    </div>
                </div>
                
                <div class="player-details">
                    <div class="detail-row">
                        <span class="label">Age:</span>
                        <span class="value">${this.fifaData.age}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Height:</span>
                        <span class="value">${this.fifaData.height}cm</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Weight:</span>
                        <span class="value">${this.fifaData.weight}kg</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Preferred Foot:</span>
                        <span class="value">${this.fifaData.foot}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Weak Foot:</span>
                        <span class="value">${'⭐'.repeat(this.fifaData.weakFoot)}${'☆'.repeat(5 - this.fifaData.weakFoot)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Skill Moves:</span>
                        <span class="value">${'⭐'.repeat(this.fifaData.skillMoves)}${'☆'.repeat(5 - this.fifaData.skillMoves)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Work Rates:</span>
                        <span class="value">${this.fifaData.workrates}</span>
                    </div>
                    ${this.fifaData.nationality !== 'Unknown' ? `
                    <div class="detail-row">
                        <span class="label">Nationality:</span>
                        <span class="value">${this.fifaData.nationality}</span>
                    </div>
                    ` : ''}
                    ${this.fifaData.value ? `
                    <div class="detail-row">
                        <span class="label">FIFA Value:</span>
                        <span class="value fifa-value">${this.fifaData.value}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render FIFA main attributes
     */
    renderFIFAAttributes() {
        const attributes = [
            { name: 'Pace', value: this.fifaData.pace, icon: '🏃' },
            { name: 'Shooting', value: this.fifaData.shooting, icon: '⚽' },
            { name: 'Passing', value: this.fifaData.passing, icon: '🎯' },
            { name: 'Dribbling', value: this.fifaData.dribbling, icon: '⚡' },
            { name: 'Defending', value: this.fifaData.defending, icon: '🛡️' },
            { name: 'Physical', value: this.fifaData.physical, icon: '💪' }
        ];

        return `
            <div class="fifa-attributes">
                <h4 class="subsection-title">Main Attributes</h4>
                <div class="attributes-grid">
                    ${attributes.map(attr => `
                        <div class="attribute-item">
                            <div class="attribute-header">
                                <span class="attribute-icon">${attr.icon}</span>
                                <span class="attribute-name">${attr.name}</span>
                                <span class="attribute-value">${attr.value}</span>
                            </div>
                            <div class="attribute-bar">
                                <div class="attribute-fill" style="width: ${attr.value}%; background-color: ${this.getAttributeColor(attr.value)}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render detailed FIFA skills
     */
    renderFIFASkills() {
        if (!this.fifaData.skills) return '';

        const skillGroups = [
            {
                name: 'Shooting',
                skills: ['finishing', 'volleys', 'penalties', 'shotPower', 'longShots']
            },
            {
                name: 'Passing',
                skills: ['vision', 'crossing', 'curve', 'shortPassing', 'longPassing']
            },
            {
                name: 'Movement',
                skills: ['acceleration', 'sprintSpeed', 'agility', 'reactions', 'balance']
            },
            {
                name: 'Physical',
                skills: ['jumping', 'stamina', 'strength', 'aggression']
            },
            {
                name: 'Mentality',
                skills: ['positioning', 'composure', 'interceptions']
            },
            {
                name: 'Technical',
                skills: ['ballControl', 'headingAccuracy', 'fkAccuracy']
            }
        ];

        return `
            <div class="fifa-skills">
                <h4 class="subsection-title">Detailed Skills</h4>
                <div class="skills-accordion">
                    ${skillGroups.map((group, index) => `
                        <div class="skill-group">
                            <button class="skill-group-header" onclick="playerDetailModal.toggleSkillGroup(${index})">
                                <span>${group.name}</span>
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="skill-group-content" id="skill-group-${index}">
                                <div class="skills-grid">
                                    ${group.skills.filter(skill => this.fifaData.skills[skill] !== undefined).map(skill => `
                                        <div class="skill-item">
                                            <span class="skill-name">${this.formatSkillName(skill)}</span>
                                            <span class="skill-value">${this.fifaData.skills[skill]}</span>
                                            <div class="skill-bar">
                                                <div class="skill-fill" style="width: ${this.fifaData.skills[skill]}%; background-color: ${this.getAttributeColor(this.fifaData.skills[skill])}"></div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render content when no FIFA data is available
     */
    renderNoFIFAData() {
        return `
            <div class="no-fifa-data">
                <div class="no-data-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>FIFA Data Not Available</h3>
                <p class="no-data-message">
                    FIFA statistics for this player are not currently available in our database.
                </p>
                <div class="fifa-info">
                    <p class="fifa-note">
                        <i class="fas fa-info-circle"></i>
                        FIFA ratings are sourced from <a href="https://sofifa.com" target="_blank">SoFIFA.com</a>
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Toggle skill group visibility
     */
    toggleSkillGroup(index) {
        const content = document.getElementById(`skill-group-${index}`);
        const header = content.previousElementSibling;
        const icon = header.querySelector('i');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        } else {
            content.style.display = 'none';
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
    }

    /**
     * Show the modal with animation
     */
    showModal() {
        if (this.modal) {
            this.modal.classList.add('show');
            this.isVisible = true;
            document.body.style.overflow = 'hidden';
            
            // Ensure proper positioning when shown
            this.ensureModalPositioning();
            
            // Add resize listener to maintain positioning
            this.addResizeListener();
        }
    }

    /**
     * Add window resize listener to maintain modal positioning
     */
    addResizeListener() {
        if (!this.resizeListener) {
            this.resizeListener = () => {
                if (this.isVisible) {
                    this.ensureModalPositioning();
                }
            };
            window.addEventListener('resize', this.resizeListener);
            window.addEventListener('orientationchange', this.resizeListener);
        }
    }

    /**
     * Remove resize listener
     */
    removeResizeListener() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            window.removeEventListener('orientationchange', this.resizeListener);
            this.resizeListener = null;
        }
    }

    /**
     * Get team CSS class
     */
    getTeamClass() {
        switch (this.currentPlayer.team) {
            case 'AEK': return 'team-aek';
            case 'Real': return 'team-real';
            case 'Ehemalige': return 'team-ehemalige';
            default: return '';
        }
    }

    /**
     * Get team display name
     */
    getTeamDisplayName() {
        switch (this.currentPlayer.team) {
            case 'AEK': return 'AEK Athens';
            case 'Real': return 'Real Madrid';
            case 'Ehemalige': return 'Former Players';
            default: return this.currentPlayer.team;
        }
    }

    /**
     * Get color for attribute value
     */
    getAttributeColor(value) {
        if (value >= 85) return '#00ff00'; // Green
        if (value >= 75) return '#ffff00'; // Yellow
        if (value >= 65) return '#ff8800'; // Orange
        return '#ff0000'; // Red
    }

    /**
     * Format skill name for display
     */
    formatSkillName(skillName) {
        return skillName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// Create global instance
window.playerDetailModal = new PlayerDetailModal();

export default PlayerDetailModal;
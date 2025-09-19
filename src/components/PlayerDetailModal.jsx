import React, { useState, useEffect, useCallback } from 'react';
import { FIFADataService } from '../utils/fifaDataService';

const PlayerDetailModal = ({ player, isOpen, onClose }) => {
  const [fifaData, setFifaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSkillGroup, setActiveSkillGroup] = useState(null);

  const loadFIFAData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await FIFADataService.getPlayerData(player.name);
      setFifaData(data);
    } catch (error) {
      console.error('Error loading FIFA data:', error);
      setFifaData(null);
    } finally {
      setLoading(false);
    }
  }, [player.name]);

  useEffect(() => {
    if (isOpen && player) {
      loadFIFAData();
    }
  }, [isOpen, player, loadFIFAData]);

  const getTeamClass = () => {
    switch (player?.team) {
      case 'AEK': return 'team-aek';
      case 'Real': return 'team-real';
      case 'Ehemalige': return 'team-ehemalige';
      default: return '';
    }
  };

  const getTeamDisplayName = () => {
    switch (player?.team) {
      case 'AEK': return 'AEK Athens';
      case 'Real': return 'Real Madrid';
      case 'Ehemalige': return 'Former Players';
      default: return player?.team;
    }
  };

  const formatSkillName = (skillName) => {
    return skillName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const toggleSkillGroup = (index) => {
    setActiveSkillGroup(activeSkillGroup === index ? null : index);
  };

  const renderBasicInfo = () => {
    const marketValue = typeof player.value === 'number' 
      ? player.value 
      : (player.value ? parseFloat(player.value) : 0);
    
    return (
      <div className="basic-info-section mb-8">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
          <i className="fas fa-user text-blue-400"></i>
          Spieler-Informationen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <label className="block text-sm text-slate-400 mb-1">Team</label>
            <span className={`font-semibold ${getTeamClass() === 'team-aek' ? 'text-blue-400' : getTeamClass() === 'team-real' ? 'text-red-400' : 'text-gray-400'}`}>
              {getTeamDisplayName()}
            </span>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <label className="block text-sm text-slate-400 mb-1">Position</label>
            <span className="text-white font-semibold">{player.position || 'Not specified'}</span>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <label className="block text-sm text-slate-400 mb-1">Market Value</label>
            <span className="text-green-400 font-semibold">{marketValue ? marketValue + 'M €' : 'Not valued'}</span>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <label className="block text-sm text-slate-400 mb-1">Goals Scored</label>
            <span className="text-yellow-400 font-semibold">{player.goals || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderFIFAOverview = () => {
    if (!fifaData) return null;

    return (
      <div className="fifa-overview grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`fifa-card p-6 rounded-2xl text-center ${FIFADataService.getPlayerCardColor(fifaData.overall)} shadow-lg`}>
          <div className="fifa-rating mb-3">
            <span className="block text-4xl font-black">{fifaData.overall}</span>
            <span className="text-sm font-semibold uppercase tracking-wide opacity-80">OVR</span>
          </div>
          <div className="fifa-positions mb-3">
            {fifaData.positions.map((pos, index) => (
              <span key={index} className="inline-block bg-black/20 px-2 py-1 rounded text-xs font-semibold mx-1">
                {pos}
              </span>
            ))}
          </div>
          <div className="fifa-potential pt-3 border-t border-black/20">
            <span className="block text-2xl font-bold">{fifaData.potential}</span>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">POT</span>
          </div>
        </div>
        
        <div className="player-details bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="space-y-3">
            {[
              { label: 'Age', value: fifaData.age },
              { label: 'Height', value: `${fifaData.height}cm` },
              { label: 'Weight', value: `${fifaData.weight}kg` },
              { label: 'Preferred Foot', value: fifaData.foot },
              { label: 'Weak Foot', value: '⭐'.repeat(fifaData.weakFoot) + '☆'.repeat(5 - fifaData.weakFoot) },
              { label: 'Skill Moves', value: '⭐'.repeat(fifaData.skillMoves) + '☆'.repeat(5 - fifaData.skillMoves) },
              { label: 'Work Rates', value: fifaData.workrates },
              ...(fifaData.nationality !== 'Unknown' ? [{ label: 'Nationality', value: fifaData.nationality }] : []),
              ...(fifaData.value ? [{ label: 'FIFA Value', value: fifaData.value }] : []),
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                <span className="text-slate-400 text-sm">{item.label}:</span>
                <span className="text-white font-semibold text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFIFAAttributes = () => {
    if (!fifaData) return null;

    const attributes = [
      { name: 'PAC', fullName: 'Pace', value: fifaData.pace, icon: '🏃', color: 'from-green-400 to-emerald-500' },
      { name: 'SHO', fullName: 'Shooting', value: fifaData.shooting, icon: '⚽', color: 'from-red-400 to-rose-500' },
      { name: 'PAS', fullName: 'Passing', value: fifaData.passing, icon: '🎯', color: 'from-blue-400 to-cyan-500' },
      { name: 'DRI', fullName: 'Dribbling', value: fifaData.dribbling, icon: '⚡', color: 'from-yellow-400 to-amber-500' },
      { name: 'DEF', fullName: 'Defending', value: fifaData.defending, icon: '🛡️', color: 'from-purple-400 to-violet-500' },
      { name: 'PHY', fullName: 'Physical', value: fifaData.physical, icon: '💪', color: 'from-orange-400 to-red-500' }
    ];

    return (
      <div className="fifa-attributes mb-8">
        <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
          <i className="fas fa-chart-bar text-blue-400"></i>
          FIFA Main Attributes
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attributes.map((attr, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{attr.icon}</span>
                  <div>
                    <span className="text-white font-bold text-xl">{attr.name}</span>
                    <div className="text-slate-400 text-sm">{attr.fullName}</div>
                  </div>
                </div>
                <div className={`bg-gradient-to-br ${attr.color} text-white font-bold text-2xl px-4 py-2 rounded-lg shadow-lg`}>
                  {attr.value}
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${attr.color} shadow-lg`}
                  style={{ width: `${attr.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>0</span>
                <span>50</span>
                <span>99</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFIFASkills = () => {
    if (!fifaData?.skills) return null;

    const skillGroups = [
      {
        name: 'Shooting Skills',
        icon: '⚽',
        color: 'from-red-400 to-rose-500',
        skills: ['finishing', 'volleys', 'penalties', 'shotPower', 'longShots']
      },
      {
        name: 'Passing Skills',
        icon: '🎯',
        color: 'from-blue-400 to-cyan-500',
        skills: ['vision', 'crossing', 'curve', 'shortPassing', 'longPassing']
      },
      {
        name: 'Movement Skills',
        icon: '🏃',
        color: 'from-green-400 to-emerald-500',
        skills: ['acceleration', 'sprintSpeed', 'agility', 'reactions', 'balance']
      },
      {
        name: 'Physical Skills',
        icon: '💪',
        color: 'from-orange-400 to-red-500',
        skills: ['jumping', 'stamina', 'strength', 'aggression']
      },
      {
        name: 'Mental Skills',
        icon: '🧠',
        color: 'from-purple-400 to-violet-500',
        skills: ['positioning', 'composure', 'interceptions']
      },
      {
        name: 'Technical Skills',
        icon: '⚡',
        color: 'from-yellow-400 to-amber-500',
        skills: ['ballControl', 'headingAccuracy', 'fkAccuracy']
      }
    ];

    return (
      <div className="fifa-skills">
        <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
          <i className="fas fa-cogs text-blue-400"></i>
          Detailed Skills & Attributes
        </h4>
        <div className="space-y-3">
          {skillGroups.map((group, index) => (
            <div key={index} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-300">
              <button 
                className="w-full px-6 py-4 text-left flex justify-between items-center text-white font-medium hover:bg-white/5 transition-colors"
                onClick={() => toggleSkillGroup(index)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{group.icon}</span>
                  <span className="text-lg">{group.name}</span>
                  <span className="text-sm text-slate-400">
                    ({group.skills.filter(skill => fifaData.skills[skill] !== undefined).length} skills)
                  </span>
                </div>
                <i className={`fas fa-chevron-${activeSkillGroup === index ? 'up' : 'down'} text-slate-400 transition-transform duration-200`}></i>
              </button>
              {activeSkillGroup === index && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {group.skills.filter(skill => fifaData.skills[skill] !== undefined).map(skill => (
                      <div key={skill} className="flex items-center gap-4 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                        <span className="text-slate-300 text-sm flex-1 font-medium">{formatSkillName(skill)}</span>
                        <div className={`bg-gradient-to-r ${group.color} text-white font-bold text-lg px-3 py-1 rounded-lg shadow-lg min-w-[3rem] text-center`}>
                          {fifaData.skills[skill]}
                        </div>
                        <div className="w-20 h-3 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${group.color} shadow-lg`}
                            style={{ width: `${fifaData.skills[skill]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNoFIFAData = () => (
    <div className="text-center py-12">
      <div className="text-6xl text-slate-600 mb-6">
        <i className="fas fa-search"></i>
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">FIFA Data Not Available</h3>
      <p className="text-slate-400 mb-6 max-w-md mx-auto">
        {fifaData?.generated 
          ? 'This player was not found in our FIFA database. Showing estimated ratings.'
          : 'FIFA statistics for this player are not currently available.'
        }
      </p>
      {fifaData?.generated && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mx-auto max-w-md mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Overall:</span>
              <span className="text-white">{fifaData.overall} (Est.)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Potential:</span>
              <span className="text-white">{fifaData.potential} (Est.)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Height:</span>
              <span className="text-white">{fifaData.height}cm (Est.)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Foot:</span>
              <span className="text-white">{fifaData.foot} (Est.)</span>
            </div>
          </div>
          <p className="text-yellow-400 text-xs mt-3 flex items-center justify-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            These are estimated values and may not reflect actual FIFA ratings.
          </p>
        </div>
      )}
      <div className="text-slate-500 text-sm">
        <i className="fas fa-info-circle mr-2"></i>
        FIFA ratings are sourced from <a href="https://sofifa.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">SoFIFA.com</a>
      </div>
    </div>
  );

  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm modal-overlay animate-fade-in">
      <div className="enhanced-modal bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10 animate-scale-in">
        {/* Header */}
        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="animate-slide-in-left">
            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
            <div className="flex gap-3 mt-2">
              <span className={`modal-badge px-3 py-1 rounded-full text-sm font-semibold animate-slide-in-left ${
                getTeamClass() === 'team-aek' ? 'bg-blue-500/20 text-blue-300' :
                getTeamClass() === 'team-real' ? 'bg-red-500/20 text-red-300' :
                'bg-gray-500/20 text-gray-300'
              }`} style={{ animationDelay: '0.1s' }}>
                {getTeamDisplayName()}
              </span>
              <span className="modal-badge bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
                {player.position || 'N/A'}
              </span>
              {fifaData?.found && (
                <span className="modal-badge bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
                  FIFA {fifaData.overall}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="modal-close-btn w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 animate-slide-in-right"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-6 max-h-[calc(90vh-120px)] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-12 animate-pulse-gentle">
              <div className="text-4xl text-blue-400 mb-4 animate-bounce-gentle">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p className="text-slate-400">Loading FIFA data...</p>
            </div>
          ) : (
            <div className="modal-content-wrapper">
              {/* Basic Info */}
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {renderBasicInfo()}
              </div>
              
              {fifaData?.found ? (
                <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <div className="fifa-stats-section">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                      <i className="fas fa-chart-bar text-yellow-400"></i>
                      FIFA Attribute & Statistiken
                      {fifaData.sofifaUrl && (
                        <a 
                          href={fifaData.sofifaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-auto bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-all duration-300 border border-blue-500/20 hover:scale-105"
                        >
                          <i className="fas fa-external-link-alt mr-2"></i>
                          View on SoFIFA
                        </a>
                      )}
                    </h3>
                    <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
                      {renderFIFAOverview()}
                    </div>
                    <div className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
                      {renderFIFAAttributes()}
                    </div>
                    <div className="animate-fade-in" style={{ animationDelay: '1.0s' }}>
                      {renderFIFASkills()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  {renderNoFIFAData()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetailModal;
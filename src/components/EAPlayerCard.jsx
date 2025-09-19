import React, { useState, useEffect } from 'react';
import { FIFADataService } from '../utils/fifaDataService';

const EAPlayerCard = ({ player, size = 'medium', showDetails = true, onPlayerClick }) => {
  const [fifaData, setFifaData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFIFAData = async () => {
      if (!player?.name) return;
      
      setLoading(true);
      try {
        const data = await FIFADataService.getPlayerData(player.name);
        setFifaData(data);
      } catch (error) {
        console.error('Error loading FIFA data for', player.name, ':', error);
        setFifaData(null);
      } finally {
        setLoading(false);
      }
    };

    loadFIFAData();
  }, [player?.name]);

  const getCardColor = (overall) => {
    if (overall >= 90) return 'bg-gradient-to-br from-purple-600 to-purple-700 shadow-purple-500/30'; // Icon
    if (overall >= 85) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-yellow-500/30'; // Gold
    if (overall >= 80) return 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/30'; // Silver
    if (overall >= 75) return 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30'; // Bronze
    return 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-600/30'; // Common
  };

  const getTextColor = (overall) => {
    if (overall >= 90) return 'text-white';
    if (overall >= 85) return 'text-yellow-900';
    if (overall >= 80) return 'text-gray-900';
    if (overall >= 75) return 'text-orange-900';
    return 'text-white';
  };

  const getSimpleRatingClass = (rating) => {
    if (rating >= 85) return 'rating-excellent';
    if (rating >= 75) return 'rating-good';
    if (rating >= 65) return 'rating-average';
    return 'rating-poor';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          card: 'w-32 h-44',
          overall: 'text-lg',
          name: 'text-xs',
          position: 'text-xs',
          attributes: 'text-xs',
          spacing: 'space-y-1'
        };
      case 'large':
        return {
          card: 'w-48 h-64',
          overall: 'text-3xl',
          name: 'text-sm',
          position: 'text-sm',
          attributes: 'text-sm',
          spacing: 'space-y-2'
        };
      default: // medium
        return {
          card: 'w-40 h-56',
          overall: 'text-2xl',
          name: 'text-sm',
          position: 'text-xs',
          attributes: 'text-xs',
          spacing: 'space-y-1'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const overall = fifaData?.overall || 65;
  const cardColorClass = getCardColor(overall);
  const textColorClass = getTextColor(overall);

  const handleCardClick = () => {
    if (onPlayerClick) {
      onPlayerClick(player);
    }
  };

  if (loading) {
    return (
      <div className={`${sizeClasses.card} ea-card-loading rounded-lg flex items-center justify-center`}>
        <div className="text-gray-400">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`ea-player-card ${sizeClasses.card} ${cardColorClass} rounded-lg shadow-lg relative overflow-hidden transform transition-all duration-200 hover:scale-105 ${onPlayerClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Team Badge */}
      <div className="absolute top-2 left-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          player.team === 'AEK' ? 'bg-blue-600 text-white' : 
          player.team === 'Real' ? 'bg-red-600 text-white' : 
          'bg-gray-600 text-white'
        }`}>
          {player.team}
        </span>
      </div>

      {/* Overall Rating */}
      <div className="absolute top-2 right-2">
        <div className={`${sizeClasses.overall} font-bold ${textColorClass} bg-black/20 rounded-full w-12 h-12 flex items-center justify-center`}>
          {overall}
        </div>
      </div>

      {/* Player Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className={`${sizeClasses.spacing}`}>
          {/* Name and Position */}
          <div className="text-center">
            <h3 className={`${sizeClasses.name} font-bold ${textColorClass} truncate`}>
              {player.name}
            </h3>
            <span className={`${sizeClasses.position} ${textColorClass} bg-black/20 px-2 py-1 rounded`}>
              {fifaData?.positions?.[0] || player.position || 'N/A'}
            </span>
          </div>

          {/* Main Attributes */}
          {showDetails && fifaData && (
            <div className={`grid grid-cols-3 gap-1 ${sizeClasses.spacing} mt-2`}>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.pace)}`}>
                  {fifaData.pace || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  PAC
                </div>
              </div>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.shooting)}`}>
                  {fifaData.shooting || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  SHO
                </div>
              </div>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.passing)}`}>
                  {fifaData.passing || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  PAS
                </div>
              </div>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.dribbling)}`}>
                  {fifaData.dribbling || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  DRI
                </div>
              </div>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.defending)}`}>
                  {fifaData.defending || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  DEF
                </div>
              </div>
              <div className="text-center">
                <div className={`${sizeClasses.attributes} font-bold ${getSimpleRatingClass(fifaData.physical)}`}>
                  {fifaData.physical || 65}
                </div>
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  PHY
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {showDetails && (
            <div className="flex justify-between items-center mt-2">
              <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                Tore: {player.goals || 0}
              </div>
              {player.value && (
                <div className={`${sizeClasses.attributes} ${textColorClass} opacity-80`}>
                  {typeof player.value === 'number' ? `${player.value}M €` : player.value}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIFA Data Source Indicator */}
      {fifaData?.source && (
        <div className="absolute bottom-1 right-1">
          <div className={`text-xs ${textColorClass} opacity-60 bg-black/20 px-1 rounded`}>
            {fifaData.source === 'json_database' ? '🎮' : 
             fifaData.source === 'sofifa_enhanced' ? '🌐' : 
             fifaData.generated ? '🤖' : '📊'}
          </div>
        </div>
      )}
    </div>
  );
};

export default EAPlayerCard;
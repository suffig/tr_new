/**
 * EA Sports Market Insights Component
 * Displays market price trends and insights for players
 */

import React, { useState, useEffect } from 'react';
import { useEASportsIntegration } from '../hooks/useEASportsIntegration';

export const PlayerMarketCard = ({ playerName, onClose }) => {
  const { getMarketPrice, getMarketInsights } = useEASportsIntegration();
  const [loading, setLoading] = useState(true);
  const [priceData, setPriceData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch price and insights
        const [priceResult, insightsResult] = await Promise.all([
          getMarketPrice(playerName),
          getMarketInsights(playerName)
        ]);

        if (priceResult.data) {
          setPriceData(priceResult.data);
        }

        if (insightsResult.data) {
          setInsights(insightsResult.data);
        }

        if (!priceResult.data && !insightsResult.data) {
          setError('Keine Marktdaten verfügbar');
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerName, getMarketPrice, getMarketInsights]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{playerName}</h3>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('de-DE').format(price) + ' Coins';
  };

  const getRecommendationColor = (action) => {
    switch (action) {
      case 'buy': return 'text-green-600 bg-green-50';
      case 'sell': return 'text-red-600 bg-red-50';
      case 'hold': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{playerName}</h3>
            <p className="text-blue-100 text-sm mt-1">Marktanalyse</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white hover:text-gray-200">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Price Data */}
      {priceData && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">💰 Marktpreise</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-blue-600 text-sm mb-1">Aktueller Preis</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatPrice(priceData.currentPrice)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-green-600 text-sm mb-1">Niedrigster Preis</div>
              <div className="text-xl font-bold text-green-700">
                {formatPrice(priceData.lowestPrice)}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-orange-600 text-sm mb-1">Höchster Preis</div>
              <div className="text-xl font-bold text-orange-700">
                {formatPrice(priceData.highestPrice)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-purple-600 text-sm mb-1">Durchschnitt</div>
              <div className="text-xl font-bold text-purple-700">
                {formatPrice(priceData.averagePrice)}
              </div>
            </div>
          </div>
          {priceData.volume !== undefined && (
            <div className="mt-4 text-center text-sm text-gray-600">
              <span className="font-medium">Handelsvolumen:</span> {priceData.volume} Transaktionen
            </div>
          )}
        </div>
      )}

      {/* Market Insights */}
      {insights && (
        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">📊 Marktanalyse</h4>
          
          {/* Trend */}
          {insights.trend && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getTrendIcon(insights.trend.trend)}</span>
                <div>
                  <div className="font-semibold text-gray-900">
                    Trend: {insights.trend.trend === 'rising' ? 'Steigend' : 
                             insights.trend.trend === 'falling' ? 'Fallend' : 'Stabil'}
                  </div>
                  <div className={`text-sm ${
                    parseFloat(insights.trend.percentageChange) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {insights.trend.percentageChange}% Veränderung
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          {insights.recommendation && (
            <div className={`p-4 rounded-lg mb-4 ${getRecommendationColor(insights.recommendation.action)}`}>
              <div className="font-semibold text-lg mb-1">
                Empfehlung: {insights.recommendation.action.toUpperCase()}
              </div>
              <p className="text-sm">{insights.recommendation.reason}</p>
              <div className="text-xs mt-2 opacity-75">
                Konfidenz: {insights.recommendation.confidence}
              </div>
            </div>
          )}

          {/* Volatility */}
          {insights.volatility !== undefined && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm font-medium text-yellow-800">
                📊 Volatilität: {insights.volatility}%
              </div>
              <div className="text-xs text-yellow-700 mt-1">
                {parseFloat(insights.volatility) > 10 ? 
                  'Hohe Preisschwankungen - risikoreicher Handel' :
                  'Stabile Preisentwicklung - niedrigeres Risiko'}
              </div>
            </div>
          )}

          {/* Best Buy Time */}
          {insights.bestBuyTime && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
              <div className="text-sm font-medium text-green-800">
                💡 Bester Kaufzeitpunkt
              </div>
              <div className="text-xs text-green-700 mt-1">
                {insights.bestBuyTime.date} - {formatPrice(insights.bestBuyTime.price)}
                {insights.bestBuyTime.daysAgo !== undefined && 
                  ` (vor ${insights.bestBuyTime.daysAgo} Tagen)`}
              </div>
            </div>
          )}

          {/* Projected Price */}
          {insights.projectedPrice && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-purple-800">
                🔮 Preisprognose (7 Tage)
              </div>
              <div className="text-xl font-bold text-purple-900 mt-1">
                {formatPrice(insights.projectedPrice.price)}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Konfidenz: {insights.projectedPrice.confidence}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Info */}
      <div className="px-6 pb-4">
        <div className="text-xs text-gray-500 text-center">
          Daten von EA Sports API • Aktualisiert vor wenigen Minuten
        </div>
      </div>
    </div>
  );
};

export default PlayerMarketCard;

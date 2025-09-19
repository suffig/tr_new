import { useMemo, useState } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import LoadingSpinner from './LoadingSpinner';

export default function TeamPerformanceHeatmap() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
  const [selectedMetric, setSelectedMetric] = useState('goals');
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly', 'monthly'

  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*', {
    order: { column: 'date', ascending: false }
  });
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');

  const loading = matchesLoading || playersLoading;

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    if (!matches || !players) return null;

    // Filter matches based on timeframe
    const now = new Date();
    const timeframes = {
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365
    };

    const daysBack = timeframes[selectedTimeframe];
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const filteredMatches = matches.filter(match => new Date(match.date) >= cutoffDate);

    // Group matches by time periods
    const groupedData = {};
    
    filteredMatches.forEach(match => {
      const matchDate = new Date(match.date);
      let periodKey;
      
      if (viewMode === 'weekly') {
        // Get week start (Monday)
        const weekStart = new Date(matchDate);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        // Monthly grouping
        periodKey = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {
          period: periodKey,
          matches: [],
          aekStats: { goals: 0, wins: 0, totalMatches: 0 },
          realStats: { goals: 0, wins: 0, totalMatches: 0 }
        };
      }

      groupedData[periodKey].matches.push(match);
      groupedData[periodKey].aekStats.goals += match.goalsa || 0;
      groupedData[periodKey].realStats.goals += match.goalsb || 0;
      groupedData[periodKey].aekStats.totalMatches++;
      groupedData[periodKey].realStats.totalMatches++;

      if (match.goalsa > match.goalsb) {
        groupedData[periodKey].aekStats.wins++;
      } else if (match.goalsb > match.goalsa) {
        groupedData[periodKey].realStats.wins++;
      }
    });

    // Calculate derived metrics
    Object.values(groupedData).forEach(period => {
      // Win rate
      period.aekStats.winRate = period.aekStats.totalMatches > 0 
        ? (period.aekStats.wins / period.aekStats.totalMatches) * 100 
        : 0;
      period.realStats.winRate = period.realStats.totalMatches > 0 
        ? (period.realStats.wins / period.realStats.totalMatches) * 100 
        : 0;

      // Goals per match
      period.aekStats.goalsPerMatch = period.aekStats.totalMatches > 0 
        ? period.aekStats.goals / period.aekStats.totalMatches 
        : 0;
      period.realStats.goalsPerMatch = period.realStats.totalMatches > 0 
        ? period.realStats.goals / period.realStats.totalMatches 
        : 0;

      // Performance score (composite)
      period.aekStats.performance = (period.aekStats.winRate * 0.6) + (period.aekStats.goalsPerMatch * 20);
      period.realStats.performance = (period.realStats.winRate * 0.6) + (period.realStats.goalsPerMatch * 20);
    });

    // Sort by period
    const sortedPeriods = Object.values(groupedData).sort((a, b) => 
      new Date(a.period) - new Date(b.period)
    );

    return {
      periods: sortedPeriods,
      maxValues: {
        goals: Math.max(...sortedPeriods.flatMap(p => [p.aekStats.goals, p.realStats.goals])),
        wins: Math.max(...sortedPeriods.flatMap(p => [p.aekStats.wins, p.realStats.wins])),
        winRate: Math.max(...sortedPeriods.flatMap(p => [p.aekStats.winRate, p.realStats.winRate])),
        goalsPerMatch: Math.max(...sortedPeriods.flatMap(p => [p.aekStats.goalsPerMatch, p.realStats.goalsPerMatch])),
        performance: Math.max(...sortedPeriods.flatMap(p => [p.aekStats.performance, p.realStats.performance]))
      }
    };
  }, [matches, players, selectedTimeframe, viewMode]);

  const getIntensityColor = (value, maxValue, team) => {
    if (maxValue === 0) return 'bg-gray-100';
    
    const intensity = Math.min(value / maxValue, 1);
    const baseColor = team === 'AEK' ? 'blue' : 'red';
    
    if (intensity === 0) return 'bg-gray-100';
    if (intensity <= 0.2) return `bg-${baseColor}-100`;
    if (intensity <= 0.4) return `bg-${baseColor}-200`;
    if (intensity <= 0.6) return `bg-${baseColor}-300`;
    if (intensity <= 0.8) return `bg-${baseColor}-400`;
    return `bg-${baseColor}-500`;
  };

  const formatPeriodLabel = (period) => {
    if (viewMode === 'weekly') {
      const date = new Date(period);
      return `KW ${getWeekNumber(date)}`;
    } else {
      const [year, month] = period.split('-');
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  if (loading) {
    return <LoadingSpinner message="Lade Heatmap..." />;
  }

  if (!heatmapData || heatmapData.periods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Keine Daten für den ausgewählten Zeitraum verfügbar.
      </div>
    );
  }

  const { periods, maxValues } = heatmapData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          🔥 Team Performance Heatmap
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="text-sm border rounded px-3 py-2"
          >
            <option value="1month">Letzter Monat</option>
            <option value="3months">Letzte 3 Monate</option>
            <option value="6months">Letzte 6 Monate</option>
            <option value="1year">Letztes Jahr</option>
          </select>
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="text-sm border rounded px-3 py-2"
          >
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
          </select>
          
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="text-sm border rounded px-3 py-2"
          >
            <option value="goals">Tore</option>
            <option value="wins">Siege</option>
            <option value="winRate">Siegquote (%)</option>
            <option value="goalsPerMatch">Tore/Spiel</option>
            <option value="performance">Performance Score</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Intensität</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <span>Niedrig</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <div className="w-4 h-4 bg-blue-200 rounded"></div>
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <div className="w-4 h-4 bg-blue-400 rounded"></div>
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
          </div>
          <span>Hoch (AEK)</span>
          <div className="w-8"></div>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <div className="w-4 h-4 bg-red-200 rounded"></div>
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <div className="w-4 h-4 bg-red-500 rounded"></div>
          </div>
          <span>Hoch (Real)</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">
            {selectedMetric === 'goals' && 'Tore pro Zeitraum'}
            {selectedMetric === 'wins' && 'Siege pro Zeitraum'}
            {selectedMetric === 'winRate' && 'Siegquote pro Zeitraum'}
            {selectedMetric === 'goalsPerMatch' && 'Tore pro Spiel'}
            {selectedMetric === 'performance' && 'Performance Score pro Zeitraum'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Period Headers */}
            <div className="grid grid-flow-col auto-cols-fr gap-1 p-4 pb-2">
              <div className="w-16"></div> {/* Team label space */}
              {periods.map((period) => (
                <div key={period.period} className="text-center">
                  <div className="text-xs text-gray-600 transform -rotate-45 origin-center">
                    {formatPeriodLabel(period.period)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* AEK Row */}
            <div className="grid grid-flow-col auto-cols-fr gap-1 px-4 py-2">
              <div className="w-16 flex items-center">
                <span className="text-sm font-medium text-blue-600">AEK</span>
              </div>
              {periods.map((period) => {
                const value = period.aekStats[selectedMetric];
                const maxValue = maxValues[selectedMetric];
                return (
                  <div
                    key={`aek-${period.period}`}
                    className={`
                      h-12 rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md
                      ${getIntensityColor(value, maxValue, 'AEK')}
                    `}
                    title={`AEK ${formatPeriodLabel(period.period)}: ${
                      selectedMetric === 'winRate' || selectedMetric === 'performance' 
                        ? value.toFixed(1) 
                        : Math.round(value)
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                      {selectedMetric === 'winRate' || selectedMetric === 'performance' 
                        ? value.toFixed(1) 
                        : Math.round(value)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Real Row */}
            <div className="grid grid-flow-col auto-cols-fr gap-1 px-4 py-2">
              <div className="w-16 flex items-center">
                <span className="text-sm font-medium text-red-600">Real</span>
              </div>
              {periods.map((period) => {
                const value = period.realStats[selectedMetric];
                const maxValue = maxValues[selectedMetric];
                return (
                  <div
                    key={`real-${period.period}`}
                    className={`
                      h-12 rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md
                      ${getIntensityColor(value, maxValue, 'Real')}
                    `}
                    title={`Real ${formatPeriodLabel(period.period)}: ${
                      selectedMetric === 'winRate' || selectedMetric === 'performance' 
                        ? value.toFixed(1) 
                        : Math.round(value)
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                      {selectedMetric === 'winRate' || selectedMetric === 'performance' 
                        ? value.toFixed(1) 
                        : Math.round(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">AEK Durchschnitte</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tore/Zeitraum:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.aekStats.goals, 0) / periods.length).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Siegquote:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.aekStats.winRate, 0) / periods.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Performance:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.aekStats.performance, 0) / periods.length).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-medium text-red-900 mb-3">Real Durchschnitte</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tore/Zeitraum:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.realStats.goals, 0) / periods.length).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Siegquote:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.realStats.winRate, 0) / periods.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Performance:</span>
              <span className="font-medium">
                {(periods.reduce((sum, p) => sum + p.realStats.performance, 0) / periods.length).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
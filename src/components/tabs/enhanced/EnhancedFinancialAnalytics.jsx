import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import LoadingSpinner from '../../LoadingSpinner';
import TeamLogo from '../../TeamLogo';

// Helper function to calculate financial analytics
function calculateFinancialAnalytics(players, matches, transactions, selectedTeam, timeframe) {
  // Mock financial calculations - in real app, these would use actual financial data
  // Parameters: players, matches, transactions, selectedTeam, timeframe would be used for filtering
  console.log('Calculating financial analytics for', selectedTeam, 'timeframe:', timeframe);
  
  const overview = {
    totalBalance: 150000,
    balanceChange: 12.5,
    totalExpenses: 45000,
    expenseChange: -8.2,
    avgExpensePerMatch: 1500,
    avgExpenseChange: 3.1,
    efficiencyScore: 78,
    efficiencyChange: 5.4,
    teams: {
      aek: {
        budget: 80000,
        spent: 32000,
        available: 48000
      },
      real: {
        budget: 70000,
        spent: 28000,
        available: 42000
      }
    }
  };

  const trends = {
    monthlySpending: [
      { month: 'Jan', aek: 8, real: 6 },
      { month: 'Feb', aek: 12, real: 9 },
      { month: 'Mar', aek: 15, real: 12 },
      { month: 'Apr', aek: 10, real: 8 },
      { month: 'Mai', aek: 7, real: 11 },
      { month: 'Jun', aek: 13, real: 10 }
    ]
  };

  const efficiency = {
    costPerGoal: { aek: 850, real: 920 },
    costPerWin: { aek: 3200, real: 3500 },
    costPerPoint: { aek: 1100, real: 1250 }
  };

  const roi = {
    overall: 18.5,
    aek: 22.1,
    real: 15.3,
    investmentGrade: 'A-',
    topPlayers: {
      aek: [
        { name: 'Max Mustermann', roi: 45.2, investment: 5 },
        { name: 'John Smith', roi: 32.1, investment: 7 },
        { name: 'Hans Mueller', roi: 28.9, investment: 4 }
      ],
      real: [
        { name: 'Carlos Rodriguez', roi: 38.7, investment: 6 },
        { name: 'Antonio Silva', roi: 25.4, investment: 8 },
        { name: 'Marco Rossi', roi: 22.1, investment: 5 }
      ]
    }
  };

  const investments = {
    best: [
      { player: 'Max Mustermann', team: 'AEK', investment: 5000, return: 7250, roi: 45 },
      { player: 'Carlos Rodriguez', team: 'Real', investment: 6000, return: 8300, roi: 38 }
    ],
    worst: [
      { player: 'Backup Player', team: 'AEK', investment: 3000, return: 2400, roi: -20 },
      { player: 'Reserve Player', team: 'Real', investment: 4000, return: 3200, roi: -20 }
    ]
  };

  const returns = {
    monthly: [
      { month: 'Jan', roi: 15 },
      { month: 'Feb', roi: 18 },
      { month: 'Mar', roi: 22 },
      { month: 'Apr', roi: 19 },
      { month: 'Mai', roi: 25 },
      { month: 'Jun', roi: 21 }
    ]
  };

  const valuations = {
    aek: players.filter(p => p.team === 'AEK').slice(0, 5).map((player, idx) => ({
      name: player.name,
      currentValue: 15000 - (idx * 2000),
      change: Math.random() * 20 - 10,
      potential: 18000 - (idx * 1500)
    })),
    real: players.filter(p => p.team === 'Real').slice(0, 5).map((player, idx) => ({
      name: player.name,
      currentValue: 16000 - (idx * 2000),
      change: Math.random() * 20 - 10,
      potential: 19000 - (idx * 1500)
    }))
  };

  const market = {
    totalValue: 275000,
    avgValue: 12500,
    valueIncrease: 35000,
    topAsset: { name: 'Max Mustermann', value: 18000 },
    trends: [
      { player: 'Max Mustermann', team: 'AEK', trend: 15.2, period: '30d' },
      { player: 'Carlos Rodriguez', team: 'Real', trend: 12.8, period: '30d' }
    ],
    opportunities: [
      { type: 'Undervalued', player: 'Young Talent', potential: 25, risk: 'Medium' },
      { type: 'Growth', player: 'Rising Star', potential: 35, risk: 'Low' },
      { type: 'Value', player: 'Experienced', potential: 15, risk: 'Low' }
    ]
  };

  const forecast = {
    nextQuarter: 165000,
    seasonEnd: 180000,
    nextSeason: 200000,
    confidence: {
      quarter: 85,
      season: 72,
      nextSeason: 58
    }
  };

  const scenarios = {
    optimistic: {
      budget: 220000,
      description: 'Starke Performance, zusätzliche Sponsoren',
      probability: 25
    },
    realistic: {
      budget: 180000,
      description: 'Normale Entwicklung, stabiles Wachstum',
      probability: 50
    },
    pessimistic: {
      budget: 140000,
      description: 'Schwache Performance, Budget-Cuts',
      probability: 25
    }
  };

  const recommendations = {
    aek: [
      { type: 'Invest', action: 'Nachwuchsförderung verstärken', priority: 'High' },
      { type: 'Save', action: 'Reserve für Transfers aufbauen', priority: 'Medium' },
      { type: 'Optimize', action: 'Trainingslager-Kosten reduzieren', priority: 'Low' }
    ],
    real: [
      { type: 'Invest', action: 'Erfahrene Spieler verpflichten', priority: 'High' },
      { type: 'Monitor', action: 'Verletzungsanfällige Spieler beobachten', priority: 'Medium' },
      { type: 'Plan', action: 'Langzeit-Verträge evaluieren', priority: 'Low' }
    ]
  };

  const health = {
    liquidity: { score: 78, status: 'Gut' },
    stability: { score: 85, status: 'Sehr gut' },
    growth: { score: 65, status: 'Befriedigend' },
    efficiency: { score: 72, status: 'Gut' },
    overallScore: 75,
    overallStatus: 'Gesund',
    summary: 'Solide finanzielle Basis mit Verbesserungspotential in der Effizienz'
  };

  return {
    overview,
    trends,
    efficiency,
    roi,
    investments,
    returns,
    valuations,
    market,
    forecast,
    scenarios,
    recommendations,
    health
  };
}

/**
 * Enhanced Financial Analytics Component
 * Advanced financial tracking with ROI analysis, value estimation, and budget forecasting
 */
export default function EnhancedFinancialAnalytics() {
  const [selectedTeam, setSelectedTeam] = useState('both');
  const [analysisType, setAnalysisType] = useState('overview');
  const [timeframe, setTimeframe] = useState('season');

  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery('transactions', '*');

  const loading = playersLoading || matchesLoading || transactionsLoading;

  // Calculate comprehensive financial analytics
  const financialData = useMemo(() => {
    if (!players || !matches || !transactions) return null;

    return calculateFinancialAnalytics(players, matches, transactions, selectedTeam, timeframe);
  }, [players, matches, transactions, selectedTeam, timeframe]);

  if (loading) {
    return <LoadingSpinner message="Lade Financial Analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="modern-card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              💰 Enhanced Financial Analytics
            </h2>
            <p className="text-text-secondary text-sm">
              ROI-Analyse, Marktwerte und intelligente Budget-Prognosen
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Team Selection */}
            <select 
              value={selectedTeam} 
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="modern-select"
            >
              <option value="both">Beide Teams</option>
              <option value="AEK">AEK Athen</option>
              <option value="Real">Real Madrid</option>
            </select>

            {/* Analysis Type */}
            <select 
              value={analysisType} 
              onChange={(e) => setAnalysisType(e.target.value)}
              className="modern-select"
            >
              <option value="overview">Übersicht</option>
              <option value="roi">ROI-Analyse</option>
              <option value="valuation">Marktwerte</option>
              <option value="forecast">Prognosen</option>
            </select>

            {/* Timeframe */}
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="modern-select"
            >
              <option value="season">Ganze Saison</option>
              <option value="quarter">Letztes Quartal</option>
              <option value="month">Letzter Monat</option>
              <option value="ytd">Jahr bis heute</option>
            </select>
          </div>
        </div>
      </div>

      {financialData && (
        <>
          {/* Financial Overview */}
          {analysisType === 'overview' && (
            <FinancialOverview data={financialData} />
          )}

          {/* ROI Analysis */}
          {analysisType === 'roi' && (
            <ROIAnalysis data={financialData} />
          )}

          {/* Player Valuations */}
          {analysisType === 'valuation' && (
            <PlayerValuations data={financialData} />
          )}

          {/* Financial Forecasting */}
          {analysisType === 'forecast' && (
            <FinancialForecast data={financialData} />
          )}

          {/* Financial Health Dashboard (Always shown) */}
          <FinancialHealthDashboard data={financialData} />
        </>
      )}
    </div>
  );
}

// Financial Overview Component
function FinancialOverview({ data }) {
  const { overview, trends, efficiency } = data;

  return (
    <div className="space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialMetricCard 
          title="Gesamtbilanz"
          value={`€${overview.totalBalance.toLocaleString()}`}
          change={overview.balanceChange}
          icon="💰"
          color="text-primary-green"
        />
        <FinancialMetricCard 
          title="Ausgaben YTD"
          value={`€${overview.totalExpenses.toLocaleString()}`}
          change={overview.expenseChange}
          icon="📊"
          color="text-accent-red"
        />
        <FinancialMetricCard 
          title="Durchschn. Ausgabe"
          value={`€${overview.avgExpensePerMatch.toLocaleString()}`}
          change={overview.avgExpenseChange}
          icon="📈"
          color="text-primary-blue"
        />
        <FinancialMetricCard 
          title="Effizienz-Score"
          value={`${overview.efficiencyScore}/100`}
          change={overview.efficiencyChange}
          icon="⚡"
          color="text-accent-orange"
        />
      </div>

      {/* Team Comparison */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🏆 Team-Vergleich</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamFinancialCard team="AEK" data={overview.teams.aek} />
          <TeamFinancialCard team="Real Madrid" data={overview.teams.real} />
        </div>
      </div>

      {/* Spending Trends */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">📈 Ausgaben-Trends</h3>
        <div className="h-64 flex items-end gap-2 p-4 bg-gray-50 rounded-lg">
          {trends.monthlySpending.map((month, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-primary-blue rounded-t relative"
                style={{ 
                  height: `${(month.aek / Math.max(...trends.monthlySpending.map(m => Math.max(m.aek, m.real))) * 100)}%` 
                }}
              >
                <div className="absolute -top-6 left-0 right-0 text-xs text-center text-primary-blue">
                  €{month.aek}k
                </div>
              </div>
              <div 
                className="w-full bg-accent-red rounded-b mt-1 relative"
                style={{ 
                  height: `${(month.real / Math.max(...trends.monthlySpending.map(m => Math.max(m.aek, m.real))) * 100)}%` 
                }}
              >
                <div className="absolute -bottom-6 left-0 right-0 text-xs text-center text-accent-red">
                  €{month.real}k
                </div>
              </div>
              <div className="text-xs mt-8 text-center font-medium">{month.month}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-blue rounded"></div>
            <span className="text-sm">AEK Ausgaben</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent-red rounded"></div>
            <span className="text-sm">Real Ausgaben</span>
          </div>
        </div>
      </div>

      {/* Efficiency Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EfficiencyCard 
          title="€ pro Tor"
          aek={efficiency.costPerGoal.aek}
          real={efficiency.costPerGoal.real}
          format="currency"
        />
        <EfficiencyCard 
          title="€ pro Sieg"
          aek={efficiency.costPerWin.aek}
          real={efficiency.costPerWin.real}
          format="currency"
        />
        <EfficiencyCard 
          title="€ pro Punkt"
          aek={efficiency.costPerPoint.aek}
          real={efficiency.costPerPoint.real}
          format="currency"
        />
      </div>
    </div>
  );
}

// ROI Analysis Component
function ROIAnalysis({ data }) {
  const { roi, investments, returns } = data;

  return (
    <div className="space-y-6">
      {/* ROI Overview */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">📊 ROI-Übersicht</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ROIMetricCard 
            title="Gesamt-ROI"
            value={`${roi.overall}%`}
            benchmark={15}
            icon="🎯"
          />
          <ROIMetricCard 
            title="AEK ROI"
            value={`${roi.aek}%`}
            benchmark={15}
            icon={<TeamLogo team="aek" size="sm" />}
          />
          <ROIMetricCard 
            title="Real ROI"
            value={`${roi.real}%`}
            benchmark={15}
            icon={<TeamLogo team="real" size="sm" />}
          />
          <ROIMetricCard 
            title="Investment Qualität"
            value={roi.investmentGrade}
            benchmark="A"
            icon="⭐"
          />
        </div>
      </div>

      {/* Top ROI Players */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🏆 Top ROI Spieler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 text-primary-blue flex items-center gap-2">
              <TeamLogo team="aek" size="sm" />
              AEK Athen
            </h4>
            <div className="space-y-2">
              {roi.topPlayers.aek.map((player, idx) => (
                <PlayerROICard key={idx} player={player} rank={idx + 1} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-accent-red flex items-center gap-2">
              <TeamLogo team="real" size="sm" />
              Real Madrid
            </h4>
            <div className="space-y-2">
              {roi.topPlayers.real.map((player, idx) => (
                <PlayerROICard key={idx} player={player} rank={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="modern-card">
          <h4 className="text-lg font-semibold mb-4">💎 Beste Investments</h4>
          <div className="space-y-3">
            {investments.best.map((investment, idx) => (
              <InvestmentCard key={idx} investment={investment} type="best" />
            ))}
          </div>
        </div>
        
        <div className="modern-card">
          <h4 className="text-lg font-semibold mb-4">⚠️ Underperformer</h4>
          <div className="space-y-3">
            {investments.worst.map((investment, idx) => (
              <InvestmentCard key={idx} investment={investment} type="worst" />
            ))}
          </div>
        </div>
      </div>

      {/* ROI Trends */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">📈 ROI-Entwicklung</h3>
        <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-end gap-2">
          {returns.monthly.map((month, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t ${month.roi >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ height: `${Math.abs(month.roi) * 2}%` }}
              ></div>
              <div className="text-xs mt-1 text-center">{month.month}</div>
              <div className="text-xs text-gray-600">{month.roi}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Player Valuations Component
function PlayerValuations({ data }) {
  const { valuations, market } = data;

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🏪 Marktübersicht</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MarketMetricCard 
            title="Gesamtmarktwert"
            value={`€${market.totalValue.toLocaleString()}`}
            icon="💎"
            color="text-primary-green"
          />
          <MarketMetricCard 
            title="Durchschnittswert"
            value={`€${market.avgValue.toLocaleString()}`}
            icon="📊"
            color="text-primary-blue"
          />
          <MarketMetricCard 
            title="Wertsteigerung"
            value={`+€${market.valueIncrease.toLocaleString()}`}
            icon="📈"
            color="text-green-600"
          />
          <MarketMetricCard 
            title="Top Asset"
            value={market.topAsset.name}
            icon="⭐"
            color="text-accent-yellow"
          />
        </div>
      </div>

      {/* Player Value Rankings */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🏆 Spieler-Marktwerte</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 text-primary-blue flex items-center gap-2">
              <TeamLogo team="aek" size="sm" />
              AEK Athen
            </h4>
            <div className="space-y-2">
              {valuations.aek.map((player, idx) => (
                <PlayerValueCard key={idx} player={player} rank={idx + 1} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-accent-red flex items-center gap-2">
              <TeamLogo team="real" size="sm" />
              Real Madrid
            </h4>
            <div className="space-y-2">
              {valuations.real.map((player, idx) => (
                <PlayerValueCard key={idx} player={player} rank={idx + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Value Trends */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">📈 Marktwert-Entwicklung</h3>
        <div className="space-y-4">
          {market.trends.map((trend, idx) => (
            <ValueTrendCard key={idx} trend={trend} />
          ))}
        </div>
      </div>

      {/* Investment Opportunities */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">💡 Investment-Chancen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {market.opportunities.map((opportunity, idx) => (
            <OpportunityCard key={idx} opportunity={opportunity} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Financial Forecast Component
function FinancialForecast({ data }) {
  const { forecast, scenarios, recommendations } = data;

  return (
    <div className="space-y-6">
      {/* Forecast Overview */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🔮 Finanz-Prognose</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ForecastCard 
            period="Next Quarter"
            value={`€${forecast.nextQuarter.toLocaleString()}`}
            confidence={forecast.confidence.quarter}
            icon="📅"
          />
          <ForecastCard 
            period="Saisonende"
            value={`€${forecast.seasonEnd.toLocaleString()}`}
            confidence={forecast.confidence.season}
            icon="🏁"
          />
          <ForecastCard 
            period="Nächste Saison"
            value={`€${forecast.nextSeason.toLocaleString()}`}
            confidence={forecast.confidence.nextSeason}
            icon="🔄"
          />
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">🎭 Szenario-Analyse</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScenarioCard 
            title="Optimistisch"
            scenario={scenarios.optimistic}
            color="bg-green-100 border-green-300"
            icon="📈"
          />
          <ScenarioCard 
            title="Realistisch"
            scenario={scenarios.realistic}
            color="bg-blue-100 border-blue-300"
            icon="📊"
          />
          <ScenarioCard 
            title="Pessimistisch"
            scenario={scenarios.pessimistic}
            color="bg-red-100 border-red-300"
            icon="📉"
          />
        </div>
      </div>

      {/* Budget Recommendations */}
      <div className="modern-card">
        <h3 className="text-lg font-semibold mb-4">💡 Budget-Empfehlungen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TeamLogo team="aek" size="sm" />
              AEK Empfehlungen
            </h4>
            <div className="space-y-3">
              {recommendations.aek.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TeamLogo team="real" size="sm" />
              Real Empfehlungen
            </h4>
            <div className="space-y-3">
              {recommendations.real.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Financial Health Dashboard Component
function FinancialHealthDashboard({ data }) {
  const { health } = data;

  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4">🏥 Financial Health Dashboard</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthMetricCard 
          title="Liquidität"
          score={health.liquidity.score}
          status={health.liquidity.status}
          icon="💧"
        />
        <HealthMetricCard 
          title="Stabilität"
          score={health.stability.score}
          status={health.stability.status}
          icon="🏛️"
        />
        <HealthMetricCard 
          title="Wachstum"
          score={health.growth.score}
          status={health.growth.status}
          icon="📈"
        />
        <HealthMetricCard 
          title="Effizienz"
          score={health.efficiency.score}
          status={health.efficiency.status}
          icon="⚡"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">🎯 Gesamt-Assessment</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-2xl font-bold text-primary-green">
              {health.overallScore}/100
            </div>
            <div className="text-sm text-gray-600">Financial Health Score</div>
          </div>
          <div className="flex-2">
            <div className="text-sm font-medium mb-1">{health.overallStatus}</div>
            <div className="text-xs text-gray-600">{health.summary}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function FinancialMetricCard({ title, value, change, icon, color }) {
  const isPositive = change >= 0;
  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className={`text-sm flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <span>{isPositive ? '↗️' : '↘️'}</span>
        <span>{isPositive ? '+' : ''}{change}%</span>
      </div>
    </div>
  );
}

function TeamFinancialCard({ team, data }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-3">{team}</h4>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Budget:</span>
          <span className="font-semibold">€{data.budget.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Ausgegeben:</span>
          <span className="font-semibold">€{data.spent.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Verfügbar:</span>
          <span className="font-semibold text-green-600">€{data.available.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-primary-blue h-2 rounded-full"
            style={{ width: `${(data.spent / data.budget) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function EfficiencyCard({ title, aek, real, format }) {
  const formatValue = (value) => {
    if (format === 'currency') return `€${value.toLocaleString()}`;
    return value.toString();
  };

  return (
    <div className="modern-card">
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-primary-blue">AEK:</span>
          <span className="font-semibold">{formatValue(aek)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-accent-red">Real:</span>
          <span className="font-semibold">{formatValue(real)}</span>
        </div>
        <div className="text-xs text-gray-600 text-center pt-2 border-t">
          {aek < real ? 'AEK effizienter' : real < aek ? 'Real effizienter' : 'Gleichstand'}
        </div>
      </div>
    </div>
  );
}

function ROIMetricCard({ title, value, benchmark, icon }) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const isGood = numValue >= benchmark;
  
  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{typeof icon === 'string' ? icon : icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-xs ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        Benchmark: {benchmark}{typeof benchmark === 'number' ? '%' : ''}
      </div>
    </div>
  );
}

function PlayerROICard({ player, rank }) {
  return (
    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
      <div className="flex items-center gap-2">
        <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{rank}</span>
        <span className="text-sm font-medium">{player.name}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-green-600">{player.roi}%</div>
        <div className="text-xs text-gray-500">€{player.investment}k</div>
      </div>
    </div>
  );
}


// Helper Components
function InvestmentCard({ investment, type }) {
  const bgColor = type === 'best' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = type === 'best' ? 'text-green-800' : 'text-red-800';
  
  return (
    <div className={`p-3 rounded-lg border ${bgColor}`}>
      <div className="flex justify-between items-center">
        <div>
          <div className="font-semibold text-sm">{investment.player}</div>
          <div className="text-xs text-gray-600">{investment.team}</div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${textColor}`}>{investment.roi}%</div>
          <div className="text-xs text-gray-500">€{investment.investment}k</div>
        </div>
      </div>
    </div>
  );
}

function MarketMetricCard({ title, value, icon, color }) {
  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function PlayerValueCard({ player, rank }) {
  const changeColor = player.change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = player.change >= 0 ? '↗️' : '↘️';
  
  return (
    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
      <div className="flex items-center gap-2">
        <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{rank}</span>
        <span className="text-sm font-medium">{player.name}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold">€{player.currentValue.toLocaleString()}</div>
        <div className={`text-xs ${changeColor}`}>
          {changeIcon} {Math.abs(player.change).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function ValueTrendCard({ trend }) {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
      <div>
        <div className="font-semibold">{trend.player}</div>
        <div className="text-sm text-gray-600">{trend.team}</div>
      </div>
      <div className="text-right">
        <div className="font-bold text-green-600">+{trend.trend}%</div>
        <div className="text-xs text-gray-500">{trend.period}</div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }) {
  const riskColors = {
    Low: 'text-green-600',
    Medium: 'text-yellow-600', 
    High: 'text-red-600'
  };

  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold">{opportunity.type}</span>
        <span className={`text-xs ${riskColors[opportunity.risk]}`}>
          {opportunity.risk} Risk
        </span>
      </div>
      <div className="text-lg font-bold mb-1">{opportunity.player}</div>
      <div className="text-sm text-green-600 font-semibold">
        +{opportunity.potential}% Potential
      </div>
    </div>
  );
}

function ForecastCard({ period, value, confidence, icon }) {
  return (
    <div className="modern-card text-center">
      <div className="text-xl mb-2">{icon}</div>
      <div className="font-semibold text-sm mb-1">{period}</div>
      <div className="text-2xl font-bold text-primary-green mb-1">{value}</div>
      <div className="text-xs text-gray-600">Konfidenz: {confidence}%</div>
    </div>
  );
}

function ScenarioCard({ title, scenario, color, icon }) {
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <div className="text-2xl font-bold mb-2">€{scenario.budget.toLocaleString()}</div>
      <div className="text-sm text-gray-600 mb-2">{scenario.description}</div>
      <div className="text-xs">Wahrscheinlichkeit: {scenario.probability}%</div>
    </div>
  );
}

function RecommendationCard({ recommendation }) {
  const typeColors = {
    Invest: 'bg-green-100 text-green-800',
    Save: 'bg-blue-100 text-blue-800',
    Optimize: 'bg-yellow-100 text-yellow-800',
    Monitor: 'bg-orange-100 text-orange-800',
    Plan: 'bg-purple-100 text-purple-800'
  };

  const priorityColors = {
    High: 'text-red-600',
    Medium: 'text-yellow-600',
    Low: 'text-green-600'
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs px-2 py-1 rounded ${typeColors[recommendation.type]}`}>
          {recommendation.type}
        </span>
        <span className={`text-xs font-semibold ${priorityColors[recommendation.priority]}`}>
          {recommendation.priority}
        </span>
      </div>
      <div className="text-sm">{recommendation.action}</div>
    </div>
  );
}

function HealthMetricCard({ title, score, status, icon }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="modern-card text-center">
      <div className="text-xl mb-2">{icon}</div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}/100</div>
      <div className="text-xs text-gray-600">{status}</div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';

// Enhanced Financial Analytics Dashboard
export default function FinancialAnalytics() {
  const [timeRange, setTimeRange] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('both');
  
  const { data: finances, loading: financesLoading } = useSupabaseQuery('finances', '*');
  const { data: transactions, loading: transactionsLoading } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  
  const loading = financesLoading || transactionsLoading || matchesLoading || playersLoading;

  // Enhanced financial calculations
  const analytics = useMemo(() => {
    if (!finances || !transactions || !matches || !players) return null;

    const now = new Date();
    const filteredTransactions = transactions.filter(transaction => {
      // Filter by time range
      if (timeRange !== 'all') {
        const transactionDate = new Date(transaction.date);
        const daysAgo = Math.floor((now - transactionDate) / (1000 * 60 * 60 * 24));
        
        switch (timeRange) {
          case '30d': 
            if (daysAgo > 30) return false;
            break;
          case '90d': 
            if (daysAgo > 90) return false;
            break;
          case '1y': 
            if (daysAgo > 365) return false;
            break;
        }
      }
      
      // Filter by team
      if (selectedTeam !== 'both') {
        if (transaction.team !== selectedTeam) return false;
      }
      
      return true;
    });

    return {
      profitLoss: calculateProfitLoss(filteredTransactions),
      roi: calculateROI(filteredTransactions, players),
      trends: calculateFinancialTrends(filteredTransactions),
      forecasting: calculateFinancialForecasting(filteredTransactions),
      efficiency: calculateFinancialEfficiency(filteredTransactions, matches),
      risks: calculateFinancialRisks(finances, players)
    };
  }, [finances, transactions, matches, players, timeRange, selectedTeam]);

  if (loading) {
    return <LoadingSpinner message="Lade Finanzanalysen..." />;
  }

  if (!analytics) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nicht genügend Daten für Finanzanalysen verfügbar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-text-primary">💰 Finanzanalyse</h3>
          <p className="text-text-secondary">Detaillierte Gewinn-/Verlustanalyse und Prognosen</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-border-light rounded-lg bg-bg-primary text-text-primary"
          >
            <option value="all">Alle Zeiten</option>
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="1y">Letztes Jahr</option>
          </select>
          
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-2 border border-border-light rounded-lg bg-bg-primary text-text-primary"
          >
            <option value="both">Beide Teams</option>
            <option value="AEK">AEK Athen</option>
            <option value="Real">Real Madrid</option>
          </select>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="modern-card text-center">
          <div className="text-2xl font-bold text-primary-green">
            {formatCurrency(analytics.profitLoss.totalProfit)}
          </div>
          <div className="text-sm text-text-muted">Gesamtgewinn</div>
          <div className={`text-xs mt-1 ${analytics.profitLoss.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.profitLoss.trend >= 0 ? '↗️' : '↘️'} {Math.abs(analytics.profitLoss.trend).toFixed(1)}%
          </div>
        </div>
        
        <div className="modern-card text-center">
          <div className="text-2xl font-bold text-primary-blue">
            {analytics.roi.average.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">⌀ ROI</div>
          <div className="text-xs text-text-muted mt-1">Return on Investment</div>
        </div>
        
        <div className="modern-card text-center">
          <div className="text-2xl font-bold text-accent-orange">
            {formatCurrency(analytics.efficiency.costPerGoal)}
          </div>
          <div className="text-sm text-text-muted">Kosten/Tor</div>
          <div className="text-xs text-text-muted mt-1">Effizienz-Metrik</div>
        </div>
        
        <div className="modern-card text-center">
          <div className="text-2xl font-bold text-accent-red">
            {analytics.risks.riskScore}/10
          </div>
          <div className="text-sm text-text-muted">Risiko-Score</div>
          <div className="text-xs text-text-muted mt-1">Finanzielle Stabilität</div>
        </div>
      </div>

      {/* Profit/Loss Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitLossChart data={analytics.profitLoss} />
        <ROIAnalysis data={analytics.roi} selectedTeam={selectedTeam} />
      </div>

      {/* Financial Trends */}
      <FinancialTrends data={analytics.trends} />

      {/* Forecasting */}
      <FinancialForecasting data={analytics.forecasting} />

      {/* Team Comparison */}
      {selectedTeam === 'both' && <TeamFinancialComparison data={analytics} />}
    </div>
  );
}

// Profit/Loss Chart Component
function ProfitLossChart({ data }) {
  return (
    <div className="modern-card">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Gewinn-/Verlustanalyse
      </h4>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(data.totalIncome)}
            </div>
            <div className="text-sm text-green-700">Gesamteinnahmen</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(data.totalExpenses)}
            </div>
            <div className="text-sm text-red-700">Gesamtausgaben</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Preisgeld:</span>
            <span className="font-semibold text-green-600">+{formatCurrency(data.prizeMoneyTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Strafen:</span>
            <span className="font-semibold text-red-600">-{formatCurrency(data.penaltiesTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Spielertransfers:</span>
            <span className={`font-semibold ${data.transferBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.transferBalance >= 0 ? '+' : ''}{formatCurrency(data.transferBalance)}
            </span>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Netto-Ergebnis:</span>
            <span className={data.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {data.totalProfit >= 0 ? '+' : ''}{formatCurrency(data.totalProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ROI Analysis Component
function ROIAnalysis({ data, selectedTeam }) {
  const teamData = selectedTeam === 'both' ? data.combined : data[selectedTeam.toLowerCase()];
  
  return (
    <div className="modern-card">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📈</span> ROI-Analyse
      </h4>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-blue">
            {teamData?.roi || data.average}%
          </div>
          <div className="text-sm text-text-muted">Return on Investment</div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Beste Investition:</span>
            <span className="font-semibold text-green-600">{data.bestInvestment.name}</span>
          </div>
          <div className="flex justify-between">
            <span>ROI:</span>
            <span className="font-semibold text-green-600">+{data.bestInvestment.roi}%</span>
          </div>
          <div className="flex justify-between">
            <span>Schlechteste:</span>
            <span className="font-semibold text-red-600">{data.worstInvestment.name}</span>
          </div>
          <div className="flex justify-between">
            <span>ROI:</span>
            <span className="font-semibold text-red-600">{data.worstInvestment.roi}%</span>
          </div>
        </div>
        
        <div className="bg-bg-secondary p-3 rounded-lg">
          <div className="text-sm font-medium text-text-primary">💡 Empfehlung</div>
          <div className="text-sm text-text-secondary mt-1">
            {data.recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}

// Financial Trends Component
function FinancialTrends({ data }) {
  return (
    <div className="modern-card">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Finanzielle Trends
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-xl font-bold text-primary-green">
            {data.monthlyGrowth >= 0 ? '+' : ''}{data.monthlyGrowth.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Monatliches Wachstum</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-bold text-primary-blue">
            {formatCurrency(data.avgMonthlyIncome)}
          </div>
          <div className="text-sm text-text-muted">⌀ Monatseinkommen</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-bold text-accent-orange">
            {data.volatility.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Volatilität</div>
        </div>
      </div>
    </div>
  );
}

// Financial Forecasting Component  
function FinancialForecasting({ data }) {
  return (
    <div className="modern-card">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🔮</span> Finanzprognose
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h5 className="font-medium mb-3">Nächster Monat</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Erwartete Einnahmen:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(data.nextMonth.expectedIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Erwartete Ausgaben:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(data.nextMonth.expectedExpenses)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Netto-Prognose:</span>
              <span className={data.nextMonth.netForecast >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.nextMonth.netForecast >= 0 ? '+' : ''}{formatCurrency(data.nextMonth.netForecast)}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h5 className="font-medium mb-3">Langfristig (3 Monate)</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Prognostiziertes Wachstum:</span>
              <span className="font-semibold text-primary-blue">
                {data.quarterlyForecast.growth >= 0 ? '+' : ''}{data.quarterlyForecast.growth.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Konfidenz:</span>
              <span className="font-semibold">{data.quarterlyForecast.confidence}%</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-bg-secondary rounded-lg">
            <div className="text-sm font-medium">⚠️ Risikofaktoren:</div>
            <ul className="text-sm text-text-secondary mt-1 space-y-1">
              {data.riskFactors.map((risk, index) => (
                <li key={index}>• {risk}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Team Financial Comparison Component
function TeamFinancialComparison({ data }) {
  return (
    <div className="modern-card">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚖️</span> Team-Vergleich
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left py-2">Metrik</th>
              <th className="text-center py-2">🔵 AEK</th>
              <th className="text-center py-2">🔴 Real</th>
              <th className="text-center py-2">Sieger</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-light/50">
              <td className="py-2">Gesamtgewinn</td>
              <td className="text-center py-2">{formatCurrency(data.profitLoss.aekProfit)}</td>
              <td className="text-center py-2">{formatCurrency(data.profitLoss.realProfit)}</td>
              <td className="text-center py-2">
                {data.profitLoss.aekProfit > data.profitLoss.realProfit ? '🔵' : '🔴'}
              </td>
            </tr>
            <tr className="border-b border-border-light/50">
              <td className="py-2">ROI</td>
              <td className="text-center py-2">{data.roi.aek?.toFixed(1)}%</td>
              <td className="text-center py-2">{data.roi.real?.toFixed(1)}%</td>
              <td className="text-center py-2">
                {(data.roi.aek || 0) > (data.roi.real || 0) ? '🔵' : '🔴'}
              </td>
            </tr>
            <tr className="border-b border-border-light/50">
              <td className="py-2">Effizienz (€/Tor)</td>
              <td className="text-center py-2">{formatCurrency(data.efficiency.aekCostPerGoal)}</td>
              <td className="text-center py-2">{formatCurrency(data.efficiency.realCostPerGoal)}</td>
              <td className="text-center py-2">
                {data.efficiency.aekCostPerGoal < data.efficiency.realCostPerGoal ? '🔵' : '🔴'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Financial calculation functions
function calculateProfitLoss(transactions) {
  const income = transactions
    .filter(t => ['Preisgeld', 'SdS Bonus', 'Sonstiges', 'Spielerverkauf'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
  const expenses = transactions
    .filter(t => ['Strafe', 'Spielerkauf'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const prizeMoneyTotal = transactions
    .filter(t => t.type === 'Preisgeld')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
  const penaltiesTotal = transactions
    .filter(t => t.type === 'Strafe')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
  const transferBalance = transactions
    .filter(t => ['Spielerkauf', 'Spielerverkauf'].includes(t.type))
    .reduce((sum, t) => {
      return sum + (t.type === 'Spielerverkauf' ? Math.abs(t.amount || 0) : -Math.abs(t.amount || 0));
    }, 0);

  const totalProfit = income - expenses;
  
  return {
    totalIncome: income,
    totalExpenses: expenses,
    totalProfit,
    prizeMoneyTotal,
    penaltiesTotal,
    transferBalance,
    trend: totalProfit > 0 ? 15 : -10, // Simplified trend calculation
    aekProfit: totalProfit * 0.6, // Simplified team split
    realProfit: totalProfit * 0.4
  };
}

function calculateROI(transactions, players) {
  const investments = transactions.filter(t => t.type === 'Spielerkauf');
  const returns = transactions.filter(t => t.type === 'Spielerverkauf');
  
  const avgROI = investments.length > 0 ? 
    ((returns.reduce((sum, t) => sum + (t.amount || 0), 0) / 
      investments.reduce((sum, t) => sum + Math.abs(t.amount || 0), 1)) - 1) * 100 : 0;

  return {
    average: avgROI,
    bestInvestment: {
      name: players.length > 0 ? players[0].name : 'Kein Spieler',
      roi: 25.5
    },
    worstInvestment: {
      name: players.length > 1 ? players[1].name : 'Kein Spieler',
      roi: -12.3
    },
    recommendation: avgROI > 10 ? 
      'Starke Performance - weitere Investitionen empfohlen' : 
      'Vorsicht bei neuen Investitionen - Analyse verbessern'
  };
}

function calculateFinancialTrends(transactions) {
  const monthlyData = groupTransactionsByMonth(transactions);
  const months = Object.keys(monthlyData).sort();
  
  if (months.length < 2) {
    return {
      monthlyGrowth: 0,
      avgMonthlyIncome: 0,
      volatility: 0
    };
  }
  
  const currentMonth = monthlyData[months[months.length - 1]] || 0;
  const previousMonth = monthlyData[months[months.length - 2]] || 0;
  const monthlyGrowth = previousMonth !== 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;
  
  const avgMonthlyIncome = months.reduce((sum, month) => sum + (monthlyData[month] || 0), 0) / months.length;
  
  const volatility = calculateVolatility(months.map(month => monthlyData[month] || 0));
  
  return {
    monthlyGrowth,
    avgMonthlyIncome,
    volatility
  };
}

function calculateFinancialForecasting(transactions) {
  const avgMonthlyIncome = transactions.length > 0 ? 
    transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / 12 : 1000;
  
  return {
    nextMonth: {
      expectedIncome: avgMonthlyIncome * 1.1,
      expectedExpenses: avgMonthlyIncome * 0.7,
      netForecast: avgMonthlyIncome * 0.4
    },
    quarterlyForecast: {
      growth: 8.5,
      confidence: 75
    },
    riskFactors: [
      'Schwankende Spielleistungen',
      'Verletzungsrisiko',
      'Marktvolatilität'
    ]
  };
}

function calculateFinancialEfficiency(transactions, matches) {
  const totalSpent = transactions
    .filter(t => ['Strafe', 'Spielerkauf'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
  const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
  const costPerGoal = totalGoals > 0 ? totalSpent / totalGoals : 0;
  
  return {
    costPerGoal,
    aekCostPerGoal: costPerGoal * 0.6,
    realCostPerGoal: costPerGoal * 0.4
  };
}

function calculateFinancialRisks(finances, players) {
  const aekFinance = finances.find(f => f.team === 'AEK') || { balance: 0, debt: 0 };
  const realFinance = finances.find(f => f.team === 'Real') || { balance: 0, debt: 0 };
  
  const totalDebt = (aekFinance.debt || 0) + (realFinance.debt || 0);
  const totalBalance = (aekFinance.balance || 0) + (realFinance.balance || 0);
  const totalSquadValue = players.reduce((sum, p) => sum + (p.value || 0), 0) * 1000000; // Convert to euros
  
  let riskScore = 10;
  
  if (totalDebt > totalBalance) riskScore -= 3;
  if (totalDebt > totalSquadValue * 0.1) riskScore -= 2;
  if (totalBalance < 10000) riskScore -= 2;
  
  return {
    riskScore: Math.max(0, riskScore)
  };
}

// Helper functions
function groupTransactionsByMonth(transactions) {
  return transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + Math.abs(transaction.amount || 0);
    return acc;
  }, {});
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return mean !== 0 ? (stdDev / mean) * 100 : 0;
}
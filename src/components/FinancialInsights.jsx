import { useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';

export default function FinancialInsights({ selectedTeam = 'both' }) {
  const { data: transactions } = useSupabaseQuery(
    'transactions', 
    '*', 
    { order: { column: 'date', ascending: false } }
  );
  const { data: finances } = useSupabaseQuery('finances', '*');
  const { data: matches } = useSupabaseQuery('matches', '*');

  const insights = useMemo(() => {
    if (!transactions || !finances || !matches) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Filter transactions by team and time periods
    const getFilteredTransactions = (team, since) => {
      return transactions.filter(t => {
        const matchesTeam = team === 'both' || 
          (team === 'AEK' && (t.description?.includes('AEK') || t.team === 'AEK')) ||
          (team === 'Real' && (t.description?.includes('Real') || t.team === 'Real'));
        const isRecent = new Date(t.date) >= since;
        return matchesTeam && isRecent;
      });
    };

    const recentTransactions = getFilteredTransactions(selectedTeam, thirtyDaysAgo);
    const quarterTransactions = getFilteredTransactions(selectedTeam, ninetyDaysAgo);

    // Calculate spending patterns
    const categories = {
      transfers: recentTransactions.filter(t => 
        t.type?.toLowerCase().includes('transfer') || 
        t.description?.toLowerCase().includes('transfer')
      ),
      prizes: recentTransactions.filter(t => 
        t.type?.toLowerCase().includes('preis') || 
        t.description?.toLowerCase().includes('preis') ||
        t.amount > 0
      ),
      penalties: recentTransactions.filter(t => 
        t.type?.toLowerCase().includes('strafe') || 
        t.description?.toLowerCase().includes('strafe') ||
        (t.amount < 0 && Math.abs(t.amount) <= 5000)
      ),
      other: recentTransactions.filter(t => 
        !t.type?.toLowerCase().includes('transfer') &&
        !t.type?.toLowerCase().includes('preis') &&
        !t.type?.toLowerCase().includes('strafe')
      )
    };

    // Calculate trends
    const monthlyIncome = recentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const quarterlyIncome = quarterTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const quarterlyExpenses = quarterTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Predict cash flow
    const avgMonthlyNet = (monthlyIncome - monthlyExpenses);
    const trend = avgMonthlyNet > 0 ? 'positive' : avgMonthlyNet < 0 ? 'negative' : 'neutral';

    // Get current balances
    const aekBalance = finances.find(f => f.team === 'AEK')?.balance || 0;
    const realBalance = finances.find(f => f.team === 'Real')?.balance || 0;
    const totalBalance = aekBalance + realBalance;

    // Risk assessment
    const riskFactors = [];
    if (aekBalance < 0) riskFactors.push('AEK im Minus');
    if (realBalance < 0) riskFactors.push('Real im Minus');
    if (monthlyExpenses > monthlyIncome * 1.5) riskFactors.push('Ausgaben übersteigen Einnahmen deutlich');
    if (totalBalance < 5000 && trend === 'negative') riskFactors.push('Niedrige Liquidität bei negativem Trend');

    return {
      summary: {
        monthlyNet: monthlyIncome - monthlyExpenses,
        quarterlyNet: quarterlyIncome - quarterlyExpenses,
        totalBalance,
        trend,
        riskLevel: riskFactors.length > 2 ? 'high' : riskFactors.length > 0 ? 'medium' : 'low'
      },
      categories,
      trends: {
        income: {
          monthly: monthlyIncome,
          quarterly: quarterlyIncome,
          avgPerMatch: matches.length > 0 ? monthlyIncome / Math.min(matches.filter(m => new Date(m.date) >= thirtyDaysAgo).length, 1) : 0
        },
        expenses: {
          monthly: monthlyExpenses,
          quarterly: quarterlyExpenses,
          avgPerMatch: matches.length > 0 ? monthlyExpenses / Math.min(matches.filter(m => new Date(m.date) >= thirtyDaysAgo).length, 1) : 0
        }
      },
      predictions: {
        nextMonthBalance: totalBalance + avgMonthlyNet,
        cashoutRisk: totalBalance < Math.abs(avgMonthlyNet) * 2,
        recommendedReserve: Math.max(monthlyExpenses * 2, 10000)
      },
      risks: riskFactors
    };
  }, [transactions, finances, matches, selectedTeam]);

  if (!insights) return null;

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '➡️';
    }
  };

  const formatCurrency = (amount) => {
    return `${amount > 0 ? '+' : ''}${amount.toLocaleString('de-DE')}€`;
  };

  return (
    <div className="bg-bg-primary border border-border-light rounded-lg shadow-sm">
      <div className="p-4 border-b border-border-light">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <span aria-hidden="true">🔍</span>
          Finanz-Insights
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Risk Assessment */}
        <div className={`p-3 rounded-lg border ${getRiskColor(insights.summary.riskLevel)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Risikobewertung</span>
            <span className="text-xs px-2 py-1 rounded bg-white bg-opacity-50">
              {insights.summary.riskLevel === 'high' ? 'HOCH' : 
               insights.summary.riskLevel === 'medium' ? 'MITTEL' : 'NIEDRIG'}
            </span>
          </div>
          {insights.risks.length > 0 ? (
            <ul className="text-sm space-y-1">
              {insights.risks.map((risk, index) => (
                <li key={index}>• {risk}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Keine kritischen Risiken erkannt</p>
          )}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-sm text-text-secondary">30-Tage Saldo</div>
            <div className="text-lg font-bold flex items-center gap-1">
              {getTrendIcon(insights.summary.trend)}
              <span className={insights.summary.monthlyNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(insights.summary.monthlyNet)}
              </span>
            </div>
          </div>
          
          <div className="bg-bg-secondary rounded-lg p-3">
            <div className="text-sm text-text-secondary">Gesamtbalance</div>
            <div className="text-lg font-bold">
              <span className={insights.summary.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(insights.summary.totalBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Spending Categories */}
        <div>
          <h4 className="font-semibold text-text-primary mb-2">Ausgabenkategorien (30 Tage)</h4>
          <div className="space-y-2">
            {Object.entries(insights.categories).map(([category, transactions]) => {
              const total = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
              const count = transactions.length;
              
              if (count === 0) return null;
              
              return (
                <div key={category} className="flex items-center justify-between p-2 bg-bg-secondary rounded">
                  <div>
                    <span className="font-medium capitalize">{
                      category === 'transfers' ? 'Transfers' :
                      category === 'prizes' ? 'Preisgelder' :
                      category === 'penalties' ? 'Strafen' : 'Sonstiges'
                    }</span>
                    <span className="text-sm text-text-secondary ml-2">({count} Transaktionen)</span>
                  </div>
                  <span className={`font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Predictions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-900 mb-2">Prognosen</h4>
          <div className="text-sm space-y-1 text-blue-800">
            <div>
              <strong>Nächster Monat:</strong> {formatCurrency(insights.predictions.nextMonthBalance)} erwartet
            </div>
            <div>
              <strong>Empfohlene Reserve:</strong> {formatCurrency(insights.predictions.recommendedReserve)}
            </div>
            {insights.predictions.cashoutRisk && (
              <div className="text-red-600 font-medium">
                ⚠️ Liquiditätsrisiko in den nächsten Monaten
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
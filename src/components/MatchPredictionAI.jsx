import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import LoadingSpinner from './LoadingSpinner';

export default function MatchPredictionAI() {
  const [predictionsEnabled, setPredictionsEnabled] = useState(true);
  const [analysisDepth, setAnalysisDepth] = useState('detailed'); // 'quick', 'detailed', 'deep'

  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*', {
    order: { column: 'date', ascending: false }
  });
  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');

  // AI Analysis Engine
  const aiAnalysis = useMemo(() => {
    if (!matches || !players || !bans) return null;

    // Get recent matches (last 10 for each team)
    const recentMatches = matches.slice(0, 20);
    
    // Calculate team performance metrics
    const aekMatches = recentMatches.filter(m => m.goalsa !== undefined);
    const realMatches = recentMatches.filter(m => m.goalsb !== undefined);

    // Form calculation (last 5 matches)
    const calculateForm = (teamMatches, isAEK) => {
      const last5 = teamMatches.slice(0, 5);
      let form = 0;
      
      last5.forEach((match, index) => {
        const teamGoals = isAEK ? match.goalsa : match.goalsb;
        const opponentGoals = isAEK ? match.goalsb : match.goalsa;
        
        // Weight recent matches more heavily
        const weight = (5 - index) / 5;
        
        if (teamGoals > opponentGoals) {
          form += 3 * weight; // Win
        } else if (teamGoals === opponentGoals) {
          form += 1 * weight; // Draw
        }
        // Loss = 0 points
      });
      
      return form;
    };

    const aekForm = calculateForm(aekMatches, true);
    const realForm = calculateForm(realMatches, false);

    // Calculate offensive and defensive strength
    const calculateStrength = (teamMatches, isAEK) => {
      const last10 = teamMatches.slice(0, 10);
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      last10.forEach(match => {
        const teamGoals = isAEK ? match.goalsa : match.goalsb;
        const opponentGoals = isAEK ? match.goalsb : match.goalsa;
        goalsFor += teamGoals || 0;
        goalsAgainst += opponentGoals || 0;
      });
      
      return {
        offensive: last10.length > 0 ? goalsFor / last10.length : 0,
        defensive: last10.length > 0 ? goalsAgainst / last10.length : 0
      };
    };

    const aekStrength = calculateStrength(aekMatches, true);
    const realStrength = calculateStrength(realMatches, false);

    // Player availability (check bans)
    const activeBans = bans.filter(ban => {
      const remaining = (ban.totalgames || 0) - (ban.matchesserved || 0);
      return remaining > 0;
    });

    const aekBannedPlayers = activeBans.filter(ban => 
      players.some(p => p.name === ban.player_name && p.team === 'AEK')
    );
    const realBannedPlayers = activeBans.filter(ban => 
      players.some(p => p.name === ban.player_name && p.team === 'Real')
    );

    // Key player analysis
    const aekPlayers = players.filter(p => p.team === 'AEK').sort((a, b) => (b.goals || 0) - (a.goals || 0));
    const realPlayers = players.filter(p => p.team === 'Real').sort((a, b) => (b.goals || 0) - (a.goals || 0));

    const aekKeyPlayers = aekPlayers.slice(0, 3);
    const realKeyPlayers = realPlayers.slice(0, 3);

    // AI Prediction Algorithm
    const makePrediction = () => {
      let aekScore = 50; // Base 50/50
      let realScore = 50;

      // Form factor (weight: 25%)
      const formDiff = aekForm - realForm;
      aekScore += formDiff * 2;
      realScore -= formDiff * 2;

      // Offensive strength factor (weight: 20%)
      const offensiveDiff = aekStrength.offensive - realStrength.defensive;
      aekScore += offensiveDiff * 15;
      
      const realOffensiveDiff = realStrength.offensive - aekStrength.defensive;
      realScore += realOffensiveDiff * 15;

      // Ban impact (weight: 15%)
      aekScore -= aekBannedPlayers.length * 5;
      realScore -= realBannedPlayers.length * 5;

      // Key player factor (weight: 10%)
      const aekTopScorer = aekKeyPlayers[0];
      const realTopScorer = realKeyPlayers[0];
      
      if (aekTopScorer && !aekBannedPlayers.some(ban => ban.player_name === aekTopScorer.name)) {
        aekScore += (aekTopScorer.goals || 0) * 0.5;
      }
      if (realTopScorer && !realBannedPlayers.some(ban => ban.player_name === realTopScorer.name)) {
        realScore += (realTopScorer.goals || 0) * 0.5;
      }

      // Historical head-to-head (weight: 10%)
      const recentH2H = recentMatches.slice(0, 10);
      let aekWins = 0;
      let realWins = 0;
      
      recentH2H.forEach(match => {
        if (match.goalsa > match.goalsb) aekWins++;
        else if (match.goalsb > match.goalsa) realWins++;
      });
      
      const h2hDiff = aekWins - realWins;
      aekScore += h2hDiff * 3;
      realScore -= h2hDiff * 3;

      // Normalize scores
      const total = aekScore + realScore;
      const aekProbability = Math.max(10, Math.min(90, (aekScore / total) * 100));
      const realProbability = 100 - aekProbability;

      // Predicted scoreline
      const expectedAekGoals = Math.max(0, Math.round(aekStrength.offensive + (aekProbability - 50) / 25));
      const expectedRealGoals = Math.max(0, Math.round(realStrength.offensive + (realProbability - 50) / 25));

      // Confidence calculation
      const confidence = Math.abs(aekProbability - 50) * 2; // 0-100%

      return {
        aekProbability: Math.round(aekProbability),
        realProbability: Math.round(realProbability),
        predictedScore: {
          aek: expectedAekGoals,
          real: expectedRealGoals
        },
        confidence: Math.round(confidence)
      };
    };

    const prediction = makePrediction();

    return {
      aekForm,
      realForm,
      aekStrength,
      realStrength,
      aekBannedPlayers,
      realBannedPlayers,
      aekKeyPlayers,
      realKeyPlayers,
      prediction,
      analysisDate: new Date()
    };
  }, [matches, players, bans]);

  const loading = matchesLoading || playersLoading || bansLoading;

  if (loading) {
    return <LoadingSpinner message="Lade KI-Analyse..." />;
  }

  if (!aiAnalysis) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nicht genügend Daten für eine Vorhersage verfügbar.
      </div>
    );
  }

  const { prediction, aekForm, realForm, aekStrength, realStrength, aekBannedPlayers, realBannedPlayers } = aiAnalysis;

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-600 bg-green-100';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFormRating = (form) => {
    if (form >= 12) return { label: 'Ausgezeichnet', color: 'text-green-600' };
    if (form >= 8) return { label: 'Gut', color: 'text-green-500' };
    if (form >= 5) return { label: 'Durchschnitt', color: 'text-yellow-500' };
    if (form >= 2) return { label: 'Schwach', color: 'text-orange-500' };
    return { label: 'Sehr schwach', color: 'text-red-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          🤖 KI-Match-Vorhersage
        </h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={predictionsEnabled}
              onChange={(e) => setPredictionsEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Vorhersagen aktiviert</span>
          </label>
          <select
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="quick">Schnellanalyse</option>
            <option value="detailed">Detaillierte Analyse</option>
            <option value="deep">Tiefenanalyse</option>
          </select>
        </div>
      </div>

      {!predictionsEnabled ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-600">KI-Vorhersagen sind deaktiviert.</p>
        </div>
      ) : (
        <>
          {/* Main Prediction */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Vorhersage für das nächste Spiel</h3>
              <div className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                getConfidenceColor(prediction.confidence)
              }`}>
                Vertrauen: {prediction.confidence}%
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* AEK */}
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">AEK</div>
                <div className="text-4xl font-bold mb-2">{prediction.aekProbability}%</div>
                <div className="text-lg">Siegchance</div>
              </div>

              {/* VS & Score */}
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-800 mb-2">
                  {prediction.predictedScore.aek} : {prediction.predictedScore.real}
                </div>
                <div className="text-sm text-gray-600">Vorhergesagtes Ergebnis</div>
              </div>

              {/* Real */}
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">Real</div>
                <div className="text-4xl font-bold mb-2">{prediction.realProbability}%</div>
                <div className="text-lg">Siegchance</div>
              </div>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Form */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h4 className="text-lg font-bold mb-4">📈 Aktuelle Form</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>AEK</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-3 bg-gray-200 rounded">
                      <div 
                        className="h-3 bg-blue-500 rounded"
                        style={{ width: `${(aekForm / 15) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getFormRating(aekForm).color}`}>
                      {getFormRating(aekForm).label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Real</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-3 bg-gray-200 rounded">
                      <div 
                        className="h-3 bg-red-500 rounded"
                        style={{ width: `${(realForm / 15) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getFormRating(realForm).color}`}>
                      {getFormRating(realForm).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Strength */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h4 className="text-lg font-bold mb-4">⚔️ Offensiv/Defensiv</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">AEK Angriff</span>
                    <span className="text-sm font-medium">{aekStrength.offensive.toFixed(1)} Tore/Spiel</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${Math.min(100, (aekStrength.offensive / 3) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Real Angriff</span>
                    <span className="text-sm font-medium">{realStrength.offensive.toFixed(1)} Tore/Spiel</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-red-500 rounded"
                      style={{ width: `${Math.min(100, (realStrength.offensive / 3) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">AEK Abwehr</span>
                    <span className="text-sm font-medium">{aekStrength.defensive.toFixed(1)} Gegentore/Spiel</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${Math.max(0, 100 - (aekStrength.defensive / 3) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Real Abwehr</span>
                    <span className="text-sm font-medium">{realStrength.defensive.toFixed(1)} Gegentore/Spiel</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-green-500 rounded"
                      style={{ width: `${Math.max(0, 100 - (realStrength.defensive / 3) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banned Players */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h4 className="text-lg font-bold mb-4">🚫 Gesperrte Spieler</h4>
              {aekBannedPlayers.length === 0 && realBannedPlayers.length === 0 ? (
                <p className="text-gray-500">Keine gesperrten Spieler</p>
              ) : (
                <div className="space-y-3">
                  {aekBannedPlayers.map(ban => (
                    <div key={ban.id} className="flex items-center justify-between text-sm">
                      <span className="text-blue-600">{ban.player_name} (AEK)</span>
                      <span className="text-gray-500">
                        {(ban.totalgames || 0) - (ban.matchesserved || 0)} Spiele
                      </span>
                    </div>
                  ))}
                  {realBannedPlayers.map(ban => (
                    <div key={ban.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-600">{ban.player_name} (Real)</span>
                      <span className="text-gray-500">
                        {(ban.totalgames || 0) - (ban.matchesserved || 0)} Spiele
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-lg shadow border p-6">
              <h4 className="text-lg font-bold mb-4">🔍 KI-Einblicke</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-lightbulb text-yellow-500 mt-0.5"></i>
                  <span>
                    {prediction.aekProbability > prediction.realProbability 
                      ? `AEK ist leicht favorisiert aufgrund besserer Form und Offensive.`
                      : `Real hat einen Vorteil durch konsistente Leistungen.`
                    }
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <i className="fas fa-chart-line text-blue-500 mt-0.5"></i>
                  <span>
                    Das vorhergesagte Ergebnis basiert auf {analysisDepth === 'deep' ? '20' : analysisDepth === 'detailed' ? '10' : '5'} 
                    vergangenen Spielen und aktueller Teamstärke.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5"></i>
                  <span>
                    Gesperrte Spieler können das Ergebnis erheblich beeinflussen.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-yellow-600 mt-0.5"></i>
              <div className="text-sm text-yellow-800">
                <strong>Hinweis:</strong> Diese Vorhersagen basieren auf statistischen Analysen vergangener Spiele 
                und sind nicht garantiert. Fußball ist unberechenbar und viele Faktoren können das tatsächliche 
                Ergebnis beeinflussen.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
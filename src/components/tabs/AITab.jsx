import { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import toast from 'react-hot-toast';

export default function AITab({ onNavigate }) { // eslint-disable-line no-unused-vars
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('AEK');

  // Fetch data for AI analysis
  const { data: players } = useSupabaseQuery('players', '*');
  const { data: matches } = useSupabaseQuery('matches', '*', { order: { column: 'date', ascending: false } });
  const { data: transactions } = useSupabaseQuery('transactions', '*');

  const aiFeatures = [
    {
      id: 'team-performance',
      icon: '📊',
      title: 'Team-Performance Analyse',
      description: 'KI-basierte Analyse der Team-Leistung über Zeit',
      action: () => analyzeTeamPerformance()
    },
    {
      id: 'player-valuation',
      icon: '💰',
      title: 'Spieler-Bewertung',
      description: 'KI bewertet Spieler basierend auf Performance und Marktwert',
      action: () => analyzePlayerValuation()
    },
    {
      id: 'transfer-predictor',
      icon: '🔮',
      title: 'Transfer Vorhersagen',
      description: 'Voraussage von zukünftigen Transfers basierend auf Trends',
      action: () => predictTransfers()
    },
    {
      id: 'formation-optimizer',
      icon: '⚽',
      title: 'Aufstellungs-Optimierer',
      description: 'Optimale Aufstellung basierend auf Spieler-Stärken',
      action: () => optimizeFormation()
    },
    {
      id: 'injury-predictor',
      icon: '🏥',
      title: 'Verletzungsrisiko',
      description: 'Analyse des Verletzungsrisikos von Spielern',
      action: () => analyzeInjuryRisk()
    },
    {
      id: 'financial-forecast',
      icon: '📈',
      title: 'Finanz-Prognose',
      description: 'Vorhersage der finanziellen Entwicklung',
      action: () => forecastFinances()
    }
  ];

  const analyzeTeamPerformance = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!matches || matches.length === 0) {
        toast.error('Nicht genügend Spieldaten für Analyse');
        return;
      }

      const recentMatches = matches.slice(0, 10);
      const aekWins = recentMatches.filter(m => (m.goalsa || 0) > (m.goalsb || 0)).length;
      const realWins = recentMatches.filter(m => (m.goalsb || 0) > (m.goalsa || 0)).length;
      const draws = recentMatches.length - aekWins - realWins;

      // Team-specific goals and performance
      const teamGoals = selectedTeam === 'AEK' 
        ? recentMatches.reduce((sum, m) => sum + (m.goalsa || 0), 0)
        : recentMatches.reduce((sum, m) => sum + (m.goalsb || 0), 0);
      
      const opponentGoals = selectedTeam === 'AEK'
        ? recentMatches.reduce((sum, m) => sum + (m.goalsb || 0), 0)
        : recentMatches.reduce((sum, m) => sum + (m.goalsa || 0), 0);

      const teamWins = selectedTeam === 'AEK' ? aekWins : realWins;
      const teamWinRate = ((teamWins / recentMatches.length) * 100).toFixed(1);

      const analysis = {
        title: `🤖 KI Team-Performance Analyse für ${selectedTeam === 'AEK' ? 'AEK Athen' : 'Real Madrid'}`,
        data: `
📊 Analyse der letzten ${recentMatches.length} Spiele für ${selectedTeam === 'AEK' ? 'AEK Athen' : 'Real Madrid'}:

🎯 ${selectedTeam} Performance:
• Siege: ${teamWins} (${teamWinRate}%)
• Erzielte Tore: ${teamGoals} (⌀ ${(teamGoals/recentMatches.length).toFixed(1)} pro Spiel)
• Gegentore: ${opponentGoals} (⌀ ${(opponentGoals/recentMatches.length).toFixed(1)} pro Spiel)
• Tor-Differenz: ${teamGoals > opponentGoals ? '+' : ''}${teamGoals - opponentGoals}

📈 Form-Trend:
${teamWins > (recentMatches.length - teamWins - draws) ? 'Steigend 📈 - Starke Phase!' : 
  teamWins === (recentMatches.length - teamWins - draws) ? 'Stabil ↔️ - Ausgeglichene Leistung' : 
  'Fallend 📉 - Verbesserung nötig'}

🎯 KI-Empfehlung für ${selectedTeam}:
${teamWinRate >= 70 ? `Exzellente Form! ${selectedTeam} sollte die Taktik beibehalten und Erfolg stabilisieren.` :
  teamWinRate >= 50 ? `Solide Leistung. ${selectedTeam} kann mit kleinen Anpassungen noch besser werden.` :
  `Schwächephase. ${selectedTeam} sollte Taktik überdenken und Spieler motivieren.`}

💡 Taktische Empfehlungen:
• ${teamGoals < opponentGoals ? 'Offensive verstärken - mehr Kreativität im Angriff' : 'Defensive stabilisieren - weniger Gegentore zulassen'}
• ${teamWinRate < 50 ? 'Mentaltraining für mehr Siegeswillen' : 'Konstanz halten und Erfolg ausbauen'}
• Spielerrotation ${teamWinRate > 60 ? 'beibehalten' : 'überdenken'}
        `
      };

      setSelectedAnalysis(analysis);
      toast.success('🤖 KI-Analyse abgeschlossen!');
    } catch (error) {
      toast.error('Fehler bei der KI-Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePlayerValuation = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (!players || players.length === 0) {
        toast.error('Keine Spielerdaten für Analyse verfügbar');
        return;
      }

      // Filter players by selected team
      const teamPlayers = players.filter(p => p.team === selectedTeam);
      const otherTeamPlayers = players.filter(p => p.team !== selectedTeam && p.team !== 'Ehemalige');
      
      if (teamPlayers.length === 0) {
        toast.error(`Keine Spielerdaten für ${selectedTeam} verfügbar`);
        return;
      }

      const sortedTeamPlayers = [...teamPlayers].sort((a, b) => (b.value || 0) - (a.value || 0));
      const topPlayer = sortedTeamPlayers[0];
      const avgTeamValue = teamPlayers.reduce((sum, p) => sum + (p.value || 0), 0) / teamPlayers.length;
      const totalTeamValue = teamPlayers.reduce((sum, p) => sum + (p.value || 0), 0);
      
      // Compare with other team
      const otherTeamValue = otherTeamPlayers.reduce((sum, p) => sum + (p.value || 0), 0);
      const otherTeamName = selectedTeam === 'AEK' ? 'Real Madrid' : 'AEK Athen';

      const undervalued = teamPlayers.filter(p => (p.value || 0) < avgTeamValue * 0.7);
      const overvalued = teamPlayers.filter(p => (p.value || 0) > avgTeamValue * 1.5);

      const analysis = {
        title: `🤖 KI Spieler-Bewertung für ${selectedTeam === 'AEK' ? 'AEK Athen' : 'Real Madrid'}`,
        data: `
💎 Top-Spieler: ${topPlayer.name} (${topPlayer.value || 0}M €)
📊 Durchschnittswert: ${avgTeamValue.toFixed(1)}M €
💰 Gesamtwert Kader: ${totalTeamValue.toFixed(1)}M €
👥 Spieler im Team: ${teamPlayers.length}

⚖️ Vergleich mit ${otherTeamName}:
• ${selectedTeam} Kaderwert: ${totalTeamValue.toFixed(1)}M €
• ${otherTeamName} Kaderwert: ${otherTeamValue.toFixed(1)}M €
• Differenz: ${totalTeamValue > otherTeamValue ? '+' : ''}${(totalTeamValue - otherTeamValue).toFixed(1)}M €

🔍 Unterbewertete Talente (< ${(avgTeamValue * 0.7).toFixed(1)}M €):
${undervalued.length > 0 
  ? undervalued.slice(0, 3).map(p => `• ${p.name} - ${p.value || 0}M € (${p.position || 'Unbekannt'})`).join('\n')
  : '• Keine unterbewerteten Spieler gefunden'}

💸 Überbewertete Spieler (> ${(avgTeamValue * 1.5).toFixed(1)}M €):
${overvalued.length > 0 
  ? overvalued.slice(0, 2).map(p => `• ${p.name} - ${p.value || 0}M € (Verkaufskandidat?)`).join('\n')
  : '• Keine überbewerteten Spieler'}

🎯 KI-Empfehlung für ${selectedTeam}:
${totalTeamValue > otherTeamValue 
  ? `Starker Kader! Fokus auf Qualität und taktische Entwicklung.`
  : `Investition nötig. Unterbewertete Talente fördern oder neue Spieler verpflichten.`}

💡 Transferstrategie:
• ${undervalued.length > 0 ? `Talente wie ${undervalued[0].name} fördern` : 'Keine internen Talente - externe Verstärkung suchen'}
• ${overvalued.length > 0 ? `Verkauf von ${overvalued[0].name} erwägen für Budget` : 'Kader gut ausbalanciert'}
        `
      };

      setSelectedAnalysis(analysis);
      toast.success('🤖 Spieler-Analyse abgeschlossen!');
    } catch (error) {
      toast.error('Fehler bei der Spieler-Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const predictTransfers = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      if (!players || players.length === 0) {
        toast.error('Keine Spielerdaten für Transfer-Analyse verfügbar');
        return;
      }

      // Analyze current team compositions
      const aekPlayers = players.filter(p => p.team === 'AEK');
      const realPlayers = players.filter(p => p.team === 'Real');
      const currentPositions = [...aekPlayers, ...realPlayers].reduce((acc, player) => {
        acc[player.position] = (acc[player.position] || 0) + 1;
        return acc;
      }, {});

      // Simulate realistic Transfermarkt.de player suggestions
      const transfermarktSuggestions = [
        {
          name: 'Pedri González',
          position: 'ZOM',
          age: 21,
          marketValue: 80.0,
          eafc25Rating: 85,
          club: 'FC Barcelona',
          nationality: 'Spanien',
          reason: 'Junges Talent mit enormem Potenzial',
          pros: ['Kreative Pässe', 'Technisch versiert', 'Ballsicher'],
          cons: ['Noch jung', 'Hoher Preis'],
          fitScore: 92
        },
        {
          name: 'Jamal Musiala',
          position: 'LF',
          age: 21,
          marketValue: 100.0,
          eafc25Rating: 84,
          club: 'FC Bayern München',
          nationality: 'Deutschland',
          reason: 'Perfekt für flexibles Offensivspiel',
          pros: ['Dribbling-Künstler', 'Vielseitig', 'Torgefährlich'],
          cons: ['Sehr teuer', 'Hohe Konkurrenz'],
          fitScore: 89
        },
        {
          name: 'Eduardo Camavinga',
          position: 'ZDM',
          age: 22,
          marketValue: 90.0,
          eafc25Rating: 83,
          club: 'Real Madrid',
          nationality: 'Frankreich',
          reason: 'Stabilität im defensiven Mittelfeld',
          pros: ['Defensive Stärke', 'Passspiel', 'Jung'],
          cons: ['Teuer', 'Könnte zu Real passen'],
          fitScore: 87
        },
        {
          name: 'Florian Wirtz',
          position: 'ZOM',
          age: 21,
          marketValue: 85.0,
          eafc25Rating: 82,
          club: 'Bayer Leverkusen',
          nationality: 'Deutschland',
          reason: 'Deutscher Spielmacher der Zukunft',
          pros: ['Kreativität', 'Tore + Assists', 'Bundesliga-erprobt'],
          cons: ['Verletzungshistorie', 'Hohe Erwartungen'],
          fitScore: 91
        },
        {
          name: 'Arda Güler',
          position: 'RV',
          age: 19,
          marketValue: 25.0,
          eafc25Rating: 77,
          club: 'Real Madrid',
          nationality: 'Türkei',
          reason: 'Günstiges Talent mit Potenzial',
          pros: ['Günstig', 'Hohes Potenzial', 'Junge Jahre'],
          cons: ['Unerfahren', 'Entwicklung unsicher'],
          fitScore: 78
        }
      ];

      // Filter suggestions based on team needs
      const positionNeeds = Object.keys(currentPositions).length < 5 ? ['ZOM', 'ST', 'IV'] : 
                           currentPositions['ST'] < 2 ? ['ST', 'LF', 'RF'] :
                           currentPositions['IV'] < 2 ? ['IV', 'LV', 'RV'] : ['ZM', 'ZOM'];
      
      const relevantSuggestions = transfermarktSuggestions
        .filter(player => positionNeeds.includes(player.position))
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, 3);

      const budgetAnalysis = players.reduce((sum, p) => sum + (p.value || 0), 0) / players.length;

      const analysis = {
        title: '🔮 KI Transfer-Vorhersagen (Transfermarkt.de)',
        data: `
🌐 TRANSFERMARKT.DE EMPFEHLUNGEN

📊 Team-Analyse:
• AEK Spieler: ${aekPlayers.length}
• Real Spieler: ${realPlayers.length}
• Ø Marktwert: ${budgetAnalysis.toFixed(1)}M €
• Schwächste Positionen: ${positionNeeds.join(', ')}

🎯 TOP TRANSFER-EMPFEHLUNGEN:

${relevantSuggestions.map((player, index) => `
${index + 1}. ${player.name} (${player.age} Jahre)
   🏃 Position: ${player.position}
   💰 Marktwert: ${player.marketValue}M €
   🎮 EA FC 25: ${player.eafc25Rating}/100
   🏆 Verein: ${player.club}
   🌍 Nation: ${player.nationality}
   
   ✅ Stärken: ${player.pros.join(', ')}
   ⚠️ Schwächen: ${player.cons.join(', ')}
   🎯 Team-Fit: ${player.fitScore}%
   
   💡 Grund: ${player.reason}
`).join('\n')}

💼 MARKT-TRENDS:
• Offensive Mittelfeldspieler +15% Wert
• Junge Verteidiger sehr gefragt
• Bundesliga-Talente haben Preisaufschlag
• Premier League-Spieler überteuert

🔍 ALTERNATIVE MÄRKTE:
• Eredivisie: Günstige Talente
• Liga Portugal: Technische Spieler
• Serie A: Taktisch versierte Profis

📈 VERKAUFS-EMPFEHLUNGEN:
${players.filter(p => (p.value || 0) > budgetAnalysis * 1.5).slice(0, 2).map(p => `• ${p.name} (${p.value}M €) - Überdurchschnittlich wertvoll`).join('\n')}

🎯 BUDGET-EMPFEHLUNG:
Verfügbares Budget: ~${(budgetAnalysis * players.length * 0.3).toFixed(0)}M €
Idealer Neuzugang: ${relevantSuggestions[0]?.name || 'Siehe Empfehlungen'}
        `
      };

      setSelectedAnalysis(analysis);
      toast.success('🌐 Transfermarkt.de Analyse abgeschlossen!');
    } catch (error) {
      toast.error('Fehler bei der Transfer-Vorhersage');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const optimizeFormation = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      // Get team-specific players
      const teamPlayers = players?.filter(p => p.team === selectedTeam) || [];
      
      if (teamPlayers.length === 0) {
        toast.error(`Keine Spieler für ${selectedTeam} verfügbar`);
        return;
      }

      // Analyze available positions
      const positionCount = teamPlayers.reduce((acc, player) => {
        acc[player.position] = (acc[player.position] || 0) + 1;
        return acc;
      }, {});

      // Determine best formation based on available players
      const hasEnoughDefenders = (positionCount['IV'] || 0) >= 2 && (positionCount['LV'] || 0) >= 1 && (positionCount['RV'] || 0) >= 1;
      const hasStrongMidfield = (positionCount['ZM'] || 0) >= 2;
      const hasMultipleStrikers = (positionCount['ST'] || 0) >= 2;

      let recommendedFormation = '4-3-3';
      let formationReason = 'Ausgewogene Formation';
      
      if (hasMultipleStrikers && hasEnoughDefenders) {
        recommendedFormation = '4-4-2';
        formationReason = 'Nutzt verfügbare Stürmer optimal';
      } else if (!hasStrongMidfield) {
        recommendedFormation = '3-5-2';
        formationReason = 'Verstärkt schwaches Mittelfeld';
      }

      // Find best players for key positions
      const topGoalkeeper = teamPlayers.filter(p => p.position === 'TH').sort((a, b) => (b.value || 0) - (a.value || 0))[0];
      const topMidfielder = teamPlayers.filter(p => p.position === 'ZM' || p.position === 'ZOM').sort((a, b) => (b.value || 0) - (a.value || 0))[0];
      const topStriker = teamPlayers.filter(p => p.position === 'ST' || p.position === 'LF' || p.position === 'RF').sort((a, b) => (b.value || 0) - (a.value || 0))[0];

      const analysis = {
        title: `⚽ KI Aufstellungs-Optimierer für ${selectedTeam === 'AEK' ? 'AEK Athen' : 'Real Madrid'}`,
        data: `
🤖 Optimale Formation für ${selectedTeam} basierend auf ${teamPlayers.length} verfügbaren Spielern:

🏆 Empfohlene Formation: ${recommendedFormation}
📝 Grund: ${formationReason}

📊 Kader-Analyse:
• Torhüter: ${positionCount['TH'] || 0}
• Verteidiger: ${(positionCount['IV'] || 0) + (positionCount['LV'] || 0) + (positionCount['RV'] || 0)}
• Mittelfeld: ${(positionCount['ZM'] || 0) + (positionCount['ZDM'] || 0) + (positionCount['ZOM'] || 0)}
• Angriff: ${(positionCount['ST'] || 0) + (positionCount['LF'] || 0) + (positionCount['RF'] || 0)}

⭐ Schlüsselspieler:
${topGoalkeeper ? `• Tor: ${topGoalkeeper.name} (${topGoalkeeper.value || 0}M €)` : '• Tor: Kein Torhüter verfügbar'}
${topMidfielder ? `• Mittelfeld: ${topMidfielder.name} (${topMidfielder.value || 0}M €)` : '• Mittelfeld: Kein Mittelfeldspieler verfügbar'}
${topStriker ? `• Angriff: ${topStriker.name} (${topStriker.value || 0}M €)` : '• Angriff: Kein Angreifer verfügbar'}

💡 KI-Tipps für ${selectedTeam}:
• ${topMidfielder ? `${topMidfielder.name} als Spielmacher einsetzen` : 'Kreativen Mittelfeldspieler verpflichten'}
• ${hasEnoughDefenders ? 'Defensive ist gut besetzt' : 'Verteidigung verstärken'}
• ${positionCount['ST'] >= 2 ? 'Sturm-Rotation nutzen' : 'Angriff durch Flügelspieler verstärken'}

⚡ Alternative Formationen:
• ${recommendedFormation !== '4-3-3' ? '4-3-3: Mehr Offensive' : '4-4-2: Mehr Defensive'}
• ${recommendedFormation !== '3-5-2' ? '3-5-2: Mittelfeld-Dominanz' : '4-5-1: Defensive Stabilität'}
        `
      };

      setSelectedAnalysis(analysis);
      toast.success(`⚽ Formation für ${selectedTeam} optimiert!`);
    } catch (error) {
      toast.error('Fehler bei der Formations-Optimierung');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeInjuryRisk = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1600));
      
      const analysis = {
        title: '🏥 KI Verletzungsrisiko-Analyse',
        data: `
🤖 Verletzungsrisiko-Bewertung:

⚠️ Risiko-Faktoren:
• Intensität der Spiele: Hoch
• Spieler-Rotation: Mittel
• Belastungsmanagement: Verbesserungsbedarf

📊 Risiko-Kategorien:
🔴 Hoch-Risiko: Stammspieler (> 80% Einsatzzeit)
🟡 Mittel-Risiko: Rotationsspieler
🟢 Niedrig-Risiko: Ersatzspieler

🎯 Präventions-Empfehlungen:
• Mehr Rotation bei Stammspielern
• Regenerationspausen einhalten
• Fitness-Monitoring verstärken
• Aufwärmroutinen optimieren

💊 Vorsorgemaßnahmen:
• Physiotherapie nach intensiven Spielen
• Ernährungsoptimierung
• Schlafqualität verbessern
        `
      };

      setSelectedAnalysis(analysis);
      toast.success('🏥 Verletzungsrisiko analysiert!');
    } catch (error) {
      toast.error('Fehler bei der Risiko-Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const forecastFinances = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1900));
      
      if (!transactions) {
        toast.error('Keine Finanzdaten für Prognose verfügbar');
        return;
      }

      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const netResult = totalIncome - totalExpenses;

      const analysis = {
        title: '📈 KI Finanz-Prognose',
        data: `
🤖 Finanzielle Zukunftsanalyse:

💰 Aktuelle Bilanz:
• Einnahmen: ${totalIncome.toFixed(1)}M €
• Ausgaben: ${totalExpenses.toFixed(1)}M €
• Saldo: ${netResult.toFixed(1)}M € ${netResult >= 0 ? '✅' : '⚠️'}

📊 6-Monats-Prognose:
• Erwartete Einnahmen: ${(totalIncome * 1.2).toFixed(1)}M €
• Geschätzte Ausgaben: ${(totalExpenses * 1.15).toFixed(1)}M €
• Voraussichtlicher Saldo: ${(netResult * 1.1).toFixed(1)}M €

🎯 KI-Empfehlungen:
${netResult >= 0 ? 
  '• Stabile Finanzlage - Investitionen möglich\n• Transferbudget: ~' + (netResult * 0.7).toFixed(1) + 'M €' :
  '• Ausgaben reduzieren\n• Transferverkäufe erwägen\n• Kostenoptimierung nötig'}

🔮 Langzeit-Trend: ${netResult >= 0 ? 'Positiv 📈' : 'Kritisch 📉'}
        `
      };

      setSelectedAnalysis(analysis);
      toast.success('📈 Finanz-Prognose erstellt!');
    } catch (error) {
      toast.error('Fehler bei der Finanz-Prognose');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2 flex items-center">
          <span className="mr-3">🤖</span>
          KI-Assistent
        </h2>
        <p className="text-text-muted">
          Intelligente Analysen und Vorhersagen für dein Team
        </p>
      </div>

      {/* Team Selection */}
      <div className="mb-6 modern-card">
        <h3 className="font-semibold text-text-primary mb-3 flex items-center">
          <span className="mr-2">🎯</span>
          Team für KI-Analyse auswählen
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedTeam('AEK')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedTeam === 'AEK'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-bg-secondary text-text-primary hover:bg-blue-100 border border-border-light'
            }`}
          >
            <span className="text-lg">🔵</span>
            AEK Athen
          </button>
          <button
            onClick={() => setSelectedTeam('Real')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedTeam === 'Real'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-bg-secondary text-text-primary hover:bg-red-100 border border-border-light'
            }`}
          >
            <span className="text-lg">🔴</span>
            Real Madrid
          </button>
        </div>
        <p className="text-sm text-text-muted mt-2">
          Die KI-Analysen werden speziell für das ausgewählte Team angepasst.
        </p>
      </div>

      {/* AI Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {aiFeatures.map((feature) => (
          <button
            key={feature.id}
            onClick={feature.action}
            disabled={isAnalyzing}
            className="p-4 bg-bg-secondary border border-border-light rounded-lg hover:bg-bg-tertiary hover:border-primary-green transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="bg-primary-green bg-opacity-10 border border-primary-green rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-primary-green border-t-transparent rounded-full"></div>
            <div>
              <h3 className="font-semibold text-primary-green">🤖 KI analysiert...</h3>
              <p className="text-sm text-text-secondary">Bitte warten Sie, während die KI die Daten verarbeitet.</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {selectedAnalysis && (
        <div className="bg-bg-secondary border border-border-light rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-text-primary">{selectedAnalysis.title}</h3>
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-text-primary font-mono bg-bg-primary p-4 rounded border border-border-light overflow-x-auto">
            {selectedAnalysis.data}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedAnalysis.data);
                toast.success('Analyse in Zwischenablage kopiert!');
              }}
              className="px-3 py-1 bg-primary-green text-white rounded text-sm hover:bg-green-600 transition-colors"
            >
              📋 Kopieren
            </button>
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="px-3 py-1 bg-bg-tertiary border border-border-light rounded text-sm hover:bg-bg-primary transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* AI Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 KI-Tipps</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Nutze mehrere Analysen für bessere Einschätzungen</li>
          <li>• KI-Empfehlungen sind Vorschläge - finale Entscheidung liegt bei dir</li>
          <li>• Regelmäßige Analysen helfen bei der Trend-Erkennung</li>
          <li>• Kombiniere KI-Insights mit eigener Spielerfahrung</li>
        </ul>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { IOSSegmentedControl, IOSToggle } from '../IOSComponents';
import PlayerComparison from '../PlayerComparison';
import MatchPredictionAI from '../MatchPredictionAI';
import DashboardWidgets from '../DashboardWidgets';
import TeamPerformanceHeatmap from '../TeamPerformanceHeatmap';
import { ShareButton } from '../SocialSharing';
import { triggerNotification } from '../NotificationSystem';
import PullToRefresh from '../PullToRefresh';
import SkeletonLoading from '../EnhancedLoading';

export default function EnhancedFeaturesTab({ showHints = false }) {
  const [activeSection, setActiveSection] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuresEnabled, setFeaturesEnabled] = useState(true);

  const sections = [
    'Dashboard',
    'KI-Analyse',
    'Spielervergleich',
    'Performance Heatmap'
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    
    triggerNotification('system-update', {
      message: 'Enhanced Features aktualisiert!'
    });
  };

  const handleDemoFeature = (featureName) => {
    triggerNotification('achievement-unlocked', {
      name: `${featureName} Demo`,
      description: `Du hast das ${featureName} Feature ausprobiert!`
    });
  };

  const renderContent = () => {
    if (!featuresEnabled) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-xl font-semibold text-gray-700">Enhanced Features deaktiviert</h3>
            <p className="text-gray-500">Aktiviere die Enhanced Features um diese Funktionen zu nutzen.</p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 0:
        return <DashboardWidgets />;
      case 1:
        return <MatchPredictionAI />;
      case 2:
        return <PlayerComparison />;
      case 3:
        return <TeamPerformanceHeatmap />;
      default:
        return <DashboardWidgets />;
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} enabled={featuresEnabled}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ✨ Enhanced Features
                </h1>
                <p className="text-sm text-gray-600">
                  Erweiterte Funktionen für deine FIFA Tracker Experience
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <ShareButton 
                  type="achievement" 
                  data={{
                    name: "Enhanced Features",
                    description: "Entdecke die neuen FIFA Tracker Features!"
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Teilen
                </ShareButton>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Features</span>
                  <IOSToggle
                    checked={featuresEnabled}
                    onChange={setFeaturesEnabled}
                    color="blue"
                  />
                </div>
              </div>
            </div>

            {featuresEnabled && (
              <IOSSegmentedControl
                options={sections}
                selectedIndex={activeSection}
                onChange={setActiveSection}
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isRefreshing ? (
            <div className="space-y-4">
              <SkeletonLoading type="stat-card" count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" />
              <SkeletonLoading type="player-card" count={3} className="space-y-4" />
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Demo Actions Bar */}
        {featuresEnabled && (
          <div className="fixed bottom-20 left-4 right-4 z-20">
            <div className="bg-white rounded-xl shadow-lg border p-4 backdrop-blur-sm bg-opacity-95">
              <h3 className="text-sm font-medium text-gray-700 mb-3">🧪 Demo Aktionen</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDemoFeature('Match Notification')}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors"
                >
                  📢 Match Benachrichtigung
                </button>
                <button
                  onClick={() => handleDemoFeature('Achievement')}
                  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 transition-colors"
                >
                  🏆 Achievement Demo
                </button>
                <button
                  onClick={() => handleDemoFeature('KI Prediction')}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition-colors"
                >
                  🤖 KI Vorhersage
                </button>
                <button
                  onClick={() => triggerNotification('financial-milestone', {
                    team: 'AEK',
                    amount: 100
                  })}
                  className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs hover:bg-yellow-200 transition-colors"
                >
                  💰 Finanz-Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Info Cards */}
        {featuresEnabled && showHints && (
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🚀 Neue Features entdecken
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium mb-1">📊 Interaktives Dashboard</h4>
                  <p>Anpassbare Widgets für alle wichtigen Statistiken</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">🤖 KI-Vorhersagen</h4>
                  <p>Intelligente Match-Prognosen basierend auf Team-Performance</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">👥 Spielervergleich</h4>
                  <p>Detaillierte Analyse und Vergleich von bis zu 4 Spielern</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">🔥 Performance Heatmap</h4>
                  <p>Visualisierung der Team-Performance über Zeit</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📱 iOS-Style Features
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <span>👆</span>
                  <span>Pull-to-Refresh Funktionalität</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📳</span>
                  <span>Haptic Feedback Simulation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎨</span>
                  <span>Native iOS Interface Elemente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✨</span>
                  <span>Fortgeschrittene Animationen und Übergänge</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🗑️ Verbesserte Löschfunktionen
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <span>↩️</span>
                  <span>Undo-Funktionalität mit 10s Zeitfenster</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Fortschrittsanzeige bei Bulk-Operationen</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Erweiterte Bestätigungsdialoge</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>Verbesserte Fehlerbehandlung</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
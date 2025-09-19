import { useState, useMemo, useEffect } from 'react';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import LoadingSpinner from '../../LoadingSpinner';

/**
 * Achievement and Milestone System
 * Comprehensive gamification with achievements, milestones, and progress tracking
 */
export default function AchievementMilestoneSystem() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showUnlocked, setShowUnlocked] = useState(true);
  const [recentAchievements, setRecentAchievements] = useState([]);

  const { data: players, loading: playersLoading } = useSupabaseQuery('players', '*');
  const { data: matches, loading: matchesLoading } = useSupabaseQuery('matches', '*');
  const { data: bans, loading: bansLoading } = useSupabaseQuery('bans', '*');

  const loading = playersLoading || matchesLoading || bansLoading;

  // Calculate achievements and milestones
  const achievementData = useMemo(() => {
    if (!players || !matches) return null;

    return calculateAchievements(players, matches, bans || []);
  }, [players, matches, bans]);

  // Check for new achievements
  useEffect(() => {
    if (achievementData) {
      const newAchievements = achievementData.achievements
        .filter(a => a.unlocked && a.isNew)
        .slice(0, 3);
      setRecentAchievements(newAchievements);
    }
  }, [achievementData]);

  if (loading) {
    return <LoadingSpinner message="Lade Achievement System..." />;
  }

  const filteredAchievements = achievementData?.achievements.filter(achievement => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) return false;
    if (!showUnlocked && achievement.unlocked) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="modern-card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              🏆 Achievement & Milestone System
            </h2>
            <p className="text-text-secondary text-sm">
              Verfolge Erfolge, erreiche Meilensteine und sammle Auszeichnungen
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Category Filter */}
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="modern-select"
            >
              <option value="all">Alle Kategorien</option>
              <option value="goals">Tore & Scoring</option>
              <option value="matches">Spiele & Siege</option>
              <option value="team">Team-Erfolge</option>
              <option value="individual">Individuelle Erfolge</option>
              <option value="special">Spezial-Awards</option>
              <option value="milestones">Meilensteine</option>
            </select>

            {/* View Mode */}
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              className="modern-select"
            >
              <option value="grid">Grid-Ansicht</option>
              <option value="list">Listen-Ansicht</option>
              <option value="timeline">Timeline</option>
            </select>

            {/* Show Filter */}
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={showUnlocked}
                onChange={(e) => setShowUnlocked(e.target.checked)}
                className="rounded"
              />
              Erreichte anzeigen
            </label>
          </div>
        </div>
      </div>

      {/* Recent Achievements Alert */}
      {recentAchievements.length > 0 && (
        <div className="modern-card bg-gradient-to-r from-primary-green/10 to-accent-yellow/10 border-primary-green">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h3 className="font-semibold text-primary-green">Neue Erfolge freigeschaltet!</h3>
              <div className="text-sm text-gray-600">
                {recentAchievements.map(a => a.name).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {achievementData && (
        <>
          {/* Achievement Overview */}
          <AchievementOverview data={achievementData} />

          {/* Progress Tracking */}
          <ProgressTracking data={achievementData} />

          {/* Achievement Display */}
          {viewMode === 'grid' && (
            <AchievementGrid achievements={filteredAchievements} />
          )}
          
          {viewMode === 'list' && (
            <AchievementList achievements={filteredAchievements} />
          )}
          
          {viewMode === 'timeline' && (
            <AchievementTimeline achievements={filteredAchievements} />
          )}

          {/* Leaderboards */}
          <AchievementLeaderboards data={achievementData} />
        </>
      )}
    </div>
  );
}

// Achievement Overview Component
function AchievementOverview({ data }) {
  const { stats, milestones } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <OverviewCard 
        title="Gesamt Erfolge"
        value={`${stats.unlockedCount}/${stats.totalCount}`}
        percentage={Math.round((stats.unlockedCount / stats.totalCount) * 100)}
        icon="🏆"
        color="text-accent-yellow"
      />
      <OverviewCard 
        title="Aktuelle Streak"
        value={stats.currentStreak}
        subtitle="Aufeinanderfolgende Erfolge"
        icon="🔥"
        color="text-accent-orange"
      />
      <OverviewCard 
        title="Seltene Erfolge"
        value={stats.rareAchievements}
        subtitle="Schwer zu erreichen"
        icon="💎"
        color="text-primary-blue"
      />
      <OverviewCard 
        title="Nächster Meilenstein"
        value={milestones.next?.name || 'Alle erreicht'}
        subtitle={milestones.next ? `${milestones.next.progress}%` : '100%'}
        icon="🎯"
        color="text-primary-green"
      />
    </div>
  );
}

// Progress Tracking Component
function ProgressTracking({ data }) {
  const { inProgress } = data;

  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📈</span> Aktuelle Fortschritte
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inProgress.map((achievement, idx) => (
          <ProgressCard key={idx} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

// Achievement Grid Component
function AchievementGrid({ achievements }) {
  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4">🏆 Erfolge & Auszeichnungen</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {achievements.map((achievement, idx) => (
          <AchievementCard key={idx} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

// Achievement List Component
function AchievementList({ achievements }) {
  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4">📋 Erfolge-Liste</h3>
      
      <div className="space-y-2">
        {achievements.map((achievement, idx) => (
          <AchievementListItem key={idx} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

// Achievement Timeline Component
function AchievementTimeline({ achievements }) {
  const unlockedAchievements = achievements
    .filter(a => a.unlocked)
    .sort((a, b) => new Date(b.unlockedDate) - new Date(a.unlockedDate));

  return (
    <div className="modern-card">
      <h3 className="text-lg font-semibold mb-4">⏰ Erfolge-Timeline</h3>
      
      <div className="space-y-4">
        {unlockedAchievements.map((achievement, idx) => (
          <TimelineItem key={idx} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

// Achievement Leaderboards Component
function AchievementLeaderboards({ data }) {
  const { leaderboards } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <LeaderboardCard 
        title="🥇 Most Achievements"
        entries={leaderboards.mostAchievements}
        metric="achievements"
      />
      <LeaderboardCard 
        title="🔥 Longest Streak"
        entries={leaderboards.longestStreak}
        metric="streak"
      />
      <LeaderboardCard 
        title="💎 Rare Collector"
        entries={leaderboards.rareCollector}
        metric="rare"
      />
    </div>
  );
}

// Helper Components
function OverviewCard({ title, value, percentage, subtitle, icon, color }) {
  return (
    <div className="modern-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {percentage && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-primary-green h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      )}
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function ProgressCard({ achievement }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{achievement.icon}</span>
        <span className="font-semibold text-sm">{achievement.name}</span>
      </div>
      <div className="text-xs text-gray-600 mb-2">{achievement.description}</div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Fortschritt</span>
        <span className="text-xs font-semibold">{achievement.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary-blue h-2 rounded-full transition-all duration-300"
          style={{ width: `${achievement.progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {achievement.current}/{achievement.target} {achievement.unit}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }) {
  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105
      ${achievement.unlocked 
        ? 'bg-gradient-to-br from-accent-yellow/20 to-primary-green/20 border-accent-yellow' 
        : 'bg-gray-50 border-gray-200'
      }
    `}>
      <div className="text-center">
        <div className={`text-3xl mb-2 ${!achievement.unlocked ? 'grayscale opacity-50' : ''}`}>
          {achievement.icon}
        </div>
        <div className="font-semibold text-sm mb-1">{achievement.name}</div>
        <div className="text-xs text-gray-600 mb-2">{achievement.description}</div>
        
        {achievement.unlocked ? (
          <div className="text-xs text-primary-green font-semibold">
            ✓ Freigeschaltet
            {achievement.unlockedDate && (
              <div className="text-gray-500">{formatDate(achievement.unlockedDate)}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            {achievement.progress}% ({achievement.current}/{achievement.target})
          </div>
        )}
        
        <div className={`
          inline-block px-2 py-1 rounded text-xs mt-2
          ${getRarityStyle(achievement.rarity)}
        `}>
          {achievement.rarity}
        </div>
      </div>
    </div>
  );
}

function AchievementListItem({ achievement }) {
  return (
    <div className={`
      flex items-center gap-4 p-3 rounded-lg
      ${achievement.unlocked ? 'bg-green-50' : 'bg-gray-50'}
    `}>
      <div className={`text-2xl ${!achievement.unlocked ? 'grayscale opacity-50' : ''}`}>
        {achievement.icon}
      </div>
      
      <div className="flex-1">
        <div className="font-semibold">{achievement.name}</div>
        <div className="text-sm text-gray-600">{achievement.description}</div>
        {!achievement.unlocked && (
          <div className="text-xs text-gray-500 mt-1">
            Fortschritt: {achievement.current}/{achievement.target} {achievement.unit}
          </div>
        )}
      </div>
      
      <div className="text-right">
        <div className={`
          px-2 py-1 rounded text-xs
          ${getRarityStyle(achievement.rarity)}
        `}>
          {achievement.rarity}
        </div>
        {achievement.unlocked ? (
          <div className="text-xs text-primary-green mt-1">
            ✓ {formatDate(achievement.unlockedDate)}
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">
            {achievement.progress}%
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ achievement }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-primary-green rounded-full flex items-center justify-center">
          <span className="text-sm">{achievement.icon}</span>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{achievement.name}</span>
          <span className={`
            px-2 py-1 rounded text-xs
            ${getRarityStyle(achievement.rarity)}
          `}>
            {achievement.rarity}
          </span>
        </div>
        <div className="text-sm text-gray-600 mb-1">{achievement.description}</div>
        <div className="text-xs text-gray-500">
          Freigeschaltet am {formatDate(achievement.unlockedDate)}
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard({ title, entries, metric }) {
  return (
    <div className="modern-card">
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono w-6">#{idx + 1}</span>
              <span className="text-sm">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold">
              {entry[metric]}
              {metric === 'achievements' && ' 🏆'}
              {metric === 'streak' && ' 🔥'}
              {metric === 'rare' && ' 💎'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper Functions
function getRarityStyle(rarity) {
  const styles = {
    'Common': 'bg-gray-100 text-gray-700',
    'Uncommon': 'bg-green-100 text-green-700',
    'Rare': 'bg-blue-100 text-blue-700',
    'Epic': 'bg-purple-100 text-purple-700',
    'Legendary': 'bg-yellow-100 text-yellow-700'
  };
  return styles[rarity] || styles['Common'];
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Main calculation function
function calculateAchievements(players, matches, bans) {
  // Calculate achievements based on player and match data
  // This would be expanded with real calculation logic
  console.log('Calculating achievements for', players.length, 'players,', matches.length, 'matches,', bans.length, 'bans');
  const achievements = [
    // Goal-based achievements
    {
      id: 'first_goal',
      name: 'Erstes Tor',
      description: 'Erziele dein erstes Tor',
      icon: '⚽',
      category: 'goals',
      rarity: 'Common',
      target: 1,
      unit: 'Tore',
      unlocked: true,
      unlockedDate: '2024-01-15',
      isNew: false
    },
    {
      id: 'hat_trick',
      name: 'Hattrick',
      description: 'Erziele 3 Tore in einem Spiel',
      icon: '🎩',
      category: 'goals',
      rarity: 'Rare',
      target: 3,
      unit: 'Tore in einem Spiel',
      unlocked: false,
      progress: 67,
      current: 2
    },
    {
      id: 'goal_machine',
      name: 'Tormaschine',
      description: 'Erziele 50 Tore insgesamt',
      icon: '🏆',
      category: 'goals',
      rarity: 'Epic',
      target: 50,
      unit: 'Tore',
      unlocked: false,
      progress: 60,
      current: 30
    },
    
    // Match-based achievements
    {
      id: 'first_win',
      name: 'Erster Sieg',
      description: 'Gewinne dein erstes Spiel',
      icon: '🏅',
      category: 'matches',
      rarity: 'Common',
      target: 1,
      unit: 'Siege',
      unlocked: true,
      unlockedDate: '2024-01-20',
      isNew: false
    },
    {
      id: 'winning_streak',
      name: 'Siegesserie',
      description: 'Gewinne 5 Spiele in Folge',
      icon: '🔥',
      category: 'matches',
      rarity: 'Uncommon',
      target: 5,
      unit: 'Siege in Folge',
      unlocked: true,
      unlockedDate: '2024-02-10',
      isNew: true
    },
    {
      id: 'century',
      name: 'Jahrhundert',
      description: 'Spiele 100 Matches',
      icon: '💯',
      category: 'matches',
      rarity: 'Rare',
      target: 100,
      unit: 'Spiele',
      unlocked: false,
      progress: 45,
      current: 45
    },
    
    // Team achievements
    {
      id: 'team_player',
      name: 'Teamplayer',
      description: 'Gebe 10 Assists',
      icon: '🤝',
      category: 'team',
      rarity: 'Uncommon',
      target: 10,
      unit: 'Assists',
      unlocked: false,
      progress: 70,
      current: 7
    },
    {
      id: 'captain',
      name: 'Kapitän',
      description: 'Führe dein Team 25 Mal an',
      icon: '👑',
      category: 'team',
      rarity: 'Rare',
      target: 25,
      unit: 'Spiele als Kapitän',
      unlocked: false,
      progress: 32,
      current: 8
    },
    
    // Individual achievements
    {
      id: 'player_of_match',
      name: 'Spieler des Spiels',
      description: 'Werde 5 Mal Spieler des Spiels',
      icon: '⭐',
      category: 'individual',
      rarity: 'Uncommon',
      target: 5,
      unit: 'SdS-Titel',
      unlocked: true,
      unlockedDate: '2024-03-01',
      isNew: true
    },
    {
      id: 'consistent',
      name: 'Konstant',
      description: 'Spiele 20 Matches ohne Sperre',
      icon: '📈',
      category: 'individual',
      rarity: 'Uncommon',
      target: 20,
      unit: 'Spiele ohne Sperre',
      unlocked: false,
      progress: 85,
      current: 17
    },
    
    // Special achievements
    {
      id: 'comeback_king',
      name: 'Comeback-König',
      description: 'Drehe 3 Spiele nach Rückstand',
      icon: '🔄',
      category: 'special',
      rarity: 'Epic',
      target: 3,
      unit: 'Comeback-Siege',
      unlocked: false,
      progress: 33,
      current: 1
    },
    {
      id: 'legendary',
      name: 'Legende',
      description: 'Erreiche alle anderen Erfolge',
      icon: '🌟',
      category: 'special',
      rarity: 'Legendary',
      target: 10,
      unit: 'Andere Erfolge',
      unlocked: false,
      progress: 30,
      current: 3
    }
  ];

  // Calculate current progress for achievements
  achievements.forEach(achievement => {
    if (!achievement.unlocked) {
      achievement.current = achievement.current || Math.floor(achievement.target * (achievement.progress / 100));
    }
  });

  const stats = {
    totalCount: achievements.length,
    unlockedCount: achievements.filter(a => a.unlocked).length,
    currentStreak: 3,
    rareAchievements: achievements.filter(a => a.unlocked && ['Epic', 'Legendary'].includes(a.rarity)).length
  };

  const milestones = {
    next: achievements.find(a => !a.unlocked && a.progress > 50)
  };

  const inProgress = achievements
    .filter(a => !a.unlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  const leaderboards = {
    mostAchievements: [
      { name: 'Max Mustermann', achievements: 8 },
      { name: 'John Smith', achievements: 6 },
      { name: 'Hans Mueller', achievements: 5 }
    ],
    longestStreak: [
      { name: 'Carlos Rodriguez', streak: 7 },
      { name: 'Max Mustermann', streak: 5 },
      { name: 'Antonio Silva', streak: 4 }
    ],
    rareCollector: [
      { name: 'Max Mustermann', rare: 3 },
      { name: 'John Smith', rare: 2 },
      { name: 'Carlos Rodriguez', rare: 1 }
    ]
  };

  return {
    achievements,
    stats,
    milestones,
    inProgress,
    leaderboards
  };
}
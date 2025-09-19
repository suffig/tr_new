import { useState, useEffect } from 'react';

export default function EventsTab() {
  const [activeEvents, setActiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Mock data for now - this would be replaced with actual data management
  useEffect(() => {
    const mockActiveEvents = [
      {
        id: 1,
        name: 'Weihnachtsevent 2024',
        type: 'seasonal',
        description: 'Festliche FIFA-Matches mit speziellen Preisen',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        icon: '🎄',
        status: 'active',
        participants: 12,
        prizes: ['Glühwein für alle', 'FIFA-Pokal', 'Weihnachtsgeld']
      },
      {
        id: 2,
        name: 'Slot Machine Challenge',
        type: 'gambling',
        description: 'Drehe das Glücksrad nach jedem Sieg',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        icon: '🎰',
        status: 'active',
        participants: 8,
        currentJackpot: '145.50€'
      }
    ];

    const mockUpcomingEvents = [
      {
        id: 3,
        name: 'Oster-Tournament',
        type: 'tournament',
        description: 'K.O.-Turnier um den goldenen Fußball',
        startDate: '2024-04-01',
        endDate: '2024-04-07',
        icon: '🐰',
        status: 'upcoming',
        plannedParticipants: 16,
        prizes: ['Goldener Fußball', 'Schokoladen-Set']
      },
      {
        id: 4,
        name: 'Summer League',
        type: 'league',
        description: 'Liga-Modus über den ganzen Sommer',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        icon: '☀️',
        status: 'upcoming',
        plannedParticipants: 20
      }
    ];

    setActiveEvents(mockActiveEvents);
    setUpcomingEvents(mockUpcomingEvents);
  }, []);

  const EventCard = ({ event, isUpcoming = false }) => (
    <div className={`modern-card p-6 ${isUpcoming ? 'opacity-75' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{event.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{event.name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              event.type === 'seasonal' ? 'bg-red-100 text-red-700' :
              event.type === 'gambling' ? 'bg-yellow-100 text-yellow-700' :
              event.type === 'tournament' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {event.type === 'seasonal' ? 'Saisonal' :
               event.type === 'gambling' ? 'Glücksspiel' :
               event.type === 'tournament' ? 'Turnier' : 'Liga'}
            </span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          event.status === 'active' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {event.status === 'active' ? 'Aktiv' : 'Geplant'}
        </div>
      </div>

      <p className="text-text-secondary text-sm mb-4">{event.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs text-text-muted">Start</span>
          <div className="text-sm font-medium text-text-primary">
            {new Date(event.startDate).toLocaleDateString('de-DE')}
          </div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Ende</span>
          <div className="text-sm font-medium text-text-primary">
            {new Date(event.endDate).toLocaleDateString('de-DE')}
          </div>
        </div>
      </div>

      {event.participants && (
        <div className="mb-4">
          <span className="text-xs text-text-muted">Teilnehmer</span>
          <div className="text-sm font-medium text-text-primary">
            {event.participants} aktive Spieler
          </div>
        </div>
      )}

      {event.plannedParticipants && (
        <div className="mb-4">
          <span className="text-xs text-text-muted">Geplante Teilnehmer</span>
          <div className="text-sm font-medium text-text-primary">
            {event.plannedParticipants} Spieler
          </div>
        </div>
      )}

      {event.currentJackpot && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span className="text-xs text-yellow-700 dark:text-yellow-300">Aktueller Jackpot</span>
          <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
            {event.currentJackpot}
          </div>
        </div>
      )}

      {event.prizes && (
        <div className="mb-4">
          <span className="text-xs text-text-muted mb-2 block">Preise</span>
          <div className="flex flex-wrap gap-1">
            {event.prizes.map((prize, index) => (
              <span 
                key={index}
                className="text-xs bg-bg-tertiary text-text-secondary px-2 py-1 rounded-full"
              >
                {prize}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <button className="btn-primary text-sm py-2 px-4 flex-1">
          {isUpcoming ? 'Anmelden' : 'Details anzeigen'}
        </button>
        {!isUpcoming && (
          <button className="btn-secondary text-sm py-2 px-4">
            Teilnehmen
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">
      {/* Enhanced Header with iOS 26 Design - matching StatsTab */}
      <div className="mb-6 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-info rounded-ios-lg flex items-center justify-center">
            <span className="text-white text-xl">🎉</span>
          </div>
          <div>
            <h2 className="text-title1 font-bold text-text-primary">Events</h2>
            <p className="text-footnote text-text-secondary">Besondere Events, Turniere und Challenges</p>
          </div>
        </div>
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <span className="mr-2">🔥</span>
            Aktive Events
          </h2>
          <div className="space-y-4">
            {activeEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Geplante Events
          </h2>
          <div className="space-y-4">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} isUpcoming={true} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeEvents.length === 0 && upcomingEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎪</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Keine Events verfügbar
          </h3>
          <p className="text-text-muted text-sm">
            Aktuell sind keine Events geplant oder aktiv.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 text-xl flex-shrink-0">💡</div>
          <div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              Event-Verwaltung
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              Events können in der Verwaltung konfiguriert und individualisiert werden. 
              Hier werden Slot Machine Events, saisonale Turniere und spezielle Challenges verwaltet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import Icon from '../icons/Icon';
import { useState, useEffect } from 'react';

export default function EventsTab() {
  const [activeEvents, setActiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Beispiel-Events (Platzhalter, bis eine echte Event-Verwaltung angebunden ist)
  useEffect(() => {
    const y = new Date().getFullYear();
    const sampleActiveEvents = [
      {
        id: 1,
        name: 'Blackjack-Nacht',
        type: 'gambling',
        description: 'Kartenspiele mit Echtgeld-Einsatz nach jedem Match',
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
        icon: '🃏',
        status: 'active',
        participants: 2,
        currentJackpot: '145.50€'
      }
    ];

    const sampleUpcomingEvents = [
      {
        id: 2,
        name: 'Sommer-Liga',
        type: 'league',
        description: 'Liga-Modus über den ganzen Sommer',
        startDate: `${y}-06-01`,
        endDate: `${y}-08-31`,
        icon: '☀️',
        status: 'upcoming',
        plannedParticipants: 2
      }
    ];

    setActiveEvents(sampleActiveEvents);
    setUpcomingEvents(sampleUpcomingEvents);
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
      <div className="page-header animate-mobile-slide-in">
        <div className="page-header-row">
          <div>
            <h2 className="page-title">Events</h2>
            <p className="page-subtitle">Besondere Events, Turniere und Challenges</p>
          </div>
          <div className="page-icon tile-purple"><Icon name="sparkles" size={22} strokeWidth={2} /></div>
        </div>
        <div className="hidden">
          <div className="h-full bg-gradient-info w-3/4 rounded-full animate-pulse-gentle"></div>
        </div>
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4 inline-flex items-center gap-2">
            <Icon name="zap" size={18} strokeWidth={2.2} className="text-system-orange" />
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
          <h2 className="text-lg font-semibold text-text-primary mb-4 inline-flex items-center gap-2">
            <Icon name="calendar" size={18} strokeWidth={2.2} className="text-system-blue" />
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
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-system-purple/12 text-system-purple flex items-center justify-center">
            <Icon name="sparkles" size={26} strokeWidth={1.8} />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Keine Events verfügbar
          </h3>
          <p className="text-text-muted text-sm">
            Aktuell sind keine Events geplant oder aktiv.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Icon name="bulb" size={18} strokeWidth={2} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            Events lassen sich in der Verwaltung konfigurieren.
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import HorizontalNavigation from '../HorizontalNavigation';
import MatchesTab from './MatchesTab';
import KaderTab from './KaderTab';
import BansTab from './BansTab';

// Sammel-Tab "Spiele": alles zum laufenden Spielbetrieb an einer Stelle —
// die Spiele selbst, wer im Kader steht und wer gesperrt ist. Vorher waren das
// drei eigene Eintraege in der unteren Leiste, obwohl man beim Erfassen eines
// Spieltags ohnehin zwischen ihnen springt.
const VIEWS = [
  { id: 'spiele', label: 'Spiele', iconName: 'football', hinweis: 'Alle Begegnungen und ihre Ergebnisse' },
  { id: 'kader', label: 'Kader', iconName: 'users', hinweis: 'Wer bei welchem Team steht' },
  { id: 'sperren', label: 'Sperren', iconName: 'ban', hinweis: 'Wer aussetzen muss und wie lange' },
];

const KEY = 'fusta_spielbetrieb_view';

const gueltig = (v) => !!v && VIEWS.some((x) => x.id === v);

export default function SpielbetriebTab({ viewRequest, ...props }) {
  // `viewRequest` erlaubt es, gezielt in eine Unteransicht zu springen
  // (z. B. aus dem Profil-Schnellzugriff "Kader"). Ohne Anfrage merkt sich der
  // Bereich die zuletzt benutzte Ansicht.
  const [view, setView] = useState(() => {
    if (gueltig(viewRequest?.view)) return viewRequest.view;
    try { return localStorage.getItem(KEY) || 'spiele'; } catch { return 'spiele'; }
  });
  // Auch reagieren, wenn der Bereich schon offen ist — dann gibt es kein
  // Remount, das die Anfrage von allein aufgreifen wuerde.
  useEffect(() => {
    if (gueltig(viewRequest?.view)) setView(viewRequest.view);
  }, [viewRequest]);
  useEffect(() => { try { localStorage.setItem(KEY, view); } catch { /* ignore */ } }, [view]);

  return (
    <div>
      <div className="px-4 pt-4">
        <HorizontalNavigation views={VIEWS} selectedView={view} onViewChange={setView} />
      </div>
      {view === 'spiele' && <MatchesTab {...props} />}
      {view === 'kader' && <KaderTab {...props} />}
      {view === 'sperren' && <BansTab {...props} />}
    </div>
  );
}

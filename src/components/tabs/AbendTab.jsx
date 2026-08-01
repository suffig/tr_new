import { useState, useEffect } from 'react';
import HorizontalNavigation from '../HorizontalNavigation';
import TeamTrackerTab from './TeamTrackerTab';
import AlcoholTrackerTab from './AlcoholTrackerTab';
import SpielersaufenTab from './SpielersaufenTab';

// Sammel-Tab "Abend": alles, was rund um den Spieleabend passiert.
// Die drei haengen inhaltlich zusammen — im Spielduell werden Teams gezogen,
// daraus entstehen Sterne, und die landen im Alkohol-Zaehler. Vorher standen
// sie als drei getrennte Eintraege im "Mehr"-Menue.
const VIEWS = [
  { id: 'teams', label: 'Teams', iconName: 'trophy', hinweis: 'Gezogene Mannschaften und Spielduelle' },
  { id: 'alkohol', label: 'Alkohol', iconName: 'beer', hinweis: 'Schnaps, Bier und der Sterne-Zähler' },
  { id: 'saufen', label: 'Saufen', iconName: 'mic', hinweis: 'Aufstellung, Auslosung und Ergebnis' },
];

const KEY = 'fusta_abend_view';

const gueltig = (v) => !!v && VIEWS.some((x) => x.id === v);

export default function AbendTab({ viewRequest, ...props }) {
  const [view, setView] = useState(() => {
    if (gueltig(viewRequest?.view)) return viewRequest.view;
    try { return localStorage.getItem(KEY) || 'teams'; } catch { return 'teams'; }
  });
  useEffect(() => {
    if (gueltig(viewRequest?.view)) setView(viewRequest.view);
  }, [viewRequest]);
  useEffect(() => { try { localStorage.setItem(KEY, view); } catch { /* ignore */ } }, [view]);

  return (
    <div>
      <div className="px-4 pt-4">
        <HorizontalNavigation views={VIEWS} selectedView={view} onViewChange={setView} />
      </div>
      {view === 'teams' && <TeamTrackerTab {...props} />}
      {view === 'alkohol' && <AlcoholTrackerTab {...props} />}
      {view === 'saufen' && <SpielersaufenTab {...props} />}
    </div>
  );
}

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import {
  PFLEGE_FELDER, feldWerte, benenneFeldUm, entferneFeldWert,
  aendereBier, loescheBier,
} from '../../../utils/bierboerse';

/**
 * Listen pflegen — Biere, Brauereien, Sorten, Länder.
 *
 * DIE LISTEN SIND NICHT GLEICH AUFGEBAUT
 * Biere sind echte Zeilen im Katalog. Brauereien, Sorten und Länder stehen
 * dagegen als Text IN jeder Bierzeile — sie sind keine eigenen Dinge. Deshalb
 * heißt „umbenennen" dort: alle betroffenen Biere ändern. Und „entfernen"
 * heißt: das Feld bei allen leeren. Beides steht mit der Anzahl dabei, damit
 * niemand aus Versehen zwölf Biere anfasst.
 *
 * HINZUFÜGEN GIBT ES HIER BEWUSST NICHT
 * Eine Brauerei ohne Bier existiert nirgends und wäre beim nächsten Laden
 * wieder weg. Neue Werte entstehen beim Eintragen über „+ Neu" — dort, wo sie
 * auch gebraucht werden.
 */
export default function ListenPflege({ katalog, verkostungen, onGeaendert }) {
  const [offen, setOffen] = useState(false);
  const [feld, setFeld] = useState('brauerei');
  const [arbeitet, setArbeitet] = useState(false);

  const werte = useMemo(() => feldWerte(katalog, feld), [katalog, feld]);
  const aktuell = PFLEGE_FELDER.find((f) => f.id === feld) || PFLEGE_FELDER[0];

  const umbenennen = async (alt, anzahl) => {
    const neu = window.prompt(
      `„${alt}" umbenennen — ${anzahl} ${anzahl === 1 ? 'Bier' : 'Biere'} betroffen.\n\n`
      + 'Ein bereits vorhandener Name führt beide zusammen.', alt);
    if (neu == null || neu.trim() === alt) return;
    setArbeitet(true);
    try {
      const { geaendert } = await benenneFeldUm(feld, alt, neu, katalog);
      toast.success(`${geaendert} ${geaendert === 1 ? 'Bier' : 'Biere'} geändert.`);
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const entfernen = async (wert, anzahl) => {
    // Ausdrücklich als Datenverlust benennen: die Biere bleiben, aber ihre
    // Brauerei ist danach weg. „Löschen" wäre hier das falsche Wort, weil
    // nichts gelöscht wird — es wird etwas geleert.
    const sicher = window.confirm(
      `„${wert}" bei ${anzahl} ${anzahl === 1 ? 'Bier' : 'Bieren'} entfernen?\n\n`
      + `Die Biere bleiben, aber ihre ${aktuell.einzahl} ist danach leer. `
      + 'Das lässt sich nur durch erneutes Eintragen rückgängig machen.');
    if (!sicher) return;
    setArbeitet(true);
    try {
      const { geleert } = await entferneFeldWert(feld, wert, katalog);
      toast.success(`Bei ${geleert} ${geleert === 1 ? 'Bier' : 'Bieren'} entfernt.`);
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const bierUmbenennen = async (b) => {
    const neu = window.prompt('Bier umbenennen:', b.name);
    if (neu == null || !neu.trim() || neu.trim() === b.name) return;
    setArbeitet(true);
    try {
      await aendereBier(b.id, { name: neu });
      toast.success('Geändert.');
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.');
    } finally { setArbeitet(false); }
  };

  const bierLoeschen = async (b) => {
    if (!window.confirm(`„${b.name}" aus dem Katalog löschen?`)) return;
    setArbeitet(true);
    try {
      await loescheBier(b.id, verkostungen);
      toast.success('Gelöscht.');
      onGeaendert?.();
    } catch (err) {
      toast.error(err?.message || 'Ging nicht.', { duration: 6000 });
    } finally { setArbeitet(false); }
  };

  if (!offen) {
    return (
      <button type="button" onClick={() => setOffen(true)}
              className="w-full py-2 rounded-xl bg-bg-tertiary text-text-secondary text-footnote font-medium">
        Listen pflegen
      </button>
    );
  }

  const reiter = [...PFLEGE_FELDER, { id: 'bier', label: 'Biere', einzahl: 'Bier' }];

  return (
    <div className="panel-gray rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-footnote font-semibold text-text-secondary">Listen pflegen</span>
        <button type="button" onClick={() => setOffen(false)} className="text-caption2 text-system-blue">
          Zuklappen
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {reiter.map((f) => (
          <button key={f.id} type="button" onClick={() => setFeld(f.id)}
                  aria-pressed={feld === f.id}
                  className={`flex-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                    feld === f.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {feld === 'bier' ? (
        <div className="max-h-64 overflow-y-auto divide-y divide-border-light">
          {(katalog || []).length === 0 ? (
            <p className="text-caption1 text-text-tertiary py-2">Noch nichts im Katalog.</p>
          ) : [...katalog]
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'))
            .map((b) => {
              const genutzt = (verkostungen || []).filter((v) => v.bier_id === b.id).length;
              return (
                <div key={b.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-caption1 text-text-primary truncate">{b.name}</div>
                    <div className="text-caption2 text-text-tertiary truncate">
                      {[b.brauerei, b.art, b.land].filter(Boolean).join(' · ') || 'keine Angaben'}
                      {genutzt > 0 && ` · ${genutzt}× getrunken`}
                    </div>
                  </div>
                  <button type="button" onClick={() => bierUmbenennen(b)} disabled={arbeitet}
                          className="chip chip-sm chip-gray flex-shrink-0">
                    Umbenennen
                  </button>
                  {/* Nur anbieten, was auch geht: bier_verkostungen verweist mit
                      `on delete restrict` auf den Katalog, ein getrunkenes Bier
                      laesst die Datenbank also gar nicht loeschen. Ein Knopf,
                      der immer scheitert, ist schlimmer als keiner. */}
                  {genutzt === 0 && (
                    <button type="button" onClick={() => bierLoeschen(b)} disabled={arbeitet}
                            aria-label={`${b.name} löschen`}
                            className="text-text-tertiary hover:text-system-red flex-shrink-0 px-1">
                      <Icon name="x" size={14} strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-border-light">
          {werte.length === 0 ? (
            <p className="text-caption1 text-text-tertiary py-2">
              Noch keine {aktuell.label} vergeben.
            </p>
          ) : werte.map((w) => (
            <div key={w.wert} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-caption1 text-text-primary truncate">{w.wert}</div>
                <div className="text-caption2 text-text-tertiary">
                  {w.anzahl} {w.anzahl === 1 ? 'Bier' : 'Biere'}
                </div>
              </div>
              <button type="button" onClick={() => umbenennen(w.wert, w.anzahl)} disabled={arbeitet}
                      className="chip chip-sm chip-gray flex-shrink-0">
                Umbenennen
              </button>
              <button type="button" onClick={() => entfernen(w.wert, w.anzahl)} disabled={arbeitet}
                      aria-label={`${w.wert} entfernen`}
                      className="text-text-tertiary hover:text-system-red flex-shrink-0 px-1">
                <Icon name="x" size={14} strokeWidth={2.4} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-caption2 text-text-tertiary">
        {feld === 'bier'
          ? 'Getrunkene Biere lassen sich nicht löschen — sie hängen an den Verkostungen.'
          : `Umbenennen ändert alle betroffenen Biere; ein vorhandener Name führt beide `
            + `zusammen. Neue ${aktuell.label} entstehen beim Eintragen über „+ Neu".`}
      </p>
    </div>
  );
}

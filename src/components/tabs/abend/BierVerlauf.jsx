import { useMemo, useState } from 'react';
import Verlaufsgrafik from '../../Verlaufsgrafik';
import { abendVerlauf, abendTrinkverlauf } from '../../../utils/bierboerse';

const kurz = (d) => (d
  ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  : '—');
const euro = (n) => `${(Number(n) || 0).toLocaleString('de-DE',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const eins = (n) => Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 });

/**
 * Verlauf über die Abende — wird es mehr, teurer, stärker?
 *
 * Die Bilanz hatte je Abend eine Zeile. Eine Zeile beantwortet nicht, ob
 * etwas zu- oder abnimmt; dafür müssen die Abende nebeneinanderliegen.
 */
export function AbendeVerlauf({ boersen, verkostungen, katalog }) {
  const [mass, setMass] = useState('glaeser');
  const reihe = useMemo(
    () => abendVerlauf(boersen, verkostungen, katalog),
    [boersen, verkostungen, katalog]);

  const masse = [
    { id: 'glaeser', label: 'Gläser', farbe: 'var(--system-yellow)', f: (n) => `${n} Gläser`, k: (n) => `${n}` },
    { id: 'liter', label: 'Liter', farbe: 'var(--system-blue)', f: (n) => `${eins(n)} l`, k: eins },
    { id: 'ausgaben', label: 'Ausgaben', farbe: 'var(--system-green)', f: euro, k: (n) => `${Math.round(Number(n) || 0)}` },
    { id: 'proGlas', label: 'Preis je Glas', farbe: 'var(--system-orange)', f: euro, k: (n) => (n == null ? '—' : Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) },
    { id: 'schnitt', label: 'Ø Note', farbe: 'var(--system-purple)', f: (n) => eins(n), k: eins },
  ];
  const aktuell = masse.find((m) => m.id === mass) || masse[0];

  const punkte = useMemo(() => reihe.map((e) => ({
    label: kurz(e.datum),
    // null bleibt null: ein Abend ohne Bewertung hat keinen Schnitt, und
    // eine 0 waere hier eine sehr schlechte Note statt "keine Angabe".
    wert: e[aktuell.id],
    zusatz: e.boerse?.name,
  })), [reihe, aktuell.id]);

  if (reihe.length < 2) return null;

  return (
    <div className="modern-card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-footnote font-semibold text-text-muted">Verlauf über die Abende</span>
        <span className="text-caption2 text-text-tertiary">{reihe.length} Abende</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-2 -mx-1 px-1">
        {masse.map((m) => (
          <button key={m.id} type="button" onClick={() => setMass(m.id)}
                  aria-pressed={mass === m.id}
                  className={`px-2.5 py-1 rounded-lg text-caption2 font-semibold flex-shrink-0 transition-colors ${
                    mass === m.id ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <Verlaufsgrafik punkte={punkte} farbe={aktuell.farbe} hoehe={128}
                      formatWert={aktuell.f} formatKurz={aktuell.k}
                      // Bei Noten und Preis je Glas ist die Null kein
                      // sinnvoller Anfang — dann liegen alle Werte oben im
                      // Bild und die Unterschiede verschwinden.
                      nullBasiert={mass !== 'schnitt' && mass !== 'proGlas'} />
    </div>
  );
}

/**
 * Verlauf INNERHALB eines Abends — wie viel ist bis hierher zusammengekommen.
 *
 * Die Frage am Abend selbst. Mit den Einzelzeilen zu beantworten hieße, im
 * Kopf zu addieren.
 */
export function TrinkVerlauf({ verkostungen, katalog }) {
  const [mass, setMass] = useState('glaeser');
  const reihe = useMemo(
    () => abendTrinkverlauf(verkostungen, katalog),
    [verkostungen, katalog]);

  const masse = [
    { id: 'glaeser', label: 'Gläser', farbe: 'var(--system-yellow)', f: (n) => `${n} Gläser`, k: (n) => `${n}` },
    { id: 'liter', label: 'Liter', farbe: 'var(--system-blue)', f: (n) => `${eins(n)} l`, k: eins },
    { id: 'standardglaeser', label: 'Alkohol', farbe: 'var(--system-red)', f: (n) => `${eins(n)} Std.-Gläser`, k: eins },
    { id: 'ausgaben', label: 'Ausgaben', farbe: 'var(--system-green)', f: euro, k: (n) => `${Math.round(Number(n) || 0)}` },
  ];
  const aktuell = masse.find((m) => m.id === mass) || masse[0];

  const punkte = useMemo(() => reihe.map((e, i) => ({
    label: `${i + 1}.`,
    wert: e[aktuell.id],
    zusatz: e.name,
  })), [reihe, aktuell.id]);

  if (reihe.length < 2) return null;
  const letzte = reihe.at(-1);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-footnote font-semibold text-text-muted">Verlauf des Abends</span>
        <span className="text-caption2 text-text-tertiary">aufsummiert</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-1.5 -mx-1 px-1">
        {masse.map((m) => (
          <button key={m.id} type="button" onClick={() => setMass(m.id)}
                  aria-pressed={mass === m.id}
                  className={`px-2.5 py-1 rounded-lg text-caption2 font-semibold flex-shrink-0 transition-colors ${
                    mass === m.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <Verlaufsgrafik punkte={punkte} farbe={aktuell.farbe} hoehe={110}
                      formatWert={aktuell.f} formatKurz={aktuell.k} />

      <p className="text-caption2 text-text-tertiary mt-1">
        Nach dem letzten Bier: {aktuell.f(letzte[aktuell.id])}.
        {' '}Reihenfolge ist die der Eintragung — eine Uhrzeit wird nicht erfasst.
      </p>
    </div>
  );
}

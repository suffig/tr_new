import { useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import { supabaseDb } from '../../../utils/supabase';
import { getTeamDisplay } from '../../../constants/teams';

import { useIchBin } from '../../../hooks/useIchBin';
/** Ganze Euro deutsch: "2.000 €" statt "2000 €". */
const euroGanz = (n) => `${Math.round(Number(n) || 0).toLocaleString('de-DE')} €`;

// "Wer schuldet wem wie viel?" — die Frage nach jedem Abend.
//
// Die Zahl gab es schon: der Echtgeld-Ausgleich fuehrt sie je Team in
// finances.debt und verrechnet Sieger gegen Verlierer, sodass im Normalfall nur
// eine Seite offen ist. Sichtbar war sie aber nur als zwei getrennte
// Schulden-Kacheln in der Analyse-Ansicht — man musste selbst subtrahieren.
// Und es gab keinen Weg, eine bezahlte Schuld abzuhaken.

/** Zwei Schuldenstaende zu einem Satz verrechnen. */
export function offeneRechnung(aekSchuld, realSchuld) {
  const netto = (Number(realSchuld) || 0) - (Number(aekSchuld) || 0);
  if (netto === 0) return { betrag: 0, schuldner: null, glaeubiger: null };
  return netto > 0
    ? { betrag: netto, schuldner: 'Real', glaeubiger: 'AEK' }
    : { betrag: -netto, schuldner: 'AEK', glaeubiger: 'Real' };
}

export default function OffeneRechnung({ aekFinances, realFinances, onChange }) {
  const { darfEintragen } = useIchBin();
  const [laeuft, setLaeuft] = useState(false);
  const r = offeneRechnung(aekFinances?.debt, realFinances?.debt);

  const begleichen = async () => {
    if (!window.confirm(
      `${getTeamDisplay(r.schuldner)} hat ${euroGanz(r.betrag)} an ${getTeamDisplay(r.glaeubiger)} gezahlt?\n\n` +
      'Beide Schuldenstände werden auf 0 gesetzt.'
    )) return;

    setLaeuft(true);
    try {
      // Beide Seiten nullen, nicht nur die offene: ein Restbetrag auf der
      // anderen Seite waere sonst nach dem Begleichen ploetzlich die neue
      // offene Rechnung.
      for (const fin of [aekFinances, realFinances]) {
        if (fin?.id != null && (fin.debt || 0) !== 0) {
          await supabaseDb.update('finances', { debt: 0 }, fin.id);
        }
      }
      // Als Buchung festhalten, damit im Verlauf steht, wann ausgeglichen wurde.
      await supabaseDb.insert('transactions', {
        team: r.schuldner,
        type: 'Echtgeld-Ausgleich (bezahlt)',
        amount: 0,
        info: `${euroGanz(r.betrag)} an ${getTeamDisplay(r.glaeubiger)} gezahlt`,
        date: new Date().toISOString().slice(0, 10),
      });
      toast.success('Rechnung als beglichen vermerkt');
      onChange?.();
    } catch (e) {
      toast.error('Konnte nicht gespeichert werden: ' + (e?.message || e));
    } finally {
      setLaeuft(false);
    }
  };

  if (r.betrag === 0) {
    return (
      <div className="modern-card mb-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-system-green/15 text-system-green flex items-center justify-center flex-shrink-0">
          <Icon name="check" size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-text-primary">Keine offene Rechnung</div>
          <div className="text-footnote text-text-tertiary">Ihr seid quitt.</div>
        </div>
      </div>
    );
  }

  const schuldnerBlau = r.schuldner === 'AEK';

  return (
    <div className="modern-card mb-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-system-orange/15 text-system-orange flex items-center justify-center flex-shrink-0">
          <Icon name="swap" size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Kein truncate: mit echten Vereinsnamen passt "X schuldet Y" auf
              375px nie in eine Zeile, und abgeschnitten wird ausgerechnet der
              Glaeubiger — also die Haelfte der Aussage. */}
          <div className="font-semibold text-text-primary">
            <span className={schuldnerBlau ? 'text-system-blue' : 'text-system-red'}>
              {getTeamDisplay(r.schuldner)}
            </span>
            {' schuldet '}
            <span className={schuldnerBlau ? 'text-system-red' : 'text-system-blue'}>
              {getTeamDisplay(r.glaeubiger)}
            </span>
          </div>
          <div className="text-footnote text-text-tertiary">Offene Echtgeld-Rechnung</div>
        </div>
        <div className="stat-display text-2xl text-system-orange num-tabular flex-shrink-0">
          {euroGanz(r.betrag)}
        </div>
      </div>

      {/* Die SCHULD sieht jeder — wer wem was zahlt, geht beide an. Sie
          als beglichen zu buchen ist dagegen eine Aenderung an den Konten. */}
      {darfEintragen && (
        <button
          onClick={begleichen}
          disabled={laeuft}
          className="btn-secondary w-full mt-3 disabled:opacity-50"
        >
          {laeuft ? 'Wird gespeichert…' : 'Als bezahlt markieren'}
        </button>
      )}
    </div>
  );
}

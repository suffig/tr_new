import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import Kraefteverhaeltnis from '../../Kraefteverhaeltnis';
import LoadingSpinner from '../../LoadingSpinner';
import { getTeamDisplay } from '../../../constants/teams';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { dez } from '../../../utils/zahlen';
import { ladeWechsel, erfasstSeit } from '../../../utils/spielerWechsel';

/**
 * Alle Wechsel an einem Ort.
 *
 * Die einzelnen Wechsel stehen auf den Spielerkarten — dort sieht man die
 * Laufbahn eines Menschen. Was fehlte: der Blick über alle. "Wen haben wir
 * dieses Jahr getauscht" und "wie viel Geld ist dabei zwischen uns geflossen"
 * liess sich nur beantworten, indem man 41 Spielerkarten einzeln aufmacht.
 *
 * Der Betrag kommt aus der verknüpften Transaktion (spieler_wechsel.
 * transaktion_id), nicht aus einem eigenen Feld: so steht der Preis genau
 * einmal in der Datenbank, und die Finanzen bleiben die eine Wahrheit über
 * Geld.
 */

const datumLang = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? String(d)
    : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const euro = (n) => `${Math.round(Number(n) || 0).toLocaleString('de-DE')} €`;

export default function Transferliste() {
  const [wechsel, setWechsel] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [saison, setSaison] = useState('alle');

  const { data: transaktionen } = useSupabaseQuery(
    'transactions', 'id,amount,type,team,date', { skipFifaFilter: true });

  const holen = useCallback(async () => {
    setLaedt(true);
    const { wechsel: w, fehler } = await ladeWechsel();
    setWechsel(fehler ? null : w);
    setLaedt(false);
  }, []);
  useEffect(() => { holen(); }, [holen]);

  const preisVon = useMemo(() => {
    const nach = new Map();
    for (const t of transaktionen || []) nach.set(t.id, Math.abs(Number(t.amount) || 0));
    return nach;
  }, [transaktionen]);

  // Nur echte Wechsel: die Startzeilen (von = null) sind der Stand bei
  // Einführung und kein Vorgang, über den es etwas zu berichten gäbe.
  const echte = useMemo(() => {
    const liste = (wechsel || []).filter((w) => w.von != null);
    return saison === 'alle' ? liste : liste.filter((w) => w.fifa_version === saison);
  }, [wechsel, saison]);

  const saisons = useMemo(
    () => [...new Set((wechsel || []).map((w) => w.fifa_version).filter(Boolean))].sort().reverse(),
    [wechsel]);

  const bilanz = useMemo(() => {
    const b = { AEK: { zu: 0, weg: 0, gezahlt: 0, bekommen: 0 },
                Real: { zu: 0, weg: 0, gezahlt: 0, bekommen: 0 } };
    for (const w of echte) {
      const preis = preisVon.get(w.transaktion_id) || 0;
      if (b[w.nach]) { b[w.nach].zu += 1; b[w.nach].gezahlt += preis; }
      if (b[w.von]) { b[w.von].weg += 1; b[w.von].bekommen += preis; }
    }
    return b;
  }, [echte, preisVon]);

  if (laedt) return <LoadingSpinner message="Lade Wechsel…" />;

  if (wechsel == null) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="swap" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Die Wechsel-Erfassung ist noch nicht eingespielt.</p>
        <p className="text-footnote text-text-tertiary mt-1">db/25_spieler_wechsel.sql</p>
      </div>
    );
  }

  const stichtag = erfasstSeit(wechsel);
  const neueste = [...echte].sort(
    (a, b) => String(b.datum).localeCompare(String(a.datum)) || (b.id - a.id));

  return (
    <div className="space-y-4">
      {saisons.length > 1 && (
        <select value={saison} onChange={(e) => setSaison(e.target.value)}
                className="form-input w-full" aria-label="Saison filtern">
          <option value="alle">Alle Saisons</option>
          {saisons.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      )}

      {echte.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <Icon name="swap" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-text-muted">Noch kein Wechsel festgehalten.</p>
          {stichtag && (
            <p className="text-footnote text-text-tertiary mt-1">
              Erfasst wird seit dem {datumLang(stichtag)}.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="modern-card p-4">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-footnote font-semibold text-text-muted">Wer hat wen geholt</span>
              <span className="text-caption2 text-text-tertiary">
                {echte.length} {echte.length === 1 ? 'Wechsel' : 'Wechsel'}
              </span>
            </div>
            <div className="divide-y divide-border-light">
              <Kraefteverhaeltnis
                label="Zugänge" klein
                aek={bilanz.AEK.zu} real={bilanz.Real.zu}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
              <Kraefteverhaeltnis
                label="Abgänge" klein
                aek={bilanz.AEK.weg} real={bilanz.Real.weg}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
              {(bilanz.AEK.gezahlt + bilanz.Real.gezahlt) > 0 && (
                <Kraefteverhaeltnis
                  label="Ausgegeben" klein zusatz="für Zugänge"
                  aek={bilanz.AEK.gezahlt} real={bilanz.Real.gezahlt}
                  anzeige={(n) => euro(n)}
                  aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
              )}
            </div>
            {/* Was unterm Strich blieb — Preis ist ein Saldo, kein Verhältnis,
                deshalb als Zahl und nicht als geteilte Fläche. */}
            {(bilanz.AEK.gezahlt + bilanz.Real.gezahlt + bilanz.AEK.bekommen + bilanz.Real.bekommen) > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-light">
                {['AEK', 'Real'].map((t) => {
                  const saldo = bilanz[t].bekommen - bilanz[t].gezahlt;
                  return (
                    <div key={t}>
                      <div className={`stat-display text-[17px] num-tabular ${
                        saldo > 0 ? 'text-system-green' : saldo < 0 ? 'text-system-red' : 'text-text-secondary'}`}>
                        {saldo > 0 ? '+' : ''}{euro(saldo)}
                      </div>
                      <div className="text-caption2 text-text-tertiary truncate">
                        unterm Strich · {getTeamDisplay(t)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modern-card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-light flex items-baseline justify-between">
              <span className="karten-titel">Alle Wechsel</span>
              <span className="text-caption2 text-text-tertiary">neueste zuerst</span>
            </div>
            <div className="divide-y divide-border-light">
              {neueste.map((w) => {
                const preis = preisVon.get(w.transaktion_id) || 0;
                return (
                  <div key={w.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-text-primary truncate flex-1 min-w-0">{w.name}</span>
                      <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                        {datumLang(w.datum)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-caption1">
                      <SpielerWappen team={w.von} size="xs" />
                      <span className="text-text-secondary truncate">{getTeamDisplay(w.von) || w.von}</span>
                      <Icon name="chevronRight" size={13} strokeWidth={2.4} className="text-text-tertiary flex-shrink-0" />
                      <SpielerWappen team={w.nach} size="xs" />
                      <span className="text-text-primary font-medium truncate">{getTeamDisplay(w.nach) || w.nach}</span>
                      {preis > 0 && (
                        <span className="ml-auto text-caption2 num-tabular text-text-secondary flex-shrink-0">
                          {euro(preis)}
                        </span>
                      )}
                    </div>
                    {w.notiz && (
                      <p className="text-caption2 text-text-tertiary mt-1 truncate">{w.notiz}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {stichtag && (
        <p className="text-caption2 text-text-tertiary px-1">
          Wechsel werden seit dem {datumLang(stichtag)} festgehalten. Was davor
          passiert ist, wurde nie erfasst und lässt sich nicht nachtragen.
          {' '}Insgesamt {dez((wechsel || []).length, 0)} Einträge, davon{' '}
          {(wechsel || []).length - (wechsel || []).filter((w) => w.von != null).length} Startzeilen.
        </p>
      )}
    </div>
  );
}

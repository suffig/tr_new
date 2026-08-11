import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import LoadingSpinner from '../../LoadingSpinner';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { getTeamDisplay } from '../../../constants/teams';
import { ladeLokal, standFuer, logischesDatum } from '../../../utils/abende';
import { loadPulls } from '../../../utils/teamCollection';

// Der Abend als Einheit.
//
// Spiele, Ziehungen, Sterne und Getraenke lagen in vier getrennten Ansichten;
// die Frage "wie lief der letzte Abend?" liess sich nur durch Herumspringen
// beantworten. Hier steht jeder Abend als eine Karte.
//
// Alles ist abgeleitet — es gibt keine eigene Speicherung. Die Zuordnung zum
// Abend macht logischesDatum() mit dem Tageswechsel um 06:00, damit ein Spiel
// um 00:30 noch zum Vorabend zaehlt.

const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function datumLabel(iso) {
  const heute = logischesDatum();
  if (iso === heute) return 'Heute';
  const gestern = new Date(heute); gestern.setDate(gestern.getDate() - 1);
  const p = (n) => String(n).padStart(2, '0');
  const gesternIso = `${gestern.getFullYear()}-${p(gestern.getMonth() + 1)}-${p(gestern.getDate())}`;
  if (iso === gesternIso) return 'Gestern';
  const d = new Date(iso + 'T12:00:00');
  return `${WOCHENTAG[d.getDay()]}, ${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
}

const fmt = (n) => (n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ','));

/** Eine Kennzahl in der Kachelreihe. */
function Wert({ icon, farbe, zahl, label }) {
  return (
    <div className="bg-bg-tertiary rounded-xl p-2.5 text-center min-w-0">
      <div className={`flex justify-center mb-1 ${farbe}`}>
        <Icon name={icon} size={15} strokeWidth={2.2} />
      </div>
      <div className="stat-display text-[15px] text-text-primary truncate">{zahl}</div>
      <div className="text-caption2 text-text-tertiary truncate">{label}</div>
    </div>
  );
}

export default function AbendRueckblick() {
  const { data: matches, loading } = useSupabaseQuery('matches', '*');

  const abende = useMemo(() => {
    const ereignisse = ladeLokal();
    const pulls = loadPulls();

    // Alle Tage einsammeln, an denen irgendetwas passiert ist.
    const tage = new Set();
    ereignisse.forEach((e) => e.datum && tage.add(e.datum));
    (matches || []).forEach((m) => m.date && tage.add(String(m.date).slice(0, 10)));
    pulls.forEach((p) => tage.add(logischesDatum(new Date(p.ts))));

    return [...tage].sort((a, b) => (a < b ? 1 : -1)).map((datum) => {
      const spiele = (matches || []).filter((m) => String(m.date).slice(0, 10) === datum);
      const ziehungen = pulls.filter((p) => logischesDatum(new Date(p.ts)) === datum);
      const stand = standFuer(ereignisse, datum);

      let aek = 0, real = 0, toreA = 0, toreB = 0;
      for (const m of spiele) {
        const a = m.goalsa || 0, b = m.goalsb || 0;
        toreA += a; toreB += b;
        if (a > b) aek++; else if (b > a) real++;
      }

      return {
        datum, spiele, ziehungen, stand,
        bilanz: { aek, real, unentschieden: spiele.length - aek - real, toreA, toreB },
        getraenke: stand.bier.gesamt + stand.shot20.gesamt + stand.shot40.gesamt + stand.schnaps.gesamt,
      };
    }).filter((a) => a.spiele.length || a.ziehungen.length || a.stand.anzahl);
  }, [matches]);

  if (loading) return <LoadingSpinner message="Lade Abende…" />;

  if (abende.length === 0) {
    return (
      <div className="modern-card text-center py-10">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center">
          <Icon name="calendar" size={28} strokeWidth={1.6} />
        </div>
        <h4 className="karten-titel mb-1">Noch kein Abend erfasst</h4>
        <p className="text-sm text-text-muted">
          Sobald ihr Spiele eintragt, Teams zieht oder etwas trinkt, erscheint der Abend hier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {abende.map((a) => {
        const fuehrend = a.bilanz.aek === a.bilanz.real ? null : (a.bilanz.aek > a.bilanz.real ? 'AEK' : 'Real');
        return (
          <div key={a.datum} className="modern-card">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <h3 className="karten-titel truncate">{datumLabel(a.datum)}</h3>
              {/* Ohne Spiele stand hier "0 Spiele" — eine Null, die nichts sagt.
                  "kein Spiel" statt einer Vermutung, was sonst passiert ist:
                  was es war, steht in den Kacheln darunter. */}
              <span className="text-caption2 text-text-tertiary num-tabular flex-shrink-0">
                {a.spiele.length > 0
                  ? `${a.spiele.length} ${a.spiele.length === 1 ? 'Spiel' : 'Spiele'}`
                  : 'kein Spiel'}
              </span>
            </div>

            {/* Wie die Spiele ausgingen */}
            {a.spiele.length > 0 && (
              <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-bg-tertiary">
                <TeamLogo team="aek" size="xs" />
                <span className="stat-display text-lg text-system-blue num-tabular">{a.bilanz.aek}</span>
                <span className="text-text-tertiary text-sm">:</span>
                <span className="stat-display text-lg text-system-red num-tabular">{a.bilanz.real}</span>
                <TeamLogo team="real" size="xs" />
                <span className="ml-auto text-caption2 text-text-tertiary num-tabular text-right flex-shrink-0 whitespace-nowrap">
                  {a.bilanz.toreA}:{a.bilanz.toreB} Tore
                  {fuehrend && (
                    <span className={`block font-semibold ${fuehrend === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                      {getTeamDisplay(fuehrend)} vorn
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Der Rest des Abends */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <Wert icon="trophy" farbe="text-system-orange" zahl={a.ziehungen.length} label="Ziehungen" />
              <Wert icon="starFilled" farbe="text-system-yellow"
                zahl={a.stand.sterne.gesamt > 0 ? `+${fmt(a.stand.sterne.gesamt)}` : '—'} label="Sterne" />
              <Wert icon="beer" farbe="text-system-orange" zahl={a.stand.bier.gesamt || '—'} label="Bier" />
              <Wert icon="glass" farbe="text-system-purple"
                zahl={(a.stand.shot20.gesamt + a.stand.shot40.gesamt + a.stand.schnaps.gesamt) || '—'} label="Kurze" />
            </div>

            {/* Wer wie viel — nur, wenn es etwas zu unterscheiden gibt */}
            {(a.stand.sterne.gesamt > 0 || a.getraenke > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border-light">
                {a.stand.sterne.alexander > 0 && (
                  <span className="chip chip-sm chip-blue">Alexander +{fmt(a.stand.sterne.alexander)} Sterne</span>
                )}
                {a.stand.sterne.philip > 0 && (
                  <span className="chip chip-sm chip-red">Philip +{fmt(a.stand.sterne.philip)} Sterne</span>
                )}
                {a.stand.bier.alexander > 0 && (
                  <span className="chip chip-sm chip-gray">Alexander {a.stand.bier.alexander} Bier</span>
                )}
                {a.stand.bier.philip > 0 && (
                  <span className="chip chip-sm chip-gray">Philip {a.stand.bier.philip} Bier</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-caption2 text-text-tertiary text-center px-4">
        Ein Abend läuft bis 6 Uhr morgens — was danach passiert, zählt zum nächsten.
      </p>
    </div>
  );
}

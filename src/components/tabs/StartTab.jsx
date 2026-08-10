import { useMemo } from 'react';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import LoadingSpinner from '../LoadingSpinner';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { offeneRechnung } from './finanzen/OffeneRechnung';
import { ladeLokal, bierStand, schnapsStand, logischesDatum } from '../../utils/abende';
import { dez } from '../../utils/zahlen';

/**
 * Gerade jetzt.
 *
 * Die App fiel beim Öffnen in eine Spieleliste — nützlich, wenn man ein Spiel
 * sucht, aber nicht die Frage, die man beim Aufmachen im Kopf hat: Wer führt
 * gerade? Was war zuletzt? Schuldet mir jemand was? Läuft heute ein Abend?
 *
 * Diese Seite beantwortet genau das und sonst nichts. Jede Zeile ist ein Weg
 * dorthin, wo es weitergeht — sie ersetzt keine der Ansichten, sie zeigt nur,
 * welche gerade interessant ist.
 */

const euroGanz = (n) => `${Math.round(Number(n) || 0).toLocaleString('de-DE')} €`;

/** Wie lange ist das her? */
function seit(datum) {
  if (!datum) return null;
  const tage = Math.floor((Date.now() - new Date(datum).getTime()) / 86400000);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 7) return `vor ${tage} Tagen`;
  if (tage < 14) return 'vor einer Woche';
  if (tage < 60) return `vor ${Math.round(tage / 7)} Wochen`;
  return `vor ${Math.round(tage / 30)} Monaten`;
}

/**
 * Eine Zeile, die irgendwohin führt.
 *
 * Bewusst kein `modern-card` je Zeile: sechs Karten untereinander sind wieder
 * die Kachelwand, aus der diese Seite herausführen soll. Eine Karte, darin
 * Zeilen.
 */
function Zeile({ icon, farbe, titel, wert, hinweis, onClick }) {
  return (
    <button onClick={onClick}
            className="w-full flex items-center gap-3 py-3 text-left transition-colors active:bg-bg-tertiary/50">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${farbe}`}>
        <Icon name={icon} size={18} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption2 text-text-tertiary">{titel}</span>
        <span className="block text-callout font-semibold text-text-primary truncate">{wert}</span>
        {hinweis && <span className="block text-caption2 text-text-tertiary truncate">{hinweis}</span>}
      </span>
      <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-text-tertiary flex-shrink-0" />
    </button>
  );
}

export default function StartTab({ onNavigate }) {
  const { data: matches, loading: mLoading } = useSupabaseQuery('matches', '*');
  const { data: finances, loading: fLoading } = useSupabaseQuery('finances', '*');
  // Hier stehen die Personen, nicht die Vereine: "Alexander führt mit 1 Sieg"
  // ist die Frage, mit der man die App aufmacht — "AEK Athen führt" nicht.
  const { data: managers } = useSupabaseQuery('manager', '*');
  const name = (team) => (team === 'AEK'
    ? managers?.find((m) => m.id === 1)?.name || 'Alexander'
    : managers?.find((m) => m.id === 2)?.name || 'Philip');

  const bilanz = useMemo(() => {
    const liste = matches || [];
    let aek = 0, real = 0, remis = 0;
    for (const m of liste) {
      const a = m.goalsa || 0, b = m.goalsb || 0;
      if (a > b) aek++; else if (b > a) real++; else remis++;
    }
    // Neuestes Spiel zuerst — die Liste kommt nicht garantiert sortiert.
    const sortiert = [...liste].sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
    return { aek, real, remis, gesamt: liste.length, letztes: sortiert[0] || null };
  }, [matches]);

  // Läuft gerade ein Abend? Die Ereignisse liegen lokal; "heute" endet erst
  // morgens um sechs, sonst wäre ein Abend um halb zwei schon Geschichte.
  const abend = useMemo(() => {
    try {
      const ereignisse = ladeLokal();
      const heute = logischesDatum();
      const vonHeute = ereignisse.filter((e) => e.datum === heute);
      if (!vonHeute.length) return null;
      const bier = bierStand(vonHeute);
      const schnaps = schnapsStand(vonHeute);
      return {
        glaeser: (bier.alexander || 0) + (bier.philip || 0),
        schnaps: (schnaps.alex || 0) + (schnaps.philip || 0),
        anzahl: vonHeute.length,
      };
    } catch { return null; }
  }, []);

  if (mLoading || fLoading) return <LoadingSpinner message="Lade Übersicht…" />;

  const aekFin = (finances || []).find((f) => f.team === 'AEK') || {};
  const realFin = (finances || []).find((f) => f.team === 'Real') || {};
  const rechnung = offeneRechnung(aekFin.debt, realFin.debt);

  const { aek, real, gesamt, letztes } = bilanz;
  const anteilAek = gesamt > 0 ? (aek / (aek + real || 1)) * 100 : 50;
  const fuehrt = aek > real ? 'AEK' : real > aek ? 'Real' : null;

  const letztesErgebnis = letztes
    ? `${letztes.goalsa ?? 0} : ${letztes.goalsb ?? 0}`
    : null;
  const letzterSieger = letztes
    ? ((letztes.goalsa || 0) > (letztes.goalsb || 0) ? 'AEK'
      : (letztes.goalsb || 0) > (letztes.goalsa || 0) ? 'Real' : null)
    : null;

  return (
    <div className="p-4 pb-24 mobile-safe-bottom space-y-4">
      {/* Der Stand als geteilte Fläche — dieselbe Sprache wie im Duell,
          nur größer: hier ist es die eine Aussage der Seite. */}
      <div className="modern-card p-5">
        {gesamt === 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-system-orange/12 text-system-orange flex items-center justify-center">
              <Icon name="football" size={26} strokeWidth={1.8} />
            </div>
            <p className="text-text-primary font-semibold">Noch kein Spiel erfasst</p>
            <p className="text-footnote text-text-tertiary mt-1">
              Sobald ihr spielt, steht hier, wer vorn liegt.
            </p>
          </div>
        ) : (
          <>
            <div className="text-caption2 text-text-tertiary text-center mb-3">
              {gesamt} {gesamt === 1 ? 'Spiel' : 'Spiele'} in dieser Saison
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <TeamLogo team="aek" size="xs" />
                  <span className="text-caption2 text-text-tertiary truncate">{name('AEK')}</span>
                </div>
                <div className={`text-[44px] leading-none font-black tracking-tight num-tabular ${
                  fuehrt === 'AEK' ? 'text-system-blue' : 'text-text-tertiary'}`}>{aek}</div>
              </div>
              <div className="text-center pb-1.5 flex-shrink-0">
                <div className="text-caption2 text-text-tertiary">Siege</div>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="text-caption2 text-text-tertiary truncate">{name('Real')}</span>
                  <TeamLogo team="real" size="xs" />
                </div>
                <div className={`text-[44px] leading-none font-black tracking-tight num-tabular ${
                  fuehrt === 'Real' ? 'text-system-red' : 'text-text-tertiary'}`}>{real}</div>
              </div>
            </div>

            <div className="relative mt-3 h-2.5 rounded-full overflow-hidden bg-bg-tertiary flex">
              <div className="bg-system-blue h-full transition-all duration-500" style={{ width: `${anteilAek}%` }} />
              <div className="bg-system-red h-full transition-all duration-500" style={{ width: `${100 - anteilAek}%` }} />
              <div className="absolute inset-y-0 left-1/2 w-px bg-bg-secondary/70" />
            </div>

            <p className="mt-3 text-center text-footnote text-text-secondary">
              {fuehrt
                ? <>
                    <span className={fuehrt === 'AEK' ? 'text-system-blue font-semibold' : 'text-system-red font-semibold'}>
                      {name(fuehrt)}
                    </span>
                    {' führt mit '}
                    <span className="num-tabular font-semibold">{Math.abs(aek - real)}</span>
                    {Math.abs(aek - real) === 1 ? ' Sieg' : ' Siegen'}
                  </>
                : 'Gleichstand — es steht auf Messers Schneide.'}
            </p>
          </>
        )}
      </div>

      {/* Was gerade ansteht. Jede Zeile führt dorthin, wo es weitergeht. */}
      <div className="modern-card divide-y divide-border-light">
        {letztes && (
          <Zeile
            icon="football" farbe="bg-system-green/12 text-system-green"
            titel="Zuletzt gespielt"
            wert={`${letztesErgebnis}${letzterSieger ? ` · ${name(letzterSieger)}` : ' · Remis'}`}
            hinweis={seit(letztes.date)}
            onClick={() => onNavigate?.('spielbetrieb')}
          />
        )}

        <Zeile
          icon={rechnung.betrag === 0 ? 'check' : 'swap'}
          farbe={rechnung.betrag === 0
            ? 'bg-system-green/12 text-system-green'
            : 'bg-system-orange/12 text-system-orange'}
          titel="Echtgeld"
          wert={rechnung.betrag === 0
            ? 'Ihr seid quitt'
            : `${name(rechnung.schuldner)} schuldet ${euroGanz(rechnung.betrag)}`}
          hinweis={rechnung.betrag === 0 ? null : `an ${name(rechnung.glaeubiger)}`}
          onClick={() => onNavigate?.('finanzen')}
        />

        {abend ? (
          <Zeile
            icon="beer" farbe="bg-system-yellow/12 text-system-yellow"
            titel="Heute Abend"
            wert={[
              abend.glaeser > 0 ? `${abend.glaeser} ${abend.glaeser === 1 ? 'Bier' : 'Biere'}` : null,
              abend.schnaps > 0 ? `${abend.schnaps} Schnaps` : null,
            ].filter(Boolean).join(' · ') || `${abend.anzahl} Einträge`}
            hinweis="läuft"
            onClick={() => onNavigate?.('abend')}
          />
        ) : (
          <Zeile
            icon="beer" farbe="bg-bg-tertiary text-text-tertiary"
            titel="Heute Abend"
            wert="Noch nichts eingetragen"
            onClick={() => onNavigate?.('abend')}
          />
        )}

        <Zeile
          icon="chart" farbe="bg-system-blue/12 text-system-blue"
          titel="Kontostand"
          wert={`${dez(aekFin.balance || 0, 0)} € : ${dez(realFin.balance || 0, 0)} €`}
          hinweis={`${name('AEK')} zu ${name('Real')}`}
          onClick={() => onNavigate?.('finanzen')}
        />
      </div>
    </div>
  );
}

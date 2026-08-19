import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import LoadingSpinner from '../../LoadingSpinner';
import { vereinsBilanz } from '../../../utils/vereinsBilanz';
import { getTeamDisplay } from '../../../constants/teams';

/**
 * Bilanz je Verein — über alle Saisons.
 *
 * MEINE ERSTE ANNAHME WAR FALSCH
 * Ich hatte das als „Gegner-Bilanz" gebaut, in dem Glauben, die Vereine
 * würden je Spiel gezogen. Sie gelten aber je SAISON: in FC25 hießen die
 * Seiten AEK und Real, in FC26 Dynamo Dresden und Schalke 04. Innerhalb
 * einer Saison gehört ein Verein deshalb immer derselben Person — die
 * Aufteilung zeigt darum keine Ziehung, sondern wer den Verein wann hatte.
 *
 * WAS DIE ANSICHT WIRKLICH BEANTWORTET
 * Wie lief es unter welchem Vereinsnamen? Über mehrere Saisons wird daraus
 * ein Vergleich der Ären — und man sieht, ob eine Saison unter neuem Namen
 * besser lief als die davor.
 */
export default function VereinsBilanz({ matches, loading }) {
  // getTeamDisplay loest die SEITE zum Verein DER SAISON auf — siehe
  // Kopfkommentar in utils/vereinsBilanz.js.
  const liste = useMemo(
    () => vereinsBilanz(matches || [], (seite, version) => getTeamDisplay(seite, version)),
    [matches]);

  if (loading) return <LoadingSpinner message="Lade Vereine…" />;

  if (liste.length === 0) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="briefcase" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Spiele mit Vereinsnamen erfasst.</p>
      </div>
    );
  }

  const genug = liste.filter((e) => e.aussagekraeftig);
  const bester = genug.length
    ? genug.reduce((a, b) => (b.quote > a.quote ? b : a))
    : null;

  return (
    <div className="space-y-3">
      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="karten-titel">Bilanz je Verein</span>
          <span className="text-caption2 text-text-tertiary">{liste.length} Vereine</span>
        </div>
        <p className="text-caption2 text-text-tertiary mt-0.5">
          {bester
            ? `Beste Bilanz ab 3 Spielen: ${bester.verein} mit `
              + `${Math.round(bester.quote * 100)} % Siegen aus ${bester.spiele} Spielen.`
            : 'Noch kein Verein hat drei Spiele — bis dahin wäre jede Quote Zufall.'}
        </p>
      </div>

      <div className="modern-card p-3">
        <div className="divide-y divide-border-light">
          {liste.map((e) => (
            <div key={e.verein} className="py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-caption1 text-text-primary truncate flex-1 min-w-0">
                  {e.verein}
                </span>
                <span className="num-tabular text-caption2 text-text-secondary flex-shrink-0">
                  {e.siege}–{e.remis}–{e.niederlagen}
                </span>
                {/* Die Quote nur, wo sie etwas heißt. Bei einem Spiel wäre
                    "100 %" kein Ergebnis, sondern ein Zufall. */}
                <span className={`num-tabular text-caption2 w-12 text-right flex-shrink-0 ${
                  e.aussagekraeftig ? 'text-text-primary font-semibold' : 'text-text-tertiary'}`}>
                  {e.aussagekraeftig ? `${Math.round(e.quote * 100)} %` : '—'}
                </span>
              </div>

              {/* Ein Balken, drei Abschnitte: Siege, Remis, Niederlagen. */}
              <div className="h-1.5 rounded-full overflow-hidden flex bg-bg-tertiary mt-1">
                <div className="h-full bg-system-green/70" style={{ width: `${(e.siege / e.spiele) * 100}%` }} />
                <div className="h-full bg-text-tertiary/40" style={{ width: `${(e.remis / e.spiele) * 100}%` }} />
                <div className="h-full bg-system-red/70" style={{ width: `${(e.niederlagen / e.spiele) * 100}%` }} />
              </div>

              <div className="text-caption2 text-text-tertiary mt-0.5">
                {e.spiele} {e.spiele === 1 ? 'Spiel' : 'Spiele'} · {e.tore}:{e.gegentore}
                {e.differenz !== 0 && ` (${e.differenz > 0 ? '+' : ''}${e.differenz})`}
                {' · gespielt von '}
                <span className="text-system-blue">Alexander {e.beiAek}×</span>
                {', '}
                <span className="text-system-red">Philip {e.beiReal}×</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-caption2 text-text-tertiary px-1">
        Jedes Spiel zählt für zwei Vereine — für den auf Alexanders Seite und
        den auf Philips. Ein 3:1 ist für den einen ein Sieg und für den anderen
        eine Niederlage. Ein Verein gehört innerhalb einer Saison immer
        derselben Person; über mehrere Saisons wird daraus ein Vergleich der
        Ären.
      </p>
    </div>
  );
}

import { useMemo } from 'react';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import LoadingSpinner from '../../LoadingSpinner';

/**
 * Alle Sperren an einem Ort.
 *
 * Bisher sah man eine Sperre nur in den Details des einzelnen Spielers. Die
 * Frage vor einem Spiel ist aber "wer fehlt heute" — und die beantwortet
 * man nicht, indem man zwanzig Spielerdetails durchklickt.
 *
 * LAUFEND HEISST matchesserved < totalgames
 * `totalgames` ist die verhängte Länge, `matchesserved` das bereits
 * Abgesessene. Die Differenz ist das, was noch aussteht — und nur die
 * interessiert vor dem nächsten Spiel.
 *
 * ABGESESSENE STEHEN DARUNTER, NICHT DAZWISCHEN
 * Sie sind Geschichte und keine Warnung. Getrennt, damit die laufenden nicht
 * in einer langen Liste untergehen.
 */
export default function SperrenUebersicht({ players, bans, loading }) {
  const { laufend, erledigt } = useMemo(() => {
    const spielerVon = new Map((players || []).map((p) => [p.id, p]));
    const alle = (bans || [])
      .map((b) => {
        const p = spielerVon.get(b.player_id);
        const gesamt = Number(b.totalgames) || 0;
        const abgesessen = Number(b.matchesserved) || 0;
        return {
          ...b,
          spieler: p || null,
          gesamt,
          abgesessen,
          offen: Math.max(0, gesamt - abgesessen),
        };
      })
      // Sperren ohne zugeordneten Spieler weglassen: eine Warnung ohne Namen
      // hilft niemandem, und der Spieler kann aus einer anderen Saison sein.
      .filter((b) => b.spieler);

    return {
      // Die dringendsten zuerst: wer am laengsten noch fehlt.
      laufend: alle.filter((b) => b.offen > 0).sort((a, b) => b.offen - a.offen),
      erledigt: alle.filter((b) => b.offen === 0)
        .sort((a, b) => (b.id || 0) - (a.id || 0)),
    };
  }, [players, bans]);

  if (loading) return <LoadingSpinner message="Lade Sperren…" />;

  const Zeile = ({ b, blass }) => (
    <div className={`flex items-center gap-2.5 py-2.5 ${blass ? 'opacity-60' : ''}`}>
      <SpielerWappen team={b.spieler.team} version={b.spieler.fifa_version} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="text-caption1 text-text-primary truncate">{b.spieler.name}</div>
        <div className="text-caption2 text-text-tertiary truncate">
          {b.type || 'Sperre'}
          {b.spieler.fifa_version ? ` · ${b.spieler.fifa_version}` : ''}
          {b.gesamt > 0 && ` · ${b.abgesessen} von ${b.gesamt} abgesessen`}
        </div>
      </div>
      {b.offen > 0 ? (
        <span className="chip chip-sm chip-red flex-shrink-0">
          noch {b.offen} {b.offen === 1 ? 'Spiel' : 'Spiele'}
        </span>
      ) : (
        <span className="chip chip-sm chip-gray flex-shrink-0">abgesessen</span>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="karten-titel">Laufende Sperren</span>
          <span className="text-caption2 text-text-tertiary">
            {laufend.length === 0 ? 'keine' : `${laufend.length} offen`}
          </span>
        </div>
        {laufend.length === 0 ? (
          <div className="text-center py-6">
            <Icon name="check" size={26} strokeWidth={2} className="text-system-green mx-auto mb-1.5" />
            <p className="text-text-muted">Niemand ist gesperrt.</p>
          </div>
        ) : (
          <>
            <p className="text-caption2 text-text-tertiary mb-1">
              Fehlt beim nächsten Spiel — die längste Sperre zuerst.
            </p>
            <div className="divide-y divide-border-light">
              {laufend.map((b) => <Zeile key={b.id} b={b} />)}
            </div>
          </>
        )}
      </div>

      {erledigt.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-footnote font-semibold text-text-muted">Abgesessen</span>
            <span className="text-caption2 text-text-tertiary">{erledigt.length}</span>
          </div>
          {/* Geschichte, keine Warnung — deshalb getrennt und blasser. */}
          <div className="divide-y divide-border-light max-h-72 overflow-y-auto">
            {erledigt.map((b) => <Zeile key={b.id} b={b} blass />)}
          </div>
        </div>
      )}
    </div>
  );
}

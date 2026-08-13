import { useMemo, useState } from 'react';
import Icon from '../../icons/Icon';
import SpielerWappen from '../../SpielerWappen';
import LoadingSpinner from '../../LoadingSpinner';
import { getTeamDisplay } from '../../../constants/teams';
import { istLegacySaison } from '../../../utils/legacySaison';
import { saisonsMitTiteln, titelDerSaison } from '../../../utils/hallOfFame';

/**
 * Hall of Fame — die Titel einer Saison.
 *
 * WARUM JE SAISON UND NICHT ALL-TIME
 * Über alle Saisons gewinnt immer derselbe: wer neun Jahre dabei ist, hat
 * zwangsläufig die meisten Tore, Sperren und Auszeichnungen. Erst die
 * Saisonsicht macht sichtbar, wer in EINEM Jahr herausragte — und dass das
 * jedes Jahr jemand anderes war.
 *
 * WAS ES JE SAISON GIBT, HÄNGT AN DEN DATEN
 * Die Altsaisons (FC15–FC24) sind als Gesamtzahlen überliefert, ohne
 * Einzelspiele. Titel, die ein einzelnes Spiel brauchen — „meiste Tore in
 * einem Spiel", „bester Schnitt" —, kann es dort nicht geben. Sie fehlen
 * dann, statt als „—" dazustehen: eine leere Auszeichnung ist keine.
 */

export default function HallOfFame({ players, matches, bans, sds, loading }) {
  const saisons = useMemo(() => saisonsMitTiteln(players), [players]);
  const [gewaehlt, setGewaehlt] = useState(null);
  const version = gewaehlt && saisons.includes(gewaehlt) ? gewaehlt : saisons[0];

  const vorsaison = useMemo(() => {
    const i = saisons.indexOf(version);
    return i >= 0 && i + 1 < saisons.length ? saisons[i + 1] : null;
  }, [saisons, version]);

  const ergebnis = useMemo(
    () => (version ? titelDerSaison({ version, players, matches, bans, sds, vorsaison }) : null),
    [version, players, matches, bans, sds, vorsaison]
  );

  // Team je Titelträger, damit das Wappen stimmt. Über die Spielerzeile
  // DIESER Saison — wer später gewechselt ist, trug den Titel trotzdem für
  // die Mannschaft von damals.
  const teamVon = useMemo(() => {
    const m = new Map();
    for (const p of players || []) {
      if (p.fifa_version !== version) continue;
      if (!m.has(p.name)) m.set(p.name, p.team);
    }
    return m;
  }, [players, version]);

  if (loading) return <LoadingSpinner message="Lade Titel…" />;

  if (!saisons.length) {
    return (
      <div className="modern-card p-8 text-center">
        <Icon name="trophy" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
        <p className="text-text-muted">Noch keine Saison mit Spielern erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saisonwahl. Neueste zuerst — danach sucht man am häufigsten. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {saisons.map((v) => (
          <button key={v} type="button" onClick={() => setGewaehlt(v)}
                  aria-pressed={v === version}
                  className={`px-3 py-1.5 rounded-lg text-footnote font-semibold flex-shrink-0 transition-colors ${
                    v === version
                      ? 'bg-bg-elevated text-text-primary ring-2 ring-system-yellow'
                      : 'bg-bg-tertiary text-text-secondary'}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="modern-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="karten-titel">Hall of Fame {version}</span>
          <span className="text-caption2 text-text-tertiary">
            {ergebnis.titel.length} {ergebnis.titel.length === 1 ? 'Titel' : 'Titel'}
          </span>
        </div>
        <p className="text-caption2 text-text-tertiary mt-0.5">
          {ergebnis.spieler} {ergebnis.spieler === 1 ? 'Spieler' : 'Spieler'}
          {ergebnis.spiele > 0
            ? ` · ${ergebnis.spiele} ${ergebnis.spiele === 1 ? 'Spiel' : 'Spiele'} erfasst`
            : ' · keine Einzelspiele überliefert'}
        </p>
      </div>

      {ergebnis.titel.length === 0 ? (
        <div className="modern-card p-8 text-center">
          <Icon name="trophy" size={30} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-text-muted">In {version} gibt es nichts zu vergeben.</p>
          <p className="text-footnote text-text-tertiary mt-1">
            Keine Tore, keine Sperren, keine Auszeichnungen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ergebnis.titel.map((t) => (
            <div key={t.id} className="modern-card p-3.5 flex items-center gap-3">
              <span className={`w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 ${t.farbe}`}>
                <Icon name={t.icon} size={19} strokeWidth={2.1} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-caption2 text-text-tertiary">{t.titel}</div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <SpielerWappen team={teamVon.get(t.name)} version={version} size="xs" />
                  <span className="font-semibold text-text-primary truncate">{t.name}</span>
                </div>
                <div className="text-caption2 text-text-secondary truncate">
                  {t.wert}{t.zusatz ? ` · ${t.zusatz}` : ''}
                </div>
                {/* Gleichstand nicht verschweigen: sonst sieht es aus, als
                    hätte einer den Titel allein geholt. */}
                {t.gleichauf > 1 && (
                  <div className="text-caption2 text-system-yellow">
                    {t.gleichauf} gleichauf — geteilt
                  </div>
                )}
              </div>
              {teamVon.get(t.name) && (
                <span className="text-caption2 text-text-tertiary flex-shrink-0 max-w-[5.5rem] truncate">
                  {getTeamDisplay(teamVon.get(t.name), version)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {istLegacySaison(version) && (
        <p className="text-caption2 text-text-tertiary px-1">
          Aus {version} sind nur Gesamtzahlen überliefert, keine Einzelspiele.
          Titel, die ein einzelnes Spiel brauchen, kann es deshalb nicht geben —
          sie fehlen hier, statt leer dazustehen.
        </p>
      )}
    </div>
  );
}

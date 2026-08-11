import { useMemo, useState } from 'react';
import Kraefteverhaeltnis from '../Kraefteverhaeltnis';
import Icon from '../icons/Icon';
import TeamLogo from '../TeamLogo';
import SpielerWappen from '../SpielerWappen';
import LoadingSpinner from '../LoadingSpinner';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { saisonNummern } from '../../utils/saisonNummern';
import { getTeamDisplay } from '../../constants/teams';
import { dez } from '../../utils/zahlen';
import { alleSaisons, ewigeTabelle, gesamtstand, disziplin, steckbrief } from '../../utils/historie';

const BLICKE = [
  { id: 'ewig', label: 'Ewige Tabelle' },
  { id: 'disziplin', label: 'Disziplin' },
  { id: 'steckbrief', label: 'Saisons' },
];

/** Herkunft einer Zeile — ohne die Angabe wären die Zahlen nicht vergleichbar. */
function Quelle({ quelle }) {
  if (quelle === 'spiele') return null;
  const text = quelle === 'ueberliefert' ? 'überliefert' : 'keine Ergebnisse';
  return (
    <span className="text-caption2 px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary flex-shrink-0">
      {text}
    </span>
  );
}

/**
 * Historie: was über alle Saisons hinweg gilt.
 *
 * Die Zahlen lagen verteilt in der Datenbank — neun Saisons, teils als
 * einzelne Spiele, teils als überlieferte Strichliste. Beantwortet wurde
 * daraus bisher immer nur die Frage nach EINER Saison.
 */
export default function HistorieView() {
  // Ohne Saisonfilter: die ganze Ansicht lebt vom Vergleich über Saisons.
  const alle = { skipFifaFilter: true };
  const { data: matches, loading: l1 } = useSupabaseQuery('matches', '*', alle);
  const { data: players, loading: l2 } = useSupabaseQuery('players', '*', alle);
  const { data: bans } = useSupabaseQuery('bans', '*', alle);
  const { data: sds } = useSupabaseQuery('spieler_des_spiels', '*', alle);

  const [blick, setBlick] = useState('ewig');
  const [offen, setOffen] = useState(null);

  const nummern = useMemo(() => saisonNummern(matches, players, null), [matches, players]);
  const saisons = useMemo(() => alleSaisons({ matches, players }), [matches, players]);
  const zeilen = useMemo(() => ewigeTabelle({ matches, saisons, nummern }), [matches, saisons, nummern]);
  const stand = useMemo(() => gesamtstand(zeilen), [zeilen]);
  const disz = useMemo(() => disziplin({ bans, players }), [bans, players]);

  if (l1 || l2) return <LoadingSpinner message="Lade Historie…" />;

  const maxSiege = Math.max(...zeilen.map((z) => Math.max(z.aekSiege || 0, z.realSiege || 0)), 1);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl">
        {BLICKE.map((b) => (
          <button key={b.id} onClick={() => setBlick(b.id)}
            className={`flex-1 py-1.5 rounded-lg text-footnote font-semibold transition-colors ${
              blick === b.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            {b.label}
          </button>
        ))}
      </div>

      {blick === 'ewig' && (
        <>
          <div className="modern-card p-4">
            <div className="text-footnote font-semibold text-text-muted mb-3">Gesamtstand</div>
            <div className="flex items-end justify-center gap-4 mb-3">
              <div className="text-center">
                <TeamLogo team="aek" size="sm" />
                <div className="stat-display text-[30px] num-tabular text-system-blue leading-none mt-1">
                  {stand.aekSiege}
                </div>
                <div className="text-caption2 text-text-tertiary">Siege</div>
              </div>
              <div className="text-center pb-1">
                <div className="stat-display text-[17px] num-tabular text-text-tertiary">{stand.remis}</div>
                <div className="text-caption2 text-text-tertiary">Remis</div>
              </div>
              <div className="text-center">
                <TeamLogo team="real" size="sm" />
                <div className="stat-display text-[30px] num-tabular text-system-red leading-none mt-1">
                  {stand.realSiege}
                </div>
                <div className="text-caption2 text-text-tertiary">Siege</div>
              </div>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-bg-tertiary">
              {stand.aekSiege + stand.realSiege + stand.remis > 0 && (() => {
                const g = stand.aekSiege + stand.realSiege + stand.remis;
                return (
                  <>
                    <div className="bg-system-blue" style={{ width: `${(stand.aekSiege / g) * 100}%` }} />
                    <div className="bg-text-tertiary/40" style={{ width: `${(stand.remis / g) * 100}%` }} />
                    <div className="bg-system-red" style={{ width: `${(stand.realSiege / g) * 100}%` }} />
                  </>
                );
              })()}
            </div>
            <div className="mt-3 pt-3 border-t border-border-light text-caption1 text-text-secondary">
              {/* Saisons und Siege sind zwei verschiedene Aussagen — wer eine
                  Saison hoch gewinnt und drei knapp verliert, führt bei den
                  Siegen und liegt bei den Saisons hinten. */}
              Gewonnene Saisons:{' '}
              <span className="text-system-blue font-semibold">{stand.aekSaisons}</span>
              {' : '}
              <span className="text-system-red font-semibold">{stand.realSaisons}</span>
              {stand.unentschiedeneSaisons > 0 && ` (${stand.unentschiedeneSaisons} unentschieden)`}
            </div>
            <p className="text-caption2 text-text-tertiary mt-1.5">
              Über {stand.saisonsMitErgebnis} {stand.saisonsMitErgebnis === 1 ? 'Saison' : 'Saisons'} mit Ergebnissen
              {stand.spiele > 0 && `, ${stand.spiele} Spiele`}.
              {stand.saisonsOhne > 0 && ` ${stand.saisonsOhne} weitere ohne überlieferte Bilanz.`}
            </p>
          </div>

          <div className="modern-card p-4">
            <div className="text-footnote font-semibold text-text-muted mb-3">Saison für Saison</div>
            <div className="space-y-2.5">
              {zeilen.map((z) => (
                <div key={z.version}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-caption1 font-semibold text-text-primary">{z.version}</span>
                    {z.nummer && <span className="text-caption2 text-text-tertiary">Saison {z.nummer}</span>}
                    <span className="ml-auto" />
                    <Quelle quelle={z.quelle} />
                  </div>
                  {z.quelle === 'ohne' ? (
                    <div className="text-caption2 text-text-tertiary">
                      Nur Tore, Auszeichnungen und Sperren überliefert.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="num-tabular text-caption1 text-system-blue w-7 text-right flex-shrink-0">
                        {z.aekSiege}
                      </span>
                      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-bg-tertiary">
                        <div className="bg-system-blue" style={{ width: `${(z.aekSiege / maxSiege) * 50}%` }} />
                        <div className="flex-1" />
                        <div className="bg-system-red ml-auto" style={{ width: `${(z.realSiege / maxSiege) * 50}%` }} />
                      </div>
                      <span className="num-tabular text-caption1 text-system-red w-7 flex-shrink-0">
                        {z.realSiege}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {blick === 'disziplin' && (
        <>
          <div className="modern-card p-4">
            <div className="text-footnote font-semibold text-text-muted mb-3">Sperren je Team</div>
            <div className="divide-y divide-border-light">
              <Kraefteverhaeltnis
                label="Sperren"
                aek={disz.teams.AEK.anzahl} real={disz.teams.Real.anzahl}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
              <Kraefteverhaeltnis
                label="Verpasste Spiele" zusatz="dadurch"
                aek={disz.teams.AEK.spiele} real={disz.teams.Real.spiele}
                aekName={getTeamDisplay('AEK')} realName={getTeamDisplay('Real')} />
            </div>
            {disz.arten.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border-light space-y-1.5">
                {disz.arten.map(([art, n]) => (
                  <div key={art} className="flex items-baseline gap-2 text-caption1">
                    <span className="text-text-secondary truncate">{art}</span>
                    <span className="ml-auto num-tabular text-text-primary flex-shrink-0">{n}</span>
                  </div>
                ))}
                <p className="text-caption2 text-text-tertiary pt-1">
                  Rot und Verletzung sind zwei sehr verschiedene Aussagen über jemanden —
                  deshalb nicht nur eine Gesamtzahl.
                </p>
              </div>
            )}
          </div>

          {disz.spieler.length > 0 && (
            <div className="modern-card divide-y divide-border-light">
              <div className="px-3 pt-3 pb-2 text-footnote font-semibold text-text-muted">
                Nach verpassten Spielen
              </div>
              {disz.spieler.slice(0, 25).map((s) => (
                <div key={`${s.name}-${s.team}`} className="flex items-center gap-2.5 px-3 py-2.5">
                  <SpielerWappen team={s.team} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-text-primary truncate">{s.name}</div>
                    <div className="text-caption2 text-text-tertiary truncate">
                      {Object.entries(s.arten).map(([a, n]) => `${n}× ${a}`).join(' · ')}
                      {s.saisons > 1 && ` · ${s.saisons} Saisons`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="num-tabular text-sm font-bold text-text-primary">{s.spiele}</div>
                    <div className="text-caption2 text-text-tertiary">
                      {s.spiele === 1 ? 'Spiel' : 'Spiele'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {blick === 'steckbrief' && (
        <div className="space-y-2">
          {[...zeilen].reverse().map((z) => {
            const auf = offen === z.version;
            const b = auf ? steckbrief(z.version, { zeile: z, players, bans, sds }) : null;
            return (
              <div key={z.version} className="modern-card overflow-hidden">
                <button type="button" onClick={() => setOffen(auf ? null : z.version)}
                        className="w-full p-3 flex items-center gap-2.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-callout font-semibold text-text-primary">{z.version}</span>
                      {z.nummer && <span className="text-caption2 text-text-tertiary">Saison {z.nummer}</span>}
                    </div>
                    <div className="text-caption2 text-text-tertiary">
                      {z.quelle === 'ohne'
                        ? 'Keine Ergebnisse überliefert'
                        : `${z.aekSiege} : ${z.realSiege} Siege${z.spiele ? ` aus ${z.spiele} Spielen` : ''}`}
                    </div>
                  </div>
                  <Icon name={auf ? 'chevronUp' : 'chevronDown'} size={16} strokeWidth={2.4}
                        className="text-text-tertiary flex-shrink-0" />
                </button>
                {auf && b && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[['Spieler', b.spieler], ['Tore', b.tore], ['Sperren', b.sperren]].map(([label, wert]) => (
                        <div key={label} className="panel-gray rounded-xl p-2.5 text-center">
                          <div className="stat-display text-[17px] num-tabular text-text-primary">{wert}</div>
                          <div className="text-caption2 text-text-tertiary">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 text-caption1">
                      {b.torschuetze?.goals > 0 && (
                        <Zeile label="Torschützenkönig"
                               wert={`${b.torschuetze.name} (${b.torschuetze.goals} Tore)`} />
                      )}
                      {b.bester && (
                        <Zeile label="Meiste Auszeichnungen" wert={`${b.bester.name} (${b.bester.count}×)`} />
                      )}
                      {b.teuerster?.value > 0 && (
                        <Zeile label="Teuerster Spieler"
                               wert={`${b.teuerster.name} (${dez(b.teuerster.value, 1)} Mio €)`} />
                      )}
                      {b.sperrKoenig && (
                        <Zeile label="Meiste Sperren" wert={`${b.sperrKoenig[0]} (${b.sperrKoenig[1]}×)`} />
                      )}
                      {(b.kaderwert.aek > 0 || b.kaderwert.real > 0) && (
                        <Zeile label="Kaderwert"
                               wert={`${dez(b.kaderwert.aek, 1)} : ${dez(b.kaderwert.real, 1)} Mio €`} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Zeile({ label, wert }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-text-secondary flex-shrink-0">{label}</span>
      <span className="ml-auto text-text-primary text-right truncate">{wert}</span>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../../icons/Icon';
import TeamLogo from '../../TeamLogo';
import ZahlFeld from '../../ZahlFeld';
import { zahl } from '../../../utils/zahlen';
import LoadingSpinner from '../../LoadingSpinner';
import { useSupabaseQuery } from '../../../hooks/useSupabase';
import { getCurrentFifaVersion } from '../../../utils/fifaVersionManager';
import { saisonListe } from '../../../utils/saisonNummern';
import { getTeamDisplay } from '../../../constants/teams';
import {
  TEAMS, PERSON, MINDEST_PICKS, ladeOffenenDraft, ladePicks, budgetVorschlag,
  amZug, restBudget, anzahlProTeam, starteDraft, ziehe, nimmZurueck, setzeFertig,
  schliesseAb, brichAb, abschlussBereit,
} from '../../../utils/saisonDraft';

const mio = (n) => `${((Number(n) || 0) / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio €`;

/**
 * Saison-Draft.
 *
 * Bewusst hier unter Kader und nicht im Admin-Bereich: der Draft erzeugt den
 * Kader der neuen Saison, und dort sucht man ihn auch.
 */
export default function SaisonDraft() {
  const version = getCurrentFifaVersion();
  const { data: spieler } = useSupabaseQuery('players', '*', { skipFifaFilter: true });
  const { data: finanzen } = useSupabaseQuery('finances', '*', { skipFifaFilter: true });

  const [session, setSession] = useState(null);
  const [picks, setPicks] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(null);

  const neuLaden = useCallback(async () => {
    setLaden(true); setFehler(null);
    try {
      // Ohne Saison: ein Draft fuer die kommende Saison bleibt sichtbar,
      // auch waehrend man noch die alte ansieht.
      const s = await ladeOffenenDraft();
      setSession(s);
      setPicks(s ? await ladePicks(s.id) : []);
    } catch (e) {
      setFehler(e?.message || 'Der Draft konnte nicht geladen werden.');
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => { neuLaden(); }, [neuLaden]);

  if (laden) return <LoadingSpinner message="Lade Draft…" />;

  if (fehler) {
    return (
      <div className="modern-card p-5 text-center">
        <Icon name="warning" size={24} strokeWidth={2} className="text-system-orange mx-auto mb-2" />
        <p className="text-text-secondary text-sm mb-1">{fehler}</p>
        <p className="text-caption2 text-text-tertiary mb-4">
          Falls die Tabellen noch fehlen: <code>db/18_draft.sql</code> ausführen.
        </p>
        <button onClick={neuLaden} className="btn-primary">Erneut versuchen</button>
      </div>
    );
  }

  return session
    ? <DraftLaeuft session={session} picks={picks} onAendern={neuLaden} />
    : <DraftStart version={version} spieler={spieler} finanzen={finanzen} onGestartet={neuLaden} />;
}

/** Vor dem Draft: Budgets festlegen und wer beginnt. */
function DraftStart({ version, spieler, finanzen, onGestartet }) {
  const saisons = useMemo(() => saisonListe([], spieler, version), [spieler, version]);
  // Zielsaison: die, fuer die gedraftet wird. Meist die naechste, deshalb auch
  // frei eintippbar — FC27 gibt es noch nicht, wenn man dafuer draftet.
  const [zielsaison, setZielsaison] = useState(version);
  const vorherige = saisons.filter((s) => s.version !== zielsaison);
  const [vorsaison, setVorsaison] = useState(() => vorherige[vorherige.length - 1]?.version || '');
  const [budgets, setBudgets] = useState({ AEK: '', Real: '' });
  const [beginner, setBeginner] = useState('AEK');
  const [startet, setStartet] = useState(false);

  // Vorschlag neu berechnen, sobald eine andere Vorsaison gewählt wird.
  useEffect(() => {
    if (!vorsaison) return;
    setBudgets({
      AEK: String(budgetVorschlag('AEK', vorsaison, finanzen, spieler)),
      Real: String(budgetVorschlag('Real', vorsaison, finanzen, spieler)),
    });
  }, [vorsaison, finanzen, spieler]);

  const start = async () => {
    const a = zahl(budgets.AEK) || 0;
    const r = zahl(budgets.Real) || 0;
    if (!zielsaison.trim()) { toast.error('Für welche Saison wird gedraftet?'); return; }
    if (a <= 0 || r <= 0) { toast.error('Beide brauchen ein Budget über null.'); return; }
    setStartet(true);
    try {
      await starteDraft({ version: zielsaison, budgetAek: a, budgetReal: r, beginner });
      toast.success('Draft gestartet.');
      onGestartet();
    } catch (e) {
      toast.error(e?.message || 'Der Draft konnte nicht gestartet werden.');
      setStartet(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="modern-card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-system-purple/12 text-system-purple flex items-center justify-center">
            <Icon name="users" size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="text-callout font-semibold text-text-primary">Neuer Draft</div>
            <div className="text-caption1 text-text-secondary">
              Mindestens {MINDEST_PICKS} Spieler je Person (11 + 3)
            </div>
          </div>
        </div>

        <label className="block mb-3">
          <span className="text-footnote text-text-secondary">Für welche Saison?</span>
          <input
            value={zielsaison}
            onChange={(e) => setZielsaison(e.target.value.toUpperCase().trim())}
            className="form-input w-full mt-1"
            placeholder="z. B. FC27"
            aria-label="Zielsaison des Drafts"
          />
          <span className="block text-caption2 text-text-tertiary mt-1">
            Die Spieler werden am Ende in dieser Saison angelegt.
          </span>
        </label>

        {vorherige.length > 0 && (
          <label className="block mb-3">
            <span className="text-footnote text-text-secondary">Budget aus welcher Saison?</span>
            <select value={vorsaison} onChange={(e) => setVorsaison(e.target.value)}
                    className="form-input w-full mt-1">
              {vorherige.map((s) => <option key={s.version} value={s.version}>{s.label}</option>)}
            </select>
          </label>
        )}

        <div className="space-y-2.5">
          {TEAMS.map((team) => (
            <div key={team}>
              <div className="flex items-center gap-2 mb-1">
                <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size="xs" />
                <span className={`text-footnote font-semibold ${team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                  {PERSON[team]}
                </span>
                <span className="ml-auto text-caption2 text-text-tertiary num-tabular">
                  {mio(zahl(budgets[team]) || 0)}
                </span>
              </div>
              <ZahlFeld
                ganzzahl
                wert={budgets[team]}
                onChange={(w) => setBudgets((b) => ({ ...b, [team]: w }))}
                className="form-input w-full"
                aria-label={`Budget ${PERSON[team]} in Euro`}
              />
            </div>
          ))}
        </div>
        <p className="text-caption2 text-text-tertiary mt-2">
          Vorschlag = Kontostand der gewählten Saison plus Wert des damaligen
          Kaders. Frei änderbar, falls ihr euch auf etwas anderes einigt.
        </p>
      </div>

      <div className="modern-card p-4">
        <div className="text-footnote font-semibold text-text-muted mb-2">Wer beginnt?</div>
        <div className="flex gap-2">
          {TEAMS.map((team) => (
            <button key={team} onClick={() => setBeginner(team)}
              className={`flex-1 py-2.5 rounded-xl text-footnote font-semibold transition-all ${
                beginner === team
                  ? team === 'AEK' ? 'panel-blue text-system-blue ring-2 ring-system-blue' : 'panel-red text-system-red ring-2 ring-system-red'
                  : 'bg-bg-tertiary text-text-secondary'}`}>
              {PERSON[team]}
            </button>
          ))}
        </div>
      </div>

      <button onClick={start} disabled={startet} className="btn-primary w-full">
        {startet ? 'Startet…' : 'Draft starten'}
      </button>
    </div>
  );
}

/** Während des Drafts. */
function DraftLaeuft({ session, picks, onAendern }) {
  const [name, setName] = useState('');
  const [preis, setPreis] = useState('');
  const [position, setPosition] = useState('');
  const [arbeitet, setArbeitet] = useState(false);
  const { data: alleSpieler } = useSupabaseQuery('players', '*', { skipFifaFilter: true });

  const dran = amZug(session, picks);
  const rest = restBudget(session, picks);
  const zaehler = anzahlProTeam(picks);
  const bereit = abschlussBereit(picks);

  // Vorschläge aus allen bisherigen Saisons — Namen tippt man sonst dreimal
  // anders. Bereits gezogene fallen raus.
  const vorschlaege = useMemo(() => {
    const s = name.trim().toLowerCase();
    if (s.length < 2) return [];
    const schon = new Set(picks.map((p) => p.spieler_name.toLowerCase()));
    const gesehen = new Set();
    const raus = [];
    for (const p of alleSpieler || []) {
      const n = String(p.name || '');
      const k = n.toLowerCase();
      if (!k.includes(s) || schon.has(k) || gesehen.has(k)) continue;
      gesehen.add(k);
      raus.push({ name: n, value: Number(p.value) || 0 });
      if (raus.length >= 6) break;
    }
    return raus;
  }, [name, alleSpieler, picks]);

  const ziehen = async (e) => {
    e?.preventDefault?.();
    if (!dran) return;
    if (!name.trim()) { toast.error('Wen ziehst du?'); return; }
    const betrag = Math.round((zahl(preis) || 0) * 1_000_000);
    setArbeitet(true);
    try {
      await ziehe({ session, picks, team: dran, name, preis: betrag, position });
      setName(''); setPreis(''); setPosition('');
      onAendern();
    } catch (err) {
      toast.error(err?.message || 'Der Zug konnte nicht gespeichert werden.');
    } finally {
      setArbeitet(false);
    }
  };

  const aussteigen = async (team) => {
    if (zaehler[team] < MINDEST_PICKS) {
      toast.error(`${PERSON[team]} braucht erst ${MINDEST_PICKS} Spieler.`);
      return;
    }
    await setzeFertig(session, team, !(team === 'AEK' ? session.fertig_aek : session.fertig_real));
    onAendern();
  };

  const zurueck = async (pick) => {
    if (!window.confirm(`„${pick.spieler_name}" zurücknehmen?`)) return;
    await nimmZurueck(pick.id);
    onAendern();
  };

  const abschliessen = async () => {
    if (!window.confirm(
      `${picks.length} Spieler werden für ${session.fifa_version} angelegt und das Restgeld als Kontostand gesetzt. Fortfahren?`)) return;
    setArbeitet(true);
    try {
      const n = await schliesseAb(session, picks);
      toast.success(`${n} Spieler übernommen.`);
      onAendern();
    } catch (err) {
      toast.error(err?.message || 'Abschluss fehlgeschlagen.');
    } finally {
      setArbeitet(false);
    }
  };

  const abbrechen = async () => {
    if (!window.confirm('Draft abbrechen? Die gezogenen Spieler gehen verloren.')) return;
    await brichAb(session);
    toast.success('Draft abgebrochen.');
    onAendern();
  };

  return (
    <div className="space-y-4">
      {/* Budget immer sichtbar */}
      <div className="modern-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-footnote font-semibold text-text-muted">Budget</span>
          <span className="text-caption2 font-semibold px-2 py-0.5 rounded-full bg-system-purple/12 text-system-purple">
            Draft für {session.fifa_version}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TEAMS.map((team) => {
            const fertig = team === 'AEK' ? session.fertig_aek : session.fertig_real;
            const anteil = session[`budget_${team === 'AEK' ? 'aek' : 'real'}`] || 1;
            return (
              <div key={team} className={`rounded-xl p-3 ${dran === team ? (team === 'AEK' ? 'panel-blue' : 'panel-red') : 'panel-gray'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size="xs" />
                  <span className={`text-caption1 font-semibold truncate ${team === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
                    {PERSON[team]}
                  </span>
                  {fertig && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary">fertig</span>}
                </div>
                <div className="stat-display text-lg num-tabular text-text-primary">{mio(rest[team])}</div>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1.5">
                  <div className={`h-full ${team === 'AEK' ? 'bg-system-blue' : 'bg-system-red'}`}
                       style={{ width: `${Math.max(0, Math.min(100, (rest[team] / anteil) * 100))}%` }} />
                </div>
                <div className="text-caption2 text-text-tertiary mt-1 num-tabular">
                  {zaehler[team]} Spieler · {mio(rest.ausgegeben[team])} aus
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zug */}
      {dran ? (
        <form onSubmit={ziehen} className="modern-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="zap" size={16} strokeWidth={2.4}
                  className={dran === 'AEK' ? 'text-system-blue' : 'text-system-red'} />
            <span className="text-footnote font-semibold text-text-primary">
              {PERSON[dran]} ist am Zug
            </span>
            <span className="ml-auto text-caption2 text-text-tertiary">
              Pick {picks.length + 1}
            </span>
          </div>
          {/* Das Team ergibt sich daraus, wer zieht — der Spieler landet
              genau dort, und in der Datenbank steht es auch so. */}
          <div className="flex items-center gap-2 panel-gray rounded-xl px-3 py-2">
            <TeamLogo team={dran === 'AEK' ? 'aek' : 'real'} size="xs" />
            <span className="text-caption1 text-text-secondary">Wird eingetragen für</span>
            <span className={`text-caption1 font-semibold ml-auto ${dran === 'AEK' ? 'text-system-blue' : 'text-system-red'}`}>
              {getTeamDisplay(dran, session.fifa_version)}
            </span>
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)}
                 className="form-input w-full" placeholder="Spielername" autoFocus />
          {vorschlaege.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {vorschlaege.map((v) => (
                <button key={v.name} type="button"
                        onClick={() => { setName(v.name); if (v.value) setPreis(String(v.value)); }}
                        className="chip-gray text-caption2">
                  {v.name}{v.value ? ` · ${v.value} Mio` : ''}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-caption2 text-text-tertiary">Marktwert (Mio €)</span>
              <ZahlFeld wert={preis} onChange={setPreis}
                        className="form-input w-full mt-0.5" placeholder="12,5" />
            </label>
            <label className="block">
              <span className="text-caption2 text-text-tertiary">Position</span>
              <input value={position} onChange={(e) => setPosition(e.target.value.toUpperCase())}
                     className="form-input w-full mt-0.5" placeholder="ST" maxLength={4} />
            </label>
          </div>
          <button type="submit" disabled={arbeitet} className="btn-primary w-full">
            {arbeitet ? 'Speichert…' : `Für ${PERSON[dran]} ziehen`}
          </button>
        </form>
      ) : (
        <div className="modern-card p-5 text-center">
          <Icon name="check" size={26} strokeWidth={2.4} className="text-system-green mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Beide sind fertig.</p>
        </div>
      )}

      {/* Aussteigen */}
      <div className="grid grid-cols-2 gap-2">
        {TEAMS.map((team) => {
          const fertig = team === 'AEK' ? session.fertig_aek : session.fertig_real;
          const darf = zaehler[team] >= MINDEST_PICKS;
          return (
            <button key={team} onClick={() => aussteigen(team)} disabled={!darf && !fertig}
              className={`py-2.5 rounded-xl text-caption1 font-semibold transition-all ${
                fertig ? 'bg-system-green/12 text-system-green'
                : darf ? 'bg-bg-tertiary text-text-secondary'
                : 'bg-bg-tertiary text-text-tertiary opacity-50'}`}>
              {fertig ? `${PERSON[team]} steigt wieder ein` : `${PERSON[team]} aussteigen`}
              {!darf && !fertig && (
                <span className="block text-[10px] font-normal">
                  noch {MINDEST_PICKS - zaehler[team]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Gezogene Spieler */}
      {picks.length > 0 && (
        <div className="modern-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-footnote font-semibold text-text-muted">Gezogen</span>
            <span className="text-caption2 text-text-tertiary num-tabular">{picks.length}</span>
          </div>
          <div className="divide-y divide-border-light">
            {[...picks].reverse().map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 py-2">
                <span className="w-6 text-caption2 text-text-tertiary num-tabular flex-shrink-0">{p.nummer}</span>
                <TeamLogo team={p.team === 'AEK' ? 'aek' : 'real'} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary truncate">{p.spieler_name}</div>
                  {p.position && <div className="text-caption2 text-text-tertiary">{p.position}</div>}
                </div>
                <span className="num-tabular text-caption1 text-text-secondary flex-shrink-0">{mio(p.preis)}</span>
                <button onClick={() => zurueck(p)}
                        className="w-7 h-7 rounded-lg bg-system-red/10 text-system-red flex items-center justify-center flex-shrink-0"
                        aria-label="Zurücknehmen">
                  <Icon name="undo" size={14} strokeWidth={2.2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button onClick={abschliessen} disabled={!bereit || arbeitet}
                className={`w-full ${bereit ? 'btn-primary' : 'btn-secondary opacity-60'}`}>
          {bereit
            ? `Draft abschließen — ${picks.length} Spieler übernehmen`
            : `Noch nicht bereit (${MINDEST_PICKS} je Person nötig)`}
        </button>
        <button onClick={abbrechen} className="btn-secondary w-full text-system-red">
          Draft abbrechen
        </button>
      </div>

      <p className="text-caption2 text-text-tertiary">
        Beim Abschluss werden alle gezogenen Spieler in {session.fifa_version}
        {' '}angelegt und das übrige Budget als Kontostand gesetzt. Vorher lässt
        sich jeder Zug zurücknehmen.
      </p>
    </div>
  );
}

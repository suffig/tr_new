import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Icon from '../icons/Icon';
import ZiehungsAuswertung from './teams/ZiehungsAuswertung';
import { getCatalog, setRating } from '../../utils/fc26Catalog';
import { addSterneEintrag, gutschriftFuer, STERNE_PERSON_KEY } from '../../utils/sterneCounter';
import {
  loadPulls, countsInWindow, addPull, removeLatestPull, clearPerson,
  windowStart, TIME_WINDOWS,
  fetchPullsFromDB, replacePulls, pushLocalPullsToDB, onSyncError,
} from '../../utils/teamCollection';

const PEOPLE = [
  { id: 'alexander', name: 'Alexander', accent: 'blue' },
  { id: 'philip', name: 'Philip', accent: 'red' },
];

const ACCENT = {
  blue: { text: 'text-system-blue', chip: 'bg-system-blue/12 text-system-blue', pill: 'bg-system-blue text-white', bar: 'bg-system-blue' },
  red: { text: 'text-system-red', chip: 'bg-system-red/12 text-system-red', pill: 'bg-system-red text-white', bar: 'bg-system-red' },
};

const DUELL_ENTWURF_KEY = 'fusta_duell_entwurf_v1';
function ladeDuellEntwurf() {
  try {
    const d = JSON.parse(localStorage.getItem(DUELL_ENTWURF_KEY) || 'null');
    return d && d.teams ? d : null;
  } catch { return null; }
}

const RATING_TIERS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
const fmtRating = (r) => (r == null ? '—' : r.toFixed(1).replace('.', ','));

// Achievement state for a person (all-time) — drives the unlock toast.
// Mirrors the 12 achievements shown in the stats detail sheet.
const MILESTONE_LABELS = {
  first: 'Erstes Team', five: 'Erstes 5★-Team', collector10: 'Sammler (10 Teams)',
  collector50: 'Großsammler (50 Teams)', tophunter: 'Top-Jäger (10 × ≥4,5★)',
  national: 'Nationalstolz (5 Nationalteams)', women3: 'Frauenfußball (3 Teams)',
  repeat5: 'Stammverein (1 Team 5×)', underdog: 'Underdog (0,5★-Team)',
  allTiers: 'Alle Stern-Stufen', veteran: 'Veteran (100× bekommen)', complete5: '5★-Komplett',
};
function computeMilestones(pulls, catalog, pid) {
  const teamOf = new Map(catalog.map((t) => [t.name, t]));
  const total5 = catalog.filter((t) => t.rating === 5).length;
  const counts = new Map();
  // Rueckfall auf die in der Ziehung gespeicherte Wertung — siehe ratingVon().
  const ausZiehung = new Map();
  let total = 0;
  for (const e of pulls) {
    if (e.person !== pid) continue;
    total += 1;
    counts.set(e.team, (counts.get(e.team) || 0) + 1);
    if (Number.isFinite(Number(e.rating))) ausZiehung.set(e.team, Number(e.rating));
  }
  let five = 0, top = 0, nat = 0, women = 0, maxCount = 0;
  const tiers = new Set();
  for (const [name, c] of counts) {
    if (c > maxCount) maxCount = c;
    const t = teamOf.get(name);
    const r = t ? (t.rating ?? null) : (ausZiehung.get(name) ?? null);
    if (r === 5) five += 1;
    if (r != null && r >= 4.5) top += 1;
    // Nur ein Katalogteam ohne Wertung ist eine Nationalmannschaft.
    if (t && t.rating == null) nat += 1;
    if (t?.women) women += 1;
    if (r != null) tiers.add(r);
  }
  return {
    first: total >= 1, five: five >= 1, collector10: counts.size >= 10, collector50: counts.size >= 50,
    tophunter: top >= 10, national: nat >= 5, women3: women >= 3, repeat5: maxCount >= 5,
    underdog: tiers.has(0.5), allTiers: tiers.size >= RATING_TIERS.length,
    veteran: total >= 100, complete5: total5 > 0 && five >= total5,
  };
}

function relTime(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const min = Math.floor(d / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const days = Math.floor(h / 24);
  return `vor ${days} T.`;
}

function StarRating({ rating, size = 13 }) {
  if (rating == null) return <span className="text-[10px] text-text-tertiary font-medium">Nat.-Team</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - (i - 1)));
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <span className="absolute inset-0 text-border-medium"><Icon name="star" size={size} strokeWidth={2} /></span>
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden text-system-yellow" style={{ width: `${fill * 100}%` }}>
                  <Icon name="starFilled" size={size} strokeWidth={0} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-semibold text-text-secondary tabular-nums">{fmtRating(rating)}</span>
    </span>
  );
}

// ── Spielduell ───────────────────────────────────────────────────────────────
// Beide bekommen ein Team, es wird gegeneinander gespielt, danach der Sieger
// eingetragen. Die Ziehungen zaehlen wie bisher fuer die Sammlung; zusaetzlich
// bekommt der SIEGER die Handicap-Gutschrift seines Teams (6 − Sterne, dieselbe
// Regel wie im Alkohol-Tab). Wer mit einem schwachen Team gewinnt, holt also
// mehr — mit einem 5-Sterne-Team nur 1,0.
function SpielduellModal({ catalog, entwurf, onClose, onConfirm, onEntwurfSpeichern, onEntwurfSichern, onEntwurfVerwerfen, onRatingChange }) {
  const [teams, setTeams] = useState(() => entwurf?.teams || { alexander: null, philip: null });
  const [sieger, setSieger] = useState(() => entwurf?.sieger || null);
  const [waehlt, setWaehlt] = useState(() => (entwurf?.teams?.alexander ? null : 'alexander'));
  const [suche, setSuche] = useState('');
  const sucheRef = useRef(null);

  // Aktueller Stand in einem Ref — der Aufraeum-Effekt unten sieht sonst nur
  // die Werte vom ersten Rendern (stale closure).
  const standRef = useRef({ teams, sieger });
  useEffect(() => { standRef.current = { teams, sieger }; }, [teams, sieger]);

  // Wird das Modal abgeraeumt (Tabwechsel, App zu), ohne dass eingetragen oder
  // bewusst verworfen wurde, bleibt der angefangene Duell-Stand als Entwurf
  // erhalten — genauso wie beim Spiel-Erfassen im Admin-Bereich.
  const abschliessendRef = useRef(false);
  useEffect(() => {
    return () => {
      if (abschliessendRef.current) return;
      const { teams: t, sieger: s } = standRef.current;
      if (t.alexander || t.philip) onEntwurfSichern({ teams: t, sieger: s });
    };
  }, [onEntwurfSichern]);

  useEffect(() => {
    if (!waehlt) return undefined;
    const t = setTimeout(() => sucheRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [waehlt]);

  const treffer = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return catalog.slice(0, 40);
    return catalog.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 40);
  }, [catalog, suche]);

  const beideGewaehlt = !!(teams.alexander && teams.philip);
  const siegerTeam = sieger ? teams[sieger] : null;
  const ohneRating = !!siegerTeam && siegerTeam.rating == null;
  const gutschrift = siegerTeam && siegerTeam.rating != null ? gutschriftFuer(siegerTeam.rating) : 0;

  const waehle = (team) => {
    const naechstesLeer = waehlt === 'alexander' && !teams.philip;
    setTeams((prev) => ({ ...prev, [waehlt]: team }));
    setSuche('');
    setWaehlt(naechstesLeer ? 'philip' : null);
  };

  // Sterne eines gewählten Teams korrigieren. Geht dauerhaft in den Katalog
  // (und von dort in die Datenbank) — nicht nur in dieses eine Duell. Steht
  // ein Team ohne Rating da, beginnt die Korrektur bei 3,0.
  const sterneAendern = (slot, delta) => {
    const team = teams[slot];
    if (!team) return;
    const basis = team.rating == null ? 3 : team.rating;
    const neu = Math.min(5, Math.max(0.5, Math.round((basis + delta) * 2) / 2));
    if (neu === team.rating) return;
    onRatingChange(team.name, neu);
    // Beide Seiten aktualisieren: dasselbe Team kann in beiden Slots stehen.
    setTeams((prev) => ({
      alexander: prev.alexander?.name === team.name ? { ...prev.alexander, rating: neu } : prev.alexander,
      philip: prev.philip?.name === team.name ? { ...prev.philip, rating: neu } : prev.philip,
    }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-bg-overlay backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-bg-primary w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto safe-area-bottom">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-bg-primary/95 backdrop-blur z-10 border-b border-separator">
          <h2 className="text-lg font-bold text-text-primary">Spielduell</h2>
          <button onClick={onClose} aria-label="Schließen"
            className="btn-compact w-9 h-9 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center">
            <Icon name="x" size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {PEOPLE.map((p) => {
            const t = teams[p.id];
            const a = ACCENT[p.accent];
            const offen = waehlt === p.id;
            return (
              // Kein <button> als Huelle: die Sterne-Regler sind selbst Buttons,
              // und verschachtelte Buttons sind ungueltiges HTML.
              <div key={p.id}
                className={`w-full rounded-xl px-3 py-2.5 border transition-colors ${offen ? 'border-system-blue/30 bg-system-blue/10' : 'border-border-light bg-bg-secondary'}`}>
                <button type="button" className="w-full text-left"
                  onClick={() => { setWaehlt(offen ? null : p.id); setSuche(''); }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.bar}`} />
                    <span className={`text-caption1 font-semibold flex-shrink-0 ${a.text}`}>{p.name}</span>
                    <span className="ml-auto min-w-0 text-right">
                      {t
                        ? <span className="text-sm font-medium text-text-primary truncate block">{t.name}</span>
                        : <span className="text-sm text-text-tertiary">Team wählen …</span>}
                    </span>
                  </div>
                </button>

                {/* Sterne direkt hier korrigieren — landet im Katalog und in der
                    Datenbank, nicht nur in diesem Duell. */}
                {t && (
                  <div className="mt-1.5 flex items-center justify-end gap-1.5">
                    <StarRating rating={t.rating} />
                    <button type="button" aria-label={`${t.name}: Sterne verringern`}
                      disabled={t.rating == null || t.rating <= 0.5}
                      onClick={() => sterneAendern(p.id, -0.5)}
                      className="btn-compact w-7 h-7 rounded-lg bg-bg-tertiary text-text-secondary font-semibold disabled:opacity-40">
                      −
                    </button>
                    <button type="button" aria-label={`${t.name}: Sterne erhöhen`}
                      disabled={t.rating != null && t.rating >= 5}
                      onClick={() => sterneAendern(p.id, +0.5)}
                      className="btn-compact w-7 h-7 rounded-lg bg-bg-tertiary text-text-secondary font-semibold disabled:opacity-40">
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {waehlt && (
            <div className="rounded-xl border border-border-light bg-bg-secondary p-2">
              <input ref={sucheRef} type="text" value={suche} onChange={(e) => setSuche(e.target.value)}
                placeholder="Team suchen …" autoComplete="off" className="form-input !py-2 text-sm mb-2" />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {treffer.map((t) => (
                  <button key={t.name} type="button" onClick={() => waehle(t)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-bg-tertiary text-left">
                    <span className="text-sm text-text-primary truncate min-w-0">{t.name}</span>
                    <span className="flex-shrink-0"><StarRating rating={t.rating} size={11} /></span>
                  </button>
                ))}
                {treffer.length === 0 && (
                  <p className="text-footnote text-text-tertiary text-center py-3">Kein Team gefunden.</p>
                )}
              </div>
            </div>
          )}

          {beideGewaehlt && (
            <div>
              <div className="text-caption1 font-semibold text-text-muted mb-1.5">Wer hat gewonnen?</div>
              <div className="grid grid-cols-2 gap-2">
                {PEOPLE.map((p) => {
                  const a = ACCENT[p.accent];
                  const aktiv = sieger === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setSieger(p.id)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${aktiv ? a.pill : 'bg-bg-tertiary text-text-secondary'}`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {siegerTeam && (
            <div className="rounded-xl bg-system-yellow/10 px-3 py-2.5 text-center">
              {ohneRating ? (
                <p className="text-footnote text-text-secondary">
                  Für <strong className="text-text-primary">{siegerTeam.name}</strong> ist kein Rating
                  hinterlegt — es werden keine Sterne gutgeschrieben. Die Ziehungen zählen trotzdem.
                </p>
              ) : (
                <p className="text-footnote text-text-secondary">
                  <strong className="text-text-primary">{PEOPLE.find((p) => p.id === sieger)?.name}</strong>
                  {' gewinnt mit '}
                  <strong className="text-text-primary">{siegerTeam.name}</strong>
                  {' ('}{fmtRating(siegerTeam.rating)}{'★) → '}
                  <strong className="text-system-orange">
                    +{fmtRating(gutschrift)} ⭐
                  </strong>
                  <span className="text-text-tertiary">{' (6 − '}{fmtRating(siegerTeam.rating)}{')'}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" disabled={!teams.alexander && !teams.philip}
              onClick={() => { abschliessendRef.current = true; onEntwurfSpeichern({ teams, sieger }); }}
              className="btn-secondary flex-1 disabled:opacity-50">
              Entwurf
            </button>
            <button type="button" disabled={!beideGewaehlt || !sieger}
              onClick={() => { abschliessendRef.current = true; onConfirm({ teams, sieger, gutschrift }); }}
              className="btn-primary flex-1 disabled:opacity-50">
              Eintragen
            </button>
          </div>

          {(teams.alexander || teams.philip) && (
            <button type="button"
              onClick={() => {
                if (!window.confirm('Angefangenes Duell verwerfen?')) return;
                abschliessendRef.current = true;
                onEntwurfVerwerfen();
              }}
              className="btn-compact w-full text-center text-footnote text-text-tertiary py-1">
              Verwerfen
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TeamTrackerTab() {
  const [pulls, setPulls] = useState(loadPulls);
  // 'laden' | 'ok' | 'offline' | 'fehler' | 'lokal-mehr'
  const [dbStatus, setDbStatus] = useState('laden');
  const [uebertrage, setUebertrage] = useState(false);

  // Sammlung beim Öffnen aus der Datenbank holen. Der localStorage ist nur noch
  // Offline-Zwischenspeicher — vorher war die DB reines Schreibziel, wodurch ein
  // geleerter Speicher wie Datenverlust aussah.
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const res = await fetchPullsFromDB();
      if (abgebrochen) return;
      if (res.offline) { setDbStatus('offline'); return; }
      if (!res.ok) { setDbStatus('fehler'); return; }

      // Weniger in der DB als lokal? Dann NICHT überschreiben — sonst wären
      // Ziehungen weg, die nie synchronisiert wurden. Stattdessen anbieten,
      // sie zu übertragen.
      const lokal = loadPulls();
      if (res.pulls.length < lokal.length) { setDbStatus('lokal-mehr'); return; }

      setPulls(replacePulls(res.pulls));
      setDbStatus('ok');
    })();
    return () => { abgebrochen = true; };
  }, []);

  // Fehlgeschlagene Schreibvorgänge sichtbar machen statt still zu verschlucken.
  useEffect(() => {
    onSyncError((aktion) => {
      toast.error(`${aktion} wurde nur lokal gespeichert — keine Verbindung zur Datenbank.`, { duration: 5000 });
      setDbStatus('fehler');
    });
    return () => onSyncError(null);
  }, []);

  const lokaleDatenUebertragen = async () => {
    setUebertrage(true);
    const res = await pushLocalPullsToDB(loadPulls());
    setUebertrage(false);
    if (!res.ok) {
      toast.error('Übertragung fehlgeschlagen — es wurde nichts verändert.');
      return;
    }
    toast.success(`${res.uebertragen} Ziehung${res.uebertragen === 1 ? '' : 'en'} in die Datenbank übertragen.`);
    const neu = await fetchPullsFromDB();
    if (neu.ok) { setPulls(replacePulls(neu.pulls)); setDbStatus('ok'); }
  };

  // ── Duell-Entwurf ──────────────────────────────────────────────────────────
  // Ein angefangenes Duell überlebt Tabwechsel und App-Neustart. Bewusst nur
  // EIN Entwurf (anders als bei den Spiel-Entwürfen im Admin-Bereich): es ist
  // immer höchstens ein Duell gleichzeitig offen.
  // Nur schreiben, KEIN React-State: das ruft der Aufräum-Effekt des Modals.
  // React führt Effekte im StrictMode doppelt aus (mount → cleanup → mount) —
  // würde hier setDuellOffen(false) stehen, schlösse sich das Modal sofort
  // nach dem Öffnen wieder, sobald ein Entwurf geladen ist.
  const entwurfNurSchreiben = ({ teams, sieger }) => {
    const daten = { teams, sieger, savedAt: new Date().toISOString() };
    try { localStorage.setItem(DUELL_ENTWURF_KEY, JSON.stringify(daten)); } catch { /* ignore quota */ }
  };

  // Bewusstes Speichern über den Knopf: schreiben, schließen, Rückmeldung.
  const entwurfSpeichern = ({ teams, sieger }) => {
    const daten = { teams, sieger, savedAt: new Date().toISOString() };
    try { localStorage.setItem(DUELL_ENTWURF_KEY, JSON.stringify(daten)); } catch { /* ignore quota */ }
    setDuellEntwurf(daten);
    setDuellOffen(false);
    toast.success('Duell als Entwurf gespeichert');
  };

  const entwurfVerwerfen = () => {
    try { localStorage.removeItem(DUELL_ENTWURF_KEY); } catch { /* ignore */ }
    setDuellEntwurf(null);
    setDuellOffen(false);
  };

  // Spielduell abschließen: beide Ziehungen zählen für die Sammlung, der Sieger
  // bekommt zusätzlich die Handicap-Gutschrift (6 − Sterne) im Sterne-Zähler.
  const duellEintragen = ({ teams, sieger }) => {
    // Bewusst außerhalb eines State-Updaters — addPull schreibt in localStorage
    // und in die Datenbank (siehe Kommentar bei change()).
    let next = addPull(pulls, 'alexander', teams.alexander);
    next = addPull(next, 'philip', teams.philip);
    setPulls(next);

    const siegerName = PEOPLE.find((p) => p.id === sieger)?.name || sieger;
    const siegerTeam = teams[sieger];
    let gutschrift = 0;
    if (siegerTeam?.rating != null) {
      const res = addSterneEintrag({
        person: sieger,
        stars: siegerTeam.rating,
        info: `Spielduell: ${teams.alexander.name} vs. ${teams.philip.name}`,
        // Beide Seiten mitschreiben — der Sterne-Eintrag allein kennt nur das
        // Siegerteam, fuer den Staerkevergleich braucht die Duell-Bilanz auch
        // das Rating des Verlierers.
        duell: {
          sieger: STERNE_PERSON_KEY[sieger] || sieger,
          verlierer: sieger === 'alexander' ? 'philip' : 'alex',
          teams: {
            alex: { name: teams.alexander.name, rating: teams.alexander.rating ?? null },
            philip: { name: teams.philip.name, rating: teams.philip.rating ?? null },
          },
        },
      });
      gutschrift = res.gained;
    }
    try { localStorage.removeItem(DUELL_ENTWURF_KEY); } catch { /* ignore */ }
    setDuellEntwurf(null);
    setDuellOffen(false);
    toast.success(
      gutschrift > 0
        ? `${siegerName} gewinnt — +${fmtRating(gutschrift)} ⭐ im Sterne-Zähler`
        : `${siegerName} gewinnt — Ziehungen erfasst (kein Rating, keine Sterne)`,
      { duration: 4500 }
    );
  };

  const [person, setPerson] = useState(() => { try { return localStorage.getItem('fusta_teams_person') || 'alexander'; } catch { return 'alexander'; } });
  const [windowId, setWindowId] = useState(() => { try { return localStorage.getItem('fusta_teams_window') || 'all'; } catch { return 'all'; } });
  useEffect(() => { try { localStorage.setItem('fusta_teams_person', person); } catch { /* ignore */ } }, [person]);
  useEffect(() => { try { localStorage.setItem('fusta_teams_window', windowId); } catch { /* ignore */ } }, [windowId]);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const [duellOffen, setDuellOffen] = useState(false);
  const [duellEntwurf, setDuellEntwurf] = useState(ladeDuellEntwurf);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all | clubs | national | women
  const [openTier, setOpenTier] = useState(5);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Beim Wechsel zwischen den Personen die Suche leeren und das Feld
  // aktivieren — so kann direkt das naechste Team getippt werden.
  useEffect(() => {
    setSearch('');
    if (person === 'stats') return;
    // Nach dem Rendern fokussieren, sonst greift der Fokus ins Leere.
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [person]);


  const isStats = person === 'stats';
  const current = PEOPLE.find((p) => p.id === person) || PEOPLE[0];
  const accent = ACCENT[current.accent];
  const sinceTs = windowStart(windowId);

  // Aus dem State, damit eine Sterne-Korrektur im Duell sofort ueberall greift.
  const [catalog, setCatalog] = useState(getCatalog);
  const teamRatingAendern = (name, rating) => {
    setRating(name, rating);          // localStorage + Datenbank
    setCatalog(getCatalog());
    toast.success(`${name}: ${fmtRating(rating)}★ gespeichert`);
  };
  const teamByName = useMemo(() => {
    const m = new Map();
    catalog.forEach((t) => m.set(t.name, t));
    return m;
  }, [catalog]);

  // Jede Ziehung haelt die Sternewertung fest, mit der sie erfasst wurde. Wird
  // ein Team im Katalog umbenannt oder geloescht, findet teamByName nichts mehr
  // — ohne diesen Rueckfall verschwinden die betroffenen Ziehungen lautlos aus
  // ⌀ Rating, Verteilung und Bestes/Schwaechstes, obwohl sie unter "Bekommen"
  // weiter mitzaehlen. Der Katalog behaelt Vorrang, damit spaetere Korrekturen
  // einer Wertung wirken.
  const ratingAusZiehung = useMemo(() => {
    const m = new Map();
    for (const e of pulls) {
      if (Number.isFinite(Number(e.rating))) m.set(e.team, Number(e.rating));
    }
    return m;
  }, [pulls]);
  const ratingVon = (name) => {
    const t = teamByName.get(name);
    if (t) return t.rating;
    const r = ratingAusZiehung.get(name);
    return r == null ? null : r;
  };

  const counts = useMemo(() => countsInWindow(pulls, current.id, sinceTs), [pulls, current.id, sinceTs]);

  const change = (teamName, delta) => {
    const team = teamByName.get(teamName);
    if (!team) return;
    if (delta > 0) {
      // Detect newly unlocked milestones and celebrate them
      const before = computeMilestones(pulls, catalog, current.id);
      const after = computeMilestones([...pulls, { person: current.id, team: team.name }], catalog, current.id);
      for (const k of Object.keys(after)) {
        if (after[k] && !before[k]) toast.success(`🏆 ${current.name}: ${MILESTONE_LABELS[k]}`, { duration: 4000 });
      }
    }
    // Bewusst AUSSERHALB des State-Updaters: addPull/removeLatestPull schreiben
    // in localStorage und in die Datenbank. React ruft Updater im StrictMode
    // doppelt auf — als Updater haette jeder Klick zwei DB-Zeilen erzeugt.
    setPulls(delta > 0
      ? addPull(pulls, current.id, team)
      : removeLatestPull(pulls, current.id, teamName, sinceTs));
  };

  // Rich stats for a person within the current window
  const statsFor = (pid) => {
    const c = countsInWindow(pulls, pid, sinceTs);
    let totalPulls = 0, unique = 0, ratingSum = 0, ratingWeight = 0, nationals = 0;
    let best = null, worst = null, mostTeam = null, mostCount = 0;
    const dist = {};
    for (const [name, cnt] of Object.entries(c)) {
      if (!cnt) continue;
      unique += 1; totalPulls += cnt;
      const t = teamByName.get(name);
      const rating = ratingVon(name);
      if (rating != null) {
        ratingSum += rating * cnt; ratingWeight += cnt;
        dist[rating] = (dist[rating] || 0) + cnt;
        if (!best || rating > best.rating) best = { name, rating };
        if (!worst || rating < worst.rating) worst = { name, rating };
      } else if (t) {
        // Im Katalog, aber ohne Wertung → Nationalmannschaft.
        nationals += cnt;
      }
      if (cnt > mostCount) { mostCount = cnt; mostTeam = name; }
    }
    // last pull in window
    let last = null;
    for (const e of pulls) {
      if (e.person !== pid) continue;
      if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
      if (!last || new Date(e.ts) > new Date(last.ts)) last = e;
    }
    return { totalPulls, unique, avgRating: ratingWeight ? ratingSum / ratingWeight : null, ratedTotal: ratingWeight, nationals, best, worst, mostTeam, mostCount, dist, last };
  };

  const curStats = useMemo(() => statsFor(current.id), [pulls, current.id, sinceTs]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filterActive = !!q || ratingFilter !== 'all' || typeFilter !== 'all';
  const matchesFilter = (t) => {
    if (q && !t.name.toLowerCase().includes(q)) return false;
    if (typeFilter === 'clubs' && t.national) return false;
    if (typeFilter === 'national' && !t.national) return false;
    if (typeFilter === 'women' && !t.women) return false;
    if (ratingFilter === 'none') return t.rating == null;
    if (ratingFilter !== 'all' && t.rating !== ratingFilter) return false;
    return true;
  };
  const flatFiltered = useMemo(() => (filterActive ? catalog.filter(matchesFilter) : []), [q, ratingFilter, typeFilter, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamsByTier = useMemo(() => {
    const groups = {}; RATING_TIERS.forEach((r) => { groups[r] = []; }); groups.none = [];
    catalog.forEach((t) => { const key = t.rating == null ? 'none' : t.rating; (groups[key] || (groups[key] = [])).push(t); });
    return groups;
  }, [catalog]);

  const renderTeamRow = (t) => {
    const cnt = counts[t.name] || 0;
    return (
      <div key={t.name} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${cnt > 0 ? accent.chip : 'bg-bg-tertiary'}`}>
        {/* flex-1: ohne das bekam der Namensblock nur seine Mindestbreite und
            "England (Frauen)" wurde auf 67px zusammengeschnitten, obwohl neben
            dem Zaehler ueber 150px frei waren. */}
        <div className="min-w-0 flex-1">
          {/* Der Name bekommt die Zeile allein. Das "National"-Chip stand hier
              daneben und war 71px breit — von den 144px blieben dem Namen 67,
              also wurde "England (Frauen)" mitten im Wort gekappt. Unten neben
              den Sternen ist Platz, und die Zeile bleibt ruhiger. */}
          <div className={`text-sm font-medium truncate ${cnt > 0 ? '' : 'text-text-primary'}`}>{t.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StarRating rating={t.rating} />
            {t.national && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-system-blue/12 text-system-blue">National</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => change(t.name, -1)} disabled={cnt === 0} aria-label={`${t.name} verringern`}
            className="w-8 h-8 rounded-lg bg-bg-secondary border border-border-light text-text-secondary flex items-center justify-center text-lg font-semibold disabled:opacity-40">−</button>
          <span className="w-6 text-center font-bold tabular-nums text-text-primary">{cnt}</span>
          <button onClick={() => change(t.name, 1)} aria-label={`${t.name} bekommen`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-semibold ${accent.pill}`}>+</button>
        </div>
      </div>
    );
  };

  const WindowFilter = () => (
    <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-4">
      {TIME_WINDOWS.map((w) => (
        <button key={w.id} onClick={() => setWindowId(w.id)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${windowId === w.id ? 'bg-bg-secondary shadow-sm text-text-primary' : 'text-text-tertiary'}`}>
          {w.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-4 pb-28 mobile-safe-bottom">

      {/* Speicher-Status: nur melden, wenn etwas NICHT in der Datenbank steht */}
      {dbStatus === 'lokal-mehr' && (
        <div className="mb-4 rounded-xl border border-system-orange/30 bg-system-orange/10 p-3">
          <div className="flex items-start gap-2">
            <Icon name="warning" size={16} strokeWidth={2.2} className="text-system-orange flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-footnote text-text-primary">
                Auf diesem Gerät liegen mehr Ziehungen als in der Datenbank. Sie wurden
                bisher nur lokal gespeichert und sind für den anderen nicht sichtbar.
              </p>
              <button
                onClick={lokaleDatenUebertragen}
                disabled={uebertrage}
                className="btn-primary btn-sm mt-2 disabled:opacity-60"
              >
                {uebertrage ? 'Wird übertragen …' : 'In die Datenbank übertragen'}
              </button>
            </div>
          </div>
        </div>
      )}
      {dbStatus === 'fehler' && (
        <div className="mb-4 rounded-xl border border-system-red/20 bg-system-red/10 p-3 flex items-start gap-2">
          <Icon name="warning" size={16} strokeWidth={2.2} className="text-system-red flex-shrink-0 mt-0.5" />
          <p className="text-footnote text-text-primary min-w-0">
            Keine Verbindung zur Datenbank — angezeigt wird der zuletzt auf diesem Gerät
            gespeicherte Stand. Änderungen werden erst übernommen, wenn die Verbindung steht.
          </p>
        </div>
      )}

      {/* Mode segmented control */}
      <div className="flex gap-1 p-1 bg-bg-tertiary rounded-2xl mb-4 overflow-x-auto scrollbar-hide">
        {PEOPLE.map((p) => {
          const a = ACCENT[p.accent];
          const active = person === p.id;
          const total = countsTotal(pulls, p.id, sinceTs);
          return (
            <button key={p.id} onClick={() => setPerson(p.id)}
              className={`flex-1 min-w-[92px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${active ? `bg-bg-secondary shadow-sm ${a.text}` : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              {p.name}
              <span className="text-xs font-medium opacity-70">{total}</span>
            </button>
          );
        })}
        <button onClick={() => setPerson('stats')}
          className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${isStats ? 'bg-bg-secondary shadow-sm text-system-purple' : 'text-text-tertiary hover:text-text-secondary'}`}>
          <Icon name="chart" size={16} strokeWidth={2.1} />
          Statistik
        </button>
      </div>

      <WindowFilter />

      {isStats ? (
        <StatsView people={PEOPLE} statsFor={statsFor} pulls={pulls} catalog={catalog} sinceTs={sinceTs} windowLabel={TIME_WINDOWS.find((w) => w.id === windowId)?.label} />
      ) : (
        <>
          {/* Person summary */}
          <div className="modern-card mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.chip}`}>
                <Icon name="trophy" size={20} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary leading-tight">{current.name}</div>
                <div className="text-xs text-text-muted">Sammlung · {TIME_WINDOWS.find((w) => w.id === windowId)?.label}</div>
              </div>
              {countsTotal(pulls, current.id, 0) > 0 && (
                <button onClick={() => { if (window.confirm(`Komplette Sammlung von ${current.name} löschen?`)) setPulls(clearPerson(pulls, current.id)); }}
                  className="ml-auto text-xs font-medium text-text-tertiary hover:text-system-red px-2 py-1">Zurücksetzen</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${accent.text}`}>{curStats.totalPulls}</div>
                <div className="text-[11px] text-text-tertiary">Bekommen</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{curStats.unique}</div>
                <div className="text-[11px] text-text-tertiary">Teams</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-system-yellow inline-flex items-center gap-1">
                  <Icon name="starFilled" size={14} strokeWidth={0} />{curStats.avgRating ? fmtRating(curStats.avgRating) : '—'}
                </div>
                <div className="text-[11px] text-text-tertiary">⌀ Rating</div>
              </div>
            </div>
            {curStats.last && (
              <div className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
                <Icon name="clock" size={13} strokeWidth={2} className="text-text-tertiary" />
                Zuletzt: <span className="font-medium text-text-secondary">{curStats.last.team}</span> · {relTime(curStats.last.ts)}
              </div>
            )}
          </div>

          {/* Star distribution + extended stats (respects the active time window;
              dims non-matching tiers when a rating filter is set) */}
          {curStats.totalPulls > 0 && (() => {
            const maxVal = Math.max(1, ...Object.values(curStats.dist), curStats.nationals);
            const denom = curStats.ratedTotal || 1;
            return (
              <div className="modern-card mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="karten-titel inline-flex items-center gap-2">
                    <Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />Sterne-Verteilung
                  </h3>
                  <span className="text-[11px] text-text-tertiary">
                    {TIME_WINDOWS.find((w) => w.id === windowId)?.label}{ratingFilter !== 'all' ? ' · gefiltert' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {RATING_TIERS.filter((r) => curStats.dist[r]).map((r) => {
                    const val = curStats.dist[r];
                    const dim = ratingFilter !== 'all' && ratingFilter !== r ? 'opacity-40' : '';
                    return (
                      <div key={r} className={`flex items-center gap-2 ${dim}`}>
                        <span className="w-12 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary tabular-nums">
                          <Icon name="starFilled" size={11} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
                          <div className={`h-full ${accent.bar}`} style={{ width: `${(val / maxVal) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right text-[11px] text-text-tertiary tabular-nums">{val} · {Math.round((val / denom) * 100)}%</span>
                      </div>
                    );
                  })}
                  {curStats.nationals > 0 && (
                    <div className={`flex items-center gap-2 ${ratingFilter !== 'all' && ratingFilter !== 'none' ? 'opacity-40' : ''}`}>
                      <span className="w-12 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                        <Icon name="trophy" size={11} strokeWidth={2} className="text-text-tertiary" />Nat.
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full bg-text-tertiary" style={{ width: `${(curStats.nationals / maxVal) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] text-text-tertiary tabular-nums">{curStats.nationals}</span>
                    </div>
                  )}
                </div>

                {/* Extended stat chips */}
                <div className="mt-3 pt-3 border-t border-border-light flex flex-wrap gap-2">
                  {curStats.best && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary text-xs">
                      <Icon name="trophy" size={12} strokeWidth={2} className="text-system-orange" />
                      <span className="text-text-tertiary">Bestes:</span><span className="font-semibold text-text-primary truncate max-w-[110px]">{curStats.best.name}</span>
                    </span>
                  )}
                  {curStats.mostTeam && curStats.mostCount > 1 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary text-xs">
                      <span className="text-text-tertiary">Häufigste:</span><span className="font-semibold text-text-primary truncate max-w-[110px]">{curStats.mostTeam}</span><span className="text-text-tertiary">{curStats.mostCount}×</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Search + rating filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"><Icon name="search" size={18} strokeWidth={2} /></span>
              <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Team suchen…" autoFocus autoComplete="off"
                className="w-full pl-11 pr-9 py-3 bg-bg-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none" />
              {search && (
                <button type="button" onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  aria-label="Suche leeren"
                  className="btn-compact absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center">
                  <Icon name="x" size={14} strokeWidth={2.4} />
                </button>
              )}
            </div>
            <button onClick={() => setDuellOffen(true)}
              aria-label={duellEntwurf ? 'Duell-Entwurf fortsetzen' : 'Spielduell eintragen'}
              className="relative flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium bg-system-orange/12 text-system-orange">
              <Icon name="zap" size={16} strokeWidth={2.2} />
              <span className="hidden min-[380px]:inline">{duellEntwurf ? 'Entwurf' : 'Duell'}</span>
              {duellEntwurf && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-system-orange" />}
            </button>
            <button onClick={() => setFiltersOpen((o) => !o)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium ${ratingFilter !== 'all' || typeFilter !== 'all' || filtersOpen ? 'bg-system-blue/12 text-system-blue' : 'bg-bg-tertiary text-text-secondary'}`}>
              <Icon name="filter" size={16} strokeWidth={2.2} />
              {(ratingFilter !== 'all' || typeFilter !== 'all') && <span className="w-1.5 h-1.5 rounded-full bg-system-blue" />}
            </button>
          </div>

          {duellOffen && (
            <SpielduellModal
              catalog={catalog}
              entwurf={duellEntwurf}
              onClose={() => setDuellOffen(false)}
              onConfirm={duellEintragen}
              onEntwurfSpeichern={entwurfSpeichern}
              onEntwurfSichern={entwurfNurSchreiben}
              onEntwurfVerwerfen={entwurfVerwerfen}
              onRatingChange={teamRatingAendern}
            />
          )}

          {filtersOpen && (
            <div className="modern-card mb-3 animate-mobile-slide-in space-y-3">
              <div>
                <div className="section-label mb-1.5">Typ</div>
                <div className="flex flex-wrap gap-2">
                  {[['all', 'Alle'], ['clubs', 'Vereine'], ['national', 'Nationalteams'], ['women', 'Frauen']].map(([id, label]) => (
                    <button key={id} onClick={() => setTypeFilter(id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${typeFilter === id ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label mb-1.5">Nach Rating filtern</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setRatingFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === 'all' ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Alle</button>
                  {RATING_TIERS.map((r) => (
                    <button key={r} onClick={() => setRatingFilter(r)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === r ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                      <Icon name="starFilled" size={11} strokeWidth={0} className={ratingFilter === r ? '' : 'text-system-yellow'} />{fmtRating(r)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filterActive ? (
            <div className="space-y-1.5">
              <div className="text-xs text-text-tertiary px-1">{flatFiltered.length} Teams</div>
              {flatFiltered.map(renderTeamRow)}
              {flatFiltered.length === 0 && (
                <div className="modern-card text-center py-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center"><Icon name="search" size={28} strokeWidth={1.6} /></div>
                  <p className="text-text-muted text-sm">Kein Team gefunden.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[...RATING_TIERS, 'none'].map((tier) => {
                const list = teamsByTier[tier] || [];
                if (list.length === 0) return null;
                const isOpen = openTier === tier;
                const owned = list.reduce((s, t) => s + (counts[t.name] ? 1 : 0), 0);
                const label = tier === 'none' ? 'Nationalmannschaften' : `${fmtRating(tier)} Sterne`;
                return (
                  <div key={tier} className="modern-card p-0 overflow-hidden">
                    <button onClick={() => setOpenTier(isOpen ? null : tier)} className="w-full flex items-center gap-3 p-4 text-left">
                      {tier === 'none'
                        ? <Icon name="trophy" size={18} strokeWidth={2} className="text-text-tertiary flex-shrink-0" />
                        : <span className="flex items-center gap-0.5 flex-shrink-0"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" /></span>}
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-text-primary text-sm">{label}</span>
                        <span className="block text-[11px] text-text-tertiary">{owned > 0 ? `${owned} bekommen · ` : ''}{list.length} Teams</span>
                      </span>
                      <span className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}><Icon name="chevronRight" size={18} strokeWidth={2.2} /></span>
                    </button>
                    {isOpen && <div className="px-3 pb-3 space-y-1.5">{list.map(renderTeamRow)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function countsTotal(pulls, personId, sinceTs) {
  let n = 0;
  for (const e of pulls) {
    if (e.person !== personId) continue;
    if (sinceTs && new Date(e.ts).getTime() < sinceTs) continue;
    n += 1;
  }
  return n;
}

function StatsView({ people, statsFor, pulls, catalog, sinceTs = 0, windowLabel }) {
  const [openDetails, setOpenDetails] = useState({});
  const [achievePerson, setAchievePerson] = useState(null);

  const all = people.map((p) => ({ ...p, stats: statsFor(p.id) }));
  const combinedPulls = all.reduce((s, p) => s + p.stats.totalPulls, 0);
  const catalogTotal = catalog.length;

  // One lookup for the whole view (previously duplicated three times)
  const teamOf = useMemo(() => new Map(catalog.map((t) => [t.name, t])), [catalog]);
  // Wie in statsFor: der Katalog hat Vorrang, aber eine Ziehung, deren Team
  // dort nicht mehr steht, faellt auf die mitgespeicherte Wertung zurueck.
  const ratingAusZiehung = useMemo(() => {
    const m = new Map();
    for (const e of pulls) {
      if (Number.isFinite(Number(e.rating))) m.set(e.team, Number(e.rating));
    }
    return m;
  }, [pulls]);
  const ratingOf = (name) => {
    const t = teamOf.get(name);
    if (t) return t.rating ?? null;
    return ratingAusZiehung.get(name) ?? null;
  };
  const total5star = useMemo(() => catalog.filter((t) => t.rating === 5).length, [catalog]);
  const tierTotals = useMemo(() => {
    const o = {};
    catalog.forEach((t) => { if (t.rating != null) o[t.rating] = (o[t.rating] || 0) + 1; });
    return o;
  }, [catalog]);

  const inWindow = (e) => !sinceTs || new Date(e.ts).getTime() >= sinceTs;
  const topTeams = (s) => RATING_TIERS.filter((r) => r >= 4.5).reduce((sum, r) => sum + (s.dist[r] || 0), 0);

  // Per-match duel (both get a team per match → compare quality), incl. streak
  const duel = (() => {
    const rated = (pid) => pulls
      .filter((e) => e.person === pid && inWindow(e) && ratingOf(e.team) != null)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))
      .map((e) => ratingOf(e.team));
    const A = rated('alexander'); const P = rated('philip');
    const n = Math.min(A.length, P.length);
    let aw = 0, pw = 0, dr = 0;
    const winners = [];
    for (let i = 0; i < n; i++) {
      if (A[i] > P[i]) { aw++; winners.push('alexander'); }
      else if (P[i] > A[i]) { pw++; winners.push('philip'); }
      else { dr++; winners.push(null); }
    }
    let streakWho = null, streakLen = 0;
    for (let i = winners.length - 1; i >= 0; i--) {
      if (winners[i] == null) break;
      if (streakWho == null) { streakWho = winners[i]; streakLen = 1; }
      else if (winners[i] === streakWho) streakLen++;
      else break;
    }
    return { aw, pw, dr, n, streakWho, streakLen };
  })();

  // All-time metrics per person (achievements + completion)
  const allTime = (pid) => {
    const counts = new Map();
    let total = 0;
    for (const e of pulls) { if (e.person !== pid) continue; total += 1; counts.set(e.team, (counts.get(e.team) || 0) + 1); }
    let five = 0, top = 0, nat = 0, women = 0, maxCount = 0, maxTeam = null;
    const tiers = new Set();
    for (const [name, c] of counts) {
      if (c > maxCount) { maxCount = c; maxTeam = name; }
      const t = teamOf.get(name); const r = ratingOf(name);
      if (r === 5) five += 1;
      if (r != null && r >= 4.5) top += 1;
      // Nur was im Katalog steht und dort keine Wertung hat, ist eine
      // Nationalmannschaft. Ein Team, das gar nicht (mehr) im Katalog steht,
      // hat hier frueher als Nationalteam gezaehlt.
      if (t && t.rating == null) nat += 1;
      if (t?.women) women += 1;
      if (r != null) tiers.add(r);
    }
    return { total, unique: counts.size, five, top, nat, women, maxCount, maxTeam, tiers };
  };

  const achievementsFor = (pid) => {
    const m = allTime(pid);
    return [
      { id: 'first', icon: 'football', label: 'Erstes Team', desc: 'Bekomme dein allererstes Team.', value: Math.min(m.total, 1), target: 1 },
      { id: 'five', icon: 'starFilled', label: 'Erstes 5★-Team', desc: 'Bekomme ein Team mit vollen 5 Sternen.', value: Math.min(m.five, 1), target: 1 },
      { id: 'collector10', icon: 'trophy', label: 'Sammler', desc: 'Bekomme 10 verschiedene Teams.', value: m.unique, target: 10 },
      { id: 'collector50', icon: 'award', label: 'Großsammler', desc: 'Bekomme 50 verschiedene Teams.', value: m.unique, target: 50 },
      { id: 'tophunter', icon: 'trendingUp', label: 'Top-Jäger', desc: 'Bekomme 10 verschiedene Top-Teams (mindestens 4,5 Sterne).', value: m.top, target: 10 },
      { id: 'national', icon: 'grid', label: 'Nationalstolz', desc: 'Bekomme 5 verschiedene Nationalmannschaften.', value: m.nat, target: 5 },
      { id: 'women3', icon: 'users', label: 'Frauenfußball', desc: 'Bekomme 3 verschiedene Frauenteams.', value: m.women, target: 3 },
      { id: 'repeat5', icon: 'swap', label: 'Stammverein', desc: 'Bekomme ein und dasselbe Team 5 Mal.', value: m.maxCount, target: 5, extra: m.maxTeam },
      { id: 'underdog', icon: 'ban', label: 'Underdog', desc: 'Bekomme ein Team mit nur 0,5 Sternen.', value: m.tiers.has(0.5) ? 1 : 0, target: 1 },
      { id: 'allTiers', icon: 'scale', label: 'Alle Stufen', desc: 'Sammle aus jeder Stern-Stufe (0,5 bis 5,0) mindestens ein Team.', value: m.tiers.size, target: RATING_TIERS.length },
      { id: 'veteran', icon: 'clock', label: 'Veteran', desc: 'Bekomme insgesamt 100 Mal ein Team.', value: m.total, target: 100 },
      { id: 'complete5', icon: 'starFilled', label: '5★-Komplett', desc: 'Sammle alle ' + total5star + ' Teams mit 5 Sternen.', value: m.five, target: total5star || 1 },
    ].map((a) => ({ ...a, done: a.value >= a.target }));
  };

  const ownedPerTier = (pid) => {
    const seen = new Set(); const owned = {};
    for (const e of pulls) {
      if (e.person !== pid || seen.has(e.team)) continue;
      seen.add(e.team);
      const r = ratingOf(e.team);
      if (r != null) owned[r] = (owned[r] || 0) + 1;
    }
    return owned;
  };

  // Average star rating per MATCHDAY. A matchday is a session: it is dated by
  // the FIRST team of the session, and every team within 24h of that first team
  // belongs to the same matchday. Window-aware, last 6 matchdays.
  const MATCHDAY_MS = 24 * 60 * 60 * 1000;
  const matchdays = (() => {
    const evs = pulls
      .filter((e) => inWindow(e) && ratingOf(e.team) != null)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const sessions = [];
    let cur = null;
    for (const e of evs) {
      const t = new Date(e.ts).getTime();
      if (!cur || t >= cur.start + MATCHDAY_MS) {
        cur = { start: t, sum: {}, cnt: {} };
        sessions.push(cur);
      }
      const r = ratingOf(e.team);
      cur.sum[e.person] = (cur.sum[e.person] || 0) + r;
      cur.cnt[e.person] = (cur.cnt[e.person] || 0) + 1;
    }
    return sessions.slice(-6).map((d) => ({
      ts: d.start,
      label: new Date(d.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      avg: Object.fromEntries(people.map((p) => [p.id, d.cnt[p.id] ? d.sum[p.id] / d.cnt[p.id] : 0])),
    }));
  })();
  const bestMatchday = matchdays.reduce((best, d) => {
    const top = Math.max(...people.map((p) => d.avg[p.id] || 0));
    return (!best || top > best.val) ? { day: d, val: top } : best;
  }, null);

  const avgA = all[0].stats.avgRating, avgP = all[1].stats.avgRating;
  const qualityLeader = (avgA == null || avgP == null) ? null : (avgA > avgP ? all[0] : (avgP > avgA ? all[1] : null));
  const personName = (pid) => people.find((p) => p.id === pid)?.name || pid;

  if (combinedPulls === 0) {
    return (
      <div className="modern-card text-center py-10 animate-mobile-slide-in">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-bg-tertiary text-text-tertiary flex items-center justify-center"><Icon name="chart" size={28} strokeWidth={1.6} /></div>
        <h4 className="karten-titel mb-1">Keine Teams im Zeitraum</h4>
        <p className="text-sm text-text-muted">Für den Zeitraum {windowLabel} wurden noch keine Mannschaften erfasst.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-mobile-slide-in">
      {/* Quality comparison (counts are always equal → compare team QUALITY) */}
      <div className="modern-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="karten-titel inline-flex items-center gap-2"><Icon name="scale" size={17} strokeWidth={2.2} className="text-system-purple" />Wer bekommt die besseren Teams?</h3>
          <span className="text-[11px] text-text-tertiary whitespace-nowrap">{windowLabel} · {combinedPulls}</span>
        </div>

        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <div className="text-2xl font-bold text-system-blue tabular-nums inline-flex items-center gap-1"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />{avgA ? fmtRating(avgA) : '—'}</div>
            <div className="text-[11px] text-text-tertiary">{all[0].name} · ⌀</div>
          </div>
          <div className="px-2 text-xs font-semibold text-text-tertiary">
            {qualityLeader ? <span className="inline-flex items-center gap-1 text-system-orange">🔥 {qualityLeader.name}</span> : 'Gleichstand'}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-system-red tabular-nums inline-flex items-center gap-1"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />{avgP ? fmtRating(avgP) : '—'}</div>
            <div className="text-[11px] text-text-tertiary">{all[1].name} · ⌀</div>
          </div>
        </div>

        {duel.n > 0 && (
          <div className="mt-3 pt-3 border-t border-border-light">
            <div className="flex items-center justify-between mb-1.5">
              {/* Nicht mit den echten Spielduellen weiter unten verwechseln:
                  hier zaehlt allein, wer je Spiel das staerkere Team gezogen
                  hat — nicht, wer gewonnen hat. */}
              <span className="text-xs font-medium text-text-secondary">Bessere Ziehung je Spiel</span>
              <span className="text-[11px] text-text-tertiary">
                {duel.n} Spiele{duel.dr ? ' · ' + duel.dr + '× gleich' : ''}
                {duel.streakLen > 1 ? ' · 🔥 ' + personName(duel.streakWho) + ' ' + duel.streakLen + '×' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-right text-sm font-bold text-system-blue tabular-nums">{duel.aw}</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden bg-bg-tertiary flex text-[9px] font-bold text-white">
                <div className="bg-system-blue h-full flex items-center justify-center" style={{ width: `${(duel.aw / duel.n) * 100}%` }}>{duel.aw > 0 ? Math.round((duel.aw / duel.n) * 100) + '%' : ''}</div>
                <div className="bg-text-tertiary/40 h-full" style={{ width: `${(duel.dr / duel.n) * 100}%` }} />
                <div className="bg-system-red h-full flex items-center justify-center" style={{ width: `${(duel.pw / duel.n) * 100}%` }}>{duel.pw > 0 ? Math.round((duel.pw / duel.n) * 100) + '%' : ''}</div>
              </div>
              <span className="w-8 text-sm font-bold text-system-red tabular-nums">{duel.pw}</span>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {all.map((p) => {
            const a = ACCENT[p.accent]; const s = p.stats;
            const starSum = s.avgRating ? s.avgRating * s.ratedTotal : 0;
            return (
              <div key={p.id} className="bg-bg-tertiary rounded-xl p-2.5">
                <div className={`text-xs font-semibold ${a.text} mb-1 inline-flex items-center gap-1.5`}><span className={`w-2 h-2 rounded-full ${a.bar}`} />{p.name}</div>
                <div className="flex justify-between text-[11px] text-text-tertiary"><span className="text-text-secondary">Top-Teams ≥4,5★</span><span className="font-semibold text-text-primary tabular-nums">{topTeams(s)}</span></div>
                <div className="flex justify-between text-[11px] text-text-tertiary mt-0.5"><span className="text-text-secondary">Sternwert</span><span className="font-semibold text-text-primary tabular-nums">{starSum.toFixed(1).replace('.', ',')}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Glücks-Index, echte Spielduelle, Wochenrhythmus, Saisonvergleich */}
      <ZiehungsAuswertung people={people} pulls={pulls} catalog={catalog} />

      {/* Per person: key stats + labelled distribution + collapsible details */}
      {all.map((p) => {
        const a = ACCENT[p.accent]; const s = p.stats;
        const maxDistVal = Math.max(1, ...Object.values(s.dist), s.nationals);
        const denom = s.ratedTotal || 1;
        const fiveQuota = s.ratedTotal ? Math.round(((s.dist[5] || 0) / s.ratedTotal) * 100) : 0;
        const open = !!openDetails[p.id];
        const doneCount = achievementsFor(p.id).filter((x) => x.done).length;
        return (
          <div key={p.id} className="modern-card">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${a.bar}`} />
              <h3 className={`font-semibold ${a.text}`}>{p.name}</h3>
              <span className="ml-auto text-xs text-text-tertiary">{s.totalPulls} bekommen · {s.unique} {s.unique === 1 ? 'Team' : 'Teams'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">⌀ Rating</div>
                <div className="font-bold text-system-yellow inline-flex items-center gap-1"><Icon name="starFilled" size={13} strokeWidth={0} />{s.avgRating ? fmtRating(s.avgRating) : '—'}</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">Bestes Team</div>
                <div className="font-semibold text-text-primary text-sm truncate">{s.best ? s.best.name : '—'}</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">5★-Quote</div>
                <div className="font-bold text-text-primary tabular-nums">{fiveQuota}%</div>
              </div>
              <div className="bg-bg-tertiary rounded-xl p-2.5">
                <div className="text-[11px] text-text-tertiary mb-0.5">Nationalteams</div>
                <div className="font-bold text-text-primary tabular-nums">{s.nationals}</div>
              </div>
            </div>

            {/* Labelled distribution bars */}
            <div className="space-y-1.5">
              {RATING_TIERS.filter((r) => s.dist[r]).map((r) => {
                const val = s.dist[r];
                const pct = Math.round((val / denom) * 100);
                return (
                  <div key={r} className="flex items-center gap-2">
                    <span className="w-11 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary tabular-nums"><Icon name="starFilled" size={10} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}</span>
                    <div className="flex-1 h-4 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className={`h-full ${a.bar} flex items-center justify-end pr-1.5 text-[9px] font-bold text-white`} style={{ width: `${Math.max(10, (val / maxDistVal) * 100)}%` }}>{val}</div>
                    </div>
                    <span className="w-9 text-right text-[11px] text-text-tertiary tabular-nums">{pct}%</span>
                  </div>
                );
              })}
              {s.nationals > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-11 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary"><Icon name="trophy" size={10} strokeWidth={2} className="text-text-tertiary" />Nat.</span>
                  <div className="flex-1 h-4 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full bg-text-tertiary flex items-center justify-end pr-1.5 text-[9px] font-bold text-white" style={{ width: `${Math.max(10, (s.nationals / maxDistVal) * 100)}%` }}>{s.nationals}</div>
                  </div>
                  <span className="w-9" />
                </div>
              )}
            </div>

            {/* Compact facts */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              {s.mostTeam && s.mostCount > 1 && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Häufigste:</span> <span className="font-semibold text-text-primary">{s.mostTeam}</span> {s.mostCount}×</span>}
              {s.worst && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Schwächstes:</span> <span className="font-semibold text-text-primary">{s.worst.name}</span></span>}
              {s.last && <span className="px-2 py-1 rounded-lg bg-bg-tertiary"><span className="text-text-tertiary">Zuletzt:</span> <span className="font-semibold text-text-primary">{s.last.team}</span> · {relTime(s.last.ts)}</span>}
            </div>

            {/* Collapsible: collection & per-tier completion */}
            <button onClick={() => setOpenDetails((o) => ({ ...o, [p.id]: !o[p.id] }))} className="mt-3 w-full flex items-center justify-between py-2 text-xs font-medium text-text-secondary">
              <span className="text-text-secondary">Sammlung &amp; Vollständigkeit</span>
              <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}><Icon name="chevronRight" size={16} strokeWidth={2.2} /></span>
            </button>
            {open && (() => {
              const done = new Set(pulls.filter((e) => e.person === p.id).map((e) => e.team)).size;
              const pct = catalogTotal ? Math.round((done / catalogTotal) * 100) : 0;
              const owned = ownedPerTier(p.id);
              const tiers = RATING_TIERS.filter((r) => tierTotals[r] && owned[r]);
              return (
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] text-text-tertiary mb-1"><span className="text-text-secondary">Sammlung gesamt</span><span className="tabular-nums">{done}/{catalogTotal} · {pct}%</span></div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mb-3"><div className={`h-full ${a.bar}`} style={{ width: `${Math.max(2, pct)}%` }} /></div>
                  {tiers.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {tiers.map((r) => (
                        <div key={r} className="flex items-center gap-1.5">
                          <span className="w-10 inline-flex items-center gap-0.5 text-[11px] font-semibold text-text-secondary tabular-nums"><Icon name="starFilled" size={10} strokeWidth={0} className="text-system-yellow" />{fmtRating(r)}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden"><div className={`h-full ${a.bar}`} style={{ width: `${(owned[r] / tierTotals[r]) * 100}%` }} /></div>
                          <span className="text-[10px] text-text-tertiary tabular-nums w-9 text-right">{owned[r]}/{tierTotals[r]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Achievements entry */}
            <button onClick={() => setAchievePerson(p.id)} className={`mt-2 w-full flex items-center justify-between px-3 py-2.5 rounded-xl ${a.chip}`}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Icon name="award" size={16} strokeWidth={2.2} />Errungenschaften</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">{doneCount}/12<Icon name="chevronRight" size={15} strokeWidth={2.2} /></span>
            </button>
          </div>
        );
      })}

      {/* Average star rating per matchday — bars carry their value */}
      {matchdays.length > 0 && (
        <div className="modern-card">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="karten-titel inline-flex items-center gap-2"><Icon name="starFilled" size={15} strokeWidth={0} className="text-system-yellow" />Sterne-Ø pro Spieltag</h3>
            {bestMatchday && bestMatchday.val > 0 && <span className="text-[10px] text-text-tertiary whitespace-nowrap">Bester: {bestMatchday.day.label} ({fmtRating(bestMatchday.val)}★)</span>}
          </div>
          <p className="text-[11px] text-text-tertiary mb-3">⌀ Team-Rating je Person und Spieltag</p>
          <div className="flex items-end justify-between gap-2 h-32">
            {matchdays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-1.5" style={{ height: '96px' }}>
                  {people.map((p) => {
                    const v = d.avg[p.id] || 0;
                    return (
                      <div key={p.id} className="relative flex-1 max-w-[16px] h-full flex flex-col justify-end items-center">
                        {v > 0 && <span className="text-[8px] font-bold text-text-secondary tabular-nums mb-0.5 leading-none">{fmtRating(v)}</span>}
                        <div className={`w-full rounded-t ${ACCENT[p.accent].bar}`} style={{ height: `${(v / 5) * 82}%` }} />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-text-tertiary whitespace-nowrap">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-text-tertiary">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-system-blue" />Alexander</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-system-red" />Philip</span>
            <span className="text-text-quaternary">· Skala 0–5★</span>
          </div>
        </div>
      )}

      {/* Achievement detail sheet */}
      {achievePerson && createPortal((
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Errungenschaften">
          <button className="absolute inset-0 bg-black/50" aria-label="Schließen" onClick={() => setAchievePerson(null)} />
          <div
            className="relative w-full max-w-md bg-bg-elevated rounded-t-3xl sm:rounded-3xl shadow-ios-floating p-4 flex flex-col animate-mobile-slide-in"
            style={{ maxHeight: 'calc(100dvh - 2rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="karten-titel inline-flex items-center gap-2">
                <Icon name="award" size={18} strokeWidth={2.2} className="text-system-orange" />
                Errungenschaften · {personName(achievePerson)}
              </h3>
              <button onClick={() => setAchievePerson(null)} className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary flex items-center justify-center flex-shrink-0" aria-label="Schließen">
                <Icon name="x" size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2 min-h-0">
              {achievementsFor(achievePerson).map((x) => {
                const pct = Math.min(100, Math.round((x.value / x.target) * 100));
                const acc = ACCENT[people.find((p) => p.id === achievePerson)?.accent || 'blue'];
                return (
                  <div key={x.id} className={`flex gap-3 p-3 rounded-xl ${x.done ? acc.chip : 'bg-bg-tertiary'}`}>
                    <span className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${x.done ? 'bg-bg-elevated' : 'bg-bg-secondary text-text-quaternary'}`}>
                      <Icon name={x.icon} size={18} strokeWidth={x.done ? 2.2 : 1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${x.done ? '' : 'text-text-primary'}`}>{x.label}</span>
                        {x.done && <Icon name="check" size={13} strokeWidth={3} />}
                      </div>
                      <p className={`text-[11px] leading-snug ${x.done ? 'opacity-80' : 'text-text-tertiary'}`}>{x.desc}</p>
                      {x.id === 'repeat5' && x.extra && <p className="text-[10px] text-text-tertiary mt-0.5">Bestes: {x.extra} ({x.value}×)</p>}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                          <div className={`h-full ${x.done ? acc.bar : 'bg-text-tertiary/50'}`} style={{ width: `${Math.max(3, pct)}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-text-tertiary flex-shrink-0">{Math.min(x.value, x.target)}/{x.target}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

import Icon from '../icons/Icon';
import { useState, useEffect, useRef } from 'react';
import ZahlFeld from '../ZahlFeld';
import { zahl } from '../../utils/zahlen';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'spielersaufenData';

// ─── Colour palettes ──────────────────────────────────────────────────────────
//
// ACHTUNG, hier gilt NICHT die uebliche Token-Regel: diese Farben stehen fuer
// echte Trikotfarben, nicht fuer Oberflaechen. "Weiss" muss weiss bleiben und
// "Schwarz" schwarz — auch im Dunkelmodus. Deshalb sind hdr/dot/pill bewusst
// feste Farbwerte. Nur die `badge`-Flaeche ist Oberflaeche und laeuft ueber die
// getoenten .panel-*-Klassen, damit Text darauf in beiden Modi lesbar bleibt.
const P_COLORS = [
  { panel:'panel-blue',   text:'text-system-blue',   dot:'bg-system-blue',   btn:'bg-system-blue',   ring:'ring-system-blue'   },
  { panel:'panel-green',  text:'text-system-green',  dot:'bg-system-green',  btn:'bg-system-green',  ring:'ring-system-green'  },
  { panel:'panel-purple', text:'text-system-purple', dot:'bg-system-purple', btn:'bg-system-purple', ring:'ring-system-purple' },
  { panel:'panel-orange', text:'text-system-orange', dot:'bg-system-orange', btn:'bg-system-orange', ring:'ring-system-orange' },
  { panel:'panel-pink',   text:'text-system-pink',   dot:'bg-system-pink',   btn:'bg-system-pink',   ring:'ring-system-pink'   },
  { panel:'panel-red',    text:'text-system-red',    dot:'bg-system-red',    btn:'bg-system-red',    ring:'ring-system-red'    },
  { panel:'panel-yellow', text:'text-system-yellow', dot:'bg-system-yellow', btn:'bg-system-yellow', ring:'ring-system-yellow' },
  { panel:'panel-teal',   text:'text-system-teal',   dot:'bg-system-teal',   btn:'bg-system-teal',   ring:'ring-system-teal'   },
];

const TEAM_COLORS = {
  blue:   { key:'blue',   label:'Blau',    hdr:'bg-system-blue',    badge:'panel-blue text-system-blue',     dot:'bg-system-blue',   pill:'bg-system-blue text-white'    },
  red:    { key:'red',    label:'Rot',     hdr:'bg-system-red',     badge:'panel-red text-system-red',       dot:'bg-system-red',    pill:'bg-system-red text-white'     },
  green:  { key:'green',  label:'Grün',    hdr:'bg-system-green',   badge:'panel-green text-system-green',   dot:'bg-system-green',  pill:'bg-system-green text-white'   },
  orange: { key:'orange', label:'Orange',  hdr:'bg-system-orange',  badge:'panel-orange text-system-orange', dot:'bg-system-orange', pill:'bg-system-orange text-white'  },
  purple: { key:'purple', label:'Lila',    hdr:'bg-system-purple',  badge:'panel-purple text-system-purple', dot:'bg-system-purple', pill:'bg-system-purple text-white'  },
  yellow: { key:'yellow', label:'Gelb',    hdr:'bg-system-yellow',  badge:'panel-yellow text-system-yellow', dot:'bg-system-yellow', pill:'bg-system-yellow text-white'  },
  pink:   { key:'pink',   label:'Pink',    hdr:'bg-system-pink',    badge:'panel-pink text-system-pink',      dot:'bg-system-pink',   pill:'bg-system-pink text-white'    },
  teal:   { key:'teal',   label:'Türkis',  hdr:'bg-system-teal',    badge:'panel-teal text-system-teal',     dot:'bg-system-teal',   pill:'bg-system-teal text-white'    },
  // Feste Farben — siehe Hinweis oben.
  gray:   { key:'gray',   label:'Grau',    hdr:'bg-[#8E8E93]',      badge:'panel-gray text-text-secondary',  dot:'bg-[#8E8E93]',     pill:'bg-[#8E8E93] text-white'      },
  black:  { key:'black',  label:'Schwarz', hdr:'bg-[#1C1C1E]',      badge:'panel-gray text-text-primary',    dot:'bg-[#1C1C1E]',     pill:'bg-[#1C1C1E] text-white'      },
  white:  { key:'white',  label:'Weiß',    hdr:'bg-white border border-border-medium', badge:'panel-gray text-text-secondary', dot:'bg-white border border-border-medium', pill:'bg-white text-[#1C1C1E] border border-border-medium' },
};

function mkInitial() {
  return {
    settings: { mentionsPerShot: 2 },
    teams: {
      home: { name: 'Heimteam',     color: 'blue', players: [] },
      away: { name: 'Auswärtsteam', color: 'red',  players: [] },
    },
    participants: [],
    assignments: {},
    currentGame: { id: null, active: false, startedAt: null, mentions: {}, events: [] },
    games: [],
  };
}

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return mkInitial();
    const p = JSON.parse(s);
    const base = mkInitial();
    const migratedAsgn = {};
    for (const [k, v] of Object.entries(p.assignments || {})) {
      migratedAsgn[k] = Array.isArray(v) ? v : (v ? [v] : []);
    }
    return {
      ...base, ...p,
      teams: {
        home: { ...base.teams.home, ...(p.teams?.home || {}) },
        away: { ...base.teams.away, ...(p.teams?.away || {}) },
      },
      assignments: migratedAsgn,
      currentGame: { ...base.currentGame, ...(p.currentGame || {}) },
    };
  } catch { return mkInitial(); }
}

const tc  = (key) => TEAM_COLORS[key] || TEAM_COLORS.blue;
const pc  = (p)   => P_COLORS[(p?.colorIndex ?? 0) % P_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────
export default function SpielersaufenTab() {
  const [data, setData]     = useState(loadData);
  const [section, setSection] = useState('setup');
  const [shotFlash, setShotFlash] = useState(new Set()); // participantIds flashing

  // Setup form
  const [newPName, setNewPName]   = useState('');
  const [editingP, setEditingP]   = useState(null);

  // Aufstellung form
  const [newPl, setNewPl]         = useState({ teamId:'home', name:'', number:'' });
  const [editingPl, setEditingPl] = useState(null);
  const [subState, setSubState]   = useState(null);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk]   = useState(false);
  const [bulkTeam, setBulkTeam]   = useState('home');

  // Counter UI
  const [showOverview, setShowOverview] = useState(false);

  // Live game timer
  const [elapsed, setElapsed] = useState(0); // seconds
  const timerRef = useRef(null);

  useEffect(() => {
    if (data.currentGame.active && data.currentGame.startedAt) {
      const tick = () => {
        const secs = Math.floor((Date.now() - new Date(data.currentGame.startedAt).getTime()) / 1000);
        setElapsed(secs);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [data.currentGame.active, data.currentGame.startedAt]);

  const fmtElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  // persist
  const save = (d) => { setData(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  // ════════════════ COMPUTED ════════════════════════════════════════════════
  // Total mentions for a participant (sum across ALL their players) – used for shot logic
  const mentionsFor = (pId) =>
    (data.assignments[pId] || []).reduce((s, a) => s + (data.currentGame.mentions[a.playerId] || 0), 0);

  // Shots = floor(totalMentions / threshold)  ← participant-level (as requested)
  const shotsFor = (pId) => Math.floor(mentionsFor(pId) / data.settings.mentionsPerShot);

  // How many more mentions until the NEXT shot
  const nextShotIn = (pId) => {
    const total = mentionsFor(pId);
    const rem   = total % data.settings.mentionsPerShot;
    return rem === 0 ? data.settings.mentionsPerShot : data.settings.mentionsPerShot - rem;
  };

  const totalShotsAll   = () => data.participants.reduce((s, p) => s + shotsFor(p.id), 0);
  const activePCount    = (tid) => data.teams[tid].players.filter(p => p.active).length;
  const allActivePlayers = () => {
    const out = [];
    for (const [teamId, team] of Object.entries(data.teams))
      for (const p of team.players)
        if (p.active) out.push({ ...p, teamId, teamName: team.name, teamColor: team.color });
    return out;
  };
  const takenIds = (excludePId = null) => {
    const ids = new Set();
    for (const [pid, arr] of Object.entries(data.assignments))
      if (pid !== excludePId) arr.forEach(a => ids.add(a.playerId));
    return ids;
  };
  const lastGame = data.games[data.games.length - 1] || null;

  // ════════════════ SETTINGS ════════════════════════════════════════════════
  const setMPS = (v) => {
    const val = Math.max(1, zahl(v) || 1);
    save({ ...data, settings: { ...data.settings, mentionsPerShot: val } });
  };

  // ════════════════ PARTICIPANTS ════════════════════════════════════════════
  const addParticipant = () => {
    const name = newPName.trim(); if (!name) return;
    const id = `p_${Date.now()}`;
    const colorIndex = data.participants.length % P_COLORS.length;
    save({ ...data, participants: [...data.participants, { id, name, colorIndex }] });
    setNewPName('');
  };

  const delParticipant = (id) => {
    const asgn = { ...data.assignments }; delete asgn[id];
    save({ ...data, participants: data.participants.filter(p => p.id !== id), assignments: asgn });
  };

  const confirmRenameP = () => {
    if (!editingP) return;
    save({ ...data, participants: data.participants.map(p => p.id === editingP.id ? { ...p, name: editingP.name } : p) });
    setEditingP(null);
  };

  // ════════════════ TEAMS ═══════════════════════════════════════════════════
  const setTeamField = (tid, key, val) =>
    save({ ...data, teams: { ...data.teams, [tid]: { ...data.teams[tid], [key]: val } } });

  const addPlayer = () => {
    const name = newPl.name.trim(); if (!name) return;
    const player = { id: `pl_${Date.now()}`, name, number: newPl.number.trim(), active: true };
    save({ ...data, teams: { ...data.teams, [newPl.teamId]: { ...data.teams[newPl.teamId], players: [...data.teams[newPl.teamId].players, player] } } });
    setNewPl(p => ({ ...p, name: '', number: '' }));
  };

  const saveEditPl = () => {
    if (!editingPl) return;
    save({ ...data, teams: { ...data.teams, [editingPl.teamId]: { ...data.teams[editingPl.teamId],
      players: data.teams[editingPl.teamId].players.map(p =>
        p.id === editingPl.id ? { ...p, name: editingPl.name, number: editingPl.number } : p)
    }}});
    setEditingPl(null);
  };

  const toggleActive = (teamId, playerId) => {
    const pl = data.teams[teamId].players.find(p => p.id === playerId); if (!pl) return;
    const newActive = !pl.active;
    let asgn = { ...data.assignments };
    if (!newActive)
      for (const [pid, arr] of Object.entries(asgn)) asgn[pid] = arr.filter(a => a.playerId !== playerId);
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId],
        players: data.teams[teamId].players.map(p => p.id === playerId ? { ...p, active: newActive } : p) }}});
  };

  const removePlayer = (teamId, playerId) => {
    let asgn = { ...data.assignments };
    for (const [pid, arr] of Object.entries(asgn)) asgn[pid] = arr.filter(a => a.playerId !== playerId);
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId], players: data.teams[teamId].players.filter(p => p.id !== playerId) }}});
  };

  // Bulk-add players from a newline/comma-separated list
  // Format: "Name" or "#Nr Name" or "Nr Name" (number optional)
  const bulkAddPlayers = () => {
    const lines = bulkInput
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const newPlayers = lines.map(line => {
      // Try to parse optional leading number
      const m = line.match(/^#?(\d{1,2})\s+(.+)$/);
      if (m) return { id: `pl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name: m[2].trim(), number: m[1], active: true };
      return { id: `pl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name: line, number: '', active: true };
    });
    save({ ...data, teams: { ...data.teams, [bulkTeam]: {
      ...data.teams[bulkTeam],
      players: [...data.teams[bulkTeam].players, ...newPlayers],
    }}});
    setBulkInput('');
    setShowBulk(false);
  };

  const startSub   = (tid, outId) => setSubState({ teamId: tid, outId });
  const completeSub = (inId) => {
    if (!subState) return;
    const { teamId, outId } = subState;
    let asgn = { ...data.assignments };
    for (const [pid, arr] of Object.entries(asgn)) asgn[pid] = arr.filter(a => a.playerId !== outId);
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId],
        players: data.teams[teamId].players.map(p =>
          p.id === outId ? { ...p, active: false } : p.id === inId ? { ...p, active: true } : p) }}});
    setSubState(null);
  };

  // ════════════════ AUSLOSUNG ═══════════════════════════════════════════════
  const drawOneFor = (participantId) => {
    const taken    = takenIds(participantId);
    const mineMine = new Set((data.assignments[participantId] || []).map(a => a.playerId));
    const pool     = allActivePlayers().filter(p => !taken.has(p.id) && !mineMine.has(p.id));
    if (!pool.length) { toast.error('Keine freien aktiven Spieler mehr!'); return; }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const entry  = { playerId: picked.id, playerName: picked.name, playerNumber: picked.number,
                     teamId: picked.teamId, teamName: picked.teamName, teamColor: picked.teamColor,
                     assignedAt: new Date().toISOString() };
    save({ ...data, assignments: { ...data.assignments, [participantId]: [...(data.assignments[participantId] || []), entry] } });
  };

  const removeFromParticipant = (pId, playerId) =>
    save({ ...data, assignments: { ...data.assignments, [pId]: (data.assignments[pId] || []).filter(a => a.playerId !== playerId) } });

  const clearParticipant = (pId) =>
    save({ ...data, assignments: { ...data.assignments, [pId]: [] } });

  const drawAll = () => {
    const active = allActivePlayers().sort(() => Math.random() - 0.5);
    const newA = {};
    data.participants.forEach((p, i) => {
      newA[p.id] = active[i] ? [{ playerId: active[i].id, playerName: active[i].name, playerNumber: active[i].number,
        teamId: active[i].teamId, teamName: active[i].teamName, teamColor: active[i].teamColor, assignedAt: new Date().toISOString() }] : [];
    });
    save({ ...data, assignments: newA });
  };

  // ════════════════ GAME ════════════════════════════════════════════════════
  const startGame = () =>
    save({ ...data, currentGame: { id: `g_${Date.now()}`, active: true, startedAt: new Date().toISOString(), mentions: {}, events: [] } });

  // Nur das laufende Spiel zuruecksetzen, Aufstellung und Auslosung bleiben.
  const newGame = () => {
    if (!window.confirm('Laufendes Spiel zurücksetzen und neu starten?\n(Aufstellungen & Auslosung bleiben erhalten)')) return;
    save({ ...data, currentGame: { id: null, active: false, startedAt: null, mentions: {}, events: [] } });
  };

  // Alles zuruecksetzen, auch Aufstellung und Auslosung.
  const fullReset = () => {
    if (!window.confirm('ALLES zurücksetzen? (Spieler, Teilnehmer, Statistik – alles weg!)')) return;
    save(mkInitial());
    setSection('setup');
  };

  // ════ KEY CHANGE: shot detection is participant-level (total mentions) ════
  const addMention = (participantId, playerId, playerName, teamName) => {
    const prevForPlayer = data.currentGame.mentions[playerId] || 0;
    const nextForPlayer = prevForPlayer + 1;

    // Total for this participant BEFORE and AFTER this click
    const assigned     = data.assignments[participantId] || [];
    const totalBefore  = assigned.reduce((s, a) => s + (data.currentGame.mentions[a.playerId] || 0), 0);
    const totalAfter   = totalBefore + 1;

    const shotsBefore  = Math.floor(totalBefore / data.settings.mentionsPerShot);
    const shotsAfter   = Math.floor(totalAfter  / data.settings.mentionsPerShot);
    const shot         = shotsAfter > shotsBefore;

    if (shot) {
      setShotFlash(s => new Set([...s, participantId]));
      setTimeout(() => setShotFlash(s => { const n = new Set(s); n.delete(participantId); return n; }), 2200);
      // Haptic feedback on supported devices
      if (navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 200]);
    } else {
      // Light tap for normal mention
      if (navigator.vibrate) navigator.vibrate(30);
    }

    const event = {
      id: `e_${Date.now()}`, participantId,
      participantName: data.participants.find(p => p.id === participantId)?.name || '',
      playerId, playerName, teamName,
      mentionCountPlayer: nextForPlayer,
      mentionCountTotal:  totalAfter,
      shotTriggered: shot,
      timestamp: new Date().toISOString(),
    };

    save({ ...data, currentGame: {
      ...data.currentGame,
      mentions: { ...data.currentGame.mentions, [playerId]: nextForPlayer },
      events:   [...data.currentGame.events, event],
    }});
  };

  const undoMention = () => {
    const evts = [...data.currentGame.events]; if (!evts.length) return;
    const last = evts.pop();
    const prev = Math.max(0, (data.currentGame.mentions[last.playerId] || 1) - 1);
    save({ ...data, currentGame: { ...data.currentGame, mentions: { ...data.currentGame.mentions, [last.playerId]: prev }, events: evts } });
  };

  const endGame = () => {
    if (!data.currentGame.active) return;
    const summary = data.participants.map(p => {
      const assigned     = data.assignments[p.id] || [];
      const totalMentions = assigned.reduce((s, a) => s + (data.currentGame.mentions[a.playerId] || 0), 0);
      const totalShots   = Math.floor(totalMentions / data.settings.mentionsPerShot);
      return {
        participantId: p.id, participantName: p.name, colorIndex: p.colorIndex,
        players: assigned.map(a => ({ ...a, mentions: data.currentGame.mentions[a.playerId] || 0 })),
        totalMentions, totalShots,
      };
    });
    const finished = { ...data.currentGame, active: false, endedAt: new Date().toISOString(),
      assignments: { ...data.assignments }, settings: { ...data.settings }, summary };
    save({ ...data, games: [...data.games, finished],
      currentGame: { id: null, active: false, startedAt: null, mentions: {}, events: [] } });
    setSection('endergebnis');
  };

  // ─────────────────────────────────────────────────────────────────────────
  const navItems = [
    { id:'setup',       label:'Setup',      icon:'settings' },
    { id:'aufstellung', label:'Aufstellung', icon:'clipboard' },
    { id:'auslosung',   label:'Auslosung',   icon:'target' },
    { id:'counter',     label:'Counter',     icon:'bell' },
    { id:'endergebnis', label:'Ergebnis',    icon:'trophy' },
  ];

  // ════════════════ RENDER ══════════════════════════════════════════════════
  return (
    <div className="p-4 pb-28 mobile-safe-bottom">

      {/* Active-game shots indicator (kept — live status) */}
      {data.currentGame.active && (
        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-1 bg-system-green/15 text-system-green px-2.5 py-1.5 rounded-full text-xs font-bold border border-system-green/45">
            <span className="w-1.5 h-1.5 rounded-full bg-system-green animate-pulse" />
            {totalShotsAll()} <Icon name="glass" size={15} strokeWidth={2.2} />
          </div>
        </div>
      )}

      {/* ── Game-active banner (shown on non-counter sections) ─────────────── */}
      {data.currentGame.active && section !== 'counter' && (
        <button
          onClick={() => setSection('counter')}
          className="w-full mb-4 flex items-center gap-2.5 bg-system-green hover:bg-system-green active:scale-[0.99] text-white px-4 py-2.5 rounded-2xl shadow-md transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-bg-elevated animate-pulse flex-shrink-0" />
          <span className="font-bold text-sm flex-1 text-left">Spiel läuft – {fmtElapsed(elapsed)}</span>
          <span className="text-sm font-black">{totalShotsAll()} <Icon name="glass" size={15} strokeWidth={2.2} /></span>
          <span className="text-white/80 text-xs">→ Counter</span>
        </button>
      )}

      {/* ── Sub-nav ────────────────────────────────────────────────────────── */}
      <div className="mb-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-bg-tertiary rounded-2xl p-1 min-w-max">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${section===n.id ? 'bg-bg-secondary text-system-orange shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <Icon name={n.icon} size={15} strokeWidth={2.1} /><span>{n.label}</span>
              {n.id==='counter' && data.currentGame.active && <span className="w-1.5 h-1.5 rounded-full bg-system-green animate-pulse ml-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SETUP
      ══════════════════════════════════════════════════════════════════════ */}
      {section === 'setup' && (
        <div className="space-y-5">

          {/* Shot rule */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl p-4 shadow-sm">
            <h3 className="karten-titel mb-1 inline-flex items-center gap-2"><Icon name="glass" size={18} strokeWidth={2.2} />Shot-Regel</h3>
            <p className="text-xs text-text-tertiary mb-3">
              Jede wievielte Nennung (über <em>alle</em> Spieler eines Teilnehmers zusammen) = 1 Shot?
            </p>
            <div className="flex gap-2 flex-wrap items-center mb-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setMPS(n)}
                  className={`w-11 h-11 rounded-xl font-bold text-lg transition-all active:scale-95 ${data.settings.mentionsPerShot===n ? 'bg-system-orange text-white shadow-md' : 'bg-bg-tertiary text-text-secondary border border-border-light'}`}>
                  {n}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-tertiary">Eigener:</span>
                <ZahlFeld ganzzahl wert={String(data.settings.mentionsPerShot)}
                  onChange={setMPS}
                  className="w-14 h-10 text-center border border-border-medium rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-system-orange" />
              </div>
            </div>
            <div className="bg-system-orange/10 rounded-xl px-3 py-2 text-xs text-system-orange font-medium">
              Beispiel: Teilnehmer hat Spieler A + B → A: 1 Nennung + B: 1 Nennung
              = <strong>2 Gesamt</strong> → {data.settings.mentionsPerShot <= 2 ? '→ 1 Shot' : `noch kein Shot (Schwelle ${data.settings.mentionsPerShot})`}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="karten-titel inline-flex items-center gap-2"><Icon name="users" size={18} strokeWidth={2.2} />Mitspieler</h3>
              <span className="text-xs bg-bg-tertiary text-text-tertiary px-2 py-0.5 rounded-full">{data.participants.length}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newPName} onChange={e => setNewPName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addParticipant()}
                placeholder="Name eingeben…"
                className="flex-1 border border-border-medium rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-system-orange" />
              <button onClick={addParticipant}
                className="bg-system-orange hover:bg-system-orange active:scale-95 text-white px-4 rounded-xl font-bold text-xl transition-all">+</button>
            </div>
            <div className="space-y-2">
              {data.participants.map(p => {
                const c = pc(p); const isEditing = editingP?.id === p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 p-2.5 ${c.panel}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                    {isEditing ? (
                      <>
                        <input value={editingP.name} onChange={e => setEditingP(ep => ({ ...ep, name: e.target.value }))}
                          onKeyDown={e => { if(e.key==='Enter') confirmRenameP(); if(e.key==='Escape') setEditingP(null); }}
                          className="flex-1 border border-border-medium rounded-lg px-2 py-1 text-sm" autoFocus />
                        <button onClick={confirmRenameP} aria-label="Umbenennen bestätigen" className="btn-compact text-system-green p-1.5"><Icon name="check" size={16} strokeWidth={2.6} /></button>
                        <button onClick={() => setEditingP(null)} aria-label="Abbrechen" className="btn-compact text-text-tertiary p-1.5"><Icon name="x" size={16} strokeWidth={2.4} /></button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 font-semibold text-sm ${c.text}`}>{p.name}</span>
                        <span className="text-xs text-text-tertiary">{(data.assignments[p.id]||[]).length} Spieler</span>
                        <button onClick={() => setEditingP({ id: p.id, name: p.name })} aria-label={`${p.name} umbenennen`} className="btn-compact text-text-tertiary hover:text-text-secondary p-1.5"><Icon name="edit" size={15} strokeWidth={2.2} /></button>
                        <button onClick={() => delParticipant(p.id)} aria-label={`${p.name} entfernen`} className="btn-compact text-system-red/70 hover:text-system-red p-1.5"><Icon name="trash" size={15} strokeWidth={2.2} /></button>
                      </>
                    )}
                  </div>
                );
              })}
              {!data.participants.length && <p className="text-sm text-text-tertiary text-center py-3">Noch keine Mitspieler</p>}
            </div>
          </div>

          {/* Checklist */}
          <div className="panel-orange rounded-2xl p-4">
            <h4 className="karten-titel text-system-orange mb-2 inline-flex items-center gap-1.5"><Icon name="check" size={15} strokeWidth={2.4} />Bereit zum Spielen?</h4>
            {[
              { ok: data.participants.length >= 2, label: `≥ 2 Mitspieler (${data.participants.length})` },
              { ok: activePCount('home') >= 1,     label: `Heimteam hat Spieler (${activePCount('home')})` },
              { ok: activePCount('away') >= 1,     label: `Auswärtsteam hat Spieler (${activePCount('away')})` },
              { ok: Object.values(data.assignments).some(a => a.length > 0), label: 'Spieler ausgelost' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm mb-1">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  item.ok ? 'bg-system-green border-system-green text-white' : 'border-border-strong'}`}>
                  {item.ok && <Icon name="check" size={10} strokeWidth={3} />}
                </span>
                <span className={item.ok ? 'text-system-green' : 'text-text-tertiary'}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Danger zone */}
          <div className="panel-red rounded-2xl p-4">
            <h4 className="karten-titel text-system-red mb-2 inline-flex items-center gap-1.5"><Icon name="warning" size={15} strokeWidth={2.2} /> Reset</h4>
            <button onClick={fullReset}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-system-red/15 hover:bg-system-red/25 active:scale-95 text-system-red font-semibold text-sm border border-system-red/25 transition-all">
              <Icon name="trash" size={15} strokeWidth={2.2} /> Alles zurücksetzen (Neues Setup)
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          AUFSTELLUNG
      ══════════════════════════════════════════════════════════════════════ */}
      {section === 'aufstellung' && (
        <div className="space-y-5">
          {subState && (
            <div className="bg-system-yellow/10 border-2 border-system-yellow/45 rounded-2xl p-3 text-center">
              <p className="font-bold text-system-yellow text-sm inline-flex items-center gap-1.5"><Icon name="swap" size={14} strokeWidth={2.2} /> Einwechslung – wähle den eingewechselten Spieler:</p>
              <button onClick={() => setSubState(null)} className="text-xs text-system-yellow mt-1 underline">Abbrechen</button>
            </div>
          )}

          {/* Add player form */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="karten-titel inline-flex items-center gap-1.5"><Icon name="plus" size={15} strokeWidth={2.2} /> Spieler hinzufügen</h3>
              <button onClick={() => setShowBulk(v => !v)}
                className={`inline-flex items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${showBulk ? 'bg-system-purple/15 text-system-purple border-system-purple/45' : 'bg-bg-tertiary text-text-tertiary border-border-light'}`}>
                <Icon name="clipboard" size={14} strokeWidth={2.2} /> Bulk
              </button>
            </div>
            {showBulk ? (
              <div className="space-y-2">
                <div className="flex gap-2 mb-2">
                  {['home','away'].map(tid => {
                    const color = tc(data.teams[tid].color);
                    return (
                      <button key={tid} onClick={() => setBulkTeam(tid)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${bulkTeam===tid ? `${color.hdr} text-white border-transparent` : 'bg-bg-tertiary text-text-secondary border-border-light'}`}>
                        {data.teams[tid].name}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  placeholder={"Spieler eingeben – einer pro Zeile:\nMüller\n#9 Lewandowski\n#10 Messi"}
                  rows={6}
                  className="w-full border border-border-medium rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-system-purple font-mono resize-none"
                />
                <p className="text-[10px] text-text-tertiary">Format: Name oder #Nr Name (Komma oder Zeilenumbruch als Trenner)</p>
                <div className="flex gap-2">
                  <button onClick={bulkAddPlayers}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-system-purple hover:bg-system-purple active:scale-95 text-white font-bold text-sm py-2.5 rounded-xl transition-all">
                    <Icon name="check" size={15} strokeWidth={2.4} /> Alle hinzufügen ({bulkInput.split(/[\n,]/).filter(l=>l.trim()).length})
                  </button>
                  <button onClick={() => { setShowBulk(false); setBulkInput(''); }}
                    className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary border border-border-light text-sm">Abbrechen</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {['home','away'].map(tid => {
                    const color = tc(data.teams[tid].color);
                    return (
                      <button key={tid} onClick={() => setNewPl(p => ({ ...p, teamId: tid }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${newPl.teamId===tid ? `${color.hdr} text-white border-transparent` : 'bg-bg-tertiary text-text-secondary border-border-light'}`}>
                        {data.teams[tid].name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input value={newPl.number} onChange={e => setNewPl(p => ({ ...p, number: e.target.value }))}
                    placeholder="#" className="w-14 border border-border-medium rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-system-blue" />
                  <input value={newPl.name} onChange={e => setNewPl(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key==='Enter' && addPlayer()}
                    placeholder="Spielername…" className="flex-1 border border-border-medium rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-system-blue" />
                  <button onClick={addPlayer}
                    className="bg-system-blue hover:bg-system-blue active:scale-95 text-white px-4 rounded-xl font-bold text-xl transition-all">+</button>
                </div>
              </>
            )}
          </div>

          {/* Teams */}
          {['home','away'].map(teamId => {
            const team    = data.teams[teamId];
            const color   = tc(team.color);
            const active   = team.players.filter(p => p.active);
            const inactive = team.players.filter(p => !p.active);
            return (
              <div key={teamId} className="bg-bg-elevated border border-border-light rounded-2xl overflow-hidden shadow-sm">
                {/* Header + color picker */}
                <div className={`${color.hdr} p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input value={team.name} onChange={e => setTeamField(teamId,'name',e.target.value)}
                      className="flex-1 bg-white/20 text-white font-bold rounded-lg px-2 py-1 text-sm focus:outline-none focus:bg-bg-elevated placeholder-white/60" placeholder="Teamname…" />
                    <span className="text-white/80 text-xs font-semibold">{active.length}/11</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.values(TEAM_COLORS).map(tc2 => (
                      <button key={tc2.key} onClick={() => setTeamField(teamId,'color',tc2.key)}
                        title={tc2.label}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${tc2.dot} ${team.color===tc2.key ? 'border-white scale-125 shadow' : 'border-white/30 opacity-70'}`} />
                    ))}
                  </div>
                </div>

                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Startelf ({active.length})</p>
                  {!active.length && <p className="text-xs text-text-tertiary italic">Noch keine aktiven Spieler</p>}
                  {active.map(pl => {
                    const isEditing = editingPl?.id===pl.id && editingPl.teamId===teamId;
                    const isSubOut  = subState?.teamId===teamId && subState.outId===pl.id;
                    return (
                      <div key={pl.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${isSubOut ? 'panel-yellow' : 'panel-gray'}`}>
                        {isEditing ? (
                          <>
                            <input value={editingPl.number} onChange={e => setEditingPl(ep => ({ ...ep, number: e.target.value }))}
                              className="w-10 border border-border-medium rounded text-xs text-center px-1 py-1" placeholder="#" />
                            <input value={editingPl.name} onChange={e => setEditingPl(ep => ({ ...ep, name: e.target.value }))}
                              onKeyDown={e => { if(e.key==='Enter') saveEditPl(); if(e.key==='Escape') setEditingPl(null); }}
                              className="flex-1 border border-border-medium rounded text-sm px-2 py-1" autoFocus />
                            <button onClick={saveEditPl} aria-label="Speichern" className="text-system-green p-1"><Icon name="check" size={16} strokeWidth={2.6} /></button>
                            <button onClick={() => setEditingPl(null)} aria-label="Abbrechen" className="text-text-tertiary p-1"><Icon name="x" size={16} strokeWidth={2.2} /></button>
                          </>
                        ) : (
                          <>
                            {pl.number && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${color.badge}`}>#{pl.number}</span>}
                            <span className="flex-1 text-sm font-medium text-text-primary">{pl.name}</span>
                            {subState?.teamId===teamId && !isSubOut ? (
                              <button onClick={() => completeSub(pl.id)} className="text-xs bg-system-green text-white px-2 py-1 rounded-lg font-semibold inline-flex items-center gap-1"><Icon name="chevronUp" size={12} strokeWidth={2.2} /> Rein</button>
                            ) : (
                              <>
                                <button onClick={() => startSub(teamId, pl.id)} title="Auswechseln" aria-label="Auswechseln" className="text-system-orange p-1"><Icon name="swap" size={16} strokeWidth={2.2} /></button>
                                <button onClick={() => setEditingPl({ teamId, id: pl.id, name: pl.name, number: pl.number||'' })} aria-label="Bearbeiten" className="text-text-tertiary p-1"><Icon name="edit" size={16} strokeWidth={2.2} /></button>
                                <button onClick={() => toggleActive(teamId, pl.id)} title="Bank" aria-label="Auf die Bank" className="text-system-yellow p-1"><Icon name="undo" size={16} strokeWidth={2.2} /></button>
                                <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }} aria-label="Löschen" className="text-system-red p-1"><Icon name="trash" size={16} strokeWidth={2.2} /></button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {inactive.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mt-3">Bank ({inactive.length})</p>
                      {inactive.map(pl => (
                        <div key={pl.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-dashed border-border-light bg-bg-tertiary opacity-60">
                          {pl.number && <span className="text-xs text-text-tertiary">#{pl.number}</span>}
                          <span className="flex-1 text-sm text-text-tertiary line-through">{pl.name}</span>
                          {subState?.teamId===teamId ? (
                            <button onClick={() => completeSub(pl.id)} className="text-xs bg-system-green text-white px-2 py-1 rounded-lg font-semibold inline-flex items-center gap-1"><Icon name="chevronUp" size={12} strokeWidth={2.2} /> Rein</button>
                          ) : (
                            <>
                              <button onClick={() => toggleActive(teamId, pl.id)} aria-label="Einwechseln" className="text-system-green p-1"><Icon name="play" size={16} strokeWidth={2.2} /></button>
                              <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }} aria-label="Löschen" className="text-system-red p-1"><Icon name="trash" size={16} strokeWidth={2.2} /></button>
                            </>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          AUSLOSUNG
      ══════════════════════════════════════════════════════════════════════ */}
      {section === 'auslosung' && (
        <div className="space-y-5">
          <div className="panel-orange rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><Icon name="dice" size={18} strokeWidth={2.2} className="text-system-orange" /><span className="font-bold text-system-orange">Spieler auslosen</span></div>
            <p className="text-sm text-system-orange mb-2">Mehrere Spieler pro Person möglich – einfach mehrmals auslosen.</p>
            <div className="flex gap-4 text-sm text-system-orange">
              <span>Aktive: <strong>{allActivePlayers().length}</strong></span>
              <span>Frei: <strong>{allActivePlayers().filter(p => !takenIds().has(p.id)).length}</strong></span>
            </div>
          </div>

          <button onClick={drawAll} disabled={!data.participants.length}
            className="inline-flex items-center justify-center gap-1.5 w-full py-4 bg-system-orange hover:opacity-90 active:scale-95 text-white font-bold text-base rounded-2xl shadow-lg border-b-4 border-system-orange disabled:opacity-40 transition-all">
            <Icon name="dice" size={15} strokeWidth={2.2} /> Alle neu auslosen (je 1 Spieler)
          </button>

          <div className="space-y-4">
            {!data.participants.length && <p className="text-center text-text-tertiary text-sm py-6">Erst Mitspieler im Setup anlegen!</p>}
            {data.participants.map(p => {
              const c = pc(p);
              const assigned = data.assignments[p.id] || [];
              return (
                <div key={p.id} className={`rounded-2xl overflow-hidden ${c.panel}`}>
                  <div className={`${c.panel} border-0 rounded-none px-4 py-2.5 flex items-center gap-3`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className={`font-bold text-sm ${c.text} flex-1`}>{p.name}</span>
                    <span className="text-xs text-text-tertiary bg-bg-elevated px-2 py-0.5 rounded-full">{assigned.length} Spieler</span>
                  </div>
                  <div className="bg-bg-elevated px-4 py-3 space-y-2">
                    {assigned.map(a => {
                      const tColor = tc(a.teamColor || 'blue');
                      return (
                        <div key={a.playerId} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${tColor.badge}`}>
                          <div className={`w-2 h-2 rounded-full ${tColor.dot} flex-shrink-0`} />
                          <span className="flex-1 text-sm font-semibold">
                            {a.playerNumber ? `#${a.playerNumber} ` : ''}{a.playerName}
                          </span>
                          <span className="text-xs text-text-tertiary">{a.teamName}</span>
                          <button onClick={() => removeFromParticipant(p.id, a.playerId)} aria-label="Entfernen" className="text-text-tertiary hover:text-system-red px-1"><Icon name="x" size={12} strokeWidth={2.4} /></button>
                        </div>
                      );
                    })}
                    {!assigned.length && <p className="text-xs text-text-tertiary italic">Noch kein Spieler zugewiesen</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => drawOneFor(p.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-system-orange/10 hover:bg-system-orange/15 active:scale-95 text-system-orange text-sm font-semibold px-3 py-2 rounded-xl border border-system-orange/25 transition-all">
                        <Icon name="dice" size={14} strokeWidth={2.2} /> Spieler hinzulosen
                      </button>
                      {assigned.length > 0 && (
                        <button onClick={() => clearParticipant(p.id)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs text-text-tertiary hover:text-system-red px-3 py-2 rounded-xl border border-border-light transition-all">
                          Alle <Icon name="x" size={12} strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Player pool */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl p-4">
            <h4 className="karten-titel mb-3 inline-flex items-center gap-2"><Icon name="chart" size={15} strokeWidth={2.2} />Spieler-Pool</h4>
            {['home','away'].map(tid => {
              const team = data.teams[tid]; const color = tc(team.color);
              const active = team.players.filter(p => p.active);
              return (
                <div key={tid} className="mb-3 last:mb-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${color.pill}`}>{team.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {active.map(pl => {
                      const taken = takenIds().has(pl.id);
                      return (
                        <span key={pl.id} className={`text-xs px-2 py-1 rounded-full border font-medium ${taken ? 'bg-bg-tertiary text-text-tertiary border-border-light line-through' : color.badge}`}>
                          {pl.number ? `#${pl.number} ` : ''}{pl.name}
                        </span>
                      );
                    })}
                    {!active.length && <span className="text-xs text-text-tertiary italic">Keine Spieler</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          COUNTER
      ══════════════════════════════════════════════════════════════════════ */}
      {section === 'counter' && (
        <div className="space-y-4">

          {/* ── Not started ── */}
          {!data.currentGame.active ? (
            <div className="bg-bg-elevated border border-border-light rounded-2xl p-5 text-center shadow-sm">
              <div className="mb-3 flex justify-center text-text-tertiary"><Icon name="clock" size={44} strokeWidth={1.6} /></div>
              <p className="text-text-tertiary text-sm mb-5">Kein aktives Spiel.</p>
              <button onClick={startGame} disabled={!data.participants.length}
                className="inline-flex items-center justify-center gap-1.5 w-full py-4 bg-system-green hover:opacity-90 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg border-b-4 border-system-green disabled:opacity-40 transition-all mb-3">
                <Icon name="play" size={16} strokeWidth={2.2} /> Spiel starten
              </button>
              {data.games.length > 0 && (
                <p className="text-xs text-text-tertiary">Vorherige Spiele: {data.games.length} · Letztes Spiel: {(data.games[data.games.length-1].summary||[]).reduce((s,r)=>s+r.totalShots,0)} Shots</p>
              )}
            </div>
          ) : (
            <>
              {/* Live header */}
              <div className="panel-green rounded-2xl p-3 flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-system-green animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-system-green text-sm">Spiel läuft</span>
                    <span className="text-[11px] font-mono bg-system-green/15 text-system-green px-1.5 py-0.5 rounded-lg font-bold tabular-nums">
                      {fmtElapsed(elapsed)}
                    </span>
                  </div>
                  <div className="text-[10px] text-system-green mt-0.5">
                    Start: {new Date(data.currentGame.startedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} · {data.currentGame.events.length} Ereignisse
                  </div>
                </div>
                <span className="text-xs panel-green text-system-green px-2 py-1 rounded-full font-bold">
                  {totalShotsAll()} <Icon name="glass" size={15} strokeWidth={2.2} />
                </span>
                <button onClick={() => setShowOverview(v => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all ${showOverview ? 'bg-system-blue/15 text-system-blue border-system-blue/45' : 'bg-bg-tertiary text-text-tertiary border-border-light'}`}>
                  <Icon name="clipboard" size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Shot rule banner */}
              <div className="panel-orange rounded-xl px-3 py-2 text-xs text-system-orange text-center font-medium">
                <Icon name="glass" size={14} strokeWidth={2.2} /> Jede <strong>{data.settings.mentionsPerShot}. Nennung</strong> pro Teilnehmer (alle Spieler zusammen) = 1 Shot
              </div>

              {/* Overview matrix */}
              {showOverview && (
                <div className="bg-bg-elevated border border-border-light rounded-2xl p-4">
                  <h4 className="karten-titel mb-3 inline-flex items-center gap-1.5"><Icon name="eye" size={15} strokeWidth={2.2} /> Wer hat wen?</h4>
                  <div className="space-y-2.5">
                    {data.participants.map(p => {
                      const c = pc(p);
                      const assigned = data.assignments[p.id] || [];
                      const total = mentionsFor(p.id);
                      const shots = shotsFor(p.id);
                      const next  = nextShotIn(p.id);
                      return (
                        <div key={p.id} className="flex items-start gap-2">
                          <div className="flex flex-col items-center gap-0.5 min-w-[68px]">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                              <span className={`text-xs font-bold ${c.text} truncate`}>{p.name}</span>
                            </div>
                            <span className="text-[10px] text-text-tertiary">{total}× · {shots} <Icon name="glass" size={10} strokeWidth={2.2} /></span>
                          </div>
                          <div className="flex flex-wrap gap-1 flex-1">
                            {assigned.map(a => {
                              const tColor = tc(a.teamColor || 'blue');
                              const m = data.currentGame.mentions[a.playerId] || 0;
                              return (
                                <span key={a.playerId} className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${tColor.badge}`}>
                                  {a.playerName}{m > 0 ? ` (${m})` : ''}
                                </span>
                              );
                            })}
                            {!assigned.length && <span className="text-xs text-text-tertiary italic">—</span>}
                          </div>
                          {total > 0 && (
                            <div className={`text-[10px] text-center min-w-[32px] ${next === 1 ? 'text-system-red font-black' : 'text-text-tertiary'}`}>
                              {next === data.settings.mentionsPerShot ? '' : `${next}×`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Participant cards */}
              <div className="space-y-4">
                {data.participants.map(p => {
                  const c        = pc(p);
                  const assigned = data.assignments[p.id] || [];
                  const total    = mentionsFor(p.id);
                  const shots    = shotsFor(p.id);
                  const next     = nextShotIn(p.id);
                  const isFlash  = shotFlash.has(p.id);
                  const nearShot = next === 1 && total > 0;

                  return (
                    <div key={p.id}
                      className={`rounded-2xl overflow-hidden transition-all duration-300 ${c.panel} ${isFlash ? `ring-4 ${c.ring} scale-[1.01]` : ''}`}>

                      {/* Flash */}
                      {isFlash && (
                        <div className="bg-system-red text-white text-center py-2.5 font-black text-lg animate-bounce">
                          <span className="inline-flex items-center justify-center gap-2">
                            <Icon name="glass" size={18} strokeWidth={2.4} />
                            {p.name.toUpperCase()} TRINKEN!
                            <Icon name="glass" size={18} strokeWidth={2.4} />
                          </span>
                        </div>
                      )}

                      {/* Participant header – shows TOTAL stats */}
                      <div className={`${c.panel} border-0 rounded-none px-4 py-2.5 flex items-center gap-3`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                        <span className={`font-bold text-sm ${c.text} flex-1`}>{p.name}</span>
                        {/* Total mentions */}
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-xl font-black text-text-secondary leading-none">{total}</div>
                            <div className="text-[10px] text-text-tertiary leading-none mt-0.5">Nenn.</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-black text-system-orange leading-none">{shots}</div>
                            <div className="text-text-tertiary leading-none mt-0.5"><Icon name="glass" size={11} strokeWidth={2.2} /></div>
                          </div>
                          {/* Next shot indicator */}
                          <div className={`text-center w-10 ${nearShot ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`text-xl font-black leading-none ${nearShot ? 'text-system-red animate-pulse' : 'text-text-tertiary'}`}>{next}</div>
                            <div className="text-[10px] text-text-tertiary leading-none mt-0.5 inline-flex items-center gap-0.5">bis <Icon name="glass" size={11} strokeWidth={2.2} /></div>
                          </div>
                        </div>
                      </div>

                      {/* Per-player rows */}
                      <div className="bg-bg-elevated divide-y divide-gray-50">
                        {!assigned.length && (
                          <div className="px-4 py-3 text-xs text-text-tertiary italic text-center">
                            Kein Spieler → gehe zur Auslosung
                          </div>
                        )}
                        {assigned.map(a => {
                          const tColor  = tc(a.teamColor || 'blue');
                          const ments   = data.currentGame.mentions[a.playerId] || 0;

                          return (
                            <div key={a.playerId} className="flex items-center gap-3 px-4 py-3">
                              {/* Player info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <div className={`w-2 h-2 rounded-full ${tColor.dot} flex-shrink-0`} />
                                  <span className="font-semibold text-sm text-text-primary truncate">
                                    {a.playerNumber ? `#${a.playerNumber} ` : ''}{a.playerName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pl-3.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tColor.badge} font-medium`}>{a.teamName}</span>
                                  {ments > 0 && <span className="text-xs text-text-tertiary">{ments}× genannt</span>}
                                </div>
                              </div>
                              {/* Mention count */}
                              <div className="text-2xl font-black text-text-tertiary w-7 text-center select-none">{ments || ''}</div>
                              {/* + Button */}
                              <button
                                onClick={() => addMention(p.id, a.playerId, a.playerName, a.teamName)}
                                className={`w-14 h-14 rounded-2xl text-white font-black text-3xl shadow-lg active:scale-90 transition-all border-b-4 ${c.btn}`}
                                style={{ borderBottomColor:'rgba(0,0,0,0.22)' }}>
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={undoMention} disabled={!data.currentGame.events.length}
                  className="py-3 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary disabled:opacity-40 text-text-secondary font-medium text-sm border border-border-medium active:scale-95 transition-all">
                  ↩ Undo
                </button>
                <button onClick={newGame}
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-system-blue/10 hover:bg-system-blue/15 active:scale-95 text-system-blue font-semibold text-sm border border-system-blue/25 transition-all">
                  <Icon name="undo" size={14} strokeWidth={2.2} /> Neu
                </button>
                <button onClick={() => { if(window.confirm('Spiel beenden?')) endGame(); }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-system-red hover:bg-system-red active:scale-95 text-white font-bold text-sm border-b-4 border-system-red transition-all">
                  <Icon name="check" size={14} strokeWidth={2.2} /> Ende
                </button>
              </div>

              {/* Events log */}
              {data.currentGame.events.length > 0 && (
                <div className="bg-bg-elevated border border-border-light rounded-2xl p-4">
                  <h4 className="inline-flex items-center justify-center gap-1.5 karten-titel mb-2">
                    <Icon name="clipboard" size={14} strokeWidth={2.2} /> Verlauf · {data.currentGame.events.length} Ereignisse
                  </h4>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {[...data.currentGame.events].reverse().slice(0, 30).map((ev, i) => {
                      const part = data.participants.find(p => p.id === ev.participantId);
                      const c    = part ? pc(part) : P_COLORS[0];
                      const tColor = tc(data.assignments[ev.participantId]?.find?.(a => a.playerId === ev.playerId)?.teamColor || 'blue');
                      return (
                        <div key={ev.id||i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${ev.shotTriggered ? 'panel-orange' : 'panel-gray'}`}>
                          {ev.shotTriggered ? <Icon name="glass" size={14} strokeWidth={2.2} className="text-system-orange" /> : <span className="w-3.5" />}
                          <div className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                          <span className={`font-semibold ${c.text}`}>{ev.participantName}</span>
                          <span className="text-text-tertiary">→</span>
                          <span className={`font-medium px-1 py-0.5 rounded border text-[10px] ${tColor.badge}`}>{ev.playerName}</span>
                          <span className="text-text-tertiary ml-auto text-[10px]">Σ{ev.mentionCountTotal}</span>
                          {ev.shotTriggered && <span className="text-system-orange font-black">SHOT!</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ENDERGEBNIS
      ══════════════════════════════════════════════════════════════════════ */}
      {section === 'endergebnis' && (
        <div className="space-y-5">
          {!lastGame ? (
            <div className="text-center py-12 text-text-tertiary">
              <div className="mb-3 flex justify-center text-system-yellow"><Icon name="trophy" size={44} strokeWidth={1.6} /></div>
              <p>Noch kein abgeschlossenes Spiel.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-system-orange border-2 border-system-orange/45 rounded-2xl p-4 text-center">
                <div className="mb-1 flex justify-center text-system-yellow"><Icon name="trophy" size={34} strokeWidth={1.8} /></div>
                <div className="font-black text-xl text-system-orange mb-1">Spielergebnis</div>
                <div className="text-sm text-system-orange">
                  {new Date(lastGame.startedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
                  {' · '}
                  {new Date(lastGame.startedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}–{new Date(lastGame.endedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
                </div>
                <div className="text-xs text-system-orange mt-1">Jede {lastGame.settings.mentionsPerShot}. Nennung = 1 Shot</div>
                <div className="text-3xl font-black text-system-orange mt-2">
                  {(lastGame.summary||[]).reduce((s,r)=>s+r.totalShots,0)} <Icon name="glass" size={13} strokeWidth={2.2} /> gesamt
                </div>
              </div>

              {/* Podium */}
              {(() => {
                const sorted = [...(lastGame.summary||[])].sort((a,b) => b.totalShots-a.totalShots || b.totalMentions-a.totalMentions);
                return (
                  <div className="space-y-3">
                    {sorted.map((row, i) => {
                      const part = data.participants.find(p => p.id === row.participantId);
                      const c    = part ? pc(part) : P_COLORS[i % P_COLORS.length];
                      // Rangzahl statt Medaillen-Emoji: Gold, Silber und Bronze reichen nur
                      // bis Platz drei, danach stand dort ohnehin die Zahl. Jetzt durchgehend
                      // die Zahl, die ersten drei in ihrer Farbe.
                      const platzKlasse = i === 0 ? 'text-system-yellow' : i === 1 ? 'text-text-secondary'
                        : i === 2 ? 'text-system-orange' : 'text-text-tertiary';
                      return (
                        <div key={row.participantId} className={`rounded-2xl overflow-hidden ${c.panel}`}>
                          <div className={`${c.panel} border-0 rounded-none px-4 py-2.5 flex items-center gap-3`}>
                            <span className={`text-lg font-bold num-tabular ${platzKlasse}`}>{i + 1}.</span>
                            <span className={`font-bold ${c.text} flex-1`}>{row.participantName}</span>
                            <div className="flex gap-3 items-center">
                              <span className="text-sm text-text-tertiary">{row.totalMentions}×</span>
                              <span className="text-2xl font-black text-system-orange inline-flex items-center gap-1">{row.totalShots}<Icon name="glass" size={18} strokeWidth={2.2} /></span>
                            </div>
                          </div>
                          <div className="bg-bg-elevated px-4 py-2.5 flex flex-wrap gap-1.5">
                            {(row.players||[]).map(pl => {
                              const tColor = tc(pl.teamColor || 'blue');
                              return (
                                <span key={pl.playerId} className={`text-xs px-2 py-1 rounded-full border ${tColor.badge} font-medium`}>
                                  {pl.playerNumber ? `#${pl.playerNumber} ` : ''}{pl.playerName}
                                  <span className="opacity-60 ml-1">({pl.mentions}×)</span>
                                </span>
                              );
                            })}
                            {!(row.players||[]).length && <span className="text-xs text-text-tertiary italic">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Top players mentioned */}
              {(() => {
                const pm = {};
                for (const ev of (lastGame.events||[])) {
                  if (!pm[ev.playerName]) pm[ev.playerName] = { count:0, team:ev.teamName };
                  pm[ev.playerName].count++;
                }
                const top = Object.entries(pm).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
                if (!top.length) return null;
                return (
                  <div className="bg-bg-elevated border border-border-light rounded-2xl p-4">
                    <h4 className="karten-titel mb-3 inline-flex items-center gap-2"><Icon name="football" size={16} strokeWidth={2.2} />Meistgenannte Spieler</h4>
                    {top.map(([name, info], i) => (
                      <div key={name} className="flex items-center gap-3 mb-1.5">
                        <span className={`w-6 text-center num-tabular font-semibold ${
                          i===0 ? 'text-system-yellow' : i===1 ? 'text-text-secondary'
                          : i===2 ? 'text-system-orange' : 'text-text-tertiary'}`}>{i+1}.</span>
                        <span className="flex-1 text-sm font-medium text-text-primary">{name}</span>
                        <span className="text-xs text-text-tertiary">{info.team}</span>
                        <span className="text-sm font-black text-system-blue w-8 text-right">{info.count}×</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* New game from results */}
              <button onClick={() => { setSection('counter'); }}
                className="inline-flex items-center justify-center gap-1.5 w-full py-3.5 bg-system-green hover:opacity-90 active:scale-95 text-white font-bold rounded-2xl shadow-lg border-b-4 border-system-green transition-all">
                <Icon name="play" size={16} strokeWidth={2.2} /> Neues Spiel starten
              </button>

              {/* History */}
              {data.games.length > 1 && (
                <div className="bg-bg-elevated border border-border-light rounded-2xl p-4">
                  <h4 className="karten-titel mb-3 inline-flex items-center gap-1.5"><Icon name="clipboard" size={15} strokeWidth={2.2} /> Alle Spiele ({data.games.length})</h4>
                  <div className="space-y-2">
                    {[...data.games].reverse().map((g, i) => {
                      const totalShots = (g.summary||[]).reduce((s,r)=>s+r.totalShots,0);
                      const winner = [...(g.summary||[])].sort((a,b)=>b.totalShots-a.totalShots)[0];
                      return (
                        <div key={g.id||i} className="flex items-center gap-3 px-3 py-2 bg-bg-tertiary rounded-xl border border-border-light text-sm">
                          <span className="text-text-tertiary font-mono text-xs w-5">#{data.games.length-i}</span>
                          <span className="text-text-secondary">{new Date(g.startedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}</span>
                          {winner && <span className="text-xs text-text-tertiary flex-1 truncate"><Icon name="trophy" size={12} strokeWidth={2.2} className="text-system-yellow" /> {winner.participantName}</span>}
                          <span className="text-system-orange font-bold">{totalShots} <Icon name="glass" size={13} strokeWidth={2.2} /></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

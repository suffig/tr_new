import { useState } from 'react';

const STORAGE_KEY = 'spielersaufenData';

// ─── Participant colour palette ───────────────────────────────────────────────
const P_COLORS = [
  { bg:'bg-blue-100',   border:'border-blue-300',   text:'text-blue-700',   dot:'bg-blue-500',   btn:'bg-blue-500 hover:bg-blue-600',   ring:'ring-blue-400'   },
  { bg:'bg-green-100',  border:'border-green-300',  text:'text-green-700',  dot:'bg-green-500',  btn:'bg-green-500 hover:bg-green-600',  ring:'ring-green-400'  },
  { bg:'bg-purple-100', border:'border-purple-300', text:'text-purple-700', dot:'bg-purple-500', btn:'bg-purple-500 hover:bg-purple-600',ring:'ring-purple-400' },
  { bg:'bg-orange-100', border:'border-orange-300', text:'text-orange-700', dot:'bg-orange-500', btn:'bg-orange-500 hover:bg-orange-600',ring:'ring-orange-400' },
  { bg:'bg-pink-100',   border:'border-pink-300',   text:'text-pink-700',   dot:'bg-pink-500',   btn:'bg-pink-500 hover:bg-pink-600',   ring:'ring-pink-400'   },
  { bg:'bg-red-100',    border:'border-red-300',    text:'text-red-700',    dot:'bg-red-500',    btn:'bg-red-500 hover:bg-red-600',     ring:'ring-red-400'    },
  { bg:'bg-yellow-100', border:'border-yellow-300', text:'text-yellow-700', dot:'bg-yellow-500', btn:'bg-yellow-500 hover:bg-yellow-600',ring:'ring-yellow-400' },
  { bg:'bg-teal-100',   border:'border-teal-300',   text:'text-teal-700',   dot:'bg-teal-500',   btn:'bg-teal-500 hover:bg-teal-600',   ring:'ring-teal-400'   },
];

// ─── Team colour options ──────────────────────────────────────────────────────
const TEAM_COLORS = {
  blue:   { key:'blue',   label:'Blau',    hdr:'bg-blue-600',   badge:'bg-blue-50 text-blue-700 border-blue-200',   dot:'bg-blue-500',   pill:'bg-blue-500 text-white'   },
  red:    { key:'red',    label:'Rot',     hdr:'bg-red-600',    badge:'bg-red-50 text-red-700 border-red-200',       dot:'bg-red-500',    pill:'bg-red-500 text-white'    },
  green:  { key:'green',  label:'Grün',    hdr:'bg-green-600',  badge:'bg-green-50 text-green-700 border-green-200', dot:'bg-green-500',  pill:'bg-green-500 text-white'  },
  orange: { key:'orange', label:'Orange',  hdr:'bg-orange-500', badge:'bg-orange-50 text-orange-700 border-orange-200',dot:'bg-orange-500',pill:'bg-orange-500 text-white' },
  purple: { key:'purple', label:'Lila',    hdr:'bg-purple-600', badge:'bg-purple-50 text-purple-700 border-purple-200',dot:'bg-purple-500',pill:'bg-purple-500 text-white' },
  yellow: { key:'yellow', label:'Gelb',    hdr:'bg-yellow-400', badge:'bg-yellow-50 text-yellow-700 border-yellow-200',dot:'bg-yellow-400',pill:'bg-yellow-400 text-white' },
  pink:   { key:'pink',   label:'Pink',    hdr:'bg-pink-500',   badge:'bg-pink-50 text-pink-700 border-pink-200',    dot:'bg-pink-500',   pill:'bg-pink-500 text-white'   },
  gray:   { key:'gray',   label:'Grau',    hdr:'bg-gray-600',   badge:'bg-gray-50 text-gray-700 border-gray-200',    dot:'bg-gray-500',   pill:'bg-gray-500 text-white'   },
  black:  { key:'black',  label:'Schwarz', hdr:'bg-gray-900',   badge:'bg-gray-50 text-gray-800 border-gray-300',    dot:'bg-gray-900',   pill:'bg-gray-900 text-white'   },
  teal:   { key:'teal',   label:'Türkis',  hdr:'bg-teal-500',   badge:'bg-teal-50 text-teal-700 border-teal-200',    dot:'bg-teal-500',   pill:'bg-teal-500 text-white'   },
};

// ─── Data model ───────────────────────────────────────────────────────────────
function mkInitial() {
  return {
    settings: { mentionsPerShot: 1 },
    teams: {
      home: { name: 'Heimteam',      color: 'blue', players: [] },
      away: { name: 'Auswärtsteam',  color: 'red',  players: [] },
    },
    participants: [],
    // assignments: { participantId: [ { playerId, playerName, playerNumber, teamId, teamName, assignedAt } ] }
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
    // Migrate old single-assignment format ({ participantId: {...} }) → array format
    const migratedAssignments = {};
    for (const [k, v] of Object.entries(p.assignments || {})) {
      migratedAssignments[k] = Array.isArray(v) ? v : (v ? [v] : []);
    }
    return {
      ...base, ...p,
      teams: {
        home: { ...base.teams.home, ...(p.teams?.home || {}) },
        away: { ...base.teams.away, ...(p.teams?.away || {}) },
      },
      assignments: migratedAssignments,
      currentGame: { ...base.currentGame, ...(p.currentGame || {}) },
    };
  } catch { return mkInitial(); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const tc = (teamColor) => TEAM_COLORS[teamColor] || TEAM_COLORS.blue;
const pc = (p) => P_COLORS[(p?.colorIndex ?? 0) % P_COLORS.length];
const fmt = (n) => n % 1 === 0 ? String(n) : n.toFixed(1);

export default function SpielersaufenTab() {
  const [data, setData]   = useState(loadData);
  const [section, setSection] = useState('setup');

  // shot flash: Set<participantId> for brief highlight
  const [shotFlash, setShotFlash] = useState(new Set());

  // ── Setup form state
  const [newPName, setNewPName]         = useState('');
  const [editingP, setEditingP]         = useState(null); // { id, name }

  // ── Aufstellung form state
  const [newPl, setNewPl]               = useState({ teamId:'home', name:'', number:'' });
  const [editingPl, setEditingPl]       = useState(null); // { teamId, id, name, number }
  const [subState, setSubState]         = useState(null); // { teamId, outId }

  // ── Counter state
  const [showOverview, setShowOverview] = useState(false);

  // ─── Persist ──────────────────────────────────────────────────────────────
  const save = (d) => { setData(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  // ═══════════════════════════════════════════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  const setMPS = (v) => {
    const val = Math.max(1, parseInt(v) || 1);
    save({ ...data, settings: { ...data.settings, mentionsPerShot: val } });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  PARTICIPANTS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEAMS & PLAYERS
  // ═══════════════════════════════════════════════════════════════════════════
  const setTeamField = (teamId, key, val) =>
    save({ ...data, teams: { ...data.teams, [teamId]: { ...data.teams[teamId], [key]: val } } });

  const addPlayer = () => {
    const name = newPl.name.trim(); if (!name) return;
    const player = { id:`pl_${Date.now()}`, name, number:newPl.number.trim(), active:true };
    save({ ...data, teams: { ...data.teams, [newPl.teamId]: { ...data.teams[newPl.teamId], players:[...data.teams[newPl.teamId].players, player] } } });
    setNewPl(p => ({ ...p, name:'', number:'' }));
  };

  const saveEditPl = () => {
    if (!editingPl) return;
    save({ ...data, teams: { ...data.teams, [editingPl.teamId]: { ...data.teams[editingPl.teamId],
      players: data.teams[editingPl.teamId].players.map(p => p.id === editingPl.id ? { ...p, name:editingPl.name, number:editingPl.number } : p)
    }}});
    setEditingPl(null);
  };

  const toggleActive = (teamId, playerId) => {
    const pl = data.teams[teamId].players.find(p => p.id === playerId);
    if (!pl) return;
    const newActive = !pl.active;
    // remove from all assignments if deactivating
    let asgn = { ...data.assignments };
    if (!newActive) {
      for (const [pid, arr] of Object.entries(asgn)) {
        asgn[pid] = arr.filter(a => a.playerId !== playerId);
      }
    }
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId],
        players: data.teams[teamId].players.map(p => p.id === playerId ? { ...p, active:newActive } : p)
      }}
    });
  };

  const removePlayer = (teamId, playerId) => {
    let asgn = { ...data.assignments };
    for (const [pid, arr] of Object.entries(asgn)) asgn[pid] = arr.filter(a => a.playerId !== playerId);
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId], players: data.teams[teamId].players.filter(p => p.id !== playerId) }}
    });
  };

  const startSub  = (teamId, outId) => setSubState({ teamId, outId });
  const completeSub = (inId) => {
    if (!subState) return;
    const { teamId, outId } = subState;
    let asgn = { ...data.assignments };
    for (const [pid, arr] of Object.entries(asgn)) asgn[pid] = arr.filter(a => a.playerId !== outId);
    save({ ...data, assignments: asgn,
      teams: { ...data.teams, [teamId]: { ...data.teams[teamId],
        players: data.teams[teamId].players.map(p =>
          p.id === outId ? { ...p, active:false } : p.id === inId ? { ...p, active:true } : p)
      }}
    });
    setSubState(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUSLOSUNG
  // ═══════════════════════════════════════════════════════════════════════════
  const allActivePlayers = () => {
    const out = [];
    for (const [teamId, team] of Object.entries(data.teams))
      for (const p of team.players) if (p.active) out.push({ ...p, teamId, teamName:team.name, teamColor:team.color });
    return out;
  };

  const takenIds = (excludePId = null) => {
    const ids = new Set();
    for (const [pid, arr] of Object.entries(data.assignments))
      if (pid !== excludePId) arr.forEach(a => ids.add(a.playerId));
    return ids;
  };

  const drawOneFor = (participantId) => {
    const taken = takenIds(participantId);
    // also exclude players already assigned to this participant
    const alreadyMine = new Set((data.assignments[participantId] || []).map(a => a.playerId));
    const pool = allActivePlayers().filter(p => !taken.has(p.id) && !alreadyMine.has(p.id));
    if (!pool.length) { alert('Keine freien aktiven Spieler mehr!'); return; }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const newEntry = { playerId:picked.id, playerName:picked.name, playerNumber:picked.number, teamId:picked.teamId, teamName:picked.teamName, teamColor:picked.teamColor, assignedAt:new Date().toISOString() };
    const prev = data.assignments[participantId] || [];
    save({ ...data, assignments: { ...data.assignments, [participantId]: [...prev, newEntry] } });
  };

  const removeFromParticipant = (participantId, playerId) => {
    const arr = (data.assignments[participantId] || []).filter(a => a.playerId !== playerId);
    save({ ...data, assignments: { ...data.assignments, [participantId]: arr } });
  };

  const clearParticipantAssignments = (participantId) => {
    save({ ...data, assignments: { ...data.assignments, [participantId]: [] } });
  };

  const drawAll = () => {
    // Give each participant exactly one player (fresh draw)
    const active = allActivePlayers().sort(() => Math.random() - 0.5);
    const newAsgn = {};
    data.participants.forEach((p, i) => {
      newAsgn[p.id] = active[i] ? [{
        playerId:active[i].id, playerName:active[i].name, playerNumber:active[i].number,
        teamId:active[i].teamId, teamName:active[i].teamName, teamColor:active[i].teamColor,
        assignedAt:new Date().toISOString()
      }] : [];
    });
    save({ ...data, assignments: newAsgn });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  GAME / COUNTER
  // ═══════════════════════════════════════════════════════════════════════════
  const startGame = () => save({ ...data, currentGame:{ id:`g_${Date.now()}`, active:true, startedAt:new Date().toISOString(), mentions:{}, events:[] } });

  const addMention = (participantId, playerId, playerName, teamName) => {
    const prev  = data.currentGame.mentions[playerId] || 0;
    const next  = prev + 1;
    const shot  = next % data.settings.mentionsPerShot === 0;
    if (shot) {
      setShotFlash(s => new Set([...s, participantId]));
      setTimeout(() => setShotFlash(s => { const n = new Set(s); n.delete(participantId); return n; }), 2000);
    }
    const event = {
      id:`e_${Date.now()}`, participantId,
      participantName: data.participants.find(p => p.id === participantId)?.name || '',
      playerId, playerName, teamName, mentionCount:next, shotTriggered:shot, timestamp:new Date().toISOString()
    };
    save({ ...data, currentGame:{ ...data.currentGame, mentions:{ ...data.currentGame.mentions, [playerId]:next }, events:[...data.currentGame.events, event] } });
  };

  const undoMention = () => {
    const evts = [...data.currentGame.events]; if (!evts.length) return;
    const last = evts.pop();
    const prev = Math.max(0, (data.currentGame.mentions[last.playerId] || 1) - 1);
    save({ ...data, currentGame:{ ...data.currentGame, mentions:{ ...data.currentGame.mentions, [last.playerId]:prev }, events:evts } });
  };

  const endGame = () => {
    if (!data.currentGame.active) return;
    const summary = data.participants.map(p => {
      const pAssignments = data.assignments[p.id] || [];
      const totalMentions = pAssignments.reduce((s, a) => s + (data.currentGame.mentions[a.playerId] || 0), 0);
      const totalShots    = pAssignments.reduce((s, a) => s + Math.floor((data.currentGame.mentions[a.playerId] || 0) / data.settings.mentionsPerShot), 0);
      return { participantId:p.id, participantName:p.name, colorIndex:p.colorIndex,
        players: pAssignments.map(a => ({ ...a, mentions: data.currentGame.mentions[a.playerId] || 0, shots: Math.floor((data.currentGame.mentions[a.playerId] || 0) / data.settings.mentionsPerShot) })),
        totalMentions, totalShots };
    });
    const finished = { ...data.currentGame, active:false, endedAt:new Date().toISOString(), assignments:{ ...data.assignments }, settings:{ ...data.settings }, summary };
    save({ ...data, games:[...data.games, finished], currentGame:{ id:null, active:false, startedAt:null, mentions:{}, events:[] } });
    setSection('endergebnis');
  };

  // computed
  const mentionsFor  = (pId) => (data.assignments[pId] || []).reduce((s, a) => s + (data.currentGame.mentions[a.playerId] || 0), 0);
  const shotsFor     = (pId) => (data.assignments[pId] || []).reduce((s, a) => s + Math.floor((data.currentGame.mentions[a.playerId] || 0) / data.settings.mentionsPerShot), 0);
  const totalShotsCurrentGame = () => data.participants.reduce((s, p) => s + shotsFor(p.id), 0);
  const activePCount = (tid) => data.teams[tid].players.filter(p => p.active).length;
  const lastGame     = data.games[data.games.length - 1] || null;

  // nav items
  const navItems = [
    { id:'setup',       label:'Setup',      icon:'⚙️' },
    { id:'aufstellung', label:'Aufstellung', icon:'📋' },
    { id:'auslosung',   label:'Auslosung',   icon:'🎲' },
    { id:'counter',     label:'Counter',     icon:'🔔' },
    { id:'endergebnis', label:'Ergebnis',    icon:'🏆' },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 pb-28 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md">
            <span className="text-white text-2xl">🎙️</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Spielersaufen</h2>
            <p className="text-xs text-text-secondary">Nennungen tracken · Shots zählen</p>
          </div>
          {data.currentGame.active && (
            <div className="ml-auto flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-300">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live · {totalShotsCurrentGame()} 🥃
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div className="mb-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 min-w-max">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${section===n.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}>
              <span>{n.icon}</span><span>{n.label}</span>
              {n.id==='counter' && data.currentGame.active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      {/* ══════ SETUP ══════ */}
      {section === 'setup' && (
        <div className="space-y-5">
          {/* Shot rule */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">🥃 Shot-Regel</h3>
            <p className="text-xs text-gray-400 mb-3">Jede wievielte Nennung eines Spielers = 1 Shot?</p>
            <div className="flex gap-2 flex-wrap items-center">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setMPS(n)}
                  className={`w-11 h-11 rounded-xl font-bold text-lg transition-all active:scale-95 ${data.settings.mentionsPerShot===n ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {n}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-xs text-gray-400">Eigener:</span>
                <input type="number" min="1" max="20" value={data.settings.mentionsPerShot}
                  onChange={e => setMPS(e.target.value)}
                  className="w-14 h-10 text-center border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3 font-medium">
              Jede <strong>{data.settings.mentionsPerShot}. Nennung</strong> eines Spielers → sein Besitzer trinkt 🥃
            </p>
          </div>

          {/* Participants */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">👥 Mitspieler</h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{data.participants.length}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newPName} onChange={e => setNewPName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addParticipant()}
                placeholder="Name eingeben…"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={addParticipant}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 rounded-xl font-bold text-xl transition-all">+</button>
            </div>
            <div className="space-y-2">
              {data.participants.map(p => {
                const c = pc(p); const isEditing = editingP?.id===p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${c.bg} ${c.border}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
                    {isEditing ? (
                      <>
                        <input value={editingP.name} onChange={e => setEditingP(ep => ({ ...ep, name:e.target.value }))}
                          onKeyDown={e => { if(e.key==='Enter') confirmRenameP(); if(e.key==='Escape') setEditingP(null); }}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm" autoFocus />
                        <button onClick={confirmRenameP} className="text-green-600 font-bold px-2">✓</button>
                        <button onClick={() => setEditingP(null)} className="text-gray-400 px-1">✕</button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 font-semibold text-sm ${c.text}`}>{p.name}</span>
                        <span className="text-xs text-gray-400">{(data.assignments[p.id]||[]).length} Spieler</span>
                        <button onClick={() => setEditingP({ id:p.id, name:p.name })} className="text-gray-400 hover:text-gray-700 p-1">✏️</button>
                        <button onClick={() => delParticipant(p.id)} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                      </>
                    )}
                  </div>
                );
              })}
              {!data.participants.length && <p className="text-sm text-gray-400 text-center py-3">Noch keine Mitspieler</p>}
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-800 text-sm mb-2">✅ Checkliste</h4>
            {[
              { ok: data.participants.length >= 2, label:`Mindestens 2 Mitspieler (${data.participants.length})` },
              { ok: activePCount('home') >= 1,     label:`Heimteam hat Spieler (${activePCount('home')})` },
              { ok: activePCount('away') >= 1,     label:`Auswärtsteam hat Spieler (${activePCount('away')})` },
              { ok: Object.values(data.assignments).some(arr => arr.length > 0), label:'Spieler wurden ausgelost' },
            ].map((item,i) => (
              <div key={i} className="flex items-center gap-2 text-sm mb-1">
                <span>{item.ok ? '✅' : '⬜'}</span>
                <span className={item.ok ? 'text-green-700' : 'text-gray-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ AUFSTELLUNG ══════ */}
      {section === 'aufstellung' && (
        <div className="space-y-5">
          {/* Substitution banner */}
          {subState && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-3 text-center">
              <p className="font-bold text-yellow-800 text-sm">⬅️ Einwechslung – wähle den eingewechselten Spieler:</p>
              <button onClick={() => setSubState(null)} className="text-xs text-yellow-600 mt-1 underline">Abbrechen</button>
            </div>
          )}

          {/* Add player form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">➕ Spieler hinzufügen</h3>
            <div className="flex gap-2 mb-3">
              {['home','away'].map(tid => {
                const color = tc(data.teams[tid].color);
                return (
                  <button key={tid} onClick={() => setNewPl(p => ({ ...p, teamId:tid }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${newPl.teamId===tid ? `${color.hdr} text-white border-transparent` : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {data.teams[tid].name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input value={newPl.number} onChange={e => setNewPl(p => ({ ...p, number:e.target.value }))}
                placeholder="#" className="w-14 border border-gray-300 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input value={newPl.name} onChange={e => setNewPl(p => ({ ...p, name:e.target.value }))}
                onKeyDown={e => e.key==='Enter' && addPlayer()}
                placeholder="Spielername…" className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={addPlayer}
                className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white px-4 rounded-xl font-bold text-xl transition-all">+</button>
            </div>
          </div>

          {/* Two teams */}
          {(['home','away']).map(teamId => {
            const team   = data.teams[teamId];
            const color  = tc(team.color);
            const active   = team.players.filter(p => p.active);
            const inactive = team.players.filter(p => !p.active);
            return (
              <div key={teamId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Team header */}
                <div className={`${color.hdr} p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input value={team.name} onChange={e => setTeamField(teamId,'name',e.target.value)}
                      className="flex-1 bg-white/20 text-white font-bold rounded-lg px-2 py-1 text-sm focus:outline-none focus:bg-white/30 placeholder-white/60" placeholder="Teamname…" />
                    <span className="text-white/80 text-sm font-medium">{active.length}/11</span>
                  </div>
                  {/* Colour picker */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.values(TEAM_COLORS).map(tc2 => (
                      <button key={tc2.key} onClick={() => setTeamField(teamId,'color',tc2.key)}
                        title={tc2.label}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${tc2.dot} ${team.color===tc2.key ? 'border-white scale-110 shadow-md' : 'border-white/40'}`} />
                    ))}
                  </div>
                </div>

                {/* Players */}
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Startelf ({active.length})</p>
                  {!active.length && <p className="text-xs text-gray-400 italic">Noch keine aktiven Spieler</p>}
                  {active.map(pl => {
                    const isEditing = editingPl?.id===pl.id && editingPl.teamId===teamId;
                    const isSubOut  = subState?.teamId===teamId && subState.outId===pl.id;
                    return (
                      <div key={pl.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${isSubOut ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                        {isEditing ? (
                          <>
                            <input value={editingPl.number} onChange={e => setEditingPl(ep => ({ ...ep, number:e.target.value }))}
                              className="w-10 border border-gray-300 rounded text-xs text-center px-1 py-1" placeholder="#" />
                            <input value={editingPl.name} onChange={e => setEditingPl(ep => ({ ...ep, name:e.target.value }))}
                              onKeyDown={e => { if(e.key==='Enter') saveEditPl(); if(e.key==='Escape') setEditingPl(null); }}
                              className="flex-1 border border-gray-300 rounded text-sm px-2 py-1" autoFocus />
                            <button onClick={saveEditPl} className="text-green-600 font-bold p-1">✓</button>
                            <button onClick={() => setEditingPl(null)} className="text-gray-400 p-1">✕</button>
                          </>
                        ) : (
                          <>
                            {pl.number && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${color.badge}`}>#{pl.number}</span>}
                            <span className="flex-1 text-sm font-medium text-gray-800">{pl.name}</span>
                            {subState?.teamId===teamId && !isSubOut ? (
                              <button onClick={() => completeSub(pl.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold">⬆️ Rein</button>
                            ) : (
                              <>
                                <button onClick={() => startSub(teamId, pl.id)} title="Auswechseln" className="text-orange-400 hover:text-orange-600 p-1 text-sm">🔄</button>
                                <button onClick={() => setEditingPl({ teamId, id:pl.id, name:pl.name, number:pl.number||'' })} className="text-gray-400 hover:text-gray-700 p-1">✏️</button>
                                <button onClick={() => toggleActive(teamId, pl.id)} title="Deaktivieren" className="text-yellow-500 hover:text-yellow-700 p-1 text-sm">⏸</button>
                                <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {inactive.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">Bank ({inactive.length})</p>
                      {inactive.map(pl => (
                        <div key={pl.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 opacity-60">
                          {pl.number && <span className="text-xs text-gray-400">#{pl.number}</span>}
                          <span className="flex-1 text-sm text-gray-500 line-through">{pl.name}</span>
                          {subState?.teamId===teamId ? (
                            <button onClick={() => completeSub(pl.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold">⬆️ Rein</button>
                          ) : (
                            <>
                              <button onClick={() => toggleActive(teamId, pl.id)} title="Aktivieren" className="text-green-500 p-1 text-sm">▶️</button>
                              <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }} className="text-red-300 hover:text-red-500 p-1">🗑️</button>
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

      {/* ══════ AUSLOSUNG ══════ */}
      {section === 'auslosung' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-2xl">🎲</span><span className="font-bold text-amber-800">Spieler auslosen</span></div>
            <p className="text-sm text-amber-700">Jedem Mitspieler wird ein zufälliger Spieler aus den Aufstellungen zugewiesen. Mehrere Spieler pro Person möglich!</p>
            <div className="flex gap-4 mt-2 text-sm text-amber-700">
              <span>Aktive Spieler: <strong>{allActivePlayers().length}</strong></span>
              <span>Davon frei: <strong>{allActivePlayers().filter(p => !takenIds().has(p.id)).length}</strong></span>
            </div>
          </div>

          <button onClick={drawAll} disabled={!data.participants.length}
            className="w-full py-4 bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:scale-95 text-white font-bold text-base rounded-2xl shadow-lg border-b-4 border-amber-800 disabled:opacity-40 transition-all">
            🎲 Alle neu auslosen (je 1 Spieler)
          </button>

          {/* Per participant */}
          <div className="space-y-4">
            {!data.participants.length && <p className="text-center text-gray-400 text-sm py-6">Erst Mitspieler im Setup anlegen!</p>}
            {data.participants.map(p => {
              const c = pc(p);
              const assigned = data.assignments[p.id] || [];
              return (
                <div key={p.id} className={`border-2 rounded-2xl overflow-hidden ${c.border}`}>
                  {/* Participant header */}
                  <div className={`${c.bg} px-4 py-2.5 flex items-center gap-3`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className={`font-bold text-sm ${c.text} flex-1`}>{p.name}</span>
                    <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">{assigned.length} Spieler</span>
                  </div>
                  <div className="bg-white px-4 py-3 space-y-2">
                    {/* Assigned players list */}
                    {assigned.map(a => {
                      const tColor = tc(a.teamColor || 'blue');
                      return (
                        <div key={a.playerId} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${tColor.badge}`}>
                          <div className={`w-2 h-2 rounded-full ${tColor.dot} flex-shrink-0`} />
                          <span className="flex-1 text-sm font-semibold">
                            {a.playerNumber ? `#${a.playerNumber} ` : ''}{a.playerName}
                          </span>
                          <span className="text-xs text-gray-400">{a.teamName}</span>
                          <button onClick={() => removeFromParticipant(p.id, a.playerId)}
                            className="text-gray-300 hover:text-red-500 text-xs px-1 transition-colors">✕</button>
                        </div>
                      );
                    })}
                    {!assigned.length && <p className="text-xs text-gray-400 italic py-1">Noch kein Spieler zugewiesen</p>}
                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => drawOneFor(p.id)}
                        className="flex-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 text-sm font-semibold px-3 py-2 rounded-xl border border-amber-200 transition-all">
                        🎲 + Spieler hinzulosen
                      </button>
                      {assigned.length > 0 && (
                        <button onClick={() => clearParticipantAssignments(p.id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-3 py-2 rounded-xl border border-gray-200 transition-all">
                          Alle ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global player pool overview */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-600 text-sm mb-3">📊 Spieler-Pool</h4>
            {(['home','away']).map(tid => {
              const team = data.teams[tid]; const color = tc(team.color);
              const active = team.players.filter(p => p.active);
              return (
                <div key={tid} className="mb-3">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${color.pill}`}>{team.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.map(pl => {
                      const taken = takenIds().has(pl.id);
                      return (
                        <span key={pl.id} className={`text-xs px-2 py-1 rounded-full border font-medium ${taken ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : `${color.badge}`}`}>
                          {pl.number ? `#${pl.number} ` : ''}{pl.name}
                        </span>
                      );
                    })}
                    {!active.length && <span className="text-xs text-gray-400 italic">Keine Spieler</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ COUNTER ══════ */}
      {section === 'counter' && (
        <div className="space-y-4">
          {!data.currentGame.active ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-sm">
              <div className="text-5xl mb-3">⏱️</div>
              <p className="text-gray-500 text-sm mb-5">Kein aktives Spiel. Starte ein neues Spiel!</p>
              <button onClick={startGame} disabled={!data.participants.length}
                className="w-full py-4 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg border-b-4 border-green-800 disabled:opacity-40 transition-all">
                ▶️ Spiel starten
              </button>
            </div>
          ) : (
            <>
              {/* Game header bar */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-bold text-green-800">Spiel läuft</span>
                  <span className="text-green-600 ml-2">{new Date(data.currentGame.startedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr</span>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold border border-green-300">
                  {totalShotsCurrentGame()} 🥃 gesamt
                </span>
                <button onClick={() => setShowOverview(v => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all ${showOverview ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {showOverview ? '🗃️ Übersicht' : '🗃️ Übersicht'}
                </button>
              </div>

              {/* Shot rule reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 text-center font-medium">
                🥃 Jede <strong>{data.settings.mentionsPerShot}. Nennung</strong> eines Spielers = 1 Shot für seinen Besitzer
              </div>

              {/* Overview matrix */}
              {showOverview && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 overflow-x-auto">
                  <h4 className="font-bold text-gray-700 text-sm mb-3">👁️ Wer hat wen?</h4>
                  <div className="space-y-2">
                    {data.participants.map(p => {
                      const c = pc(p);
                      const assigned = data.assignments[p.id] || [];
                      return (
                        <div key={p.id} className="flex items-start gap-2">
                          <div className={`flex items-center gap-1.5 min-w-[80px] pt-0.5`}>
                            <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                            <span className={`text-xs font-bold ${c.text}`}>{p.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {assigned.map(a => {
                              const tColor = tc(a.teamColor || 'blue');
                              const ments = data.currentGame.mentions[a.playerId] || 0;
                              const shots = Math.floor(ments / data.settings.mentionsPerShot);
                              return (
                                <span key={a.playerId} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tColor.badge}`}>
                                  {a.playerNumber ? `#${a.playerNumber} ` : ''}{a.playerName}
                                  {ments > 0 && <span className="ml-1 opacity-70">({ments}×{shots > 0 ? ` ${shots}🥃` : ''})</span>}
                                </span>
                              );
                            })}
                            {!assigned.length && <span className="text-xs text-gray-400 italic">kein Spieler</span>}
                          </div>
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
                  const totMent  = mentionsFor(p.id);
                  const totShots = shotsFor(p.id);
                  const isFlash  = shotFlash.has(p.id);

                  return (
                    <div key={p.id} className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${c.border} ${isFlash ? `ring-4 ${c.ring} scale-[1.01]` : ''}`}>
                      {/* Shot flash banner */}
                      {isFlash && (
                        <div className="bg-red-500 text-white text-center py-2.5 font-black text-xl animate-pulse">
                          🥃 {p.name.toUpperCase()} TRINKEN! 🥃
                        </div>
                      )}

                      {/* Participant header */}
                      <div className={`${c.bg} px-4 py-2.5 flex items-center gap-3`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span className={`font-bold text-sm ${c.text} flex-1`}>{p.name}</span>
                        <div className="flex gap-3">
                          <div className="text-center">
                            <span className="text-lg font-black text-gray-700">{totMent}</span>
                            <span className="text-xs text-gray-500 ml-0.5">×</span>
                          </div>
                          <div className="text-center">
                            <span className="text-lg font-black text-amber-600">{totShots}</span>
                            <span className="text-xs ml-0.5">🥃</span>
                          </div>
                        </div>
                      </div>

                      {/* Per-player rows */}
                      <div className="bg-white divide-y divide-gray-50">
                        {!assigned.length && (
                          <div className="px-4 py-3 text-xs text-gray-400 italic">
                            Kein Spieler zugewiesen – gehe zur Auslosung
                          </div>
                        )}
                        {assigned.map(a => {
                          const tColor   = tc(a.teamColor || 'blue');
                          const ments    = data.currentGame.mentions[a.playerId] || 0;
                          const shots    = Math.floor(ments / data.settings.mentionsPerShot);
                          const nextIn   = data.settings.mentionsPerShot - (ments % data.settings.mentionsPerShot);
                          const isNextSoon = nextIn <= 2 && ments > 0;

                          return (
                            <div key={a.playerId} className="flex items-center gap-3 px-4 py-3">
                              {/* Player info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <div className={`w-2 h-2 rounded-full ${tColor.dot} flex-shrink-0`} />
                                  <span className="font-semibold text-sm text-gray-800 truncate">
                                    {a.playerNumber ? `#${a.playerNumber} ` : ''}{a.playerName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 pl-3.5">
                                  <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${tColor.badge}`}>{a.teamName}</span>
                                  <span>{ments} Nennung{ments!==1?'en':''}</span>
                                  {shots > 0 && <span className="text-amber-600 font-semibold">{shots} 🥃</span>}
                                  {isNextSoon && ments > 0 && (
                                    <span className="text-orange-500 font-bold">noch {nextIn}×</span>
                                  )}
                                </div>
                              </div>
                              {/* Mention count display */}
                              <div className="text-2xl font-black text-gray-300 w-8 text-center select-none">{ments}</div>
                              {/* Big + button */}
                              <button
                                onClick={() => addMention(p.id, a.playerId, a.playerName, a.teamName)}
                                className={`w-14 h-14 rounded-2xl text-white font-black text-3xl shadow-lg active:scale-90 transition-all border-b-4 ${c.btn}`}
                                style={{ borderBottomColor:'rgba(0,0,0,0.25)' }}
                              >+</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex gap-3 pt-1">
                <button onClick={undoMention} disabled={!data.currentGame.events.length}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-medium text-sm border border-gray-300 transition-all active:scale-95">
                  ↩ Rückgängig
                </button>
                <button onClick={() => { if(window.confirm('Spiel beenden?')) endGame(); }}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-sm border-b-4 border-red-700 transition-all">
                  🏁 Beenden
                </button>
              </div>

              {/* Recent events log */}
              {data.currentGame.events.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-700 text-sm mb-2">📋 Letzte Ereignisse</h4>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {[...data.currentGame.events].reverse().slice(0,25).map((ev,i) => {
                      const part = data.participants.find(p => p.id===ev.participantId);
                      const c = part ? pc(part) : P_COLORS[0];
                      const tColor = tc(data.assignments[ev.participantId]?.find?.(a => a.playerId===ev.playerId)?.teamColor || 'blue');
                      return (
                        <div key={ev.id||i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${ev.shotTriggered ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
                          {ev.shotTriggered && <span>🥃</span>}
                          <div className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                          <span className={`font-semibold ${c.text}`}>{ev.participantName}</span>
                          <span className="text-gray-400">→</span>
                          <span className={`font-medium px-1 py-0.5 rounded border text-[10px] ${tColor.badge}`}>{ev.playerName}</span>
                          <span className="text-gray-400 ml-auto">{ev.mentionCount}. Nennung</span>
                          {ev.shotTriggered && <span className="text-amber-600 font-bold">SHOT!</span>}
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

      {/* ══════ ENDERGEBNIS ══════ */}
      {section === 'endergebnis' && (
        <div className="space-y-5">
          {!lastGame ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">🏆</div>
              <p>Noch kein abgeschlossenes Spiel.</p>
            </div>
          ) : (
            <>
              {/* Game info */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-1">🏆</div>
                <div className="font-black text-xl text-amber-800 mb-1">Spielergebnis</div>
                <div className="text-sm text-amber-600">
                  {new Date(lastGame.startedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
                  {' · '}
                  {new Date(lastGame.startedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}–{new Date(lastGame.endedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
                </div>
                <div className="text-xs text-amber-500 mt-1">Jede {lastGame.settings.mentionsPerShot}. Nennung = 1 Shot</div>
                <div className="text-lg font-black text-amber-700 mt-2">
                  {(lastGame.summary||[]).reduce((s,r) => s+r.totalShots,0)} Shots total 🥃
                </div>
              </div>

              {/* Podium */}
              {(() => {
                const sorted = [...(lastGame.summary||[])].sort((a,b) => b.totalShots-a.totalShots || b.totalMentions-a.totalMentions);
                return (
                  <div className="space-y-3">
                    {sorted.map((row,i) => {
                      const part = data.participants.find(p => p.id===row.participantId);
                      const c = part ? pc(part) : P_COLORS[i%P_COLORS.length];
                      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
                      return (
                        <div key={row.participantId} className={`border-2 rounded-2xl overflow-hidden ${c.border}`}>
                          <div className={`${c.bg} px-4 py-2.5 flex items-center gap-3`}>
                            <span className="text-xl">{medal}</span>
                            <span className={`font-bold ${c.text} flex-1`}>{row.participantName}</span>
                            <span className="text-xl font-black text-amber-600">{row.totalShots} 🥃</span>
                          </div>
                          <div className="bg-white px-4 py-3">
                            {/* Per-player breakdown */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {(row.players||[]).map(pl => {
                                const tColor = tc(pl.teamColor || 'blue');
                                return (
                                  <span key={pl.playerId} className={`text-xs px-2 py-1 rounded-full border ${tColor.badge} font-medium`}>
                                    {pl.playerNumber ? `#${pl.playerNumber} ` : ''}{pl.playerName}
                                    <span className="ml-1 opacity-70">({pl.mentions}× · {pl.shots}🥃)</span>
                                  </span>
                                );
                              })}
                              {!(row.players||[]).length && <span className="text-xs text-gray-400 italic">—</span>}
                            </div>
                            <div className="flex gap-6 text-sm">
                              <span className="text-gray-500">Nennungen: <strong className="text-gray-700">{row.totalMentions}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Most mentioned players */}
              {(() => {
                const pm = {};
                for (const ev of (lastGame.events||[])) {
                  if (!pm[ev.playerName]) pm[ev.playerName] = { count:0, team:ev.teamName };
                  pm[ev.playerName].count++;
                }
                const top = Object.entries(pm).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
                if (!top.length) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <h4 className="font-bold text-gray-700 mb-3">⚽ Meistgenannte Spieler</h4>
                    <div className="space-y-2">
                      {top.map(([name,info],i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="w-6 text-lg text-center">{i===0?'🏅':''}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{name}</span>
                          <span className="text-xs text-gray-400">{info.team}</span>
                          <span className="text-sm font-black text-blue-600">{info.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Game history */}
              {data.games.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-700 mb-3">📜 Alle Spiele ({data.games.length})</h4>
                  <div className="space-y-2">
                    {[...data.games].reverse().map((g,i) => {
                      const totalShots = (g.summary||[]).reduce((s,r)=>s+r.totalShots,0);
                      const winner = [...(g.summary||[])].sort((a,b)=>b.totalShots-a.totalShots)[0];
                      return (
                        <div key={g.id||i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                          <span className="text-gray-400 font-mono text-xs">#{data.games.length-i}</span>
                          <span className="text-gray-600 flex-1">{new Date(g.startedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}</span>
                          {winner && <span className="text-xs text-gray-500">🏆 {winner.participantName}</span>}
                          <span className="text-amber-600 font-bold">{totalShots} 🥃</span>
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

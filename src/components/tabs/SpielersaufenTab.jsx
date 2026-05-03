import { useState, useEffect } from 'react';

const STORAGE_KEY = 'spielersaufenData';

const P_COLORS = [
  { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-700',   dot: 'bg-blue-500',   btn: 'bg-blue-500 hover:bg-blue-600' },
  { bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-700',  dot: 'bg-green-500',  btn: 'bg-green-500 hover:bg-green-600' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500', btn: 'bg-purple-500 hover:bg-purple-600' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600' },
  { bg: 'bg-pink-100',   border: 'border-pink-300',   text: 'text-pink-700',   dot: 'bg-pink-500',   btn: 'bg-pink-500 hover:bg-pink-600' },
  { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-700',    dot: 'bg-red-500',    btn: 'bg-red-500 hover:bg-red-600' },
];

function mkInitial() {
  return {
    settings: { mentionsPerShot: 1 },
    teams: {
      home: { name: 'Heimteam', players: [] },
      away: { name: 'Auswärtsteam', players: [] },
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
    const parsed = JSON.parse(s);
    const base = mkInitial();
    return {
      ...base,
      ...parsed,
      teams: {
        home: { ...base.teams.home, ...(parsed.teams?.home || {}) },
        away: { ...base.teams.away, ...(parsed.teams?.away || {}) },
      },
      currentGame: { ...base.currentGame, ...(parsed.currentGame || {}) },
    };
  } catch { return mkInitial(); }
}

export default function SpielersaufenTab() {
  const [data, setData] = useState(loadData);
  const [section, setSection] = useState('setup');
  const [shotFlash, setShotFlash] = useState(null); // participantId

  // ─── UI state for Setup ───────────────────────────────────
  const [newParticipant, setNewParticipant] = useState('');
  const [editingParticipant, setEditingParticipant] = useState(null); // { id, name }

  // ─── UI state for Aufstellungen ───────────────────────────
  const [newPlayer, setNewPlayer] = useState({ teamId: 'home', name: '', number: '' });
  const [editingPlayer, setEditingPlayer] = useState(null); // { teamId, id, name, number }
  const [subState, setSubState]   = useState(null); // { teamId, outId } – mid-substitution

  // ─── persist ──────────────────────────────────────────────
  const save = (d) => { setData(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  // ══════════════════════════════════════════════════════════
  //  SETTINGS
  // ══════════════════════════════════════════════════════════
  const setMentionsPerShot = (v) => {
    const val = Math.max(1, parseInt(v) || 1);
    save({ ...data, settings: { ...data.settings, mentionsPerShot: val } });
  };

  // ══════════════════════════════════════════════════════════
  //  PARTICIPANTS
  // ══════════════════════════════════════════════════════════
  const addParticipant = () => {
    const name = newParticipant.trim();
    if (!name) return;
    const id = `p_${Date.now()}`;
    const colorIndex = data.participants.length % P_COLORS.length;
    save({ ...data, participants: [...data.participants, { id, name, colorIndex }] });
    setNewParticipant('');
  };

  const deleteParticipant = (id) => {
    const asgn = { ...data.assignments };
    delete asgn[id];
    save({ ...data, participants: data.participants.filter(p => p.id !== id), assignments: asgn });
  };

  const confirmRenameParticipant = () => {
    if (!editingParticipant) return;
    save({
      ...data,
      participants: data.participants.map(p =>
        p.id === editingParticipant.id ? { ...p, name: editingParticipant.name } : p
      ),
    });
    setEditingParticipant(null);
  };

  // ══════════════════════════════════════════════════════════
  //  TEAMS & PLAYERS
  // ══════════════════════════════════════════════════════════
  const setTeamName = (teamId, name) =>
    save({ ...data, teams: { ...data.teams, [teamId]: { ...data.teams[teamId], name } } });

  const addPlayerToTeam = () => {
    const name = newPlayer.name.trim();
    if (!name) return;
    const player = { id: `pl_${Date.now()}`, name, number: newPlayer.number.trim(), active: true };
    save({
      ...data,
      teams: {
        ...data.teams,
        [newPlayer.teamId]: {
          ...data.teams[newPlayer.teamId],
          players: [...data.teams[newPlayer.teamId].players, player],
        },
      },
    });
    setNewPlayer(p => ({ ...p, name: '', number: '' }));
  };

  const saveEditPlayer = () => {
    if (!editingPlayer) return;
    save({
      ...data,
      teams: {
        ...data.teams,
        [editingPlayer.teamId]: {
          ...data.teams[editingPlayer.teamId],
          players: data.teams[editingPlayer.teamId].players.map(p =>
            p.id === editingPlayer.id
              ? { ...p, name: editingPlayer.name, number: editingPlayer.number }
              : p
          ),
        },
      },
    });
    setEditingPlayer(null);
  };

  const togglePlayerActive = (teamId, playerId) => {
    const player = data.teams[teamId].players.find(p => p.id === playerId);
    if (!player) return;
    const newActive = !player.active;
    // remove assignments for this player if deactivating
    let asgn = { ...data.assignments };
    if (!newActive) {
      for (const [pId, a] of Object.entries(asgn)) {
        if (a.playerId === playerId) delete asgn[pId];
      }
    }
    save({
      ...data,
      assignments: asgn,
      teams: {
        ...data.teams,
        [teamId]: {
          ...data.teams[teamId],
          players: data.teams[teamId].players.map(p =>
            p.id === playerId ? { ...p, active: newActive } : p
          ),
        },
      },
    });
  };

  const removePlayer = (teamId, playerId) => {
    let asgn = { ...data.assignments };
    for (const [pId, a] of Object.entries(asgn)) {
      if (a.playerId === playerId) delete asgn[pId];
    }
    save({
      ...data,
      assignments: asgn,
      teams: {
        ...data.teams,
        [teamId]: {
          ...data.teams[teamId],
          players: data.teams[teamId].players.filter(p => p.id !== playerId),
        },
      },
    });
  };

  // Substitution: pick outgoing player → then incoming
  const startSub = (teamId, outId) => setSubState({ teamId, outId });
  const completeSub = (inId) => {
    if (!subState) return;
    const { teamId, outId } = subState;
    let asgn = { ...data.assignments };
    for (const [pId, a] of Object.entries(asgn)) {
      if (a.playerId === outId) delete asgn[pId];
    }
    save({
      ...data,
      assignments: asgn,
      teams: {
        ...data.teams,
        [teamId]: {
          ...data.teams[teamId],
          players: data.teams[teamId].players.map(p => {
            if (p.id === outId) return { ...p, active: false };
            if (p.id === inId)  return { ...p, active: true };
            return p;
          }),
        },
      },
    });
    setSubState(null);
  };

  // ══════════════════════════════════════════════════════════
  //  AUSLOSUNG (DRAW)
  // ══════════════════════════════════════════════════════════
  const allActivePlayers = () => {
    const out = [];
    for (const [teamId, team] of Object.entries(data.teams)) {
      for (const p of team.players) {
        if (p.active) out.push({ ...p, teamId, teamName: team.name });
      }
    }
    return out;
  };

  const assignedPlayerIds = (excludePId = null) =>
    Object.entries(data.assignments)
      .filter(([id]) => id !== excludePId)
      .map(([, a]) => a.playerId);

  const drawFor = (participantId) => {
    const pool = allActivePlayers().filter(p => !assignedPlayerIds(participantId).includes(p.id));
    if (!pool.length) { alert('Keine freien aktiven Spieler mehr!'); return; }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    save({
      ...data,
      assignments: {
        ...data.assignments,
        [participantId]: {
          playerId: picked.id, playerName: picked.name,
          playerNumber: picked.number, teamId: picked.teamId,
          teamName: picked.teamName, assignedAt: new Date().toISOString(),
        },
      },
    });
  };

  const drawAll = () => {
    const active = allActivePlayers().sort(() => Math.random() - 0.5);
    const newAsgn = {};
    data.participants.forEach((p, i) => {
      if (active[i]) {
        newAsgn[p.id] = {
          playerId: active[i].id, playerName: active[i].name,
          playerNumber: active[i].number, teamId: active[i].teamId,
          teamName: active[i].teamName, assignedAt: new Date().toISOString(),
        };
      }
    });
    save({ ...data, assignments: newAsgn });
  };

  const clearAssignment = (pId) => {
    const asgn = { ...data.assignments };
    delete asgn[pId];
    save({ ...data, assignments: asgn });
  };

  // ══════════════════════════════════════════════════════════
  //  COUNTER / GAME
  // ══════════════════════════════════════════════════════════
  const startGame = () =>
    save({
      ...data,
      currentGame: {
        id: `g_${Date.now()}`, active: true,
        startedAt: new Date().toISOString(), mentions: {}, events: [],
      },
    });

  const addMention = (participantId) => {
    const asgn = data.assignments[participantId];
    if (!asgn) return;
    const pId = asgn.playerId;
    const prev = data.currentGame.mentions[pId] || 0;
    const next = prev + 1;
    const shot = next % data.settings.mentionsPerShot === 0;
    if (shot) { setShotFlash(participantId); setTimeout(() => setShotFlash(p => p === participantId ? null : p), 1800); }
    const event = {
      id: `e_${Date.now()}`, participantId,
      participantName: data.participants.find(p => p.id === participantId)?.name || '',
      playerId: pId, playerName: asgn.playerName, teamName: asgn.teamName,
      mentionCount: next, shotTriggered: shot, timestamp: new Date().toISOString(),
    };
    save({
      ...data,
      currentGame: {
        ...data.currentGame,
        mentions: { ...data.currentGame.mentions, [pId]: next },
        events: [...data.currentGame.events, event],
      },
    });
  };

  const undoMention = () => {
    const evts = [...data.currentGame.events];
    if (!evts.length) return;
    const last = evts.pop();
    const prev = Math.max(0, (data.currentGame.mentions[last.playerId] || 1) - 1);
    save({
      ...data,
      currentGame: {
        ...data.currentGame,
        mentions: { ...data.currentGame.mentions, [last.playerId]: prev },
        events: evts,
      },
    });
  };

  const endGame = () => {
    if (!data.currentGame.active) return;
    const summary = data.participants.map(p => {
      const a = data.assignments[p.id];
      const mentions = a ? (data.currentGame.mentions[a.playerId] || 0) : 0;
      return {
        participantId: p.id, participantName: p.name, colorIndex: p.colorIndex,
        playerId: a?.playerId || null, playerName: a?.playerName || '—',
        teamName: a?.teamName || '—', mentions, shots: Math.floor(mentions / data.settings.mentionsPerShot),
      };
    });
    const finished = { ...data.currentGame, active: false, endedAt: new Date().toISOString(), assignments: { ...data.assignments }, settings: { ...data.settings }, summary };
    save({
      ...data,
      games: [...data.games, finished],
      currentGame: { id: null, active: false, startedAt: null, mentions: {}, events: [] },
    });
    setSection('endergebnis');
  };

  // helpers
  const mentionsFor  = (pId) => { const a = data.assignments[pId]; return a ? (data.currentGame.mentions[a.playerId] || 0) : 0; };
  const shotsFor     = (pId) => Math.floor(mentionsFor(pId) / data.settings.mentionsPerShot);
  const activePCount = (teamId) => data.teams[teamId].players.filter(p => p.active).length;
  const color        = (p) => P_COLORS[p.colorIndex % P_COLORS.length];
  const lastGame     = data.games[data.games.length - 1] || null;

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  const navItems = [
    { id: 'setup',        label: 'Setup',       icon: '⚙️' },
    { id: 'aufstellung',  label: 'Aufstellung',  icon: '📋' },
    { id: 'auslosung',    label: 'Auslosung',    icon: '🎲' },
    { id: 'counter',      label: 'Counter',      icon: '🔔' },
    { id: 'endergebnis',  label: 'Ergebnis',     icon: '🏆' },
  ];

  return (
    <div className="p-4 pb-28 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-5 animate-mobile-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md">
            <span className="text-white text-xl">🍺</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Spielersaufen</h2>
            <p className="text-xs text-text-secondary">Spielernennungen → Shots tracken</p>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="mb-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 min-w-max">
          {navItems.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                section === n.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.id === 'counter' && data.currentGame.active && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════ SETUP ════════════ */}
      {section === 'setup' && (
        <div className="space-y-5">
          {/* Shots-Einstellung */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">🥃 Shot-Regel</h3>
            <p className="text-sm text-gray-500 mb-3">Jede wievielte Nennung pro Spieler = 1 Shot?</p>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setMentionsPerShot(n)}
                  className={`w-12 h-12 rounded-xl font-bold text-lg transition-all active:scale-95 ${
                    data.settings.mentionsPerShot === n
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >{n}</button>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Eigener Wert:</span>
                <input
                  type="number" min="1" max="20"
                  value={data.settings.mentionsPerShot}
                  onChange={e => setMentionsPerShot(e.target.value)}
                  className="w-16 h-10 text-center border border-gray-300 rounded-lg text-sm font-bold"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Aktuell: Jede <strong>{data.settings.mentionsPerShot}. Nennung</strong> = 1 Shot 🥃
            </p>
          </div>

          {/* Teilnehmer */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">👥 Teilnehmer
              <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{data.participants.length}</span>
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                value={newParticipant}
                onChange={e => setNewParticipant(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addParticipant()}
                placeholder="Name eingeben…"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={addParticipant}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-lg transition-all"
              >+</button>
            </div>

            <div className="space-y-2">
              {data.participants.map(p => {
                const c = color(p);
                const isEditing = editingParticipant?.id === p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${c.bg} ${c.border}`}>
                    <div className={`w-3 h-3 rounded-full ${c.dot} flex-shrink-0`} />
                    {isEditing ? (
                      <>
                        <input
                          value={editingParticipant.name}
                          onChange={e => setEditingParticipant(ep => ({ ...ep, name: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') confirmRenameParticipant(); if (e.key === 'Escape') setEditingParticipant(null); }}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                          autoFocus
                        />
                        <button onClick={confirmRenameParticipant} className="text-green-600 font-bold px-2">✓</button>
                        <button onClick={() => setEditingParticipant(null)} className="text-gray-400 px-1">✕</button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 font-semibold text-sm ${c.text}`}>{p.name}</span>
                        {data.assignments[p.id] && (
                          <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200 truncate max-w-[90px]">
                            {data.assignments[p.id].playerName}
                          </span>
                        )}
                        <button onClick={() => setEditingParticipant({ id: p.id, name: p.name })} className="text-gray-400 hover:text-gray-700 p-1">✏️</button>
                        <button onClick={() => deleteParticipant(p.id)} className="text-red-400 hover:text-red-600 p-1">🗑️</button>
                      </>
                    )}
                  </div>
                );
              })}
              {data.participants.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Noch keine Teilnehmer – Namen eingeben!</p>
              )}
            </div>
          </div>

          {/* Quick checklist */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-bold text-amber-800 mb-2 text-sm">✅ Checkliste vor dem Spiel</h4>
            {[
              { ok: data.participants.length >= 2, label: `Mindestens 2 Teilnehmer (${data.participants.length})` },
              { ok: activePCount('home') >= 1, label: `Heimteam hat Spieler (${activePCount('home')}/11)` },
              { ok: activePCount('away') >= 1, label: `Auswärtsteam hat Spieler (${activePCount('away')}/11)` },
              { ok: Object.keys(data.assignments).length > 0, label: 'Spieler wurden ausgelost' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm mb-1">
                <span>{item.ok ? '✅' : '⬜'}</span>
                <span className={item.ok ? 'text-green-700' : 'text-gray-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════ AUFSTELLUNGEN ════════════ */}
      {section === 'aufstellung' && (
        <div className="space-y-5">
          {/* Substitution hint */}
          {subState && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-3 text-center">
              <p className="font-bold text-yellow-800 text-sm">
                ⬅️ Einwechslung aktiv – wähle den eingewechselten Spieler aus:
              </p>
              <button onClick={() => setSubState(null)} className="text-xs text-yellow-600 mt-1 underline">Abbrechen</button>
            </div>
          )}

          {/* New player form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">➕ Spieler hinzufügen</h3>
            <div className="flex gap-2 mb-2">
              {['home','away'].map(tid => (
                <button
                  key={tid}
                  onClick={() => setNewPlayer(p => ({ ...p, teamId: tid }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${newPlayer.teamId === tid ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {data.teams[tid].name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPlayer.number}
                onChange={e => setNewPlayer(p => ({ ...p, number: e.target.value }))}
                placeholder="#"
                className="w-14 border border-gray-300 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                value={newPlayer.name}
                onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addPlayerToTeam()}
                placeholder="Spielername…"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={addPlayerToTeam}
                className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white px-4 rounded-xl font-bold text-lg transition-all"
              >+</button>
            </div>
          </div>

          {/* Two teams */}
          {['home','away'].map(teamId => {
            const team = data.teams[teamId];
            const active   = team.players.filter(p => p.active);
            const inactive = team.players.filter(p => !p.active);
            const teamColor = teamId === 'home' ? { hdr:'bg-blue-600', badge:'bg-blue-100 text-blue-700 border-blue-200' } : { hdr:'bg-red-600', badge:'bg-red-100 text-red-700 border-red-200' };
            return (
              <div key={teamId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Team header */}
                <div className={`${teamColor.hdr} p-3 flex items-center gap-2`}>
                  <div className="flex-1">
                    <input
                      value={team.name}
                      onChange={e => setTeamName(teamId, e.target.value)}
                      className="bg-white/20 text-white font-bold rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:bg-white/30 placeholder-white/60"
                      placeholder="Teamname…"
                    />
                  </div>
                  <span className="text-white text-sm font-medium">{active.length}/11</span>
                </div>

                {/* Active players */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Startelf ({active.length})</p>
                  {active.length === 0 && <p className="text-xs text-gray-400 italic mb-2">Noch keine aktiven Spieler</p>}
                  <div className="space-y-1.5">
                    {active.map(pl => {
                      const isEditing = editingPlayer?.id === pl.id && editingPlayer.teamId === teamId;
                      const isSubOut  = subState?.teamId === teamId && subState.outId === pl.id;
                      return (
                        <div key={pl.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${isSubOut ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                          {isEditing ? (
                            <>
                              <input value={editingPlayer.number} onChange={e => setEditingPlayer(ep => ({ ...ep, number: e.target.value }))}
                                className="w-10 border border-gray-300 rounded text-xs text-center px-1 py-1" placeholder="#" />
                              <input value={editingPlayer.name} onChange={e => setEditingPlayer(ep => ({ ...ep, name: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveEditPlayer(); if (e.key === 'Escape') setEditingPlayer(null); }}
                                className="flex-1 border border-gray-300 rounded text-sm px-2 py-1 focus:outline-none" autoFocus />
                              <button onClick={saveEditPlayer} className="text-green-600 font-bold p-1">✓</button>
                              <button onClick={() => setEditingPlayer(null)} className="text-gray-400 p-1">✕</button>
                            </>
                          ) : (
                            <>
                              {pl.number && <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${teamColor.badge}`}>#{pl.number}</span>}
                              <span className="flex-1 text-sm font-medium text-gray-800">{pl.name}</span>
                              {/* Sub-out or normal actions */}
                              {subState?.teamId === teamId && !isSubOut ? (
                                <button onClick={() => completeSub(pl.id)}
                                  className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold">
                                  ⬆️ Rein
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => startSub(teamId, pl.id)} title="Auswechseln"
                                    className="text-xs text-orange-500 hover:text-orange-700 px-1">🔄</button>
                                  <button onClick={() => setEditingPlayer({ teamId, id: pl.id, name: pl.name, number: pl.number || '' })}
                                    className="text-gray-400 hover:text-gray-700 px-1">✏️</button>
                                  <button onClick={() => togglePlayerActive(teamId, pl.id)}
                                    className="text-xs text-yellow-500 hover:text-yellow-700 px-1" title="Deaktivieren">⏸️</button>
                                  <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }}
                                    className="text-red-400 hover:text-red-600 px-1">🗑️</button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bench/inactive */}
                  {inactive.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">Bank / Ausgewechselt ({inactive.length})</p>
                      <div className="space-y-1">
                        {inactive.map(pl => (
                          <div key={pl.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-dashed border-gray-200 opacity-70">
                            {pl.number && <span className="text-xs text-gray-400 font-medium">#{pl.number}</span>}
                            <span className="flex-1 text-sm text-gray-500 line-through">{pl.name}</span>
                            {subState?.teamId === teamId ? (
                              <button onClick={() => completeSub(pl.id)}
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold">⬆️ Rein</button>
                            ) : (
                              <>
                                <button onClick={() => togglePlayerActive(teamId, pl.id)}
                                  className="text-xs text-green-500 hover:text-green-700 px-1" title="Aktivieren">▶️</button>
                                <button onClick={() => { if(window.confirm(`${pl.name} löschen?`)) removePlayer(teamId, pl.id); }}
                                  className="text-red-300 hover:text-red-500 px-1">🗑️</button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════ AUSLOSUNG ════════════ */}
      {section === 'auslosung' && (
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎲</span>
              <span className="font-bold text-amber-800">Spieler auslosen</span>
            </div>
            <p className="text-sm text-amber-700">Jeder Teilnehmer bekommt einen aktiven Spieler aus beiden Teams zufällig zugewiesen.</p>
            <div className="mt-3 flex gap-2 items-center text-sm text-amber-700">
              <span>Aktive Spieler gesamt:</span>
              <span className="font-bold">{allActivePlayers().length}</span>
            </div>
          </div>

          {/* Draw all button */}
          <button
            onClick={drawAll}
            disabled={data.participants.length === 0}
            className="w-full py-4 bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg border-b-4 border-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            🎲 Alle auf einmal auslosen
          </button>

          {/* Per-participant */}
          <div className="space-y-3">
            {data.participants.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">Erst Teilnehmer im Setup anlegen!</p>
            )}
            {data.participants.map(p => {
              const c = color(p);
              const asgn = data.assignments[p.id];
              return (
                <div key={p.id} className={`border-2 rounded-2xl overflow-hidden ${c.border}`}>
                  {/* Participant header */}
                  <div className={`${c.bg} px-4 py-2.5 flex items-center gap-3`}>
                    <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                    <span className={`font-bold text-sm ${c.text}`}>{p.name}</span>
                  </div>
                  {/* Assignment */}
                  <div className="bg-white px-4 py-3">
                    {asgn ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">
                            {asgn.playerNumber ? `#${asgn.playerNumber} ` : ''}{asgn.playerName}
                          </div>
                          <div className="text-xs text-gray-500">{asgn.teamName}</div>
                        </div>
                        <button onClick={() => drawFor(p.id)}
                          className="text-xs bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-700 font-semibold px-3 py-1.5 rounded-lg border border-amber-200 transition-all">
                          🎲 Neu
                        </button>
                        <button onClick={() => clearAssignment(p.id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg border border-gray-200 transition-all">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-gray-400 italic">Noch kein Spieler zugewiesen</span>
                        <button onClick={() => drawFor(p.id)}
                          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                          🎲 Auslosen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Available pool */}
          {allActivePlayers().length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h4 className="font-semibold text-gray-600 text-sm mb-2">🔵 Verfügbare aktive Spieler</h4>
              <div className="flex flex-wrap gap-1.5">
                {allActivePlayers().map(pl => {
                  const taken = assignedPlayerIds().includes(pl.id);
                  return (
                    <span key={pl.id} className={`text-xs px-2 py-1 rounded-full border font-medium ${taken ? 'bg-gray-100 text-gray-400 border-gray-200 line-through' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {pl.number ? `#${pl.number} ` : ''}{pl.name} <span className="opacity-60">({pl.teamName})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ COUNTER ════════════ */}
      {section === 'counter' && (
        <div className="space-y-4">
          {/* Game controls */}
          {!data.currentGame.active ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-4xl mb-3">⏱️</div>
              <p className="text-gray-600 text-sm mb-4">Noch kein aktives Spiel. Auf „Spiel starten" drücken!</p>
              <button
                onClick={startGame}
                disabled={data.participants.length === 0}
                className="w-full py-4 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-lg border-b-4 border-green-800 disabled:opacity-40 transition-all"
              >
                ▶️ Spiel starten
              </button>
            </div>
          ) : (
            <>
              {/* Active game header */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-bold text-green-800">Spiel läuft</span>
                  <span className="text-green-600 ml-2">
                    {new Date(data.currentGame.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                  </span>
                </div>
                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                  {data.currentGame.events.length} Nennungen
                </span>
              </div>

              {/* Shot rule reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 text-center font-medium">
                🥃 Jede <strong>{data.settings.mentionsPerShot}. Nennung</strong> pro Spieler = 1 Shot
              </div>

              {/* Participant cards */}
              <div className="grid grid-cols-1 gap-3">
                {data.participants.map(p => {
                  const asgn  = data.assignments[p.id];
                  const c     = color(p);
                  const ment  = mentionsFor(p.id);
                  const shots = shotsFor(p.id);
                  const isFlashing = shotFlash === p.id;
                  const nextShotIn = asgn ? (data.settings.mentionsPerShot - (ment % data.settings.mentionsPerShot)) : null;

                  return (
                    <div
                      key={p.id}
                      className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${c.border} ${isFlashing ? 'ring-4 ring-red-400 scale-[1.02]' : ''}`}
                    >
                      {/* Flash overlay */}
                      {isFlashing && (
                        <div className="bg-red-500 text-white text-center py-2 font-black text-xl animate-bounce">
                          🥃 TRINKEN! 🥃
                        </div>
                      )}
                      <div className={`px-4 py-2.5 ${c.bg} flex items-center gap-2`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span className={`font-bold text-sm ${c.text} flex-1`}>{p.name}</span>
                        {asgn ? (
                          <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                            {asgn.playerNumber ? `#${asgn.playerNumber} ` : ''}{asgn.playerName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">kein Spieler</span>
                        )}
                      </div>

                      <div className="bg-white px-4 py-3 flex items-center gap-4">
                        {/* Stats */}
                        <div className="flex-1 flex gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black text-gray-800">{ment}</div>
                            <div className="text-xs text-gray-500">Nennungen</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-amber-600">{shots}</div>
                            <div className="text-xs text-gray-500">Shots 🥃</div>
                          </div>
                          {nextShotIn !== null && nextShotIn < data.settings.mentionsPerShot && (
                            <div className="text-center">
                              <div className="text-2xl font-black text-orange-500">{nextShotIn}</div>
                              <div className="text-xs text-gray-500">bis Shot</div>
                            </div>
                          )}
                        </div>
                        {/* Add mention button */}
                        <button
                          onClick={() => addMention(p.id)}
                          disabled={!asgn}
                          className={`w-16 h-16 rounded-2xl text-white font-black text-3xl shadow-lg active:scale-90 transition-all border-b-4 disabled:opacity-30 disabled:cursor-not-allowed ${c.btn}`}
                          style={{ borderBottomColor: 'rgba(0,0,0,0.25)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Undo + End game */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={undoMention}
                  disabled={data.currentGame.events.length === 0}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-medium text-sm border border-gray-300 transition-all active:scale-95"
                >
                  ↩ Rückgängig
                </button>
                <button
                  onClick={() => { if (window.confirm('Spiel beenden und Ergebnis anzeigen?')) endGame(); }}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-sm transition-all border-b-4 border-red-700"
                >
                  🏁 Spiel beenden
                </button>
              </div>

              {/* Recent events */}
              {data.currentGame.events.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-700 text-sm mb-2">📋 Letzte Ereignisse</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {[...data.currentGame.events].reverse().slice(0, 20).map((ev, i) => {
                      const part = data.participants.find(p => p.id === ev.participantId);
                      const c = part ? color(part) : P_COLORS[0];
                      return (
                        <div key={ev.id || i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${ev.shotTriggered ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
                          {ev.shotTriggered && <span className="text-sm">🥃</span>}
                          <div className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                          <span className={`text-xs font-semibold ${c.text}`}>{ev.participantName}</span>
                          <span className="text-xs text-gray-500">→ {ev.playerName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{ev.mentionCount}. Nennung</span>
                          {ev.shotTriggered && <span className="text-xs font-bold text-amber-600">SHOT!</span>}
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

      {/* ════════════ ENDERGEBNIS ════════════ */}
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
                <div className="text-3xl mb-2">🏆</div>
                <div className="font-black text-xl text-amber-800 mb-1">Spielergebnis</div>
                <div className="text-sm text-amber-600">
                  {new Date(lastGame.startedAt).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })}
                  {' · '}
                  {new Date(lastGame.startedAt).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })} –{' '}
                  {new Date(lastGame.endedAt).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })}
                </div>
                <div className="text-xs text-amber-500 mt-1">
                  Jede {lastGame.settings.mentionsPerShot}. Nennung = 1 Shot
                </div>
              </div>

              {/* Sorted podium */}
              {(() => {
                const sorted = [...lastGame.summary].sort((a,b) => b.shots - a.shots || b.mentions - a.mentions);
                return (
                  <div className="space-y-3">
                    {sorted.map((row, i) => {
                      const part = data.participants.find(p => p.id === row.participantId);
                      const c = part ? color(part) : P_COLORS[i % P_COLORS.length];
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                      return (
                        <div key={row.participantId} className={`border-2 rounded-2xl overflow-hidden ${c.border}`}>
                          <div className={`${c.bg} px-4 py-2.5 flex items-center gap-3`}>
                            <span className="text-xl">{medal}</span>
                            <div className={`flex-1 font-bold ${c.text}`}>{row.participantName}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-white border ${c.border} ${c.text} font-medium`}>
                              {row.playerName} · {row.teamName}
                            </span>
                          </div>
                          <div className="bg-white px-4 py-3 flex gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-black text-amber-600">{row.shots}</div>
                              <div className="text-xs text-gray-500">Shots 🥃</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-black text-gray-700">{row.mentions}</div>
                              <div className="text-xs text-gray-500">Nennungen</div>
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
                const playerMentions = {};
                for (const ev of lastGame.events) {
                  if (!playerMentions[ev.playerName]) playerMentions[ev.playerName] = { count: 0, team: ev.teamName };
                  playerMentions[ev.playerName].count++;
                }
                const top = Object.entries(playerMentions).sort((a,b) => b[1].count - a[1].count).slice(0, 5);
                if (!top.length) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">⚽ Meistgenannte Spieler</h4>
                    <div className="space-y-2">
                      {top.map(([name, info], i) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-lg w-6 text-center">{i === 0 ? '🏅' : ''}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800">{name}</span>
                          <span className="text-xs text-gray-500">{info.team}</span>
                          <span className="text-sm font-bold text-blue-600">{info.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* All games history */}
              {data.games.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h4 className="font-bold text-gray-700 mb-3">📜 Alle Spiele ({data.games.length})</h4>
                  <div className="space-y-2">
                    {[...data.games].reverse().map((g, i) => {
                      const totalShots = (g.summary || []).reduce((s, r) => s + r.shots, 0);
                      return (
                        <div key={g.id || i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                          <span className="text-gray-400">#{data.games.length - i}</span>
                          <span className="flex-1 text-gray-700">
                            {new Date(g.startedAt).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' })}
                          </span>
                          <span className="text-amber-600 font-bold">{totalShots} Shots</span>
                          <span className="text-gray-400">{g.events?.length || 0} Nenn.</span>
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

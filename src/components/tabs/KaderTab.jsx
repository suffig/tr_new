import Icon from '../icons/Icon';
import { useMemo, useState } from 'react';
import ZahlFeld from '../ZahlFeld';
import { zahl, alsText, dez } from '../../utils/zahlen';
import { useSupabaseQuery, useSupabaseMutation } from '../../hooks/useSupabase';
import LoadingSpinner from '../LoadingSpinner';
import PlayerDetailModal from '../PlayerDetailModal';
import TeamLogo from '../TeamLogo';
import { POSITIONS } from '../../utils/errorHandling';
import { getTeamDisplay } from '../../constants/teams';
import { useIchBin } from '../../hooks/useIchBin';
import { toreFuerSeite } from '../../utils/spielerBilanz';
import toast from 'react-hot-toast';

export default function KaderTab({ onNavigate, showHints = false }) { // eslint-disable-line no-unused-vars
  // Eine Quelle fuer "wer bin ich und was darf ich" — siehe useIchBin.
  const { darfEintragen: isAdmin } = useIchBin();
  // Ein Team ist sichtbar, nicht drei zugeklappte Karten. Das Akkordeon
  // zeigte im Normalfall NICHTS — man musste erst aufklappen, um einen Kader
  // zu sehen, und konnte immer nur einen offen haben.
  const [aktivesTeam, setAktivesTeam] = useState('AEK');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerDetail, setShowPlayerDetail] = useState(false);
  // Sortierung des Kaders. Aufstellung ist die Voreinstellung — so liest man
  // einen Kader normalerweise (Tor nach vorn), und nur dafuer gibt es die
  // POSITION_ORDER-Tabelle ueberhaupt.
  const [sortierung, setSortierung] = useState('aufstellung');
  
  const { data: players, loading, error, refetch } = useSupabaseQuery('players', '*');
  // Die Torschuetzenlisten — sie sagen als einzige, FUER WEN ein Tor fiel.
  // Gleicher Saison-Umfang wie die Spieler, sonst rechnete man die Listen
  // einer Saison gegen die Torspalte einer anderen.
  const { data: matches } = useSupabaseQuery('matches', 'id,date,goalslista,goalslistb');

  // Einmal je Spieler ausrechnen, nicht je Vergleich.
  //
  // toreFuerSeite() liest fuer jeden Aufruf alle Torschuetzenlisten durch.
  // Direkt im Sortier-Vergleicher aufgerufen sind das bei 903 Spielen und 25
  // Spielern gemessene 151 ms — bei jedem Rendern, also auch bei jedem
  // Tastendruck im Bearbeiten-Feld. Als Map einmal berechnet: rund 36 ms,
  // und nur wenn sich Spieler oder Spiele aendern.
  const toreJeSpieler = useMemo(() => {
    const m = new Map();
    for (const p of players || []) m.set(p.id, toreFuerSeite(matches, p));
    return m;
  }, [players, matches]);
  const toreVon = (p) => toreJeSpieler.get(p?.id) || { tore: p?.goals || 0, fuerAndere: 0, andere: null };
  const { update } = useSupabaseMutation('players');
  
  const POSITION_ORDER = {
    "TH": 0, "IV": 1, "LV": 2, "RV": 3, "ZDM": 4, "ZM": 5,
    "ZOM": 6, "LM": 7, "RM": 8, "LF": 9, "RF": 10, "ST": 11
  };

  // Mannschaftsteil -> Chip-Farbe (die Chip-Klassen sind token-basiert und
  // bringen ihren Dark-Mode selbst mit, siehe modern-design.css).
  const getPositionBadgeClass = (pos) => {
    if (pos === "TH") return "chip chip-green";
    if (["IV", "LV", "RV", "ZDM"].includes(pos)) return "chip chip-blue";
    if (["ZM", "ZOM", "LM", "RM"].includes(pos)) return "chip chip-yellow";
    if (["LF", "RF", "ST"].includes(pos)) return "chip chip-red";
    return "chip chip-gray";
  };

  const SORTIERUNGEN = [
    { id: 'aufstellung', label: 'Aufstellung' },
    { id: 'wert', label: 'Marktwert' },
    { id: 'tore', label: 'Tore' },
    { id: 'name', label: 'Name' },
  ];

  const getTeamPlayers = (teamName) => {
    const eigene = (players || []).filter(p => p.team === teamName);
    const vergleich = {
      aufstellung: (a, b) => (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99),
      wert: (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0),
      // Nach der ANGEZEIGTEN Zahl sortieren, nicht nach der Rohspalte —
      // sonst steht ein Wechsler weiter oben, als seine Zahl hergibt.
      tore: (a, b) => toreVon(b).tore - toreVon(a).tore,
      name: (a, b) => String(a.name).localeCompare(String(b.name), 'de'),
    }[sortierung] || (() => 0);
    // Kopie sortieren: .sort() arbeitet in place und wuerde sonst die Liste
    // aus dem Datenhaken selbst umstellen.
    return [...eigene].sort(vergleich);
  };

  const getTeamSquadValue = (teamName) => {
    if (!players) return 0;
    return players
      .filter(p => p.team === teamName)
      .reduce((sum, p) => sum + (p.value || 0), 0);
  };

  // Millionenbetraege wie im Rest der App: "12,0 Mio €". Hier stand vorher
  // "12.0M €" — Punkt statt Komma und eine Abkuerzung, die es sonst nirgends
  // gibt (Marktwerte, Statistik und Historie schreiben "Mio €").
  const formatCurrencyInMillions = (amount) => `${dez(amount, 1)} Mio €`;

  // Teamfarben aus dem Designsystem statt fester Tailwind-Stufen. Vorher stand
  // hier blue-600/red-400 — andere Farbtoene als die app-weiten system-blue /
  // system-red, und im Dunkelmodus unveraendert, weil sie keine CSS-Variablen
  // sind. AEK ist ueberall blau, Real ueberall rot.
  // Minimal CRUD functions without changing the design
  const handleEditPlayer = async (player) => {
    setEditingPlayer(player);
  };
  
  const handleSavePlayer = async (playerData) => {
    if (!isAdmin) {
      toast.error('Nur der Admin kann Spieler bearbeiten.');
      return;
    }
    try {
      await update(playerData, editingPlayer.id);
      toast.success(`Spieler ${playerData.name} erfolgreich aktualisiert`);
      setEditingPlayer(null);
      refetch();
      window.dispatchEvent(new CustomEvent('fusta-refresh'));
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Spielers: ' + error.message);
    }
  };

  // FIFA functionality
  const handleShowPlayerDetail = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetail(true);
  };

  const handleClosePlayerDetail = () => {
    setShowPlayerDetail(false);
    setSelectedPlayer(null);
  };

  if (loading) {
    return <LoadingSpinner message="Lade Kader..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-system-red mb-4 flex justify-center">
          <Icon name="warning" size={28} strokeWidth={2} />
        </div>
        <p className="text-text-muted mb-4">Fehler beim Laden des Kaders</p>
        <button onClick={refetch} className="btn-primary">
          Erneut versuchen
        </button>
      </div>
    );
  }

  const aekPlayers = getTeamPlayers("AEK");
  const realPlayers = getTeamPlayers("Real");
  const ehemaligePlayers = getTeamPlayers("Ehemalige");

  const teams = [
    { 
      id: 'aek', 
      name: 'AEK', 
      displayName: getTeamDisplay('AEK'), 
      players: aekPlayers,
      squadValue: getTeamSquadValue('AEK'),
      logoComponent: <TeamLogo team="aek" size="xs" />
    },
    { 
      id: 'real', 
      name: 'Real', 
      displayName: getTeamDisplay('Real'), 
      players: realPlayers,
      squadValue: getTeamSquadValue('Real'),
      logoComponent: <TeamLogo team="real" size="xs" />
    },
    { 
      id: 'ehemalige', 
      name: 'Ehemalige', 
      displayName: getTeamDisplay('Ehemalige'), 
      players: ehemaligePlayers,
      squadValue: getTeamSquadValue('Ehemalige'),
      // Kein Emoji: neutrale Icon-Kachel im Stil der beiden Team-Logos
      logoComponent: (
        <span className="w-5 h-5 rounded-full bg-bg-tertiary text-text-tertiary flex items-center justify-center flex-shrink-0">
          <Icon name="users" size={12} strokeWidth={2.2} />
        </span>
      )
    }
  ];

  return (
    <div className="p-4 pb-24 mobile-safe-bottom">

      {(() => {
        const team = teams.find((t) => t.name === aktivesTeam) || teams[0];
        const tore = team.players.reduce((sum, p) => sum + toreVon(p).tore, 0);
        return (
          <>
            {/* Teamauswahl statt drei Akkordeon-Karten. Die Karten zeigten im
                Ausgangszustand nur Namen und mussten einzeln aufgeklappt
                werden, und "Ehemalige" stand gleichrangig neben den beiden
                echten Teams. Hier ist immer genau ein Kader zu sehen. */}
            <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-3">
              {teams.map((t) => {
                const aktiv = t.name === aktivesTeam;
                const farbe = t.name === 'AEK' ? 'text-system-blue'
                  : t.name === 'Real' ? 'text-system-red' : 'text-text-secondary';
                return (
                  <button
                    key={t.id}
                    onClick={() => setAktivesTeam(t.name)}
                    /* Logo ueber dem Namen statt daneben. Nebeneinander blieben
                       dem Namen bei drei gleich breiten Knoepfen 87px, und
                       "Dynamo Dresden" (106px) war abgeschnitten. Gestapelt
                       steht die volle Knopfbreite zur Verfuegung — dasselbe
                       Muster wie in der Hauptnavigation. */
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-caption2 font-semibold transition-colors ${
                      aktiv ? `bg-bg-secondary shadow-sm ${farbe}` : 'text-text-secondary'}`}
                    aria-pressed={aktiv}
                  >
                    {t.logoComponent}
                    <span className="truncate max-w-full">{t.displayName}</span>
                  </button>
                );
              })}
            </div>

            {/* Kopfzahlen des gewaehlten Kaders */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                ['Spieler', team.players.length],
                ['Kaderwert', team.squadValue > 0 ? formatCurrencyInMillions(team.squadValue) : '—'],
                ['Tore', tore],
              ].map(([label, wert]) => (
                <div key={label} className="panel-gray rounded-xl p-2.5 text-center">
                  <div className="stat-display text-[15px] num-tabular text-text-primary truncate">{wert}</div>
                  <div className="text-caption2 text-text-tertiary">{label}</div>
                </div>
              ))}
            </div>

            {/* Sortierung — gilt fuer den gerade gezeigten Kader. */}
            <div className="flex gap-1 p-1 bg-bg-tertiary rounded-xl mb-3">
              {SORTIERUNGEN.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSortierung(o.id)}
                  className={`flex-1 py-1.5 rounded-lg text-caption1 font-semibold transition-colors ${
                    sortierung === o.id ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-secondary'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {team.players.length > 0 ? (
              <div className="space-y-2">
                {team.players.map((player) => (
                  /* Die ganze Zeile oeffnet die Spielerkarte. */
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleShowPlayerDetail(player)}
                    className="w-full modern-card p-3 text-left hover:bg-bg-hover transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary truncate group-hover:text-system-blue transition-colors">
                          {player.name}
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <span className={getPositionBadgeClass(player.position)}>
                            {player.position}
                          </span>
                          {(() => {
                            // Nur die Tore fuer DIESE Seite. Stand hier
                            // player.goals, zeigte ein Wechsler mitten in der
                            // Saison auch das, was er noch beim anderen
                            // geschossen hat.
                            const t = toreVon(player);
                            if (t.tore === 0 && t.fuerAndere === 0) return null;
                            return (
                              <>
                                {t.tore > 0 && (
                                  <span className="text-caption2 text-system-yellow font-medium num-tabular">
                                    {t.tore} {t.tore === 1 ? 'Tor' : 'Tore'}
                                  </span>
                                )}
                                {/* Sonst wirkt die kleinere Zahl wie ein
                                    Fehler — man erinnert sich ja an die
                                    Gesamtausbeute. */}
                                {t.fuerAndere > 0 && (
                                  <span className="text-caption2 text-text-tertiary num-tabular">
                                    +{t.fuerAndere} für {getTeamDisplay(t.andere)}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {player.staerke && (
                            <span className="text-caption2 text-text-tertiary num-tabular">
                              Stärke {player.staerke}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-callout font-semibold text-text-primary num-tabular flex-shrink-0">
                        {(player.value !== null && player.value !== undefined)
                          ? formatCurrencyInMillions(player.value) : '—'}
                      </div>
                      {isAdmin && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleEditPlayer(player); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault(); e.stopPropagation(); handleEditPlayer(player);
                            }
                          }}
                          className="w-11 h-11 flex items-center justify-center text-text-tertiary hover:text-system-green transition-colors rounded-lg flex-shrink-0 cursor-pointer"
                          title="Bearbeiten"
                          aria-label={`${player.name} bearbeiten`}
                        >
                          <Icon name="edit" size={16} strokeWidth={2} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="modern-card p-8 text-center">
                <Icon name="users" size={28} strokeWidth={1.8} className="text-text-tertiary mx-auto mb-2" />
                <p className="text-text-muted">Keine Spieler in {team.displayName}.</p>
              </div>
            )}
          </>
        );
      })()}

      {/* Kader-Management entfernt: Export/Import gibt es im Admin-Bereich
          unter System (dort auch fuer Spiele und Transaktionen, nicht nur
          Spieler), und die "Kader-Analyse" war eine Kurzmeldung mit drei
          Zahlen, die die Marktwert-Ansicht dauerhaft und ausfuehrlicher
          zeigt. */}

      {/* New Feature Modals */}
      {/* Player Detail Modal with FIFA Stats */}
      {showPlayerDetail && selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOpen={showPlayerDetail}
          onClose={handleClosePlayerDetail}
        />
      )}
      
      {/* Player Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {/* bg-bg-elevated statt bg-bg-elevated — die feste Farbe blieb im
              Dunkelmodus weiss. Rundung wie bei den uebrigen Modals. */}
          <div className="bg-bg-elevated border border-border-light rounded-2xl shadow-ios-floating max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="karten-titel">Spieler bearbeiten</h3>
                <button
                  onClick={() => setEditingPlayer(null)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <Icon name="x" size={18} strokeWidth={2.2} />
                </button>
              </div>
              
              <PlayerForm
                player={editingPlayer}
                onSave={handleSavePlayer}
                onCancel={() => setEditingPlayer(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Player form component for editing
function PlayerForm({ player, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: player.name || '',
    position: player.position || '',
    value: alsText(player.value || 0),
    team: player.team || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.position || !formData.team) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    onSave({ ...formData, value: zahl(formData.value) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="form-input"
          placeholder="Spielername"
          required
        />
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Position *
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="form-input"
          required
        >
          <option value="">Position wählen</option>
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Team *
        </label>
        <select
          value={formData.team}
          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          className="form-input"
          required
        >
          <option value="">Team wählen</option>
          <option value="AEK">{getTeamDisplay('AEK')}</option>
          <option value="Real">{getTeamDisplay('Real')}</option>
          <option value="Ehemalige">{getTeamDisplay('Ehemalige')}</option>
        </select>
      </div>
      
      <div>
        <label className="block text-footnote font-medium text-text-secondary mb-1.5">
          Marktwert (in Millionen €)
        </label>
        {/* Der Wert bleibt beim Tippen Text. Vorher stand hier parseFloat im
            onChange — damit liess sich nicht einmal ein Komma oder ein Punkt
            eintippen: "1," wurde sofort wieder zu "1". */}
        <ZahlFeld
          wert={formData.value}
          onChange={(w) => setFormData({ ...formData, value: w })}
          onFocus={(e) => e.target.select()}
          className="form-input"
          placeholder="0,0"
        />
      </div>
      
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
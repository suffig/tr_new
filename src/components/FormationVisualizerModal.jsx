import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Formation Visualizer Component for React
 * Interactive soccer field with drag-and-drop player positioning
 */
export default function FormationVisualizerModal({ onClose, players = [] }) {
  const [selectedFormation, setSelectedFormation] = useState('4-4-2');
  const [fieldPlayers, setFieldPlayers] = useState({});
  const [availablePlayers, setAvailablePlayers] = useState([]);

  // Formation definitions
  const formations = {
    '4-4-2': {
      name: '4-4-2 Classic',
      positions: {
        GK: [{ x: 50, y: 85, id: 'gk1' }],
        CB: [
          { x: 35, y: 70, id: 'cb1' }, 
          { x: 65, y: 70, id: 'cb2' }
        ],
        LB: [{ x: 15, y: 65, id: 'lb1' }],
        RB: [{ x: 85, y: 65, id: 'rb1' }],
        CM: [
          { x: 35, y: 45, id: 'cm1' }, 
          { x: 65, y: 45, id: 'cm2' }
        ],
        LM: [{ x: 20, y: 40, id: 'lm1' }],
        RM: [{ x: 80, y: 40, id: 'rm1' }],
        ST: [
          { x: 40, y: 20, id: 'st1' }, 
          { x: 60, y: 20, id: 'st2' }
        ]
      }
    },
    '4-3-3': {
      name: '4-3-3 Attack',
      positions: {
        GK: [{ x: 50, y: 85, id: 'gk1' }],
        CB: [
          { x: 35, y: 70, id: 'cb1' }, 
          { x: 65, y: 70, id: 'cb2' }
        ],
        LB: [{ x: 15, y: 65, id: 'lb1' }],
        RB: [{ x: 85, y: 65, id: 'rb1' }],
        CDM: [{ x: 50, y: 55, id: 'cdm1' }],
        CM: [
          { x: 30, y: 40, id: 'cm1' }, 
          { x: 70, y: 40, id: 'cm2' }
        ],
        LW: [{ x: 20, y: 25, id: 'lw1' }],
        RW: [{ x: 80, y: 25, id: 'rw1' }],
        ST: [{ x: 50, y: 15, id: 'st1' }]
      }
    },
    '3-5-2': {
      name: '3-5-2 Control',
      positions: {
        GK: [{ x: 50, y: 85, id: 'gk1' }],
        CB: [
          { x: 25, y: 70, id: 'cb1' }, 
          { x: 50, y: 70, id: 'cb2' }, 
          { x: 75, y: 70, id: 'cb3' }
        ],
        LWB: [{ x: 15, y: 45, id: 'lwb1' }],
        RWB: [{ x: 85, y: 45, id: 'rwb1' }],
        CDM: [{ x: 50, y: 50, id: 'cdm1' }],
        CM: [
          { x: 35, y: 40, id: 'cm1' }, 
          { x: 65, y: 40, id: 'cm2' }
        ],
        ST: [
          { x: 40, y: 20, id: 'st1' }, 
          { x: 60, y: 20, id: 'st2' }
        ]
      }
    }
  };

  useEffect(() => {
    setAvailablePlayers([...players]);
    setFieldPlayers({});
  }, [players]);

  const handleFormationChange = (formationKey) => {
    setSelectedFormation(formationKey);
    setFieldPlayers({});
    setAvailablePlayers([...players]);
  };

  const assignPlayerToPosition = (positionId, player) => {
    if (!player) return;

    // Remove player from current position if assigned
    const newFieldPlayers = { ...fieldPlayers };
    Object.keys(newFieldPlayers).forEach(key => {
      if (newFieldPlayers[key]?.id === player.id) {
        delete newFieldPlayers[key];
      }
    });

    // Add player to new position
    newFieldPlayers[positionId] = player;
    setFieldPlayers(newFieldPlayers);

    // Update available players
    setAvailablePlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const removePlayerFromPosition = (positionId) => {
    const player = fieldPlayers[positionId];
    if (!player) return;

    const newFieldPlayers = { ...fieldPlayers };
    delete newFieldPlayers[positionId];
    setFieldPlayers(newFieldPlayers);

    setAvailablePlayers(prev => [...prev, player]);
  };

  const analyzeFormation = () => {
    const assignedPlayers = Object.values(fieldPlayers);
    const totalPlayers = assignedPlayers.length;
    
    if (totalPlayers === 0) {
      return { attack: 0, midfield: 0, defense: 0, overall: 0 };
    }

    // Simple analysis based on position types
    const attackPositions = ['ST', 'LW', 'RW', 'LF', 'RF'];
    const midfieldPositions = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'LWB', 'RWB'];
    const defensePositions = ['CB', 'LB', 'RB', 'GK'];

    const formation = formations[selectedFormation];
    let attackStrength = 0, midfieldStrength = 0, defenseStrength = 0;

    Object.entries(formation.positions).forEach(([posType, positions]) => {
      const positionCount = positions.length;
      
      if (attackPositions.includes(posType)) {
        attackStrength += positionCount;
      } else if (midfieldPositions.includes(posType)) {
        midfieldStrength += positionCount;
      } else if (defensePositions.includes(posType)) {
        defenseStrength += positionCount;
      }
    });

    const total = attackStrength + midfieldStrength + defenseStrength;
    
    return {
      attack: Math.round((attackStrength / total) * 100),
      midfield: Math.round((midfieldStrength / total) * 100),
      defense: Math.round((defenseStrength / total) * 100),
      overall: totalPlayers
    };
  };

  const getPositionColor = (posType) => {
    if (posType === 'GK') return '#10B981'; // green
    if (['CB', 'LB', 'RB'].includes(posType)) return '#3B82F6'; // blue
    if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'LWB', 'RWB'].includes(posType)) return '#F59E0B'; // yellow
    if (['ST', 'LW', 'RW', 'LF', 'RF'].includes(posType)) return '#EF4444'; // red
    return '#6B7280'; // gray
  };

  const exportFormation = () => {
    const formationData = {
      formation: selectedFormation,
      players: fieldPlayers,
      analysis: analyzeFormation(),
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(formationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `formation-${selectedFormation}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast.success('Formation exportiert!');
  };

  const analysis = analyzeFormation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2">
      <div className="bg-bg-secondary rounded-lg w-full max-w-4xl modal-content">
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-text-primary">
              ⚽ Formation Visualizer
            </h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          {/* Formation Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Formation auswählen:
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(formations).map(([key, formation]) => (
                <button
                  key={key}
                  onClick={() => handleFormationChange(key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFormation === key
                      ? 'bg-primary-green text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary'
                  }`}
                >
                  {formation.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Soccer Field */}
            <div className="lg:col-span-2">
              <div className="relative bg-green-600 rounded-lg overflow-hidden" style={{ aspectRatio: '2/3' }}>
                {/* Field markings */}
                <div className="absolute inset-0">
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                  
                  {/* Penalty areas */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-12 border-2 border-white"></div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-12 border-2 border-white"></div>
                  
                  {/* Goals */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-white"></div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-white"></div>
                  
                  {/* Halfway line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
                </div>

                {/* Players */}
                {Object.entries(formations[selectedFormation].positions).map(([posType, positions]) =>
                  positions.map((pos) => {
                    const player = fieldPlayers[pos.id];
                    return (
                      <div
                        key={pos.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                        }}
                        onClick={() => {
                          if (player) {
                            removePlayerFromPosition(pos.id);
                          }
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform group-hover:scale-110"
                          style={{ backgroundColor: getPositionColor(posType) }}
                        >
                          {player ? player.name.slice(0, 2).toUpperCase() : posType}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {player ? player.name : `${posType} Position`}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Available Players */}
              <div>
                <h4 className="font-medium text-text-primary mb-2">
                  Verfügbare Spieler ({availablePlayers.length})
                </h4>
                <div className="bg-bg-tertiary rounded-lg p-3 max-h-48 overflow-y-auto">
                  {availablePlayers.length > 0 ? (
                    <div className="space-y-2">
                      {availablePlayers.map((player) => (
                        <div
                          key={player.id}
                          className="p-2 bg-bg-secondary rounded cursor-pointer hover:bg-bg-primary transition-colors"
                          onClick={() => {
                            // Find first empty position
                            const formation = formations[selectedFormation];
                            const emptyPosition = Object.entries(formation.positions)
                              .flatMap(([posType, positions]) => 
                                positions.map(pos => ({ ...pos, type: posType }))
                              )
                              .find(pos => !fieldPlayers[pos.id]);
                            
                            if (emptyPosition) {
                              assignPlayerToPosition(emptyPosition.id, player);
                            } else {
                              toast.error('Alle Positionen sind besetzt');
                            }
                          }}
                        >
                          <div className="text-sm font-medium text-text-primary">
                            {player.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {player.position} • {player.team}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-text-muted text-sm">
                      Alle Spieler sind aufgestellt
                    </div>
                  )}
                </div>
              </div>

              {/* Formation Analysis */}
              <div>
                <h4 className="font-medium text-text-primary mb-2">Formation Analyse</h4>
                <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Angriff:</span>
                    <span className="font-medium text-red-600">{analysis.attack}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mittelfeld:</span>
                    <span className="font-medium text-yellow-600">{analysis.midfield}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Verteidigung:</span>
                    <span className="font-medium text-blue-600">{analysis.defense}%</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-border-light pt-2">
                    <span>Aufgestellt:</span>
                    <span>{analysis.overall}/11</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={exportFormation}
                  className="w-full btn-primary text-sm py-2"
                  disabled={analysis.overall === 0}
                >
                  📋 Formation exportieren
                </button>
                <button
                  onClick={() => {
                    setFieldPlayers({});
                    setAvailablePlayers([...players]);
                    toast.success('Formation zurückgesetzt');
                  }}
                  className="w-full btn-secondary text-sm py-2"
                >
                  🔄 Zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
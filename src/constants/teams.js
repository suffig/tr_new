export const TEAMS = [
  { value: 'AEK', label: 'AEK Athen', color: 'blue', icon: 'aek' },
  { value: 'Real', label: 'Real Madrid', color: 'red', icon: 'real' },
  { value: 'Ehemalige', label: 'Ehemalige', color: 'gray', icon: '⚫' },
];

export const getTeamDisplay = (teamValue) => {
  const team = TEAMS.find(t => t.value === teamValue);
  return team ? team.label : teamValue;
};

export const getTeamColor = (teamValue) => {
  const team = TEAMS.find(t => t.value === teamValue);
  return team ? team.color : 'gray';
};
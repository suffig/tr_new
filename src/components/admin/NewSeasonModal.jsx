import { useState } from 'react';
import Icon from '../icons/Icon';
import toast from 'react-hot-toast';
import {
  addCustomFifaVersion,
  setCurrentFifaVersion,
  getCurrentFifaVersion,
} from '../../utils/fifaVersionManager';
import { getVersionTeams, setVersionTeams } from '../../utils/versionTeamManager';
import { pushVersionToDB, pushTeamsToDB, setActiveVersionInDB } from '../../utils/fifaVersionsSync';

// One consolidated form to create a new season (= FIFA version): version id,
// display name, both team names/short codes/logos, and the two toggles.
// Replaces the previous flow that split this across "FIFA Versionen" and
// "Versions-Teams". Reuses the existing manager functions, so nothing breaks.

const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

export default function NewSeasonModal({ onClose, onCreated }) {
  const [versionId, setVersionId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teams, setTeams] = useState({
    AEK: { label: '', short: '', logo: null },
    Real: { label: '', short: '', logo: null },
  });
  const [copyPrevious, setCopyPrevious] = useState(false);
  const [setActive, setSetActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const setTeam = (key, patch) => setTeams((t) => ({ ...t, [key]: { ...t[key], ...patch } }));

  const onLogo = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Bitte ein Bild wählen'); return; }
    if (file.size > MAX_LOGO_BYTES) { toast.error('Logo zu groß (max. 1 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setTeam(key, { logo: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = versionId.trim().toUpperCase();
    if (!/^[A-Za-z]+\d*$/.test(id)) {
      toast.error('Versions-ID ungültig (z. B. FC27, EA25)');
      return;
    }
    setLoading(true);
    try {
      // 1) Register the version.
      await addCustomFifaVersion(id, {
        displayName: displayName.trim() || id,
        description: `Saison ${id}`,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
      });

      // 2) Build the team config. Start from a base (previous version if requested,
      //    else the new version's defaults) so color/icon/Ehemalige stay intact,
      //    then override name/short/logo from the form.
      const base = copyPrevious ? getVersionTeams(getCurrentFifaVersion()) : getVersionTeams(id);
      const teamConfig = JSON.parse(JSON.stringify(base));
      for (const key of ['AEK', 'Real']) {
        teamConfig[key] = teamConfig[key] || { color: key === 'AEK' ? 'blue' : 'red', icon: key.toLowerCase(), customIcon: null };
        if (teams[key].label.trim()) teamConfig[key].label = teams[key].label.trim();
        if (teams[key].short.trim()) teamConfig[key].short = teams[key].short.trim();
        if (teams[key].logo) teamConfig[key].customIcon = teams[key].logo;
      }
      setVersionTeams(teamConfig, id);

      // 3) Optionally make it the current season.
      if (setActive) setCurrentFifaVersion(id);

      // 4) Share everything to the DB (best-effort; localStorage already updated).
      await pushVersionToDB(id, { name: displayName.trim() || id, teams: teamConfig });
      await pushTeamsToDB(id, teamConfig);
      if (setActive) await setActiveVersionInDB(id);

      toast.success(`Saison „${displayName.trim() || id}" angelegt`);
      onCreated?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Konnte Saison nicht anlegen');
    } finally {
      setLoading(false);
    }
  };

  const TeamBlock = ({ teamKey, color }) => (
    <div className="modern-card p-4">
      <div className={`text-footnote font-semibold mb-3 ${color === 'blue' ? 'text-system-blue' : 'text-system-red'}`}>
        {color === 'blue' ? 'Team 1 · Blau (AEK)' : 'Team 2 · Rot (Real)'}
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">Anzeigename</label>
            <input className="form-input" value={teams[teamKey].label}
              onChange={(e) => setTeam(teamKey, { label: e.target.value })}
              placeholder={color === 'blue' ? 'z. B. Bayern München' : 'z. B. Dortmund'} disabled={loading} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">Kürzel</label>
            <input className="form-input" value={teams[teamKey].short}
              onChange={(e) => setTeam(teamKey, { short: e.target.value })}
              placeholder={color === 'blue' ? 'FCB' : 'BVB'} disabled={loading} maxLength={6} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-16 h-16 rounded-xl bg-bg-tertiary flex items-center justify-center overflow-hidden border border-border-light">
            {teams[teamKey].logo
              ? <img src={teams[teamKey].logo} alt="Logo" className="w-full h-full object-contain" />
              : <Icon name="users" size={22} className="text-text-tertiary" />}
          </div>
          <label className="text-[11px] font-medium text-system-blue cursor-pointer">
            Logo
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => onLogo(teamKey, e.target.files?.[0])} disabled={loading} />
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-bg-secondary rounded-2xl max-w-md w-full modal-content modal-mobile-safe">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-title3 font-bold text-text-primary">Neue Saison anlegen</h3>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl leading-none" disabled={loading}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Versions-ID *</label>
                <input className="form-input" value={versionId}
                  onChange={(e) => setVersionId(e.target.value)} placeholder="FC27" required disabled={loading} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Anzeige-Name</label>
                <input className="form-input" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)} placeholder="Saison 3 · FC27" disabled={loading} />
              </div>
            </div>

            <TeamBlock teamKey="AEK" color="blue" />
            <TeamBlock teamKey="Real" color="red" />

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={copyPrevious} onChange={(e) => setCopyPrevious(e.target.checked)} disabled={loading} />
              Team-Einstellungen der aktuellen Saison als Basis übernehmen
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={setActive} onChange={(e) => setSetActive(e.target.checked)} disabled={loading} />
              Sofort als aktuelle Saison setzen
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} disabled={loading}
                className="flex-1 px-4 py-2 rounded-xl border border-border-light text-text-secondary hover:bg-bg-tertiary transition-colors">
                Abbrechen
              </button>
              <button type="submit" disabled={loading || !versionId.trim()}
                className="flex-1 btn-primary disabled:opacity-50">
                {loading ? 'Wird angelegt…' : 'Saison anlegen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

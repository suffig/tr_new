import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './icons/Icon';

export default function UserProfile({ onClose, onNavigate }) {
  const { user } = useAuth();
  const { isDark, setManualTheme } = useTheme();
  const [preferences, setPreferences] = useState({
    favoriteTeam: localStorage.getItem('userFavoriteTeam') || '',
    notifications: localStorage.getItem('userNotifications') !== 'false',
    compactView: localStorage.getItem('compactView') === 'true',
  });

  // Default favourite team based on the logged-in account
  useEffect(() => {
    if (user?.email && !localStorage.getItem('userFavoriteTeam')) {
      let fav = '';
      if (user.email === 'philip-melchert@live.de') fav = 'Real';
      else if (user.email === 'alexander.lueckmann@web.de') fav = 'AEK';
      if (fav) {
        localStorage.setItem('userFavoriteTeam', fav);
        setPreferences((prev) => ({ ...prev, favoriteTeam: fav }));
      }
    }
  }, [user?.email]);

  const teams = [
    { value: '', label: 'Kein Favorit' },
    { value: 'AEK', label: 'AEK' },
    { value: 'Real', label: 'Real' },
    { value: 'Ehemalige', label: 'Ehemalige' },
  ];

  const setPref = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    const lsKey = key === 'favoriteTeam' ? 'userFavoriteTeam'
      : key === 'notifications' ? 'userNotifications' : 'compactView';
    localStorage.setItem(lsKey, value.toString());
    window.dispatchEvent(new CustomEvent('userPreferencesChanged', { detail: { [key]: value } }));
  };

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '—';
  const email = user?.email || '—';

  const go = (tab) => { onNavigate(tab); onClose(); };

  return (
    <div className="fixed inset-0 bg-bg-overlay backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-bg-primary border border-border-light w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-bg-primary/90 backdrop-blur z-10 border-b border-separator">
          <h2 className="text-lg font-bold text-text-primary">Profil</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            aria-label="Schließen"
          >
            <Icon name="x" size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Account identity */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-system-green to-system-blue flex items-center justify-center text-white">
              <Icon name="user" size={26} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-text-primary truncate">{email}</div>
              <div className="text-xs text-text-muted">Mitglied seit {memberSince}</div>
            </div>
          </div>

          {/* Settings — grouped iOS list */}
          <div>
            <div className="section-label">Einstellungen</div>
            <div className="modern-card p-0 overflow-hidden divide-y divide-separator">
              {/* Favourite team */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-system-green/12 text-system-green flex items-center justify-center flex-shrink-0">
                    <Icon name="trophy" size={18} strokeWidth={2.1} />
                  </span>
                  <span className="text-sm font-medium text-text-primary">Lieblingsverein</span>
                </div>
                <select
                  value={preferences.favoriteTeam}
                  onChange={(e) => setPref('favoriteTeam', e.target.value)}
                  className="bg-bg-tertiary border border-border-light rounded-lg text-sm text-text-primary px-2 py-1.5 focus:outline-none"
                >
                  {teams.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Dark mode */}
              <SettingRow icon="moon" iconClass="bg-system-indigo/12 text-system-indigo" title="Dunkler Modus" subtitle="Schont die Augen bei wenig Licht">
                <AppleSwitch checked={isDark} onChange={(v) => setManualTheme(v ? 'dark' : 'light')} />
              </SettingRow>

              {/* Notifications */}
              <SettingRow icon="bell" iconClass="bg-system-orange/12 text-system-orange" title="Benachrichtigungen" subtitle="Push-Nachrichten für Spiele & Events">
                <AppleSwitch checked={preferences.notifications} onChange={(v) => setPref('notifications', v)} />
              </SettingRow>

              {/* Compact view */}
              <SettingRow icon="phone" iconClass="bg-system-teal/12 text-system-teal" title="Kompakte Ansicht" subtitle="Mehr Inhalt auf kleinen Bildschirmen">
                <AppleSwitch checked={preferences.compactView} onChange={(v) => setPref('compactView', v)} />
              </SettingRow>
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <div className="section-label">Schnellzugriff</div>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon="chart" label="Statistiken" onClick={() => go('stats')} />
              <QuickAction icon="football" label="Spiele" onClick={() => go('matches')} />
              <QuickAction icon="users" label="Kader" onClick={() => go('squad')} />
              <QuickAction icon="euro" label="Finanzen" onClick={() => go('finanzen')} />
            </div>
          </div>

          <p className="text-center text-[11px] text-text-tertiary pt-1">FUSTA · FIFA Statistik-Tracker</p>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon, iconClass, title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          <Icon name={icon} size={18} strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-primary">{title}</div>
          <div className="text-xs text-text-muted">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-3 rounded-xl bg-bg-secondary border border-border-light hover:bg-bg-tertiary transition-colors press-scale"
    >
      <span className="text-text-secondary"><Icon name={icon} size={18} strokeWidth={2} /></span>
      <span className="text-sm font-medium text-text-primary">{label}</span>
    </button>
  );
}

function AppleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-system-green' : 'bg-border-strong'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

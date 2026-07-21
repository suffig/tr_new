import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { getAvailableSeasons, switchToSeason, SEASONS } from '../utils/seasonManager.js';
import { isPushSupported, getPushEnabled, enablePush, disablePush } from '../utils/notifications.js';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';

export default function UserProfile({ onClose, onNavigate }) {
  const { user } = useAuth();
  const { isDark, setManualTheme } = useTheme();
  const [seasons, setSeasons] = useState([]);
  useEffect(() => { setSeasons(getAvailableSeasons()); }, []);
  const [pushOn, setPushOn] = useState(getPushEnabled());
  // Startansicht: 'last' behaelt das bisherige Verhalten (zuletzt benutzter Tab)
  const [startTab, setStartTab] = useState(() => {
    try { return localStorage.getItem('fusta_start_tab') || 'last'; } catch { return 'last'; }
  });
  const togglePush = async (v) => {
    if (v) setPushOn(await enablePush());
    else { disablePush(); setPushOn(false); }
  };

  // Nächster Spieltag (Reminder beim Öffnen der App am Spieltag)
  const [matchday, setMatchday] = useState(() => {
    try { return localStorage.getItem('fusta_next_matchday') || ''; } catch { return ''; }
  });
  const saveMatchday = (v) => {
    setMatchday(v);
    try {
      if (v) localStorage.setItem('fusta_next_matchday', v);
      else { localStorage.removeItem('fusta_next_matchday'); localStorage.removeItem('fusta_matchday_notified'); }
    } catch { /* ignore */ }
  };

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '—';
  const email = user?.email || '—';
  // Nur Tabs anbieten, die dieser Nutzer auch sehen darf
  const startTabOptions = getVisibleTabs(user).map((t) => ({ id: t.id, label: t.label }));

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
              {/* Dark mode */}
              <SettingRow icon="moon" iconClass="bg-system-indigo/12 text-system-indigo" title="Dunkler Modus" subtitle="Schont die Augen bei wenig Licht">
                <AppleSwitch checked={isDark} onChange={(v) => setManualTheme(v ? 'dark' : 'light')} />
              </SettingRow>

              {/* Push notifications */}
              {isPushSupported() && (
                <SettingRow icon="bell" iconClass="bg-system-orange/12 text-system-orange" title="Push-Benachrichtigungen" subtitle="Bei neuen Spielen & Transaktionen">
                  <AppleSwitch checked={pushOn} onChange={togglePush} />
                </SettingRow>
              )}

              {/* Startansicht */}
              <SettingRow icon="grid" iconClass="bg-system-blue/12 text-system-blue" title="Startansicht" subtitle="Womit die App sich öffnet">
                <select
                  value={startTab}
                  onChange={(e) => {
                    setStartTab(e.target.value);
                    try { localStorage.setItem('fusta_start_tab', e.target.value); } catch { /* ignore */ }
                  }}
                  className="bg-bg-tertiary text-text-primary text-footnote font-medium rounded-lg px-2 py-1.5 border border-border-light max-w-[9.5rem]"
                >
                  <option value="last">Zuletzt benutzt</option>
                  {startTabOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </SettingRow>
            </div>
          </div>

          {/* Season / FIFA version */}
          {seasons.length > 0 && (
            <div>
              <div className="section-label">Saison</div>
              <div className="modern-card">
                <div className="grid grid-cols-2 gap-2">
                  {seasons.map((s) => {
                    const short = s.id === SEASONS.LEGACY ? 'FC25' : 'FC26';
                    return (
                      <button
                        key={s.id}
                        onClick={() => { if (!s.isActive) switchToSeason(s.id); }}
                        disabled={s.isActive}
                        className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${s.isActive ? 'bg-system-green text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
                      >
                        <span>{short}</span>
                        <span className={`text-[10px] font-medium ${s.isActive ? 'text-white/80' : 'text-text-tertiary'}`}>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-text-tertiary text-center mt-2">Wechsel lädt die App neu · Daten je Saison getrennt</p>
              </div>
            </div>
          )}

          {/* Nächster Spieltag */}
          <div>
            <div className="section-label">Nächster Spieltag</div>
            <div className="modern-card p-3">
              <input
                type="date"
                value={matchday}
                onChange={(e) => saveMatchday(e.target.value)}
                className="form-input"
              />
              <p className="text-[11px] text-text-tertiary text-center mt-2">
                {matchday ? 'Am Spieltag begrüßt dich die App mit einem Reminder.' : 'Datum setzen → Reminder beim Öffnen am Spieltag.'}
              </p>
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

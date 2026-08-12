import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { getAvailableSeasons, switchToSeason, SEASONS } from '../utils/seasonManager.js';
import { isPushSupported, getPushEnabled, enablePush, disablePush } from '../utils/notifications.js';
import Icon from './icons/Icon';
import { getVisibleTabs } from '../constants/navigation';
import { useIchBin } from '../hooks/useIchBin';

export default function UserProfile({ onClose, onNavigate }) {
  const { user, signOut } = useAuth();
  const { istAdmin, name: ichHeisse, bekannt } = useIchBin();
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
  const startTabOptions = getVisibleTabs().map((t) => ({ id: t.id, label: t.label }));

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
              {/* Hier stand die E-MAIL an der Stelle des Namens. Die App kennt
                  die richtigen Namen laengst — sie stehen in `manager`, und
                  Startseite wie Duell holen sie sich von dort. Nur dieses
                  Menue, das einzige, wo "wer bin ich" die eigentliche Frage
                  ist, zeigte "philip-melchert@live.de". */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-text-primary truncate">
                  {ichHeisse || 'Wird geladen…'}
                </span>
                {istAdmin && (
                  <span className="chip chip-sm chip-blue flex-shrink-0">Admin</span>
                )}
              </div>
              {/* Erst zeigen, wenn es etwas zu zeigen gibt — "—" sah aus wie
                  eine Angabe, die fehlt, war aber nur der Ladezustand. */}
              {bekannt && (
                <>
                  <div className="text-xs text-text-muted truncate">{email}</div>
                  <div className="text-xs text-text-muted">Mitglied seit {memberSince}</div>
                </>
              )}
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

          {/* Der Schnellzugriff stand hier als Raster aus sechs Kacheln:
              Spiele, Kader, Sperren, Teams, Alkohol, Saufen. Alle sechs sind
              ueber die untere Leiste in ein bis zwei Tipps erreichbar, und
              seit es die Startseite gibt, fuehrt auch die schon dorthin. Ein
              zweiter Weg zum selben Ort macht das Menue nur laenger.

              Die Verwaltung bleibt — sie ist der einzige Zugang, seit sie
              nicht mehr in der Leiste steht. */}
          {istAdmin && (
            <div>
              <div className="section-label">Verwaltung</div>
              <div className="modern-card p-0 overflow-hidden">
                <button onClick={() => go('admin')}
                        className="w-full flex items-center gap-3 p-3 text-left active:bg-bg-tertiary/50 transition-colors">
                  <span className="w-9 h-9 rounded-xl bg-system-blue/12 text-system-blue flex items-center justify-center flex-shrink-0">
                    <Icon name="settings" size={18} strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text-primary">Verwaltung</span>
                    <span className="block text-xs text-text-muted">
                      Spiele, Spieler, Sperren und Buchungen eintragen
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-text-tertiary flex-shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* Abmelden.
              Es lag bisher AUSSCHLIESSLICH im Verwaltungsbereich — und den
              erreicht seit der Rechtevergabe nur noch Philip. Alexander
              konnte sich damit gar nicht mehr abmelden. Unten und dezent,
              weil man es selten braucht, aber es muss da sein. */}
          <button
            onClick={async () => { try { await signOut(); } catch { /* Sitzung ist so oder so weg */ } onClose(); }}
            className="w-full modern-card p-3 text-center text-system-red font-medium active:bg-bg-tertiary/50 transition-colors"
          >
            Abmelden
          </button>

          {/* Quellenangabe, um die footylogos.com bittet ("Credit
              FootyLogos.com as the source"). Die Wappen liegen als SVG in
              public/logos/, geholt mit scripts/wappen-holen.mjs. */}
          <p className="text-center text-[11px] text-text-tertiary pt-1">
            FUSTA · FIFA Statistik-Tracker
            <span className="block mt-0.5">Vereinswappen: FootyLogos.com</span>
          </p>
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
      <span className={`inline-block h-5 w-5 transform rounded-full bg-bg-elevated transition-transform shadow ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

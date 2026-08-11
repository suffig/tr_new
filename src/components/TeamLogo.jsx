import { getVersionTeamDisplay } from '../utils/versionTeamManager.js';
import { getCurrentFifaVersion } from '../utils/fifaVersionManager.js';
import { wappenPfad } from '../constants/wappenKatalog.js';

/**
 * Das Wappen einer Seite.
 *
 * Vier Quellen, in dieser Reihenfolge:
 *
 * 1. `wappen` — ein Slug aus dem Katalog (siehe scripts/wappen-holen.mjs).
 *    Steht in der Saison-Konfiguration und damit in fifa_versions.teams, also
 *    in der gemeinsamen Datenbank: was hier eingestellt wird, sehen beide.
 * 2. `customIcon` — ein selbst hochgeladenes Bild als base64. Liegt nur im
 *    localStorage des Geräts, auf dem es hochgeladen wurde. Bleibt als Weg für
 *    Vereine, die es bei footylogos nicht gibt.
 * 3. Die vier mitgelieferten PNGs für AEK/Real in FC25 und FC26 — die gab es
 *    vor dem Katalog und sie bleiben, damit nichts umkippt.
 * 4. Ein Emoji, wenn gar nichts da ist.
 */
export default function TeamLogo({ team, size = 'md', className = '', version = null }) {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16',
  };

  const fifaVersion = version || getCurrentFifaVersion();
  const teamDisplay = getVersionTeamDisplay(team, fifaVersion);

  const ersatzEmoji = () => {
    const eigenes = teamDisplay.icon;
    if (typeof eigenes === 'string' && !eigenes.startsWith('data:') && !/^[a-z]+$/.test(eigenes)) {
      return eigenes;
    }
    const t = team?.toLowerCase();
    return t === 'aek' ? '🔵' : t === 'real' ? '🔴' : '⚽';
  };

  const quelle = (() => {
    const ausKatalog = wappenPfad(teamDisplay.wappen);
    if (ausKatalog) return ausKatalog;

    if (teamDisplay.icon && teamDisplay.icon.startsWith('data:')) return teamDisplay.icon;

    switch (team?.toLowerCase()) {
      case 'aek':
        return `${import.meta.env.BASE_URL}${fifaVersion === 'FC26' ? 'dynamo' : 'aek'}_logo_transparent.png`;
      case 'real':
        return `${import.meta.env.BASE_URL}${fifaVersion === 'FC26' ? 'schalke' : 'real'}_logo_transparent.png`;
      default:
        return null;
    }
  })();

  if (!quelle) return <span className={className}>{ersatzEmoji()}</span>;

  return (
    <img
      src={quelle}
      // Der Vereinsname als Alternativtext, nicht "AEK Logo": an den meisten
      // Stellen steht der Name daneben, dort ist es eine Wiederholung — aber
      // an den wenigen, wo das Wappen allein steht, waere ein leerer Text ein
      // Informationsverlust. Die harmlosere Seite gewinnt.
      alt={teamDisplay.label || team || ''}
      className={`${sizes[size]} object-contain ${className}`}
      onError={(e) => {
        // Fehlt die Datei, das Emoji zeigen statt eines kaputten Bildes.
        e.target.outerHTML = `<span class="${className}">${ersatzEmoji()}</span>`;
      }}
    />
  );
}

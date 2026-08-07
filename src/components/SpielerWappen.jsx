import Icon from './icons/Icon';
import TeamLogo from './TeamLogo';

/**
 * Wappen zu einem Spieler — mit einem eigenen Platzhalter für "Ehemalige".
 *
 * Vorher stand an drei Stellen dieselbe Zeile:
 *     team === 'AEK' ? 'aek' : team === 'Real' ? 'real' : 'aek'
 * Ehemalige bekamen dadurch das AEK-Wappen und sahen aus, als stünden sie
 * bei Alexander unter Vertrag. Seit dem Import der Altsaisons betrifft das
 * über hundert Spieler.
 */
export default function SpielerWappen({ team, version, size = 'xs', className = '' }) {
  if (team === 'AEK' || team === 'Real') {
    return (
      <TeamLogo team={team === 'AEK' ? 'aek' : 'real'} size={size} version={version}
                className={className} />
    );
  }

  // Alles andere — "Ehemalige" oder gar kein Team — bekommt ein neutrales
  // Zeichen statt eines fremden Vereinswappens.
  const px = { xs: 20, sm: 24, md: 32, lg: 40 }[size] || 20;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-bg-tertiary text-text-tertiary flex-shrink-0 ${className}`}
      style={{ width: px, height: px }}
      title={team || 'Ohne Team'}
      aria-label={team || 'Ohne Team'}
    >
      <Icon name="user" size={Math.round(px * 0.6)} strokeWidth={2.2} />
    </span>
  );
}

# Altes FUSTA-Logo (grünes Wappen)

Hier liegt das Logo, das bis zum 31.07.2026 in Gebrauch war — grünes Wappen mit
Bierkrug und Balkendiagramm. Ersetzt wurde es durch das runde Motiv
„FUSTA · Sports & Brews".

## Inhalt

| Datei | wofür |
|---|---|
| `icon-180.png` | Favicon + Apple-Touch-Icon |
| `icon-192.png` | PWA-Manifest |
| `icon-512.png` | PWA-Manifest |
| `logo-fusta.png` | Logo in der App (Kopfzeile, Anmeldung) |
| `splash/` | 36 iOS-Startbilder |

## Zurücksetzen

Aus dem Projektwurzelverzeichnis:

```bash
cp public/assets/logo-alt/*.png public/assets/ && cp public/assets/logo-alt/splash/*.png public/assets/splash/
```

Danach neu bauen (`npm run build`). Auf dem Telefon muss die PWA einmal entfernt
und neu zum Startbildschirm hinzugefügt werden — iOS behält Icon und Startbild
sonst hartnäckig im Zwischenspeicher.

**Nicht vergessen:** Kopfzeile und Anmeldung zeigen das Logo seit dem Wechsel
formatfüllend in einer abgerundeten Kachel (`object-cover`). Das alte Logo war
kleiner auf eine grün-blaue Verlaufsfläche gesetzt. Beim Zurücksetzen also auch
`src/components/Header.jsx`, `src/components/Login.jsx` und `.logo-glow` in
`src/styles/modern-design.css` zurückdrehen — im Git-Verlauf steht der alte
Stand, Suchwort „from-system-green to-system-blue".

## Ein anderes Logo einsetzen

Quelle nach `public/assets/logo-quelle.png` legen (quadratisch, mindestens
512 px) und einmal laufen lassen:

```bash
node scripts/logo-erzeugen.mjs
```

Das erzeugt alle Icons und Startbilder neu. Vorher wie oben sichern.

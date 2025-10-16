# Rangers Logo Installation Guide

## Schnellanleitung (Quick Guide)

Das Rangers Logo kann auf **zwei Wege** hinzugefügt werden:

### Option 1: Über die Admin-Oberfläche (Empfohlen)

1. **Logo herunterladen**
   - Logo-URL: https://github.com/user-attachments/assets/37a6efbc-9b03-4091-a0fd-b3664ff50508
   - Rechtsklick → "Bild speichern unter..." → `rangers_logo.png`

2. **Logo hochladen**
   - Öffnen Sie die Anwendung
   - Gehen Sie zu: **Admin** → **Version Team Settings**
   - Wählen Sie **FC26** aus der Version-Liste
   - Beim "Real" Team (wird als "Rangers" angezeigt):
     - Klicken Sie auf "Choose File" / "Datei auswählen"
     - Wählen Sie das heruntergeladene `rangers_logo.png`
     - Das Logo wird automatisch hochgeladen und gespeichert

3. **Verifizierung**
   - Das Logo sollte sofort in der Vorschau sichtbar sein
   - Navigieren Sie zu anderen Tabs (Kader, Statistiken, etc.)
   - Das Rangers Logo wird überall angezeigt, wo FC26 als Version aktiv ist

### Option 2: Manuell in das Repository hinzufügen

Falls Sie das Logo direkt ins Repository hinzufügen möchten:

1. **Logo herunterladen**
   - Logo-URL: https://github.com/user-attachments/assets/37a6efbc-9b03-4091-a0fd-b3664ff50508
   - Speichern Sie es als `rangers_logo_transparent.png`

2. **Logo ins Repository kopieren**
   ```bash
   # Kopieren Sie die Datei ins Root-Verzeichnis
   cp /pfad/zu/rangers_logo_transparent.png /home/runner/work/tr_new/tr_new/
   
   # Oder ins public Verzeichnis (empfohlen für Build)
   cp /pfad/zu/rangers_logo_transparent.png /home/runner/work/tr_new/tr_new/public/
   ```

3. **TeamLogo Component aktualisieren** (optional)
   
   Falls Sie das Logo als Standard für FC26 verwenden möchten, können Sie die Komponente erweitern:
   
   ```javascript
   // In src/components/TeamLogo.jsx
   const getLogoSrc = (teamName) => {
     const fifaVersion = version || getCurrentFifaVersion();
     const teamDisplay = getVersionTeamDisplay(teamName, fifaVersion);
     
     // Custom icon check
     if (teamDisplay.icon && teamDisplay.icon.startsWith('data:')) {
       return teamDisplay.icon;
     }
     
     // Default logos with version awareness
     switch (teamName?.toLowerCase()) {
       case 'aek':
         return '/tr_new/aek_logo_transparent.png';
       case 'real':
         // Use Rangers logo for FC26, Real Madrid logo for FC25
         if (fifaVersion === 'FC26') {
           return '/tr_new/rangers_logo_transparent.png';
         }
         return '/tr_new/real_logo_transparent.png';
       default:
         return null;
     }
   };
   ```

## Logo-Spezifikationen

Das bereitgestellte Rangers Logo:
- **Format**: PNG mit Transparenz
- **Farben**: Blau (#003478) und Rot (#E62333)
- **Design**: Klassisches Rangers FC Logo mit Löwe
- **Text**: "RANGERS FOOTBALL CLUB" und "READY"
- **Größe**: Optimal für Web-Anwendung

## Fehlerbehebung

### Logo wird nicht angezeigt
1. **Browser-Cache leeren**
   - Strg + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

2. **Überprüfen Sie die Version**
   - Stellen Sie sicher, dass **FC26** als aktive Version ausgewählt ist
   - Admin → FIFA Version Manager → FC26

3. **Logo-Upload wiederholen**
   - Gehen Sie zu Admin → Version Team Settings
   - Wählen Sie FC26
   - Entfernen Sie das alte Logo (falls vorhanden)
   - Laden Sie das Rangers Logo erneut hoch

### Logo ist zu groß/klein
Das Logo passt sich automatisch an:
- Kader-Tab: Medium (w-8 h-8)
- Match-Anzeige: Large (w-10 h-10)
- Statistiken: Small (w-6 h-6)

Sie können die Größe nicht manuell ändern, aber das Logo wird proportional skaliert.

### Logo-Qualität ist schlecht
Falls die Qualität nach dem Upload schlecht ist:
1. Speichern Sie das Original-Logo in hoher Qualität
2. Verkleinern Sie es auf max. 512x512 Pixel
3. Laden Sie die optimierte Version hoch

## Technische Details

### Speicherort
- **localStorage**: Logo wird als base64 in localStorage gespeichert
- **Key**: `fifa_version_icons` → `FC26` → `Real`
- **Größenbegrenzung**: 2MB (localStorage-Limit)

### Logo-Verarbeitung
```javascript
// Das Logo wird beim Upload in base64 konvertiert
uploadTeamIcon('Real', file, 'FC26')
  → Reader.readAsDataURL(file)
  → localStorage.setItem('fifa_version_icons', { FC26: { Real: { data: base64 } } })
```

### Version-Erkennung
```javascript
// Das System erkennt automatisch die Version
getCurrentFifaVersion() === 'FC26'
  → getVersionTeamDisplay('Real', 'FC26')
  → { label: 'Rangers', icon: 'real', customIcon: base64Data }
  → TeamLogo zeigt customIcon an
```

## Alternative: Programmatisches Hinzufügen

Falls Sie das Logo programmatisch hinzufügen möchten:

```javascript
// In der Browser-Konsole ausführen
const logoUrl = 'https://github.com/user-attachments/assets/37a6efbc-9b03-4091-a0fd-b3664ff50508';

// Logo als base64 konvertieren
fetch(logoUrl)
  .then(res => res.blob())
  .then(blob => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      
      // In localStorage speichern
      const icons = JSON.parse(localStorage.getItem('fifa_version_icons') || '{}');
      if (!icons.FC26) icons.FC26 = {};
      icons.FC26.Real = {
        data: base64,
        filename: 'rangers_logo.png',
        uploadedAt: new Date().toISOString()
      };
      localStorage.setItem('fifa_version_icons', JSON.stringify(icons));
      
      // Teams aktualisieren
      const teams = JSON.parse(localStorage.getItem('fifa_version_teams') || '{}');
      if (!teams.FC26) teams.FC26 = {
        AEK: { label: 'AEK Athen', color: 'blue', icon: 'aek', customIcon: null },
        Real: { label: 'Rangers', color: 'red', icon: 'real', customIcon: null },
        Ehemalige: { label: 'Ehemalige', color: 'gray', icon: '⚫', customIcon: null }
      };
      teams.FC26.Real.customIcon = base64;
      localStorage.setItem('fifa_version_teams', JSON.stringify(teams));
      
      alert('Rangers Logo erfolgreich hinzugefügt!');
      location.reload();
    };
    reader.readAsDataURL(blob);
  });
```

## Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Browser-Konsole auf Fehler
2. Stellen Sie sicher, dass localStorage aktiviert ist
3. Versuchen Sie es in einem Inkognito-Fenster
4. Erstellen Sie ein Issue im Repository

---

**Status**: Logo bereitgestellt ✅  
**Nächster Schritt**: Logo über Admin-Panel hochladen

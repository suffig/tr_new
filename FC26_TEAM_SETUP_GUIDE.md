# FC26 Team Setup Guide - Rangers Konfiguration

## Übersicht

Für die FC26 Season wurde das System erweitert, um versions-spezifische Team-Namen und Logos zu unterstützen. Das bedeutet, dass "Real Madrid" in FC25 als "Rangers" in FC26 angezeigt werden kann, während die Datenbank-Struktur konsistent bleibt.

## Automatische Änderungen

Das System erkennt automatisch die aktuelle FIFA-Version und passt die Team-Namen entsprechend an:

- **FC25 (Legacy)**: Team "Real" wird als "Real Madrid" angezeigt
- **FC26 (Aktuell)**: Team "Real" wird als "Rangers" angezeigt

Die Team-Keys in der Datenbank bleiben unverändert ('AEK', 'Real', 'Ehemalige'), nur die Anzeigenamen ändern sich.

## Rangers Logo hochladen

Um das Rangers Logo für FC26 hochzuladen, folgen Sie diesen Schritten:

**Hinweis**: Das Rangers Logo wurde bereitgestellt! Detaillierte Anweisungen finden Sie in **RANGERS_LOGO_INSTALLATION.md**.

### Schnellanleitung

1. **Logo herunterladen**
   - URL: https://github.com/user-attachments/assets/37a6efbc-9b03-4091-a0fd-b3664ff50508
   - Rechtsklick → "Bild speichern unter..." → Speichern als PNG

### Schritt 1: Zum Admin-Bereich navigieren
1. Öffnen Sie die Anwendung
2. Navigieren Sie zum **Admin**-Tab

### Schritt 2: Version Team Settings öffnen
1. Wählen Sie im Admin-Tab **"Version Team Settings"** aus
2. Dies öffnet die versions-spezifische Team-Konfiguration

### Schritt 3: FC26 Version auswählen
1. In der Version-Auswahl, klicken Sie auf **"FC26"**
2. Der Bereich sollte nun die Team-Konfiguration für FC26 anzeigen

### Schritt 4: Rangers Logo hochladen
1. Scrollen Sie zum "Real" Team-Eintrag
2. Sie sehen, dass der Team-Name bereits als "Rangers" angezeigt wird
3. Unter "Icon hochladen" klicken Sie auf **"Choose File"** oder **"Datei auswählen"**
4. Wählen Sie Ihr Rangers Logo aus (PNG, JPG oder GIF, max. 2MB)
5. Das Logo wird automatisch hochgeladen und gespeichert

### Schritt 5: Überprüfung
- Das hochgeladene Logo sollte sofort in der Vorschau sichtbar sein
- Navigieren Sie zu anderen Tabs (Kader, Statistiken, etc.), um zu sehen, dass das Logo überall angezeigt wird

## Technische Details

### Datenbank-Konsistenz
- Die Datenbank speichert weiterhin 'Real' als Team-Key
- Alle historischen Daten bleiben unverändert
- Nur die Anzeige-Layer wurde angepasst

### Versions-Umschaltung
- Wenn Sie zwischen FC25 und FC26 wechseln, werden automatisch die entsprechenden Team-Namen und Logos geladen
- FC25: Real Madrid Logo (existierendes Logo)
- FC26: Rangers Logo (nach dem Upload)

### Team-Namen anpassen
Falls Sie den Team-Namen ändern möchten:

1. Gehen Sie zu **Admin > Version Team Settings**
2. Wählen Sie **FC26**
3. Bei der "Real" Team-Konfiguration, ändern Sie das Feld **"Team-Name"**
4. Klicken Sie auf **"Änderungen speichern"**

### Logo entfernen
Um ein hochgeladenes Logo zu entfernen:

1. Gehen Sie zu **Admin > Version Team Settings**
2. Wählen Sie **FC26**
3. Bei der "Real" Team-Konfiguration, klicken Sie auf **"Entfernen"** neben dem Logo
4. Das System verwendet dann das Standard-Emoji als Fallback

## Unterstützte Bereiche

Das System verwendet die versions-spezifischen Team-Namen in allen Bereichen:

- ✅ Kader-Tab (Spielerlisten)
- ✅ Statistiken-Tab (alle Statistiken und Analysen)
- ✅ Matches-Tab (Spielergebnisse)
- ✅ Finanzen-Tab (Transaktionen und Bilanzen)
- ✅ Admin-Tab (alle Admin-Funktionen)
- ✅ KI-Analyse-Tab
- ✅ Suchfunktion

## Hinweise zur Finanz-Datenbank

Wie Sie erwähnt haben, sind die Finanzen bereits in der DB korrekt gespeichert. Das System:

- Verwendet 'Real' als Team-Key in allen Finanztransaktionen
- Zeigt je nach Version "Real Madrid" (FC25) oder "Rangers" (FC26) an
- Alle bestehenden Transaktionen bleiben gültig

## Fehlerbehebung

### Logo wird nicht angezeigt
- Überprüfen Sie, ob die Datei kleiner als 2MB ist
- Unterstützte Formate: PNG, JPG, GIF
- Browser-Cache leeren und Seite neu laden

### Team-Name ändert sich nicht
- Stellen Sie sicher, dass Sie die richtige FIFA-Version ausgewählt haben
- Überprüfen Sie, ob Änderungen gespeichert wurden
- Laden Sie die Seite neu

### Alte Daten zeigen falschen Namen
Das sollte nicht passieren, da:
- Die Datenbank nur Team-Keys speichert ('Real')
- Die Anzeige wird dynamisch basierend auf der aktuellen Version generiert

## Kontakt

Falls Sie weitere Fragen haben oder Probleme auftreten, erstellen Sie bitte ein Issue im Repository.

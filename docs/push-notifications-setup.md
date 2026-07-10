# Push-Benachrichtigungen (iOS) – Einrichtung

Benachrichtigt bei **neuen Spielen** und **neuen Transaktionen** mit kompakten
Nachrichten, z. B.:

- ⚽ *Neues Spiel eingetragen* — „Schalke 04 4:3 Dynamo Dresden · SdS: …"
- 💸 *Neue Transaktion* — „Schalke 04 · Preisgeld: +1.200 €"

## 1. Voraussetzung: App aufs iPhone installieren

iOS zeigt Web-Benachrichtigungen **nur bei einer zum Home-Bildschirm
hinzugefügten PWA** (iOS 16.4+), nicht im Safari-Tab.

1. App in Safari öffnen → Teilen-Symbol → **„Zum Home-Bildschirm"**.
2. App vom Home-Bildschirm starten.
3. Profil → **Push-Benachrichtigungen** einschalten → iOS-Dialog erlauben.

## 2. Realtime aktivieren (Supabase) — für Benachrichtigungen bei geöffneter App

Die App hört per **Supabase Realtime** auf neue Einträge und zeigt sofort eine
Benachrichtigung (funktioniert, solange die App geöffnet oder im Hintergrund
aktiv ist). Dafür muss Realtime für die Tabellen an sein:

```sql
-- Im Supabase SQL-Editor ausführen:
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.transactions;
```

(In Supabase auch unter *Database → Replication* prüfbar.)

Damit ist der Kern-Auftrag abgedeckt: Trägt eine Person ein Spiel/eine
Transaktion ein, bekommt die andere (mit installierter PWA + erlaubten
Benachrichtigungen) eine kompakte Meldung.

## 3. Optional: echter Hintergrund-Push (App komplett geschlossen)

Wenn die App **ganz geschlossen** ist, braucht es Web Push (Server). Schritte:

1. **VAPID-Schlüssel** erzeugen: `npx web-push generate-vapid-keys`
2. **Tabelle** für Abos:
   ```sql
   create table if not exists public.push_subscriptions (
     id bigint generated always as identity primary key,
     endpoint text not null unique,
     p256dh text not null,
     auth text not null,
     created_at timestamptz not null default now()
   );
   alter table public.push_subscriptions enable row level security;
   create policy "insert own" on public.push_subscriptions for insert with check (true);
   ```
3. **Client**: `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID public> })`
   und das Abo in `push_subscriptions` speichern. (Haken in
   `src/utils/notifications.js` – dort kann `subscribeWebPush()` ergänzt werden.)
4. **Supabase Edge Function** `notify` (Deno, mit `web-push`), ausgelöst per
   *Database Webhook* auf INSERT von `matches`/`transactions`: baut dieselbe
   kompakte Nachricht (siehe `getNotificationMessage` in
   `src/components/NotificationSystem.jsx`) und sendet an alle Abos.
5. **Service Worker**: `push`- und `notificationclick`-Handler. Da die PWA
   `vite-plugin-pwa` (generateSW) nutzt, dafür auf `injectManifest` umstellen
   oder `workbox.importScripts` mit einem kleinen Push-SW ergänzen.

> Die Nachrichten-Texte sind bereits zentral in `NotificationSystem.jsx`
> (`getNotificationTitle` / `getNotificationMessage`) definiert und werden
> version-abhängig gerendert (FC25/FC26-Teamnamen).

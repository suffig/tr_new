-- ============================================================================
--  RLS — SCHREIBEN OHNE ANMELDUNG ABSTELLEN
-- ============================================================================
--  NICHT-DESTRUKTIV FÜR DATEN: ändert nur zwei Richtlinien. Kein DROP TABLE,
--  kein DELETE, keine Spaltenänderung.
--
--  WAS DAS PROBLEM IST
--  Zwei Richtlinien wurden ohne `to`-Klausel angelegt:
--
--    db/fifa_versions.sql:28       create policy "fifa_versions full access"
--                                    on public.fifa_versions
--                                    for all using (true) with check (true);
--    db/25_spieler_wechsel.sql:89  create policy "spieler_wechsel full access"
--                                    on public.spieler_wechsel
--                                    for all using (true) with check (true);
--
--  Fehlt `to`, gilt in Postgres `to public`. Das schließt die Rolle `anon`
--  ein — also jeden, der die Seite öffnet, ohne Anmeldung. Der anonyme
--  Schlüssel steht im Quelltext (src/utils/supabase.js), und das Repository
--  ist öffentlich (github.com/suffig/tr_new, GitHub Pages).
--
--  NACHGEMESSEN, OHNE ANMELDUNG, mit genau diesem Schlüssel:
--    GET /rest/v1/fifa_versions   → 206, content-range 0-0/10
--                                   (inkl. der FC27-Vereinskonfiguration)
--    GET /rest/v1/spieler_wechsel → 206, content-range 0-0/64
--                                   (echte Spielernamen)
--    GET /rest/v1/matches         → 200, content-range */0
--                                   (dort greift RLS, weil die Richtlinie
--                                    `to authenticated` hat)
--
--  Weil die Richtlinie `for all` ist, gilt dasselbe `using (true)
--  with check (true)` auch für INSERT, UPDATE und DELETE. Die beiden Tabellen
--  sind damit von außen beschreibbar: `fifa_versions` hält die Saisonliste,
--  welche Saison läuft und die Vereinskonfiguration je Saison;
--  `spieler_wechsel` den gesamten Transferverlauf.
--
--  WARUM DROP UND NEU ANLEGEN
--  Die Originaldateien legen ihre Richtlinie mit `if not exists` an. Sie
--  einfach erneut auszuführen ändert nichts, weil die Richtlinie schon da
--  ist. Deshalb: löschen, falls vorhanden, dann neu anlegen.
--
--  WAS DAS NICHT LEISTET
--  Danach darf jeder ANGEMELDETE weiterhin alles schreiben. Keine einzige
--  Richtlinie in db/ unterscheidet, WER schreibt — es gibt kein auth.uid(),
--  kein auth.jwt(), keine E-Mail-Prüfung. Die Admin-Prüfung in der App
--  (user.email === ADMIN_EMAIL) blendet nur Oberfläche aus; der Server
--  erzwingt sie nicht. Siehe den Entwurf am Ende.
-- ============================================================================

-- --- fifa_versions ----------------------------------------------------------
drop policy if exists "fifa_versions full access" on public.fifa_versions;

-- Lesen darf auch anon: die App zeigt Saisonname und Vereinswappen schon vor
-- dem Anmelden. Ohne Lesezugriff stünde dort der Vorgabewert statt der
-- laufenden Saison.
create policy fifa_versions_lesen_alle
  on public.fifa_versions for select
  to anon, authenticated
  using (true);

create policy fifa_versions_schreiben_angemeldet
  on public.fifa_versions for all
  to authenticated
  using (true) with check (true);

-- --- spieler_wechsel --------------------------------------------------------
drop policy if exists "spieler_wechsel full access" on public.spieler_wechsel;

-- Hier KEIN Lesezugriff für anon: der Transferverlauf erscheint erst nach dem
-- Anmelden, und er enthält Namen und Beträge.
create policy spieler_wechsel_angemeldet
  on public.spieler_wechsel for all
  to authenticated
  using (true) with check (true);

-- ============================================================================
--  PRÜFUNG — nach dem Ausführen laufen lassen
-- ============================================================================
--  select tablename, policyname, cmd, roles
--    from pg_policies
--   where schemaname = 'public'
--     and (roles = '{public}' or roles @> '{anon}')
--   order by tablename, policyname;
--
--  Erwartet: genau EINE Zeile, nämlich
--    fifa_versions | fifa_versions_lesen_alle | SELECT | {anon,authenticated}
--
--  Jede weitere Zeile mit {public} ist eine Richtlinie ohne `to`-Klausel —
--  dort darf anon dann schreiben.
-- ============================================================================

-- ============================================================================
--  ENTWURF, NOCH NICHT AKTIV: nur der Admin darf schreiben
-- ============================================================================
--  Erst abstimmen, WELCHE Bereiche das betreffen soll. Pauschal angewendet
--  könnte Alexander nichts mehr eintragen — keine Biere in der Bierbörse,
--  keine gezogenen Teams, keinen Saufen-Zähler. Diese Bereiche sind
--  ausdrücklich für beide gebaut (je eine Sammlung pro Person).
--
--  Muster für eine Tabelle, die nur Philip ändern darf:
--
--  drop policy if exists <alter_name> on public.<tabelle>;
--
--  create policy <tabelle>_lesen_angemeldet
--    on public.<tabelle> for select
--    to authenticated
--    using (true);
--
--  create policy <tabelle>_schreiben_admin
--    on public.<tabelle> for all
--    to authenticated
--    using ((auth.jwt() ->> 'email') = 'philip-melchert@live.de')
--    with check ((auth.jwt() ->> 'email') = 'philip-melchert@live.de');
--
--  Sinnvoll dort, wo Geld oder der Saisonstand bewegt wird:
--    finances, transactions, matches, players, bans,
--    draft_sessions, draft_picks, spieler_wechsel
--
--  Würde die gemeinsame Nutzung kaputt machen:
--    bierboersen, bier_verkostungen, bier_katalog,
--    team_pull_events, team_collection, abende, abend_ereignisse
-- ============================================================================

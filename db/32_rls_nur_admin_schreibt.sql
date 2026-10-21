-- ============================================================================
--  RLS — GELD, SAISONSTAND UND TRANSFERS: NUR DER ADMIN SCHREIBT
-- ============================================================================
--  NICHT-DESTRUKTIV FÜR DATEN: ändert nur Richtlinien. Kein DROP TABLE, kein
--  DELETE, keine Spaltenänderung.
--
--  ZUERST db/31_rls_anon_schreibsperre.sql AUSFÜHREN.
--
--  WOZU
--  Die App prüft an mehreren Stellen `darfEintragen` (useIchBin) und blendet
--  Knöpfe aus. Das hält niemanden auf, der die Entwicklerkonsole öffnet: der
--  anonyme Schlüssel steht im Quelltext, und bisher durfte JEDER Angemeldete
--  alles schreiben. Keine einzige Richtlinie in db/ unterschied, WER
--  schreibt — kein auth.uid(), kein auth.jwt(), keine E-Mail-Prüfung.
--  Erst diese Datei erzwingt die Trennung dort, wo sie zählt.
--
--  WAS GESPERRT WIRD (Absprache vom 22.10.2026)
--    Geld und Saisonstand: matches, players, finances, transactions, bans,
--                          spieler_des_spiels, draft_sessions, draft_picks
--    Transfers:            spieler_wechsel
--
--  WAS OFFEN BLEIBT, UND WARUM
--    bierboersen, bier_verkostungen, bier_katalog, bier_kategorien,
--    bierboerse_einstellungen, team_pull_events, team_collection,
--    fc26_team_catalog, abende, abend_ereignisse, manager, fifa_versions
--
--  Diese Bereiche sind für beide gebaut — je eine Sammlung und je ein
--  Bierkonto pro Person. Eine Sperre dort hätte nur zur Folge, dass Alexander
--  Philip bittet, es für ihn einzutragen.
--
--  LESEN BLEIBT FÜR BEIDE
--  Alexander sieht weiterhin alles, er kann es nur nicht mehr ändern. Das ist
--  der Punkt: die Zahlen sollen für beide sichtbar sein.
--
--  WARUM EIN DO-BLOCK UND KEIN EINFACHES `drop policy if exists`
--  Für matches, players, finances, transactions, bans und spieler_des_spiels
--  liegt im Repo gar keine Richtlinie — sie wurden direkt in Supabase
--  angelegt, und ihre NAMEN sind von hier aus nicht bekannt. Ein
--  `drop policy if exists <name>` müsste also raten. Der Block liest die
--  vorhandenen Namen aus pg_policies und entfernt sie, bevor er die neuen
--  setzt.
--
--  WARUM DIE E-MAIL UND NICHT EINE UUID
--  auth.uid() wäre stabiler, aber die zugehörige UUID steht nirgends im
--  Projekt, und ein falsch abgetippter Wert sperrt BEIDE aus — auch den
--  Admin, der es wieder geradeziehen müsste. Die E-Mail ist dieselbe Quelle,
--  die die App schon benutzt (ADMIN_EMAIL in src/constants/navigation.js).
--  Wird sie je geändert, muss sie an beiden Stellen geändert werden.
-- ============================================================================

do $$
declare
  t text;
  pol record;
  admin_mail constant text := 'philip-melchert@live.de';
  tabellen constant text[] := array[
    'matches', 'players', 'finances', 'transactions', 'bans',
    'spieler_des_spiels', 'draft_sessions', 'draft_picks', 'spieler_wechsel'
  ];
begin
  foreach t in array tabellen loop
    -- Tabelle überhaupt vorhanden? Sonst still weiter: ein Abbruch mitten im
    -- Block liesse die vorherigen Tabellen geändert und die folgenden
    -- unverändert zurück — der unangenehmste aller Zwischenzustände.
    if not exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      raise notice 'Tabelle public.% gibt es nicht - uebersprungen', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Bestehende Richtlinien entfernen, egal wie sie heissen.
    for pol in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
      raise notice 'entfernt: %.%', t, pol.policyname;
    end loop;

    -- Lesen: jeder Angemeldete.
    execute format($f$
      create policy %I on public.%I for select
        to authenticated
        using (true)
    $f$, t || '_lesen_angemeldet', t);

    -- Schreiben: nur der Admin. `using` deckt UPDATE und DELETE ab (welche
    -- Zeilen darf er anfassen), `with check` deckt INSERT und das Ergebnis
    -- eines UPDATE ab (welche Zeilen darf er hinterlassen). Beides nötig —
    -- nur `using` erlaubte weiterhin jedem das Einfügen.
    execute format($f$
      create policy %I on public.%I for all
        to authenticated
        using ((auth.jwt() ->> 'email') = %L)
        with check ((auth.jwt() ->> 'email') = %L)
    $f$, t || '_schreiben_admin', t, admin_mail, admin_mail);

    raise notice 'gesetzt: % - lesen alle Angemeldeten, schreiben nur %', t, admin_mail;
  end loop;
end $$;

-- ============================================================================
--  PRÜFUNG 1 — welche Richtlinien stehen jetzt da?
-- ============================================================================
--  select tablename, policyname, cmd, roles
--    from pg_policies
--   where schemaname = 'public'
--     and tablename in ('matches','players','finances','transactions','bans',
--                       'spieler_des_spiels','draft_sessions','draft_picks',
--                       'spieler_wechsel')
--   order by tablename, cmd;
--
--  Erwartet je Tabelle genau zwei Zeilen:
--    <tabelle>_lesen_angemeldet   | SELECT | {authenticated}
--    <tabelle>_schreiben_admin    | ALL    | {authenticated}
--
-- ============================================================================
--  PRÜFUNG 2 — der eigentliche Gegentest, in der App
-- ============================================================================
--  Als Alexander anmelden und versuchen, ein Spiel einzutragen. Erwartet:
--  die Knöpfe sind gar nicht da (Oberfläche), und ein Schreibversuch über die
--  Konsole scheitert mit
--    code 42501, "new row violates row-level security policy"
--
--  Vorher kam an dieser Stelle KEIN Fehler: der Eintrag ging durch.
--
--  Danach als Philip anmelden und ein Spiel eintragen. Das muss weiterhin
--  gehen — wenn nicht, stimmt die E-Mail im Block oben nicht mit der des
--  Admin-Zugangs überein.
-- ============================================================================

-- ============================================================================
--  FUSTA — STATUSBERICHT
-- ============================================================================
--  Im Supabase SQL Editor einfügen und ausführen.
--
--  EINE EINZIGE SELECT-ABFRAGE. Kein create, kein insert, kein update, kein
--  delete, kein drop — nichts, was etwas anlegt oder ändert. Deshalb kommt
--  auch keine Warnung des Editors.
--
--  (Die erste Fassung sammelte den Bericht in einer temporären Tabelle. Das
--  war harmlos — temporäre Tabellen liegen im Sitzungsschema und sind über
--  die API nie erreichbar —, aber der Editor liest nur die Schlüsselwörter
--  und meldete "destruktive Operationen" samt RLS-Hinweis. Eine Warnung, die
--  man wegklicken muss, ist bei einem Prüfskript eine Zumutung.)
--
--  Ergebnis: eine Tabelle, sortiert nach Dringlichkeit.
--    FEHLT    eine Migration wurde nicht eingespielt
--    PRUEFEN  kein Fehler, aber etwas zum Ansehen
--    OK       nichts zu tun
-- ============================================================================

with

-- ---------------------------------------------------------------------------
-- TEIL A — Migrationen
--   Rein aus den Katalogtabellen. Schlägt nie fehl, auch wenn ein Objekt
--   fehlt — genau darum geht es hier ja.
-- ---------------------------------------------------------------------------
erwartet (datei, objekt, spalte) as (
  values
    ('fifa_versions',   'fifa_versions',            null),
    ('06_team_season',  'teams',                    null),
    ('09_abende',       'abende',                   null),
    ('09_abende',       'abend_ereignisse',         null),
    ('18_draft',        'draft_sessions',           null),
    ('18_draft',        'draft_picks',              null),
    ('19_bierboerse',   'bier_katalog',             null),
    ('19_bierboerse',   'bierboersen',              null),
    ('19_bierboerse',   'bier_verkostungen',        null),
    ('20_bezahlt',      'bier_verkostungen',        'bezahlt_von'),
    ('21_kategorien',   'bierboerse_einstellungen', null),
    ('21_kategorien',   'bier_verkostungen',        'noten_aek'),
    ('21_kategorien',   'bier_verkostungen',        'noten_real'),
    ('21_kategorien',   'bierboerse_einstellungen', 'modus'),
    ('21_kategorien',   'bierboerse_einstellungen', 'kategorien')
),
migration as (
  select e.datei, e.objekt, e.spalte,
         case when e.spalte is null
              then to_regclass('public.' || e.objekt) is not null
              else exists (select 1 from information_schema.columns c
                            where c.table_schema = 'public'
                              and c.table_name = e.objekt
                              and c.column_name = e.spalte)
         end as da
    from erwartet e
),

-- ---------------------------------------------------------------------------
-- TEIL C1 — Tore ohne Spielzuordnung
--   players.goals und die Torschützenlisten sind zwei getrennte Quellen. Für
--   die importierten Altsaisons gibt es nur die erste. Wo beide auseinander-
--   laufen, zeigt die App in der Spieler-Statistik "N ohne Spiel".
--
--   Der Regex-Wächter vor jedem Cast ist Absicht: steht in goalslista etwas
--   anderes als ein JSON-Array (leer, Text, kaputt), fliegt sonst die ganze
--   Abfrage statt nur dieser einen Zeile.
-- ---------------------------------------------------------------------------
eintraege as (
  select m.teama as team, m.fifa_version, e as eintrag
    from public.matches m
    cross join lateral jsonb_array_elements(
      case when m.goalslista::text ~ '^\s*\[' then m.goalslista::text::jsonb
           else '[]'::jsonb end) e
  union all
  select m.teamb, m.fifa_version, e
    from public.matches m
    cross join lateral jsonb_array_elements(
      case when m.goalslistb::text ~ '^\s*\[' then m.goalslistb::text::jsonb
           else '[]'::jsonb end) e
),
tore as (
  select team, fifa_version,
         coalesce(eintrag ->> 'player',
                  case when jsonb_typeof(eintrag) = 'string' then eintrag #>> '{}' end) as name,
         case when (eintrag ->> 'count') ~ '^[0-9]+$'
              then (eintrag ->> 'count')::int else 1 end as anzahl
    from eintraege
),
aus_spielen as (
  select team, fifa_version, name, sum(anzahl)::int as tore
    from tore where name is not null group by 1, 2, 3
),
abweichung as (
  select p.name, p.team, coalesce(p.fifa_version, '(ohne)') as version,
         coalesce(p.goals, 0) as gespeichert,
         coalesce(s.tore, 0) as belegt,
         coalesce(p.goals, 0) - coalesce(s.tore, 0) as differenz
    from public.players p
    left join aus_spielen s
      on s.name = p.name and s.team = p.team
     and coalesce(s.fifa_version, '') = coalesce(p.fifa_version, '')
   where coalesce(p.goals, 0) <> coalesce(s.tore, 0)
),

-- ---------------------------------------------------------------------------
-- TEIL B — Umfang
-- ---------------------------------------------------------------------------
umfang (name, anzahl) as (
            select 'matches',            (select count(*) from public.matches)
  union all select 'players',            (select count(*) from public.players)
  union all select 'bans',               (select count(*) from public.bans)
  union all select 'transactions',       (select count(*) from public.transactions)
  union all select 'fifa_versions',      (select count(*) from public.fifa_versions)
  union all select 'bierboersen',        (select count(*) from public.bierboersen)
  union all select 'bier_katalog',       (select count(*) from public.bier_katalog)
  union all select 'bier_verkostungen',  (select count(*) from public.bier_verkostungen)
)

-- ===========================================================================
--  BERICHT
-- ===========================================================================
select * from (

  -- A: Migrationen ---------------------------------------------------------
  select 10 as nr, 'A Migration' as bereich,
         datei || ' → ' || objekt || coalesce('.' || spalte, '') as pruefung,
         case when da then 'OK' else 'FEHLT' end as status,
         case when da then 'vorhanden'
              else 'Datei db/' || datei || '.sql einspielen' end as details
    from migration

  -- A: Datentyp der Gesamtnote ---------------------------------------------
  union all
  select 11, 'A Migration', 'note_aek als Kommazahl',
         case when data_type = 'numeric' then 'OK' else 'PRUEFEN' end,
         'Typ ist ' || data_type
         || case when data_type = 'numeric' then ''
                 else ' — als integer würde das Mittel aus 8, 8 und 7 auf 8 gerundet' end
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bier_verkostungen'
     and column_name = 'note_aek'

  -- A: Reste der ersten Fassung von db/21 ----------------------------------
  union all
  select 12, 'A Migration', 'Altlasten der ersten db/21-Fassung', 'PRUEFEN',
         'Spalten geschmack_*/aussehen_*/pl_* sind noch da. Die App nutzt sie nicht '
         || 'mehr, ihre Werte stehen im JSONB. Können weg — aber nur mit eigenem Skript.'
   where exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'bier_verkostungen'
                    and column_name = 'geschmack_aek')

  -- A: Zugriffsregeln ------------------------------------------------------
  union all
  select 13, 'A Zugriff', 'Policies auf ' || t.tab,
         case when p.anz > 0 then 'OK' else 'PRUEFEN' end,
         p.anz || ' Policy(s)'
         || case when p.anz = 0 then ' — die App bekäme leere Listen statt Fehlern' else '' end
    from (values ('bier_katalog'), ('bierboersen'), ('bier_verkostungen'),
                 ('bierboerse_einstellungen'), ('abende'), ('matches'), ('players')) as t(tab)
    cross join lateral (
      select count(*) as anz from pg_policies
       where schemaname = 'public' and tablename = t.tab) p
   where to_regclass('public.' || t.tab) is not null

  -- B: Umfang --------------------------------------------------------------
  union all
  select 30, 'B Umfang', name, 'OK', anzahl || ' Zeilen' from umfang

  union all
  select 31, 'B Umfang', 'Spiele in ' || coalesce(fifa_version, '(ohne Version)'),
         'OK', count(*) || ' Spiele'
    from public.matches group by fifa_version

  -- C: Tore ohne Spielzuordnung --------------------------------------------
  union all
  select 50, 'C Daten',
         'Tore ohne Spiel: ' || name || ' (' || team || ', ' || version || ')',
         'PRUEFEN',
         gespeichert || ' in players.goals, ' || belegt || ' aus Torschützenlisten → '
         || differenz || ' Differenz'
    from abweichung

  union all
  select 51, 'C Daten', 'Tore ohne Spielzuordnung', 'OK',
         'players.goals deckt sich überall mit den Torschützenlisten'
   where not exists (select 1 from abweichung)

  -- C: Spiele mit Toren, aber ohne Torschützen -----------------------------
  union all
  select 52, 'C Daten', 'Spiele mit Toren, aber ohne Torschützen',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end,
         count(*) || ' Spiele'
         || case when count(*) = 0 then '' else ' — dort fehlen die Schützen' end
    from public.matches m
   where coalesce(m.goalsa, 0) + coalesce(m.goalsb, 0) > 0
     and jsonb_array_length(case when m.goalslista::text ~ '^\s*\['
                                 then m.goalslista::text::jsonb else '[]'::jsonb end)
       + jsonb_array_length(case when m.goalslistb::text ~ '^\s*\['
                                 then m.goalslistb::text::jsonb else '[]'::jsonb end) = 0

  -- C: Zeilen ohne FIFA-Version --------------------------------------------
  union all
  select 53, 'C Daten', 'Ohne fifa_version: matches',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end,
         count(*) || ' Zeilen'
         || case when count(*) = 0 then '' else ' — in keiner Saison sichtbar' end
    from public.matches where fifa_version is null

  union all
  select 54, 'C Daten', 'Ohne fifa_version: players',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end,
         count(*) || ' Zeilen'
         || case when count(*) = 0 then '' else ' — in keiner Saison sichtbar' end
    from public.players where fifa_version is null

  -- C: Sperren ohne Spieler ------------------------------------------------
  union all
  select 55, 'C Daten', 'Sperren ohne zugehörigen Spieler',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end, count(*) || ' Stück'
    from public.bans b
   where b.player_id is not null
     and not exists (select 1 from public.players p where p.id = b.player_id)

  -- C: Bierbörse -----------------------------------------------------------
  union all
  select 60, 'C Bierbörse', 'Verkostungen mit Kategorie-Noten', 'OK', count(*) || ' Stück'
    from public.bier_verkostungen
   where coalesce(noten_aek, '{}'::jsonb) <> '{}'::jsonb
      or coalesce(noten_real, '{}'::jsonb) <> '{}'::jsonb

  union all
  select 61, 'C Bierbörse', 'Verkostungen nur mit Gesamtnote', 'OK',
         count(*) || ' Stück (einfacher Modus)'
    from public.bier_verkostungen
   where coalesce(noten_aek, '{}'::jsonb) = '{}'::jsonb
     and coalesce(noten_real, '{}'::jsonb) = '{}'::jsonb
     and (note_aek is not null or note_real is not null)

  union all
  select 62, 'C Bierbörse', 'Verkostungen ganz ohne Bewertung',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end, count(*) || ' Stück'
    from public.bier_verkostungen where note_aek is null and note_real is null

  union all
  select 63, 'C Bierbörse', 'Kategorie "' || k.schluessel || '" vergeben', 'OK', count(*) || '×'
    from public.bier_verkostungen v
    cross join lateral (
      select ka as schluessel from jsonb_object_keys(coalesce(v.noten_aek, '{}'::jsonb)) as ka
      union all
      select kr from jsonb_object_keys(coalesce(v.noten_real, '{}'::jsonb)) as kr
    ) k
   group by k.schluessel

  union all
  select 64, 'C Bierbörse', 'Einstellungszeile (id = 1)',
         case when count(*) = 1 then 'OK' else 'PRUEFEN' end,
         case when count(*) = 1
              then 'Modus: ' || max(modus) || ', Kategorien: ' || max(kategorien::text)
              else 'fehlt — die App legt sie beim nächsten Speichern selbst an' end
    from public.bierboerse_einstellungen where id = 1

  union all
  select 65, 'C Bierbörse', 'Börsen ohne ein einziges Bier',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end, count(*) || ' Stück'
    from public.bierboersen b
   where not exists (select 1 from public.bier_verkostungen v where v.boerse_id = b.id)

  union all
  select 66, 'C Bierbörse', 'Verkostungen ohne Preis oder Größe',
         case when count(*) = 0 then 'OK' else 'PRUEFEN' end,
         count(*) || ' Stück'
         || case when count(*) = 0 then '' else ' — fehlen in der Preis-Leistungs-Wertung' end
    from public.bier_verkostungen
   where preis is null or groesse_ml is null or groesse_ml = 0

) bericht
order by
  case status when 'FEHLT' then 1 when 'PRUEFEN' then 2 else 3 end,
  nr,
  pruefung;

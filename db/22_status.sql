-- ============================================================================
--  FUSTA — STATUSBERICHT
-- ============================================================================
--  Im Supabase SQL Editor ausführen und das Ergebnis zurückmelden.
--
--  NUR LESEND. Das Skript ändert nichts an euren Daten: es legt eine
--  temporäre Tabelle für den Bericht an (verschwindet mit der Sitzung) und
--  liest ansonsten ausschließlich.
--
--  Es beantwortet drei Fragen:
--
--    TEIL A  Sind alle Migrationen eingespielt?
--    TEIL B  Wie viel steht drin?
--    TEIL C  Stimmen die Daten in sich — oder gibt es Lücken, die in der
--            App als seltsame Zahlen auftauchen?
--
--  Die Spalte STATUS ist das Wichtigste:
--    OK       nichts zu tun
--    FEHLT    eine Migration wurde nicht eingespielt
--    PRUEFEN  kein Fehler, aber etwas, das man sich ansehen sollte
-- ============================================================================

-- Kein DROP: "pg_temp.x" kann beim allerersten Lauf scheitern, weil das
-- temporäre Schema noch nicht existiert, und ein unqualifiziertes DROP könnte
-- theoretisch eine gleichnamige echte Tabelle treffen. Anlegen-falls-nötig und
-- leeren ist gefahrlos und erlaubt mehrfaches Ausführen in derselben Sitzung.
create temp table if not exists fusta_bericht (
  nr        int,
  bereich   text,
  pruefung  text,
  status    text,
  details   text
);
delete from fusta_bericht;

do $$
declare
  n int := 0;
  m int;
  t text;
  x record;
begin
  ------------------------------------------------------------------ TEIL A --
  -- Migrationen. Geprüft wird, ob die Objekte da sind, die die jeweilige
  -- Datei anlegt — nicht, ob die Datei "gelaufen ist": das weiss die
  -- Datenbank nicht, aber am Ergebnis sieht man es.
  ----------------------------------------------------------------------------
  for x in
    select * from (values
      ('fifa_versions.sql', 'tabelle', 'fifa_versions',            null),
      ('06_team_tracker_season', 'tabelle', 'teams',               null),
      ('09_abende',        'tabelle', 'abende',                    null),
      ('09_abende',        'tabelle', 'abend_ereignisse',          null),
      ('18_draft',         'tabelle', 'draft_sessions',            null),
      ('18_draft',         'tabelle', 'draft_picks',               null),
      ('19_bierboerse',    'tabelle', 'bier_katalog',              null),
      ('19_bierboerse',    'tabelle', 'bierboersen',               null),
      ('19_bierboerse',    'tabelle', 'bier_verkostungen',         null),
      ('20_bezahlt',       'spalte',  'bier_verkostungen',         'bezahlt_von'),
      ('21_kategorien',    'tabelle', 'bierboerse_einstellungen',  null),
      ('21_kategorien',    'spalte',  'bier_verkostungen',         'noten_aek'),
      ('21_kategorien',    'spalte',  'bier_verkostungen',         'noten_real'),
      ('21_kategorien',    'spalte',  'bierboerse_einstellungen',  'modus'),
      ('21_kategorien',    'spalte',  'bierboerse_einstellungen',  'kategorien')
    ) as v(datei, art, objekt, spalte)
  loop
    n := n + 1;
    if x.art = 'tabelle' then
      insert into fusta_bericht values (
        n, 'A Migration', x.datei || ' → Tabelle ' || x.objekt,
        case when to_regclass('public.' || x.objekt) is not null then 'OK' else 'FEHLT' end,
        case when to_regclass('public.' || x.objekt) is not null
             then 'vorhanden' else 'Datei ' || x.datei || '.sql einspielen' end);
    else
      insert into fusta_bericht values (
        n, 'A Migration', x.datei || ' → ' || x.objekt || '.' || x.spalte,
        case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = x.objekt
                            and column_name = x.spalte) then 'OK' else 'FEHLT' end,
        case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = x.objekt
                            and column_name = x.spalte)
             then 'vorhanden' else 'Datei ' || x.datei || '.sql einspielen' end);
    end if;
  end loop;

  -- Der Datentyp der Gesamtnote. Als integer würde das Mittel aus 8, 8 und 7
  -- auf 8 gerundet, und drei verschiedene Biere stünden gleichauf.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'bier_verkostungen'
               and column_name = 'note_aek') then
    select data_type into t from information_schema.columns
     where table_schema = 'public' and table_name = 'bier_verkostungen' and column_name = 'note_aek';
    n := n + 1;
    insert into fusta_bericht values (
      n, 'A Migration', '21_kategorien → note_aek als Kommazahl',
      case when t = 'numeric' then 'OK' else 'PRUEFEN' end,
      'Typ ist ' || t || case when t = 'numeric' then '' else ' — erwartet numeric(3,1)' end);
  end if;

  -- Reste der früheren Fassung von db/21. Kein Fehler: die Werte sind ins
  -- JSONB übernommen, die Spalten stehen absichtlich noch da (Löschen wäre
  -- destruktiv). Nur zur Information.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'bier_verkostungen'
               and column_name = 'geschmack_aek') then
    n := n + 1;
    insert into fusta_bericht values (
      n, 'A Migration', 'Altlasten aus der ersten Fassung von db/21',
      'PRUEFEN',
      'Spalten geschmack_*/aussehen_*/pl_* sind noch da. Die App nutzt sie nicht mehr; '
      || 'ihre Werte stehen im JSONB. Können irgendwann weg — nur mit eigenem Skript.');
  end if;

  -- Zugriffsregeln: ohne Policy sieht die App leere Listen statt Fehlern.
  for x in
    select unnest(array['bier_katalog','bierboersen','bier_verkostungen',
                        'bierboerse_einstellungen','abende','draft_sessions']) as tab
  loop
    if to_regclass('public.' || x.tab) is not null then
      select count(*) into m from pg_policies where schemaname = 'public' and tablename = x.tab;
      n := n + 1;
      insert into fusta_bericht values (
        n, 'A Zugriff', 'Policies auf ' || x.tab,
        case when m > 0 then 'OK' else 'PRUEFEN' end,
        m || ' Policy(s)' || case when m = 0 then ' — App bekäme leere Listen' else '' end);
    end if;
  end loop;

  ------------------------------------------------------------------ TEIL B --
  -- Umfang. Zum Vergleich mit dem, was die App anzeigt.
  ----------------------------------------------------------------------------
  for x in
    select unnest(array['matches','players','bans','transactions','finances',
                        'fifa_versions','abende','bierboersen','bier_katalog',
                        'bier_verkostungen','draft_sessions']) as tab
  loop
    if to_regclass('public.' || x.tab) is not null then
      execute format('select count(*) from public.%I', x.tab) into m;
      n := n + 1;
      insert into fusta_bericht values (n, 'B Umfang', x.tab, 'OK', m || ' Zeilen');
    end if;
  end loop;

  -- Spiele je FIFA-Version
  if to_regclass('public.matches') is not null then
    for x in
      select coalesce(fifa_version, '(ohne)') as v, count(*) as anz
        from public.matches group by 1 order by 1
    loop
      n := n + 1;
      insert into fusta_bericht values (n, 'B Umfang', 'Spiele in ' || x.v, 'OK', x.anz || ' Spiele');
    end loop;
  end if;

  ------------------------------------------------------------------ TEIL C --
  -- Datenbefunde. Hier stehen die Dinge, die in der App als seltsame Zahlen
  -- auftauchen.
  ----------------------------------------------------------------------------

  -- C1: Tore ohne Spielzuordnung.
  -- players.goals und die Torschützenlisten der Spiele sind zwei getrennte
  -- Quellen. Für die importierten Altsaisons gibt es nur die erste. Wo beide
  -- auseinanderlaufen, zeigt die App in der Spieler-Statistik den Chip
  -- "N ohne Spiel" — hier steht, bei wem und wie viele.
  if to_regclass('public.matches') is not null and to_regclass('public.players') is not null then
    begin
      for x in
        with liste as (
          select m.teama as team, m.fifa_version, e as eintrag
            from public.matches m
            cross join lateral jsonb_array_elements(
              case when jsonb_typeof(m.goalslista::jsonb) = 'array'
                   then m.goalslista::jsonb else '[]'::jsonb end) e
          union all
          select m.teamb, m.fifa_version, e
            from public.matches m
            cross join lateral jsonb_array_elements(
              case when jsonb_typeof(m.goalslistb::jsonb) = 'array'
                   then m.goalslistb::jsonb else '[]'::jsonb end) e
        ),
        tore as (
          select team, fifa_version,
                 coalesce(eintrag->>'player',
                          case when jsonb_typeof(eintrag) = 'string' then eintrag #>> '{}' end) as name,
                 case when (eintrag->>'count') ~ '^[0-9]+$'
                      then (eintrag->>'count')::int else 1 end as anzahl
            from liste
        ),
        summiert as (
          select team, fifa_version, name, sum(anzahl) as aus_spielen
            from tore where name is not null group by 1,2,3
        )
        select p.name, p.team, coalesce(p.fifa_version, '(ohne)') as version,
               coalesce(p.goals, 0) as gespeichert,
               coalesce(s.aus_spielen, 0)::int as aus_spielen,
               coalesce(p.goals, 0) - coalesce(s.aus_spielen, 0)::int as differenz
          from public.players p
          left join summiert s
            on s.name = p.name and s.team = p.team
           and coalesce(s.fifa_version, '') = coalesce(p.fifa_version, '')
         where coalesce(p.goals, 0) <> coalesce(s.aus_spielen, 0)::int
         order by abs(coalesce(p.goals, 0) - coalesce(s.aus_spielen, 0)::int) desc
         limit 25
      loop
        n := n + 1;
        insert into fusta_bericht values (
          n, 'C Daten', 'Tore ohne Spiel: ' || x.name || ' (' || x.team || ', ' || x.version || ')',
          'PRUEFEN',
          x.gespeichert || ' gespeichert, ' || x.aus_spielen || ' aus Torschützenlisten → '
          || x.differenz || ' Differenz');
      end loop;

      if not found then
        n := n + 1;
        insert into fusta_bericht values (
          n, 'C Daten', 'Tore ohne Spielzuordnung', 'OK',
          'players.goals stimmt überall mit den Torschützenlisten überein');
      end if;
    exception when others then
      n := n + 1;
      insert into fusta_bericht values (
        n, 'C Daten', 'Tore ohne Spielzuordnung', 'PRUEFEN',
        'Nicht auswertbar: ' || sqlerrm || ' — vermutlich steht in goalslista/goalslistb kein gültiges JSON.');
    end;
  end if;

  -- C2: Spiele mit Toren, aber ohne Torschützen.
  if to_regclass('public.matches') is not null then
    begin
      select count(*) into m
        from public.matches m2
       where coalesce(m2.goalsa, 0) + coalesce(m2.goalsb, 0) > 0
         and coalesce(jsonb_array_length(
               case when jsonb_typeof(m2.goalslista::jsonb) = 'array' then m2.goalslista::jsonb else '[]'::jsonb end), 0)
           + coalesce(jsonb_array_length(
               case when jsonb_typeof(m2.goalslistb::jsonb) = 'array' then m2.goalslistb::jsonb else '[]'::jsonb end), 0) = 0;
      n := n + 1;
      insert into fusta_bericht values (
        n, 'C Daten', 'Spiele mit Toren, aber ohne Torschützen',
        case when m = 0 then 'OK' else 'PRUEFEN' end,
        m || ' Spiele' || case when m = 0 then '' else ' — dort fehlen die Schützen' end);
    exception when others then null;
    end;
  end if;

  -- C3: Bierbörse — wie ist bewertet worden?
  if to_regclass('public.bier_verkostungen') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='bier_verkostungen' and column_name='noten_aek') then
    select count(*) into m from public.bier_verkostungen
     where noten_aek <> '{}'::jsonb or noten_real <> '{}'::jsonb;
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Verkostungen mit Kategorie-Noten', 'OK', m || ' Stück');

    select count(*) into m from public.bier_verkostungen
     where (noten_aek = '{}'::jsonb and noten_real = '{}'::jsonb)
       and (note_aek is not null or note_real is not null);
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Verkostungen nur mit Gesamtnote', 'OK', m || ' Stück (einfacher Modus)');

    select count(*) into m from public.bier_verkostungen
     where note_aek is null and note_real is null;
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Verkostungen ganz ohne Bewertung',
      case when m = 0 then 'OK' else 'PRUEFEN' end, m || ' Stück');

    -- Welche Kategorien kommen tatsächlich vor?
    for x in
      select k.schluessel, count(*) as anz
        from public.bier_verkostungen v
        cross join lateral (
          select ka as schluessel from jsonb_object_keys(v.noten_aek) as ka
          union all
          select kr from jsonb_object_keys(v.noten_real) as kr
        ) k
       group by 1 order by 2 desc, 1
    loop
      n := n + 1;
      insert into fusta_bericht values (
        n, 'C Bierbörse', 'Kategorie "' || x.schluessel || '" vergeben', 'OK', x.anz || '×');
    end loop;
  end if;

  -- C4: Die Einstellungszeile. Von aussen nicht sichtbar, hier schon.
  if to_regclass('public.bierboerse_einstellungen') is not null then
    select count(*) into m from public.bierboerse_einstellungen where id = 1;
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Einstellungszeile (id = 1)',
      case when m = 1 then 'OK' else 'PRUEFEN' end,
      case when m = 1 then (select 'Modus: ' || modus || ', Kategorien: ' || kategorien::text
                              from public.bierboerse_einstellungen where id = 1)
           else 'fehlt — die App legt sie beim nächsten Speichern selbst an' end);
  end if;

  -- C5: Bierbörsen ohne ein einziges Bier.
  if to_regclass('public.bierboersen') is not null then
    select count(*) into m from public.bierboersen b
     where not exists (select 1 from public.bier_verkostungen v where v.boerse_id = b.id);
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Börsen ohne Biere',
      case when m = 0 then 'OK' else 'PRUEFEN' end, m || ' Stück');
  end if;

  -- C6: Preis oder Größe fehlt — dann lässt sich kein Literpreis rechnen,
  --     und das Bier fehlt in der Preis-Leistungs-Wertung.
  if to_regclass('public.bier_verkostungen') is not null then
    select count(*) into m from public.bier_verkostungen
     where preis is null or groesse_ml is null or groesse_ml = 0;
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Bierbörse', 'Verkostungen ohne Preis oder Größe',
      case when m = 0 then 'OK' else 'PRUEFEN' end,
      m || ' Stück' || case when m = 0 then '' else ' — fehlen in der Preis-Leistungs-Wertung' end);
  end if;

  -- C7: Sperren, deren Spieler es nicht mehr gibt.
  if to_regclass('public.bans') is not null and to_regclass('public.players') is not null then
    select count(*) into m from public.bans b
     where b.player_id is not null
       and not exists (select 1 from public.players p where p.id = b.player_id);
    n := n + 1;
    insert into fusta_bericht values (
      n, 'C Daten', 'Sperren ohne zugehörigen Spieler',
      case when m = 0 then 'OK' else 'PRUEFEN' end, m || ' Stück');
  end if;

  -- C8: Zeilen ohne FIFA-Version — die tauchen in keiner Saison auf.
  for x in
    select unnest(array['matches','players','bans','transactions']) as tab
  loop
    if to_regclass('public.' || x.tab) is not null
       and exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=x.tab and column_name='fifa_version') then
      execute format('select count(*) from public.%I where fifa_version is null', x.tab) into m;
      n := n + 1;
      insert into fusta_bericht values (
        n, 'C Daten', 'Ohne fifa_version: ' || x.tab,
        case when m = 0 then 'OK' else 'PRUEFEN' end,
        m || ' Zeilen' || case when m = 0 then '' else ' — in keiner Saison sichtbar' end);
    end if;
  end loop;
end $$;

-- ============================================================================
--  ERGEBNIS
-- ============================================================================
select
  bereich,
  pruefung,
  status,
  details
from fusta_bericht
order by
  case status when 'FEHLT' then 1 when 'PRUEFEN' then 2 else 3 end,
  nr;

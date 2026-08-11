-- FUSTA · Prüfung der Wechsel-Erfassung.
-- In Supabase (SQL-Editor) ausfuehren. NUR LESEND — ein einziges select,
-- kein insert, kein update, kein DROP.
--
-- WOZU
-- Der Schluessel `person_key` wird an ZWEI Stellen gebildet: einmal in SQL
-- (db/25, beim Anlegen der Startzeilen) und einmal in JavaScript (nameKey()
-- in src/utils/playerIdentity.js, bei jedem neuen Wechsel). Weichen die beiden
-- voneinander ab, findet die App den Verlauf eines Spielers nicht mehr — und
-- zwar lautlos: die Karte zeigt dann "noch kein Verlauf erfasst", obwohl in
-- der Tabelle Zeilen stehen.
--
-- Diese Abfrage macht das sichtbar, bevor es auffaellt.

with schluessel as (
  select
    p.id,
    p.name,
    p.team,
    coalesce(p.fifa_version, 'FC26') as saison,
    -- Dieselbe Bildung wie in db/25 und in nameKey(): Kleinschreibung,
    -- Akzente aufgeloest, alles ausser a-z und 0-9 entfernt.
    regexp_replace(
      lower(translate(p.name,
        'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
        'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC')),
      '[^a-z0-9]', '', 'g') as key
  from public.players p
),
aktiv as (
  select s.* from schluessel s
  join public.fifa_versions v on v.id = s.saison and v.is_active
)

  -- A) Spieler der laufenden Saison OHNE Verlaufszeile
  select 10 as nr, 'A Ohne Verlauf' as bereich,
         a.name as gegenstand,
         'PRUEFEN' as status,
         'Kein Eintrag in spieler_wechsel — die Spielerkarte zeigt dort nichts. '
         || 'Meist ein Zeichen im Namen, das die beiden Schluessel-Bildungen '
         || 'unterschiedlich behandeln.' as befund
    from aktiv a
   where not exists (select 1 from public.spieler_wechsel w where w.person_key = a.key)

union all
  select 11, 'A Ohne Verlauf', 'Alle Spieler haben einen Verlauf', 'OK', ''
   where not exists (
     select 1 from aktiv a
      where not exists (select 1 from public.spieler_wechsel w where w.person_key = a.key))

union all
  -- B) Verlaufszeilen, zu denen es keinen Spieler mehr gibt
  select 20, 'B Verwaist', w.name, 'PRUEFEN',
         'Wechsel vorhanden, aber kein Spieler mit diesem Schluessel — '
         || 'entweder geloescht oder umbenannt.'
    from (select distinct person_key, name from public.spieler_wechsel) w
   where not exists (select 1 from schluessel s where s.key = w.person_key)

union all
  -- C) Widerspruch: Kader sagt X, Verlauf sagt Y
  select 30, 'C Widerspruch',
         a.name || ': Kader ' || a.team || ', Verlauf ' || letzte.nach,
         'PRUEFEN',
         'players.team und der juengste Wechsel stimmen nicht ueberein. '
         || 'Der Wechsel zieht den Kader normalerweise nach — hier ist das nicht passiert.'
    from aktiv a
    join lateral (
      select w.nach from public.spieler_wechsel w
       where w.person_key = a.key
       order by w.datum desc, w.id desc limit 1
    ) letzte on true
   where letzte.nach <> a.team

union all
  select 31, 'C Widerspruch', 'Kader und Verlauf stimmen ueberein', 'OK', ''
   where not exists (
     select 1 from aktiv a
     join lateral (
       select w.nach from public.spieler_wechsel w
        where w.person_key = a.key order by w.datum desc, w.id desc limit 1
     ) l on true
      where l.nach <> a.team)

union all
  -- D) Umfang
  select 40, 'D Umfang', 'Zeilen insgesamt', 'INFO', count(*)::text
    from public.spieler_wechsel
union all
  select 41, 'D Umfang', 'davon echte Wechsel (nicht die Startzeile)', 'INFO',
         count(*)::text from public.spieler_wechsel where von is not null
union all
  select 42, 'D Umfang', 'Stichtag der Erfassung', 'INFO',
         coalesce(min(datum)::text, '—') from public.spieler_wechsel
union all
  select 43, 'D Umfang', 'Spiele seit dem Stichtag', 'INFO',
         (select count(*)::text from public.matches m
           where m.date >= (select min(datum) from public.spieler_wechsel))

order by nr, gegenstand;

-- ============================================================================
--  IMPORT — Saison FIFA 24 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc24.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  38 Spieler (1293 Tore), 31 Sperren,
--  11 SdS-Zeilen, 2 Kontostaende.
--
--  Aus dieser Zeit gibt es KEINE einzelnen Spiele, nur Summen. Bilanz,
--  Duell, Form und Echtgeld bleiben deshalb leer — das ist die Datenlage,
--  kein Fehler. Die App kennzeichnet die Saison ueber LEGACY_SAISONS in
--  src/utils/legacySaison.js entsprechend.
--
--  Sperrdauern sind geschaetzt (Gelb-Rot 1, Rot 2, Verletzung 3 Spiele —
--  die Vorgaben der App); in den Rohdaten stand nur "abgesessen".
--
--  Wiederholbar: loescht zuerst alles dieser Saison und legt es neu an.
-- ============================================================================

begin;

-- 1) Saison registrieren. Die App liest teams direkt aus dieser Spalte
--    (fifaVersionsSync.js) — color/icon/customIcon muessen mit rein,
--    sonst fehlen die Vereinsfarben.
insert into public.fifa_versions (id, name, is_active, teams) values (
  'FC24', 'FIFA 24 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"Alexander","short":"Alex"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Philip","short":"Philip"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC24';
delete from public.spieler_des_spiels where fifa_version = 'FC24';
delete from public.players where fifa_version = 'FC24';
delete from public.finances where fifa_version = 'FC24';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Mbappe', 'Ehemalige', 328, 0, 'FC24'),
  ('Nunez', 'Ehemalige', 182, 0, 'FC24'),
  ('Aspas', 'Ehemalige', 148, 0, 'FC24'),
  ('Depay', 'Ehemalige', 145, 0, 'FC24'),
  ('Dembele', 'Ehemalige', 59, 0, 'FC24'),
  ('Ronaldo', 'Ehemalige', 52, 0, 'FC24'),
  ('Son', 'Ehemalige', 52, 0, 'FC24'),
  ('De Bruyne', 'Ehemalige', 40, 0, 'FC24'),
  ('Otero', 'Ehemalige', 36, 0, 'FC24'),
  ('Openda', 'Ehemalige', 33, 0, 'FC24'),
  ('Podolski', 'Ehemalige', 30, 0, 'FC24'),
  ('Ndaye', 'Ehemalige', 29, 0, 'FC24'),
  ('FIFA', 'Ehemalige', 24, 0, 'FC24'),
  ('Acheampong', 'Ehemalige', 19, 0, 'FC24'),
  ('Lewandowski', 'Ehemalige', 17, 0, 'FC24'),
  ('Nani', 'Ehemalige', 13, 0, 'FC24'),
  ('Adegbenro', 'Ehemalige', 12, 0, 'FC24'),
  ('Lozaro', 'Ehemalige', 10, 0, 'FC24'),
  ('Kante', 'Ehemalige', 9, 0, 'FC24'),
  ('Marquinhos', 'Ehemalige', 8, 0, 'FC24'),
  ('Boateng', 'Ehemalige', 7, 0, 'FC24'),
  ('Neuer', 'Ehemalige', 6, 0, 'FC24'),
  ('Fernando', 'Ehemalige', 4, 0, 'FC24'),
  ('Giroud', 'Ehemalige', 4, 0, 'FC24'),
  ('Van Dijk', 'Ehemalige', 4, 0, 'FC24'),
  ('Al Harbi', 'Ehemalige', 3, 0, 'FC24'),
  ('Kohr', 'Ehemalige', 3, 0, 'FC24'),
  ('Rüdiger', 'Ehemalige', 3, 0, 'FC24'),
  ('Hernandez', 'Ehemalige', 2, 0, 'FC24'),
  ('Kroos', 'Ehemalige', 2, 0, 'FC24'),
  ('Modric', 'Ehemalige', 2, 0, 'FC24'),
  ('Pepe', 'Ehemalige', 2, 0, 'FC24'),
  ('Szeczny', 'Ehemalige', 2, 0, 'FC24'),
  ('Davies', 'Ehemalige', 1, 0, 'FC24'),
  ('Mendy', 'Ehemalige', 1, 0, 'FC24'),
  ('Moore', 'Ehemalige', 1, 0, 'FC24'),
  ('Advincula', 'Ehemalige', 0, 0, 'FC24'),
  ('Otamendi', 'Ehemalige', 0, 0, 'FC24');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Mbappe', 'Ehemalige', 77, 'FC24'),
  ('Nunez', 'Ehemalige', 20, 'FC24'),
  ('Aspas', 'Ehemalige', 16, 'FC24'),
  ('Depay', 'Ehemalige', 10, 'FC24'),
  ('De Bruyne', 'Ehemalige', 3, 'FC24'),
  ('Ndaye', 'Ehemalige', 3, 'FC24'),
  ('Openda', 'Ehemalige', 2, 'FC24'),
  ('Ronaldo', 'Ehemalige', 2, 'FC24'),
  ('Dembele', 'Ehemalige', 1, 'FC24'),
  ('Modric', 'Ehemalige', 1, 'FC24'),
  ('Son', 'Ehemalige', 1, 'FC24');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC24'
from (values
  ('Pepe', 'Verletzung', 6, 6),
  ('Giroud', 'Rote Karte', 2, 2),
  ('Otamendi', 'Gelb-Rote Karte', 1, 1),
  ('Depay', 'Verletzung', 6, 6),
  ('Acheampong', 'Verletzung', 5, 5),
  ('Marquinhos', 'Gelb-Rote Karte', 1, 1),
  ('Al Harbi', 'Rote Karte', 2, 2),
  ('Nunez', 'Verletzung', 4, 4),
  ('Advincula', 'Verletzung', 3, 3),
  ('Nunez', 'Gelb-Rote Karte', 1, 1),
  ('Otero', 'Verletzung', 6, 6),
  ('De Bruyne', 'Gelb-Rote Karte', 1, 1),
  ('Dembele', 'Verletzung', 3, 3),
  ('Al Harbi', 'Verletzung', 4, 4),
  ('Otamendi', 'Verletzung', 5, 5),
  ('Hernandez', 'Verletzung', 6, 6),
  ('Szeczny', 'Verletzung', 3, 3),
  ('Pepe', 'Rote Karte', 2, 2),
  ('Otamendi', 'Verletzung', 5, 5),
  ('Depay', 'Verletzung', 5, 5),
  ('Al Harbi', 'Verletzung', 5, 5),
  ('Szeczny', 'Rote Karte', 2, 2),
  ('Van Dijk', 'Rote Karte', 2, 2),
  ('Otamendi', 'Verletzung', 4, 4),
  ('Rüdiger', 'Verletzung', 5, 5),
  ('Pepe', 'Gelb-Rote Karte', 1, 1),
  ('Neuer', 'Rote Karte', 2, 2),
  ('Moore', 'Verletzung', 3, 3),
  ('Kohr', 'Rote Karte', 2, 2),
  ('Al Harbi', 'Gelb-Rote Karte', 1, 1),
  ('Adegbenro', 'Verletzung', 6, 4)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC24' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC24'),
  ('Real', 41170000, 0, 'FC24');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC24'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC24'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC24'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC24';

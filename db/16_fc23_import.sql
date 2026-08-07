-- ============================================================================
--  IMPORT — Saison FIFA 23 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc23.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  44 Spieler (1147 Tore), 39 Sperren,
--  35 SdS-Zeilen, 2 Kontostaende.
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
  'FC23', 'FIFA 23 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"Alexander","short":"Alex"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Philip","short":"Philip"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC23';
delete from public.spieler_des_spiels where fifa_version = 'FC23';
delete from public.players where fifa_version = 'FC23';
delete from public.finances where fifa_version = 'FC23';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Ronaldo', 'Ehemalige', 222, 0, 'FC23'),
  ('Haaland', 'Ehemalige', 139, 0, 'FC23'),
  ('Benzema', 'Ehemalige', 101, 0, 'FC23'),
  ('Acheampong', 'Ehemalige', 100, 0, 'FC23'),
  ('Mane', 'Ehemalige', 100, 0, 'FC23'),
  ('Hazard', 'Ehemalige', 67, 0, 'FC23'),
  ('Marega', 'Ehemalige', 59, 0, 'FC23'),
  ('Ibrahimovic', 'Ehemalige', 49, 0, 'FC23'),
  ('Visca', 'Ehemalige', 46, 0, 'FC23'),
  ('Traore', 'Ehemalige', 38, 0, 'FC23'),
  ('De Bruyne', 'Ehemalige', 33, 0, 'FC23'),
  ('Bale', 'Ehemalige', 25, 0, 'FC23'),
  ('Cuadrado', 'Ehemalige', 23, 0, 'FC23'),
  ('Mwepu', 'Ehemalige', 20, 0, 'FC23'),
  ('Goretzka', 'Ehemalige', 14, 0, 'FC23'),
  ('Muriel', 'Ehemalige', 13, 0, 'FC23'),
  ('Van Dijk', 'Ehemalige', 12, 0, 'FC23'),
  ('Williams', 'Ehemalige', 11, 0, 'FC23'),
  ('Podolski', 'Ehemalige', 9, 0, 'FC23'),
  ('Wakaso', 'Ehemalige', 8, 0, 'FC23'),
  ('Bebe', 'Ehemalige', 6, 0, 'FC23'),
  ('Kante', 'Ehemalige', 6, 0, 'FC23'),
  ('Walker', 'Ehemalige', 6, 0, 'FC23'),
  ('Mertens', 'Ehemalige', 5, 0, 'FC23'),
  ('Nouhou', 'Ehemalige', 5, 0, 'FC23'),
  ('Rebic', 'Ehemalige', 5, 0, 'FC23'),
  ('Hernandez', 'Ehemalige', 4, 0, 'FC23'),
  ('Mbappe', 'Ehemalige', 4, 0, 'FC23'),
  ('Vardy', 'Ehemalige', 4, 0, 'FC23'),
  ('Pepe', 'Ehemalige', 3, 0, 'FC23'),
  ('St. Juste', 'Ehemalige', 3, 0, 'FC23'),
  ('Bangura', 'Ehemalige', 2, 0, 'FC23'),
  ('Bah', 'Ehemalige', 1, 0, 'FC23'),
  ('Busquets', 'Ehemalige', 1, 0, 'FC23'),
  ('Mendy', 'Ehemalige', 1, 0, 'FC23'),
  ('Nani', 'Ehemalige', 1, 0, 'FC23'),
  ('Varane', 'Ehemalige', 1, 0, 'FC23'),
  ('Chiellini', 'Ehemalige', 0, 0, 'FC23'),
  ('Darikwa', 'Ehemalige', 0, 0, 'FC23'),
  ('Navas', 'Ehemalige', 0, 0, 'FC23'),
  ('Neuer', 'Ehemalige', 0, 0, 'FC23'),
  ('Ramos', 'Ehemalige', 0, 0, 'FC23'),
  ('Saltnes', 'Ehemalige', 0, 0, 'FC23'),
  ('Vertongen', 'Ehemalige', 0, 0, 'FC23');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Ronaldo', 'Ehemalige', 37, 'FC23'),
  ('Haaland', 'Ehemalige', 19, 'FC23'),
  ('Benzema', 'Ehemalige', 16, 'FC23'),
  ('Mane', 'Ehemalige', 16, 'FC23'),
  ('Acheampong', 'Ehemalige', 8, 'FC23'),
  ('Traore', 'Ehemalige', 8, 'FC23'),
  ('Hazard', 'Ehemalige', 6, 'FC23'),
  ('Marega', 'Ehemalige', 6, 'FC23'),
  ('Muriel', 'Ehemalige', 5, 'FC23'),
  ('De Bruyne', 'Ehemalige', 4, 'FC23'),
  ('Hernandez', 'Ehemalige', 4, 'FC23'),
  ('Visca', 'Ehemalige', 4, 'FC23'),
  ('Wakaso', 'Ehemalige', 4, 'FC23'),
  ('Cuadrado', 'Ehemalige', 3, 'FC23'),
  ('Van Dijk', 'Ehemalige', 3, 'FC23'),
  ('Walker', 'Ehemalige', 3, 'FC23'),
  ('Bale', 'Ehemalige', 2, 'FC23'),
  ('Bangura', 'Ehemalige', 2, 'FC23'),
  ('Busquets', 'Ehemalige', 2, 'FC23'),
  ('Goretzka', 'Ehemalige', 2, 'FC23'),
  ('Mwepu', 'Ehemalige', 2, 'FC23'),
  ('Navas', 'Ehemalige', 2, 'FC23'),
  ('Chiellini', 'Ehemalige', 1, 'FC23'),
  ('Ibrahimovic', 'Ehemalige', 1, 'FC23'),
  ('Kante', 'Ehemalige', 1, 'FC23'),
  ('Mbappe', 'Ehemalige', 1, 'FC23'),
  ('Mendy', 'Ehemalige', 1, 'FC23'),
  ('Mertens', 'Ehemalige', 1, 'FC23'),
  ('Neuer', 'Ehemalige', 1, 'FC23'),
  ('Nouhou', 'Ehemalige', 1, 'FC23'),
  ('Pepe', 'Ehemalige', 1, 'FC23'),
  ('Podolski', 'Ehemalige', 1, 'FC23'),
  ('Ramos', 'Ehemalige', 1, 'FC23'),
  ('Saltnes', 'Ehemalige', 1, 'FC23'),
  ('St. Juste', 'Ehemalige', 1, 'FC23');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC23'
from (values
  ('Nouhou', 'Gelb-Rote Karte', 1, 1),
  ('Chiellini', 'Rote Karte', 2, 2),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Ramos', 'Verletzung', 5, 5),
  ('Wakaso', 'Verletzung', 6, 6),
  ('Van Dijk', 'Verletzung', 3, 3),
  ('Kante', 'Gelb-Rote Karte', 1, 1),
  ('Nouhou', 'Verletzung', 3, 3),
  ('Vertongen', 'Verletzung', 3, 3),
  ('Pepe', 'Gelb-Rote Karte', 1, 1),
  ('Darikwa', 'Verletzung', 4, 4),
  ('Chiellini', 'Verletzung', 5, 5),
  ('Haaland', 'Rote Karte', 2, 2),
  ('Bangura', 'Verletzung', 3, 3),
  ('Pepe', 'Rote Karte', 2, 2),
  ('Chiellini', 'Verletzung', 6, 6),
  ('Pepe', 'Gelb-Rote Karte', 1, 1),
  ('Chiellini', 'Verletzung', 6, 6),
  ('Pepe', 'Verletzung', 5, 5),
  ('Kante', 'Verletzung', 6, 6),
  ('Chiellini', 'Verletzung', 4, 4),
  ('Cuadrado', 'Gelb-Rote Karte', 1, 1),
  ('Nouhou', 'Verletzung', 6, 6),
  ('Pepe', 'Verletzung', 6, 6),
  ('Pepe', 'Verletzung', 5, 5),
  ('Benzema', 'Verletzung', 6, 6),
  ('Walker', 'Rote Karte', 2, 2),
  ('Goretzka', 'Gelb-Rote Karte', 1, 1),
  ('Walker', 'Rote Karte', 2, 2),
  ('Kante', 'Gelb-Rote Karte', 1, 1),
  ('Pepe', 'Verletzung', 3, 3),
  ('Haaland', 'Gelb-Rote Karte', 1, 1),
  ('Nouhou', 'Verletzung', 6, 6),
  ('Pepe', 'Gelb-Rote Karte', 1, 1),
  ('Pepe', 'Verletzung', 4, 4),
  ('Goretzka', 'Rote Karte', 2, 2),
  ('Chiellini', 'Gelb-Rote Karte', 1, 1),
  ('Varane', 'Verletzung', 4, 4),
  ('Nouhou', 'Gelb-Rote Karte', 1, 1)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC23' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC23'),
  ('Real', 58680000, 0, 'FC23');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC23'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC23'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC23'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC23';

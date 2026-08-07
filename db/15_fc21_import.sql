-- ============================================================================
--  IMPORT — Saison FIFA 21 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc21.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  46 Spieler (791 Tore), 7 Sperren,
--  19 SdS-Zeilen, 2 Kontostaende.
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
  'FC21', 'FIFA 21 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"Alexander","short":"Alex"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Philip","short":"Philip"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC21';
delete from public.spieler_des_spiels where fifa_version = 'FC21';
delete from public.players where fifa_version = 'FC21';
delete from public.finances where fifa_version = 'FC21';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Ronaldo', 'Real', 175, 60, 'FC21'),
  ('Eder', 'AEK', 136, 1.6, 'FC21'),
  ('Lewandowski', 'Real', 93, 60, 'FC21'),
  ('Ibrahimovic', 'AEK', 82, 3.5, 'FC21'),
  ('Hulk', 'AEK', 46, 5, 'FC21'),
  ('Vardy', 'Real', 38, 16, 'FC21'),
  ('Aubameyang', 'Real', 31, 56, 'FC21'),
  ('Salah', 'Ehemalige', 23, 0, 'FC21'),
  ('Dyballa', 'Ehemalige', 22, 0, 'FC21'),
  ('Matheus', 'Ehemalige', 21, 0, 'FC21'),
  ('Pauliniho', 'Ehemalige', 21, 0, 'FC21'),
  ('Di Maria', 'Real', 14, 32, 'FC21'),
  ('Ribery', 'AEK', 13, 3, 'FC21'),
  ('Portu', 'Real', 11, 16, 'FC21'),
  ('Mane', 'Real', 10, 120, 'FC21'),
  ('Robben', 'AEK', 9, 2, 'FC21'),
  ('Modric', 'Real', 8, 10, 'FC21'),
  ('Gervinio', 'AEK', 7, 5, 'FC21'),
  ('Iniesta', 'AEK', 7, 3.2, 'FC21'),
  ('Silva', 'Real', 4, 5, 'FC21'),
  ('Fernandiho', 'Ehemalige', 3, 0, 'FC21'),
  ('Advincula', 'Real', 2, 1.5, 'FC21'),
  ('Fuenzalida', 'Real', 2, 0.4, 'FC21'),
  ('Kolarov', 'AEK', 2, 5, 'FC21'),
  ('Ramos', 'Real', 2, 14, 'FC21'),
  ('Zakaria', 'Ehemalige', 2, 0, 'FC21'),
  ('Chiellini', 'AEK', 1, 3, 'FC21'),
  ('Costa', 'Ehemalige', 1, 0, 'FC21'),
  ('Mascherano', 'Ehemalige', 1, 0, 'FC21'),
  ('Mendy', 'Real', 1, 40, 'FC21'),
  ('Navas', 'AEK', 1, 3, 'FC21'),
  ('Opazo', 'Real', 1, 1.2, 'FC21'),
  ('Van Dijk', 'Real', 1, 80, 'FC21'),
  ('Babel', 'AEK', 0, 2, 'FC21'),
  ('Buffon', 'Real', 0, 1, 'FC21'),
  ('Handanovic', 'AEK', 0, 4, 'FC21'),
  ('Hilton', 'AEK', 0, 0.1, 'FC21'),
  ('Kante', 'Real', 0, 80, 'FC21'),
  ('Matthäus', 'AEK', 0, 0.2, 'FC21'),
  ('Matuidi', 'Real', 0, 6, 'FC21'),
  ('Mayada', 'Real', 0, 1.8, 'FC21'),
  ('Miura', 'AEK', 0, 0.1, 'FC21'),
  ('Neuer', 'Real', 0, 18, 'FC21'),
  ('Pepe', 'AEK', 0, 0.8, 'FC21'),
  ('Podolski', 'AEK', 0, 0.8, 'FC21'),
  ('Varane', 'Real', 0, 70, 'FC21');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Ronaldo', 'Real', 29, 'FC21'),
  ('Eder', 'AEK', 20, 'FC21'),
  ('Lewandowski', 'Real', 11, 'FC21'),
  ('Ibrahimovic', 'AEK', 5, 'FC21'),
  ('Pauliniho', 'Ehemalige', 5, 'FC21'),
  ('Vardy', 'Real', 5, 'FC21'),
  ('Hulk', 'AEK', 4, 'FC21'),
  ('Modric', 'Real', 3, 'FC21'),
  ('Aubameyang', 'Real', 2, 'FC21'),
  ('Handanovic', 'AEK', 2, 'FC21'),
  ('Advincula', 'Real', 1, 'FC21'),
  ('Di Maria', 'Real', 1, 'FC21'),
  ('Dyballa', 'Ehemalige', 1, 'FC21'),
  ('Iniesta', 'AEK', 1, 'FC21'),
  ('Mane', 'Real', 1, 'FC21'),
  ('Matheus', 'Ehemalige', 1, 'FC21'),
  ('Neuer', 'Real', 1, 'FC21'),
  ('Silva', 'Real', 1, 'FC21'),
  ('Van Dijk', 'Real', 1, 'FC21');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC21'
from (values
  ('Navas', 'Gelb-Rote Karte', 1, 1),
  ('Di Maria', 'Rote Karte', 2, 2),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Varane', 'Gelb-Rote Karte', 1, 1),
  ('Silva', 'Gelb-Rote Karte', 1, 1),
  ('Silva', 'Rote Karte', 2, 2),
  ('Varane', 'Verletzung', 6, 3)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC21' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 150000, 0, 'FC21'),
  ('Real', 11310000, 0, 'FC21');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC21'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC21'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC21'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC21';

-- ============================================================================
--  IMPORT — Saison FIFA 19 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc19.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  38 Spieler (981 Tore), 47 Sperren,
--  31 SdS-Zeilen, 2 Kontostaende.
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
  'FC19', 'FIFA 19 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"Alexander","short":"Alex"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Philip","short":"Philip"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC19';
delete from public.spieler_des_spiels where fifa_version = 'FC19';
delete from public.players where fifa_version = 'FC19';
delete from public.finances where fifa_version = 'FC19';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Lewandowski', 'Ehemalige', 188, 0, 'FC19'),
  ('Aubameyang', 'Ehemalige', 114, 0, 'FC19'),
  ('Aduriz', 'Ehemalige', 91, 0, 'FC19'),
  ('Williams', 'Ehemalige', 81, 0, 'FC19'),
  ('Modric', 'Ehemalige', 64, 0, 'FC19'),
  ('Heller', 'Ehemalige', 63, 0, 'FC19'),
  ('Ibrahimovic', 'Ehemalige', 52, 0, 'FC19'),
  ('Taison', 'Ehemalige', 47, 0, 'FC19'),
  ('Martins', 'Ehemalige', 41, 0, 'FC19'),
  ('Cavani', 'Ehemalige', 38, 0, 'FC19'),
  ('Barkhuizen', 'Ehemalige', 26, 0, 'FC19'),
  ('Kante', 'Ehemalige', 26, 0, 'FC19'),
  ('Hallaran', 'Ehemalige', 18, 0, 'FC19'),
  ('Pavon', 'Ehemalige', 15, 0, 'FC19'),
  ('Ramos', 'Ehemalige', 14, 0, 'FC19'),
  ('Lucas', 'Ehemalige', 12, 0, 'FC19'),
  ('Manneh', 'Ehemalige', 12, 0, 'FC19'),
  ('Aguierre', 'Ehemalige', 11, 0, 'FC19'),
  ('Chiellini', 'Ehemalige', 8, 0, 'FC19'),
  ('Hurtado', 'Ehemalige', 8, 0, 'FC19'),
  ('Senior', 'Ehemalige', 8, 0, 'FC19'),
  ('Mazek', 'Ehemalige', 7, 0, 'FC19'),
  ('Naldo', 'Ehemalige', 7, 0, 'FC19'),
  ('Mohammad', 'Ehemalige', 5, 0, 'FC19'),
  ('Advincula', 'Ehemalige', 4, 0, 'FC19'),
  ('Elia', 'Ehemalige', 4, 0, 'FC19'),
  ('Barzagli', 'Ehemalige', 3, 0, 'FC19'),
  ('Mbabu', 'Ehemalige', 3, 0, 'FC19'),
  ('Silva', 'Ehemalige', 3, 0, 'FC19'),
  ('Buffon', 'Ehemalige', 2, 0, 'FC19'),
  ('Adriano', 'Ehemalige', 1, 0, 'FC19'),
  ('Bale', 'Ehemalige', 1, 0, 'FC19'),
  ('Hernandez', 'Ehemalige', 1, 0, 'FC19'),
  ('Hilton', 'Ehemalige', 1, 0, 'FC19'),
  ('Pepe', 'Ehemalige', 1, 0, 'FC19'),
  ('Yedlin', 'Ehemalige', 1, 0, 'FC19'),
  ('Neuer', 'Ehemalige', 0, 0, 'FC19'),
  ('Valentin', 'Ehemalige', 0, 0, 'FC19');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Lewandowski', 'Ehemalige', 34, 'FC19'),
  ('Aubameyang', 'Ehemalige', 28, 'FC19'),
  ('Williams', 'Ehemalige', 22, 'FC19'),
  ('Modric', 'Ehemalige', 20, 'FC19'),
  ('Martins', 'Ehemalige', 14, 'FC19'),
  ('Heller', 'Ehemalige', 13, 'FC19'),
  ('Cavani', 'Ehemalige', 12, 'FC19'),
  ('Aduriz', 'Ehemalige', 10, 'FC19'),
  ('Taison', 'Ehemalige', 9, 'FC19'),
  ('Ibrahimovic', 'Ehemalige', 8, 'FC19'),
  ('Kante', 'Ehemalige', 8, 'FC19'),
  ('Barkhuizen', 'Ehemalige', 6, 'FC19'),
  ('Naldo', 'Ehemalige', 6, 'FC19'),
  ('Chiellini', 'Ehemalige', 4, 'FC19'),
  ('Lucas', 'Ehemalige', 4, 'FC19'),
  ('Pavon', 'Ehemalige', 4, 'FC19'),
  ('Ramos', 'Ehemalige', 4, 'FC19'),
  ('Aguierre', 'Ehemalige', 3, 'FC19'),
  ('Valentin', 'Ehemalige', 3, 'FC19'),
  ('Barzagli', 'Ehemalige', 2, 'FC19'),
  ('Hallaran', 'Ehemalige', 2, 'FC19'),
  ('Hurtado', 'Ehemalige', 2, 'FC19'),
  ('Manneh', 'Ehemalige', 2, 'FC19'),
  ('Mazek', 'Ehemalige', 2, 'FC19'),
  ('Pepe', 'Ehemalige', 2, 'FC19'),
  ('Advincula', 'Ehemalige', 1, 'FC19'),
  ('Buffon', 'Ehemalige', 1, 'FC19'),
  ('Hernandez', 'Ehemalige', 1, 'FC19'),
  ('Mbabu', 'Ehemalige', 1, 'FC19'),
  ('Senior', 'Ehemalige', 1, 'FC19'),
  ('Silva', 'Ehemalige', 1, 'FC19');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC19'
from (values
  ('Chiellini', 'Verletzung', 6, 6),
  ('Lewandowski', 'Verletzung', 4, 4),
  ('Ramos', 'Verletzung', 6, 6),
  ('Barzagli', 'Verletzung', 6, 6),
  ('Barkhuizen', 'Gelb-Rote Karte', 1, 1),
  ('Ramos', 'Verletzung', 6, 6),
  ('Heller', 'Gelb-Rote Karte', 1, 1),
  ('Kante', 'Verletzung', 6, 6),
  ('Manneh', 'Rote Karte', 2, 2),
  ('Ibrahimovic', 'Gelb-Rote Karte', 1, 1),
  ('Ramos', 'Verletzung', 6, 6),
  ('Barzagli', 'Verletzung', 5, 5),
  ('Valentin', 'Gelb-Rote Karte', 1, 1),
  ('Barkhuizen', 'Verletzung', 5, 5),
  ('Naldo', 'Verletzung', 3, 3),
  ('Hallaran', 'Verletzung', 3, 3),
  ('Kante', 'Gelb-Rote Karte', 1, 1),
  ('Naldo', 'Verletzung', 4, 4),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Mazek', 'Verletzung', 3, 3),
  ('Barzagli', 'Rote Karte', 2, 2),
  ('Barzagli', 'Verletzung', 5, 5),
  ('Mazek', 'Rote Karte', 2, 2),
  ('Senior', 'Verletzung', 6, 6),
  ('Buffon', 'Verletzung', 6, 6),
  ('Barzagli', 'Rote Karte', 2, 2),
  ('Hernandez', 'Verletzung', 3, 3),
  ('Silva', 'Verletzung', 6, 6),
  ('Barzagli', 'Verletzung', 5, 5),
  ('Hilton', 'Gelb-Rote Karte', 1, 1),
  ('Valentin', 'Verletzung', 6, 6),
  ('Barzagli', 'Gelb-Rote Karte', 1, 1),
  ('Manneh', 'Gelb-Rote Karte', 1, 1),
  ('Kante', 'Gelb-Rote Karte', 1, 1),
  ('Ibrahimovic', 'Gelb-Rote Karte', 1, 1),
  ('Martins', 'Gelb-Rote Karte', 1, 1),
  ('Chiellini', 'Verletzung', 5, 5),
  ('Hernandez', 'Gelb-Rote Karte', 1, 1),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Barzagli', 'Gelb-Rote Karte', 1, 1),
  ('Naldo', 'Gelb-Rote Karte', 1, 1),
  ('Aubameyang', 'Verletzung', 6, 6),
  ('Williams', 'Verletzung', 3, 3),
  ('Chiellini', 'Verletzung', 5, 5),
  ('Neuer', 'Verletzung', 6, 6),
  ('Naldo', 'Verletzung', 4, 4),
  ('Aduriz', 'Verletzung', 6, 3)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC19' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC19'),
  ('Real', 68010000, 0, 'FC19');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC19'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC19'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC19'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC19';

-- ============================================================================
--  IMPORT — Saison FIFA 20 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc20.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  47 Spieler (1131 Tore), 66 Sperren,
--  30 SdS-Zeilen, 2 Kontostaende.
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
  'FC20', 'FIFA 20 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"Alexander","short":"Alex"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Philip","short":"Philip"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC20';
delete from public.spieler_des_spiels where fifa_version = 'FC20';
delete from public.players where fifa_version = 'FC20';
delete from public.finances where fifa_version = 'FC20';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Bakambu', 'Ehemalige', 194, 0, 'FC20'),
  ('Ibrahimovic', 'Ehemalige', 184, 0, 'FC20'),
  ('Lewandowski', 'Ehemalige', 118, 0, 'FC20'),
  ('Lavezzi', 'Ehemalige', 117, 0, 'FC20'),
  ('Ronaldo', 'Ehemalige', 100, 0, 'FC20'),
  ('Aubameyang', 'Ehemalige', 64, 0, 'FC20'),
  ('Hulk', 'Ehemalige', 42, 0, 'FC20'),
  ('Modric', 'Ehemalige', 37, 0, 'FC20'),
  ('Chara', 'Ehemalige', 32, 0, 'FC20'),
  ('De Rossi', 'Ehemalige', 31, 0, 'FC20'),
  ('Cuadrado', 'Ehemalige', 29, 0, 'FC20'),
  ('Heller', 'Ehemalige', 25, 0, 'FC20'),
  ('Bifuma', 'Ehemalige', 24, 0, 'FC20'),
  ('Mertens', 'Ehemalige', 17, 0, 'FC20'),
  ('Visca', 'Ehemalige', 13, 0, 'FC20'),
  ('Coman', 'Ehemalige', 12, 0, 'FC20'),
  ('Navas', 'Ehemalige', 8, 0, 'FC20'),
  ('Promes', 'Ehemalige', 8, 0, 'FC20'),
  ('Quaresma', 'Ehemalige', 8, 0, 'FC20'),
  ('Marega', 'Ehemalige', 7, 0, 'FC20'),
  ('Mbabu', 'Ehemalige', 7, 0, 'FC20'),
  ('Williams', 'Ehemalige', 7, 0, 'FC20'),
  ('Hernandez', 'Ehemalige', 6, 0, 'FC20'),
  ('Kimmisch', 'Ehemalige', 4, 0, 'FC20'),
  ('Nani', 'Ehemalige', 4, 0, 'FC20'),
  ('Ramos', 'Ehemalige', 4, 0, 'FC20'),
  ('Depay', 'Ehemalige', 3, 0, 'FC20'),
  ('Rayhner', 'Ehemalige', 3, 0, 'FC20'),
  ('Rojas', 'Ehemalige', 3, 0, 'FC20'),
  ('Varane', 'Ehemalige', 3, 0, 'FC20'),
  ('Buffon', 'Ehemalige', 2, 0, 'FC20'),
  ('Ibarra', 'Ehemalige', 2, 0, 'FC20'),
  ('Mariano', 'Ehemalige', 2, 0, 'FC20'),
  ('Mathieu', 'Ehemalige', 2, 0, 'FC20'),
  ('Advincula', 'Ehemalige', 1, 0, 'FC20'),
  ('Agierre', 'Ehemalige', 1, 0, 'FC20'),
  ('Barbut', 'Ehemalige', 1, 0, 'FC20'),
  ('Chiellini', 'Ehemalige', 1, 0, 'FC20'),
  ('Hallo', 'Ehemalige', 1, 0, 'FC20'),
  ('Manneh', 'Ehemalige', 1, 0, 'FC20'),
  ('Pepe', 'Ehemalige', 1, 0, 'FC20'),
  ('Silva', 'Ehemalige', 1, 0, 'FC20'),
  ('Valbuena', 'Ehemalige', 1, 0, 'FC20'),
  ('Bolingoli', 'Ehemalige', 0, 0, 'FC20'),
  ('Hakimi', 'Ehemalige', 0, 0, 'FC20'),
  ('Hilton', 'Ehemalige', 0, 0, 'FC20'),
  ('Issoko', 'Ehemalige', 0, 0, 'FC20');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Bakambu', 'Ehemalige', 33, 'FC20'),
  ('Lewandowski', 'Ehemalige', 27, 'FC20'),
  ('Ibrahimovic', 'Ehemalige', 26, 'FC20'),
  ('Lavezzi', 'Ehemalige', 22, 'FC20'),
  ('Ronaldo', 'Ehemalige', 16, 'FC20'),
  ('Aubameyang', 'Ehemalige', 13, 'FC20'),
  ('De Rossi', 'Ehemalige', 5, 'FC20'),
  ('Hulk', 'Ehemalige', 5, 'FC20'),
  ('Modric', 'Ehemalige', 4, 'FC20'),
  ('Silva', 'Ehemalige', 4, 'FC20'),
  ('Williams', 'Ehemalige', 4, 'FC20'),
  ('Chara', 'Ehemalige', 3, 'FC20'),
  ('Cuadrado', 'Ehemalige', 3, 'FC20'),
  ('Pepe', 'Ehemalige', 3, 'FC20'),
  ('Quaresma', 'Ehemalige', 3, 'FC20'),
  ('Ramos', 'Ehemalige', 3, 'FC20'),
  ('Heller', 'Ehemalige', 2, 'FC20'),
  ('Mathieu', 'Ehemalige', 2, 'FC20'),
  ('Mertens', 'Ehemalige', 2, 'FC20'),
  ('Bifuma', 'Ehemalige', 1, 'FC20'),
  ('Chiellini', 'Ehemalige', 1, 'FC20'),
  ('Depay', 'Ehemalige', 1, 'FC20'),
  ('Ibarra', 'Ehemalige', 1, 'FC20'),
  ('Issoko', 'Ehemalige', 1, 'FC20'),
  ('Mbabu', 'Ehemalige', 1, 'FC20'),
  ('Promes', 'Ehemalige', 1, 'FC20'),
  ('Rayhner', 'Ehemalige', 1, 'FC20'),
  ('Rojas', 'Ehemalige', 1, 'FC20'),
  ('Varane', 'Ehemalige', 1, 'FC20'),
  ('Visca', 'Ehemalige', 1, 'FC20');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC20'
from (values
  ('Ramos', 'Verletzung', 3, 3),
  ('Mathieu', 'Gelb-Rote Karte', 1, 1),
  ('Ibrahimovic', 'Gelb-Rote Karte', 1, 1),
  ('Mathieu', 'Gelb-Rote Karte', 1, 1),
  ('Aubameyang', 'Verletzung', 5, 5),
  ('Silva', 'Verletzung', 5, 5),
  ('Pepe', 'Verletzung', 4, 4),
  ('Mathieu', 'Rote Karte', 2, 2),
  ('Ramos', 'Verletzung', 6, 6),
  ('Hernandez', 'Verletzung', 6, 6),
  ('Chiellini', 'Gelb-Rote Karte', 1, 1),
  ('Lavezzi', 'Verletzung', 6, 6),
  ('Varane', 'Gelb-Rote Karte', 1, 1),
  ('Mbabu', 'Verletzung', 5, 5),
  ('Ramos', 'Verletzung', 4, 4),
  ('Lewandowski', 'Rote Karte', 2, 2),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Varane', 'Gelb-Rote Karte', 1, 1),
  ('Lavezzi', 'Gelb-Rote Karte', 1, 1),
  ('Aubameyang', 'Gelb-Rote Karte', 1, 1),
  ('Hernandez', 'Verletzung', 5, 5),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('De Rossi', 'Verletzung', 5, 5),
  ('Varane', 'Verletzung', 4, 4),
  ('Ronaldo', 'Verletzung', 6, 6),
  ('Lewandowski', 'Gelb-Rote Karte', 1, 1),
  ('Bolingoli', 'Gelb-Rote Karte', 1, 1),
  ('Varane', 'Verletzung', 3, 3),
  ('Ramos', 'Gelb-Rote Karte', 1, 1),
  ('Advincula', 'Verletzung', 3, 3),
  ('Chara', 'Gelb-Rote Karte', 1, 1),
  ('Pepe', 'Verletzung', 4, 3),
  ('Aubameyang', 'Rote Karte', 2, 2),
  ('Mbabu', 'Verletzung', 4, 4),
  ('Varane', 'Gelb-Rote Karte', 1, 1),
  ('Hernandez', 'Gelb-Rote Karte', 1, 1),
  ('Lewandowski', 'Rote Karte', 2, 2),
  ('Silva', 'Verletzung', 5, 5),
  ('Ronaldo', 'Verletzung', 4, 4),
  ('Mbabu', 'Verletzung', 4, 4),
  ('Hernandez', 'Verletzung', 5, 5),
  ('Pepe', 'Verletzung', 6, 6),
  ('Lewandowski', 'Verletzung', 3, 3),
  ('Hilton', 'Verletzung', 4, 4),
  ('Mbabu', 'Verletzung', 4, 4),
  ('Ronaldo', 'Verletzung', 5, 5),
  ('Cuadrado', 'Gelb-Rote Karte', 1, 1),
  ('Visca', 'Verletzung', 5, 5),
  ('Pepe', 'Verletzung', 4, 4),
  ('Ibrahimovic', 'Rote Karte', 2, 2),
  ('Mariano', 'Gelb-Rote Karte', 1, 1),
  ('Mathieu', 'Verletzung', 3, 3),
  ('Varane', 'Rote Karte', 2, 2),
  ('Hernandez', 'Verletzung', 5, 5),
  ('Silva', 'Verletzung', 6, 6),
  ('Hakimi', 'Verletzung', 6, 6),
  ('Ramos', 'Verletzung', 3, 3),
  ('De Rossi', 'Verletzung', 5, 3),
  ('Chiellini', 'Rote Karte', 2, 2),
  ('Pepe', 'Verletzung', 5, 2),
  ('Chara', 'Gelb-Rote Karte', 1, 1),
  ('Ibrahimovic', 'Gelb-Rote Karte', 1, 1),
  ('Hulk', 'Gelb-Rote Karte', 1, 1),
  ('Mathieu', 'Verletzung', 5, 1),
  ('Bifuma', 'Gelb-Rote Karte', 1, 1),
  ('Aubameyang', 'Verletzung', 6, 0)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC20' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC20'),
  ('Real', 25620000, 0, 'FC20');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC20'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC20'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC20'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC20';

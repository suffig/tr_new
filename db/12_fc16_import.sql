-- ============================================================================
--  IMPORT — Saison FIFA 16 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc16.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  47 Spieler (291 Tore), 24 Sperren,
--  20 SdS-Zeilen, 2 Kontostaende.
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
  'FC16', 'FIFA 16 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"AC Milan","short":"Milan"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Hertha BSC","short":"Berlin"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC16';
delete from public.spieler_des_spiels where fifa_version = 'FC16';
delete from public.players where fifa_version = 'FC16';
delete from public.finances where fifa_version = 'FC16';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Aubameyang', 'Real', 58, 25, 'FC16'),
  ('Ibrahimovic', 'Real', 30, 15, 'FC16'),
  ('Aduriz', 'Ehemalige', 26, 0, 'FC16'),
  ('Castillo', 'AEK', 17, 1, 'FC16'),
  ('Gerrard', 'AEK', 17, 2, 'FC16'),
  ('Gerso', 'AEK', 15, 1.2, 'FC16'),
  ('Di Natale', 'AEK', 12, 1, 'FC16'),
  ('Hulk', 'Ehemalige', 12, 0, 'FC16'),
  ('Barzagli', 'Real', 10, 3, 'FC16'),
  ('Lampard', 'AEK', 10, 1, 'FC16'),
  ('Biabiany', 'Real', 8, 4, 'FC16'),
  ('Esswein', 'Real', 8, 1.5, 'FC16'),
  ('Rooney', 'Real', 8, 40, 'FC16'),
  ('Igboun', 'Real', 6, 1.25, 'FC16'),
  ('Lee Seung Hyun', 'AEK', 6, 0, 'FC16'),
  ('Martins', 'Real', 6, 2.5, 'FC16'),
  ('Bolly', 'AEK', 5, 0.45, 'FC16'),
  ('Vidic', 'AEK', 5, 1, 'FC16'),
  ('Kamara', 'Real', 4, 0.6, 'FC16'),
  ('Keita', 'AEK', 4, 0.5, 'FC16'),
  ('Mauri', 'AEK', 4, 0.5, 'FC16'),
  ('Naldo', 'Real', 3, 5, 'FC16'),
  ('Uche', 'Ehemalige', 3, 0, 'FC16'),
  ('Al-Shahrani', 'Real', 2, 0.2, 'FC16'),
  ('Amrabat', 'Real', 2, 6, 'FC16'),
  ('Maicon', 'AEK', 2, 1, 'FC16'),
  ('Pirlo', 'Real', 2, 1, 'FC16'),
  ('Stranzl', 'AEK', 2, 1.5, 'FC16'),
  ('Yilmaz', 'Ehemalige', 2, 0, 'FC16'),
  ('Guarin', 'Real', 1, 12, 'FC16'),
  ('Tshimanga', 'Real', 1, 2, 'FC16'),
  ('Al-Ghamdi', 'Real', 0, 0.05, 'FC16'),
  ('Buffon', 'AEK', 0, 2, 'FC16'),
  ('Chedjou', 'Real', 0, 8, 'FC16'),
  ('De Sanctis', 'Ehemalige', 0, 0, 'FC16'),
  ('Diouf', 'Real', 0, 10, 'FC16'),
  ('Evra', 'Ehemalige', 0, 0, 'FC16'),
  ('Helton', 'Real', 0, 0.8, 'FC16'),
  ('Mojica', 'Real', 0, 2, 'FC16'),
  ('Mukhytarian', 'Real', 0, 18, 'FC16'),
  ('Neuer', 'Real', 0, 45, 'FC16'),
  ('Ntep', 'Real', 0, 10, 'FC16'),
  ('Palacio', 'Real', 0, 4, 'FC16'),
  ('Paterson', 'Real', 0, 0.45, 'FC16'),
  ('Rizzato', 'Real', 0, 0.2, 'FC16'),
  ('Twumasi', 'Real', 0, 0.075, 'FC16'),
  ('Yedlin', 'Real', 0, 1.5, 'FC16');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Aubameyang', 'Real', 11, 'FC16'),
  ('Buffon', 'AEK', 7, 'FC16'),
  ('Neuer', 'Real', 5, 'FC16'),
  ('Gerrard', 'AEK', 3, 'FC16'),
  ('Vidic', 'AEK', 3, 'FC16'),
  ('Hulk', 'Ehemalige', 2, 'FC16'),
  ('Ibrahimovic', 'Real', 2, 'FC16'),
  ('Igboun', 'Real', 2, 'FC16'),
  ('Stranzl', 'AEK', 2, 'FC16'),
  ('Yilmaz', 'Ehemalige', 2, 'FC16'),
  ('Aduriz', 'Ehemalige', 1, 'FC16'),
  ('Amrabat', 'Real', 1, 'FC16'),
  ('Castillo', 'AEK', 1, 'FC16'),
  ('De Sanctis', 'Ehemalige', 1, 'FC16'),
  ('Di Natale', 'AEK', 1, 'FC16'),
  ('Gerso', 'AEK', 1, 'FC16'),
  ('Keita', 'AEK', 1, 'FC16'),
  ('Lampard', 'AEK', 1, 'FC16'),
  ('Mauri', 'AEK', 1, 'FC16'),
  ('Rooney', 'Real', 1, 'FC16');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.abgesessen, s.art, 'FC16'
from (values
  ('Martins', 'Verletzung', 3, 3),
  ('Maicon', 'Verletzung', 3, 3),
  ('Aduriz', 'Gelb-Rote Karte', 1, 1),
  ('Maicon', 'Rote Karte', 2, 2),
  ('Stranzl', 'Rote Karte', 2, 2),
  ('Vidic', 'Gelb-Rote Karte', 1, 1),
  ('Evra', 'Rote Karte', 2, 2),
  ('Mauri', 'Rote Karte', 2, 2),
  ('Lampard', 'Verletzung', 3, 3),
  ('Pirlo', 'Verletzung', 3, 3),
  ('Buffon', 'Rote Karte', 2, 2),
  ('Evra', 'Rote Karte', 2, 2),
  ('Castillo', 'Verletzung', 3, 3),
  ('Gerrard', 'Rote Karte', 2, 2),
  ('Igboun', 'Verletzung', 3, 3),
  ('Vidic', 'Verletzung', 3, 3),
  ('Barzagli', 'Gelb-Rote Karte', 1, 1),
  ('Keita', 'Rote Karte', 2, 2),
  ('Maicon', 'Rote Karte', 2, 2),
  ('Maicon', 'Rote Karte', 2, 2),
  ('Keita', 'Rote Karte', 2, 2),
  ('Stranzl', 'Rote Karte', 2, 2),
  ('Stranzl', 'Gelb-Rote Karte', 1, 1),
  ('Buffon', 'Rote Karte', 2, 0)
) as s(name, art, dauer, abgesessen)
join public.players p on p.fifa_version = 'FC16' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC16'),
  ('Real', 11040000, 0, 'FC16');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC16'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC16'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC16'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC16';

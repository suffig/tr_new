-- ============================================================================
--  IMPORT — Saison FIFA 15 Ultimate Team  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  Erzeugt von scripts/altsaison-import.mjs — nicht von Hand aendern,
--  sondern scripts/altsaisons/fc15.mjs anpassen.
--
--  VORHER: Backup anlegen (Supabase -> Database -> Backups).
--
--  72 Spieler (1073 Tore), 108 Sperren,
--  40 SdS-Zeilen, 2 Kontostaende.
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
  'FC15', 'FIFA 15 Ultimate Team', false,
  '{"AEK":{"color":"blue","icon":"aek","customIcon":null,"label":"AC Milan","short":"Milan"},"Real":{"color":"red","icon":"real","customIcon":null,"label":"Manchester City","short":"City"},"Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"⚫","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC15';
delete from public.spieler_des_spiels where fifa_version = 'FC15';
delete from public.players where fifa_version = 'FC15';
delete from public.finances where fifa_version = 'FC15';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Martins', 'Real', 189, 2.5, 'FC15'),
  ('Uche', 'Real', 152, 4, 'FC15'),
  ('Olic', 'Ehemalige', 93, 0, 'FC15'),
  ('Aubameyang', 'Real', 78, 17, 'FC15'),
  ('Di Natale', 'AEK', 56, 1, 'FC15'),
  ('Hernandez', 'Real', 38, 2, 'FC15'),
  ('Berbatov', 'Ehemalige', 29, 0, 'FC15'),
  ('Töre', 'Real', 28, 7, 'FC15'),
  ('Lukaku', 'Real', 27, 30, 'FC15'),
  ('Klose', 'Ehemalige', 25, 0, 'FC15'),
  ('Tevez', 'Ehemalige', 24, 0, 'FC15'),
  ('Oduamadi', 'AEK', 18, 0.75, 'FC15'),
  ('Pepe', 'Ehemalige', 16, 0, 'FC15'),
  ('Al Muwallad', 'Real', 15, 0.1, 'FC15'),
  ('Cedrick', 'Ehemalige', 14, 0, 'FC15'),
  ('Maicon', 'Ehemalige', 14, 0, 'FC15'),
  ('Alex', 'AEK', 11, 4.5, 'FC15'),
  ('Depay', 'Real', 11, 12, 'FC15'),
  ('Lee Seung Hyun', 'AEK', 11, 0, 'FC15'),
  ('Remy', 'Ehemalige', 11, 0, 'FC15'),
  ('Yedlin', 'AEK', 11, 0.25, 'FC15'),
  ('Drogba', 'Real', 10, 1, 'FC15'),
  ('Hilton', 'AEK', 10, 0.5, 'FC15'),
  ('Terry', 'Ehemalige', 10, 0, 'FC15'),
  ('Totti', 'Ehemalige', 10, 0, 'FC15'),
  ('Embolo', 'Real', 9, 0.25, 'FC15'),
  ('Kehl', 'Ehemalige', 9, 0, 'FC15'),
  ('Evra', 'Real', 8, 4, 'FC15'),
  ('Fekir', 'Real', 8, 2, 'FC15'),
  ('Keita', 'AEK', 8, 0.5, 'FC15'),
  ('Touré', 'Ehemalige', 8, 0, 'FC15'),
  ('Könnecke', 'AEK', 7, 0.25, 'FC15'),
  ('Mbakogu', 'Ehemalige', 7, 0, 'FC15'),
  ('Bellarabi', 'Real', 6, 2.5, 'FC15'),
  ('Ibrahimovic', 'Ehemalige', 6, 0, 'FC15'),
  ('Lampard', 'Real', 6, 1.5, 'FC15'),
  ('Montanes', 'AEK', 6, 1.5, 'FC15'),
  ('Pirlo', 'Ehemalige', 6, 0, 'FC15'),
  ('Aboubakar', 'Ehemalige', 5, 0, 'FC15'),
  ('Carvalho', 'Ehemalige', 5, 0, 'FC15'),
  ('Djilodji', 'Real', 5, 5, 'FC15'),
  ('Ferdinand', 'Real', 5, 1, 'FC15'),
  ('Lukoki', 'AEK', 5, 0.85, 'FC15'),
  ('Manneh', 'Ehemalige', 5, 0, 'FC15'),
  ('Romeron', 'Real', 5, 0, 'FC15'),
  ('Beauvue', 'AEK', 4, 2, 'FC15'),
  ('Navarro', 'Ehemalige', 4, 0, 'FC15'),
  ('Aduriz', 'AEK', 3, 3, 'FC15'),
  ('Bolly', 'Ehemalige', 3, 0, 'FC15'),
  ('Campagnaro', 'AEK', 3, 1, 'FC15'),
  ('Lacazette', 'Ehemalige', 3, 0, 'FC15'),
  ('Al Shahrani', 'Real', 2, 0.2, 'FC15'),
  ('De Bruyne', 'Ehemalige', 2, 0, 'FC15'),
  ('Milito', 'Ehemalige', 2, 0, 'FC15'),
  ('Ngyuen', 'Ehemalige', 2, 0, 'FC15'),
  ('Oduro', 'Real', 2, 0.45, 'FC15'),
  ('Xavi', 'Ehemalige', 2, 0, 'FC15'),
  ('Boluasie', 'Ehemalige', 1, 0, 'FC15'),
  ('A. Cole', 'Ehemalige', 0, 0, 'FC15'),
  ('Aranguren', 'Real', 0, 0, 'FC15'),
  ('Barzagli', 'Real', 0, 7, 'FC15'),
  ('Buffon', 'Real', 0, 3, 'FC15'),
  ('Cavanda', 'Real', 0, 2, 'FC15'),
  ('Cesar', 'AEK', 0, 1.5, 'FC15'),
  ('De Sanctis', 'Real', 0, 1, 'FC15'),
  ('Guerron', 'Real', 0, 1, 'FC15'),
  ('Neuer', 'Real', 0, 40, 'FC15'),
  ('Odu', 'Ehemalige', 0, 0, 'FC15'),
  ('Oulare', 'Real', 0, 0.5, 'FC15'),
  ('Pardo', 'Real', 0, 4, 'FC15'),
  ('Wilson', 'Real', 0, 2.5, 'FC15'),
  ('Wynne', 'Real', 0, 0.45, 'FC15');

-- 4) Spieler des Spiels — eine Zeile je Spieler
insert into public.spieler_des_spiels (name, team, count, fifa_version) values
  ('Cesar', 'AEK', 52, 'FC15'),
  ('Uche', 'Real', 31, 'FC15'),
  ('Martins', 'Real', 29, 'FC15'),
  ('Neuer', 'Real', 22, 'FC15'),
  ('Buffon', 'Real', 13, 'FC15'),
  ('Unbekannt', 'Ehemalige', 8, 'FC15'),
  ('Olic', 'Ehemalige', 7, 'FC15'),
  ('Aubameyang', 'Real', 6, 'FC15'),
  ('De Sanctis', 'Real', 6, 'FC15'),
  ('Hernandez', 'Real', 6, 'FC15'),
  ('Lukaku', 'Real', 6, 'FC15'),
  ('Di Natale', 'AEK', 5, 'FC15'),
  ('Tevez', 'Ehemalige', 5, 'FC15'),
  ('Berbatov', 'Ehemalige', 3, 'FC15'),
  ('Cedrick', 'Ehemalige', 3, 'FC15'),
  ('Hilton', 'AEK', 3, 'FC15'),
  ('Lee Seung Hyun', 'AEK', 3, 'FC15'),
  ('Töre', 'Real', 3, 'FC15'),
  ('Totti', 'Ehemalige', 3, 'FC15'),
  ('Drogba', 'Real', 2, 'FC15'),
  ('Ferdinand', 'Real', 2, 'FC15'),
  ('Maicon', 'Ehemalige', 2, 'FC15'),
  ('Mbakogu', 'Ehemalige', 2, 'FC15'),
  ('Aboubakar', 'Ehemalige', 1, 'FC15'),
  ('Al Shahrani', 'Real', 1, 'FC15'),
  ('Alex', 'AEK', 1, 'FC15'),
  ('Barzagli', 'Real', 1, 'FC15'),
  ('Bolly', 'Ehemalige', 1, 'FC15'),
  ('Carvalho', 'Ehemalige', 1, 'FC15'),
  ('Cavanda', 'Real', 1, 'FC15'),
  ('Ibrahimovic', 'Ehemalige', 1, 'FC15'),
  ('Keita', 'AEK', 1, 'FC15'),
  ('Klose', 'Ehemalige', 1, 'FC15'),
  ('Lampard', 'Real', 1, 'FC15'),
  ('Oduamadi', 'AEK', 1, 'FC15'),
  ('Pepe', 'Ehemalige', 1, 'FC15'),
  ('Pirlo', 'Ehemalige', 1, 'FC15'),
  ('Remy', 'Ehemalige', 1, 'FC15'),
  ('Romeron', 'Real', 1, 'FC15'),
  ('Terry', 'Ehemalige', 1, 'FC15');

-- 5) Sperren — player_id ueber den Namen der Zeile dieser Saison.
--    Die Namen sind je Saison eindeutig (eine Zeile pro Spieler oben),
--    der join trifft also genau einmal.
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, s.art, s.dauer, s.dauer, s.art, 'FC15'
from (values
  ('Carvalho', 'Gelb-Rote Karte', 1),
  ('Hilton', 'Gelb-Rote Karte', 1),
  ('Yedlin', 'Rote Karte', 2),
  ('Pepe', 'Verletzung', 3),
  ('Totti', 'Verletzung', 3),
  ('Romeron', 'Verletzung', 3),
  ('Hernandez', 'Rote Karte', 2),
  ('Carvalho', 'Rote Karte', 2),
  ('Navarro', 'Rote Karte', 2),
  ('Carvalho', 'Rote Karte', 2),
  ('Maicon', 'Rote Karte', 2),
  ('Kehl', 'Verletzung', 3),
  ('Klose', 'Rote Karte', 2),
  ('Terry', 'Verletzung', 3),
  ('Maicon', 'Verletzung', 3),
  ('Pepe', 'Verletzung', 3),
  ('Lampard', 'Verletzung', 3),
  ('Di Natale', 'Verletzung', 3),
  ('De Sanctis', 'Rote Karte', 2),
  ('Pepe', 'Verletzung', 3),
  ('Navarro', 'Verletzung', 3),
  ('Pepe', 'Verletzung', 3),
  ('Pirlo', 'Verletzung', 3),
  ('Pepe', 'Verletzung', 3),
  ('Töre', 'Gelb-Rote Karte', 1),
  ('Pirlo', 'Verletzung', 3),
  ('Yedlin', 'Verletzung', 3),
  ('Maicon', 'Rote Karte', 2),
  ('Al Muwallad', 'Verletzung', 3),
  ('Odu', 'Verletzung', 3),
  ('Yedlin', 'Rote Karte', 2),
  ('Olic', 'Rote Karte', 2),
  ('Yedlin', 'Rote Karte', 2),
  ('Carvalho', 'Verletzung', 3),
  ('Ferdinand', 'Verletzung', 3),
  ('Keita', 'Gelb-Rote Karte', 1),
  ('Cesar', 'Rote Karte', 2),
  ('Uche', 'Verletzung', 3),
  ('Carvalho', 'Rote Karte', 2),
  ('Evra', 'Gelb-Rote Karte', 1),
  ('Maicon', 'Gelb-Rote Karte', 1),
  ('Carvalho', 'Rote Karte', 2),
  ('Olic', 'Verletzung', 3),
  ('Cesar', 'Rote Karte', 2),
  ('Yedlin', 'Rote Karte', 2),
  ('Ferdinand', 'Verletzung', 3),
  ('Hilton', 'Verletzung', 3),
  ('Pirlo', 'Verletzung', 3),
  ('Ibrahimovic', 'Gelb-Rote Karte', 1),
  ('Maicon', 'Rote Karte', 2),
  ('Touré', 'Rote Karte', 2),
  ('Cavanda', 'Gelb-Rote Karte', 1),
  ('Maicon', 'Rote Karte', 2),
  ('Alex', 'Gelb-Rote Karte', 1),
  ('Cesar', 'Rote Karte', 2),
  ('Hernandez', 'Gelb-Rote Karte', 1),
  ('Olic', 'Verletzung', 3),
  ('Olic', 'Verletzung', 3),
  ('Remy', 'Verletzung', 3),
  ('Maicon', 'Gelb-Rote Karte', 1),
  ('Uche', 'Verletzung', 3),
  ('Hernandez', 'Verletzung', 3),
  ('Cesar', 'Rote Karte', 2),
  ('Olic', 'Verletzung', 3),
  ('Di Natale', 'Verletzung', 3),
  ('Lee Seung Hyun', 'Verletzung', 3),
  ('Touré', 'Rote Karte', 2),
  ('Mbakogu', 'Verletzung', 3),
  ('Ferdinand', 'Rote Karte', 2),
  ('Cesar', 'Rote Karte', 2),
  ('A. Cole', 'Rote Karte', 2),
  ('Olic', 'Verletzung', 3),
  ('Töre', 'Verletzung', 3),
  ('Martins', 'Verletzung', 3),
  ('Alex', 'Rote Karte', 2),
  ('Yedlin', 'Rote Karte', 2),
  ('Touré', 'Rote Karte', 2),
  ('Uche', 'Verletzung', 3),
  ('Touré', 'Gelb-Rote Karte', 1),
  ('Hilton', 'Verletzung', 3),
  ('Fekir', 'Verletzung', 3),
  ('Lee Seung Hyun', 'Gelb-Rote Karte', 1),
  ('Hilton', 'Gelb-Rote Karte', 1),
  ('Cedrick', 'Verletzung', 3),
  ('Cesar', 'Rote Karte', 2),
  ('Alex', 'Rote Karte', 2),
  ('Alex', 'Rote Karte', 2),
  ('Di Natale', 'Verletzung', 3),
  ('Martins', 'Verletzung', 3),
  ('Hilton', 'Verletzung', 3),
  ('Hilton', 'Verletzung', 3),
  ('Di Natale', 'Verletzung', 3),
  ('Keita', 'Gelb-Rote Karte', 1),
  ('Alex', 'Rote Karte', 2),
  ('Yedlin', 'Rote Karte', 2),
  ('Di Natale', 'Verletzung', 3),
  ('Hilton', 'Rote Karte', 2),
  ('Alex', 'Gelb-Rote Karte', 1),
  ('Tevez', 'Verletzung', 3),
  ('Alex', 'Rote Karte', 2),
  ('Hernandez', 'Verletzung', 3),
  ('Keita', 'Rote Karte', 2),
  ('Campagnaro', 'Rote Karte', 2),
  ('Cesar', 'Rote Karte', 2),
  ('Alex', 'Rote Karte', 2),
  ('Keita', 'Rote Karte', 2),
  ('Oduamadi', 'Rote Karte', 2),
  ('Hernandez', 'Verletzung', 3)
) as s(name, art, dauer)
join public.players p on p.fifa_version = 'FC15' and p.name = s.name;

-- 6) Kontostaende. balance in Euro (wie die Preisgeld-Logik), debt 0.
insert into public.finances (team, balance, debt, fifa_version) values
  ('AEK', 0, 0, 'FC15'),
  ('Real', 20750000, 0, 'FC15');

commit;

-- Kontrolle
select 'Spieler' as was, count(*) as anzahl, sum(goals) as tore from public.players where fifa_version = 'FC15'
union all select 'Sperren', count(*), null from public.bans where fifa_version = 'FC15'
union all select 'SdS', count(*), sum(count) from public.spieler_des_spiels where fifa_version = 'FC15'
union all select 'Konten', count(*), null from public.finances where fifa_version = 'FC15';

-- ============================================================================
--  IMPORT — Saison FIFA 15 UT  (Legacy: nur Gesamtzahlen, keine Einzelspiele)
-- ============================================================================
--  VORHER: Backup anlegen (Supabase Dashboard -> Database -> Backups).
--
--  WAS DRIN IST
--    72 Spieler (Tore + Marktwerte), 108 Sperren, 42 SdS-Eintraege,
--    zwei Kontostaende.
--
--  WAS FEHLT — und warum diese Saison anders ist
--    Aus FIFA 15 gibt es KEINE einzelnen Spiele, nur Summen. Bilanz, Duell,
--    Form, Tordifferenz und Echtgeld bleiben deshalb leer. Das ist kein
--    Fehler, sondern die Datenlage: es wurde damals nur mitgezaehlt, nicht
--    Spiel fuer Spiel erfasst.
--
--  ZUORDNUNG
--    Alexander = AEK = AC Milan (0,00 Mio)
--    Philip    = Real = Manchester City (20,75 Mio)
--    Torschuetzen ohne Kaderzuordnung stehen unter 'Ehemalige' — die
--    Kaderlisten sind der Endstand, die Tore aber ueber die ganze Saison
--    zusammengekommen, inklusive abgegebener Spieler.
--
--  SPERRDAUERN sind geschaetzt: Gelb-Rot 1, Rot 2, Verletzung 3 Spiele —
--    die Vorgaben der App. In den Rohdaten stand nur 'abgesessen'.
--
--  Das Skript ist wiederholbar: es loescht zuerst alles mit fifa_version
--  'FC15' und legt es neu an. Andere Saisons bleiben unberuehrt.
-- ============================================================================

begin;

-- 1) Saison registrieren.
--    Die App liest teams direkt aus dieser Spalte (fifaVersionsSync.js), also
--    muessen color/icon/customIcon mit drin sein — sonst hat FC15 keine
--    Vereinsfarben. icon 'aek'/'real' sind die vorhandenen Wappen-Slots.
insert into public.fifa_versions (id, name, is_active, teams) values (
  'FC15', 'FIFA 15 Ultimate Team', false,
  '{"AEK":{"label":"AC Milan","short":"Milan","color":"blue","icon":"aek","customIcon":null},
    "Real":{"label":"Manchester City","short":"City","color":"red","icon":"real","customIcon":null},
    "Ehemalige":{"label":"Ehemalige","short":"Ehem.","color":"gray","icon":"\u26ab","customIcon":null}}'::jsonb)
on conflict (id) do update set name = excluded.name, teams = excluded.teams;

-- 2) Vorherigen FC15-Bestand entfernen (macht das Skript wiederholbar)
delete from public.bans where fifa_version = 'FC15';
delete from public.spieler_des_spiels where fifa_version = 'FC15';
delete from public.players where fifa_version = 'FC15';
delete from public.finances where fifa_version = 'FC15';

-- 3) Spieler
insert into public.players (name, team, goals, value, fifa_version) values
  ('Martins', 'Real', 189, 2.5, 'FC15'),
  ('Uche', 'Real', 152, 4.0, 'FC15'),
  ('Olic', 'Ehemalige', 93, 0.0, 'FC15'),
  ('Aubameyang', 'Real', 78, 17.0, 'FC15'),
  ('Di Natale', 'AEK', 56, 1.0, 'FC15'),
  ('Hernandez', 'Real', 38, 2.0, 'FC15'),
  ('Berbatov', 'Ehemalige', 29, 0.0, 'FC15'),
  ('Töre', 'Real', 28, 7.0, 'FC15'),
  ('Lukaku', 'Real', 27, 30.0, 'FC15'),
  ('Klose', 'Ehemalige', 25, 0.0, 'FC15'),
  ('Tevez', 'Ehemalige', 24, 0.0, 'FC15'),
  ('Oduamadi', 'AEK', 18, 0.75, 'FC15'),
  ('Pepe', 'Ehemalige', 16, 0.0, 'FC15'),
  ('Al Muwallad', 'Real', 15, 0.1, 'FC15'),
  ('Cedrick', 'Ehemalige', 14, 0.0, 'FC15'),
  ('Maicon', 'Ehemalige', 14, 0.0, 'FC15'),
  ('Alex', 'AEK', 11, 4.5, 'FC15'),
  ('Depay', 'Real', 11, 12.0, 'FC15'),
  ('Lee Seung Hyun', 'AEK', 11, 0.0, 'FC15'),
  ('Remy', 'Ehemalige', 11, 0.0, 'FC15'),
  ('Yedlin', 'AEK', 11, 0.25, 'FC15'),
  ('Drogba', 'Real', 10, 1.0, 'FC15'),
  ('Hilton', 'AEK', 10, 0.5, 'FC15'),
  ('Terry', 'Ehemalige', 10, 0.0, 'FC15'),
  ('Totti', 'Ehemalige', 10, 0.0, 'FC15'),
  ('Embolo', 'Real', 9, 0.25, 'FC15'),
  ('Kehl', 'Ehemalige', 9, 0.0, 'FC15'),
  ('Evra', 'Real', 8, 4.0, 'FC15'),
  ('Fekir', 'Real', 8, 2.0, 'FC15'),
  ('Keita', 'AEK', 8, 0.5, 'FC15'),
  ('Touré', 'Ehemalige', 8, 0.0, 'FC15'),
  ('Könnecke', 'AEK', 7, 0.25, 'FC15'),
  ('Mbakogu', 'Ehemalige', 7, 0.0, 'FC15'),
  ('Bellarabi', 'Real', 6, 2.5, 'FC15'),
  ('Ibrahimovic', 'Ehemalige', 6, 0.0, 'FC15'),
  ('Lampard', 'Real', 6, 1.5, 'FC15'),
  ('Montanes', 'AEK', 6, 1.5, 'FC15'),
  ('Pirlo', 'Ehemalige', 6, 0.0, 'FC15'),
  ('Aboubakar', 'Ehemalige', 5, 0.0, 'FC15'),
  ('Carvalho', 'Ehemalige', 5, 0.0, 'FC15'),
  ('Djilodji', 'Real', 5, 5.0, 'FC15'),
  ('Ferdinand', 'Real', 5, 1.0, 'FC15'),
  ('Lukoki', 'AEK', 5, 0.85, 'FC15'),
  ('Manneh', 'Ehemalige', 5, 0.0, 'FC15'),
  ('Romeron', 'Real', 5, 0.0, 'FC15'),
  ('Beauvue', 'AEK', 4, 2.0, 'FC15'),
  ('Navarro', 'Ehemalige', 4, 0.0, 'FC15'),
  ('Aduriz', 'AEK', 3, 3.0, 'FC15'),
  ('Bolly', 'Ehemalige', 3, 0.0, 'FC15'),
  ('Campagnaro', 'AEK', 3, 1.0, 'FC15'),
  ('Lacazette', 'Ehemalige', 3, 0.0, 'FC15'),
  ('Al Shahrani', 'Real', 2, 0.2, 'FC15'),
  ('De Bruyne', 'Ehemalige', 2, 0.0, 'FC15'),
  ('Milito', 'Ehemalige', 2, 0.0, 'FC15'),
  ('Ngyuen', 'Ehemalige', 2, 0.0, 'FC15'),
  ('Oduro', 'Real', 2, 0.45, 'FC15'),
  ('Xavi', 'Ehemalige', 2, 0.0, 'FC15'),
  ('Boluasie', 'Ehemalige', 1, 0.0, 'FC15'),
  ('A. Cole', 'Ehemalige', 0, 0.0, 'FC15'),
  ('Aranguren', 'Real', 0, 0.0, 'FC15'),
  ('Barzagli', 'Real', 0, 7.0, 'FC15'),
  ('Buffon', 'Real', 0, 3.0, 'FC15'),
  ('Cavanda', 'Real', 0, 2.0, 'FC15'),
  ('Cesar', 'AEK', 0, 1.5, 'FC15'),
  ('De Sanctis', 'Real', 0, 1.0, 'FC15'),
  ('Guerron', 'Real', 0, 1.0, 'FC15'),
  ('Neuer', 'Real', 0, 40.0, 'FC15'),
  ('Odu', 'Ehemalige', 0, 0.0, 'FC15'),
  ('Oulare', 'Real', 0, 0.5, 'FC15'),
  ('Pardo', 'Real', 0, 4.0, 'FC15'),
  ('Wilson', 'Real', 0, 2.5, 'FC15'),
  ('Wynne', 'Real', 0, 0.45, 'FC15');

-- 4) Spieler des Spiels — eine Zeile je Spieler.
--    In den Rohdaten stehen einige doppelt (Hernandez 5 und 1, Lee Seung Hyun
--    2 und 1); die App erwartet pro Saison genau eine Zeile, deshalb addiert.
--    'Unbekannt' bleibt drin: 8 Auszeichnungen ohne Namen. Weglassen wuerde
--    die Summe still um 8 verfaelschen.
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
  ('Totti', 'Ehemalige', 3, 'FC15'),
  ('Töre', 'Real', 3, 'FC15'),
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

-- 5) Sperren — player_id ueber den Namen der FC15-Zeile
insert into public.bans (player_id, team, type, totalgames, matchesserved, reason, fifa_version)
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pepe' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Totti' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Romeron' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hernandez' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Navarro' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Kehl' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Klose' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Terry' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pepe' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Lampard' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Di Natale' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'De Sanctis' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pepe' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Navarro' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pepe' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pirlo' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pepe' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Töre' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pirlo' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Al Muwallad' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Odu' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Ferdinand' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Keita' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Uche' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Evra' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Carvalho' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Ferdinand' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Pirlo' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Ibrahimovic' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Touré' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cavanda' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hernandez' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Remy' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Maicon' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Uche' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hernandez' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Di Natale' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Lee Seung Hyun' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Touré' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Mbakogu' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Ferdinand' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'A. Cole' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Olic' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Töre' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Martins' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Touré' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Uche' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Touré' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Fekir' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Lee Seung Hyun' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cedrick' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Di Natale' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Martins' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Di Natale' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Keita' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Yedlin' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Di Natale' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hilton' limit 1
union all
select p.id, p.team, 'Gelb-Rote Karte', 1, 1, 'Gelb-Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Tevez' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hernandez' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Keita' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Campagnaro' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Cesar' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Alex' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Keita' limit 1
union all
select p.id, p.team, 'Rote Karte', 2, 2, 'Rote Karte', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Oduamadi' limit 1
union all
select p.id, p.team, 'Verletzung', 3, 3, 'Verletzung', 'FC15' from public.players p where p.fifa_version = 'FC15' and p.name = 'Hernandez' limit 1;

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

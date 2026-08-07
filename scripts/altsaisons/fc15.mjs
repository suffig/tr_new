/**
 * FIFA 15 Ultimate Team — Rohdaten, so wie sie damals mitgezaehlt wurden.
 *
 * Vorlage fuer weitere Altsaisons: Datei kopieren, umbenennen (fc16.mjs …),
 * Inhalte ersetzen, dann
 *     node scripts/altsaison-import.mjs fc16
 * und die neue Version in src/utils/legacySaison.js eintragen.
 *
 * Format: "Name Zahl" mit | oder Zeilenumbruch getrennt. Bei Kadern ist die
 * Zahl der Marktwert in Mio, bei Toren/SdS die Anzahl.
 */
export default {
  version: 'FC15',
  name: 'FIFA 15 Ultimate Team',
  dateiNummer: 11,

  // Alexander = AEK, Philip = Real (so haelt es die ganze App).
  teams: {
    AEK: { label: 'AC Milan', short: 'Milan' },
    Real: { label: 'Manchester City', short: 'City' },
  },

  konten: { AEK: 0, Real: 20_750_000 },

  sds: `Cesar 52|Uche 31|Martins 29|Neuer 22|Buffon 13|Aubameyang 6|Olic 7|De Sanctis 6|Lukaku 6|
Hernandez 5|Di Natale 5|Tevez 5|Totti 3|Cedrick 3|Hilton 3|Töre 3|Berbatov 3|Lee Seung Hyun 2|
Drogba 2|Ferdinand 2|Mbakogu 2|Maicon 2|Lampard 1|Klose 1|Carvalho 1|Bolly 1|Romeron 1|Pepe 1|
Pirlo 1|Terry 1|Keita 1|Cavanda 1|Ibrahimovic 1|Remy 1|Alex 1|Aboubakar 1|Hernandez 1|Odumardi 1|
Al Sharanie 1|Lee Seung Hyun 1|Bazargli 1|Unbekannt 8`,

  tore: `Martins 189|Uche 152|Olic 93|Aubameyang 78|Di Natale 56|Hernandez 38|Berbatov 29|Töre 28|
Lukaku 27|Klose 25|Tevez 24|Oduarmadi 18|Pepe 16|Al Muwallad 15|Cedrick 14|Maicon 14|Yedlin 11|
Remy 11|Lee Seung Hyun 11|Alex 11|Depay 11|Terry 10|Totti 10|Drogba 10|Hilton 10|Kehl 9|Embolo 9|
Touré 8|Evra 8|Keita 8|Fekir 8|Könneke 7|Mbakogu 7|Lampard 6|Pirlo 6|Ibrahimovic 6|Bellarabi 6|
Montanes 6|Carvalho 5|Manneh 5|Aboubakar 5|Ferdinand 5|Romeron 5|Lukoki 5|Djilodijo 5|Beauvue 4|
Navarro 4|Bolly 3|Lacazette 3|Campagnaro 3|Aduriz 3|Oduro 2|Milito 2|Xavi 2|Al Shahrani 2|
De Bruyne 2|Ngyuen 2|Boluasie 1`,

  kader: {
    Real: `Lampard 1.5|Drogba 1|Ferdinand 1|Evra 4|De Sanctis 1|Embolo 0.25|Cavanda 2|
Martins 2.5|Fekir 2|Hernandez 2|Al Shahrani 0.2|Romeron 0|Oduro 0.45|Oulare 0.5|Aubameyang 17|
Uche 4|Buffon 3|Aranguren 0|Bellarabi 2.5|Töre 7|Al Muwallad 0.1|Neuer 40|Depay 12|Djilodji 5|
Wynne 0.45|Guerron 1|Wilson 2.5|Barzagli 7|Lukaku 30|Pardo 4`,
    AEK: `Cesar 1.5|Hilton 0.5|Yedlin 0.25|Aduriz 3|Campagnaro 1|El Ee Seung Hyun 0|
Oduamadi 0.75|Keita 0.5|Di Natale 1|Alex 4.5|Lukoki 0.85|Könnecke 0.25|Montanes 1.5|Beauve 2`,
  },

  sperren: `Carvalho|Gelb-Rote-Karte
Hilton|Gelb-Rote-Karte
Yedlin|Rote-Karte
Pepe|Verletzung
Totti|Verletzung
Romeron|Verletzung
Hernandez|Rote Karte
Carvalho|Rote-Karte
Navarro|Rote-Karte
Carvalho|Rote-Karte
Maicon|Rote-Karte
Kehl|Verletzung
Klose|Rote Karte
Terry|Verletzung
Maicon|Verletzung
Pepe|Verletzung
Lampard|Verletzung
Di Natale|Verletzung
De Sanctis|Rote Karte
Pepe|Verletzung
Navarro|Verletzung
Pepe|Verletzung
Pirlo|Verletzung
Pepe|Verletzung
Töre|Gelb-Rote-Karte
Pirlo|Verletzung
Yedlin|Verletzung
Maicon|Rote-Karte
Al Muwallad|Verletzung
Odu|Verletzung
Yedlin|Rote Karte
Olic|Rote Karte
Yedlin|Rote Karte
Carvalho|Verletzung
Ferdinand|Verletzung
Keita|Gelb-Rote-Karte
Cesar|Rote Karte
Uche|Verletzung
Carvalho|Rote-Karte
Evra|Gelb-Rote-Karte
Maicon|Gelb-Rote-Karte
Carvalho|Rote-Karte
Olic|Verletzung
Cesar|Rote Karte
Yedlin|Rote Karte
Ferdinand|Verletzung
Hilton|Verletzung
Pirlo|Verletzung
Ibrahimovic|Gelb-Rote-Karte
Maicon|Rote-Karte
Toure|Rote Karte
Cavanda|Gelb-Rote-Karte
Maicon|Rote-Karte
Alex|Gelb-Rote-Karte
Cesar|Rote Karte
Hernandez|Gelb-Rote-Karte
Olic|Verletzung
Olic|Verletzung
Remy|Verletzung
Maicon|Gelb-Rote-Karte
Uche|Verletzung
Hernandez|Verletzung
Cesar|Rote Karte
Olic|Verletzung
Di Natale|Verletzung
SeungHyun|Verletzung
Toure|Rote Karte
Mbakabu|Verletzung
Ferdinand|Rote Karte
Cesar|Rote Karte
A. Cole|Rote Karte
Olic|Verletzung
Töre|Verletzung
Martins|Verletzung
Alex|Rote Karte
Yedlin|Rote Karte
Toure|Rote Karte
Uche|Verletzung
Toure|Gelb-Rote Karte
Hilton|Verletzung
Fekir|Verletzung
SeungHyun|Gelb-Rote-Karte
Hilton|Gelb-Rote-Karte
Cedrick|Verletzung
Cesar|Rote Karte
Alex|Rote Karte
Alex|Rote Karte
Di Natale|Verletzung
Martins|Verletzung
Hilton|Verletzung
Hilton|Verletzung
Di Natale|Verletzung
Keita|Gelb-Rote-Karte
Alex|Rote Karte
Yedlin|Rote Karte
Di Natale|Verletzung
Hilton|Rote-Karte
Alex|Gelb-Rote-Karte
Tevez|Verletzung
Alex|Rote Karte
Hernandez|Verletzung
Keita|Rote Karte
Canpagneoro|Rote Karte
Cesar|Rote Karte
Alex|Rote Karte
Keita|Rote Karte
Oduamardi|Rote Karte
Hernandez|Verletzung`,

  // Schreibweisen desselben Menschen -> Zielschreibweise (moeglichst die aus
  // dem Kader). Schluessel sind kleingeschrieben und ohne Sonderzeichen.
  // "Töre" und "Touré" sind ZWEI Spieler und stehen deshalb nicht hier drin.
  varianten: {
    oduarmadi: 'Oduamadi', oduamadi: 'Oduamadi', oduamardi: 'Oduamadi', odumardi: 'Oduamadi',
    leeseunghyun: 'Lee Seung Hyun', seunghyun: 'Lee Seung Hyun', eleeseunghyun: 'Lee Seung Hyun',
    koenneke: 'Könnecke', konneke: 'Könnecke', konnecke: 'Könnecke',
    beauvue: 'Beauvue', beauve: 'Beauvue',
    djilodijo: 'Djilodji', djilodji: 'Djilodji',
    barzagli: 'Barzagli', bazargli: 'Barzagli',
    mbakogu: 'Mbakogu', mbakabu: 'Mbakogu',
    campagnaro: 'Campagnaro', canpagneoro: 'Campagnaro',
    alshahrani: 'Al Shahrani', alsharanie: 'Al Shahrani',
  },

  // Nicht aufloesbar — bleiben als eigener Eintrag stehen, statt still zu
  // verschwinden. "Odu" koennte Oduamadi ODER Oduro sein.
  unklar: ['Odu', 'A. Cole'],
};

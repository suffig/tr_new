/**
 * FIFA 16 Ultimate Team — Rohdaten (Stand 23.04.2016).
 *
 * Anders als FC15 ist hier auch die BILANZ ueberliefert: Siege, Siege n.V. und
 * Siege n.E. je Verein. Einzelne Spiele gibt es weiterhin nicht, aber damit
 * muss die Saisonansicht nicht voellig leer bleiben.
 *
 * Alexander = AEK = Milan · Philip = Real = Berlin.
 */
export default {
  version: 'FC16',
  name: 'FIFA 16 Ultimate Team',
  dateiNummer: 12,

  teams: {
    AEK: { label: 'AC Milan', short: 'Milan' },
    Real: { label: 'Hertha BSC', short: 'Berlin' },
  },

  konten: { AEK: 0, Real: 11_040_000 },

  // Ueberlieferte Bilanz. Die drei Zeilen sind getrennt gezaehlt worden, also
  // addiert: Milan 17+2+1 = 20, Berlin 18+4+2 = 24 -> 44 Spiele.
  bilanz: {
    AEK: { regulaer: 17, nachVerlaengerung: 2, nachElfmeter: 1 },
    Real: { regulaer: 18, nachVerlaengerung: 4, nachElfmeter: 2 },
  },

  sds: `Aubameyang 11x|Buffon 7x|Neuer 5x|Vidic 3x|Gerrard 3x|Hulk 2x|Ibrahimovic 2x|
Igboun 2x|Stranzel 2x|Lampard 1x|Yilmaz 1x|Yilmaz 1x|Gerso 1x|De Sanctis 1x|Aduriz 1x|
Castillo 1x|Mauri 1x|Di Natale 1x|Keita 1x|Rooney 1x|Amrabat 1x`,

  tore: `Aubameyang 58x|Ibrahimovic 30x|Aduriz 26x|Gerrard 17x|Castillo 17x|Hulk 12x|
Gerso 15x|Di Natale 12x|Bazagli 10x|Lampard 10x|Esswein 8x|Rooney 8x|Biabiany 7x|
Igboun 6x|Martins 6x|Lee Seung Hyun 6x|Bolly 5x|Vidic 5x|Kamara 4x|Mauri 4x|Keita 4x|
Naldo 3x|Uche 3x|Yilmaz 2x|Amrabat 2x|Stranzel 2x|Pirlo 2x|Al Sharani 2x|Maicon 2x|
Biabiany 1x|Tshimanga 1x|Guarin 1x`,

  kader: {
    AEK: `Vidic 1Mx|Stranzl 1,5Mx|Maicon 1Mx|Lampard 1Mx|Buffon 2Mx|Keita 0,5Mx|
Castillo 1Mx|Gerso 1,2Mx|Lee Seung Hyun 0M|Bolly 0,45Mx|Di Natale 1Mx|Mauri 0,5Mx|
Gerrard 2Mx`,
    Real: `Neuer 45M x|Helton 0,8Mx|Naldo 5M x|Tshimanga 2Mx|Al-Shahrani 0,2Mx|
Al-Ghamdi 0,05Mx|Rizzato 0,2Mx|Twumasi 0,075Mx|Paterson 0,45Mx|Barzagli 3Mx|Esswein 1,5Mx|
Igboun 1,25Mx|Pirlo 1Mx|Martins 2,5Mx|Yedlin 1,5Mx|Guarin 12Mx|Aubameyang 25Mx|
Biabiany 4Mx|Kamara 0,6Mx|Ibrahimovic 15Mx|Chedjou 8Mx|Rooney 40Mx|Amrabat 6Mx|Diouf 10M|
Ntep 10Mx|Mojica 2Mx|Mukhytarian 18Mx|Palacio 4Mx`,
  },

  // V = Verletzung, R = Rote Karte, G-R = Gelb-Rote Karte.
  // ✔ = abgesessen, ❌ = lief noch (die letzte Buffon-Sperre).
  sperren: `Martins V ✔
Maicon V ✔
Aduriz G-R ✔
Maicon R ✔
Stranzel R ✔
Vidic G-R ✔
Evra R ✔
Mauri R ✔
Lampard V ✔
Pirlo V ✔
Buffon R ✔
Evra R ✔
Castillo V ✔
Gerrard R ✔
Igboun V ✔
Vidic V ✔
Barzagli G-R ✔
Keita R ✔
Maicon R ✔
Maicon R ✔
Keita R ✔
Stranzel R ✔
Stranzel G-R ✔
Buffon R ❌`,

  // Kader-Schreibweise gewinnt.
  varianten: {
    stranzel: 'Stranzl', stranzl: 'Stranzl',
    bazagli: 'Barzagli', barzagli: 'Barzagli',
    alsharani: 'Al-Shahrani', alshahrani: 'Al-Shahrani',
  },

  unklar: [],
};

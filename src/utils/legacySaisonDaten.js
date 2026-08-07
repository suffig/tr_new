/**
 * AUTOMATISCH ERZEUGT von scripts/altsaison-import.mjs — nicht von Hand
 * aendern. Neue Altsaison? scripts/altsaisons/<name>.mjs anlegen und
 *     node scripts/altsaison-import.mjs --alle
 * laufen lassen.
 *
 * Die Bilanzen sind aus den ueberlieferten Ergebniszeilen GEZAEHLT. Die
 * einzelnen Spiele werden bewusst nicht importiert: zu ihnen gibt es keine
 * Daten, und erfundene Daten waeren schlechter als gar keine.
 */
export const LEGACY_DATEN = {
  FC15: {
    "label": "FIFA 15 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kader",
      "Kontostand"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Bilanz",
      "Form",
      "Echtgeld"
    ]
  },
  FC16: {
    "label": "FIFA 16 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kader",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 44,
      "unentschieden": 0,
      "AEK": {
        "siege": 20,
        "regulaer": 17,
        "nachVerlaengerung": 2,
        "nachElfmeter": 1
      },
      "Real": {
        "siege": 24,
        "regulaer": 18,
        "nachVerlaengerung": 4,
        "nachElfmeter": 2
      }
    }
  },
  FC19: {
    "label": "FIFA 19 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 235,
      "unentschieden": 15,
      "abende": 46,
      "AEK": {
        "siege": 44,
        "tore": 315
      },
      "Real": {
        "siege": 176,
        "tore": 686
      }
    }
  },
  FC20: {
    "label": "FIFA 20 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 206,
      "unentschieden": 16,
      "abende": 42,
      "AEK": {
        "siege": 73,
        "tore": 525
      },
      "Real": {
        "siege": 117,
        "tore": 653
      }
    }
  },
  FC21: {
    "label": "FIFA 21 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kader",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 101,
      "unentschieden": 5,
      "abende": 21,
      "AEK": {
        "siege": 31,
        "tore": 337
      },
      "Real": {
        "siege": 65,
        "tore": 439
      }
    }
  },
  FC23: {
    "label": "FIFA 23 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 171,
      "unentschieden": 1,
      "abende": 34,
      "AEK": {
        "siege": 45,
        "tore": 432
      },
      "Real": {
        "siege": 125,
        "tore": 720
      }
    }
  },
  FC24: {
    "label": "FIFA 24 Ultimate Team",
    "vorhanden": [
      "Tore",
      "Spieler des Spiels",
      "Sperren",
      "Kontostand",
      "Siege"
    ],
    "fehlt": [
      "Einzelne Spiele",
      "Form",
      "Echtgeld"
    ],
    "bilanz": {
      "spiele": 142,
      "unentschieden": 0,
      "abende": 30,
      "AEK": {
        "siege": 28,
        "tore": 463
      },
      "Real": {
        "siege": 114,
        "tore": 817
      }
    }
  },
};

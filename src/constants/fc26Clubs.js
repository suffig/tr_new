/**
 * Hardcoded club list for EA SPORTS FC 26, grouped by league.
 *
 * Compiled by hand from the 2025/26 real-world rosters that EA FC 26 mirrors.
 * Futbin (futbin.com/26/clubs) blocks automated scraping (HTTP 403), so this is
 * a best-effort comprehensive list across the major licensed leagues. It won't
 * be 100% exhaustive (EA ships 750+ clubs) but covers the leagues that matter.
 *
 * Reference: https://www.futbin.com/26/clubs
 */

export const FC26_LEAGUES = [
  {
    name: 'Premier League',
    country: '🏴',
    clubs: [
      'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion',
      'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham',
      'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United',
      'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur',
      'West Ham United', 'Wolverhampton Wanderers',
    ],
  },
  {
    name: 'EFL Championship',
    country: '🏴',
    clubs: [
      'Birmingham City', 'Blackburn Rovers', 'Bristol City', 'Charlton Athletic',
      'Coventry City', 'Derby County', 'Hull City', 'Ipswich Town', 'Leicester City',
      'Middlesbrough', 'Millwall', 'Norwich City', 'Oxford United', 'Portsmouth',
      'Preston North End', 'Queens Park Rangers', 'Sheffield United', 'Sheffield Wednesday',
      'Southampton', 'Stoke City', 'Swansea City', 'Watford', 'West Bromwich Albion', 'Wrexham',
    ],
  },
  {
    name: 'LALIGA EA SPORTS',
    country: '🇪🇸',
    clubs: [
      'Real Madrid', 'FC Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal CF',
      'Real Betis', 'Real Sociedad', 'Sevilla FC', 'Valencia CF', 'Celta de Vigo',
      'Rayo Vallecano', 'CA Osasuna', 'RCD Mallorca', 'Getafe CF', 'RCD Espanyol',
      'Deportivo Alavés', 'Girona FC', 'Levante UD', 'Elche CF', 'Real Oviedo',
    ],
  },
  {
    name: 'LALIGA HYPERMOTION',
    country: '🇪🇸',
    clubs: [
      'Almería', 'Cádiz CF', 'Córdoba CF', 'Burgos CF', 'Real Valladolid', 'CD Leganés',
      'UD Las Palmas', 'Sporting Gijón', 'Real Zaragoza', 'SD Huesca', 'CD Castellón',
      'Granada CF', 'Málaga CF', 'Racing Santander', 'Deportivo La Coruña', 'SD Eibar',
      'CD Mirandés', 'Albacete', 'Real Sociedad B', 'CD Andorra', 'Cultural Leonesa', 'AD Ceuta',
    ],
  },
  {
    name: 'Bundesliga',
    country: '🇩🇪',
    clubs: [
      'FC Bayern München', 'Bayer 04 Leverkusen', 'Borussia Dortmund', 'RB Leipzig',
      'Eintracht Frankfurt', 'VfB Stuttgart', 'SC Freiburg', 'SV Werder Bremen',
      'Borussia Mönchengladbach', 'VfL Wolfsburg', '1. FSV Mainz 05', 'FC Augsburg',
      'TSG Hoffenheim', '1. FC Union Berlin', 'FC St. Pauli', '1. FC Heidenheim',
      '1. FC Köln', 'Hamburger SV',
    ],
  },
  {
    name: '2. Bundesliga',
    country: '🇩🇪',
    clubs: [
      'Hertha BSC', 'Schalke 04', 'Fortuna Düsseldorf', 'Hannover 96', '1. FC Nürnberg',
      'SC Paderborn', 'SV Darmstadt 98', 'Karlsruher SC', 'SV Elversberg', 'Holstein Kiel',
      'VfL Bochum', '1. FC Kaiserslautern', 'Greuther Fürth', 'SC Preußen Münster',
      'Eintracht Braunschweig', 'Dynamo Dresden', 'Arminia Bielefeld', 'FC Magdeburg',
    ],
  },
  {
    name: 'Serie A',
    country: '🇮🇹',
    clubs: [
      'Inter', 'AC Milan', 'Juventus', 'Napoli', 'AS Roma', 'Lazio', 'Atalanta',
      'Fiorentina', 'Bologna', 'Como', 'Torino', 'Udinese', 'Genoa', 'Cagliari',
      'Hellas Verona', 'Parma', 'Lecce', 'Pisa', 'Cremonese', 'Sassuolo',
    ],
  },
  {
    name: 'Serie B',
    country: '🇮🇹',
    clubs: [
      'Palermo', 'Sampdoria', 'Bari', 'Spezia', 'Venezia', 'Empoli', 'Monza',
      'Frosinone', 'Catanzaro', 'Cesena', 'Modena', 'Reggiana', 'Südtirol',
      'Juve Stabia', 'Carrarese', 'Mantova', 'Padova', 'Avellino', 'Entella', 'Cosenza',
    ],
  },
  {
    name: 'Ligue 1',
    country: '🇫🇷',
    clubs: [
      'Paris Saint-Germain', 'Olympique de Marseille', 'AS Monaco', 'LOSC Lille',
      'OGC Nice', 'Olympique Lyonnais', 'RC Lens', 'Stade Rennais', 'RC Strasbourg',
      'Stade Brestois', 'Toulouse FC', 'AJ Auxerre', 'FC Nantes', 'Le Havre AC',
      'Angers SCO', 'FC Metz', 'FC Lorient', 'Paris FC',
    ],
  },
  {
    name: 'Ligue 2',
    country: '🇫🇷',
    clubs: [
      'AS Saint-Étienne', 'Montpellier HSC', 'Stade de Reims', 'En Avant Guingamp',
      'Grenoble Foot', 'SC Bastia', 'Amiens SC', 'Pau FC', 'Clermont Foot',
      'Rodez AF', 'USL Dunkerque', 'Red Star FC', 'ESTAC Troyes', 'Annecy FC',
      'Le Mans FC', 'EA Guingamp', 'FC Nancy', 'Laval',
    ],
  },
  {
    name: 'Eredivisie',
    country: '🇳🇱',
    clubs: [
      'Ajax', 'PSV Eindhoven', 'Feyenoord', 'AZ Alkmaar', 'FC Twente', 'FC Utrecht',
      'SC Heerenveen', 'Go Ahead Eagles', 'FC Groningen', 'NEC Nijmegen', 'Sparta Rotterdam',
      'PEC Zwolle', 'Fortuna Sittard', 'Heracles Almelo', 'NAC Breda', 'Telstar',
      'Excelsior', 'FC Volendam',
    ],
  },
  {
    name: 'Liga Portugal',
    country: '🇵🇹',
    clubs: [
      'SL Benfica', 'FC Porto', 'Sporting CP', 'SC Braga', 'Vitória SC', 'FC Famalicão',
      'Moreirense FC', 'Rio Ave FC', 'Gil Vicente FC', 'Casa Pia AC', 'Santa Clara',
      'Estoril Praia', 'CD Nacional', 'AVS', 'Estrela da Amadora', 'FC Arouca',
      'CD Tondela', 'Alverca',
    ],
  },
  {
    name: 'Scottish Premiership',
    country: '🏴',
    clubs: [
      'Celtic', 'Rangers', 'Aberdeen', 'Heart of Midlothian', 'Hibernian',
      'Dundee United', 'Dundee FC', 'Motherwell', 'St Mirren', 'Kilmarnock',
      'Ross County', 'Falkirk', 'Livingston', 'St Johnstone',
    ],
  },
  {
    name: 'Belgian Pro League',
    country: '🇧🇪',
    clubs: [
      'Club Brugge', 'RSC Anderlecht', 'Royal Antwerp', 'KAA Gent', 'KRC Genk',
      'Standard Liège', 'Union Saint-Gilloise', 'Cercle Brugge', 'KV Mechelen',
      'Sint-Truiden', 'OH Leuven', 'Westerlo', 'Charleroi', 'KVC Westerlo',
      'Dender', 'Sporting Charleroi',
    ],
  },
  {
    name: 'Trendyol Süper Lig',
    country: '🇹🇷',
    clubs: [
      'Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Başakşehir',
      'Adana Demirspor', 'Konyaspor', 'Antalyaspor', 'Kayserispor', 'Sivasspor',
      'Alanyaspor', 'Gaziantep FK', 'Çaykur Rizespor', 'Kasımpaşa', 'Samsunspor',
      'Göztepe', 'Eyüpspor', 'Bodrum FK',
    ],
  },
  {
    name: 'Roshn Saudi League',
    country: '🇸🇦',
    clubs: [
      'Al Hilal', 'Al Nassr', 'Al Ittihad', 'Al Ahli', 'Al Ettifaq', 'Al Shabab',
      'Al Taawoun', 'Al Fateh', 'Al Fayha', 'Al Riyadh', 'Al Khaleej', 'Al Wehda',
      'Al Okhdood', 'Damac', 'Al Qadsiah', 'Al Najma', 'Al Hazem', 'NEOM SC',
    ],
  },
  {
    name: 'Major League Soccer',
    country: '🇺🇸',
    clubs: [
      'Inter Miami CF', 'LA Galaxy', 'Los Angeles FC', 'Seattle Sounders', 'Atlanta United',
      'New York City FC', 'New York Red Bulls', 'Columbus Crew', 'FC Cincinnati',
      'Philadelphia Union', 'Orlando City', 'Nashville SC', 'Austin FC', 'FC Dallas',
      'Houston Dynamo', 'Sporting Kansas City', 'Minnesota United', 'Portland Timbers',
      'Real Salt Lake', 'Colorado Rapids', 'San Jose Earthquakes', 'Vancouver Whitecaps',
      'Toronto FC', 'CF Montréal', 'Chicago Fire', 'D.C. United', 'New England Revolution',
      'Charlotte FC', 'St. Louis City SC', 'San Diego FC',
    ],
  },
  {
    name: 'Österreichische Bundesliga',
    country: '🇦🇹',
    clubs: [
      'Red Bull Salzburg', 'Sturm Graz', 'Rapid Wien', 'Austria Wien', 'LASK',
      'Wolfsberger AC', 'TSV Hartberg', 'SC Austria Lustenau', 'WSG Tirol',
      'SK Rapid', 'Blau-Weiß Linz', 'SV Ried',
    ],
  },
  {
    name: 'Swiss Super League',
    country: '🇨🇭',
    clubs: [
      'Young Boys', 'FC Basel', 'FC Zürich', 'Servette FC', 'FC Lugano', 'FC Lausanne-Sport',
      'FC St. Gallen', 'FC Luzern', 'Grasshopper Club', 'FC Sion', 'FC Winterthur', 'Yverdon Sport',
    ],
  },
  {
    name: 'Eliteserien · Allsvenskan · Superligaen',
    country: '🇳🇴',
    clubs: [
      'Bodø/Glimt', 'Molde FK', 'Rosenborg BK', 'Brann', 'Vålerenga',
      'Malmö FF', 'AIK', 'Djurgårdens IF', 'IFK Göteborg', 'Hammarby IF',
      'FC København', 'Brøndby IF', 'FC Midtjylland', 'AGF Aarhus',
    ],
  },
  {
    name: 'Ekstraklasa',
    country: '🇵🇱',
    clubs: [
      'Legia Warszawa', 'Lech Poznań', 'Raków Częstochowa', 'Wisła Kraków',
      'Pogoń Szczecin', 'Górnik Zabrze', 'Jagiellonia Białystok', 'Cracovia',
    ],
  },
  {
    name: 'Super League Greece',
    country: '🇬🇷',
    clubs: [
      'Olympiacos', 'Panathinaikos', 'AEK Athens', 'PAOK', 'Aris Thessaloniki', 'Panserraikos',
    ],
  },
  {
    name: 'Liga MX',
    country: '🇲🇽',
    clubs: [
      'Club América', 'Chivas Guadalajara', 'Cruz Azul', 'Pumas UNAM', 'Tigres UANL',
      'Monterrey', 'Toluca', 'Santos Laguna', 'León', 'Pachuca', 'Atlas', 'Necaxa',
    ],
  },
  {
    name: 'Brasileirão',
    country: '🇧🇷',
    clubs: [
      'Flamengo', 'Palmeiras', 'São Paulo', 'Fluminense', 'Corinthians', 'Botafogo',
      'Grêmio', 'Internacional', 'Atlético Mineiro', 'Cruzeiro', 'Vasco da Gama', 'Santos',
    ],
  },
  {
    name: 'Liga Profesional Argentina',
    country: '🇦🇷',
    clubs: [
      'Boca Juniors', 'River Plate', 'Racing Club', 'Independiente', 'San Lorenzo',
      'Vélez Sarsfield', 'Estudiantes', 'Talleres', 'Rosario Central', 'Newell’s Old Boys',
    ],
  },
  {
    name: 'J1 League',
    country: '🇯🇵',
    clubs: [
      'Yokohama F. Marinos', 'Urawa Red Diamonds', 'Kawasaki Frontale', 'Vissel Kobe',
      'Kashima Antlers', 'Gamba Osaka', 'FC Tokyo', 'Sanfrecce Hiroshima',
    ],
  },
  {
    name: 'Nationalmannschaften',
    country: '🌍',
    clubs: [
      'Deutschland', 'Frankreich', 'England', 'Spanien', 'Italien', 'Portugal',
      'Niederlande', 'Belgien', 'Brasilien', 'Argentinien', 'Kroatien', 'Schweiz',
      'Österreich', 'Polen', 'Dänemark', 'Schweden', 'USA', 'Mexiko', 'Japan',
      'Marokko', 'Senegal', 'Uruguay', 'Kolumbien', 'Türkei',
    ],
  },
];

// Flat list of every club (for search / counts).
export const FC26_ALL_CLUBS = FC26_LEAGUES.flatMap((l) => l.clubs);
export const FC26_TOTAL_CLUBS = FC26_ALL_CLUBS.length;

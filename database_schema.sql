-- Database Schema for FIFA Tracker v1
-- Aligned with tracker_full_v1 reference implementation

-- 1. Players table
CREATE TABLE IF NOT EXISTS players (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  team text NOT NULL,
  value numeric,
  goals integer DEFAULT 0,
  position text,
  CONSTRAINT players_pkey PRIMARY KEY (id)
);

-- 2. Matches table 
CREATE TABLE IF NOT EXISTS matches (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  date date NOT NULL,
  teama text NOT NULL,
  teamb text NOT NULL,
  goalsa integer NOT NULL,
  goalsb integer NOT NULL,
  goalslista jsonb,
  goalslistb jsonb,
  yellowa integer,
  reda integer,
  yellowb integer,
  redb integer,
  manofthematch text,
  prizeaek integer,
  prizereal integer,
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  date date NOT NULL,
  type text NOT NULL,
  team text NOT NULL,
  amount integer NOT NULL,
  info text,
  match_id integer,
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- 4. Finances table
CREATE TABLE IF NOT EXISTS finances (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  team text NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  debt integer NOT NULL DEFAULT 0,
  CONSTRAINT finances_pkey PRIMARY KEY (id)
);

-- 5. Bans table
CREATE TABLE IF NOT EXISTS bans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  player_id bigint,
  team text NOT NULL,
  type text NOT NULL,
  totalgames integer NOT NULL,
  matchesserved integer NOT NULL DEFAULT 0,
  reason text,
  CONSTRAINT bans_pkey PRIMARY KEY (id),
  CONSTRAINT fk_bans_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT bans_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 6. Player of the match statistics
CREATE TABLE IF NOT EXISTS spieler_des_spiels (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  team text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  CONSTRAINT spieler_des_spiels_pkey PRIMARY KEY (id)
);

-- 7. Managers table for alcohol tracker
CREATE TABLE IF NOT EXISTS managers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  gewicht int2 NOT NULL,
  CONSTRAINT managers_pkey PRIMARY KEY (id)
);

-- Insert default finance records if they don't exist
INSERT INTO finances (team, balance, debt) 
VALUES 
  ('AEK', 0, 0),
  ('Real', 0, 0)
ON CONFLICT (team) DO NOTHING;

-- Insert default manager records if they don't exist
INSERT INTO managers (id, name, gewicht) 
VALUES 
  (1, 'Alexander', 110),
  (2, 'Philip', 105)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_transactions_team ON transactions(team);
CREATE INDEX IF NOT EXISTS idx_transactions_match_id ON transactions(match_id);
CREATE INDEX IF NOT EXISTS idx_bans_player_id ON bans(player_id);
CREATE INDEX IF NOT EXISTS idx_finances_team ON finances(team);
CREATE INDEX IF NOT EXISTS idx_managers_name ON managers(name);

-- Row Level Security (RLS) policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE spieler_des_spiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON players 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON matches 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON transactions 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON finances 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON bans 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON spieler_des_spiels 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable all for authenticated users" ON managers 
  FOR ALL USING (auth.role() = 'authenticated');
-- EA Sports API Integration - Database Schema Extensions
-- This migration adds tables for player updates tracking, market prices, and API sync logs

-- Table for tracking player data updates from EA Sports API
CREATE TABLE IF NOT EXISTS player_updates (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  update_type VARCHAR(50) NOT NULL, -- 'stats', 'rating', 'position', 'value', etc.
  old_value TEXT,
  new_value TEXT,
  source VARCHAR(50) DEFAULT 'ea_sports', -- 'ea_sports', 'sofifa', 'manual'
  sync_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_player_updates_player_id ON player_updates(player_id);
CREATE INDEX IF NOT EXISTS idx_player_updates_sync_date ON player_updates(sync_date);
CREATE INDEX IF NOT EXISTS idx_player_updates_source ON player_updates(source);

-- Table for transfer market prices from EA Sports
CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  current_price BIGINT NOT NULL, -- Price in coins
  lowest_price BIGINT,
  highest_price BIGINT,
  average_price BIGINT,
  volume INTEGER DEFAULT 0, -- Number of transactions
  price_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, price_date)
);

-- Index for efficient price queries
CREATE INDEX IF NOT EXISTS idx_market_prices_player_id ON market_prices(player_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(price_date);

-- Table for API sync logs and monitoring
CREATE TABLE IF NOT EXISTS api_sync_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_job_name ON api_sync_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_status ON api_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_started_at ON api_sync_logs(started_at);

-- Table for archiving player data (historical tracking)
CREATE TABLE IF NOT EXISTS player_archives (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  player_name VARCHAR(100) NOT NULL,
  team VARCHAR(50),
  position VARCHAR(50),
  overall_rating INTEGER,
  potential INTEGER,
  value BIGINT,
  wage BIGINT,
  age INTEGER,
  nationality VARCHAR(50),
  stats JSONB, -- Store detailed stats as JSON
  archive_date DATE DEFAULT CURRENT_DATE,
  archive_reason VARCHAR(100), -- 'weekly_backup', 'transfer', 'retirement', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for archive queries
CREATE INDEX IF NOT EXISTS idx_player_archives_player_id ON player_archives(player_id);
CREATE INDEX IF NOT EXISTS idx_player_archives_date ON player_archives(archive_date);
CREATE INDEX IF NOT EXISTS idx_player_archives_player_name ON player_archives(player_name);

-- Table for price alerts and notifications
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  threshold_price BIGINT NOT NULL,
  condition VARCHAR(10) NOT NULL, -- 'above', 'below'
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  user_id INTEGER, -- For future multi-user support
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for alert queries
CREATE INDEX IF NOT EXISTS idx_price_alerts_player_id ON price_alerts(player_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active);

-- Add new columns to existing players table if they don't exist
DO $$ 
BEGIN
  -- EA Sports API specific fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'ea_sports_id') THEN
    ALTER TABLE players ADD COLUMN ea_sports_id VARCHAR(50) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'last_api_sync') THEN
    ALTER TABLE players ADD COLUMN last_api_sync TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'overall_rating') THEN
    ALTER TABLE players ADD COLUMN overall_rating INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'potential') THEN
    ALTER TABLE players ADD COLUMN potential INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'market_value') THEN
    ALTER TABLE players ADD COLUMN market_value BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'wage') THEN
    ALTER TABLE players ADD COLUMN wage BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'nationality') THEN
    ALTER TABLE players ADD COLUMN nationality VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'age') THEN
    ALTER TABLE players ADD COLUMN age INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'players' AND column_name = 'detailed_stats') THEN
    ALTER TABLE players ADD COLUMN detailed_stats JSONB;
  END IF;
END $$;

-- Create a view for recent player updates
CREATE OR REPLACE VIEW v_recent_player_updates AS
SELECT 
  pu.id,
  pu.player_name,
  pu.update_type,
  pu.old_value,
  pu.new_value,
  pu.source,
  pu.sync_date,
  p.team,
  p.position,
  p.overall_rating
FROM player_updates pu
LEFT JOIN players p ON pu.player_id = p.id
WHERE pu.sync_date >= NOW() - INTERVAL '30 days'
ORDER BY pu.sync_date DESC;

-- Create a view for market price trends
CREATE OR REPLACE VIEW v_market_price_trends AS
SELECT 
  player_name,
  player_id,
  COUNT(*) as price_count,
  AVG(current_price) as avg_price,
  MIN(current_price) as min_price,
  MAX(current_price) as max_price,
  STDDEV(current_price) as price_volatility,
  MIN(price_date) as first_date,
  MAX(price_date) as last_date
FROM market_prices
WHERE price_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY player_name, player_id;

-- Create a view for API sync status
CREATE OR REPLACE VIEW v_api_sync_status AS
SELECT 
  job_name,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'success') as successful_runs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
  AVG(duration_ms) as avg_duration_ms,
  MAX(started_at) as last_run
FROM api_sync_logs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY job_name;

-- Add comments for documentation
COMMENT ON TABLE player_updates IS 'Tracks all player data updates from EA Sports API and other sources';
COMMENT ON TABLE market_prices IS 'Stores daily market prices from EA Sports transfer market';
COMMENT ON TABLE api_sync_logs IS 'Logs all API synchronization jobs for monitoring and debugging';
COMMENT ON TABLE player_archives IS 'Historical archive of player data for trend analysis';
COMMENT ON TABLE price_alerts IS 'User-defined price alerts for transfer market monitoring';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fifa_tracker_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fifa_tracker_app;

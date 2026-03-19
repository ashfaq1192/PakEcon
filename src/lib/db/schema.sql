-- Economic Indicators
CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  currency TEXT NOT NULL,
  rate REAL NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(currency, date)
);

CREATE TABLE IF NOT EXISTS commodity_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commodity TEXT NOT NULL,
  city TEXT NOT NULL,
  price REAL NOT NULL,
  unit TEXT NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commodity, city, date)
);

CREATE TABLE IF NOT EXISTS tax_slabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  min_income REAL NOT NULL,
  max_income REAL,
  rate REAL NOT NULL,
  fixed_tax REAL DEFAULT 0,
  effective_from TEXT NOT NULL,
  UNIQUE(year, min_income)
);

CREATE TABLE IF NOT EXISTS market_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  delta REAL NOT NULL,
  indicators TEXT NOT NULL,  -- JSON array
  published BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'daily',
  generated_by TEXT DEFAULT 'groq:llama-3.3-70b-versatile',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SBP Policy Rate & KIBOR (updated monthly)
CREATE TABLE IF NOT EXISTS policy_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,    -- 'policy_rate' | 'kibor_overnight' | 'kibor_1w' | 'kibor_1m' | 'kibor_3m' | 'kibor_6m'
  rate REAL NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, date)
);

-- PBS CPI data (updated monthly)
CREATE TABLE IF NOT EXISTS cpi_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,         -- 'YYYY-MM'
  index_value REAL NOT NULL,
  yoy_change REAL NOT NULL,
  mom_change REAL DEFAULT 0,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month)
);

-- CDNS National Savings rates (updated monthly)
CREATE TABLE IF NOT EXISTS cdns_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate TEXT NOT NULL,   -- 'bsc' | 'ric' | 'dsc' | 'ssc' | 'sfwa'
  rate_pa REAL NOT NULL,       -- annual rate as decimal (e.g. 0.096)
  effective_date TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(certificate, effective_date)
);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT,
  unsubscribed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date DESC);
CREATE INDEX IF NOT EXISTS idx_commodity_date ON commodity_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_market_insights_published ON market_insights(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_rates_key_date ON policy_rates(key, date DESC);
CREATE INDEX IF NOT EXISTS idx_cpi_data_month ON cpi_data(month DESC);
CREATE INDEX IF NOT EXISTS idx_cdns_rates_date ON cdns_rates(effective_date DESC);

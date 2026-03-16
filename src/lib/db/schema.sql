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
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  delta REAL NOT NULL,
  indicators TEXT NOT NULL,  -- JSON array
  published BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date DESC);
CREATE INDEX IF NOT EXISTS idx_commodity_date ON commodity_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_market_insights_published ON market_insights(published, created_at DESC);

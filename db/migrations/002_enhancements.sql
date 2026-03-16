-- Migration 002: PakEcon.ai Platform Enhancement v2.0
-- Date: 2026-03-17
-- Apply: wrangler d1 execute pakecon_db --file=db/migrations/002_enhancements.sql
-- Local: wrangler d1 execute pakecon_db --local --file=db/migrations/002_enhancements.sql

-- ─── Alter existing tables ───────────────────────────────────────────────────

ALTER TABLE market_insights ADD COLUMN generated_by TEXT;
ALTER TABLE market_insights ADD COLUMN twitter_post_id TEXT;
ALTER TABLE market_insights ADD COLUMN telegram_message_id TEXT;
ALTER TABLE market_insights ADD COLUMN category TEXT DEFAULT 'market_insight';

-- ─── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT NOT NULL,
  subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  stage TEXT NOT NULL,   -- 'scraper'|'analyst'|'publisher'|'social'|'digest'
  status TEXT NOT NULL,  -- 'running'|'completed'|'error'|'skipped'
  message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- CPI table: required by Inflation Calculator (US9 / T075)
-- Populated by PBS scraper; base year = 2015-16 = 100 (PBS standard)
CREATE TABLE IF NOT EXISTS cpi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,       -- 1-12; use 0 for annual average
  cpi_index REAL NOT NULL,
  base_year INTEGER NOT NULL DEFAULT 2016,
  source TEXT NOT NULL DEFAULT 'pbs',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, month)
);

-- NOTE: tax_slabs table (migration 001) is retained but NOT used in v2.0.
-- Tax slabs are managed via TypeScript constants in src/lib/utils/tax-slabs.ts.

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_agent_logs_workflow ON agent_logs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_category ON market_insights(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpi_year_month ON cpi(year, month);

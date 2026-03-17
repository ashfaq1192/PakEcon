# Data Model: PakEcon.ai Platform Enhancement

**Feature**: 002-platform-enhancement | **Date**: 2026-03-17

---

## Existing Tables (from migration 001 — unchanged)

### `exchange_rates`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| currency | TEXT | NOT NULL | ISO code: USD, EUR, GBP, AED, SAR, CNY, CAD, AUD, JPY, RON |
| rate | REAL | NOT NULL | PKR per 1 unit of foreign currency |
| date | TEXT | NOT NULL | ISO date YYYY-MM-DD |
| source | TEXT | NOT NULL | 'sbp' |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE(currency, date) | |

### `commodity_prices`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| commodity | TEXT | NOT NULL | e.g., 'wheat_flour', '24k_gold_tola', 'petrol' |
| city | TEXT | NOT NULL | 'karachi', 'lahore', 'islamabad', 'national' |
| price | REAL | NOT NULL | PKR amount |
| unit | TEXT | NOT NULL | 'kg', 'tola', 'gram', 'liter', 'dozen' |
| date | TEXT | NOT NULL | ISO date |
| source | TEXT | NOT NULL | 'pbs', 'ogra', 'brecorder' |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE(commodity, city, date) | |

### `tax_slabs`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| year | INTEGER | NOT NULL | e.g., 2026 |
| min_income | REAL | NOT NULL | PKR |
| max_income | REAL | nullable | NULL for top bracket |
| rate | REAL | NOT NULL | Decimal (0.0–0.35) |
| fixed_tax | REAL | DEFAULT 0 | Fixed component for slab |
| effective_from | TEXT | NOT NULL | ISO date |
| | | UNIQUE(year, min_income) | |

### `market_insights` (ALTERED — see migration 002)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| title | TEXT | NOT NULL | Max 70 chars (SEO) |
| content | TEXT | NOT NULL | Full MDX body (300+ words) |
| summary | TEXT | NOT NULL | 1–3 sentences for card UI |
| delta | REAL | NOT NULL | % change that triggered insight |
| indicators | TEXT | NOT NULL | JSON array of indicator objects |
| category | TEXT | DEFAULT 'market_insight' | **NEW**: enum — see below |
| generated_by | TEXT | nullable | **NEW**: 'groq:llama-3.3-70b-versatile' or 'openai:gpt-4o-mini' |
| twitter_post_id | TEXT | nullable | **NEW**: Twitter tweet ID |
| telegram_message_id | TEXT | nullable | **NEW**: Telegram message ID |
| published | BOOLEAN | DEFAULT FALSE | |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**`category` enum values**: `market_insight` | `weekly_digest` | `budget_alert` | `policy_update`

---

## New Tables (migration 002)

### `newsletter_subscribers`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| email | TEXT | NOT NULL, UNIQUE | Lowercase, trimmed |
| confirmed | BOOLEAN | DEFAULT FALSE | |
| confirmation_token | TEXT | NOT NULL | HMAC-SHA256 hex digest |
| subscribed_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| unsubscribed_at | TEXT | nullable | Soft delete timestamp |

**Lifecycle**:
```
[created] → confirmed=false → [email clicked] → confirmed=true → [unsubscribed] → unsubscribed_at set
```
**Uniqueness**: email is UNIQUE — duplicate submission returns 200 without re-creating record.

---

### `agent_logs`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| workflow_id | TEXT | NOT NULL | UUID generated per run |
| stage | TEXT | NOT NULL | 'scraper' \| 'analyst' \| 'publisher' \| 'social' \| 'digest' |
| status | TEXT | NOT NULL | 'running' \| 'completed' \| 'error' \| 'skipped' |
| message | TEXT | nullable | Error message or info log |
| duration_ms | INTEGER | nullable | Execution time for the stage |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**: `idx_agent_logs_workflow ON agent_logs(workflow_id, created_at DESC)`
**Retention**: Purge records older than 30 days (manual maintenance query).

---

## Client-Side Only Entities (never stored server-side)

These entities exist only in browser memory during tool session:

### `ElectricityBillCalculation`
```typescript
interface ElectricityBillCalculation {
  disco: DiscoId;                    // 'LESCO' | 'HESCO' | 'MEPCO' | 'PESCO' | 'QESCO' | 'IESCO' | 'GEPCO' | 'SEPCO' | 'KELECTRIC'
  consumerType: ConsumerType;        // 'residential' | 'commercial' | 'agricultural'
  unitsConsumed: number;
  slabBreakdown: SlabCharge[];       // [{fromUnit, toUnit, rate, units, charge}]
  fixedCharge: number;               // PKR
  fuelAdjustmentCharge: number;      // PKR
  gstAmount: number;                 // 17% of (energy + fixed + fca)
  totalBill: number;                 // PKR
  lastVerifiedDate: string;          // ISO date of tariff verification
}
```

### `ZakatCalculation`
```typescript
interface ZakatCalculation {
  nisabBasis: 'silver' | 'gold';
  nisabThresholdPKR: number;         // Fetched from D1 gold/silver price
  cashSavings: number;
  goldGrams: number;
  silverGrams: number;
  businessInventory: number;
  receivables: number;
  liabilities: number;
  totalZakatableWealth: number;      // sum of assets minus liabilities
  nisabMet: boolean;
  zakatDue: number;                  // 2.5% of totalZakatableWealth if nisabMet
  calculationDate: string;
}
```

### `LoanScheduleRow`
```typescript
interface LoanScheduleRow {
  month: number;
  openingBalance: number;
  installment: number;
  principalComponent: number;
  profitOrInterestComponent: number;
  closingBalance: number;
}

interface LoanCalculation {
  principal: number;
  downPayment: number;
  loanAmount: number;                // principal - downPayment
  annualRate: number;
  tenureMonths: number;
  financingMode: 'conventional' | 'islamic';
  monthlyInstallment: number;
  totalProfitOrInterest: number;
  totalPayable: number;
  schedule: LoanScheduleRow[];       // First 12 months + summary row
}
```

### `SalarySlip`
```typescript
interface SalarySlip {
  companyName: string;
  employeeName: string;
  designation: string;
  department: string;
  month: string;                     // "March 2026"
  earnings: SalaryItem[];            // [{label, amount}]
  deductions: SalaryItem[];          // [{label, amount}]
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}
```

---

### `cpi` (NEW — required by US9 Inflation Calculator)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | INTEGER | PK, AUTOINCREMENT | |
| year | INTEGER | NOT NULL | e.g., 2026 |
| month | INTEGER | NOT NULL | 1–12; use 0 for annual average |
| cpi_index | REAL | NOT NULL | CPI index value (base year = 2015–16 = 100) |
| base_year | INTEGER | NOT NULL | Always 2016 (PBS base) |
| source | TEXT | NOT NULL | 'pbs' |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE(year, month) | |

**Populated by**: PBS scraper (pbs.ts) — fetch annual/monthly CPI from PBS statistics page.
**Used by**: `GET /api/inflation?fromYear=2019&toYear=2026` → Inflation Calculator (T075).

---

## TypeScript Constants Files (not D1)

### `src/lib/data/electricity-tariffs.ts`
```typescript
export const LAST_VERIFIED_DATE = '2026-03-17';  // Update on each NEPRA tariff order

export const DISCO_TARIFFS: Record<DiscoId, TariffStructure> = {
  LESCO: { residentialSlabs: [...], commercialSlabs: [...], fixedCharge: {...}, fcaRate: ... },
  HESCO: { ... },
  // ...all 9 DISCOs
};
```

### `src/lib/data/property-stamp-duty.ts`
```typescript
export const PROVINCE_STAMP_DUTY: Record<Province, StampDutyRates> = {
  PUNJAB: { stampDuty: 0.03, cvtFiler: 0.01, cvtNonFiler: 0.02, registrationFee: 0.01 },
  SINDH:  { stampDuty: 0.02, cvtFiler: 0.01, cvtNonFiler: 0.02, registrationFee: 0.005 },
  KPK:    { ... },
  BALOCHISTAN: { ... },
  ICT:    { ... },
};
```

---

## Migration SQL: 002_enhancements.sql

```sql
-- Alter existing table
ALTER TABLE market_insights ADD COLUMN generated_by TEXT;
ALTER TABLE market_insights ADD COLUMN twitter_post_id TEXT;
ALTER TABLE market_insights ADD COLUMN telegram_message_id TEXT;
ALTER TABLE market_insights ADD COLUMN category TEXT DEFAULT 'market_insight';

-- New tables
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
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- CPI table (required by Inflation Calculator US9)
CREATE TABLE IF NOT EXISTS cpi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,   -- 1-12; use 0 for annual average
  cpi_index REAL NOT NULL,  -- Base 2015-16 = 100 (PBS standard)
  base_year INTEGER NOT NULL DEFAULT 2016,
  source TEXT NOT NULL DEFAULT 'pbs',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, month)
);

-- NOTE: tax_slabs table (from migration 001) is NOT altered or re-created here.
-- Tax slabs are managed via TypeScript constants in src/lib/utils/tax-slabs.ts
-- for faster access and simpler updates. The D1 tax_slabs table from migration 001
-- is retained but unused in v2.0 — do not query it.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_agent_logs_workflow ON agent_logs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_category ON market_insights(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpi_year_month ON cpi(year, month);
```

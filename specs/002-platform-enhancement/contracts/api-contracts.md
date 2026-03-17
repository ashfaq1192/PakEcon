# API Contracts: PakEcon.ai Platform Enhancement

**Feature**: 002-platform-enhancement | **Date**: 2026-03-17

All endpoints are Cloudflare Functions at `functions/api/`. All responses are `application/json`.

---

## Public Read Endpoints (No Authentication)

### GET /api/exchange-rates

Returns current PKR exchange rates from D1.

**Query params**: `?currency=USD` (optional; omit for all)

**Response 200**:
```json
{
  "rates": [
    { "currency": "USD", "rate": 278.50, "date": "2026-03-17", "source": "sbp" },
    { "currency": "EUR", "rate": 301.20, "date": "2026-03-17", "source": "sbp" }
  ],
  "updatedAt": "2026-03-17T06:00:00Z"
}
```

**Response 404** (no data in D1 yet):
```json
{ "error": "NO_DATA", "message": "Exchange rate data not yet available." }
```

**Cloudflare Function**: `functions/api/exchange-rates.ts`
**D1 Query**: `SELECT currency, rate, date, source FROM exchange_rates WHERE date = date('now') ORDER BY currency`
**Fallback**: If today has no data, return most recent available date with `stale: true` flag.

---

### GET /api/commodities

Returns commodity prices from D1.

**Query params**:
- `?city=karachi` (optional; 'karachi' | 'lahore' | 'islamabad' | 'peshawar' | 'multan' | 'quetta' | 'national')
- `?commodity=petrol` (optional; commodity slug)
- `?limit=20` (default: 50)

**Response 200**:
```json
{
  "commodities": [
    {
      "commodity": "petrol",
      "city": "national",
      "price": 321.17,
      "unit": "liter",
      "date": "2026-03-17",
      "source": "ogra"
    },
    {
      "commodity": "24k_gold_tola",
      "city": "national",
      "price": 543262,
      "unit": "tola",
      "date": "2026-03-17",
      "source": "brecorder"
    }
  ],
  "updatedAt": "2026-03-17T06:00:00Z"
}
```

**Cloudflare Function**: `functions/api/commodities.ts`

---

### GET /api/gold-price

Returns current gold/silver prices with historical trend (30 days).

**Response 200**:
```json
{
  "gold": {
    "perTola": 543262,
    "perGram": 46582,
    "carat": 24,
    "date": "2026-03-17",
    "source": "brecorder"
  },
  "silver": {
    "perTola": 6850,
    "perGram": 587,
    "date": "2026-03-17",
    "source": "brecorder"
  },
  "history30d": [
    { "date": "2026-02-15", "goldPerTola": 538000 },
    { "date": "2026-02-16", "goldPerTola": 540100 }
  ],
  "nisabSilverPKR": 426285,
  "nisabGoldPKR": 475660
}
```

**Cloudflare Function**: `functions/api/gold-price.ts`
**Nisab calculation**: Silver nisab = 612.36g × silver_per_gram; Gold nisab = 87.48g × gold_per_gram

---

### GET /api/exchange-rates/history

Returns 30-day history for a specific currency pair.

**Query params**: `?currency=USD` (required)

**Response 200**:
```json
{
  "currency": "USD",
  "history": [
    { "date": "2026-02-15", "rate": 276.80 },
    { "date": "2026-02-16", "rate": 277.10 }
  ]
}
```

---

## Protected Endpoints (Bearer Token Auth)

### POST /api/agents/trigger

Triggers the agent workflow manually (GitHub Actions heartbeat or manual call).

**Auth**: `Authorization: Bearer {AGENT_SECRET}`

**Request body**: `{}` (empty)

**Response 200**:
```json
{
  "workflowId": "uuid-v4",
  "publishedCount": 2,
  "executionTimeMs": 45230,
  "logs": [
    { "stage": "scraper", "status": "completed", "message": "Fetched 8 data points" },
    { "stage": "analyst", "status": "completed", "message": "Generated 2 insights (delta > 1%)" },
    { "stage": "publisher", "status": "completed", "message": "Committed 2 MDX files to GitHub" },
    { "stage": "social", "status": "completed", "message": "Posted to Twitter and Telegram" }
  ]
}
```

**Response 401**: `{ "error": "UNAUTHORIZED" }`
**Response 500**: `{ "error": "WORKFLOW_FAILED", "stage": "publisher", "message": "..." }`

---

### POST /api/newsletter/subscribe

Accepts email subscription and sends confirmation email.

**Auth**: None (public endpoint)

**Request body**:
```json
{ "email": "user@example.com" }
```

**Response 200** (new or already pending):
```json
{ "message": "Confirmation email sent. Please check your inbox." }
```

**Response 200** (already confirmed):
```json
{ "message": "You are already subscribed." }
```

**Response 400**:
```json
{ "error": "INVALID_EMAIL", "message": "Please provide a valid email address." }
```

**Cloudflare Function**: `functions/api/newsletter/subscribe.ts`
**Logic**: Validate email format → UPSERT into `newsletter_subscribers` → generate HMAC-SHA256 token → send confirmation email via Email Workers

---

### GET /api/newsletter/confirm

Confirms email subscription via token link.

**Query params**: `?token=abc123&email=user@example.com`

**Response 302** (success): Redirect to `/?subscribed=true`
**Response 302** (invalid token): Redirect to `/?error=invalid_token`
**Response 302** (already confirmed): Redirect to `/?subscribed=already`

---

### GET /api/newsletter/unsubscribe

Unsubscribes a confirmed subscriber.

**Query params**: `?token=abc123&email=user@example.com`

**Response 302**: Redirect to `/?unsubscribed=true`

---

## Scheduled Handlers (Cloudflare Cron)

### scheduled() — `functions/scheduled/cron.ts`

Triggered by Cloudflare Cron (`0 */6 * * *` — every 6 hours).

**Logic**:
```
1. Generate workflow_id (UUID)
2. Log: stage=scraper, status=running
3. Run Scraper Agent (SBP + PBS + OGRA + Commodities)
4. Log: stage=scraper, status=completed|error
5. Run Analyst Agent (compare delta, call Groq/LLaMA 3.3)
6. Log: stage=analyst, status=completed|error
7. Run Publisher Agent (GitHub API commit or PR)
8. Log: stage=publisher, status=completed|error
9. Run Social Publisher Agent (Twitter + Telegram)
10. Log: stage=social, status=completed|error
11. Check: isMonday && hour in [3,9] UTC (08:00–14:00 PKT)?
    → If yes: Run Weekly Digest stage
    → Log: stage=digest, status=completed|error|skipped
```

**Error isolation**: Each stage catches its own errors. A failure in `social` does NOT roll back `publisher`. All errors are logged to D1 `agent_logs`.

---
name: Fix PBS/OGRA/Gold scrapers
description: Fixed three failing scrapers — PBS SPI (WordPress REST API), OGRA 403 (browser headers), Gold (metals.live API)
type: general
stage: green
date: 2026-03-19
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
---

## Prompt

Fix the three failing scrapers:
1. PBS SPI scraper — URL `https://www.pbs.gov.pk/spi-data` returns 404; confirmed WordPress REST API works to discover latest post URL
2. OGRA scraper — returns 403 from Workers but 200 locally; needs browser-like headers
3. Gold price scraper — BRecorder and goldpricez.com HTML parsing both fail (structure changed)

## Response

### PBS SPI (`src/lib/scrapers/pbs.ts`)
- Replaced static `PBS_SPI_URL` with `PBS_WP_API` pointing to WordPress REST API
- `scrapePBS()` now does a two-step fetch:
  1. `GET /wp-json/wp/v2/posts?search=weekly+sensitive+price+indicator&per_page=1&_fields=link` → gets latest post URL dynamically
  2. Fetches that URL with full browser headers (Chrome UA, Accept, Accept-Language)

### OGRA (`src/lib/scrapers/commodities.ts`)
- Added full Chrome browser headers to OGRA fetch: `User-Agent`, `Accept`, `Accept-Language`
- Should resolve 403 that was returned when using minimal headers

### Gold/Silver (`src/lib/scrapers/commodities.ts`)
- Replaced brittle HTML scraping (BRecorder/goldpricez) with `api.metals.live/v1/spot` free JSON API (no key needed)
- Fetches USD spot prices for gold and silver
- Reads USD/PKR rate from D1 `exchange_rates` table (already stored by SBP scraper)
- Computes: gram_pkr = (usd_per_troy_oz / 31.1035) * usd_pkr; tola_pkr = gram_pkr * 11.6638
- Fallback USD/PKR: 278 if D1 read fails

## Files Modified
- `src/lib/scrapers/pbs.ts`
- `src/lib/scrapers/commodities.ts`

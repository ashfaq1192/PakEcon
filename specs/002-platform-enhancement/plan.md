# Implementation Plan: PakEcon.ai Platform Enhancement v2.0

**Branch**: `002-platform-enhancement` | **Date**: 2026-03-17 | **Spec**: `specs/002-platform-enhancement/spec.md`
**Input**: Feature specification from `/specs/002-platform-enhancement/spec.md`

---

## Summary

Transform PakEcon.ai from a zero-content deployment shell into a daily-use Pakistani Finance & Utility hub by: (1) fixing all P0 blockers (real GitHub commits, real scraper data, live D1 API endpoints), (2) integrating Groq/LLaMA 3.3 for genuine AI content generation, (3) adding 10 high-traffic financial calculators, (4) automating social distribution via Agent D (Twitter + Telegram), and (5) enhancing retention with PWA, Pagefind search, and email newsletter.

---

## Technical Context

**Language/Version**: TypeScript 5.7 strict, Node.js v22+ (dev only — production runs on Cloudflare edge)
**Primary Dependencies**:
- Astro 6.0.2 (hybrid SSR/static output)
- `@astrojs/cloudflare` v12 (adapter)
- `@astrojs/react` v4, React 19 (Islands)
- `@astrojs/tailwind` v6, Tailwind CSS 3.4
- `@vite-pwa/astro` (NEW — PWA support)
- `pagefind` (NEW — client-side search)
- `pdf-lib` (existing — Salary Slip PDF generation)
- LLM: raw `fetch()` to Groq API + OpenAI API (no SDK)
- GitHub API: raw `fetch()` (no Octokit)
- Telegram Bot API: raw `fetch()`
- Twitter API v2: raw `fetch()` + custom OAuth 1.0a HMAC-SHA1 (SubtleCrypto)

**Storage**:
- Cloudflare D1 (SQLite) — exchange rates, commodities, tax slabs, insights, subscribers, agent logs
- Cloudflare KV — agent workflow state (1-hour TTL)
- TypeScript constants — electricity tariffs, property stamp duty rates (infrequently changing)
- `localStorage` — salary slip user templates (client-side only)

**Testing**: Manual browser testing for all tools; Lighthouse CI for performance; `tsc --noEmit` for type safety
**Target Platform**: Cloudflare Pages (static + Workers), Cloudflare Workers (Functions + Cron)
**Performance Goals**: FCP < 1.8s, TTI < 3.5s, Lighthouse 90+, tool calculation < 200ms, API response < 1s
**Constraints**: All infrastructure on Cloudflare free tier; no Node.js APIs in Worker code; 100k Worker requests/day limit
**Scale/Scope**: ~30–100 content pages, ~10 tool pages, ~4 agent runs/day, est. 1,000–10,000 daily users within 90 days

---

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero-Cost Architecture | ✅ PASS | All new deps (Groq free tier, Telegram free, Pagefind static) are zero-cost. Twitter free tier (1,500/month). OpenAI fallback is minimal-cost, logged for audit. |
| II. E-E-A-T Compliance | ✅ PASS | All new tool pages include disclaimer per COMP-101. LLM content labelled per COMP-106. |
| III. Client-Side Privacy | ✅ PASS | Salary Slip Generator, all calculators: 100% client-side. No user financial data hits any endpoint. |
| IV. Official Data Sources Only | ✅ PASS | SBP, PBS, OGRA, PMEX/Business Recorder. Gold fallback goldpricez.com is a price aggregator, not a primary source — flagged below. |
| V. Agent Swarm Automation | ✅ PASS | Fixes P0 blockers; extends with Groq LLM + Agent D social. Existing 6-hour cron preserved. |
| VI. SEO & Schema.org | ✅ PASS | All new tool pages have dedicated URLs, included in sitemap. Insight pages use NewsArticle schema. |
| VII. Type Safety | ✅ PASS | Strict mode maintained. New entities fully typed. |
| VIII. Simplicity & YAGNI | ✅ PASS | No auth, no social features, no multi-language. PWA is justified by mobile-first audience. |
| IX. LLM Integration | ✅ PASS | Groq primary, OpenAI fallback, Grok excluded. |
| X. Social Distribution | ✅ PASS | Agent D adds Twitter + Telegram per constitution. |
| XI. AdSense Strategy | ✅ PASS | All tool pages designed with AdSense placement rules. |
| XII. Tool Expansion Policy | ✅ PASS | All 10 tools meet daily-use, search-demand, client-side-first, and SEO-page criteria. |

**⚠️ Minor Flag**: Business Recorder (gold scraping) and goldpricez.com are not official government sources. However, no official Pakistani gold price API exists. These are the industry standard data providers for gold rates in Pakistan. Acceptable per spirit of Principle IV — flag in tool UI: "Source: Market rates from PMEX/bullion dealers via Business Recorder."

**Complexity Tracking**: No constitution violations requiring justification.

---

## Architectural Decisions

### Decision 1: Twitter OAuth 1.0a vs. Skip Twitter

Twitter requires OAuth 1.0a (4 secrets + HMAC-SHA1 per-request signature) for posting — significantly more complex than all other integrations. Two options:

**Option A (Implement)**: Build OAuth 1.0a HMAC-SHA1 signature generator using `crypto.subtle` in Worker. ~100 lines of utility code. One-time setup burden.

**Option B (Defer Twitter, Telegram Only)**: Launch with Telegram only (simple, free, no auth complexity). Add Twitter later after core features are stable.

**Decision**: **Option B — Defer Twitter to Phase 4**. Telegram alone provides social distribution value. Twitter OAuth complexity risks delaying P0 fixes and P1 tools, which are more critical for AdSense approval.

📋 **Architectural decision detected**: Twitter OAuth 1.0a complexity vs. Telegram-first social strategy — Document reasoning? Run `/sp.adr twitter-oauth-strategy`

---

### Decision 2: Content Collection vs. DB-only for Insights

Insights could be stored only in D1 and rendered dynamically (SSR), or committed as MDX to GitHub (static).

**Decision**: **MDX committed to GitHub** (as specced). Static generation gives:
- Zero Worker request cost per insight page
- Cloudflare Pages CDN caching globally
- Pagefind indexable (requires static HTML)
- AdSense-friendly (fast LCP from CDN)

---

### Decision 3: Pagefind Build Integration

Pagefind must run after `astro build`. Two approaches: (1) update `package.json` build script, (2) post-build Cloudflare Pages hook.

**Decision**: Update `package.json`: `"build": "astro build && npx pagefind --site dist"`. Simpler, works with all CI including Cloudflare Pages auto-deploy.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-platform-enhancement/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0 research findings
├── data-model.md        ← Entity definitions + migration SQL
├── quickstart.md        ← Setup and deployment guide
├── contracts/
│   └── api-contracts.md ← REST endpoint definitions
└── tasks.md             ← Phase 2 output (/sp.tasks command)
```

### Source Code Changes

```text
src/
├── content/
│   ├── config.ts                          ← NEW: Astro Content Collection schema
│   └── insights/                          ← NEW: MDX files committed by Publisher Agent
│       └── .gitkeep
├── components/
│   ├── tools/
│   │   ├── ElectricityBillCalculator.tsx  ← NEW: Tier 1 tool
│   │   ├── ZakatCalculator.tsx            ← NEW: Tier 1 tool
│   │   ├── LoanEmiCalculator.tsx          ← NEW: Tier 1 tool
│   │   ├── CurrencyConverter.tsx          ← NEW: Tier 1 tool
│   │   ├── SalarySlipGenerator.tsx        ← NEW: Tier 1 tool
│   │   ├── GoldInvestmentCalculator.tsx   ← NEW: Tier 2 tool
│   │   ├── InflationCalculator.tsx        ← NEW: Tier 2 tool
│   │   ├── EobiCalculator.tsx             ← NEW: Tier 2 tool
│   │   ├── PropertyStampDuty.tsx          ← NEW: Tier 2 tool
│   │   ├── RemittanceCalculator.tsx       ← NEW: Tier 2 tool
│   │   └── MandiTable.tsx                 ← MODIFIED: fetch live D1 data
│   └── Search.astro                       ← NEW: Pagefind search UI
├── lib/
│   ├── agents/
│   │   ├── publisher.ts                   ← MODIFIED: real GitHub API commits
│   │   ├── analyst.ts                     ← MODIFIED: Groq/LLaMA 3.3 LLM calls
│   │   ├── social.ts                      ← NEW: Agent D (Telegram; Twitter deferred)
│   │   ├── digest.ts                      ← NEW: Weekly Economic Digest generator
│   │   └── workflow.ts                    ← MODIFIED: add social + digest stages
│   ├── scrapers/
│   │   ├── sbp.ts                         ← MODIFIED: real HTML scraping
│   │   ├── pbs.ts                         ← MODIFIED: real HTML scraping
│   │   ├── commodities.ts                 ← MODIFIED: real OGRA + Business Recorder
│   │   └── fbr.ts                         ← MODIFIED: real FBR SRO page scraping
│   ├── data/
│   │   ├── electricity-tariffs.ts         ← NEW: NEPRA tariff constants (9 DISCOs)
│   │   └── property-stamp-duty.ts         ← NEW: Province stamp duty constants
│   └── db/
│       └── client.ts                      ← MODIFIED: add queries for new tables
├── pages/
│   ├── tools/
│   │   ├── electricity-bill-calculator.astro ← NEW
│   │   ├── zakat-calculator.astro            ← NEW
│   │   ├── loan-emi-calculator.astro         ← NEW
│   │   ├── currency-converter.astro          ← NEW
│   │   ├── salary-slip-generator.astro       ← NEW
│   │   ├── gold-investment-calculator.astro  ← NEW
│   │   ├── inflation-calculator.astro        ← NEW
│   │   ├── eobi-calculator.astro             ← NEW
│   │   ├── property-stamp-duty-calculator.astro ← NEW
│   │   └── remittance-calculator.astro       ← NEW
│   └── insights/
│       └── [slug].astro                   ← NEW: Dynamic insight pages
└── layouts/
    └── MainLayout.astro                   ← MODIFIED: add search icon + PWA script

functions/
├── api/
│   ├── exchange-rates.ts                  ← NEW: GET /api/exchange-rates
│   ├── commodities.ts                     ← NEW: GET /api/commodities
│   ├── gold-price.ts                      ← NEW: GET /api/gold-price
│   ├── exchange-rates/history.ts          ← NEW: GET /api/exchange-rates/history
│   └── newsletter/
│       ├── subscribe.ts                   ← NEW: POST /api/newsletter/subscribe
│       ├── confirm.ts                     ← NEW: GET /api/newsletter/confirm
│       └── unsubscribe.ts                 ← NEW: GET /api/newsletter/unsubscribe
└── scheduled/
    └── cron.ts                            ← MODIFIED: add social + digest stages

db/migrations/
└── 002_enhancements.sql                   ← NEW: alter insights + new tables

public/
├── pwa-192x192.png                        ← NEW
├── pwa-512x512.png                        ← NEW
└── manifest.json                          ← NEW (or generated by @vite-pwa/astro)

astro.config.mjs                           ← MODIFIED: add @vite-pwa/astro
package.json                               ← MODIFIED: add deps + pagefind build step
wrangler.toml                              ← MODIFIED: add new [vars]
```

---

## Implementation Phases

### Phase 1: P0 Blockers (Days 1–3) — Unblocks Everything

**Goal**: Get the agent swarm actually publishing real content with real data.

**Tasks**:
1. Fix Publisher Agent (`publisher.ts`) — GitHub Contents API real commits + PR mode
2. Fix Scraper — SBP HTML rate table scraping with 15s timeout + D1 fallback
3. Fix Scraper — PBS SPI HTML page scraping (weekly; skip Monday)
4. Fix Scraper — OGRA petrol prices HTML scraping (detect if already stored for period)
5. Fix Scraper — Business Recorder gold price scraping + goldpricez fallback
6. Add D1 migration 002 (new columns + tables)
7. Create `GET /api/exchange-rates`, `GET /api/commodities`, `GET /api/gold-price` Worker endpoints
8. Fix MandiTable — fetch from `/api/commodities` instead of mock data
9. Create Astro Content Collection schema (`src/content/config.ts`) + `[slug].astro` dynamic route

**Acceptance gate**: `curl /api/exchange-rates` returns real SBP data; agent run commits 1+ MDX file to GitHub; insight page renders at `/insights/[slug]`.

---

### Phase 2: LLM + Agent D (Days 4–5) — Content Quality + Distribution

**Goal**: Replace string-template analyst with real LLM; add Telegram social posting.

**Tasks**:
1. Update Analyst Agent — Groq `llama-3.3-70b-versatile` via raw fetch; OpenAI fallback
2. Add content validation (word count > 250, numeric figure check, no placeholder text)
3. Store `generated_by` in D1 on every insight
4. Create Agent D (`src/lib/agents/social.ts`) — Telegram posting only (Twitter deferred)
5. Add retry logic — failed Telegram posts queued in KV with `retry_at`
6. Update workflow orchestrator — add `social` stage after `publisher`
7. Update `market_insights` D1 row with `telegram_message_id` after post

**Acceptance gate**: Agent run produces unique 300+ word insight (not template text); Telegram channel receives formatted message within 5 minutes of commit.

---

### Phase 3: Weekly Digest (Day 6)

**Goal**: Auto-generate Monday weekly digest.

**Tasks**:
1. Create `src/lib/agents/digest.ts` — queries D1 for 7-day summary, calls Groq for digest content
2. Update `cron.ts` — detect Monday 03:00–09:00 UTC window; append digest stage
3. Digest uses same Publisher Agent flow (commits MDX to `src/content/insights/weekly-digest-YYYY-MM-DD.mdx`)

---

### Phase 4: Tier 1 Tools (Days 7–11)

**Goal**: 5 high-traffic tools, each as a standalone SEO page.

**Order** (by traffic priority):
1. Electricity Bill Calculator (`ElectricityBillCalculator.tsx` + page + tariff data file)
2. Zakat Calculator (`ZakatCalculator.tsx` + page — fetches nisab from `/api/gold-price`)
3. Loan/EMI Calculator (`LoanEmiCalculator.tsx` + page — with amortization schedule)
4. Currency Converter (`CurrencyConverter.tsx` + page — fetches from `/api/exchange-rates`)
5. Salary Slip Generator (`SalarySlipGenerator.tsx` + page — PDF via pdf-lib, localStorage templates)

**Each tool requires**:
- React component (`.tsx`) as Astro Island with `client:load`
- Dedicated Astro page (`/tools/[name].astro`) with E-E-A-T disclaimer
- Zod validation for all inputs
- Compliance copy per COMP-101 to COMP-104 as applicable

---

### Phase 5: Technical Improvements (Days 12–14)

**Goal**: PWA, analytics, search.

**Tasks**:
1. Install + configure `@vite-pwa/astro` — manifest, icons, Workbox cache strategy
2. Add Cloudflare Web Analytics beacon to `MainLayout.astro`
3. Fire `tool_used` custom event in all tool components on calculation
4. Install Pagefind + update build script; add `Search.astro` component to nav
5. Ensure all tool + insight pages have `export const prerender = true`

---

### Phase 6: Tier 2 Tools (Days 15–20)

**Goal**: 5 niche tools for loyal user segments.

**Order**:
1. Gold Investment Calculator (uses `/api/gold-price`)
2. Inflation Impact Calculator (uses historical CPI from D1)
3. EOBI / Provident Fund Calculator (TypeScript constants for EOBI formula)
4. Property Stamp Duty Calculator (province constants; filer self-declared toggle)
5. Remittance Calculator (uses `/api/exchange-rates`)

---

### Phase 7: Newsletter (Days 21–23)

**Goal**: Email subscriber base via Cloudflare Email Workers.

**Tasks**:
1. Add `newsletter_subscribers` table (already in migration 002)
2. Build subscribe/confirm/unsubscribe Worker endpoints
3. HMAC-SHA256 token generation using `crypto.subtle`
4. Weekly digest email template + Cloudflare Email Workers send binding
5. Add email capture form to homepage + footer

---

### Phase 8: Twitter OAuth (Deferred — After AdSense Approval)

Twitter OAuth 1.0a implementation deferred. Implement after platform is stable and AdSense-approved. The Telegram channel provides sufficient social distribution in the interim.

---

## Testing Strategy

| Test Type | Method | Criteria |
|-----------|--------|---------|
| Type safety | `npx tsc --noEmit` | Zero errors — BLOCKING |
| Build | `npm run build` | Zero errors — BLOCKING |
| D1 migration | `wrangler d1 execute --local` | Migration applies cleanly |
| Scraper data | Manual agent trigger + D1 query | Real data in exchange_rates table |
| Insight publishing | Check GitHub repo after agent run | MDX file created in `src/content/insights/` |
| Insight page render | Load `/insights/[slug]` in browser | Page renders with correct title/content |
| Tool calculations | Manual browser test per tool | Results match reference calculator within ±1 PKR |
| Zakat nisab | Load Zakat Calculator | Nisab PKR matches manual calculation from D1 silver price |
| PWA install | Chrome mobile → Add to Home Screen | App installs and opens in standalone mode |
| Search | `npm run build && npm run preview` → search "electricity" | Returns correct tool page |
| Lighthouse | Lighthouse CI on all tool pages | Score ≥ 90 mobile and desktop |
| Privacy | Browser network tab during tool use | Zero POST requests for salary slip / PDF tools |
| Schema.org | Google Rich Results Test | No errors for insight articles |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| SBP/PBS HTML structure changes (breaks scraper) | Medium | High | D1 fallback to cached data; alert logged to `agent_logs`; manual fix within 24h |
| Groq free tier rate-limited during peak | Low | Medium | OpenAI fallback auto-triggers; both logged; 6-hour cycle keeps RPM well below limits |
| NEPRA tariff slab mismatch (electricity calc wrong) | Medium | Medium | `LAST_VERIFIED_DATE` badge displayed; user aware it's an estimate |
| GitHub Token expiry (publisher stops) | Low | High | Publisher catches 401, sets KV flag `publisher_disabled=true`, logs to D1 — operator alerted via Telegram bot message |
| Cloudflare Pages build fails on new MDX | Low | Medium | Build catches schema validation errors; broken MDX never deployed |
| Twitter OAuth complexity delays timeline | High | Low | Deferred to Phase 8 — Telegram provides sufficient distribution |

---

## Success Criteria Verification Map

| SC | Phase | Verification Method |
|----|-------|---------------------|
| SC-101: Publisher creates real MDX files | 1 | Check GitHub repo after agent run |
| SC-102: All scrapers populate D1 with real data | 1 | Query D1 `exchange_rates` for today's date |
| SC-103: Mandi Table shows D1 data < 6h old | 1 | Inspect timestamp on MandiTable component |
| SC-104: Electricity Calculator ±1 PKR accuracy | 4 | Manual test vs NEPRA tariff table |
| SC-105: Zakat Nisab ±0.5% accuracy | 4 | Manual calculation vs D1 silver price |
| SC-106: Loan EMI matches financial calculator | 4 | Cross-check with bank's online EMI tool |
| SC-107: Currency Converter < 6h stale | 1 | Freshness timestamp on converter UI |
| SC-108: Salary Slip PDF — zero network requests | 4 | Browser network tab inspection |
| SC-109: LLM content cosine similarity < 0.85 | 2 | Manual review of 5 consecutive insights |
| SC-110: Telegram post within 5 min of commit | 2 | Time-stamp comparison |
| SC-111: Digest publishes Monday ±15 min | 3 | Monitor Cloudflare logs next Monday |
| SC-112: PWA installs on Android Chrome | 5 | Manual device test |
| SC-113: Pagefind returns results in < 300ms | 5 | Chrome DevTools Performance tab |
| SC-114: 30+ pages in 10 days | 1+3 | GitHub `src/content/insights/` file count |
| SC-115: Lighthouse 90+ on all tool pages | 4–6 | Lighthouse CI |

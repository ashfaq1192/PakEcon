# Tasks: PakEcon.ai Platform Enhancement v2.0

**Input**: Design documents from `/specs/002-platform-enhancement/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api-contracts.md ✅ | quickstart.md ✅

**Tests**: Not explicitly requested — no test tasks generated. Manual browser + Lighthouse CI per plan.md testing strategy.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New dependencies, directory structure, PWA assets, D1 migration

- [x] T001 Install new npm dependencies: `npm install -D @vite-pwa/astro pagefind` and verify `package.json` devDependencies
- [x] T002 Update `package.json` build script from `"astro build"` to `"astro build && npx pagefind --site dist"` in `package.json`
- [x] T003 [P] Create directory `src/content/insights/` with a `.gitkeep` file so the Publisher Agent has a target path
- [x] T004 [P] Add PWA icon placeholders: create `public/pwa-192x192.png` and `public/pwa-512x512.png` (use green brand color `#16a34a` backgrounds — can be simple solid-color PNGs initially)
- [x] T005 Create D1 migration file `db/migrations/002_enhancements.sql` with: ALTER TABLE market_insights ADD COLUMN generated_by TEXT; ADD twitter_post_id TEXT; ADD telegram_message_id TEXT; ADD category TEXT DEFAULT 'market_insight'; CREATE TABLE newsletter_subscribers; CREATE TABLE agent_logs; all indexes from data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure ALL user stories depend on — live D1 API endpoints + Astro Content Collection schema

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Apply D1 migration 002: document commands `wrangler d1 execute pakecon_db --local --file=db/migrations/002_enhancements.sql` and `wrangler d1 execute pakecon_db --file=db/migrations/002_enhancements.sql` in `quickstart.md` (already done) and verify migration applies cleanly locally
- [x] T007 Create Cloudflare Function `functions/api/exchange-rates.ts`: `GET /api/exchange-rates` — reads D1 `exchange_rates` table, returns today's rates or most recent with `stale: true` flag, supports optional `?currency=USD` query param, per contracts/api-contracts.md
- [x] T008 [P] Create Cloudflare Function `functions/api/commodities.ts`: `GET /api/commodities` — reads D1 `commodity_prices` table, supports `?city=` and `?commodity=` and `?limit=` query params, returns commodities array + updatedAt, per contracts/api-contracts.md
- [x] T009 [P] Create Cloudflare Function `functions/api/gold-price.ts`: `GET /api/gold-price` — reads D1 for current gold and silver prices, computes nisab thresholds (silver: price_per_gram × 612.36; gold: price_per_gram × 87.48), returns 30-day history array from D1, per contracts/api-contracts.md
- [x] T010 [P] Create Cloudflare Function `functions/api/exchange-rates/history.ts`: `GET /api/exchange-rates/history?currency=USD` — returns 30-day D1 history for specified currency pair
- [x] T011 Create Astro Content Collection schema `src/content/config.ts`: define `insights` collection using `defineCollection()` + Zod schema with fields: title (string max 70), pubDate (coerce.date), summary (string), category (enum: market_insight|weekly_digest|budget_alert|policy_update), source (string.url()), delta (number); export `collections = { insights }`
- [x] T012 Create dynamic insight page `src/pages/insights/[slug].astro`: export `prerender = true`, implement `getStaticPaths()` using `getCollection('insights')`, render MDX `<Content />` with MainLayout, include SchemaOrg Article markup (headline=title, datePublished=pubDate), add E-E-A-T disclaimer
- [x] T013 Update `wrangler.toml` to add new `[vars]`: `HUMAN_REVIEW_MODE = "false"`, `TWITTER_ENABLED = "false"` (deferred), `TELEGRAM_ENABLED = "true"`

**Checkpoint**: Foundation ready — `GET /api/exchange-rates` returns data from D1; insight MDX page renders at `/insights/[slug]`

---

## Phase 3: User Story 1 — Publisher Agent Real Commits (P0 BLOCKER)

**Goal**: Agent C creates actual MDX files in the GitHub repository via GitHub Contents API

**Independent Test**: Run agent trigger → check GitHub repo `src/content/insights/` for new MDX file → verify Cloudflare Pages starts rebuilding → load `/insights/[slug]` in browser

- [x] T014 [US1] Rewrite `src/lib/agents/publisher.ts` GitHub commit logic: **current stub** is the `createGitHubCommit()` function that logs `"Would create commit for: {filename}"` and returns without making any API call — replace this entire function body with real `fetch()` call to `PUT https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/src/content/insights/{filename}.mdx` using `Authorization: Bearer {GITHUB_TOKEN}`, `btoa()` for base64 content encoding, correct request body per research.md (message, content, author fields)
- [x] T015 [US1] Add `HUMAN_REVIEW_MODE` branch in `publisher.ts`: if env var is `"true"`, create a PR via `POST /repos/{owner}/{repo}/pulls` instead of direct commit; PR title = insight title; PR body = summary + source citation; target branch = `main`; head branch = `drafts/insights-{date}`
- [x] T016 [US1] Add GitHub API error handling in `publisher.ts`: catch 401 (token expired) → set KV key `publisher_disabled=true` → log to D1 `agent_logs` (stage=publisher, status=error, message="GITHUB_TOKEN_EXPIRED"); catch 422 (file exists/sha mismatch) → fetch existing file sha → retry PUT with sha; catch 429 → retry once after 30s
- [x] T017 [US1] Add Google Indexing API call in `publisher.ts` after successful GitHub commit: `POST https://indexing.googleapis.com/v3/urlNotifications:publish` with `{"url": "https://pakecon.ai/insights/{slug}", "type": "URL_UPDATED"}` — log success/failure to `agent_logs` (non-blocking: indexing failure does not fail the workflow)
- [x] T018 [US1] Update MDX file generation in `publisher.ts` to produce valid frontmatter matching the Content Collection schema from T011: `title`, `pubDate` (ISO date), `summary`, `category`, `source` (URL), `delta` (number) — no other frontmatter fields
- [x] T019 [US1] Verify end-to-end: manually trigger `POST /api/agents/trigger` with Bearer token → confirm MDX appears in GitHub → confirm Cloudflare Pages build starts → confirm page loads at `/insights/[slug]`

**Checkpoint**: Agent swarm is fully functional — content publishes automatically every 6 hours

---

## Phase 4: User Story 2 — Real Data Scrapers (P0 BLOCKER)

**Goal**: All 4 scrapers populate D1 with real economic data from official sources

**Independent Test**: Trigger agent run → query D1 `SELECT * FROM exchange_rates WHERE date = date('now')` → verify rows exist with real values → query `commodity_prices` → verify petrol and gold rows exist

- [x] T020 [US2] Rewrite `src/lib/scrapers/sbp.ts`: **current stub** uses hardcoded mock exchange rate object and a `// TODO: fetch from SBP` comment — replace mock data with real `fetch()` to SBP exchange rate HTML page, parse `<table>` rows for PKR rates vs USD/EUR/GBP/AED/SAR/CNY/CAD/AUD/JPY/RON using string regex on raw HTML (no Node.js DOM — use `response.text()` + regex), UPSERT to D1 `exchange_rates` with `INSERT OR REPLACE`, 15s fetch timeout with AbortController, fallback to D1 most-recent on error (log fallback via `insertAgentLog`)
- [x] T021 [US2] Rewrite `src/lib/scrapers/pbs.ts`: **current stub** has a hardcoded SPI index value and a `// TODO: fetch from PBS` comment — replace with real fetch to PBS homepage (`pbs.gov.pk`), extract most-recent SPI report URL from listing, fetch that page, parse commodity price table rows for 15 core commodities (wheat flour, rice, sugar, eggs, chicken, tomato, onion, potato, lentils, cooking oil, milk, tea, salt, petrol ref, diesel ref), UPSERT to D1 `commodity_prices` with city='national'; skip execution if JavaScript `new Date().getDay() === 1` (Monday — data not yet posted)
- [x] T022 [US2] Rewrite `src/lib/scrapers/commodities.ts` OGRA petrol section: **current stub** has hardcoded petrol/diesel prices as PKR constants with a `// TODO: fetch from OGRA` comment — replace with real fetch to `ogra.org.pk/notified-petroleum-prices`, parse the most recent notification row's Petrol/HSD/SKO/LDO prices (PKR/litre), check D1 for existing `commodity_prices` record with same `source='ogra'` and date within current fortnight — skip UPSERT if already stored (prices update fortnightly on 1st and 15th of month)
- [x] T023 [US2] Add gold/silver scraping to `src/lib/scrapers/commodities.ts`: **current stub** has hardcoded gold price as PKR constant with a `// TODO: fetch gold price` comment — replace with real fetch to `brecorder.com/gold-prices-in-pakistan-today`, parse 24K gold rate per tola and per gram from the price table; UPSERT to D1 `commodity_prices` (commodity='24k_gold_tola', unit='tola') and (commodity='24k_gold_gram', unit='gram'); if Business Recorder fetch fails or times out (10s), fall back to `goldpricez.com` as emergency source (label result with `source='brecorder_fallback'` per constitution Principle IV)
- [x] T024 [US2] Add rate limiting and delay utility in `src/lib/scrapers/`: ensure 10-second delay between each scraper's fetch calls using `await new Promise(r => setTimeout(r, 10000))`; wrap each scraper call in try/catch that logs to D1 `agent_logs` on error and continues (one scraper failure does not stop others)
- [x] T025 [US2] Update `src/lib/db/client.ts`: add typed query helpers for new tables — `getLatestExchangeRate(currency)`, `getLatestCommodity(commodity, city)`, `insertAgentLog(log)`, `getExchangeRateHistory(currency, days)`, `getGoldSilverPrices()` — all returning typed objects per data-model.md entities
- [x] T026 [US2] Fix `src/components/tools/MandiTable.tsx`: replace hardcoded mock data array with `useEffect()` fetch to `/api/commodities`, show loading spinner while fetching, show "Data updated [timestamp]" below table, handle fetch error with "Unable to load current prices — showing cached data" message
- [x] T027 [US2] Run scraper integration test: manually trigger agent → verify D1 has today's exchange rates (USD, EUR, GBP, AED, SAR), commodity prices (petrol, gold), and at least 5 PBS SPI commodities → verify Mandi Table on homepage loads live D1 data

**Checkpoint**: D1 contains real daily data; Mandi Table shows live prices; agent insights are based on real delta calculations

---

## Phase 5: User Story 3 — Electricity Bill Calculator (P1)

**Goal**: Users can calculate their monthly electricity bill for any of 9 DISCOs with NEPRA tariff accuracy

**Independent Test**: Enter 350 units for LESCO residential → verify breakdown shows correct slab charges, GST (17%), fixed charge, FCA → total matches manual NEPRA tariff calculation within ±1 PKR

- [x] T028 [US3] Create `src/lib/data/electricity-tariffs.ts`: define `LAST_VERIFIED_DATE = '2026-03-17'`; export `DISCO_TARIFFS` TypeScript constant with complete NEPRA residential/commercial/agricultural tariff slabs for all 9 DISCOs (LESCO, HESCO, MEPCO, PESCO, QESCO, IESCO, GEPCO, SEPCO, K-Electric) — include per-unit slab rates, fixed monthly charge, current FCA rate, GST rate (0.17)
- [x] T029 [US3] Create React component `src/components/tools/ElectricityBillCalculator.tsx`: inputs — DISCO selector (9 options), consumer type selector (residential/commercial/agricultural), units consumed (number); calculate button; on calculate: iterate slabs, compute energy charge per slab, add fixed charge, add FCA, add GST (17% of energy+fixed+FCA), display breakdown table + total; show "Last verified: {LAST_VERIFIED_DATE}" badge below result
- [x] T030 [US3] Create Astro page `src/pages/tools/electricity-bill-calculator.astro`: import ElectricityBillCalculator as React Island with `client:load`; include page title "Pakistan Electricity Bill Calculator 2026 — All DISCOs (NEPRA)"; add E-E-A-T disclaimer; add Schema.org WebPage JSON-LD; export `prerender = true`
- [ ] T031 [US3] Add page to sitemap (automatic via @astrojs/sitemap if prerender=true); manually verify `/tools/electricity-bill-calculator` renders and calculates correctly for at least 3 DISCOs with different unit amounts

**Checkpoint**: Electricity Bill Calculator live at `/tools/electricity-bill-calculator`; calculates correctly for all 9 DISCOs

---

## Phase 6: User Story 4 — Zakat Calculator (P1)

**Goal**: Users can calculate annual Zakat obligation with live Nisab from D1 gold/silver prices

**Independent Test**: Load Zakat Calculator → verify Nisab PKR matches (silver price from `/api/gold-price` × 612.36) → enter PKR 500,000 cash + 50g gold → verify Zakat = 2.5% of total zakatable wealth → toggle to Gold Nisab → verify threshold changes

- [x] T032 [US4] Create React component `src/components/tools/ZakatCalculator.tsx`: on mount, fetch `/api/gold-price` for live silver/gold prices and Nisab thresholds; inputs — nisab basis toggle (Silver/Gold), cash savings, gold grams, silver grams, business inventory, receivables, liabilities; on calculate: sum zakatable assets, subtract liabilities, check if total >= nisabThresholdPKR, compute 2.5% if yes; display: total zakatable wealth, Nisab threshold (PKR), nisab met (yes/no), Zakat due; show "Based on price as of [date]" with data source attribution
- [x] T033 [US4] Handle Zakat edge cases in `ZakatCalculator.tsx`: negative net wealth → display "No Zakat is due — your liabilities exceed your assets" (no negative Zakat shown); D1 data older than 24h → show "Rate as of [date] — may not reflect current market" warning; API fetch failure → show "Unable to fetch current gold/silver price — enter price manually" with manual PKR/gram input fallback
- [x] T034 [US4] Create Astro page `src/pages/tools/zakat-calculator.astro`: import ZakatCalculator with `client:load`; title "Zakat Calculator Pakistan 2026 — Calculate Your Zakat Online"; include compliance copy per COMP-102: "This calculator provides an estimate based on standard Islamic jurisprudence. Consult your scholar for your specific situation."; export `prerender = true`
- [ ] T035 [US4] Verify: Nisab (silver basis) calculation matches AAOIFI standard within ±0.5% of manual calculation; Gold Nisab toggle updates threshold correctly

**Checkpoint**: Zakat Calculator live at `/tools/zakat-calculator`; live Nisab from D1 gold/silver prices

---

## Phase 7: User Story 5 — Loan / EMI Calculator (P1)

**Goal**: Users can calculate monthly installment, total interest, and 12-month amortization for conventional and Islamic loans

**Independent Test**: Enter PKR 5M loan, 20% down, 20-year, 21% conventional → verify EMI matches standard financial calculator within ±1 PKR → switch to Islamic mode → verify profit-based calculation; enter lump-sum prepayment → verify reduced schedule

- [x] T036 [US5] Create React component `src/components/tools/LoanEmiCalculator.tsx`: inputs — loan purpose (home/car/personal/business), financing mode toggle (conventional/Islamic/Murabaha), principal amount, down payment %, annual rate/profit rate %, tenure (years); **Conventional mode**: `loanAmount = principal - downPayment; monthlyRate = annualRate/1200; EMI = loanAmount × monthlyRate × (1+monthlyRate)^n / ((1+monthlyRate)^n - 1)` where n = tenureMonths; **Islamic/Murabaha mode**: `totalProfit = loanAmount × (annualProfitRate/100) × tenureYears; monthlyInstallment = (loanAmount + totalProfit) / tenureMonths` (flat profit, no compounding); UI label changes: "Interest Rate" → "Profit Rate", "Total Interest" → "Total Profit", "EMI" → "Monthly Installment"; display: monthly installment, total profit/interest, total payable; generate 12-row amortization table (month, opening, installment, principal, profit/interest, closing) + totals row
- [x] T037 [US5] Add lump-sum prepayment simulation to `LoanEmiCalculator.tsx`: optional inputs — prepayment amount (PKR) and after which month; on provide: recompute remaining balance after prepayment month, recalculate EMI for remaining tenure (reduced principal) OR show reduced tenure with same EMI — user chooses; display "New EMI: PKR X" or "New Tenure: Y months"
- [x] T038 [US5] Create Astro page `src/pages/tools/loan-emi-calculator.astro`: import LoanEmiCalculator with `client:load`; title "Pakistan Loan EMI Calculator 2026 — Home, Car, Personal (Conventional & Islamic)"; include compliance copy per COMP-103; export `prerender = true`
- [ ] T039 [US5] Verify cross-check: EMI for PKR 4M (5M - 20% down), 20yr, 21% = verify against known financial calculator result; Islamic Murabaha mode result differs meaningfully from conventional; amortization month 1 + month 12 + total row sums correctly

**Checkpoint**: Loan/EMI Calculator live at `/tools/loan-emi-calculator`; both financing modes work; amortization schedule renders

---

## Phase 8: User Story 6 — Currency Converter (P1)

**Goal**: Users convert between PKR and 10 currencies using live D1 rates with 30-day trend chart

**Independent Test**: Load Currency Converter → verify rates are populated from `/api/exchange-rates` → convert PKR 50,000 to USD → result uses today's SBP rate → swap currencies → result inverts → select EUR → 30-day sparkline chart renders

- [x] T040 [US6] Create React component `src/components/tools/CurrencyConverter.tsx`: on mount fetch `/api/exchange-rates` (all currencies) and `/api/exchange-rates/history?currency=USD`; state: fromCurrency (default PKR), toCurrency (default USD), amount; supported currencies: PKR + USD/EUR/GBP/AED/SAR/CAD/AUD/CNY/JPY/RON; on amount or currency change: compute converted amount = amount × rate (or 1/rate if PKR is target); show rate freshness timestamp; swap button to invert from/to
- [x] T041 [US6] Add 30-day sparkline trend chart to `CurrencyConverter.tsx`: on currency pair change, fetch `/api/exchange-rates/history?currency={selected}` and render a minimal SVG line chart (no charting library — pure SVG path) showing PKR movement over 30 days; label chart "30-day PKR/{currency} trend (SBP interbank)"; if less than 7 data points available, show "Insufficient history data" instead of chart
- [x] T042 [US6] Create Astro page `src/pages/tools/currency-converter.astro`: import CurrencyConverter with `client:load`; title "Live PKR Currency Converter — SBP Interbank Rates 2026"; note below converter: "Rates shown are SBP interbank rates. Actual remittance/exchange rates vary by provider."; export `prerender = true`
- [ ] T043 [US6] Verify: converter loads live rates; PKR→USD and USD→PKR are reciprocal; RON (Romanian Leu) appears for diaspora audience; stale=true flag shown if today's data unavailable

**Checkpoint**: Currency Converter live at `/tools/currency-converter`; live rates + 30-day chart from D1

---

## Phase 9: User Story 7 — Salary Slip Generator (P1)

**Goal**: Users generate professional A4 PDF salary slips entirely in-browser with pdf-lib; templates saved to localStorage

**Independent Test**: Fill in company name, employee name, basic PKR 80,000, house rent 40%, generate PDF → download without any network request in browser network tab → reopen page → template pre-fills from localStorage

- [x] T044 [US7] Create React component `src/components/tools/SalarySlipGenerator.tsx`: state — companyName, employeeName, designation, department, month/year, earnings array [{label, amount}] (pre-seeded: Basic Salary, House Rent Allowance 40%, Medical Allowance, Conveyance), deductions array [{label, amount}] (pre-seeded: EOBI PKR 370, Income Tax Advance); compute grossSalary = sum(earnings), totalDeductions = sum(deductions), netSalary = gross - deductions; "Add Earning" and "Add Deduction" buttons for custom rows
- [x] T045 [US7] Auto-calculate income tax advance in `SalarySlipGenerator.tsx`: when Basic Salary changes, compute annual income = grossSalary × 12, apply FBR 2026 slabs from `src/lib/utils/tax-slabs.ts`, divide annual tax by 12, pre-fill "Income Tax Advance" deduction field (user can override); import tax-slabs utility (already exists from v1.0) — NOTE: use TypeScript constants only; do NOT query the D1 `tax_slabs` table (retained from migration 001 but unused in v2.0)
- [x] T046 [US7] Implement PDF generation in `SalarySlipGenerator.tsx` using `pdf-lib` (already installed): on "Generate PDF" click — create PDFDocument, draw A4 page, add company header, "SALARY SLIP — {month} {year}" title, employee details table, earnings section with subtotals, deductions section with subtotals, gross/net salary, authorized signatory lines; base64-encode and trigger download as `salary-slip-{month}-{year}.pdf` — zero network requests (all client-side)
- [x] T047 [US7] Add localStorage template persistence to `SalarySlipGenerator.tsx`: on "Save Template" click — serialize companyName/designation/department/earnings/deductions structure to `localStorage.setItem('salarySlipTemplate', JSON.stringify(data))`; on component mount — `localStorage.getItem('salarySlipTemplate')` and pre-fill fields if exists; show "Template saved" toast confirmation
- [x] T048 [US7] Create Astro page `src/pages/tools/salary-slip-generator.astro`: import SalarySlipGenerator with `client:load`; title "Free Salary Slip Generator Pakistan 2026 — Download PDF"; export `prerender = true`; verify zero network requests on PDF generation via browser DevTools Network tab

**Checkpoint**: Salary Slip Generator live at `/tools/salary-slip-generator`; PDF downloads client-side; template persists across sessions

---

## Phase 10: User Story 13 — Groq/LLaMA 3.3 in Analyst Agent (P1)

**Goal**: Analyst Agent generates unique, professional economic analysis via Groq LLaMA 3.3 instead of string templates

**Independent Test**: Trigger agent run → check D1 `market_insights.content` → verify word count > 250, contains at least one numeric figure from scraped data, `generated_by = 'groq:llama-3.3-70b-versatile'`, no "[INSERT" placeholder text

- [x] T049 [US13] Rewrite `src/lib/agents/analyst.ts` LLM call: replace string template content generation with `fetch('https://api.groq.com/openai/v1/chat/completions', { method:'POST', headers: {Authorization: 'Bearer {GROQ_API_KEY}', 'Content-Type':'application/json'}, body: JSON.stringify({model:'llama-3.3-70b-versatile', messages:[{role:'system', content: ANALYST_SYSTEM_PROMPT}, {role:'user', content: buildDataPrompt(scrapedData)}], max_completion_tokens:1024}) })` — extract `choices[0].message.content` as the insight body; set `generated_by = 'groq:llama-3.3-70b-versatile'`
- [x] T050 [US13] Define `ANALYST_SYSTEM_PROMPT` constant in `analyst.ts`: "You are a professional economic analyst with an M.Phil in Economics. You write data-driven analysis about Pakistan's economy for a general-educated Pakistani audience. Your analysis is professional, cites the specific numbers provided, references 2026 Pakistan context (IMF program, Digital Nation Act, CPEC developments), and is between 280-400 words. Never use placeholder text. Never make up data not provided to you."
- [x] T051 [US13] Add OpenAI fallback in `analyst.ts`: if Groq fetch throws or returns non-200, immediately call `fetch('https://api.openai.com/v1/chat/completions', {...gpt-4o-mini...})`; set `generated_by = 'openai:gpt-4o-mini'`; log to D1 `agent_logs` (message=`GROQ_FALLBACK: used OpenAI for insight ${workflowId}`)
- [x] T052 [US13] Add content validation in `analyst.ts` after LLM response: check `content.split(' ').length > 250` (word count); check `content.includes` at least one digit from the scraped data indicators; check `!content.includes('[INSERT')` and `!content.includes('{{')` (no placeholders); if validation fails — log warning to `agent_logs` and attempt one retry with same prompt; if second attempt also fails — mark insight as `published=false` and skip publisher stage for this insight
- [x] T053 [US13] Verify: trigger agent → inspect D1 `market_insights` → confirm `generated_by` populated, `content` word count > 250, content contains actual PKR figures from exchange rates or commodity prices

**Checkpoint**: Analyst generates genuinely unique AI content; no more template text in published insights

---

## Phase 11: User Story 14 — Agent D Social Publisher / Telegram (P1)

**Goal**: After each Agent C commit, a Telegram message is sent to the channel within 5 minutes

**Independent Test**: Trigger agent → verify Telegram channel receives formatted message containing insight title + key numbers + link → verify D1 `market_insights.telegram_message_id` is populated

- [x] T054 [US14] Create `src/lib/agents/social.ts`: export `postToTelegram(insight: MarketInsight, env: Env): Promise<string | null>` function; construct message: `"📊 *{title}*\n\n{summary}\n\n🔗 [Read full analysis](https://pakecon.ai/insights/{slug})\n\n_Source: {source}_"`; POST to `https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage` with `{chat_id: TELEGRAM_CHANNEL_ID, text: message, parse_mode: 'Markdown'}`; return Telegram message_id on success, null on failure
- [x] T055 [US14] Add retry logic in `social.ts`: if Telegram returns HTTP 429 → read `Retry-After` header → store retry job in KV: `KV.put('telegram_retry_{insightId}', JSON.stringify({insight, retryAt: Date.now() + retryAfterMs}), {expirationTtl: 7200})`; return null (non-blocking); on next cron run, check KV for pending retries and attempt before running new workflow
- [x] T056 [US14] Add `TWITTER_ENABLED` guard in `social.ts`: if `env.TWITTER_ENABLED === 'true'` → log "Twitter posting deferred — Phase 8" to `agent_logs` and skip (Twitter OAuth deferred per plan); if `env.TELEGRAM_ENABLED !== 'true'` → skip Telegram and log "Telegram disabled"
- [x] T057 [US14] Update `src/lib/agents/workflow.ts`: add `social` stage after `publisher` stage; call `postToTelegram(insight, env)` for each published insight; update D1 `market_insights` row: `UPDATE market_insights SET telegram_message_id = ? WHERE id = ?`; log stage completion to `agent_logs`
- [ ] T058 [US14] Verify: full agent run → Telegram channel receives message with correct formatting → D1 `market_insights` row has `telegram_message_id` populated; test retry: temporarily use invalid token → verify KV retry entry created → restore token → verify retry succeeds on next cron

**Checkpoint**: Social distribution live — every published insight auto-posts to Telegram

---

## Phase 12: User Story 15 — Weekly Economic Digest (P1)

**Goal**: Every Monday the existing 6-hour cron auto-generates a weekly digest summarizing the past 7 days

**Independent Test**: Set system date to Monday → trigger cron → verify D1 gains a new insight with `category='weekly_digest'` → verify MDX committed to GitHub at `src/content/insights/weekly-digest-YYYY-MM-DD.mdx` → load page in browser

- [x] T059 [US15] Create `src/lib/agents/digest.ts`: export `generateWeeklyDigest(env: Env): Promise<MarketInsight>` — query D1 for all `exchange_rates` and `commodity_prices` from past 7 days; find top mover (commodity/currency with highest % change week-over-week); build data prompt with week summary table; call Groq (same pattern as analyst.ts) with digest-specific system prompt: "Write a weekly economic digest for Pakistan. Include a brief intro, highlight the biggest market mover, provide a comparison table, and close with outlook. 300-400 words."; return insight object with `category='weekly_digest'`, `delta=0`
- [x] T060 [US15] Update `functions/scheduled/cron.ts`: after main workflow completes, check if current UTC time is Monday (day=1) AND hour is between 3 and 9 (UTC = 08:00–14:00 PKT); if yes AND no weekly_digest exists in D1 for current week (check `SELECT COUNT(*) FROM market_insights WHERE category='weekly_digest' AND date(created_at) >= date('now', '-7 days')`) → call `generateWeeklyDigest()` → pass result through Publisher Agent flow → log to `agent_logs` (stage=digest)
- [x] T061 [US15] Create weekly digest MDX route: ensure `src/pages/insights/[slug].astro` (from T012) handles weekly digest slugs (slug format: `weekly-digest-YYYY-MM-DD`) — same rendering, same schema; no additional page needed
- [ ] T062 [US15] Verify: simulate Monday cron (manually call digest function with test date) → D1 gains `category='weekly_digest'` insight → GitHub gets `weekly-digest-{date}.mdx` → page renders at `/insights/weekly-digest-{date}`

**Checkpoint**: Weekly digest publishes every Monday; no manual intervention required

---

## Phase 13: User Story 16 — PWA Support (P2)

**Goal**: Site installable as PWA on Android Chrome; tool pages work offline

**Independent Test**: Visit site on Android Chrome → "Add to Home Screen" prompt appears → install → launch from home screen → opens standalone (no browser chrome) → go offline → open Tax Calculator → still renders (cached)

- [x] T063 [US16] Configure `@vite-pwa/astro` in `astro.config.mjs`: add `AstroPWA({registerType:'autoUpdate', manifest:{name:'PakEcon.ai', short_name:'PakEcon', description:'Pakistan Finance Tools & Economic Analysis', theme_color:'#16a34a', background_color:'#ffffff', display:'standalone', start_url:'/', icons:[{src:'/pwa-192x192.png', sizes:'192x192', type:'image/png'}, {src:'/pwa-512x512.png', sizes:'512x512', type:'image/png'}]}, workbox:{navigateFallback:'/', globPatterns:['**/*.{css,js,html,svg,png}'], runtimeCaching:[{urlPattern:/^https:\/\/pakecon\.ai\/api\//, handler:'NetworkFirst', options:{cacheName:'api-cache', expiration:{maxEntries:50, maxAgeSeconds:300}}}]}})` to integrations array
- [x] T064 [US16] Add PWA service worker registration to `src/layouts/MainLayout.astro`: add `<script>import { registerSW } from 'virtual:pwa-register'; const updateSW = registerSW({onNeedRefresh() { /* show refresh banner */ }, onOfflineReady() { console.log('PakEcon.ai ready for offline use'); }});</script>`
- [x] T065 [US16] Add "offline" banner component: when service worker fires `onOfflineReady`, show a dismissable banner at top of page: "You're offline — financial data may not be current. Calculators work normally."; implement as simple Astro component injected in MainLayout
- [ ] T066 [US16] Verify: `npm run build` succeeds with PWA plugin; `public/manifest.json` generated; service worker `sw.js` present in `dist/`; Chrome mobile "Add to Home Screen" prompt appears after 30s on site; offline mode shows tool pages from cache

**Checkpoint**: PWA installed on mobile; tool pages cached for offline use

---

## Phase 14: User Story 17 — Cloudflare Web Analytics (P2)

**Goal**: Privacy-respecting analytics tracking pageviews and tool usage without cookies

**Independent Test**: View any page → check Cloudflare Dashboard → pageview recorded; use Tax Calculator → check for `tool_used` custom event in analytics

- [x] T067 [US17] Add Cloudflare Web Analytics beacon to `src/layouts/MainLayout.astro`: `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "{CF_ANALYTICS_TOKEN}"}'></script>` — use Cloudflare Dashboard to generate token; store token as `CF_ANALYTICS_TOKEN` in `wrangler.toml` [vars] (not sensitive — public token)
- [x] T068 [US17] Add `tool_used` custom event to all calculator components: in each tool's calculate handler, after result computed, call `window.zaraz?.track('tool_used', {tool_name: 'electricity-bill-calculator'})` OR fall back to `fetch('https://cloudflareinsights.com/cdn-cgi/rum', ...)` beacon custom event — document pattern in a shared `src/lib/utils/analytics.ts` utility: `export const trackToolUse = (toolName: string) => { if (typeof window !== 'undefined' && window.zaraz) window.zaraz.track('tool_used', {tool: toolName}); }`
- [x] T069 [US17] Add `trackToolUse` calls to all 7 existing and new calculator components: TaxCalculator, ElectricityBillCalculator, ZakatCalculator, LoanEmiCalculator, CurrencyConverter, SalarySlipGenerator, MandiTable filter change — each passes its own `toolName` string

**Checkpoint**: Analytics collecting; Cloudflare Dashboard shows pageviews and tool_used events

---

## Phase 15: User Story 18 — Pagefind Search (P2)

**Goal**: Client-side search across all guides, tools, and insights with results in < 300ms

**Independent Test**: `npm run build` → `npm run preview` → click search icon → type "electricity" → Electricity Bill Calculator appears as first result within 300ms → click result → navigates to correct page

- [x] T070 [US18] Ensure all tool pages and insight pages have `export const prerender = true` — add to any pages missing it (all pages in `src/pages/tools/` and `src/pages/insights/[slug].astro`); this is required for Pagefind to index them at build time
- [x] T071 [US18] Create `src/components/Search.astro`: search icon button in nav that opens a modal overlay; overlay contains text input with placeholder "Search PakEcon.ai..."; on input (debounced 200ms): `const pagefind = await import('/pagefind/pagefind.js'); const results = await pagefind.search(query); display results as list of {title, url, excerpt}` links; close on Escape or click-outside; style with Tailwind (white overlay, dark backdrop)
- [x] T072 [US18] Add Search component to `src/layouts/MainLayout.astro` navigation bar: place search icon (magnifying glass SVG) in nav right side, before any existing nav links; import `<Search />` component; verify `npm run build && npm run preview` → search returns correct results for "zakat", "electricity", "loan", "currency" queries

**Checkpoint**: Search works in built preview; all tool and insight pages indexed; results appear within 300ms

---

## Phase 16: User Story 8 — Gold Investment Calculator (P2)

**Goal**: Users can model gold investment returns in PKR across configurable price scenarios

**Independent Test**: Load page → current gold price fetched from `/api/gold-price` → enter 5 tolas → verify PKR value = 5 × gold_per_tola → verify +10% scenario = PKR value × 1.10

- [x] T073 [US8] Create React component `src/components/tools/GoldInvestmentCalculator.tsx`: on mount fetch `/api/gold-price`; inputs — quantity (number), unit toggle (tolas/grams); on calculate: currentValue = quantity × pricePerUnit; show scenario table: -20%, -10%, current, +10%, +20%, +50% price changes with PKR value for each; also show "If you invested PKR X to buy this gold" with simple ROI display; cite "Source: PMEX/Business Recorder via PakEcon.ai" below
- [x] T074 [US8] Create Astro page `src/pages/tools/gold-investment-calculator.astro` with `client:load`, descriptive title, E-E-A-T disclaimer, `prerender = true`

**Checkpoint**: Gold Investment Calculator live at `/tools/gold-investment-calculator`

---

## Phase 17: User Story 9 — Inflation Impact Calculator (P2)

**Goal**: Users understand how Pakistani inflation has eroded purchasing power over time using real CPI data

**Independent Test**: Enter PKR 100,000, base year 2019 → result uses D1 CPI history → inflation-adjusted 2026 equivalent > 100,000 → bar chart shows yearly CPI changes

- [x] T075 [US9] Create React component `src/components/tools/InflationCalculator.tsx`: on mount fetch `/api/commodities?commodity=cpi` (or derive CPI from D1 historical data); inputs — base amount PKR, base year (2015–2025 select), target year (default current year); compute adjusted amount = baseAmount × (targetCPI / baseCPI); show inflation-adjusted value; render SVG bar chart of year-by-year CPI % change using D1 historical data; if insufficient D1 CPI history, show PBS SPI as proxy with note
- [x] T076 [US9] Create Astro page `src/pages/tools/inflation-calculator.astro` with `client:load`, title "Pakistan Inflation Impact Calculator — Purchasing Power 2015–2026", E-E-A-T disclaimer, source attribution to PBS, `prerender = true`

**Checkpoint**: Inflation Calculator live at `/tools/inflation-calculator`

---

## Phase 18: User Story 10 — EOBI / Provident Fund Calculator (P2)

**Goal**: Employees can estimate EOBI pension and PF accumulation at retirement

**Independent Test**: Enter age 35, salary PKR 50,000, 10 years service → EOBI pension shown (current flat PKR 10,000/month + service component) → PF balance at 60 shown with compound growth

- [x] T077 [US10] Create React component `src/components/tools/EobiCalculator.tsx`: inputs — current age (18–59), current monthly salary, years of service, PF contribution % (default 5%), assumed PF growth rate % (default 7%); compute EOBI pension: PKR 10,000 base (current 2026 rate) note; compute PF: monthly contribution = salary × rate/100, compound for (60 - age) years at growth rate; display retirement age (60), estimated EOBI monthly pension, PF corpus at 60; add disclaimer: "Based on current EOBI rates effective 2026. Subject to change by EOBI Board."
- [x] T078 [US10] Create Astro page `src/pages/tools/eobi-calculator.astro` with `client:load`, title "Pakistan EOBI Pension & Provident Fund Calculator 2026", disclaimer, `prerender = true`

**Checkpoint**: EOBI Calculator live at `/tools/eobi-calculator`

---

## Phase 19: User Story 11 — Property Stamp Duty Calculator (P2)

**Goal**: Property buyers can calculate total transaction tax cost by province and filer status

**Independent Test**: Enter PKR 10M property, Punjab, filer toggle ON → verify stamp duty 3%, CVT 1% (filer), registration 1% → total = correct sum → toggle filer OFF → CVT changes to 2%

- [x] T079 [US11] Create `src/lib/data/property-stamp-duty.ts`: export `PROVINCE_STAMP_DUTY` constant for Punjab (stampDuty:0.03, cvtFiler:0.01, cvtNonFiler:0.02, registrationFee:0.01), Sindh (stampDuty:0.02, cvtFiler:0.01, cvtNonFiler:0.02, registrationFee:0.005), KPK, Balochistan, ICT with their respective publicly available rates; include `LAST_VERIFIED_DATE`
- [x] T080 [US11] Create React component `src/components/tools/PropertyStampDuty.tsx`: inputs — property value PKR, province selector (5 options), "I am an Active Tax Filer (FBR)" self-declared toggle; compute: stampDuty = value × stampDutyRate, cvt = value × (filer ? cvtFiler : cvtNonFiler), regFee = value × registrationFee, total = stampDuty + cvt + regFee; display breakdown table + total; show filer disclaimer per COMP-104; show "Last verified: {LAST_VERIFIED_DATE}" badge
- [x] T081 [US11] Create Astro page `src/pages/tools/property-stamp-duty-calculator.astro` with `client:load`, title "Pakistan Property Stamp Duty Calculator 2026 — By Province", compliance copy, `prerender = true`

**Checkpoint**: Property Stamp Duty Calculator live at `/tools/property-stamp-duty-calculator`

---

## Phase 20: User Story 12 — Remittance Calculator (P2)

**Goal**: Pakistani diaspora can calculate how much PKR their recipient receives in real time

**Independent Test**: Enter GBP 500 → verify PKR equivalent uses live GBP/PKR from `/api/exchange-rates` → enter EUR 200 (RON diaspora) → converts correctly; disclaimer about actual rates shown

- [x] T082 [US12] Create React component `src/components/tools/RemittanceCalculator.tsx`: on mount fetch `/api/exchange-rates`; inputs — send amount, send currency selector (GBP/EUR/USD/AED/SAR/CAD/AUD/RON); compute PKR received = amount × pkrRate; display "Your recipient receives: PKR {amount}"; show rate source and date; add note: "Rates shown are SBP interbank rates. Actual remittance rates vary by provider — compare with your bank or remittance service."
- [x] T083 [US12] Create Astro page `src/pages/tools/remittance-calculator.astro` with `client:load`, title "Pakistan Remittance Calculator — Send Money to Pakistan (Live Rates)", `prerender = true`; add RON description "For Pakistani community in Romania & Europe"

**Checkpoint**: Remittance Calculator live at `/tools/remittance-calculator`; RON currency supported for EU diaspora

---

## Phase 21: User Story 19 — Email Newsletter (P3)

**Goal**: Users subscribe to weekly digest emails via Cloudflare Email Workers

**Independent Test**: Submit email → receive confirmation email → click link → `confirmed=true` in D1 → next Monday digest auto-sends to confirmed subscribers → unsubscribe link works

- [x] T084 [US19] Create Cloudflare Function `functions/api/newsletter/subscribe.ts`: validate email format (regex); UPSERT into D1 `newsletter_subscribers` (email, confirmed=false, confirmation_token = HMAC-SHA256 hex of `email:NEWSLETTER_SECRET`); if email already confirmed → return `{message:"You are already subscribed."}`; call Cloudflare Email Workers `send_email` binding to send confirmation email with link `https://pakecon.ai/api/newsletter/confirm?token={token}&email={encoded_email}`; return 200 per contracts/api-contracts.md
- [x] T085 [US19] Create Cloudflare Function `functions/api/newsletter/confirm.ts`: read `?token` and `?email` query params; compute expected token = HMAC-SHA256 of `email:NEWSLETTER_SECRET`; if tokens match → UPDATE D1 `confirmed=true` → redirect 302 to `/?subscribed=true`; if mismatch → redirect to `/?error=invalid_token`; idempotent: double-confirm → redirect `/?subscribed=already`
- [x] T086 [US19] Create Cloudflare Function `functions/api/newsletter/unsubscribe.ts`: validate token same way; if valid → UPDATE `unsubscribed_at=CURRENT_TIMESTAMP` → redirect to `/?unsubscribed=true`
- [x] T087 [US19] Add newsletter signup form to homepage `src/pages/index.astro` and `src/layouts/MainLayout.astro` footer: simple email input + "Subscribe to Weekly Digest" button; on submit — POST to `/api/newsletter/subscribe` via fetch; show "Confirmation email sent!" on 200 response; validate email client-side before submitting
- [x] T088 [US19] Configure Cloudflare Email Workers `send_email` binding in `wrangler.toml`: add `[[send_email]] name = "SEND_EMAIL"` binding; verify sending domain `pakecon.ai` is configured in Cloudflare Email DNS settings
- [x] T089 [US19] Add newsletter digest send to Weekly Digest cron in `functions/scheduled/cron.ts`: after digest MDX is published (Phase 12), query D1 for all `confirmed=true AND unsubscribed_at IS NULL` subscribers; for each: send email via `env.SEND_EMAIL` with digest title, summary, and "Read more" link; log send count to `agent_logs`

**Checkpoint**: Full newsletter flow working end-to-end; confirmed subscribers receive Monday digest emails

---

## Phase 22: Polish & Cross-Cutting Concerns

**Purpose**: Final wiring, SEO verification, and performance validation

- [ ] T090 [P] Verify sitemap includes all 10+ new tool pages and insight pages: run `npm run build` → check `dist/sitemap-index.xml` → confirm all `/tools/*` and `/insights/*` URLs present
- [x] T091 [P] Update homepage `src/pages/index.astro`: add "Featured Tools" section showcasing Electricity Calculator, Zakat Calculator, Currency Converter, and Loan Calculator with links; update tools listing to include all 10 new tools
- [x] T092 [P] Add Schema.org JSON-LD to each new tool page: use WebPage schema with `name`, `description`, `url`, `author` (M.Phil Economics credentials); import existing `SchemaOrg.astro` component or add inline JSON-LD in each tool page `<head>`
- [x] T093 Update `src/pages/about.astro`: add "Tools Built" section listing all 10 new tools with brief descriptions; update "About PakEcon.ai" content to reflect the expanded tool suite and AI-powered content automation
- [x] T094 [P] Run `npx tsc --noEmit` — fix any TypeScript errors introduced during implementation; ensure strict mode violations are zero
- [ ] T095 [P] Run Lighthouse CI on all new tool pages (Electricity, Zakat, Loan, Currency, Salary): confirm score ≥ 90 on mobile; fix any FCP > 1.8s issues by deferring non-critical scripts or using `client:idle` instead of `client:load` for below-fold tools
- [x] T096 Update `README.md` with new tool list, updated setup steps (new secrets), and architecture diagram reference
- [ ] T097 Final integration test: trigger full agent workflow → verify scraper → analyst (Groq LLM content) → publisher (GitHub commit) → social (Telegram) → all stages log `completed` in D1 `agent_logs` → page live on pakecon.ai within 5 minutes of cron trigger

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phases 3–4 (P0 Blockers)**: Must complete before content automation works; blocks AdSense approval
- **Phases 5–9 (Tier 1 Tools)**: Depend on Phase 2 foundational only; can be built **in parallel** with Phases 10–12
- **Phases 10–12 (Agent enhancements)**: Depend on Phase 2; can be built in parallel with Phases 5–9
- **Phases 13–15 (Technical)**: Depend on Phase 2; largely independent
- **Phases 16–20 (Tier 2 Tools)**: Depend on Phase 2 + `/api/gold-price` (T009) for Gold & Zakat tools
- **Phase 21 (Newsletter)**: Depends on Phase 2 + Phase 12 (weekly digest) for email content
- **Phase 22 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 + US2 (P0)**: Critical path — must complete first; everything else depends on live data + publishing
- **US3–US7 (Tier 1 Tools)**: Independent of each other; all depend only on Phase 2
- **US13 (Groq LLM)**: Independent; enhance US1's output quality
- **US14 (Agent D Telegram)**: Depends on US1 (Publisher) being fixed
- **US15 (Weekly Digest)**: Depends on US13 (LLM) + US1 (Publisher)
- **US16–US18 (PWA/Analytics/Search)**: Fully independent of all other stories
- **US8–US12 (Tier 2 Tools)**: Independent of each other; US8 + US4 share `/api/gold-price` endpoint (T009)
- **US19 (Newsletter)**: Depends on US15 (Weekly Digest) for content

### Parallel Opportunities

```bash
# After Phase 2 completes, these can run simultaneously:

Stream A (Agent fixes):   T014→T019 (US1) → T049→T053 (US13) → T054→T058 (US14) → T059→T062 (US15)
Stream B (Tier 1 Tools):  T028→T031 (US3) | T032→T035 (US4) | T036→T039 (US5) | T040→T043 (US6) | T044→T048 (US7)
Stream C (Technical):     T063→T066 (US16) | T067→T069 (US17) | T070→T072 (US18)
Stream D (Scrapers):      T020→T027 (US2) — run parallel to Stream A
```

---

## Implementation Strategy

### MVP (AdSense Approval Focus — Days 1–6)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T013)
3. Complete Phase 3: Publisher Agent fix (T014–T019) ← MOST CRITICAL
4. Complete Phase 4: Real Scrapers (T020–T027)
5. Complete Phase 10: Groq LLM (T049–T053)
6. **VALIDATE**: Agent run produces real content at `/insights/[slug]` with real data
7. Deploy → agent runs 4×/day → 30 pages in ~7 days → **Apply for AdSense**

### Full Platform (Days 7–23)

8. Phase 12: Weekly Digest (T059–T062) — content velocity boost
9. Phase 11: Telegram (T054–T058) — distribution
10. Phases 5–9: Tier 1 Tools in parallel (T028–T048) — traffic magnets
11. Phases 13–15: PWA + Analytics + Search (T063–T072) — retention
12. Phases 16–20: Tier 2 Tools (T073–T083) — depth
13. Phase 21: Newsletter (T084–T089) — audience ownership
14. Phase 22: Polish (T090–T097)

---

## Notes

- **[P]** tasks = different files, no dependencies on incomplete tasks — safe to parallelize
- **[USx]** label maps task to user story for traceability and independent testing
- Commit after each task or logical group (T014–T019 as one commit, each tool as one commit)
- Validate each user story independently before moving to next priority level
- **Twitter OAuth (Phase 8)**: Deferred — implement after AdSense approval and platform stability
- Total tasks: **97** across 22 phases

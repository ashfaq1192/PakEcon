# Research: PakEcon.ai Platform Enhancement

**Feature**: 002-platform-enhancement | **Date**: 2026-03-17 | **Status**: Complete

---

## 1. GitHub Contents API — Publisher Agent Real Commits

**Decision**: Raw `fetch()` against GitHub REST API v2024-01-01 with Fine-Grained PAT.

**Rationale**: Cloudflare Workers have no Node.js runtime — the Octokit SDK cannot be used. Native `fetch()` + `btoa()` (globally available in Workers) handles the entire workflow.

**Key Findings**:
- Endpoint: `PUT /repos/{owner}/{repo}/contents/{path}`
- Auth header: `Authorization: Bearer {GITHUB_TOKEN}`
- `content` field must be base64-encoded via `btoa()`
- `sha` field required only when updating an existing file (omit for create)
- Rate limit: **5,000 requests/hour** for authenticated PAT — far exceeds our needs
- Pull Request creation: `POST /repos/{owner}/{repo}/pulls` — same auth, same fetch pattern
- Auto-deploy: Cloudflare Pages detects commits to the connected branch and rebuilds automatically — no webhook call needed

**Alternatives Considered**: Octokit SDK — rejected (Node.js dependencies, incompatible with Workers edge runtime).

---

## 2. LLM Integration — Groq + LLaMA 3.3

**Decision**: Groq API via raw fetch. Model: `llama-3.3-70b-versatile`.

**Rationale**: `groq-sdk` npm package has Node.js dependencies incompatible with edge runtime. Raw fetch to `https://api.groq.com/openai/v1/chat/completions` is the correct pattern.

**⚠️ Model ID Correction**: Spec referenced `llama3-70b-8192` — this model is **deprecated** as of 2025. The correct current model is **`llama-3.3-70b-versatile`**. Spec will be updated.

**Key Findings**:
- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`
- Free tier: **500,000 tokens/day**, ~10–15 RPM for the 70B model
- At ~800 tokens per insight generation: ~625 free insights/day — sufficient for 6-hour cycle (4/day)
- OpenAI fallback: `POST https://api.openai.com/v1/chat/completions` with `gpt-4o-mini` — identical fetch pattern

**Alternatives Considered**: LangChain — rejected (heavy dependency, not edge-compatible). Direct model hosting — rejected (violates zero-cost principle).

---

## 3. Astro Content Collections for Insight Pages

**Decision**: Astro Content Collections with Zod schema in `src/content/config.ts`. Dynamic routes with `prerender = true`.

**Rationale**: Type-safe schema validation at build time prevents malformed MDX from being published. GitHub API commits to `src/content/insights/` auto-trigger Cloudflare Pages rebuild — no additional webhook needed.

**Key Findings**:
- Config file: `src/content/config.ts` exports `collections` using `defineCollection()` + Zod schema
- MDX files go in: `src/content/insights/*.mdx`
- Dynamic route: `src/pages/insights/[slug].astro` with `export const prerender = true` and `getStaticPaths()`
- Cloudflare Pages rebuild: triggered automatically on push to connected branch (~1–3 minutes build time)
- Insight page URL pattern: `/insights/YYYY-MM-DD-slug`

**MDX Frontmatter Schema** (from clarification Q1):
```typescript
const insights = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/insights" }),
  schema: z.object({
    title: z.string().max(70),
    pubDate: z.coerce.date(),
    summary: z.string(),
    category: z.enum(['market_insight', 'weekly_digest', 'budget_alert', 'policy_update']),
    source: z.string().url(),
    delta: z.number(),
  }),
});
```

---

## 4. Data Source Scraping Strategy

**Decision**: HTML scraping with robust fallback to D1 cached data. No official APIs exist for any Pakistani government source.

**Rationale**: SBP, PBS, OGRA, and PMEX all publish data as HTML pages or PDF reports — no machine-readable APIs are publicly documented. This is a known constraint of the Pakistani government data ecosystem.

### SBP Exchange Rates
- **Source**: `sbp.org.pk/ecodata/` — exchange rate PDFs and HTML rate tables
- **Format**: HTML tables on EasyData portal; PDF annexures for historical
- **Strategy**: Fetch SBP's exchange rate page, parse HTML table for PKR vs USD/EUR/GBP/AED/SAR/CNY
- **Fallback**: D1 most recent record if fetch fails or times out (15s)
- **Frequency**: Business days only — skip weekends in scraper logic

### PBS Weekly SPI
- **Source**: `pbs.gov.pk/weekly-sensitive-price-indicator-spi-for-the-week-ended-on-DD-MM-YYYY/`
- **Format**: HTML blog post with embedded price table; Excel annexure download
- **Strategy**: Fetch latest SPI report URL (parse PBS homepage for most recent SPI link), scrape commodity rows
- **Frequency**: Weekly (Tuesday/Wednesday) — scraper checks day-of-week; skips Monday to avoid incomplete data
- **Coverage**: 51 commodities; store the 15 most relevant (wheat flour, rice, sugar, eggs, chicken, tomato, onion, potato, lentils, petrol, diesel, cooking oil, milk, salt, tea)

### OGRA/PSO Petrol Prices
- **Source**: `ogra.org.pk/notified-petroleum-prices` (OGRA official announcement page)
- **Format**: HTML notification table
- **Strategy**: Fetch OGRA page, parse latest notification (most recent row) for Petrol/HSD/SKO/LDO prices
- **Frequency**: Fortnightly (1st and 15th of month) — check D1 last update date; skip if same period already stored
- **Current rates** (2026-03-16): Petrol Rs. 321.17/L, Diesel Rs. 335.86/L, Kerosene Rs. 358.01/L

### Gold/Silver Prices
- **Primary**: `brecorder.com/gold-prices-in-pakistan-today` — HTML page with 24K/22K/21K per tola + per gram
- **Fallback**: `goldpricez.com` with `?currency=PKR&unit=tola` — alternative HTML source
- **Unit Standard**: 1 tola = 11.6638 grams (international standard); store both tola and gram values in D1
- **Frequency**: Daily (once per day — early morning cron cycle)
- **Current rate** (2026-03-16): 24K gold ~Rs. 543,262/tola

---

## 5. Twitter/X Social Posting

**Decision**: Implement Twitter OAuth 1.0a in Cloudflare Worker using SubtleCrypto for HMAC-SHA1 signature. Pre-authorize once manually; store long-lived tokens as Worker secrets.

**⚠️ Architectural Complexity**: Twitter requires OAuth 1.0a for posting tweets — not a simple Bearer token. This requires:
1. One-time manual 3-legged OAuth authorization flow (outside the Worker)
2. Storing 4 secrets: API Key, API Secret, Access Token, Access Secret
3. Per-request HMAC-SHA1 signature generation using SubtleCrypto (available in Workers)

**Rationale**: OAuth 1.0a is Twitter's only supported auth method for write operations (posting). Bearer tokens are read-only. SubtleCrypto's `crypto.subtle.sign()` with HMAC-SHA1 replaces the `crypto` Node.js module.

**Key Findings**:
- Endpoint: `POST https://api.twitter.com/2/tweets` with JSON body `{"text": "..."}`
- Auth: OAuth 1.0a User Context (4 tokens required)
- Free tier: 1,500 tweets/month — sufficient (at 6-hour cycles = 4/day × 30 = 120/month)
- Required secrets: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`

**Alternatives Considered**: Zapier/Make automation — rejected (adds third-party dependency, potential cost). Twitter API Basic ($200/month) — rejected (violates zero-cost principle). Skip Twitter entirely — considered as fallback if OAuth complexity blocks timeline.

---

## 6. Telegram Bot API

**Decision**: Direct `fetch()` to Telegram Bot API — fully compatible with Cloudflare Workers.

**Rationale**: Telegram Bot API is a straightforward REST service with no SDK dependency. Works from any HTTP client including Cloudflare Workers.

**Key Findings**:
- Endpoint: `POST https://api.telegram.org/bot{TOKEN}/sendMessage`
- Fields: `chat_id` (use `@channelname` or `-100{numeric_id}`), `text`, `parse_mode: "Markdown"`
- Rate limits: 30 messages/second global, 1 message/second per chat — no concern for our use case
- HTTP 429 handling: Read `Retry-After` header, store retry in KV with timestamp
- No authentication complexity — just the bot token as URL path parameter

---

## 7. PWA Integration

**Decision**: `@vite-pwa/astro` plugin with Workbox. Cache-first for tool pages, network-first for content.

**Rationale**: `@vite-pwa/astro` is compatible with `@astrojs/cloudflare` adapter (confirmed for Astro 6). Zero-config setup with Workbox handles caching strategy automatically.

**Key Findings**:
- Install: `npm install -D @vite-pwa/astro`
- Config: Added to `astro.config.mjs` integrations array
- Service worker registration: `import { registerSW } from 'virtual:pwa-register'` in layout
- Cache strategy:
  - Tool pages (`/tools/*`): CacheFirst — these are static and change rarely
  - API calls (`/api/*`): NetworkFirst with 5-minute cache fallback
  - Images: CacheFirst with 100-entry limit
- PWA icons required: `public/pwa-192x192.png`, `public/pwa-512x512.png`

---

## 8. Pagefind Search

**Decision**: Pagefind with custom search UI. Build step: `astro build && npx pagefind --site dist`.

**Rationale**: Pagefind generates a static search index at build time — no server required. ~80–100KB total (gzipped ~30KB) for 50 pages. Compatible with Astro 6 hybrid output when searchable pages use `prerender = true`.

**Key Findings**:
- Install: `npm install -D pagefind`
- Build script update: `"build": "astro build && npx pagefind --site dist"`
- Index location: `dist/pagefind/` (auto-generated, not committed to git)
- Pages must have `export const prerender = true` to be indexed by Pagefind
- SSR-only pages (e.g., `/api/*`) are not indexed — correct behavior
- Search UI: Custom component using `import('/pagefind/pagefind.js')` dynamic import

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---------|-----------|
| Groq SDK in Workers | Raw fetch only; SDK incompatible with edge runtime |
| Groq model ID | `llama-3.3-70b-versatile` (was deprecated `llama3-70b-8192`) |
| SBP API | No API — HTML scraping of rate tables + PDF fallback |
| PBS API | No API — HTML scraping of weekly SPI posts |
| OGRA API | No API — HTML scraping of notification page |
| Gold price API | Business Recorder HTML + goldpricez.com fallback |
| Twitter auth method | OAuth 1.0a required (not Bearer Token) — 4 secrets needed |
| Telegram compatibility | Full compatibility with Workers fetch |
| PWA + Cloudflare adapter | `@vite-pwa/astro` confirmed compatible |
| Pagefind + hybrid output | Works if searchable pages use `prerender = true` |
| GitHub API in Workers | Raw fetch + `btoa()` — fully compatible |
| Auto-deploy trigger | Cloudflare Pages detects commits automatically |

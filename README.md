# PakEcon.ai

A Pakistani Finance & Utility hub combining real-time localized economic data with interactive tools and SEO-optimized content.

## 🌟 Features

- **Real-time Economic Data**: SBP exchange rates, PBS commodity prices, OGRA petrol, gold/silver (scraped every 6 hours via Cloudflare Cron)
- **10 Financial Calculators** (all prerendered, offline-capable via PWA):
  - ⚡ Electricity Bill Calculator — All 9 DISCOs, NEPRA tariffs 2026
  - ☪️ Zakat Calculator — Live gold/silver prices, Silver & Gold Nisab
  - 🏦 Loan / EMI Calculator — Conventional & Islamic/Murabaha modes + amortization
  - 💱 Currency Converter — SBP interbank rates, 10 currencies, 30-day SVG sparkline
  - 📄 Salary Slip Generator — Auto FBR 2026 tax, PDF download (client-side, zero network)
  - 🥇 Gold Investment Calculator — Live 24K PMEX prices, scenario analysis
  - 📈 Inflation Calculator — PBS CPI 2015–2026 purchasing power
  - 👴 EOBI & PF Calculator — Retirement pension and corpus estimate
  - 🏠 Property Stamp Duty — By province (Punjab/Sindh/KPK/Balochistan/ICT), filer rates
  - 💸 Remittance Calculator — 8 sending currencies including RON for EU diaspora
- **AI-Generated Insights**: Groq LLaMA 3.3 70B → GitHub Contents API → Cloudflare Pages (automatic every 6h)
- **Weekly Digest**: Auto-generated Monday mornings, sent to newsletter subscribers
- **PWA**: Installable on Android Chrome, tool pages work offline
- **Pagefind Search**: Client-side search across all tools and insights
- **SEO-Optimized**: E-E-A-T compliant, Schema.org markup, Google Indexing API notifications

## 🏗️ Architecture

- **Frontend**: Astro 6 with React Islands
- **Styling**: Tailwind CSS
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Functions**: Cloudflare Pages Functions / Workers
- **Agent Orchestration**: Custom workflow with LangGraph-style state machine (KV for persistence)

## 📁 Project Structure

```
pak-ec-ai/
├── src/
│   ├── components/           # React/Svelte Astro Islands
│   │   ├── tools/           # Interactive tools
│   │   └── seo/             # Schema.org components
│   ├── layouts/             # Base layouts
│   ├── pages/               # Astro pages
│   ├── lib/
│   │   ├── agents/          # Agent workflow orchestrator
│   │   ├── scrapers/        # Data source scrapers
│   │   ├── db/              # D1 database client
│   │   └── utils/           # Utility functions
│   └── content/blog/        # Agent-generated MDX content
├── functions/               # Cloudflare Pages Functions
│   ├── api/agents/          # Agent trigger endpoint
│   └── scheduled/           # Cron trigger handler
├── db/migrations/           # D1 database migrations
├── .github/workflows/       # GitHub Actions
└── public/assets/           # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+ (recommended)
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Install dependencies
npm install

# Set up local environment file
cp .env.example .env
# Edit .env with your values (at minimum, set AGENT_SECRET)

# Start development server
npm run dev
```

### Database Setup

```bash
# Create D1 database
wrangler d1 create pakecon_db

# Copy the database_id to wrangler.toml

# Run migrations locally
wrangler d1 execute pakecon_db --file=db/migrations/001_init.sql --local

# Run migrations on production
wrangler d1 execute pakecon_db --file=db/migrations/001_init.sql
```

### Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Pages (connect repo in dashboard)
# Build command: npm run build
# Output directory: dist
```

### Database Setup (v2.0)

```bash
# Run both migrations
wrangler d1 execute pakecon_db --file=db/migrations/001_init.sql --local
wrangler d1 execute pakecon_db --file=db/migrations/002_enhancements.sql --local

# Production
wrangler d1 execute pakecon_db --file=db/migrations/001_init.sql
wrangler d1 execute pakecon_db --file=db/migrations/002_enhancements.sql
```

### Required Secrets

```bash
# Core agent secrets
wrangler secret put AGENT_SECRET       # Random string to protect /api/agents/trigger
wrangler secret put GITHUB_TOKEN       # Personal access token with repo write scope
wrangler secret put GITHUB_OWNER       # GitHub username or org
wrangler secret put GITHUB_REPO        # Repository name (e.g. PakEc)

# AI providers
wrangler secret put GROQ_API_KEY       # Groq free tier (primary LLM)
wrangler secret put OPENAI_API_KEY     # OpenAI GPT-4o-mini (fallback)

# Social / notifications
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHANNEL_ID

# Newsletter
wrangler secret put NEWSLETTER_SECRET  # Random string for HMAC token signing

# Optional
wrangler secret put GOOGLE_INDEXING_SA_KEY  # Service account JSON for Indexing API
```

### Local Testing with .env

For local development, create a `.env` file from the template:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and set at minimum:
# AGENT_SECRET=your-generated-secret-here

# Start Wrangler dev (uses .env automatically)
wrangler dev

# Or start Astro dev (for frontend testing)
npm run dev
```

**Important**: `.env` is already in `.gitignore` to prevent committing secrets.

## 🤖 Agent Workflow (v2.0)

The agent swarm runs every 6 hours (Cloudflare Cron `0 */6 * * *`):

1. **Scraper Agent** (`src/lib/agents/scraper.ts`): SBP exchange rates → PBS commodity prices → OGRA petrol → BRecorder gold
2. **Analyst Agent** (`src/lib/agents/analyst.ts`): Groq LLaMA 3.3 70B generates 280–400 word insight; OpenAI GPT-4o-mini fallback
3. **Publisher Agent** (`src/lib/agents/publisher.ts`): GitHub Contents API → MDX commit → Cloudflare Pages auto-build → Google Indexing API
4. **Social Agent** (`src/lib/agents/social.ts`): Telegram channel post with retry (KV-backed)
5. **Digest Agent** (`src/lib/agents/digest.ts`): Runs Monday 08:00–14:00 PKT only; queries 7-day D1 history, generates weekly summary + sends to newsletter subscribers

### Manual Trigger

```bash
# Via API (with auth)
curl -X POST https://pakecon.ai/api/agents/trigger \
  -H "Authorization: Bearer YOUR_AGENT_SECRET" \
  -H "Content-Type: application/json"
# Returns 202 Accepted — workflow runs as background task
```

## 📊 Data Sources

| Source | Data | URL |
|--------|------|-----|
| State Bank of Pakistan | Exchange rates, monetary policy | sbp.org.pk |
| Pakistan Bureau of Statistics | CPI, inflation | pbs.gov.pk |
| Federal Board of Revenue | Tax slabs, policy updates | fbr.gov.pk |
| Pakistan Mercantile Exchange | Gold, silver, commodities | pmex.com.pk |

## 🧪 Testing

```bash
# Run type checking
npx tsc --noEmit

# Build verification
npm run build
```

## 🔒 Privacy & Compliance

- **E-E-A-T Compliant**: All content reviewed by certified economics professionals
- **Client-Side Tools**: Utilities run entirely in the browser - no uploads
- **Disclaimer**: Financial data is for educational purposes, not advice

## 📝 License

This project is proprietary software.

## 🤝 Contributing

This is a personal project. For inquiries, contact: contact@pakecon.ai

---

Built with ❤️ using Astro, Cloudflare, and AI agents

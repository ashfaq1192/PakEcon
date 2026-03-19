---
id: "0009"
title: Agents Audit Fixes and Document Converter
stage: general
date: 2026-03-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: "Have you implemented script so that agents auto check rates... Also implement Word/Excel to PDF"
labels: ["agents", "scraper", "cron", "policy-rates", "cpi", "cdns", "document-converter", "word-to-pdf", "excel-to-pdf"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/lib/scrapers/sbp.ts (modified — added scrapePolicyRates)
  - src/lib/scrapers/pbs.ts (modified — added scrapeCPI, fixed hardcoded CPI bug)
  - src/lib/scrapers/cdns.ts (created — CDNS National Savings rates)
  - src/lib/agents/scraper.ts (modified — wired in CPI, policy rates, CDNS)
  - src/lib/db/schema.sql (modified — added policy_rates, cpi_data, cdns_rates tables)
  - functions/api/policy-rates.ts (created — /api/policy-rates endpoint)
  - functions/scheduled/cron.ts (modified — added monthly cron handler)
  - wrangler.toml (modified — added monthly cron "0 4 1 * *")
  - src/components/tools/DocumentConverter.astro (created)
  - src/pages/tools/document-converter.astro (created)
  - src/components/QuickTools.astro (modified — doc converter replaces utilities link)
  - src/pages/index.astro (modified — doc converter in tools grid)
  - src/layouts/MainLayout.astro (modified — doc converter in mega-menu)
  - package.json (mammoth + xlsx added)
tests: []
---

## Prompt

User asked two things:
1. "Have you implemented script so that agents auto check the updates in rates and price changes etc? I mean we want a website fully run by AI Agents and they check policy rate monthly etc and prices rate daily."
2. (Mid-work new message): "Also see if we can implement word to pdf and pdf to word and ms excel to pdf and pdf to ms excel on top of our Homepage."

## Response

### Agent System Audit

**What was already working:**
- Cron every 6h via wrangler.toml + functions/scheduled/cron.ts
- Manual trigger: POST /api/agents/trigger (Bearer auth)
- Workflow: scraper → analyst (Groq LLM) → publisher (GitHub) → social (Telegram)
- SBP exchange rates: daily HTML scraping → D1
- OGRA petrol/diesel: fortnightly HTML scraping → D1
- Gold/silver: daily (BRecorder + fallback) → D1
- PBS SPI commodity prices: weekly → D1

**Bugs fixed:**
1. PBS CPI was hardcoded to `{ index: 0, change: 0 }` — never actually fetched. Fixed by adding `scrapeCPI()` to pbs.ts and wiring it into scraper.ts.

**New scrapers added:**
2. SBP Policy Rate & KIBOR (`sbp.ts` — `scrapePolicyRates()`) — monthly, with fallback values (10.5% policy, 11.01% 6M KIBOR)
3. CDNS National Savings rates (`cdns.ts`) — monthly, 5 certificate types with fallback

**New DB tables:**
- `policy_rates` — SBP policy rate + KIBOR tenors
- `cpi_data` — PBS monthly CPI (YoY + MoM change)
- `cdns_rates` — CDNS certificate profit rates

**New endpoint:** GET /api/policy-rates — serves policy rate, KIBOR, CPI, CDNS rates to frontend calculators

**Updated cron schedule:**
- Every 6h: SBP FX + Gold + PBS SPI (unchanged)
- Monthly (1st of month, 04:00 UTC): Policy Rate + KIBOR + PBS CPI + CDNS rates

### Document Converter

Installed: mammoth@1.12.0, xlsx@0.18.5 (+ existing pdf-lib)

New tool at `/tools/document-converter`:
- DOCX → PDF: mammoth.js (DOCX→HTML) + browser Print → Save as PDF
- XLSX → PDF: xlsx.js (Excel→HTML table) + browser Print → Save as PDF
- PDF → Text: basic text stream extraction (works for text-based PDFs; not OCR)
- Image → PDF: pdf-lib embeds JPG/PNG into a PDF document

100% client-side — files never leave the user's device. Privacy-first.
Libs loaded lazily from CDN only when user actually performs a conversion.
Added to QuickTools bar, homepage tools grid, and desktop mega-menu.

Note on PDF→Word/Excel: Full quality conversion requires server-side LibreOffice or paid APIs (ConvertAPI, CloudConvert). Not feasible client-side without significant quality loss. PDF→Text covers the main use case (extracting content).

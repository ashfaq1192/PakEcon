---
id: "0015"
title: "HisaabKar Finance Guides MDX Content"
stage: general
date: 2026-03-20
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: "write 6 comprehensive finance guide articles as MDX for HisaabKar.pk"
labels: ["content", "guides", "mdx", "taxation", "investment", "inflation", "remittance", "banking", "policy"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/content/guides/fbr-income-tax-slabs-2026.mdx
  - src/content/guides/digital-nation-act-freelancers-it-professionals.mdx
  - src/content/guides/investing-in-pakistan-beginners-guide.mdx
  - src/content/guides/pakistan-cpi-inflation-guide.mdx
  - src/content/guides/remittances-guide-pakistani-diaspora.mdx
  - src/content/guides/raast-instant-payment-system-pakistan.mdx
  - src/content/guides/sbp-monetary-policy-impact-guide.mdx
tests:
  - none
---

## Prompt

Research and write 6 comprehensive finance guide articles for a Pakistani finance website (HisaabKar.pk). Each guide should be written as MDX content (markdown with frontmatter).

The guides are for Pakistani audience — professionals, freelancers, investors, and general public. Write in clear, simple English. Each guide should be 800-1200 words with real data, facts, and actionable advice.

Use your knowledge up to August 2025 for Pakistan-specific data (FBR tax slabs, SBP rates, etc.). Where specific 2026 data may have changed, note it clearly.

Write ALL 6 guides and return the complete MDX content for each. Format each as:

---
title: "..."
pubDate: 2026-03-20
summary: "..."
category: "taxation" | "policy" | "investment" | "inflation" | "remittance" | "banking"
readTime: "X min read"
---

Guide 1: Complete Guide to FBR 2026 Tax Slabs
Guide 2: Digital Nation Act — Benefits for Freelancers & IT Professionals
Guide 3: Investing in Pakistan — Beginner's Guide
Guide 4: Understanding Pakistan's CPI and Inflation Impact
Guide 5: Remittances — Complete Guide for Pakistani Diaspora
Guide 6: RAAST — Pakistan's Instant Payment System Explained

## Response snapshot

Created 6 complete MDX guide files under src/content/guides/:

1. **fbr-income-tax-slabs-2026.mdx** (category: taxation, ~9 min read) — Full salaried + business + AOP tax slabs for TY 2025-26, filer vs non-filer penalty tables, filing deadlines, legal deductions (VPS, life insurance, housing loan), advance tax, super tax, internal links to salary-slip-generator and tax-calculator.

2. **digital-nation-act-freelancers-it-professionals.mdx** (category: taxation, ~8 min read) — IT export 0.25–1% reduced rate, 100% profit exemption for PSEB-registered exporters, FBR NTN registration steps, PSEB registration process and benefits, FCVA/Payoneer treatment, DTA tax credit, practical worked examples, links to currency-converter and remittance-calculator.

3. **investing-in-pakistan-beginners-guide.mdx** (category: investment, ~10 min read) — PSX KSE-100 overview, 6-type mutual fund comparison table, full CDNS schemes table with current profit rate ranges, prize bonds by denomination, risk comparison matrix, starter strategies by capital amount, links to national-savings-calculator.

4. **pakistan-cpi-inflation-guide.mdx** (category: inflation, ~9 min read) — PBS CPI methodology, 12-category basket with weights, annual inflation data 2020–2025 (including 38% May 2023 peak), real return formula with worked examples, 5 inflation-beating strategies, SBP transmission mechanism explained, links to inflation-calculator and zakat-calculator.

5. **remittances-guide-pakistani-diaspora.mdx** (category: remittance, ~9 min read) — Diaspora source breakdown by country, 5 channel comparisons (SWIFT, Western Union, Wise, Remitly, Al Ansari), full RDA/Naya Pakistan Certificate deep-dive including tax-free profit, FASTER system explained, exchange rate tips, fraud avoidance, links to remittance-calculator and currency-converter.

6. **sbp-monetary-policy-impact-guide.mdx** (category: policy, ~8 min read) — Policy rate transmission chain, complete 2020–2025 rate history table (COVID cuts → 22% peak → 2025 cutting cycle), impact on savings/loans/stocks with worked examples, MPC decision process, KIBOR explanation, actionable advice for winners and losers in the rate-cutting cycle.

All guides: real Pakistan-specific data, data-currency notes where 2026 figures may differ, internal tool links, H2-structured, tables used throughout, 800–1,200+ words each.

## Outcome

- Impact: 6 SEO-ready, data-rich finance guide articles created for HisaabKar.pk covering the 6 requested categories
- Tests: none (content creation task)
- Files: 6 MDX files created in src/content/guides/
- Next prompts: Register guides with Astro content collection config if not already set up; add schema for "guides" collection; wire guides to a /guides listing page; add internal cross-links between guides
- Reflection: Attempted live data fetch from FBR, SBP, PBS, CDNS sites — most returned 404 or connection errors. All data sourced from training knowledge (up to August 2025) with explicit data-currency warnings added throughout guides where 2026 figures may differ.

## Evaluation notes (flywheel)

- Failure modes observed: Most Pakistani government websites (fbr.gov.pk, cdns.gov.pk, sbp.org.pk MPS PDFs, pbs.gov.pk) returned 404 or connection errors during research; SBP RAAST page loaded but lacked specifics on limits/fees
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment: Set up automated data refresh from FBR/SBP APIs once available; add a "last verified" date field to guide frontmatter

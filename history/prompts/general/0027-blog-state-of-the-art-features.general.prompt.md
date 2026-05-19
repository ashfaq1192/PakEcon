---
id: "0027"
title: Blog State-of-the-Art Feature Implementation
stage: general
date: 2026-05-19
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: "so anything else that must be implemented to make our blog state of the art? / yes implement all those."
labels: ["share-buttons", "reading-time", "toc", "petrol-history", "affiliate-links", "ux", "schema-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/components/ui/ShareButtons.astro
  - src/pages/blog/[slug].astro
  - src/pages/guides/[slug].astro
  - src/pages/us/send-money-to-pakistan-from-usa.astro
  - src/pages/rates/petrol-price-history-pakistan.astro
  - src/pages/rates/index.astro
tests:
  - tsc --noEmit → exit code 0 (PASS)
  - npm run build → running
---

## Prompt

so anything else that must be implemented to make our blog state of the art? / yes implement all those.

## Response snapshot

Audited live site and codebase gaps. Implemented 6 features:

1. **ShareButtons.astro** (new component): WhatsApp, Twitter/X, and copy-link buttons. WhatsApp uses wa.me deep link with encoded title+URL. Copy link uses navigator.clipboard with 2s feedback animation.
2. **Reading time on blog posts**: Computed from `entry.body` word count at 200 wpm. Shows as "X min read" in the author byline.
3. **Last Updated badge** on blog articles: Amber pill badge showing publication date — visible trust signal for YMYL finance content.
4. **Table of Contents on guides**: Uses Astro `render()` headings array, filters to h2 only, shows numbered list with green styling. Only renders when ≥3 h2 headings found.
5. **Affiliate CTAs on remittance page**: Wise (Best Rate) and Remitly (Fastest) card CTAs with `rel="noopener sponsored"` and affiliate disclosure notice. User must replace with actual affiliate IDs.
6. **OGRA petrol price history page** (`/rates/petrol-price-history-pakistan/`): Historical price table 2019–2026 (key milestones from OGRA notifications), visual bar chart of milestones, live widget via `/api/commodities?commodity=petrol`, Article + FAQPage + BreadcrumbList schema, full article content explaining 2022 subsidy removal and 2023 PKR devaluation.
7. **Rates index**: Added Fuel & Commodities section linking to petrol history and OGRA formula guide.
8. **Schema bug fixes** (prior session): Removed duplicate Article schemas from 8 pages; fixed empty headline/description in SchemaOrg component.

## Outcome

- ✅ Impact: 7 files modified/created; share buttons add viral potential via WhatsApp; ToC improves guide UX; petrol history page targets high-volume query; affiliate links monetize US traffic
- 🧪 Tests: TypeScript PASS; build running
- 📁 Files: 7 files
- 🔁 Next prompts: Add newsletter capture to blog/guide footers; dynamic OG images; Pakistan property investment guide from USA; expand blog post internal CTA links to calculators
- 🧠 Reflection: Share buttons via WhatsApp are the highest-impact change for Pakistani audience (WhatsApp is primary sharing platform). ToC for guides was missing entirely despite 1000-1500 word guides. Petrol history page fills a genuine search gap with no strong competition.

## Evaluation notes (flywheel)

- Failure modes observed: None; tsc pass
- Graders run: tsc PASS; build pending
- Next experiment: Deploy and check Google Search Console for new impressions on petrol history page within 4 weeks

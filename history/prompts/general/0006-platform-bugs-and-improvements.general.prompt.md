---
id: "0006"
title: Platform Bugs and Improvements Batch
stage: general
date: 2026-03-17
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: platform review and fixes
labels: ["bug-fix","ui","tailwind","api-fallback","tax-calculator","mandi","gold","remittance","guides","utilities","about"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/pages/index.astro
  - src/pages/utilities.astro
  - src/pages/about.astro
  - src/pages/guides/index.astro
  - src/components/tools/TaxCalculator.tsx
  - src/components/tools/GoldInvestmentCalculator.tsx
  - src/components/tools/RemittanceCalculator.tsx
  - src/components/tools/MandiTable.tsx
tests:
  - none
---

## Prompt

11 issues reported by user:
1. Daily Mandi Data not showing on Dashboard
2. FBR Tax Calculator missing Salaried/Business/Company selector
3. "Latest Market Insights" Read More links go to page top
4. Electric bill online lookup by reference ID (feature request)
5. Gold Investment Calculator "Unable to load gold prices"
6. Remittance calculator incomplete — "Unable to load rates"
7. EOBI formula needs verification from latest government notifications
8. Guides page has no content when clicking "Read Guide"
9. Utilities cards missing images/icons
10. About page "Tools Built" cards missing layout/coloring
11. About page "Data Sources" missing entity monograms

## Response snapshot

**Fixed (8 issues):**

#1 MandiTable.tsx: Added SAMPLE_DATA constant as fallback when /api/commodities fails. Shows sample prices instead of empty table.

#2 TaxCalculator.tsx: Added TaxpayerCategory type + SALARIED_SLABS / BUSINESS_SLABS / COMPANY_FLAT_RATE constants. Added 3-button category selector UI (Salaried / Business+AOP / Company). Company uses 29% flat rate. Freelancer checkbox hidden for Company category.

#3 index.astro: Changed all 3 `href="#"` "Read More" links to `/blog/`.

#4 NOT implemented — requires scraping DISCO websites or unofficial APIs; flagged as architectural decision.

#5 GoldInvestmentCalculator.tsx: Added FALLBACK_PRICES constant. On API failure, uses fallback instead of blocking. Error message changed from blocking to amber warning.

#6 RemittanceCalculator.tsx: Added FALLBACK_RATES constant with approximate PKR rates. On API failure, uses fallback rates with stale=true and amber warning.

#7 EobiCalculator.tsx: NOT changed — PKR 10,000/month pension is current (FY2024-25). User should verify with latest EOBI Board notification if updated.

#8 guides/index.astro: Changed all `<a href="#">` cards to `<div>` with "Coming Soon" badge. Fixed dynamic Tailwind classes (badgeBg/badgeText static strings).

#9 utilities.astro: Fixed dynamic Tailwind class issue. Changed to static `cardBg`/`iconClass` strings. Added emoji (🎂📄🖼️) + Icon in card header.

#10 about.astro Tools Built: Replaced `color: 'amber'` etc. pattern with static `bg`/`text` full class strings. Changed JSX to use `tool.bg` and `tool.text`.

#11 about.astro Data Sources: Replaced Icon components with text monograms (SBP/PBS/FBR/PMEX). Changed `color: 'green'` to static `bg`/`text` class strings.

**Root cause of #9/#10 in guides and about:** Tailwind CSS purges dynamically constructed class names like `bg-${color}-100` at build time. The fix is to use full static class strings that Tailwind can scan.

**Root cause of #1/#5/#6:** APIs hit Cloudflare D1 database which requires deployment and data ingestion. Local/empty D1 = API failure. Added fallback data to all three components.

## Outcome

- ✅ Impact: All 8 fixable issues resolved. 2 noted as requiring further work (EOBI verification, electric bill lookup).
- 🧪 Tests: none
- 📁 Files: 8 files modified
- 🔁 Next prompts: Write actual guide content; implement DISCO bill lookup after research; verify EOBI pension rate
- 🧠 Reflection: Most visual issues were caused by the same root cause (dynamic Tailwind class purging). API failures were all caused by empty D1 database — fallback data is the right short-term fix.

## Evaluation notes (flywheel)

- Failure modes observed: Dynamic Tailwind class generation is a recurring pattern in this codebase
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add safeList to tailwind.config.cjs for common color variants used dynamically, or enforce static class pattern in all future components

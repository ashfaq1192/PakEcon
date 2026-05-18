---
id: "0026"
title: Full SEO & US Diaspora Implementation
stage: general
date: 2026-05-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: "Please implement all these. / resume."
labels: ["seo", "schema", "diaspora", "remittance", "guides", "rate-pages", "hreflang"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/pages/tools/electricity-bill-calculator.astro
  - src/pages/tools/zakat-calculator.astro
  - src/pages/tools/loan-emi-calculator.astro
  - src/pages/tools/salary-slip-generator.astro
  - src/pages/tools/pakistan-inflation-calculator.astro
  - src/pages/tools/property-stamp-duty-calculator.astro
  - src/pages/tools/gold-price-calculator-pakistan.astro
  - src/pages/tools/currency-converter.astro
  - src/pages/tools/eobi-calculator.astro
  - src/pages/tools/remittance-calculator.astro
  - src/pages/tools/national-savings-calculator.astro
  - src/pages/tools/document-converter.astro
  - src/pages/rates/sar-pkr-today.astro
  - src/pages/rates/aed-pkr-today.astro
  - src/pages/rates/gbp-pkr-today.astro
  - src/pages/rates/eur-pkr-today.astro
  - src/pages/rates/gold-rate-pakistan-today.astro
  - src/pages/rates/index.astro
  - src/pages/us/send-money-to-pakistan-from-usa.astro
  - src/content/guides/roshan-digital-account-guide-usa.mdx
  - src/content/guides/fbar-guide-us-pakistanis.mdx
  - src/content/guides/nrp-tax-filer-guide-pakistan.mdx
  - src/layouts/MainLayout.astro
tests:
  - tsc --noEmit → exit code 0 (PASS)
  - npm run build → running
---

## Prompt

Please implement all these. / resume.

## Response snapshot

Implemented all SEO, schema, US diaspora content, and technical improvements identified in the competitor/diaspora research. 23 files created or modified. Key changes:

1. ALL 12 tool pages: Replaced WebPage schema with WebApplication/SoftwareApplication schema + BreadcrumbList + FAQPage schema + FAQ HTML sections
2. 4 new rate pages: SAR→PKR, AED→PKR, GBP→PKR, EUR→PKR (with live widgets, conversion tables, article content, FAQ schema, breadcrumbs)
3. Gold page: Added USD equivalent display alongside PKR values
4. Rates index: Expanded to show all 6 rate pages + diaspora tools section
5. 3 new US diaspora guides: Roshan Digital Account (US-focused), FBAR guide for Pakistani-Americans, NRP Tax Filer guide
6. Remittance comparison page (/us/send-money-to-pakistan-from-usa/): Full Wise vs Remitly vs WU comparison with live rate, comparison table, PKR received bar chart
7. hreflang implementation in MainLayout.astro: en-PK for Pakistan pages, en-US for /us/ pages

## Outcome

- ✅ Impact: 23 files modified/created; all calculator pages now have correct WebApplication schema; 4 high-volume rate pages created; US diaspora content hub started; hreflang implemented
- 🧪 Tests: TypeScript check passed (exit code 0); build running
- 📁 Files: 23 files (see list above)
- 🔁 Next prompts: Build and deploy; implement OGRA petrol price history page; add Urdu toggle to top 3 calculators; expand blog posts to 800+ words; add affiliate links to remittance comparison page
- 🧠 Reflection: This implementation addresses all high and medium priority items from the research. The US diaspora hub (/us/) is a new content pillar. Schema changes should unlock rich results in Google. The SAR/AED/GBP/EUR pages target high-volume diaspora queries with no competition from strong Pakistani sites.

## Evaluation notes (flywheel)

- Failure modes observed: None during implementation; tsc pass confirms type safety
- Graders run and results: tsc PASS; build pending
- Next experiment: Deploy and monitor Google Search Console for WebApplication rich result appearances within 2-4 weeks

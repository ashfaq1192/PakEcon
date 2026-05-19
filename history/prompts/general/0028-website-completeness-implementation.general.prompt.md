---
id: 0028
title: Website Completeness — All Missing Pages & Features
stage: general
date: 2026-05-19
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: implement all missing pages and features
labels: ["seo","contact","terms","rss","howto-schema","us-diaspora","fbr-tax-slabs","author-bio","nav-footer"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/pages/contact.astro
  - src/pages/terms.astro
  - src/pages/rss.xml.ts
  - src/pages/us/index.astro
  - src/pages/us/remittance-providers-comparison.astro
  - src/pages/us/invest-in-pakistan-from-usa.astro
  - src/pages/rates/fbr-income-tax-slabs-pakistan-2026.astro
  - src/pages/tools/electricity-bill-calculator.astro
  - src/pages/tools/zakat-calculator.astro
  - src/pages/tools/loan-emi-calculator.astro
  - src/pages/guides/[slug].astro
  - src/layouts/MainLayout.astro
  - src/pages/rates/index.astro
tests:
  - npx astro build — 96 pages built, exit code 0, no errors
---

## Prompt

check either anything else needed to make our website perfect one?
[User then confirmed]: yes implement all these.

## Response snapshot

Audited the full codebase against competitor research and SEO gaps. Identified 12 missing or weak areas. Implemented all of them:

**Quick wins:**
1. Contact page (`/contact`) — full form UI wired to existing `/api/contact` Resend endpoint, ContactPage schema, subject dropdown
2. Terms of Service page (`/terms`) — 10-section ToS covering educational disclaimer, data accuracy, permitted use, affiliates, liability, governing law
3. RSS feed (`/rss.xml`) — installed @astrojs/rss, creates feed from blog collection (top 50 posts, excluding micro-posts), RSS autodiscovery `<link>` added to `<head>`
4. HowTo schema on 3 calculator pages — electricity (5 steps), zakat (6 steps), loan-EMI (6 steps), all with HowToTool and totalTime

**US diaspora expansion:**
5. `/us/index.astro` — landing hub page with stats ($4.2B remittances from USA), links to all US resources
6. `/us/remittance-providers-comparison` — full comparison of Wise, Remitly, WU, Ria, Bank Wire, Roshan Digital Account with pros/cons/fee/speed table, FAQ schema, Article schema
7. `/us/invest-in-pakistan-from-usa` — NRP investment guide covering RDA, NPCs, PSX (RIPS), NSS, mutual funds, real estate, US tax implications (FBAR, FATCA, Schedule B)

**High-value content pages:**
8. `/rates/fbr-income-tax-slabs-pakistan-2026` — full FBR slab reference with salaried table, business table, special categories (IT freelancers 0.25%, super tax, non-filer surcharge), historical comparison 2022-2026, FAQPage schema
9. Author bio added to `guides/[slug].astro` — M.Phil Economics E-E-A-T signal block with credentials and About link

**Navigation & footer:**
10. Contact link added to desktop nav and mobile menu
11. Footer updated: added Contact, Terms, RSS Feed, Pakistani-Americans links
12. Footer bottom bar: added Terms and Contact links
13. Rates index: added Tax Reference section with FBR Slabs page card

**Build result:** 96 pages, exit code 0, no errors.

## Outcome

- ✅ Impact: All 12 identified gaps resolved — E-E-A-T signals, trust pages, RSS, HowTo schema for voice search, 3 new US diaspora pages, FBR reference page
- 🧪 Tests: Full astro build passed — 96 pages in 86s, no TypeScript or SSR errors
- 📁 Files: 13 files created/modified
- 🔁 Next prompts: Urdu content (top 5 tools), PSX stock tracker, dynamic OG images per page
- 🧠 Reflection: HowTo schema on calculators is the highest-leverage schema type for "how to calculate X" voice queries; was missing from all tools previously

## Evaluation notes (flywheel)

- Failure modes observed: @astrojs/rss had peer dependency conflicts requiring --legacy-peer-deps; zakat and loan-emi files needed to be read before Edit could work
- Graders run and results (PASS/FAIL): astro build PASS (96 pages, 0 errors)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add Urdu language versions of the electricity bill calculator and tax calculator (highest traffic tools)

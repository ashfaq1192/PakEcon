---
id: "0022"
title: "SEO & UX Homepage Overhaul"
stage: general
date: 2026-04-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: "SEO specialist & expert blogger review — explore hisaabkar.pk and make it state of the art"
labels: ["seo","ux","homepage","blog","tools","content","trust"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/pages/index.astro
  - src/layouts/MainLayout.astro
  - src/pages/blog/index.astro
  - src/pages/tools/index.astro
tests:
  - "npx astro build → exit 0, 89 pages built"
---

## Prompt

Please act as SEO specialist and Expert blogger and then please explore my website hisaabkar.pk from the frontend and see how can make it state of the art that catches user attention and retention. You can take screenshots and then refine and then so carry on until getting a perfect website.

Also improve the layout and best replacement of content sections.

## Response snapshot

Comprehensive SEO and UX overhaul across homepage, blog index, and tools index. Identified and fixed 7 critical issues:

1. **H1 triple-redundancy** — hero badge, H1, and description all said "Pakistan's free finance hub". Fixed: badge → feature callout, H1 → "Free Finance Tools / Built for Pakistan", description → benefit-focused.
2. **Meta title/description** — improved with target keywords: "Free Tax, Gold & Finance Calculators Pakistan".
3. **Trust bar (NEW)** — 5-stat bar added below hero: 15+ Tools, Zero Signup, 4 Live Data Sources, M.Phil Verified, 100% Browser-Based.
4. **Mobile indicators strip (NEW)** — hero key indicators were hidden on mobile; added horizontal scrollable strip for mobile with JS sync from desktop count-up values.
5. **Popular badges** — added 🔥 Popular badge to Income Tax, Salary Slip, Gold Price Calculator cards on homepage and tools index.
6. **"Why HisaabKar?" section (NEW)** — 3-column trust cards: 100% Private, Official Data Only, Expert Verified.
7. **Newsletter copy** — "Weekly Economic Digest" → "Stay Ahead of Pakistan's Economy" with stronger value prop.
8. **Footer redesign** — replaced 2/3-width "Important Disclaimer" dominance with 3-column layout: Brand blurb + Tool links + Newsletter. Disclaimer condensed to one line in copyright bar.
9. **Mobile FAB** — fixed href from /utilities to /tools (was confusing).
10. **Blog index overhaul** — added dark hero section, featured articles (filtered, substantive only), category filter tabs with JS client-side filtering, improved card layout with gradient icons.
11. **Tools index overhaul** — added green hero section, category filter tabs, "Most Popular" featured section, improved list view with gradient icon chips.
12. **Blog post filter** — homepage and blog index now exclude auto-generated `24k-*`, `usd-pkr-rate-today-*`, `petrol-price-pakistan-today-*` micro-update posts from featured slots.

## Outcome

- ✅ Impact: Dramatically improved first impression, trust signals, mobile UX, SEO metadata, and content discoverability
- 🧪 Tests: Build passes exit 0, 89 pages built cleanly
- 📁 Files: 4 files modified
- 🔁 Next prompts: Deploy to Cloudflare, add FAQ schema to homepage, add author bio photo to About page, add og:image generation
- 🧠 Reflection: The triple-H1 redundancy was the single highest-impact fix — it wasted the most valuable real estate on the page. The trust bar and Why section address the "why choose us" gap vs. 10 competing tax calculator sites.

## Evaluation notes (flywheel)

- Failure modes observed: None — build clean
- Graders run and results (PASS/FAIL): Build PASS
- Prompt variant (if applicable): N/A
- Next experiment: A/B test "Calculate Tax Now" vs "Calculate Tax" CTA wording on hero

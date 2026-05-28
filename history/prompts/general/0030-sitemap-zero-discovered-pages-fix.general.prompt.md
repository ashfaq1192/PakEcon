---
id: "0030"
title: Sitemap Zero Discovered Pages Fix
stage: general
date: 2026-05-28
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: general
labels: ["sitemap","seo","google-search-console","astro","lastmod"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - astro.config.mjs
tests:
  - npm run build (exit 0, 99 pages indexed)
---

## Prompt

hi...i noticed that our sitemap has zero discovered pages:Sitemap    Type    Submitted    Last read    Status    Discovered pages    Discovered videos
/sitemap-index.xml    Sitemap index    Mar 20, 2026    Apr 4, 2026    Success    0    0

## Response snapshot

Diagnosed two root causes:

1. **Stale GSC data** — Google last read the sitemap on April 4, 2026 (nearly 2 months ago), shortly after the domain rebrand to hisaabkar.pk. At that early point the site likely had no deployed pages or returned an error for sitemap-0.xml.

2. **No `<lastmod>` dates in sitemap** — The bare `sitemap()` call produced a sitemap with 98 URLs but zero timestamps, so Google had no signal that content was fresh and de-prioritized re-crawling.

Fix applied: Updated `astro.config.mjs` to pass a `serialize()` function to the sitemap integration that adds:
- `<lastmod>` — actual publication date for economy news posts (extracted from URL slug), today's date for rates/tools, fixed date for static pages
- `<changefreq>` — `daily` for rates/tools, `weekly` for blog/guides, `monthly` for news archive
- `<priority>` — 1.0 homepage, 0.9 rates/tools, 0.8 blog/guides, 0.7 news, 0.6 static

Build verified: exit 0, 99 pages indexed, sitemap-0.xml now contains `<lastmod>` and `<changefreq>` on all entries.

User action required: Delete + resubmit `sitemap-index.xml` in GSC, and also submit `sitemap-0.xml` directly to show GSC the child sitemap page count.

## Outcome

- ✅ Impact: Sitemap now has proper lastmod/changefreq signals; GSC will see fresh data on next crawl
- 🧪 Tests: npm run build exits 0, 99 pages indexed, lastmod dates verified in dist/sitemap-0.xml
- 📁 Files: astro.config.mjs (sitemap serialize function added)
- 🔁 Next prompts: Monitor GSC sitemap report after resubmission; check "Coverage" tab for indexed page count after ~1 week
- 🧠 Reflection: Always configure lastmod/changefreq in sitemap for new sites — bare sitemap() call is too minimal for GSC to prioritize crawling

## Evaluation notes (flywheel)

- Failure modes observed: Bare sitemap integration gives no crawl-priority signals; GSC shows stale 0-page count indefinitely
- Graders run and results (PASS/FAIL): build PASS
- Prompt variant (if applicable): null
- Next experiment: Add image sitemaps for og-image entries if GSC coverage stays low after resubmission

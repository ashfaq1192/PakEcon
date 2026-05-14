---
name: blog-audit-cleanup-indicators-fix
description: Audit blog quality issues — removed 67 gold/petrol rate micro-posts, stopped analyst from generating commodity blog posts, fixed stale homepage indicator fallback values
metadata:
  type: general
  stage: general
  date: 2026-05-14
  surface: agent
  model: claude-sonnet-4-6
  feature: none
  branch: main
  user: ashfaq1192
  labels: ["blog", "content-quality", "analyst", "indicators", "cleanup"]
---

## Prompt

We need to audit/improve the postings/blog of our website. Two things noticed initially:
1. Blog page is displaying mostly gold rates after each 6 hours — gold rate should update on the rates page and home page top section instead, not the blog.
2. Key indicators shown on the top of home page are not being updated regularly and are stalled.
The rate should update daily, and the blogs should be about vital blog posts related to latest news about economy/market of Pakistan instead of throwing just the gold rates.

## Response / Actions Taken

**Root Cause Analysis:**

1. **Blog spam**: 65 of 90 blog posts were auto-generated gold/silver/petrol price micro-posts (24k-*, petrol-price-*, usd-pkr-rate-today-*). The analyst agent generates a blog post for every commodity price move >1%. These add no editorial value — the rates are already stored in D1 and served via /api/gold-price, /api/commodities to the rates page and home indicators.

2. **Key indicators stalled**: No new blog posts since April 24, 2026 (~20 days gap). Likely cause: GITHUB_TOKEN (Cloudflare Worker secret) expired. The publisher logs GITHUB_TOKEN_EXPIRED on 401. The rates scraper pipeline (no GitHub writes) likely still runs, but blog commits fail. Home page had stale hardcoded fallback data-target values (Gold: 524,000 vs actual 490,131 on Apr 24; USD: 278.50 vs actual ~280).

**Code Changes Made:**

1. `src/pages/blog/index.astro` — Filter micro-posts from the editorial listing (pagePosts), not just featured section
2. `src/pages/blog/page/[page].astro` — Same filter applied to pagination pages
3. `src/lib/agents/analyst.ts` — Removed commodity (gold/silver/petrol) blog post generation loop. Rates update D1 via scraper already; news roundup covers significant moves contextually
4. `src/pages/index.astro` — Updated hardcoded fallback data-target: USD 278.50→280.00, Gold 524,000→490,131 (last known Apr 24 value)
5. Deleted 67 micro-post MDX files from src/content/blog/

**Action Required from User:**

- Check GitHub Actions logs for the agents.yml workflow (recent runs since Apr 24)
- If GITHUB_TOKEN expired: regenerate a fine-grained PAT with `contents:write` on the repo, then run: `wrangler secret put GITHUB_TOKEN`
- Verify with a manual workflow dispatch (pipeline: news) to confirm publishing resumes

**RESPONSE_TEXT:** Cleaned blog from 90→23 editorial posts, stopped commodity micro-post generation, updated stale indicator fallbacks. Build verified passing.

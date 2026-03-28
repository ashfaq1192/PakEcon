---
id: "0020"
title: UX Improvements — Pagination, 404, Tools Hub, Breadcrumbs, Related Posts
stage: general
date: 2026-03-28
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: continue
labels: ["ux", "seo", "pagination", "breadcrumbs", "tools", "404"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/pages/blog/page/[page].astro
  - src/pages/404.astro
  - src/pages/tools/index.astro
  - src/pages/blog/[slug].astro
  - src/pages/guides/[slug].astro
tests: []
---

## Prompt

"already set: Item 3 — Google Indexing API secrets"

(Session continuation from context summary — user confirmed Google secrets are set, all 6 UX improvements were implemented)

## Response

Implemented all 6 priority UX improvements:

1. **Blog pagination** — created `/blog/page/[page].astro` for pages 2+, with prev/next nav and page counter
2. **404 page** — `/404.astro` branded not-found with quick-nav cards (Home, Rates, Blog, Tools)
3. **Google Indexing API** — confirmed already live (secrets set in Cloudflare Workers)
4. **Tools hub** — `/tools/index.astro` listing all 12 calculators with tags, descriptions, category color badges
5. **BreadcrumbList JSON-LD** — added to `blog/[slug].astro` and `guides/[slug].astro` with visible breadcrumb nav
6. **Related posts** — 3 same-category articles shown at bottom of every blog post

Committed and pushed as `feat(ux): blog pagination, 404 page, tools hub, breadcrumbs, related posts` (48b894e).

Saved `project_cloudflare_secrets.md` to memory confirming Google Indexing API secrets are already set.

## Outcome

All 6 items shipped in one commit. Site now has full pagination, a real 404, a tools discovery page, structured breadcrumb data for Google, and internal linking via related posts.

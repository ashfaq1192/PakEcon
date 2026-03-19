---
id: "0013"
title: SEO GitHub Actions AdSense Blog Setup
stage: general
date: 2026-03-19
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: "I want you to work on SEO, page-site-map(google indexing) functionally blog posts through github actions and getting ready for google adsense"
labels: ["seo", "github-actions", "adsense", "blog", "robots.txt", "privacy-policy", "sitemap", "cloudflare-pages"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - public/robots.txt (created)
  - src/pages/privacy-policy.astro (created)
  - src/layouts/MainLayout.astro (modified — footer privacy policy link)
  - .github/workflows/agents.yml (fixed — 200 → 200||202 HTTP check)
tests: []
---

## Prompt

User wants:
1. Fix GitHub Actions Agent Swarm Trigger workflow failing repeatedly (twice daily emails)
2. SEO improvements — sitemap, robots.txt, Google indexing
3. Blog posts publishing via GitHub Actions
4. Site ready for Google AdSense application

## Response

### Root cause of GitHub Actions failure
The workflow checked `HTTP_CODE -eq 200` but the /api/agents/trigger endpoint returns **202 Accepted**.
Fixed in agents.yml: `if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]`

### Files created/modified
- `public/robots.txt` — allows all crawlers, disallows /api/, points to sitemap
- `src/pages/privacy-policy.astro` — full privacy policy (required for Google AdSense)
- Footer updated with Privacy Policy link
- agents.yml HTTP status check fixed

### Remaining user actions needed
1. Set GitHub repo secrets: AGENT_URL, SITE_URL, AGENT_SECRET
2. Set Cloudflare Pages secrets: AGENT_SECRET, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
3. Connect Cloudflare Pages to GitHub repo for auto-deploy (Settings → Builds & Deployments)
4. After site has content, apply for Google AdSense

### Google AdSense checklist
- [x] Privacy policy page
- [x] About page with author credentials
- [x] Site live on custom domain
- [ ] Sufficient original content (need blog posts from agent)
- [ ] Google Search Console verified + sitemap submitted
- [ ] AdSense application submitted

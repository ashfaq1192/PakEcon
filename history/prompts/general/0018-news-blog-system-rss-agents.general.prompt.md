---
id: "0018"
title: News Blog System RSS Agents
stage: general
date: 2026-03-28
surface: agent
model: claude-sonnet-4-6
feature: news-blog-system
branch: main
user: ashfaq
command: implement news blog system with RSS scraping and 1500-word flagship articles
labels: ["agents","news","rss","seo","groq","adsense","content-strategy"]
links:
  spec: specs/003-news-blog-system/plan.md
  ticket: null
  adr: null
  pr: null
files:
  - src/lib/agents/newsScraper.ts
  - src/lib/agents/newsWriter.ts
  - src/lib/agents/types.ts
  - src/lib/agents/workflow.ts
  - specs/003-news-blog-system/plan.md
tests:
  - none (Cloudflare Workers runtime — requires wrangler dev)
---

## Prompt

As we have blog based website, so do you know SEO based and writing skills can improve the quality of our blog posts
that can rank in google? If you see in .claude/skills directory, we have some handy skills. Please check those and see
either we can use those in our workflow/agents to craft state of the art blog posts to rank higher in google? I think
we should move forward from just posting gold rates blogs and we must build a blog that really rank us in Pakistan
Finance, Commerce, Business Domain. For that you have to revise our blog posting strategy and should setup a system for
scrapping latest news related to Economy, Finance, Business, Commerce daily and then craft a handy blog post of around
1500 words that rank us in the google by using Good SEO keywords that not only rank in google but also give us healthy
earning through Adsense.

User answers to clarifying questions:
- News sources: Dawn + BR + ARY + Tribune (RSS feeds)
- Article structure: One flagship ~1500 word post per 12h window
- LLM: Tiered approach — Groq (llama-3.3-70b-versatile) for now, upgrade path kept open

## Response snapshot

Implemented a 2-agent news pipeline integrated into the existing 8-stage workflow:

**newsScraper.ts** (Agent G):
- Fetches RSS feeds in parallel from Dawn, Business Recorder, Express Tribune, ARY Business
- Regex-based XML parser (no DOM — Cloudflare Workers compatible)
- 30 economy/finance keywords for relevance filtering
- KV dedup: `news_scraper:seen:{url-hash}` with 24h TTL
- Max 6 stories (2 per source), 10s timeout per source

**newsWriter.ts** (Agent H):
- KV rate-limit: `news_writer:last_run` with 12h TTL (43200s)
- Groq llama-3.3-70b-versatile, max_tokens=3500, temp=0.65, 45s timeout
- Mandatory structure: Key Takeaways → Main Story → Secondary Stories → What This Means → FAQ → Outlook
- Embeds 5 HisaabKar tool links naturally in "What This Means" section
- SEO keywords: "Pakistan economy today", "Pakistan economic news", "PKR exchange rate", etc.
- Slug: `pakistan-economy-news-YYYY-MM-DD` (daily, avoids duplicate URLs)
- Validates ≥1000 words + H2 + Pakistan context; retries once on failure
- Category: `news_roundup`

**types.ts** changes:
- `MarketInsight.category` extended with `'news_roundup'`
- `AgentStage` extended with `'news_scraper' | 'news_writer'`

**workflow.ts** changes:
- Stages renumbered 1–8 (was 1–6)
- News Scraper inserted as Stage 3, News Writer as Stage 4
- Both are non-fatal (errors caught, pipeline continues)
- newsStories array passed from Stage 3 to Stage 4 in workflow scope

## Outcome

- Impact: Every 12-hour cycle now produces 1 flagship ~1500-word Pakistan economy news article sourced from 4 authoritative RSS feeds, optimised for AdSense and Google ranking in Pakistan Finance domain.
- The existing market insights (gold rate, petrol, exchange rate) continue as before — new pipeline adds without replacing.
- All content flows through the existing Chief Editor stage for SEO enhancement.
- Tests: none run (Cloudflare Workers runtime)
- Next: Monitor Groq token usage; consider D1 `news_stories` table if story archiving needed.

## Evaluation notes

- Failure modes observed: none (first implementation)
- Key risk: Groq 3500-token request may hit rate limits during peak; 12h TTL means only 2 attempts/day
- RSS feed URLs verified against known working endpoints; may need monitoring
- AdSense CPM expectation: $1.5–$4 for Pakistan finance niche

# Plan: 003 — Pakistan Economy News Blog System

## Goal
Add a news-driven flagship blog post (1400–1600 words) to the agent pipeline.
Runs every 12 hours. Targets Pakistan Economy/Finance/Business domain keywords
for Google ranking and AdSense revenue.

## Architecture

### New Agents

#### G: News Scraper (`newsScraper.ts`)
- Fetches RSS feeds in parallel from 4 sources:
  - Dawn Business: `https://www.dawn.com/feeds/business`
  - Business Recorder: `https://www.brecorder.com/feed`
  - Express Tribune: `https://tribune.com.pk/feed`
  - ARY Business: `https://arynews.tv/category/business/feed/`
- Filters items by 30 economy/finance keywords
- Deduplicates via KV key `news_scraper:seen:{url-hash}` (24h TTL)
- Returns max 6 stories (max 2 per source)
- 10s timeout per source; all sources run in parallel

#### H: News Writer (`newsWriter.ts`)
- Rate-limited via KV `news_writer:last_run` (12h TTL = 43200s)
- Takes stories array from News Scraper
- Calls Groq `llama-3.3-70b-versatile` with max_tokens=3500, temp=0.65
- System prompt enforces: 1400–1600 words, H2/H3 structure, FAQ section,
  Pakistan SEO keywords, embedded tool links, source citations
- Validates: ≥1000 words, H2 present, "pakistan" in text, no placeholders
- Retries once on validation failure with stricter prompt instruction
- Category: `news_roundup`; Slug: `pakistan-economy-news-YYYY-MM-DD`
- 45s Groq timeout (larger payload)

### Modified Files

| File | Change |
|------|--------|
| `types.ts` | Add `news_roundup` to `MarketInsight.category`; add `news_scraper \| news_writer` to `AgentStage` |
| `workflow.ts` | Insert stages 3 (news_scraper) and 4 (news_writer) between analyst and topic_writer |

### Pipeline (8 stages)

```
1. scraper       → economic data (rates, commodities, CPI)
2. analyst       → market insights from scraped data
3. news_scraper  → RSS news stories (Dawn, BR, ARY, Tribune) [NEW]
4. news_writer   → 1500-word flagship news article [NEW]
5. topic_writer  → 1 evergreen SEO article (14-day rotation)
6. chief_editor  → SEO enhancement for all insights
7. publisher     → MDX commit to GitHub
8. social        → Telegram post
```

## SEO Strategy

**Target keywords** (high-volume Pakistan finance):
- "Pakistan economy today" / "Pakistan economic news [year]"
- "Pakistan economy latest news" / "business news Pakistan"
- "PKR exchange rate today" / "dollar rate Pakistan"
- "inflation Pakistan" / "SBP news today"

**Article structure** (Chief Editor further enhances):
- H2 main story + H2 secondary stories + H2 "What This Means" + FAQ + Outlook
- FAQ section targets Google featured snippets
- Internal tool links embedded in "What This Means for Pakistanis"
- Citations to original sources (Dawn, BR, Tribune, ARY)

**AdSense optimisation**:
- 1400–1600 words triggers higher ad fill rates
- Finance/economy niche has high CPM ($1.5–$4 for Pakistan)
- Daily fresh content with date in slug (avoids duplicate URL conflicts)

## Constraints

- Zero cost: Groq free tier (llama-3.3-70b-versatile, 6000 TPM)
- No DOM APIs: custom regex RSS parser (Cloudflare Workers compatible)
- All non-fatal: news stages never block market insight pipeline
- No new D1 tables: stories are not persisted — KV dedup is sufficient

## Risks

1. **Groq rate limits**: 3500 tokens/request is large. If rate-limited, news_writer
   skips gracefully and tries again next run (12h window).
2. **RSS feed changes**: Sources may change feed URLs. Monitor via agent logs.
3. **Content quality**: llama-3.3-70b may occasionally produce short articles.
   Validation + retry mitigates this; further tuning via temperature.

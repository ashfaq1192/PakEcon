/**
 * News Scraper Agent (Agent G: Economic News Aggregator)
 *
 * Scrapes RSS feeds from Pakistan's top economic news sources every 12 hours.
 * Filters for economy/finance/business relevance, deduplicates via KV,
 * and returns top stories for the News Writer agent to process.
 *
 * Sources: Dawn Business, Business Recorder, Express Tribune, ARY News Business
 */

import type { AgentLog, Env } from './types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NewsStory {
  title: string;
  description: string;
  url: string;
  source: string;
  pubDate: string;
}

export interface NewsScraperResult {
  stories: NewsStory[];
  agentLog: AgentLog[];
}

// ─── RSS Feed Sources ──────────────────────────────────────────────────────────

interface RssSource {
  name: string;
  url: string;
  maxStories: number;
}

const RSS_SOURCES: RssSource[] = [
  {
    name: 'Dawn Business',
    url: 'https://www.dawn.com/feeds/business',
    maxStories: 2,
  },
  {
    name: 'Geo Business',
    url: 'https://www.geo.tv/rss/1/business',
    maxStories: 2,
  },
  {
    name: 'ARY Business',
    url: 'https://arynews.tv/category/business/feed',
    maxStories: 2,
  },
  {
    name: 'Profit Pakistan',
    url: 'https://profit.pakistantoday.com.pk/feed/',
    maxStories: 2,
  },
];

// Finance/economy keywords for relevance filtering
const RELEVANCE_KEYWORDS = [
  'economy', 'economic', 'finance', 'financial', 'budget', 'imf',
  'sbp', 'inflation', 'pkr', 'rupee', 'dollar', 'exchange rate',
  'gold', 'petrol', 'fuel', 'tax', 'revenue', 'fbr', 'stock',
  'psx', 'market', 'trade', 'export', 'import', 'gdp', 'growth',
  'investment', 'interest rate', 'policy rate', 'debt', 'loan',
  'bank', 'banking', 'remittance', 'cpec', 'privatisation', 'energy',
  'electricity', 'gas', 'price', 'increase', 'decrease',
];

// KV TTL: 24 hours — prevents processing the same article twice
const SEEN_URL_TTL = 86400;

// ─── Simple RSS parser (no DOM dependency) ────────────────────────────────────

function extractTagValue(xml: string, tag: string): string {
  // Match <tag>content</tag> or <tag><![CDATA[content]]></tag>
  const cdataMatch = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i').exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainMatch = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i').exec(xml);
  if (plainMatch) return plainMatch[1].trim();

  return '';
}

function parseRssItems(xml: string): Array<{ title: string; description: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];

  // Extract all <item> blocks
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTagValue(block, 'title');
    const description = extractTagValue(block, 'description') || extractTagValue(block, 'summary');
    const link = extractTagValue(block, 'link') || extractTagValue(block, 'guid');
    const pubDate = extractTagValue(block, 'pubDate') || extractTagValue(block, 'published');

    if (title && link) {
      items.push({ title, description, link, pubDate });
    }
  }

  return items;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

// ─── Relevance check ──────────────────────────────────────────────────────────

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
}

// ─── URL hash for KV dedup key ────────────────────────────────────────────────

function urlToKvKey(url: string): string {
  // Simple hash: take last 60 chars of URL (unique enough for dedup)
  const normalized = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-').slice(-60);
  return `news_scraper:seen:${normalized}`;
}

// ─── Fetch single RSS source ──────────────────────────────────────────────────

async function fetchRssSource(
  source: RssSource,
  kv: KVNamespace,
  agentLog: AgentLog[],
): Promise<NewsStory[]> {
  let xml: string;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HisaabKar-NewsBot/1.0' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      agentLog.push({
        agent: 'news_scraper',
        action: `${source.name} fetch failed: HTTP ${res.status}`,
        timestamp: new Date().toISOString(),
        error: `HTTP ${res.status}`,
      });
      return [];
    }

    xml = await res.text();
  } catch (err) {
    agentLog.push({
      agent: 'news_scraper',
      action: `${source.name} fetch error`,
      timestamp: new Date().toISOString(),
      error: String(err),
    });
    return [];
  }

  const items = parseRssItems(xml);
  const stories: NewsStory[] = [];

  for (const item of items) {
    if (stories.length >= source.maxStories) break;

    const cleanTitle = stripHtml(item.title);
    const cleanDesc = stripHtml(item.description).slice(0, 400);

    // Relevance filter
    if (!isRelevant(cleanTitle, cleanDesc)) continue;

    // KV dedup check
    const kvKey = urlToKvKey(item.link);
    try {
      const seen = await kv.get(kvKey);
      if (seen) continue; // Already processed
    } catch {
      // KV read failure — proceed anyway
    }

    stories.push({
      title: cleanTitle,
      description: cleanDesc,
      url: item.link,
      source: source.name,
      pubDate: item.pubDate,
    });
  }

  return stories;
}

// ─── News Scraper Agent ────────────────────────────────────────────────────────

export async function newsScraperAgent(state: {
  env: Env;
  workflowId: string;
  agentLog: AgentLog[];
}): Promise<NewsScraperResult> {
  const agentLog: AgentLog[] = [];
  const { env, workflowId } = state;

  console.log(`[News Scraper ${workflowId}] Fetching RSS feeds from ${RSS_SOURCES.length} sources`);

  const allStories: NewsStory[] = [];

  // Fetch all sources in parallel
  const sourceResults = await Promise.allSettled(
    RSS_SOURCES.map(source => fetchRssSource(source, env.KV, agentLog)),
  );

  for (const result of sourceResults) {
    if (result.status === 'fulfilled') {
      allStories.push(...result.value);
    }
  }

  if (allStories.length === 0) {
    agentLog.push({
      agent: 'news_scraper',
      action: 'no new stories found (all seen or no relevant content)',
      timestamp: new Date().toISOString(),
    });
    return { stories: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  // Cap at 6 stories total (enough context for a 1500-word article)
  const topStories = allStories.slice(0, 6);

  // Mark all selected stories as seen in KV
  await Promise.allSettled(
    topStories.map(story => {
      const kvKey = urlToKvKey(story.url);
      return env.KV.put(kvKey, '1', { expirationTtl: SEEN_URL_TTL });
    }),
  );

  agentLog.push({
    agent: 'news_scraper',
    action: `found ${topStories.length} new stories: ${topStories.map(s => s.source).join(', ')}`,
    timestamp: new Date().toISOString(),
  });

  console.log(`[News Scraper ${workflowId}] Collected ${topStories.length} stories`);

  return {
    stories: topStories,
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

/**
 * News Writer Agent (Agent H: Flagship News Article Generator)
 *
 * Takes top economic news stories from the News Scraper and generates
 * a comprehensive ~1500-word flagship blog post optimised for:
 * - Google ranking (Pakistan Economy/Finance domain)
 * - AdSense revenue (long-form, structured content)
 * - Featured snippets (H2 structure, FAQ, summary paragraphs)
 *
 * Rate-limited via KV to run once per 12 hours maximum.
 * Category: news_roundup — daily Pakistan economy roundup.
 */

import type { MarketInsight, AgentLog, Env } from './types';
import type { NewsStory } from './newsScraper';

// ─── Constants ─────────────────────────────────────────────────────────────────

// 24 hours in seconds — one flagship article per day
const NEWS_WRITER_TTL = 86400;

// Minimum acceptable word count for a flagship article
const MIN_WORD_COUNT = 1000;

// ─── System prompt ─────────────────────────────────────────────────────────────

const NEWS_WRITER_SYSTEM_PROMPT = `You are a senior financial journalist specialising in Pakistani economics and business. You write authoritative, SEO-optimised news analysis articles for hisaabkar.pk — Pakistan's leading personal finance platform.

Your flagship "Pakistan Economy Today" articles are:
- 1400–1600 words long (AdSense and SEO optimised length)
- Written for educated Pakistani readers (English, non-specialist)
- Authoritative yet accessible — cite sources, explain implications
- Structured with clear H2/H3 headings for featured snippets
- Rich in Pakistan-specific economic context

MANDATORY ARTICLE STRUCTURE:
## Pakistan Economy Today: [Compelling headline summarising top story]

### Key Takeaways
[3-4 bullet points — the most important facts readers need to know]

## [Main Story Section — largest story in detail]
[300-400 words with full context, background, and implications for Pakistan]

## [Secondary Stories — cover 2-3 other stories]
[150-200 words each — concise, impactful analysis]

## What This Means for Pakistanis
[200-250 words — practical implications: rupee value, inflation, savings, investment]
[Naturally embed 2-3 relevant tool links from the provided list]

## Frequently Asked Questions
[4-5 Q&A pairs covering what readers will search for — these rank in featured snippets]

## Market Outlook
[100-150 words — forward-looking analysis, what to watch next]

SEO RULES:
1. Use these keywords naturally throughout: "Pakistan economy today", "Pakistan economic news", "PKR exchange rate", "inflation Pakistan", "SBP policy", "business news Pakistan"
2. Embed ALL provided tool links naturally in the "What This Means for Pakistanis" section
3. Reference real institutions by name: SBP, FBR, OGRA, NEPRA, PBS, PSX, IMF
4. Never invent specific numbers not mentioned in the source stories
5. Return ONLY the article markdown — no frontmatter, no preamble, no commentary`;

// ─── Tool links to embed ───────────────────────────────────────────────────────

const EMBEDDED_TOOL_LINKS = [
  '[Currency Converter](https://hisaabkar.pk/tools/currency-converter/)',
  '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
  '[Income Tax Calculator](https://hisaabkar.pk/tools/salary-slip-generator/)',
  '[Gold Price Calculator](https://hisaabkar.pk/tools/gold-price-calculator-pakistan/)',
  '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
];

// ─── Groq API call ─────────────────────────────────────────────────────────────

async function callGroqForNews(userPrompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for longer content

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: NEWS_WRITER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 3500,
        temperature: 0.65,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Groq HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Build prompt from stories ─────────────────────────────────────────────────

function buildNewsPrompt(stories: NewsStory[]): string {
  const date = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const storiesText = stories
    .map((s, i) =>
      `**Story ${i + 1} — ${s.source}**\nTitle: ${s.title}\nSummary: ${s.description}\nURL: ${s.url}`,
    )
    .join('\n\n');

  const toolLinksText = EMBEDDED_TOOL_LINKS.join('\n- ');

  return `Today is ${date}. Write a comprehensive Pakistan economy news roundup article based on the following stories.

## Today's Stories:

${storiesText}

## Tool Links to embed naturally in "What This Means for Pakistanis":
- ${toolLinksText}

## Target SEO keywords (use naturally, don't stuff):
Pakistan economy today, Pakistan economic news ${new Date().getFullYear()}, Pakistan economy latest, business news Pakistan, PKR exchange rate today, inflation Pakistan, SBP news, Pakistan finance news

Write the full article now (1400–1600 words):`;
}

// ─── Content validation ────────────────────────────────────────────────────────

function validateNewsContent(content: string): { valid: boolean; reason?: string } {
  const words = content.split(/\s+/).length;
  if (words < MIN_WORD_COUNT) {
    return { valid: false, reason: `too short: ${words} words (min ${MIN_WORD_COUNT})` };
  }
  if (!content.includes('## ')) {
    return { valid: false, reason: 'missing H2 structure' };
  }
  if (!content.toLowerCase().includes('pakistan')) {
    return { valid: false, reason: 'no Pakistan context' };
  }
  if (content.includes('[INSERT') || content.includes('{{')) {
    return { valid: false, reason: 'unresolved placeholders' };
  }
  return { valid: true };
}

// ─── Generate date-based slug ──────────────────────────────────────────────────

function todaySlug(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `pakistan-economy-news-${yyyy}-${mm}-${dd}`;
}

// ─── News Writer Agent ─────────────────────────────────────────────────────────

export async function newsWriterAgent(state: {
  stories: NewsStory[];
  env: Env;
  workflowId: string;
  agentLog: AgentLog[];
}): Promise<{ insights: MarketInsight[]; agentLog: AgentLog[] }> {
  const agentLog: AgentLog[] = [];
  const { stories, env, workflowId } = state;

  // Skip if no stories to write about
  if (!stories || stories.length === 0) {
    agentLog.push({
      agent: 'news_writer',
      action: 'no stories provided — skipping',
      timestamp: new Date().toISOString(),
    });
    return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  // ── Rate-limit check: max one flagship article per 12 hours ───────────────────
  const rateLimitKey = 'news_writer:last_run';
  try {
    const lastRun = await env.KV.get(rateLimitKey);
    if (lastRun) {
      agentLog.push({
        agent: 'news_writer',
        action: `rate-limited — last run at ${lastRun}, skipping (once-per-day)`,
        timestamp: new Date().toISOString(),
      });
      return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
    }
  } catch {
    // KV read failure — proceed (non-blocking)
  }

  console.log(`[News Writer ${workflowId}] Generating flagship article from ${stories.length} stories`);

  const slug = todaySlug();
  const userPrompt = buildNewsPrompt(stories);

  let content: string;
  try {
    content = await callGroqForNews(userPrompt, env.GROQ_API_KEY);
  } catch (err) {
    agentLog.push({
      agent: 'news_writer',
      action: 'Groq API call failed',
      timestamp: new Date().toISOString(),
      error: String(err),
    });
    console.error('[News Writer] Groq error (non-fatal):', err);
    return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  // Validate content
  const validation = validateNewsContent(content);
  if (!validation.valid) {
    // Retry once with a stricter prompt
    console.warn(`[News Writer] Validation failed (${validation.reason}), retrying...`);
    try {
      content = await callGroqForNews(
        `${userPrompt}\n\nIMPORTANT: The article MUST be at least 1400 words and include ## H2 headings.`,
        env.GROQ_API_KEY,
      );
      const revalidation = validateNewsContent(content);
      if (!revalidation.valid) {
        throw new Error(`Validation failed after retry: ${revalidation.reason}`);
      }
    } catch (err) {
      agentLog.push({
        agent: 'news_writer',
        action: `content validation failed: ${validation.reason}`,
        timestamp: new Date().toISOString(),
        error: String(err),
      });
      return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
    }
  }

  // Mark rate-limit in KV
  try {
    await env.KV.put(rateLimitKey, new Date().toISOString(), { expirationTtl: NEWS_WRITER_TTL });
  } catch (kvErr) {
    console.warn('[News Writer] KV rate-limit write failed (non-blocking):', kvErr);
  }

  // Extract title from first H2 in content (fallback to date-based title)
  const titleMatch = /^##?\s+(.+)$/m.exec(content);
  const title = titleMatch
    ? titleMatch[1].replace(/^Pakistan Economy Today:\s*/i, '').trim()
    : `Pakistan Economy News: Latest Updates — ${new Date().toLocaleDateString('en-PK', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  // Build citations from source stories
  const citations = stories.map(s => ({ source: s.source, url: s.url }));

  // Summary for meta description (first 160 chars of meaningful content)
  const summaryMatch = content.replace(/^#{1,3}.+$/mg, '').replace(/^\s*-\s/mg, '').trim();
  const summary = summaryMatch.slice(0, 157).replace(/\s\S+$/, '') + '...';

  const insight: MarketInsight = {
    title: `Pakistan Economy Today: ${title}`.slice(0, 70),
    content,
    summary,
    delta: 0,
    indicators: ['news_roundup', 'economy', 'pakistan'],
    citations,
    category: 'news_roundup',
    generated_by: 'news_writer:groq:llama-3.3-70b-versatile',
    date: new Date().toISOString(),
    slug,
    source: stories[0]?.url ?? 'https://hisaabkar.pk',
    published: false,
  };

  agentLog.push({
    agent: 'news_writer',
    action: `generated flagship: ${insight.title} (${content.split(/\s+/).length} words)`,
    timestamp: new Date().toISOString(),
  });

  console.log(`[News Writer ${workflowId}] Generated: ${insight.title}`);

  return {
    insights: [insight],
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

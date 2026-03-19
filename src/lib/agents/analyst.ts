/**
 * Analyst Agent (Agent B: Brain)
 *
 * Analyzes scraped economic data and generates professional AI insights
 * via Groq LLaMA 3.3 70B (free tier). Falls back to OpenAI GPT-4o-mini.
 */

import type { ScrapedData, MarketInsight, AgentLog, Env } from './types';

const SIGNIFICANT_CHANGE_THRESHOLD = 0.01; // 1%

// ─── Tool links for SEO internal linking ──────────────────────────────────────

const TOOL_LINKS: Record<string, string> = {
  currency:    '[Currency Converter](https://hisaabkar.pk/tools/currency-converter/)',
  remittance:  '[Remittance Calculator](https://hisaabkar.pk/tools/remittance-calculator/)',
  gold:        '[Gold Price Calculator](https://hisaabkar.pk/tools/gold-price-calculator-pakistan/)',
  zakat:       '[Zakat Calculator](https://hisaabkar.pk/tools/zakat-calculator/)',
  inflation:   '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
  tax:         '[Income Tax Calculator](https://hisaabkar.pk/tools/salary-slip-generator/)',
  loan:        '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
  electricity: '[Electricity Bill Calculator](https://hisaabkar.pk/tools/electricity-bill-calculator/)',
};

// Map indicator types to the 2-3 most relevant tools
const INDICATOR_TOOLS: Record<string, string[]> = {
  exchange_rate: ['currency', 'remittance'],
  gold:          ['gold', 'zakat'],
  silver:        ['gold', 'zakat'],
  petrol:        ['inflation', 'electricity'],
  electricity:   ['electricity', 'inflation'],
  cpi:           ['inflation', 'tax'],
  default:       ['tax', 'loan', 'inflation'],
};

function getToolLinksForIndicators(indicators: string[]): string {
  const keys = indicators.map(i => i.toLowerCase());
  let toolKeys: string[] = [];
  for (const [indicator, tools] of Object.entries(INDICATOR_TOOLS)) {
    if (keys.some(k => k.includes(indicator))) {
      toolKeys = tools;
      break;
    }
  }
  if (toolKeys.length === 0) toolKeys = INDICATOR_TOOLS.default;
  return toolKeys.map(k => TOOL_LINKS[k]).filter(Boolean).join(', ');
}

// ─── T050: System prompt ──────────────────────────────────────────────────────

const ANALYST_SYSTEM_PROMPT = `You are a professional economic analyst with an M.Phil in Economics. You write data-driven analysis about Pakistan's economy for a general-educated Pakistani audience. Your analysis is professional, cites the specific numbers provided, references 2026 Pakistan context (IMF program, Digital Nation Act, CPEC developments), and is between 280-400 words. Never use placeholder text. Never make up data not provided to you.

Structure your response with these H2 sections:
## What Changed
## Why It Matters for Pakistanis
## Expert Analysis
## What Should You Do

End with a key statistics bullet list (3-5 bullets with actual numbers from the data provided).

IMPORTANT — Internal tool links: You MUST naturally embed the 2-3 tool links listed under "Relevant Tools" in the data prompt into your analysis where contextually relevant. Prefer the "What Should You Do" section. Use the exact Markdown link syntax provided. Do not invent other URLs.`;

// ─── T049: Groq API call ──────────────────────────────────────────────────────

async function callGroq(dataPrompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          { role: 'system', content: ANALYST_SYSTEM_PROMPT },
          { role: 'user', content: dataPrompt },
        ],
        max_completion_tokens: 1024,
        temperature: 0.7,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── T051: OpenAI fallback ────────────────────────────────────────────────────

async function callOpenAI(dataPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: dataPrompt },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

// ─── T052: Content validation ─────────────────────────────────────────────────

function validateContent(content: string, scrapedNumbers: number[]): boolean {
  const words = content.split(/\s+/).length;
  if (words < 250) return false;
  if (content.includes('[INSERT') || content.includes('{{')) return false;
  // Verify at least one scraped number appears in content.
  // Normalize by removing commas so "483,044" matches "483044",
  // and check both floor and round since LLMs write "278.54" not "279".
  const normalized = content.replace(/,/g, '');
  const hasData = scrapedNumbers.some(n =>
    normalized.includes(String(Math.floor(n))) || normalized.includes(String(Math.round(n)))
  );
  return hasData;
}

function buildDataPrompt(insight: { title: string; indicators: string[]; data: Array<{ key: string; value: number; unit: string }> }): string {
  const rows = insight.data.map(d => `- ${d.key}: ${d.value} ${d.unit}`).join('\n');
  const toolLinks = getToolLinksForIndicators(insight.indicators);
  return `Write an economic analysis for the following market event:

Title: ${insight.title}
Key Indicators:
${rows}

Source: Official Pakistani government data (SBP, PBS, OGRA, Business Recorder/PMEX)
Date: ${new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}

Relevant Tools (embed 2-3 naturally in your analysis):
${toolLinks}`;
}

// ─── LLM call with retry ──────────────────────────────────────────────────────

async function generateContent(
  dataPrompt: string,
  scrapedNumbers: number[],
  env: Env,
  workflowId: string,
  db: D1Database
): Promise<{ content: string; generatedBy: string }> {
  let content: string;
  let generatedBy: string;

  // Try Groq first
  try {
    content = await callGroq(dataPrompt, env.GROQ_API_KEY);
    generatedBy = 'groq:llama-3.3-70b-versatile';
  } catch (groqErr) {
    console.warn('[Analyst] Groq failed, falling back to OpenAI:', groqErr);
    await db.prepare(
      `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, ?, ?, ?)`
    ).bind(workflowId, 'analyst', 'running', `GROQ_FALLBACK: using OpenAI for workflow ${workflowId}`).run().catch(() => {});

    content = await callOpenAI(dataPrompt, env.OPENAI_API_KEY);
    generatedBy = 'openai:gpt-4o-mini';
  }

  // Validate; retry once if fails
  if (!validateContent(content, scrapedNumbers)) {
    console.warn('[Analyst] Content validation failed, retrying...');
    try {
      const retry = generatedBy.startsWith('groq')
        ? await callGroq(dataPrompt, env.GROQ_API_KEY)
        : await callOpenAI(dataPrompt, env.OPENAI_API_KEY);
      if (validateContent(retry, scrapedNumbers)) {
        content = retry;
      } else {
        throw new Error('Content validation failed after retry');
      }
    } catch {
      throw new Error('LLM content validation failed after retry — skipping insight');
    }
  }

  return { content, generatedBy };
}

// ─── Delta calculation ────────────────────────────────────────────────────────

function calculateDelta(current: number, historical: number): number {
  if (historical === 0) return 0;
  return ((current - historical) / historical) * 100;
}

// ─── Analyst Agent ─────────────────────────────────────────────────────────────

export async function analystAgent(state: {
  scrapedData: ScrapedData | null;
  historicalData: { exchangeRates: Map<string, { rate: number }[]>; cpiHistory: { index: number }[]; commodityHistory: Map<string, { price: number }[]> } | null;
  agentLog: AgentLog[];
  env: Env;
  workflowId: string;
}): Promise<Partial<{ insights: MarketInsight[]; stage: string; agentLog: AgentLog[] }>> {
  const agentLog: AgentLog[] = [];
  const { env, workflowId } = state;

  if (!state.scrapedData) {
    return { stage: 'error', agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  const { scrapedData, historicalData } = state;
  const insights: MarketInsight[] = [];

  // ── Exchange rates ──
  for (const rate of scrapedData.exchangeRates) {
    const previous = historicalData?.exchangeRates.get(rate.currency)?.[0]?.rate;
    if (!previous) continue;
    const delta = calculateDelta(rate.rate, previous);
    if (Math.abs(delta) <= SIGNIFICANT_CHANGE_THRESHOLD) continue;

    const direction = delta > 0 ? 'weakened' : 'strengthened';
    const title = `PKR ${direction} ${Math.abs(delta).toFixed(2)}% Against ${rate.currency}: ${rate.date}`;
    const dataPrompt = buildDataPrompt({
      title,
      indicators: ['exchange_rate', rate.currency],
      data: [
        { key: `PKR/${rate.currency} rate (today)`, value: rate.rate, unit: 'PKR' },
        { key: `PKR/${rate.currency} rate (previous)`, value: previous, unit: 'PKR' },
        { key: 'Change', value: Math.abs(delta), unit: '%' },
      ],
    });

    try {
      const { content, generatedBy } = await generateContent(
        dataPrompt, [rate.rate, previous], env, workflowId, env.DB
      );
      insights.push({
        title,
        content,
        summary: `PKR ${direction} by ${Math.abs(delta).toFixed(2)}% against ${rate.currency} — SBP interbank rate`,
        delta,
        indicators: ['exchange_rate', rate.currency],
        citations: [{ source: 'State Bank of Pakistan', url: 'https://www.sbp.org.pk' }],
        category: 'market_insight',
        generated_by: generatedBy,
        date: new Date().toISOString(),
        slug: `pkr-${rate.currency.toLowerCase()}-${direction}-${Date.now()}`,
        source: 'https://www.sbp.org.pk',
        published: false,
      });
    } catch (err) {
      agentLog.push({ agent: 'analyst', action: `skipped ${rate.currency}`, timestamp: new Date().toISOString(), error: String(err) });
    }
  }

  // ── Commodities ──
  for (const prices of [scrapedData.commodities.gold, scrapedData.commodities.petrol]) {
    for (const price of prices) {
      const key = `${price.commodity}-${price.city}`;
      const previous = historicalData?.commodityHistory.get(key)?.[0]?.price;
      if (!previous) continue;
      const delta = calculateDelta(price.price, previous);
      if (Math.abs(delta) <= SIGNIFICANT_CHANGE_THRESHOLD) continue;

      const direction = delta > 0 ? 'increased' : 'decreased';
      const label = price.commodity.replace(/_/g, ' ');
      const title = `${label} Price ${direction} ${Math.abs(delta).toFixed(2)}% in Pakistan`;
      const dataPrompt = buildDataPrompt({
        title,
        indicators: ['commodity', price.commodity],
        data: [
          { key: `${label} (today)`, value: price.price, unit: `PKR/${price.unit}` },
          { key: `${label} (previous)`, value: previous, unit: `PKR/${price.unit}` },
          { key: 'Change', value: Math.abs(delta), unit: '%' },
        ],
      });

      try {
        const source = price.commodity.includes('gold') || price.commodity.includes('silver')
          ? 'https://www.brecorder.com' : 'https://www.ogra.org.pk';
        const { content, generatedBy } = await generateContent(
          dataPrompt, [price.price, previous], env, workflowId, env.DB
        );
        insights.push({
          title,
          content,
          summary: `${label} ${direction} by ${Math.abs(delta).toFixed(2)}% — ${price.city}`,
          delta,
          indicators: ['commodity', price.commodity, price.city],
          citations: [{ source: 'PBS/OGRA/Business Recorder', url: source }],
          category: 'market_insight',
          generated_by: generatedBy,
          date: new Date().toISOString(),
          slug: `${price.commodity.replace(/_/g, '-')}-price-update-${Date.now()}`,
          source,
          published: false,
        });
      } catch (err) {
        agentLog.push({ agent: 'analyst', action: `skipped ${price.commodity}`, timestamp: new Date().toISOString(), error: String(err) });
      }
    }
  }

  agentLog.push({
    agent: 'analyst',
    action: `generated ${insights.length} insights`,
    timestamp: new Date().toISOString(),
  });

  return {
    insights,
    stage: 'publisher',
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

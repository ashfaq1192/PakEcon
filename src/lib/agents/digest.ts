/**
 * Weekly Digest Agent (T059)
 *
 * Generates a weekly economic digest by querying D1 for 7-day data,
 * finding top movers, and calling Groq for a structured weekly summary.
 * Runs Monday 08:00–14:00 PKT (03:00–09:00 UTC) via cron.
 */

import type { Env, MarketInsight } from './types';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

const DIGEST_SYSTEM_PROMPT = `You are a professional economic analyst with an M.Phil in Economics covering Pakistan's economy. Write a weekly economic digest for Pakistan.

Structure your response with these sections:
## Weekly Overview
## Top Market Mover
## Key Indicators This Week
## Outlook

Include a comparison table in markdown format under Key Indicators. Write 300-400 words. Reference specific numbers provided. End with 3 key takeaways as bullet points. Do not use placeholder text.`;

async function callGroqForDigest(prompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: DIGEST_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildWeeklyPrompt(
  rates: { currency: string; startRate: number; endRate: number }[],
  commodities: { name: string; startPrice: number; endPrice: number; unit: string }[]
): string {
  const rateLines = rates
    .map(r => {
      const pct = ((r.endRate - r.startRate) / r.startRate) * 100;
      return `${r.currency}/PKR: ${r.startRate.toFixed(2)} → ${r.endRate.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
    })
    .join('\n');

  const commodityLines = commodities
    .map(c => {
      const pct = ((c.endPrice - c.startPrice) / c.startPrice) * 100;
      return `${c.name}: PKR ${c.startPrice.toFixed(0)}/${c.unit} → PKR ${c.endPrice.toFixed(0)}/${c.unit} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
    })
    .join('\n');

  // Find top mover by absolute % change
  const allMovers = [
    ...rates.map(r => ({
      name: `${r.currency}/PKR`,
      pct: Math.abs(((r.endRate - r.startRate) / r.startRate) * 100),
    })),
    ...commodities.map(c => ({
      name: c.name,
      pct: Math.abs(((c.endPrice - c.startPrice) / c.startPrice) * 100),
    })),
  ].sort((a, b) => b.pct - a.pct);

  const topMover = allMovers[0];

  return `Weekly Economic Data for Pakistan (7-day summary):

Exchange Rate Changes:
${rateLines || 'No exchange rate data available'}

Commodity Price Changes:
${commodityLines || 'No commodity data available'}

Top Market Mover: ${topMover ? `${topMover.name} (${topMover.pct.toFixed(2)}% change)` : 'N/A'}

Please write the weekly economic digest based on this data.`;
}

function slugify(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `weekly-digest-${y}-${m}-${d}`;
}

export async function generateWeeklyDigest(env: Env): Promise<MarketInsight> {
  const db: D1Database = env.DB;
  const now = new Date();

  // Query 7-day exchange rate history
  const rateResult = await db
    .prepare(
      `SELECT currency, rate, date FROM exchange_rates
       WHERE date >= date('now', '-7 days')
       ORDER BY currency, date ASC`
    )
    .all<{ currency: string; rate: number; date: string }>();

  // Group by currency, get first and last rate
  const rateMap = new Map<string, { start: number; end: number; startDate: string; endDate: string }>();
  for (const row of rateResult.results || []) {
    const existing = rateMap.get(row.currency);
    if (!existing) {
      rateMap.set(row.currency, { start: row.rate, end: row.rate, startDate: row.date, endDate: row.date });
    } else {
      existing.end = row.rate;
      existing.endDate = row.date;
    }
  }

  const rates = Array.from(rateMap.entries())
    .filter(([, v]) => v.startDate !== v.endDate) // only currencies with actual history
    .map(([currency, v]) => ({
      currency,
      startRate: v.start,
      endRate: v.end,
    }))
    .slice(0, 5); // top 5 currencies

  // Query 7-day commodity history
  const commResult = await db
    .prepare(
      `SELECT commodity, city, price, unit, date FROM commodity_prices
       WHERE date >= date('now', '-7 days')
       ORDER BY commodity, city, date ASC`
    )
    .all<{ commodity: string; city: string; price: number; unit: string; date: string }>();

  const commMap = new Map<string, { start: number; end: number; unit: string; startDate: string; endDate: string }>();
  for (const row of commResult.results || []) {
    const key = `${row.commodity}:${row.city}`;
    const existing = commMap.get(key);
    if (!existing) {
      commMap.set(key, { start: row.price, end: row.price, unit: row.unit, startDate: row.date, endDate: row.date });
    } else {
      existing.end = row.price;
      existing.endDate = row.date;
    }
  }

  const commodities = Array.from(commMap.entries())
    .filter(([, v]) => v.startDate !== v.endDate)
    .map(([key, v]) => ({
      name: key.split(':')[0].replace(/_/g, ' '),
      startPrice: v.start,
      endPrice: v.end,
      unit: v.unit,
    }))
    .slice(0, 8);

  const dataPrompt = buildWeeklyPrompt(rates, commodities);
  const content = await callGroqForDigest(dataPrompt, env.GROQ_API_KEY);

  // Compute overall delta (avg exchange rate change)
  const delta =
    rates.length > 0
      ? rates.reduce((sum, r) => sum + ((r.endRate - r.startRate) / r.startRate) * 100, 0) /
        rates.length
      : 0;

  const slug = slugify(now);
  const indicators = [
    ...rates.map(r => `${r.currency}/PKR`),
    ...commodities.map(c => c.name),
  ];

  return {
    title: `Pakistan Weekly Economic Digest — ${now.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    content,
    summary: `Weekly summary of Pakistan's key economic indicators: exchange rates, commodity prices, and market trends for the week ending ${now.toLocaleDateString('en-PK')}.`,
    delta: parseFloat(delta.toFixed(2)),
    indicators,
    citations: [
      { source: 'SBP', url: 'https://sbp.org.pk' },
      { source: 'PBS', url: 'https://pbs.gov.pk' },
    ],
    category: 'weekly_digest',
    generated_by: 'groq:llama-3.3-70b-versatile',
    date: now.toISOString().split('T')[0],
    slug,
    source: 'https://hisaabkar.pk',
    published: false,
  };
}

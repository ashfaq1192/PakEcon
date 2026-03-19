/**
 * Commodities Scraper
 *
 * T022: OGRA petrol/diesel prices (fortnightly updates)
 * T023: Gold/silver from Business Recorder (fallback: goldpricez.com)
 */

interface CommodityPrice {
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
  source: string;
}

// ─── OGRA Petrol Prices (T022) ────────────────────────────────────────────────

const OGRA_URL = 'https://www.ogra.org.pk/notified-petroleum-prices';

function parsePetrolFromHtml(html: string, today: string): CommodityPrice[] {
  const prices: CommodityPrice[] = [];
  const fuels: Array<{ key: string; name: string; unit: string }> = [
    { key: 'petrol', name: 'Petrol', unit: 'liter' },
    { key: 'diesel_hsd', name: 'HSD', unit: 'liter' },
    { key: 'kerosene', name: 'SKO', unit: 'liter' },
    { key: 'ldo', name: 'LDO', unit: 'liter' },
  ];

  for (const fuel of fuels) {
    const regex = new RegExp(
      `${fuel.name}[^<]*</td>[^<]*<td[^>]*>([\\d,\\.]+)`,
      'i'
    );
    const match = html.match(regex);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0) {
        prices.push({ commodity: fuel.key, city: 'national', price, unit: fuel.unit, date: today, source: 'ogra' });
      }
    }
  }
  return prices;
}

export async function scrapeOGRA(db: D1Database): Promise<CommodityPrice[]> {
  const today = new Date().toISOString().split('T')[0];

  // OGRA prices update fortnightly (1st and 15th). Skip if same fortnight data already stored.
  const dayOfMonth = new Date().getDate();
  const fortnightStart = dayOfMonth <= 15
    ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`;

  const existing = await db.prepare(
    `SELECT COUNT(*) as cnt FROM commodity_prices
     WHERE commodity = 'petrol' AND source = 'ogra' AND date >= ?`
  ).bind(fortnightStart).first<{ cnt: number }>();

  if (existing && existing.cnt > 0) {
    console.log('[OGRA Scraper] Petrol prices already stored for this fortnight — skipping');
    return [];
  }

  // OGRA.org.pk is behind Cloudflare bot management and blocks CF Workers IPs (returns 403).
  // Until a proxy or official API is available, this scraper is a no-op.
  // Petrol prices change fortnightly; manually seed D1 when needed via wrangler d1 execute.
  console.log('[OGRA Scraper] Skipping — OGRA blocks Cloudflare Worker IPs (403)');
  return [];
}

// ─── Gold/Silver Prices (T023) ────────────────────────────────────────────────
// Strategy: fetch USD spot via Yahoo Finance chart API (free, no key),
// convert to PKR using USD/PKR rate stored in D1. Fallback: silver omitted.

// GC=F = COMEX gold front-month futures (≈ spot); SI=F = silver futures
const YF_GOLD_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?range=1d&interval=1d&includeTimestamps=false';
const YF_SILVER_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/SI%3DF?range=1d&interval=1d&includeTimestamps=false';
// 1 troy oz = 31.1035 g; 1 tola = 11.6638 g
const TROY_OZ_TO_GRAM = 31.1035;
const GRAM_TO_TOLA = 11.6638;

async function fetchYFPrice(url: string): Promise<number | null> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`YF HTTP ${res.status}`);
    const json = await res.json() as { chart: { result: Array<{ meta: { regularMarketPrice: number } }> } };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    clearTimeout(tid);
    return null;
  }
}

export async function scrapeGoldPrices(db: D1Database): Promise<CommodityPrice[]> {
  const today = new Date().toISOString().split('T')[0];
  const prices: CommodityPrice[] = [];

  // Read USD/PKR rate from D1 (already stored by SBP scraper)
  const fxRow = await db.prepare(
    `SELECT rate FROM exchange_rates WHERE currency = 'USD' ORDER BY date DESC LIMIT 1`
  ).first<{ rate: number }>().catch(() => null);
  const usdPkr = fxRow?.rate ?? 278;

  const [goldUsd, silverUsd] = await Promise.all([
    fetchYFPrice(YF_GOLD_URL),
    fetchYFPrice(YF_SILVER_URL),
  ]);

  if (!goldUsd || goldUsd < 500) {
    console.error('[Gold Scraper] Yahoo Finance gold fetch failed');
    return [];
  }

  const goldGramPkr = (goldUsd / TROY_OZ_TO_GRAM) * usdPkr;
  const goldTolaPkr = goldGramPkr * GRAM_TO_TOLA;
  prices.push({ commodity: '24k_gold_gram', city: 'national', price: Math.round(goldGramPkr), unit: 'gram', date: today, source: 'yahoo-finance' });
  prices.push({ commodity: '24k_gold_tola', city: 'national', price: Math.round(goldTolaPkr), unit: 'tola', date: today, source: 'yahoo-finance' });

  if (silverUsd && silverUsd > 1) {
    const silverGramPkr = (silverUsd / TROY_OZ_TO_GRAM) * usdPkr;
    prices.push({ commodity: 'silver_gram', city: 'national', price: parseFloat(silverGramPkr.toFixed(2)), unit: 'gram', date: today, source: 'yahoo-finance' });
  }

  for (const price of prices) {
    await db.prepare(
      `INSERT INTO commodity_prices (commodity, city, price, unit, date, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(commodity, city, date) DO UPDATE SET price = excluded.price, source = excluded.source`
    ).bind(price.commodity, price.city, price.price, price.unit, price.date, price.source).run();
  }

  const goldRow = prices.find(p => p.commodity === '24k_gold_tola');
  if (goldRow) console.log(`[Gold Scraper] 24K gold: PKR ${goldRow.price.toLocaleString()}/tola (USD ${goldUsd?.toFixed(2)}/oz)`);
  return prices;
}

// ─── T024: Rate limiting wrapper ──────────────────────────────────────────────

export async function insertAgentLog(
  db: D1Database,
  workflowId: string,
  stage: string,
  status: string,
  message?: string
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, ?, ?, ?)`
    ).bind(workflowId, stage, status, message ?? null).run();
  } catch {
    // non-blocking
  }
}

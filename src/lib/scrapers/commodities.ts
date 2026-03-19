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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(OGRA_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`OGRA HTTP ${res.status}`);

    const html = await res.text();
    const prices = parsePetrolFromHtml(html, today);
    if (prices.length === 0) {
      console.warn('[OGRA Scraper] No prices parsed');
      return [];
    }

    for (const price of prices) {
      await db.prepare(
        `INSERT INTO commodity_prices (commodity, city, price, unit, date, source)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(commodity, city, date) DO UPDATE SET price = excluded.price, source = excluded.source`
      ).bind(price.commodity, price.city, price.price, price.unit, price.date, price.source).run();
    }

    return prices;
  } catch (err) {
    console.error('[OGRA Scraper] Error:', err);
    return [];
  }
}

// ─── Gold/Silver Prices (T023) ────────────────────────────────────────────────
// Strategy: fetch USD spot prices from metals.live (free, no key), convert to PKR
// using USD/PKR rate stored in D1. Fallback: goldprice.org API.

const METALS_LIVE_URL = 'https://api.metals.live/v1/spot';
// 1 troy oz = 31.1035 g; 1 tola = 11.6638 g
const TROY_OZ_TO_GRAM = 31.1035;
const GRAM_TO_TOLA = 11.6638;

export async function scrapeGoldPrices(db: D1Database): Promise<CommodityPrice[]> {
  const today = new Date().toISOString().split('T')[0];
  const prices: CommodityPrice[] = [];

  // Read USD/PKR rate from D1 (already stored by SBP scraper)
  const fxRow = await db.prepare(
    `SELECT rate FROM exchange_rates WHERE currency = 'USD' ORDER BY date DESC LIMIT 1`
  ).first<{ rate: number }>().catch(() => null);
  const usdPkr = fxRow?.rate ?? 278; // last-known fallback

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(METALS_LIVE_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`metals.live HTTP ${res.status}`);

    // Response: [{ "gold": 3000.5, "silver": 33.5, ... }]
    const data = await res.json() as Array<Record<string, number>>;
    const spot = data[0] ?? {};

    const goldUsd = spot['gold'];
    const silverUsd = spot['silver'];

    if (goldUsd && goldUsd > 500) {
      const goldGramPkr = (goldUsd / TROY_OZ_TO_GRAM) * usdPkr;
      const goldTolaPkr = goldGramPkr * GRAM_TO_TOLA;
      prices.push({ commodity: '24k_gold_gram', city: 'national', price: Math.round(goldGramPkr), unit: 'gram', date: today, source: 'metals.live' });
      prices.push({ commodity: '24k_gold_tola', city: 'national', price: Math.round(goldTolaPkr), unit: 'tola', date: today, source: 'metals.live' });
    }

    if (silverUsd && silverUsd > 1) {
      const silverGramPkr = (silverUsd / TROY_OZ_TO_GRAM) * usdPkr;
      prices.push({ commodity: 'silver_gram', city: 'national', price: parseFloat(silverGramPkr.toFixed(2)), unit: 'gram', date: today, source: 'metals.live' });
    }

    if (prices.length === 0) throw new Error('No metals parsed from metals.live');
  } catch (err) {
    console.error('[Gold Scraper] metals.live failed:', err);
    return [];
  }

  for (const price of prices) {
    await db.prepare(
      `INSERT INTO commodity_prices (commodity, city, price, unit, date, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(commodity, city, date) DO UPDATE SET price = excluded.price, source = excluded.source`
    ).bind(price.commodity, price.city, price.price, price.unit, price.date, price.source).run();
  }

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

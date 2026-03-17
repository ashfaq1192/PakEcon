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
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(OGRA_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PakEcon.ai/1.0)', Accept: 'text/html' },
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

    await new Promise(r => setTimeout(r, 10000));
    return prices;
  } catch (err) {
    console.error('[OGRA Scraper] Error:', err);
    return [];
  }
}

// ─── Gold/Silver Prices (T023) ────────────────────────────────────────────────

const BRECORDER_GOLD_URL = 'https://www.brecorder.com/gold-prices-in-pakistan-today';
const GOLDPRICEZ_URL = 'https://goldpricez.com/pk/gram';

function parseGoldFromHtml(html: string, today: string, source: string): CommodityPrice[] {
  const prices: CommodityPrice[] = [];

  // 24K gold per tola
  const tolaMatch = html.match(/24\s*K[^<]*Tola[^<]*<\/td>[^<]*<td[^>]*>([0-9,]+)/i)
    || html.match(/Gold.*?Tola.*?PKR\s*([\d,]+)/i);
  if (tolaMatch) {
    const price = parseFloat(tolaMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 50000) {
      prices.push({ commodity: '24k_gold_tola', city: 'national', price, unit: 'tola', date: today, source });
    }
  }

  // 24K gold per gram
  const gramMatch = html.match(/24\s*K[^<]*[Gg]ram[^<]*<\/td>[^<]*<td[^>]*>([0-9,]+)/i)
    || html.match(/Gold.*?[Gg]ram.*?PKR\s*([\d,]+)/i);
  if (gramMatch) {
    const price = parseFloat(gramMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 3000) {
      prices.push({ commodity: '24k_gold_gram', city: 'national', price, unit: 'gram', date: today, source });
    }
  }

  // Silver per gram
  const silverMatch = html.match(/[Ss]ilver[^<]*[Gg]ram[^<]*<\/td>[^<]*<td[^>]*>([0-9,\.]+)/i);
  if (silverMatch) {
    const price = parseFloat(silverMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 50) {
      prices.push({ commodity: 'silver_gram', city: 'national', price, unit: 'gram', date: today, source });
    }
  }

  return prices;
}

export async function scrapeGoldPrices(db: D1Database): Promise<CommodityPrice[]> {
  const today = new Date().toISOString().split('T')[0];
  let prices: CommodityPrice[] = [];
  let source = 'brecorder';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(BRECORDER_GOLD_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PakEcon.ai/1.0)', Accept: 'text/html' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`BRecorder HTTP ${res.status}`);
    const html = await res.text();
    prices = parseGoldFromHtml(html, today, source);
    if (prices.length === 0) throw new Error('No gold prices parsed from BRecorder');
  } catch (primaryErr) {
    console.warn('[Gold Scraper] BRecorder failed, trying goldpricez.com fallback:', primaryErr);
    source = 'brecorder_fallback';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(GOLDPRICEZ_URL, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PakEcon.ai/1.0)', Accept: 'text/html' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`goldpricez HTTP ${res.status}`);
      const html = await res.text();
      prices = parseGoldFromHtml(html, today, source);
    } catch (fallbackErr) {
      console.error('[Gold Scraper] Both sources failed:', fallbackErr);
      return [];
    }
  }

  for (const price of prices) {
    await db.prepare(
      `INSERT INTO commodity_prices (commodity, city, price, unit, date, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(commodity, city, date) DO UPDATE SET price = excluded.price, source = excluded.source`
    ).bind(price.commodity, price.city, price.price, price.unit, price.date, price.source).run();
  }

  await new Promise(r => setTimeout(r, 10000));
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

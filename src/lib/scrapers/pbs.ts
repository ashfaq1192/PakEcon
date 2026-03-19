/**
 * Pakistan Bureau of Statistics (PBS) Scraper
 *
 * Fetches Weekly SPI commodity prices from PBS website.
 * Skip execution on Mondays (data not yet posted).
 */

interface CommodityPrice {
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
  source: string;
}

const PBS_SPI_URL = 'https://www.pbs.gov.pk/spi-data';

const COMMODITY_MAP: Record<string, { unit: string; key: string }> = {
  'wheat flour': { unit: 'kg', key: 'wheat_flour' },
  'rice basmati': { unit: 'kg', key: 'rice_basmati' },
  'sugar': { unit: 'kg', key: 'sugar' },
  'eggs': { unit: 'dozen', key: 'eggs' },
  'chicken': { unit: 'kg', key: 'chicken' },
  'tomatoes': { unit: 'kg', key: 'tomatoes' },
  'onions': { unit: 'kg', key: 'onions' },
  'potatoes': { unit: 'kg', key: 'potatoes' },
  'lentil': { unit: 'kg', key: 'lentil_mash' },
  'cooking oil': { unit: 'liter', key: 'cooking_oil' },
  'milk': { unit: 'liter', key: 'milk' },
  'tea': { unit: 'kg', key: 'tea' },
  'salt': { unit: 'kg', key: 'salt' },
  'petrol': { unit: 'liter', key: 'petrol' },
  'diesel': { unit: 'liter', key: 'diesel' },
};

function parsePricesFromHtml(html: string, today: string): CommodityPrice[] {
  const prices: CommodityPrice[] = [];
  for (const [name, meta] of Object.entries(COMMODITY_MAP)) {
    const regex = new RegExp(
      `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</td>[^<]*<td[^>]*>([\\d,\\.]+)`,
      'i'
    );
    const match = html.match(regex);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0) {
        prices.push({ commodity: meta.key, city: 'national', price, unit: meta.unit, date: today, source: 'pbs' });
      }
    }
  }
  return prices;
}

// ─── PBS CPI (monthly — published around 4th of each month) ──────────────────

export interface CPIRecord {
  month: string;   // 'YYYY-MM'
  index: number;
  yoy_change: number;
  mom_change: number;
  source: string;
}

const PBS_CPI_URL = 'https://www.pbs.gov.pk/content/consumer-price-index';

function parseCPIFromHtml(html: string): { index: number; yoy: number; mom: number } | null {
  // Typical PBS CPI page — look for the latest YoY % change
  const yoyMatch = html.match(/YoY[^<]*<\/td>[^<]*<td[^>]*>([0-9.]+)/i)
    || html.match(/([0-9]+\.[0-9]+)\s*%\s*YoY/i)
    || html.match(/inflation.*?([0-9]+\.[0-9]+)\s*%/i);
  const indexMatch = html.match(/CPI[^<]*<\/td>[^<]*<td[^>]*>([0-9.]+)/i)
    || html.match(/index.*?([0-9]+\.[0-9]+)/i);

  if (!yoyMatch) return null;

  return {
    yoy: parseFloat(yoyMatch[1]),
    index: indexMatch ? parseFloat(indexMatch[1]) : 0,
    mom: 0, // mom change requires two months of data
  };
}

export async function scrapeCPI(db: D1Database): Promise<CPIRecord | null> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check if CPI already stored for this month
  const existing = await db.prepare(
    `SELECT COUNT(*) as cnt FROM cpi_data WHERE month = ?`
  ).bind(month).first<{ cnt: number }>().catch(() => null);

  if (existing && existing.cnt > 0) {
    const cached = await db.prepare(
      `SELECT month, index_value as index, yoy_change, mom_change, source
       FROM cpi_data ORDER BY month DESC LIMIT 1`
    ).first<CPIRecord>().catch(() => null);
    return cached;
  }

  let record: CPIRecord | null = null;

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(PBS_CPI_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HisaabKar.pk/1.0)', Accept: 'text/html' },
    });
    clearTimeout(tid);
    if (res.ok) {
      const html = await res.text();
      const parsed = parseCPIFromHtml(html);
      if (parsed) {
        record = { month, index: parsed.index, yoy_change: parsed.yoy, mom_change: parsed.mom, source: 'pbs' };
      }
    }
  } catch (err) {
    console.warn('[PBS Scraper] CPI fetch failed:', err);
  }

  // Fallback: store known value so system always has CPI data
  if (!record) {
    record = { month, index: 310.5, yoy_change: 7.0, mom_change: 0.5, source: 'pbs_fallback' };
  }

  await db.prepare(
    `INSERT INTO cpi_data (month, index_value, yoy_change, mom_change, source)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET index_value = excluded.index_value, yoy_change = excluded.yoy_change, source = excluded.source`
  ).bind(record.month, record.index, record.yoy_change, record.mom_change, record.source).run().catch(() => {});

  return record;
}

export async function scrapePBS(db: D1Database): Promise<CommodityPrice[]> {
  // PBS does not post new SPI data on Mondays
  if (new Date().getDay() === 1) {
    console.log('[PBS Scraper] Skipping Monday — data not yet posted');
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(PBS_SPI_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HisaabKar.pk/1.0)', Accept: 'text/html' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`PBS HTTP ${res.status}`);

    const html = await res.text();
    const prices = parsePricesFromHtml(html, today);
    if (prices.length === 0) {
      console.warn('[PBS Scraper] No prices parsed — HTML structure may have changed');
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
    console.error('[PBS Scraper] Error:', err);
    return [];
  }
}

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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PakEcon.ai/1.0)', Accept: 'text/html' },
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

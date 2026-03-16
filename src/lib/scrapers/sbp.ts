/**
 * State Bank of Pakistan (SBP) Scraper
 *
 * Fetches PKR exchange rates by parsing SBP HTML exchange rate page.
 * Falls back to D1 cached data on error.
 */

interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
  source: string;
}

const SBP_RATES_URL = 'https://www.sbp.org.pk/rates/exr_detail.asp';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'CNY', 'CAD', 'AUD', 'JPY', 'RON'];

function parseRatesFromHtml(html: string, today: string): ExchangeRate[] {
  const rates: ExchangeRate[] = [];
  for (const currency of CURRENCIES) {
    // Match currency code in table row, then capture selling/buying rate
    const regex = new RegExp(
      `${currency}[^<]*</td>[^<]*<td[^>]*>[^<]*</td>[^<]*<td[^>]*>([\\d,\\.]+)`,
      'i'
    );
    const match = html.match(regex);
    if (match) {
      const rate = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(rate) && rate > 0) {
        rates.push({ currency, rate, date: today, source: 'sbp' });
      }
    }
  }
  return rates;
}

export async function scrapeExchangeRates(db: D1Database): Promise<ExchangeRate[]> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(SBP_RATES_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PakEcon.ai/1.0)', Accept: 'text/html' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`SBP HTTP ${res.status}`);
    const html = await res.text();
    const rates = parseRatesFromHtml(html, today);
    if (rates.length === 0) throw new Error('No rates parsed from SBP HTML');

    for (const rate of rates) {
      await db.prepare(
        `INSERT INTO exchange_rates (currency, rate, date, source)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(currency, date) DO UPDATE SET rate = excluded.rate, source = excluded.source`
      ).bind(rate.currency, rate.rate, rate.date, rate.source).run();
    }
    await new Promise(r => setTimeout(r, 10000));
    return rates;
  } catch (err) {
    console.error('[SBP Scraper] Falling back to D1 cache:', err);
    const result = await db.prepare(
      `SELECT currency, rate, date, source FROM exchange_rates
       WHERE date = (SELECT MAX(date) FROM exchange_rates) ORDER BY currency`
    ).all<ExchangeRate>();
    return result.results || [];
  }
}

export async function scrapeSBP(db: D1Database): Promise<{ exchangeRates: ExchangeRate[]; timestamp: string }> {
  const exchangeRates = await scrapeExchangeRates(db);
  return { exchangeRates, timestamp: new Date().toISOString() };
}

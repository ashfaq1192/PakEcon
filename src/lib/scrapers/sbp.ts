/**
 * State Bank of Pakistan (SBP) Scraper
 *
 * Fetches PKR exchange rates via open.er-api.com (free, no key required).
 * SBP's website is a JS SPA — not scrapeable from Cloudflare Workers.
 * Falls back to D1 cached data on error.
 */

interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
  source: string;
}

// open.er-api.com: free, no API key, updated daily, has PKR
const ER_API_URL = 'https://open.er-api.com/v6/latest/USD';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'CNY', 'CAD', 'AUD', 'JPY', 'RON'];

export async function scrapeExchangeRates(db: D1Database): Promise<ExchangeRate[]> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(ER_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`ExchangeRate API HTTP ${res.status}`);

    const json = await res.json() as { rates: Record<string, number>; result: string };
    if (json.result !== 'success') throw new Error('ExchangeRate API returned error');

    const usdPkr = json.rates['PKR'];
    if (!usdPkr) throw new Error('PKR rate not found in response');

    const rates: ExchangeRate[] = CURRENCIES.map(currency => {
      // Convert: if currency = USD, rate = usdPkr. Otherwise: PKR/X = usdPkr / usdX
      const rate = currency === 'USD'
        ? usdPkr
        : usdPkr / (json.rates[currency] || 1);
      return { currency, rate: parseFloat(rate.toFixed(4)), date: today, source: 'er-api' };
    });

    for (const rate of rates) {
      await db.prepare(
        `INSERT INTO exchange_rates (currency, rate, date, source)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(currency, date) DO UPDATE SET rate = excluded.rate, source = excluded.source`
      ).bind(rate.currency, rate.rate, rate.date, rate.source).run();
    }
    console.log(`[SBP Scraper] Fetched ${rates.length} rates via ExchangeRate API`);
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

// ─── SBP Policy Rate & KIBOR (monthly check) ─────────────────────────────────

export interface PolicyRate {
  key: string;  // 'policy_rate' | 'kibor_overnight' | 'kibor_1w' | 'kibor_1m' | 'kibor_3m' | 'kibor_6m'
  rate: number;
  date: string;
  source: string;
}

const SBP_POLICY_URL = 'https://www.sbp.org.pk/monpolicy/index.asp';
const SBP_KIBOR_URL = 'https://www.sbp.org.pk/ecodata/kibor.asp';

function parsePolicyRateFromHtml(html: string, today: string): PolicyRate[] {
  const rates: PolicyRate[] = [];

  // Policy rate — look for "Policy Rate" followed by a percentage
  const policyMatch = html.match(/[Pp]olicy\s+[Rr]ate[^<]*<\/td>[^<]*<td[^>]*>([0-9.]+)/i)
    || html.match(/([0-9]+\.[0-9]+)\s*%/);
  if (policyMatch) {
    const rate = parseFloat(policyMatch[1]);
    if (!isNaN(rate) && rate > 0 && rate < 50) {
      rates.push({ key: 'policy_rate', rate, date: today, source: 'sbp' });
    }
  }

  return rates;
}

function parseKIBORFromHtml(html: string, today: string): PolicyRate[] {
  const rates: PolicyRate[] = [];
  const tenors: Array<{ label: string; key: string }> = [
    { label: 'Overnight', key: 'kibor_overnight' },
    { label: '1 Week', key: 'kibor_1w' },
    { label: '1 Month', key: 'kibor_1m' },
    { label: '3 Month', key: 'kibor_3m' },
    { label: '6 Month', key: 'kibor_6m' },
  ];
  for (const tenor of tenors) {
    const regex = new RegExp(
      `${tenor.label}[^<]*</td>[^<]*<td[^>]*>([0-9.]+)`,
      'i'
    );
    const match = html.match(regex);
    if (match) {
      const rate = parseFloat(match[1]);
      if (!isNaN(rate) && rate > 0 && rate < 50) {
        rates.push({ key: tenor.key, rate, date: today, source: 'sbp' });
      }
    }
  }
  return rates;
}

export async function scrapePolicyRates(db: D1Database): Promise<PolicyRate[]> {
  const today = new Date().toISOString().split('T')[0];

  // Policy rate changes monthly at most — skip if we already have data this month
  const monthStart = today.slice(0, 7) + '-01';
  const existing = await db.prepare(
    `SELECT COUNT(*) as cnt FROM policy_rates WHERE key = 'policy_rate' AND date >= ?`
  ).bind(monthStart).first<{ cnt: number }>().catch(() => null);

  if (existing && existing.cnt > 0) {
    console.log('[SBP Scraper] Policy rate already stored for this month — reading from D1');
    const cached = await db.prepare(
      `SELECT key, rate, date, source FROM policy_rates ORDER BY date DESC LIMIT 10`
    ).all<PolicyRate>().catch(() => ({ results: [] }));
    return cached.results || [];
  }

  const all: PolicyRate[] = [];

  // Fetch policy rate
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(SBP_POLICY_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HisaabKar.pk/1.0)', Accept: 'text/html' },
    });
    clearTimeout(tid);
    if (res.ok) {
      const html = await res.text();
      const parsed = parsePolicyRateFromHtml(html, today);
      all.push(...parsed);
    }
  } catch (err) {
    console.warn('[SBP Scraper] Policy rate fetch failed:', err);
    // Insert known fallback value so downstream code always has something
    all.push({ key: 'policy_rate', rate: 10.5, date: today, source: 'sbp_fallback' });
  }

  // Fetch KIBOR
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(SBP_KIBOR_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HisaabKar.pk/1.0)', Accept: 'text/html' },
    });
    clearTimeout(tid);
    if (res.ok) {
      const html = await res.text();
      const parsed = parseKIBORFromHtml(html, today);
      all.push(...parsed);
    }
  } catch (err) {
    console.warn('[SBP Scraper] KIBOR fetch failed:', err);
    // Insert known fallback values
    all.push(
      { key: 'kibor_3m', rate: 11.22, date: today, source: 'sbp_fallback' },
      { key: 'kibor_6m', rate: 11.01, date: today, source: 'sbp_fallback' },
    );
  }

  // Persist to D1
  for (const r of all) {
    await db.prepare(
      `INSERT INTO policy_rates (key, rate, date, source)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key, date) DO UPDATE SET rate = excluded.rate, source = excluded.source`
    ).bind(r.key, r.rate, r.date, r.source).run().catch(() => {});
  }

  return all;
}

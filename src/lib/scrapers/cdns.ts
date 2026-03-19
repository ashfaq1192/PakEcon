/**
 * CDNS (National Savings Pakistan) Rates Scraper
 *
 * Fetches current profit rates for National Savings certificates.
 * Source: savings.gov.pk/profit-rates
 * Rates change monthly — skip if current month already stored.
 */

interface CDNSRate {
  certificate: string; // 'bsc' | 'ric' | 'dsc' | 'ssc' | 'sfwa'
  rate_pa: number;     // annual profit rate (decimal, e.g. 0.096)
  effective_date: string;
  source: string;
}

const CDNS_URL = 'https://www.savings.gov.pk/profit-rates/';

// Known rate map for each certificate (keep as fallback)
const FALLBACK_RATES: Record<string, number> = {
  bsc:  0.096,   // Behbood Savings Certificates
  ric:  0.102,   // Regular Income Certificates
  dsc:  0.1056,  // Defense Savings Certificates
  ssc:  0.105,   // Special Savings Certificates
  sfwa: 0.096,   // Shuhada Family Welfare Account
};

// Certificate name patterns to look for in HTML (use new RegExp to avoid </td> literal parse issues)
const CERT_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'bsc',  pattern: new RegExp('Behbood[^<]*<\\/td>[^<]*<td[^>]*>([0-9.]+)', 'i') },
  { key: 'ric',  pattern: new RegExp('Regular\\s+Income[^<]*<\\/td>[^<]*<td[^>]*>([0-9.]+)', 'i') },
  { key: 'dsc',  pattern: new RegExp('Defense\\s+Savings[^<]*<\\/td>[^<]*<td[^>]*>([0-9.]+)', 'i') },
  { key: 'ssc',  pattern: new RegExp('Special\\s+Savings[^<]*<\\/td>[^<]*<td[^>]*>([0-9.]+)', 'i') },
  { key: 'sfwa', pattern: new RegExp('Shuhada[^<]*<\\/td>[^<]*<td[^>]*>([0-9.]+)', 'i') },
];

function parseCDNSRates(html: string, today: string): CDNSRate[] {
  const rates: CDNSRate[] = [];
  for (const cert of CERT_PATTERNS) {
    const match = html.match(cert.pattern);
    if (match) {
      const pct = parseFloat(match[1]);
      if (!isNaN(pct) && pct > 0 && pct < 50) {
        rates.push({ certificate: cert.key, rate_pa: pct / 100, effective_date: today, source: 'cdns' });
      }
    }
  }
  return rates;
}

export async function scrapeCDNSRates(db: D1Database): Promise<CDNSRate[]> {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  // CDNS rates change monthly at most — skip if already stored this month
  const existing = await db.prepare(
    `SELECT COUNT(*) as cnt FROM cdns_rates WHERE effective_date >= ?`
  ).bind(monthStart).first<{ cnt: number }>().catch(() => null);

  if (existing && existing.cnt > 0) {
    console.log('[CDNS Scraper] Rates already stored for this month — reading from D1');
    const cached = await db.prepare(
      `SELECT certificate, rate_pa, effective_date, source
       FROM cdns_rates
       WHERE effective_date = (SELECT MAX(effective_date) FROM cdns_rates)`
    ).all<CDNSRate>().catch(() => ({ results: [] }));
    return cached.results || [];
  }

  let rates: CDNSRate[] = [];

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(CDNS_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HisaabKar.pk/1.0)', Accept: 'text/html' },
    });
    clearTimeout(tid);
    if (res.ok) {
      const html = await res.text();
      rates = parseCDNSRates(html, today);
      console.log(`[CDNS Scraper] Parsed ${rates.length} certificate rates`);
    }
  } catch (err) {
    console.warn('[CDNS Scraper] Fetch failed:', err);
  }

  // Use fallback rates if scraping failed or returned nothing
  if (rates.length === 0) {
    console.log('[CDNS Scraper] Using fallback rates');
    rates = Object.entries(FALLBACK_RATES).map(([key, rate]) => ({
      certificate: key,
      rate_pa: rate,
      effective_date: today,
      source: 'cdns_fallback',
    }));
  }

  // Persist to D1
  for (const r of rates) {
    await db.prepare(
      `INSERT INTO cdns_rates (certificate, rate_pa, effective_date, source)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(certificate, effective_date) DO UPDATE SET rate_pa = excluded.rate_pa, source = excluded.source`
    ).bind(r.certificate, r.rate_pa, r.effective_date, r.source).run().catch(() => {});
  }

  return rates;
}

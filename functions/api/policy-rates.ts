/**
 * GET /api/policy-rates
 * Returns SBP Policy Rate, KIBOR tenors, CPI, and CDNS National Savings rates.
 * All read from D1 — populated by the scraper agent every 6h.
 * Stale-while-revalidate: returns last known data if today's not yet available.
 */

interface Env {
  DB: D1Database;
}

interface PolicyRateRow {
  key: string;
  rate: number;
  date: string;
  source: string;
}

interface CPIRow {
  month: string;
  index_value: number;
  yoy_change: number;
  mom_change: number;
  source: string;
}

interface CDNSRow {
  certificate: string;
  rate_pa: number;
  effective_date: string;
  source: string;
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;

  try {
    // ── SBP Policy Rate & KIBOR ────────────────────────────────────────────────
    const policyResult = await env.DB.prepare(
      `SELECT key, rate, date, source FROM policy_rates
       ORDER BY date DESC LIMIT 20`
    ).all<PolicyRateRow>();

    const policyRates: Record<string, { rate: number; date: string; source: string }> = {};
    for (const row of policyResult.results || []) {
      if (!policyRates[row.key]) {
        policyRates[row.key] = { rate: row.rate, date: row.date, source: row.source };
      }
    }

    // Fallback: use hardcoded values if D1 has nothing yet
    if (!policyRates['policy_rate']) {
      policyRates['policy_rate'] = { rate: 10.5, date: '2026-03-01', source: 'hardcoded' };
    }
    if (!policyRates['kibor_6m']) {
      policyRates['kibor_6m'] = { rate: 11.01, date: '2026-03-01', source: 'hardcoded' };
    }
    if (!policyRates['kibor_3m']) {
      policyRates['kibor_3m'] = { rate: 11.22, date: '2026-03-01', source: 'hardcoded' };
    }

    // ── PBS CPI ────────────────────────────────────────────────────────────────
    const cpiRow = await env.DB.prepare(
      `SELECT month, index_value, yoy_change, mom_change, source
       FROM cpi_data ORDER BY month DESC LIMIT 1`
    ).first<CPIRow>().catch(() => null);

    const cpi = cpiRow ?? { month: '2026-02', index_value: 310.5, yoy_change: 7.0, mom_change: 0.5, source: 'hardcoded' };

    // ── CDNS National Savings Rates ────────────────────────────────────────────
    const cdnsResult = await env.DB.prepare(
      `SELECT certificate, rate_pa, effective_date, source FROM cdns_rates
       WHERE effective_date = (SELECT MAX(effective_date) FROM cdns_rates)`
    ).all<CDNSRow>().catch(() => ({ results: [] }));

    const cdnsRates: Record<string, { rate_pa: number; effective_date: string; source: string }> = {};
    for (const row of cdnsResult.results || []) {
      cdnsRates[row.certificate] = { rate_pa: row.rate_pa, effective_date: row.effective_date, source: row.source };
    }

    // Hardcoded fallback for CDNS if D1 is empty
    const CDNS_FALLBACK: Record<string, number> = { bsc: 0.096, ric: 0.102, dsc: 0.1056, ssc: 0.105, sfwa: 0.096 };
    for (const [key, rate] of Object.entries(CDNS_FALLBACK)) {
      if (!cdnsRates[key]) {
        cdnsRates[key] = { rate_pa: rate, effective_date: '2026-03-01', source: 'hardcoded' };
      }
    }

    // ── Determine staleness ────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const policyDate = policyRates['policy_rate']?.date ?? '';
    const stale = !policyDate || policyDate < today.slice(0, 7) + '-01';

    return new Response(
      JSON.stringify({ policyRates, cpi, cdnsRates, stale, generatedAt: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // 1-hour browser cache
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch policy rates', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

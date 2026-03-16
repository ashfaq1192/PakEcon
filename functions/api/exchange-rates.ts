/**
 * GET /api/exchange-rates
 * Returns today's PKR exchange rates or most recent with stale flag.
 */

interface Env {
  DB: D1Database;
}

interface ExchangeRateRow {
  currency: string;
  rate: number;
  date: string;
  source: string;
}

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const currencyFilter = url.searchParams.get('currency')?.toUpperCase();

  try {
    const today = new Date().toISOString().split('T')[0];

    let query = `SELECT currency, rate, date, source FROM exchange_rates
      WHERE date = ?
      ORDER BY currency ASC`;
    let params: string[] = [today];

    if (currencyFilter) {
      query = `SELECT currency, rate, date, source FROM exchange_rates
        WHERE date = ? AND currency = ?`;
      params = [today, currencyFilter];
    }

    let result = await env.DB.prepare(query).bind(...params).all<ExchangeRateRow>();
    let stale = false;

    // Fallback: return most recent if no data today
    if (!result.results || result.results.length === 0) {
      stale = true;
      const fallback = currencyFilter
        ? `SELECT currency, rate, date, source FROM exchange_rates
           WHERE currency = ? ORDER BY date DESC LIMIT 1`
        : `SELECT currency, rate, date, source FROM exchange_rates
           WHERE date = (SELECT MAX(date) FROM exchange_rates)
           ORDER BY currency ASC`;
      const fbParams = currencyFilter ? [currencyFilter] : [];
      result = await env.DB.prepare(fallback).bind(...fbParams).all<ExchangeRateRow>();
    }

    const rates = result.results || [];
    const updatedAt = rates.length > 0 ? rates[0].date : null;

    return new Response(
      JSON.stringify({ rates, stale, updatedAt }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch exchange rates', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

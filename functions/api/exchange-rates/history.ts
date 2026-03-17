/**
 * GET /api/exchange-rates/history?currency=USD
 * Returns 30-day D1 history for specified currency pair.
 */

interface Env {
  DB: D1Database;
}

interface RateRow {
  currency: string;
  rate: number;
  date: string;
  source: string;
}

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const currency = url.searchParams.get('currency')?.toUpperCase();

  if (!currency) {
    return new Response(
      JSON.stringify({ error: 'currency query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await env.DB.prepare(`
      SELECT currency, rate, date, source
      FROM exchange_rates
      WHERE currency = ?
        AND date >= date('now', '-30 days')
      ORDER BY date ASC
    `).bind(currency).all<RateRow>();

    const history = result.results || [];

    return new Response(
      JSON.stringify({ currency, history }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch history', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

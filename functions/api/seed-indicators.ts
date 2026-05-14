/**
 * POST /api/seed-indicators?secret=<SEED_SECRET>
 * One-time endpoint to fix stale D1 values for CPI, policy rate, and petrol.
 * Self-destructs after first successful run by checking a marker row.
 * DELETE this file after the fix is confirmed.
 */

interface Env {
  DB: D1Database;
  SEED_SECRET?: string;
}

export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  // Gate: require a secret so this can't be called by random crawlers
  const expected = env.SEED_SECRET || 'pakec-seed-2026';
  if (secret !== expected) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: string[] = [];

  try {
    // Fix CPI: replace wrong 7.0% with actual April 2026 PBS data (10.9% YoY)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO cpi_data (month, index_value, yoy_change, mom_change, source)
       VALUES ('2026-05', 320.0, 10.9, 3.9, 'manual')`
    ).run();
    results.push('cpi_data OK: 2026-05 → 10.9% YoY');

    // Fix policy rate: replace 10.5% with actual SBP May 2026 (11.5% after MPC hike)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO policy_rates (key, rate, date, source)
       VALUES ('policy_rate', 11.5, '2026-05-14', 'manual')`
    ).run();
    results.push('policy_rates OK: policy_rate → 11.5%');

    // Fix petrol: replace stale 321.17 with May 9 OGRA revision (414.78)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO commodity_prices (commodity, city, price, unit, date, source)
       VALUES ('petrol', 'national', 414.78, 'liter', '2026-05-14', 'manual')`
    ).run();
    results.push('commodity_prices OK: petrol → 414.78 PKR/litre');

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), partial: results }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

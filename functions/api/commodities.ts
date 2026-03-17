/**
 * GET /api/commodities
 * Returns commodity prices from D1. Supports ?city=, ?commodity=, ?limit=
 */

interface Env {
  DB: D1Database;
}

interface CommodityRow {
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
  source: string;
}

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const city = url.searchParams.get('city')?.toLowerCase();
  const commodity = url.searchParams.get('commodity')?.toLowerCase();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  try {
    const conditions: string[] = ['date = (SELECT MAX(date) FROM commodity_prices)'];
    const params: (string | number)[] = [];

    if (city) {
      conditions.push('city = ?');
      params.push(city);
    }
    if (commodity) {
      conditions.push('commodity = ?');
      params.push(commodity);
    }

    params.push(limit);

    const query = `SELECT commodity, city, price, unit, date, source
      FROM commodity_prices
      WHERE ${conditions.join(' AND ')}
      ORDER BY commodity, city
      LIMIT ?`;

    const result = await env.DB.prepare(query).bind(...params).all<CommodityRow>();
    const commodities = result.results || [];
    const updatedAt = commodities.length > 0 ? commodities[0].date : null;

    return new Response(
      JSON.stringify({ commodities, updatedAt }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch commodities', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

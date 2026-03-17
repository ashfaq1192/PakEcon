/**
 * GET /api/gold-price
 * Returns current gold and silver prices with Nisab thresholds + 30-day history.
 * Nisab silver basis: 612.36 grams; Gold basis: 87.48 grams (AAOIFI standard)
 */

interface Env {
  DB: D1Database;
}

interface PriceRow {
  commodity: string;
  price: number;
  unit: string;
  date: string;
  source: string;
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;

  try {
    // Current prices
    const currentResult = await env.DB.prepare(`
      SELECT commodity, price, unit, date, source
      FROM commodity_prices
      WHERE commodity IN ('24k_gold_tola','24k_gold_gram','silver_gram','silver_tola')
        AND date = (SELECT MAX(date) FROM commodity_prices WHERE commodity = '24k_gold_gram')
    `).all<PriceRow>();

    const prices: Record<string, PriceRow> = {};
    for (const row of currentResult.results || []) {
      prices[row.commodity] = row;
    }

    const goldPerGram = prices['24k_gold_gram']?.price ?? null;
    const goldPerTola = prices['24k_gold_tola']?.price ?? null;
    const silverPerGram = prices['silver_gram']?.price ?? null;

    // Nisab thresholds (PKR)
    const nisabSilverPKR = silverPerGram ? silverPerGram * 612.36 : null;
    const nisabGoldPKR = goldPerGram ? goldPerGram * 87.48 : null;

    // 30-day history for gold per gram
    const historyResult = await env.DB.prepare(`
      SELECT commodity, price, unit, date, source
      FROM commodity_prices
      WHERE commodity = '24k_gold_gram'
        AND date >= date('now', '-30 days')
      ORDER BY date ASC
    `).all<PriceRow>();

    const history = historyResult.results || [];
    const updatedAt = goldPerGram ? prices['24k_gold_gram'].date : null;

    return new Response(
      JSON.stringify({
        goldPerGram,
        goldPerTola,
        silverPerGram,
        nisabSilverPKR,
        nisabGoldPKR,
        updatedAt,
        history,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch gold price', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

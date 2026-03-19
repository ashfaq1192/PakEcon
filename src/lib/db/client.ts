/**
 * D1 Database Client Wrapper
 *
 * Provides type-safe database operations for HisaabKar.pk
 * Handles exchange rates, commodity prices, tax slabs, and market insights
 */

import type { D1Database } from '@cloudflare/workers-types';

// Type definitions
export interface ExchangeRate {
  id?: number;
  currency: string;
  rate: number;
  date: string;
  source: string;
  created_at?: string;
}

export interface CommodityPrice {
  id?: number;
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
  source: string;
  created_at?: string;
}

export interface TaxSlab {
  id?: number;
  year: number;
  min_income: number;
  max_income?: number;
  rate: number;
  fixed_tax: number;
  effective_from: string;
}

export interface MarketInsight {
  id?: number;
  title: string;
  content: string;
  summary: string;
  delta: number;
  indicators: string[] | string; // stored as JSON string in D1, parsed on read
  published: boolean;
  created_at?: string;
}

export class D1Client {
  constructor(private db: D1Database) {}

  // Exchange Rate Operations
  async upsertExchangeRate(data: Omit<ExchangeRate, 'id' | 'created_at'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO exchange_rates (currency, rate, date, source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(currency, date) DO UPDATE SET
        rate = excluded.rate,
        source = excluded.source
    `);
    await stmt.bind(data.currency, data.rate, data.date, data.source).run();
  }

  async getLatestExchangeRates(limit = 10): Promise<ExchangeRate[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM exchange_rates
      ORDER BY date DESC, id DESC
      LIMIT ?
    `);
    const result = await stmt.bind(limit).all<ExchangeRate>();
    return result.results || [];
  }

  async getExchangeRate(currency: string, date: string): Promise<ExchangeRate | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM exchange_rates
      WHERE currency = ? AND date = ?
    `);
    const result = await stmt.bind(currency, date).first<ExchangeRate>();
    return result || null;
  }

  async getHistoricalExchangeRate(
    currency: string,
    daysBack: number
  ): Promise<ExchangeRate[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM exchange_rates
      WHERE currency = ? AND date >= date('now', ?)
      ORDER BY date ASC
    `);
    const result = await stmt.bind(currency, `-${daysBack} days`).all<ExchangeRate>();
    return result.results || [];
  }

  // Commodity Price Operations
  async upsertCommodityPrice(data: Omit<CommodityPrice, 'id' | 'created_at'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO commodity_prices (commodity, city, price, unit, date, source)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(commodity, city, date) DO UPDATE SET
        price = excluded.price,
        unit = excluded.unit,
        source = excluded.source
    `);
    await stmt.bind(
      data.commodity,
      data.city,
      data.price,
      data.unit,
      data.date,
      data.source
    ).run();
  }

  async getLatestCommodityPrices(commodity?: string, city?: string): Promise<CommodityPrice[]> {
    let query = `SELECT * FROM commodity_prices`;
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (commodity) {
      conditions.push('commodity = ?');
      bindings.push(commodity);
    }
    if (city) {
      conditions.push('city = ?');
      bindings.push(city);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, id DESC LIMIT 50';

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...bindings).all<CommodityPrice>();
    return result.results || [];
  }

  async getCommodityPricesByDate(date: string): Promise<CommodityPrice[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM commodity_prices
      WHERE date = ?
      ORDER BY city, commodity
    `);
    const result = await stmt.bind(date).all<CommodityPrice>();
    return result.results || [];
  }

  // Tax Slab Operations
  async upsertTaxSlab(data: Omit<TaxSlab, 'id'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO tax_slabs (year, min_income, max_income, rate, fixed_tax, effective_from)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(year, min_income) DO UPDATE SET
        max_income = excluded.max_income,
        rate = excluded.rate,
        fixed_tax = excluded.fixed_tax,
        effective_from = excluded.effective_from
    `);
    await stmt.bind(
      data.year,
      data.min_income,
      data.max_income ?? null,
      data.rate,
      data.fixed_tax,
      data.effective_from
    ).run();
  }

  async getTaxSlabs(year: number): Promise<TaxSlab[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM tax_slabs
      WHERE year = ?
      ORDER BY min_income ASC
    `);
    const result = await stmt.bind(year).all<TaxSlab>();
    return result.results || [];
  }

  // Market Insight Operations
  async createMarketInsight(data: Omit<MarketInsight, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO market_insights (title, content, summary, delta, indicators, published)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt.bind(
      data.title,
      data.content,
      data.summary,
      data.delta,
      JSON.stringify(data.indicators),
      data.published
    ).run();

    if (result.meta?.last_row_id) {
      return result.meta.last_row_id;
    }
    throw new Error('Failed to create market insight');
  }

  async getPublishedInsights(limit = 10): Promise<MarketInsight[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM market_insights
      WHERE published = true
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const result = await stmt.bind(limit).all<MarketInsight>();
    return (result.results || []).map(insight => ({
      ...insight,
      indicators: JSON.parse(insight.indicators as string)
    }));
  }

  async getAllInsights(): Promise<MarketInsight[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM market_insights
      ORDER BY created_at DESC
    `);
    const result = await stmt.all<MarketInsight>();
    return (result.results || []).map(insight => ({
      ...insight,
      indicators: JSON.parse(insight.indicators as string)
    }));
  }

  async updateInsightPublished(id: number, published: boolean): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE market_insights SET published = ? WHERE id = ?
    `);
    await stmt.bind(published ? 1 : 0, id).run();
  }

  // Bulk Operations
  async bulkUpsertExchangeRates(rates: Omit<ExchangeRate, 'id' | 'created_at'>[]): Promise<void> {
    for (const rate of rates) {
      await this.upsertExchangeRate(rate);
    }
  }

  async bulkUpsertCommodityPrices(prices: Omit<CommodityPrice, 'id' | 'created_at'>[]): Promise<void> {
    for (const price of prices) {
      await this.upsertCommodityPrice(price);
    }
  }

  // ─── New helpers (migration 002) ─────────────────────────────────────────

  async getLatestExchangeRate(currency: string): Promise<ExchangeRate | null> {
    const result = await this.db.prepare(`
      SELECT * FROM exchange_rates
      WHERE currency = ?
      ORDER BY date DESC LIMIT 1
    `).bind(currency).first<ExchangeRate>();
    return result ?? null;
  }

  async getLatestCommodity(commodity: string, city: string): Promise<CommodityPrice | null> {
    const result = await this.db.prepare(`
      SELECT * FROM commodity_prices
      WHERE commodity = ? AND city = ?
      ORDER BY date DESC LIMIT 1
    `).bind(commodity, city).first<CommodityPrice>();
    return result ?? null;
  }

  async insertAgentLog(log: {
    workflow_id: string;
    stage: string;
    status: string;
    message?: string;
    duration_ms?: number;
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO agent_logs (workflow_id, stage, status, message, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `).bind(log.workflow_id, log.stage, log.status, log.message ?? null, log.duration_ms ?? null).run();
  }

  async getExchangeRateHistory(currency: string, days: number): Promise<ExchangeRate[]> {
    const result = await this.db.prepare(`
      SELECT * FROM exchange_rates
      WHERE currency = ? AND date >= date('now', ?)
      ORDER BY date ASC
    `).bind(currency, `-${days} days`).all<ExchangeRate>();
    return result.results || [];
  }

  async getGoldSilverPrices(): Promise<{ gold: CommodityPrice | null; silver: CommodityPrice | null }> {
    const gold = await this.getLatestCommodity('24k_gold_gram', 'national');
    const silver = await this.getLatestCommodity('silver_gram', 'national');
    return { gold, silver };
  }

  async updateInsightSocialIds(id: number, updates: {
    telegram_message_id?: string;
    twitter_post_id?: string;
    generated_by?: string;
    category?: string;
  }): Promise<void> {
    const sets: string[] = [];
    const values: (string | number)[] = [];
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.db.prepare(
      `UPDATE market_insights SET ${sets.join(', ')} WHERE id = ?`
    ) as any).bind(...values).run();
  }
}

// Helper function to create D1 client from Astro/Cloudflare context
export function createDBClient(db: D1Database): D1Client {
  return new D1Client(db);
}

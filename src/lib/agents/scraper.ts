/**
 * Scraper Agent (Agent A: Researcher)
 *
 * Fetches economic data from official Pakistani sources.
 * Each scraper has its own try/catch — one failure does not stop others.
 */

import type { ScrapedData, AgentLog, HistoricalData, Env } from './types';
import { scrapeExchangeRates, scrapePolicyRates } from '../scrapers/sbp';
import { scrapePBS, scrapeCPI } from '../scrapers/pbs';
import { scrapeOGRA, scrapeGoldPrices } from '../scrapers/commodities';
import { scrapeCDNSRates } from '../scrapers/cdns';

export async function scraperAgent(
  state: { agentLog: AgentLog[]; env: Env; workflowId: string },
  db: D1Database
): Promise<Partial<{ scrapedData: ScrapedData; historicalData: HistoricalData; stage: string; agentLog: AgentLog[] }>> {
  const agentLog: AgentLog[] = [];
  const { workflowId } = state;

  await db.prepare(
    `INSERT INTO agent_logs (workflow_id, stage, status) VALUES (?, ?, ?)`
  ).bind(workflowId, 'scraper', 'running').run().catch(() => {});

  // ── Load historical data (for delta calculation in analyst) ──────────────────
  const historicalData = await loadHistoricalData(db);

  // ── SBP exchange rates ────────────────────────────────────────────────────────
  let exchangeRates: Array<{ currency: string; rate: number; date: string }> = [];
  try {
    exchangeRates = await scrapeExchangeRates(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${exchangeRates.length} exchange rates`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'SBP failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── PBS SPI commodities ───────────────────────────────────────────────────────
  let pbsPrices: Array<{ commodity: string; city: string; price: number; unit: string; date: string }> = [];
  try {
    pbsPrices = await scrapePBS(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${pbsPrices.length} PBS prices`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'PBS failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── OGRA petrol prices ────────────────────────────────────────────────────────
  let ograPrices: Array<{ commodity: string; city: string; price: number; unit: string; date: string }> = [];
  try {
    ograPrices = await scrapeOGRA(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${ograPrices.length} OGRA fuel prices`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'OGRA failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── Gold/Silver prices ────────────────────────────────────────────────────────
  let goldPrices: Array<{ commodity: string; city: string; price: number; unit: string; date: string }> = [];
  try {
    goldPrices = await scrapeGoldPrices(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${goldPrices.length} gold/silver prices`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'Gold scraper failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── SBP Policy Rate & KIBOR (monthly check) ───────────────────────────────────
  try {
    const policyRates = await scrapePolicyRates(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${policyRates.length} SBP policy/KIBOR rates`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'SBP policy rate failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── PBS CPI (monthly) ─────────────────────────────────────────────────────────
  let cpiRecord: { index: number; change: number; date: string } = { index: 0, change: 0, date: new Date().toISOString().split('T')[0] };
  try {
    const cpi = await scrapeCPI(db);
    if (cpi) {
      cpiRecord = { index: cpi.index, change: cpi.yoy_change, date: cpi.month + '-01' };
      agentLog.push({ agent: 'scraper', action: `CPI: ${cpi.yoy_change}% YoY (${cpi.month})`, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'PBS CPI failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // ── CDNS National Savings rates (monthly) ────────────────────────────────────
  try {
    const cdnsRates = await scrapeCDNSRates(db);
    agentLog.push({ agent: 'scraper', action: `fetched ${cdnsRates.length} CDNS NS rates`, timestamp: new Date().toISOString() });
  } catch (err) {
    agentLog.push({ agent: 'scraper', action: 'CDNS rates failed', timestamp: new Date().toISOString(), error: String(err) });
  }

  // Separate gold vs silver vs petrol for CommodityData structure
  const gold = goldPrices.filter(p => p.commodity.includes('gold'));
  const silver = goldPrices.filter(p => p.commodity.includes('silver'));
  const petrol = ograPrices.filter(p => p.commodity === 'petrol' || p.commodity === 'diesel_hsd');
  const agricultural = pbsPrices;

  const scrapedData: ScrapedData = {
    exchangeRates: exchangeRates.map(r => ({ ...r, source: 'sbp' } as typeof r & { source: string })) as typeof exchangeRates,
    cpi: cpiRecord,
    taxUpdates: [],
    commodities: { gold, silver, petrol, diesel: [], agricultural },
    timestamp: new Date().toISOString(),
  };

  await db.prepare(
    `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, ?, ?, ?)`
  ).bind(workflowId, 'scraper', 'completed', `Scraped ${exchangeRates.length} FX rates, ${pbsPrices.length + ograPrices.length + goldPrices.length} commodity prices`).run().catch(() => {});

  return {
    scrapedData,
    historicalData,
    stage: 'analyst',
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

async function loadHistoricalData(db: D1Database): Promise<HistoricalData> {
  const exchangeRatesMap = new Map<string, Array<{ rate: number; date: string }>>();
  const commodityHistoryMap = new Map<string, Array<{ price: number; date: string }>>();

  try {
    const fxRows = await db.prepare(
      `SELECT currency, rate, date FROM exchange_rates
       WHERE date >= date('now', '-7 days') ORDER BY date DESC`
    ).all<{ currency: string; rate: number; date: string }>();
    for (const row of fxRows.results || []) {
      if (!exchangeRatesMap.has(row.currency)) exchangeRatesMap.set(row.currency, []);
      exchangeRatesMap.get(row.currency)!.push({ rate: row.rate, date: row.date });
    }
  } catch { /* non-blocking */ }

  try {
    const cRows = await db.prepare(
      `SELECT commodity, city, price, date FROM commodity_prices
       WHERE date >= date('now', '-7 days') ORDER BY date DESC`
    ).all<{ commodity: string; city: string; price: number; date: string }>();
    for (const row of cRows.results || []) {
      const key = `${row.commodity}-${row.city}`;
      if (!commodityHistoryMap.has(key)) commodityHistoryMap.set(key, []);
      commodityHistoryMap.get(key)!.push({ price: row.price, date: row.date });
    }
  } catch { /* non-blocking */ }

  return { exchangeRates: exchangeRatesMap as unknown as Map<string, import('./types').ExchangeRate[]>, cpiHistory: [], commodityHistory: commodityHistoryMap as unknown as Map<string, import('./types').CommodityPrice[]> };
}

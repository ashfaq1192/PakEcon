/**
 * Agent Types and State Management
 *
 * Shared types for the agent swarm workflow
 * Uses KV for state persistence as alternative to non-existent Cloudflare Agents SDK
 */

export interface ScrapedData {
  exchangeRates: ExchangeRate[];
  cpi: CPIData;
  taxUpdates: TaxPolicyUpdate[];
  commodities: CommodityData;
  timestamp: string;
}

export interface ExchangeRate {
  currency: string;
  rate: number;
  date: string;
}

export interface CPIData {
  index: number;
  change: number;
  date: string;
}

export interface TaxPolicyUpdate {
  title: string;
  summary: string;
  date: string;
  url?: string;
}

export interface CommodityData {
  gold: CommodityPrice[];
  silver: CommodityPrice[];
  petrol: CommodityPrice[];
  diesel: CommodityPrice[];
  agricultural: CommodityPrice[];
}

export interface CommodityPrice {
  commodity: string;
  city: string;
  price: number;
  unit: string;
  date: string;
}

export interface HistoricalData {
  exchangeRates: Map<string, ExchangeRate[]>;
  cpiHistory: CPIData[];
  commodityHistory: Map<string, CommodityPrice[]>;
}

export interface MarketInsight {
  id?: number;
  title: string;
  content: string;
  summary: string;
  delta: number;
  indicators: string[];
  citations: Citation[];
  category: 'market_insight' | 'weekly_digest' | 'budget_alert' | 'policy_update';
  generated_by?: string;
  twitter_post_id?: string;
  telegram_message_id?: string;
  date: string;
  slug: string;
  source: string;
  published: boolean;
}

export interface Citation {
  source: string;
  url: string;
}

export interface AgentLog {
  agent: string;
  action: string;
  timestamp: string;
  error?: string;
}

export type AgentStage = 'scraper' | 'analyst' | 'topic_writer' | 'chief_editor' | 'publisher' | 'social' | 'complete' | 'error';

export interface AgentState {
  scrapedData: ScrapedData | null;
  historicalData: HistoricalData | null;
  insights: MarketInsight[];
  stage: AgentStage;
  agentLog: AgentLog[];
  publishedCount: number;
  error?: string;
}

export interface ScraperResult {
  scrapedData: ScrapedData;
  agentLog: AgentLog[];
}

export interface AnalystResult {
  insights: MarketInsight[];
  agentLog: AgentLog[];
}

export interface PublisherResult {
  publishedCount: number;
  agentLog: AgentLog[];
}

/** Cloudflare Workers Env — all bindings and secrets */
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AGENT_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GROQ_API_KEY: string;
  OPENAI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SERVICE_ACCOUNT?: string;
  NEWSLETTER_SECRET: string;
  HUMAN_REVIEW_MODE: string;
  TWITTER_ENABLED: string;
  TELEGRAM_ENABLED: string;
  ENVIRONMENT: string;
}

/** D1 agent_logs row for stage-level tracking */
export interface AgentLogRow {
  workflow_id: string;
  stage: string;
  status: 'running' | 'completed' | 'error' | 'skipped';
  message?: string;
  duration_ms?: number;
}

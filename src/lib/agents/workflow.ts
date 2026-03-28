/**
 * Agent Workflow Orchestrator
 *
 * Coordinates the sequential execution of:
 * 1. Scraper Agent (A) — fetch economic data (rates, commodities, CPI)
 * 2. Analyst Agent (B) — generate LLM insights from scraped data
 * 3. News Scraper Agent (G) — scrape RSS feeds (Dawn, BR, ARY, Tribune)
 * 4. News Writer Agent (H) — generate flagship ~1500-word news article (12h rate-limited)
 * 5. Topic Writer Agent (E) — generate 1 evergreen SEO article per run
 * 6. Chief Editor Agent (F) — enhance ALL insights for SEO before publishing
 * 7. Publisher Agent (C) — commit MDX to GitHub
 * 8. Social Agent (D) — post to Telegram
 */

import type { AgentState, AgentLog, MarketInsight, Env } from './types';
import { scraperAgent } from './scraper';
import { analystAgent } from './analyst';
import { newsScraperAgent } from './newsScraper';
import { newsWriterAgent } from './newsWriter';
import { topicWriterAgent } from './topicWriter';
import { chiefEditorAgent } from './chiefEditor';
import { publisherAgent } from './publisher';

export interface WorkflowState extends AgentState {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowResult {
  success: boolean;
  state: WorkflowState;
  error?: string;
}

function createInitialState(): WorkflowState {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scrapedData: null,
    historicalData: null,
    insights: [],
    stage: 'scraper',
    agentLog: [],
    publishedCount: 0,
  };
}

export async function executeWorkflow(db: D1Database, kv: KVNamespace, env: Env): Promise<WorkflowResult> {
  const state: WorkflowState = createInitialState();
  const workflowId = state.id;

  // Save initial state to KV
  try {
    await kv.put(`workflow:${workflowId}`, JSON.stringify(state), { expirationTtl: 3600 });
  } catch {
    console.error('[Workflow] KV unavailable — proceeding without state persistence');
  }

  try {
    // ── Stage 1: Scraper ──────────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: scraper`);
    let scraperResult: Partial<WorkflowState>;
    try {
      scraperResult = await scraperAgent({ ...state, env, workflowId }, db) as Partial<WorkflowState>;
    } catch (err) {
      return { success: false, state: { ...state, stage: 'error', error: String(err) }, error: String(err) };
    }
    Object.assign(state, scraperResult, { stage: 'analyst', updatedAt: new Date().toISOString() });

    // ── Stage 2: Analyst ──────────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: analyst`);
    let analystResult: Partial<WorkflowState>;
    try {
      analystResult = await analystAgent({ ...state, env, workflowId }) as Partial<WorkflowState>;
    } catch (err) {
      console.error('[Workflow] Analyst error (non-fatal):', err);
      analystResult = { insights: [], agentLog: state.agentLog };
    }
    Object.assign(state, analystResult, { stage: 'news_scraper', updatedAt: new Date().toISOString() });

    // ── Stage 3: News Scraper ─────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: news_scraper`);
    let newsStories: import('./newsScraper').NewsStory[] = [];
    try {
      const newsScraperResult = await newsScraperAgent({ env, workflowId, agentLog: state.agentLog });
      newsStories = newsScraperResult.stories;
      state.agentLog = newsScraperResult.agentLog;
    } catch (err) {
      console.error('[Workflow] News Scraper error (non-fatal):', err);
    }
    Object.assign(state, { stage: 'news_writer', updatedAt: new Date().toISOString() });

    // ── Stage 4: News Writer ──────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: news_writer`);
    try {
      const newsWriterResult = await newsWriterAgent({
        stories: newsStories,
        env,
        workflowId,
        agentLog: state.agentLog,
      });
      state.insights = [...(state.insights || []), ...(newsWriterResult.insights || [])];
      state.agentLog = newsWriterResult.agentLog;
    } catch (err) {
      console.error('[Workflow] News Writer error (non-fatal):', err);
    }
    Object.assign(state, { stage: 'topic_writer', updatedAt: new Date().toISOString() });

    // ── Stage 5: Topic Writer ─────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: topic_writer`);
    try {
      const topicResult = await topicWriterAgent({ env, workflowId, agentLog: state.agentLog });
      // Merge topic article(s) into the existing insights array
      state.insights = [...(state.insights || []), ...(topicResult.insights || [])];
      state.agentLog = topicResult.agentLog;
    } catch (err) {
      console.error('[Workflow] Topic Writer error (non-fatal):', err);
    }
    Object.assign(state, { stage: 'chief_editor', updatedAt: new Date().toISOString() });

    // ── Stage 6: Chief Editor ─────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: chief_editor`);
    try {
      const editorResult = await chiefEditorAgent({
        insights: state.insights,
        env,
        workflowId,
        agentLog: state.agentLog,
      });
      // Replace insights with SEO-enhanced versions (fallback to originals on error)
      state.insights = editorResult.insights;
      state.agentLog = editorResult.agentLog;
    } catch (err) {
      console.error('[Workflow] Chief Editor error (non-fatal):', err);
    }
    Object.assign(state, { stage: 'publisher', updatedAt: new Date().toISOString() });

    // ── Stage 7: Publisher ────────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: publisher`);
    let publisherResult: Partial<WorkflowState>;
    try {
      publisherResult = await publisherAgent({ ...state, env, workflowId }) as Partial<WorkflowState>;
    } catch (err) {
      console.error('[Workflow] Publisher error (non-fatal):', err);
      publisherResult = { publishedCount: 0, agentLog: state.agentLog };
    }
    Object.assign(state, publisherResult, { stage: 'social', updatedAt: new Date().toISOString() });

    // ── Stage 8: Social (Telegram) ────────────────────────────────────────────
    if (env.TELEGRAM_ENABLED === 'true' && state.insights.length > 0) {
      console.log(`[Workflow ${workflowId}] Stage: social`);
      try {
        const { postToTelegram } = await import('./social');
        for (const insight of state.insights.filter((i: MarketInsight) => i.published)) {
          await postToTelegram(insight, env);
        }
      } catch (err) {
        console.warn('[Workflow] Social stage error (non-fatal):', err);
      }
    }

    Object.assign(state, { stage: 'complete', updatedAt: new Date().toISOString() });

    // Persist final state
    try {
      await kv.put(`workflow:${workflowId}`, JSON.stringify(state), { expirationTtl: 3600 });
    } catch { /* non-blocking */ }

    return { success: true, state };

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Object.assign(state, { stage: 'error', error, updatedAt: new Date().toISOString() });
    return { success: false, state, error };
  }
}

export async function getWorkflowStatus(id: string, kv: KVNamespace): Promise<WorkflowState | null> {
  try {
    const data = await kv.get(`workflow:${id}`);
    return data ? JSON.parse(data) as WorkflowState : null;
  } catch {
    return null;
  }
}

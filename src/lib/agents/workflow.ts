/**
 * Agent Workflow Orchestrator
 *
 * Coordinates the sequential execution of:
 * 1. Scraper Agent (A) — fetch economic data
 * 2. Analyst Agent (B) — generate LLM insights from scraped data
 * 3. Topic Writer Agent (E) — generate 1 SEO article per run (rotating schedule)
 * 4. Chief Editor Agent (F) — enhance ALL insights for SEO before publishing
 * 5. Publisher Agent (C) — commit MDX to GitHub
 * 6. Social Agent (D) — post to Telegram
 */

import type { AgentState, AgentLog, MarketInsight, Env } from './types';
import { scraperAgent } from './scraper';
import { analystAgent } from './analyst';
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
    Object.assign(state, analystResult, { stage: 'topic_writer', updatedAt: new Date().toISOString() });

    // ── Stage 3: Topic Writer ─────────────────────────────────────────────────
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

    // ── Stage 4: Chief Editor ─────────────────────────────────────────────────
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

    // ── Stage 5: Publisher ────────────────────────────────────────────────────
    console.log(`[Workflow ${workflowId}] Stage: publisher`);
    let publisherResult: Partial<WorkflowState>;
    try {
      publisherResult = await publisherAgent({ ...state, env, workflowId }) as Partial<WorkflowState>;
    } catch (err) {
      console.error('[Workflow] Publisher error (non-fatal):', err);
      publisherResult = { publishedCount: 0, agentLog: state.agentLog };
    }
    Object.assign(state, publisherResult, { stage: 'social', updatedAt: new Date().toISOString() });

    // ── Stage 6: Social (Telegram) ────────────────────────────────────────────
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

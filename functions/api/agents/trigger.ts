/**
 * Agent Trigger Endpoint
 *
 * Entry point for the agent swarm workflow.
 * Triggered by Cloudflare Cron or manual POST with Bearer token.
 *
 * Rate limiting note: This project shares Muhammad's Cloudflare free tier quota
 * with 2 other sites. The workflow uses ctx.waitUntil() to:
 * 1. Return a 202 Accepted immediately (freeing the Worker request slot)
 * 2. Run the actual scraper+analyst+publisher pipeline as a background task
 *
 * The 10-second delays between scrapers are for respecting external site
 * rate limits (SBP, PBS, OGRA, BRecorder) — NOT Cloudflare rate limits.
 * At 4 cron runs/day these sites see ~4 requests/day from us.
 */

import { executeWorkflow } from '../../../src/lib/agents/workflow';
import type { Env } from '../../../src/lib/agents/types';

type PagesContext = { env: Env; request: Request; waitUntil?: (promise: Promise<unknown>) => void };

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.AGENT_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workflowId = crypto.randomUUID();

  // Return 202 immediately — run workflow as background task via waitUntil.
  // This keeps the Cloudflare Worker slot free and avoids hitting the
  // 30-second wall-clock limit while scrapers are rate-limiting themselves.
  if (context.waitUntil) {
    context.waitUntil(
      executeWorkflow(env.DB, env.KV, env).catch(err =>
        console.error('[Trigger] Background workflow error:', err)
      )
    );
  } else {
    // Fallback for environments without waitUntil (local dev)
    executeWorkflow(env.DB, env.KV, env).catch(err =>
      console.error('[Trigger] Workflow error:', err)
    );
  }

  return new Response(
    JSON.stringify({ accepted: true, workflowId, message: 'Workflow started in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

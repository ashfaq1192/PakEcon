/**
 * HTTP Trigger Endpoint for Agent Swarm
 *
 * Allows GitHub Actions (and other authorized callers) to trigger the
 * full agent workflow via HTTP POST.
 *
 * Authorization: Bearer <AGENT_SECRET>
 */

import type { Env } from '../../src/lib/agents/types';
import { executeWorkflow } from '../../src/lib/agents/workflow';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const env = ctx.env;

  // Auth check
  const auth = ctx.request.headers.get('Authorization') ?? '';
  if (!env.AGENT_SECRET || auth !== `Bearer ${env.AGENT_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflowId = crypto.randomUUID();

  // Run in background — respond immediately so GitHub Actions doesn't time out
  ctx.waitUntil(
    executeWorkflow(env.DB, env.KV, env)
      .then(result => {
        console.log('[Trigger] Workflow complete', {
          workflowId,
          success: result.success,
          published: result.state.publishedCount,
        });
      })
      .catch(err => {
        console.error('[Trigger] Workflow error:', err);
      })
  );

  return Response.json(
    {
      workflowId,
      status: 'triggered',
      message: 'Agent swarm started in background',
    },
    { status: 202 }
  );
};

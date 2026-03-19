/**
 * Cron Trigger Handler (T060 updated)
 *
 * Scheduled function that triggers the agent swarm via Cloudflare Cron.
 * Runs every 6 hours as configured in wrangler.toml.
 *
 * Rate limiting context:
 * - This account has 2 other Cloudflare sites — shared 100k requests/day quota.
 * - This cron fires 4×/day = 4 Worker invocations total (negligible).
 * - The scraper's 10s inter-request delays are for external site politeness,
 *   not Cloudflare quota management.
 * - ctx.waitUntil() is used to keep wall-clock time within limits while
 *   allowing the background scraper pipeline to complete fully.
 *
 * Weekly Digest logic:
 * - Runs only on Mondays between 03:00–09:00 UTC (08:00–14:00 PKT)
 * - Checks D1 to avoid duplicate digest within the same week
 */

import type { Env } from '../../src/lib/agents/types';
import { executeWorkflow } from '../../src/lib/agents/workflow';

async function maybeRunWeeklyDigest(env: Env): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const hourUTC = now.getUTCHours();

  // Only run on Mondays between 03:00–09:00 UTC
  if (dayOfWeek !== 1 || hourUTC < 3 || hourUTC >= 9) return;

  // Check if a weekly digest already exists for this week
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM market_insights
     WHERE category = 'weekly_digest'
     AND date(created_at) >= date('now', '-7 days')`
  ).first<{ cnt: number }>();

  if (existing && existing.cnt > 0) {
    console.log('[Cron] Weekly digest already exists for this week — skipping');
    return;
  }

  console.log('[Cron] Generating weekly digest...');

  const { generateWeeklyDigest } = await import('../../src/lib/agents/digest');
  const { publisherAgent } = await import('../../src/lib/agents/publisher');

  const workflowId = crypto.randomUUID();
  const insight = await generateWeeklyDigest(env);

  // Insert digest into D1 as unpublished
  const insertResult = await env.DB.prepare(
    `INSERT INTO market_insights (title, content, summary, delta, indicators, published, category, generated_by)
     VALUES (?, ?, ?, ?, ?, 0, 'weekly_digest', ?)`
  )
    .bind(
      insight.title,
      insight.content,
      insight.summary,
      insight.delta,
      JSON.stringify(insight.indicators),
      insight.generated_by ?? 'groq:llama-3.3-70b-versatile'
    )
    .run();

  const insightId = insertResult.meta?.last_row_id;
  if (!insightId) throw new Error('Failed to insert weekly digest');

  // Push through publisher
  await publisherAgent({
    insights: [{ ...insight, id: insightId }],
    agentLog: [],
    env,
    workflowId,
  });

  await env.DB.prepare(
    `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, 'digest', 'completed', ?)`
  )
    .bind(workflowId, `Weekly digest published: ${insight.slug}`)
    .run();

  // T089: Send digest email to confirmed subscribers
  if (env.SEND_EMAIL) {
    try {
      const subscribers = await env.DB.prepare(
        `SELECT email FROM newsletter_subscribers
         WHERE confirmed = 1 AND unsubscribed_at IS NULL`
      ).all<{ email: string }>();

      const digestUrl = `https://hisaabkar.pk/insights/${insight.slug}`;
      let sentCount = 0;

      for (const sub of subscribers.results || []) {
        try {
          await (env as any).SEND_EMAIL.send({
            from: 'digest@hisaabkar.pk',
            to: sub.email,
            subject: insight.title,
            text: `${insight.summary}\n\nRead full digest: ${digestUrl}\n\nUnsubscribe: https://hisaabkar.pk/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}&token=TOKEN`,
            html: `<p>${insight.summary}</p><p><a href="${digestUrl}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Read Full Digest</a></p>`,
          });
          sentCount++;
        } catch (emailErr) {
          console.error(`[Cron] Failed to email ${sub.email}:`, emailErr);
        }
      }

      await env.DB.prepare(
        `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, 'newsletter', 'completed', ?)`
      )
        .bind(workflowId, `Sent digest to ${sentCount} subscribers`)
        .run();

      console.log('[Cron] Newsletter digest sent', { sent: sentCount });
    } catch (err) {
      console.error('[Cron] Newsletter send error:', err);
    }
  }

  console.log('[Cron] Weekly digest complete', { slug: insight.slug });
}

async function runMonthlyRates(env: Env): Promise<void> {
  console.log('[Cron] Monthly rates check: SBP Policy Rate + KIBOR + PBS CPI + CDNS');
  const { scrapePolicyRates } = await import('../../src/lib/scrapers/sbp');
  const { scrapeCPI } = await import('../../src/lib/scrapers/pbs');
  const { scrapeCDNSRates } = await import('../../src/lib/scrapers/cdns');
  const workflowId = crypto.randomUUID();

  const results: string[] = [];

  try {
    const pr = await scrapePolicyRates(env.DB);
    results.push(`policy_rates:${pr.length}`);
  } catch (err) { results.push(`policy_rates:error:${err}`); }

  try {
    const cpi = await scrapeCPI(env.DB);
    results.push(`cpi:${cpi?.yoy_change ?? 'n/a'}%`);
  } catch (err) { results.push(`cpi:error:${err}`); }

  try {
    const cdns = await scrapeCDNSRates(env.DB);
    results.push(`cdns:${cdns.length}`);
  } catch (err) { results.push(`cdns:error:${err}`); }

  await env.DB.prepare(
    `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, 'monthly_rates', 'completed', ?)`
  ).bind(workflowId, results.join(' | ')).run().catch(() => {});

  console.log('[Cron] Monthly rates done:', results.join(' | '));
}

export async function onScheduled(
  event: { cron: string; scheduledTime: number },
  env: Env,
  ctx: { waitUntil: (promise: Promise<unknown>) => void }
): Promise<void> {
  console.log('[Cron] Scheduled event fired', { cron: event.cron });

  // Monthly cron: "0 4 1 * *" — runs policy rate + CPI + CDNS refresh
  if (event.cron === '0 4 1 * *') {
    ctx.waitUntil(
      runMonthlyRates(env).catch(err => console.error('[Cron] Monthly rates error:', err))
    );
    return;
  }

  // Every-6h cron: full workflow (FX, gold, commodities, insights, publish)
  ctx.waitUntil(
    executeWorkflow(env.DB, env.KV, env)
      .then(async result => {
        console.log('[Cron] Workflow complete', {
          success: result.success,
          published: result.state.publishedCount,
        });
        await maybeRunWeeklyDigest(env).catch(err =>
          console.error('[Cron] Weekly digest error:', err)
        );
      })
      .catch(err => {
        console.error('[Cron] Workflow error:', err);
      })
  );
}

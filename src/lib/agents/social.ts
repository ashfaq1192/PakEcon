/**
 * Social Agent (Agent D)
 *
 * T054: Posts insights to Telegram after successful GitHub commit.
 * T055: KV retry logic for Telegram 429 rate limits.
 * T056: TWITTER_ENABLED / TELEGRAM_ENABLED guards.
 * Twitter posting deferred to Phase 8 (OAuth 1.0a complexity per constitution §X).
 */

import type { MarketInsight, Env } from './types';

// ─── T054: Telegram posting ───────────────────────────────────────────────────

export async function postToTelegram(insight: MarketInsight, env: Env): Promise<string | null> {
  if (env.TELEGRAM_ENABLED !== 'true') {
    console.log('[Social] Telegram disabled via env');
    return null;
  }

  // T056: Twitter guard
  if (env.TWITTER_ENABLED === 'true') {
    // Twitter OAuth deferred to Phase 8 per constitution §X
    await insertSocialLog(env.DB, 'social', 'skipped', 'Twitter posting deferred — Phase 8').catch(() => {});
  }

  const slug = insight.slug || insight.title.toLowerCase().replace(/\s+/g, '-');
  const message =
    `📊 *${escapeMarkdown(insight.title)}*\n\n` +
    `${escapeMarkdown(insight.summary)}\n\n` +
    `🔗 [Read full analysis](https://pakecon.ai/insights/${slug})\n\n` +
    `_Source: ${escapeMarkdown(insight.citations[0]?.source || 'PakEcon.ai')}_`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHANNEL_ID,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      }
    );

    if (res.status === 429) {
      // T055: Store retry in KV
      const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000;
      if (insight.id) {
        await env.KV.put(
          `telegram_retry_${insight.id}`,
          JSON.stringify({ insight, retryAt: Date.now() + retryAfter }),
          { expirationTtl: 7200 }
        ).catch(() => {});
      }
      console.warn('[Social] Telegram 429 — retry queued in KV');
      return null;
    }

    if (!res.ok) {
      console.error(`[Social] Telegram error ${res.status}`);
      return null;
    }

    const data = await res.json() as { result: { message_id: number } };
    const messageId = String(data.result.message_id);

    // Update D1 telegram_message_id
    if (insight.id) {
      await env.DB.prepare(
        `UPDATE market_insights SET telegram_message_id = ? WHERE id = ?`
      ).bind(messageId, insight.id).run().catch(() => {});
    }

    return messageId;

  } catch (err) {
    console.error('[Social] Telegram post error:', err);
    return null;
  }
}

// ─── T055: Process KV retries ─────────────────────────────────────────────────

export async function processTelegramRetries(env: Env): Promise<void> {
  try {
    const list = await env.KV.list({ prefix: 'telegram_retry_' });
    for (const key of list.keys) {
      const raw = await env.KV.get(key.name);
      if (!raw) continue;
      const { insight, retryAt } = JSON.parse(raw) as { insight: MarketInsight; retryAt: number };
      if (Date.now() < retryAt) continue; // not ready yet
      await postToTelegram(insight, env);
      await env.KV.delete(key.name);
    }
  } catch (err) {
    console.warn('[Social] Retry processing error:', err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function insertSocialLog(db: D1Database, stage: string, status: string, message: string): Promise<void> {
  await db.prepare(
    `INSERT INTO agent_logs (workflow_id, stage, status, message) VALUES (?, ?, ?, ?)`
  ).bind('social-' + Date.now(), stage, status, message).run();
}

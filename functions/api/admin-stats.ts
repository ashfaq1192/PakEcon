/**
 * GET /api/admin-stats?secret=<secret>
 * Temporary read-only admin endpoint. DELETE after use.
 */

interface Env { DB: D1Database; }

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context;
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== 'pakec-admin-2026') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const subs = await env.DB.prepare(
    `SELECT email, confirmed, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC`
  ).all<{ email: string; confirmed: number; subscribed_at: string; unsubscribed_at: string | null }>();

  const rows = subs.results || [];
  const total = rows.length;
  const confirmed = rows.filter(r => r.confirmed && !r.unsubscribed_at).length;
  const unsubscribed = rows.filter(r => r.unsubscribed_at).length;

  return new Response(JSON.stringify({ total, confirmed, unsubscribed, subscribers: rows }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

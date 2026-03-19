/**
 * Newsletter Unsubscribe Endpoint (T086)
 * GET /api/newsletter/unsubscribe?token=...&email=...
 */

import type { Env } from '../../../src/lib/agents/types';

type PagesContext = { env: Env; request: Request };

async function hmacToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(email));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const email = decodeURIComponent(url.searchParams.get('email') || '').toLowerCase();

  if (!token || !email) {
    return Response.redirect('https://hisaabkar.pk/?error=invalid_token', 302);
  }

  const expected = await hmacToken(email, env.NEWSLETTER_SECRET);
  if (token !== expected) {
    return Response.redirect('https://hisaabkar.pk/?error=invalid_token', 302);
  }

  await env.DB.prepare(
    `UPDATE newsletter_subscribers
     SET unsubscribed_at = CURRENT_TIMESTAMP
     WHERE email = ?`
  ).bind(email).run();

  return Response.redirect('https://hisaabkar.pk/?unsubscribed=true', 302);
}

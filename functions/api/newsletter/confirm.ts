/**
 * Newsletter Confirm Endpoint (T085)
 * GET /api/newsletter/confirm?token=...&email=...
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
    return Response.redirect('https://pakecon.ai/?error=invalid_token', 302);
  }

  const expected = await hmacToken(email, env.NEWSLETTER_SECRET);
  if (token !== expected) {
    return Response.redirect('https://pakecon.ai/?error=invalid_token', 302);
  }

  // Check current status
  const row = await env.DB.prepare(
    'SELECT confirmed FROM newsletter_subscribers WHERE email = ?'
  ).bind(email).first<{ confirmed: number }>();

  if (!row) {
    return Response.redirect('https://pakecon.ai/?error=invalid_token', 302);
  }

  if (row.confirmed) {
    return Response.redirect('https://pakecon.ai/?subscribed=already', 302);
  }

  await env.DB.prepare(
    'UPDATE newsletter_subscribers SET confirmed = 1 WHERE email = ?'
  ).bind(email).run();

  return Response.redirect('https://pakecon.ai/?subscribed=true', 302);
}

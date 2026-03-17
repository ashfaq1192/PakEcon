/**
 * Newsletter Subscribe Endpoint (T084)
 * POST /api/newsletter/subscribe
 * Validates email, stores in D1, sends confirmation email via Cloudflare Email Workers.
 */

import type { Env } from '../../../src/lib/agents/types';

type PagesContext = { env: Env & { SEND_EMAIL?: { send: (msg: object) => Promise<void> } }; request: Request };

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;

  let email: string;
  try {
    const body = await request.json() as { email?: string };
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if already confirmed
  const existing = await env.DB.prepare(
    'SELECT confirmed FROM newsletter_subscribers WHERE email = ?'
  ).bind(email).first<{ confirmed: number }>();

  if (existing?.confirmed) {
    return new Response(JSON.stringify({ message: 'You are already subscribed.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await hmacToken(email, env.NEWSLETTER_SECRET);

  // UPSERT subscriber record
  await env.DB.prepare(
    `INSERT INTO newsletter_subscribers (email, confirmed, confirmation_token)
     VALUES (?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET confirmation_token = excluded.confirmation_token`
  ).bind(email, token).run();

  // Send confirmation email (non-blocking if SEND_EMAIL not configured)
  const confirmUrl = `https://pakecon.ai/api/newsletter/confirm?token=${token}&email=${encodeURIComponent(email)}`;
  const unsubUrl = `https://pakecon.ai/api/newsletter/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;

  if (env.SEND_EMAIL) {
    try {
      await env.SEND_EMAIL.send({
        from: 'noreply@pakecon.ai',
        to: email,
        subject: 'Confirm your PakEcon.ai newsletter subscription',
        text: `Please confirm your subscription to PakEcon.ai Weekly Economic Digest:\n\n${confirmUrl}\n\nIf you did not subscribe, you can ignore this email or unsubscribe: ${unsubUrl}`,
        html: `<p>Please confirm your subscription to <strong>PakEcon.ai Weekly Economic Digest</strong>:</p>
               <p><a href="${confirmUrl}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Confirm Subscription</a></p>
               <p style="font-size:12px;color:#666;">If you did not subscribe, <a href="${unsubUrl}">unsubscribe here</a>.</p>`,
      });
    } catch (err) {
      console.error('[Newsletter] Failed to send confirmation email:', err);
    }
  }

  return new Response(JSON.stringify({ message: 'Confirmation email sent!' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

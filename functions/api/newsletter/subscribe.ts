/**
 * Newsletter Subscribe Endpoint (T084)
 * POST /api/newsletter/subscribe
 * Validates email, stores in D1, sends confirmation email via Cloudflare Email Workers.
 */

import type { Env } from '../../../src/lib/agents/types';

type PagesContext = { env: Env & { RESEND_API_KEY?: string }; request: Request };

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

  // Check if already subscribed
  const existing = await env.DB.prepare(
    'SELECT confirmed FROM newsletter_subscribers WHERE email = ?'
  ).bind(email).first<{ confirmed: number }>();

  if (existing?.confirmed) {
    return new Response(JSON.stringify({ message: '✅ You\'re already on the list — see you Monday!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = await hmacToken(email, env.NEWSLETTER_SECRET);
  const unsubUrl = `https://hisaabkar.pk/api/newsletter/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;

  // UPSERT subscriber as confirmed immediately — no email confirmation step
  await env.DB.prepare(
    `INSERT INTO newsletter_subscribers (email, confirmed, confirmation_token)
     VALUES (?, 1, ?)
     ON CONFLICT(email) DO UPDATE SET confirmed = 1, confirmation_token = excluded.confirmation_token`
  ).bind(email, token).run();

  // Send a welcome email via Resend
  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HisaabKar.pk <noreply@hisaabkar.pk>',
          to: [email],
          subject: '✅ You\'re subscribed to HisaabKar.pk Weekly Digest',
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;">
              <h2 style="color:#16a34a;">Welcome to HisaabKar.pk! 🇵🇰</h2>
              <p>You're now subscribed to the <strong>Weekly Economic Digest</strong>.</p>
              <p>Every Monday morning you'll receive:</p>
              <ul>
                <li>📊 Pakistan exchange rate & gold price movements</li>
                <li>📈 Inflation & SBP policy rate updates</li>
                <li>💡 Key economic insights in plain language</li>
              </ul>
              <p style="color:#555;font-size:13px;margin-top:24px;">
                Don't want emails? <a href="${unsubUrl}" style="color:#16a34a;">Unsubscribe here</a>.
              </p>
            </div>`,
        }),
      });
    } catch (err) {
      console.error('[Newsletter] Failed to send welcome email:', err);
    }
  }

  return new Response(JSON.stringify({ message: '🎉 You\'re subscribed! Your first digest arrives Monday morning.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

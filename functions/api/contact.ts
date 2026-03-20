/**
 * Contact Form Endpoint
 * POST /api/contact
 * Validates input and sends message to site owner via Resend.
 */

type PagesContext = {
  env: {
    RESEND_API_KEY?: string;
  };
  request: Request;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;

  let name: string, email: string, message: string;
  try {
    const body = await request.json() as { name?: string; email?: string; message?: string };
    name    = (body.name    || '').trim();
    email   = (body.email   || '').trim().toLowerCase();
    message = (body.message || '').trim();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!name || name.length < 2) {
    return new Response(JSON.stringify({ error: 'Please enter your name.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!message || message.length < 10) {
    return new Response(JSON.stringify({ error: 'Message must be at least 10 characters.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Message is too long (max 2000 characters).' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.RESEND_API_KEY) {
    console.warn('[Contact] RESEND_API_KEY not set — email not sent');
    return new Response(JSON.stringify({ message: 'Message received! We will get back to you soon.' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HisaabKar.pk Contact <noreply@hisaabkar.pk>',
        to: ['ashfaqahmed1192@gmail.com'],
        reply_to: email,
        subject: `[HisaabKar Contact] Message from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#16a34a;">New Contact Message — HisaabKar.pk</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;width:100px;">Name:</td>
                <td style="padding:8px;color:#111827;">${name}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px;font-weight:bold;color:#374151;">Email:</td>
                <td style="padding:8px;color:#111827;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding:8px;font-weight:bold;color:#374151;vertical-align:top;">Message:</td>
                <td style="padding:8px;color:#111827;white-space:pre-wrap;">${message}</td>
              </tr>
            </table>
            <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
              Sent via hisaabkar.pk/about contact form
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
  } catch (err) {
    console.error('[Contact] Failed to send email:', err);
    return new Response(JSON.stringify({ error: 'Failed to send message. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Message sent! We will get back to you within 24 hours.' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

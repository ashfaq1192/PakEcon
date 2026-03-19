/**
 * Publisher Agent (Agent C: SEO Architect)
 *
 * Publishes generated insights as MDX files via GitHub Contents API.
 * Supports HUMAN_REVIEW_MODE (creates PR instead of direct commit).
 * Notifies Google Indexing API after each successful publish.
 */

import type { MarketInsight, AgentLog, Env } from './types';

export interface PublisherAgentInput {
  insights: MarketInsight[];
  env: Env;
}

export interface PublisherAgentOutput {
  publishedCount: number;
  agentLog: AgentLog[];
}

// ─── MDX generation ──────────────────────────────────────────────────────────

function generateMDX(insight: MarketInsight): string {
  const title = insight.title.replace(/"/g, '\\"');
  const summary = insight.summary.replace(/"/g, '\\"');
  const source = insight.citations[0]?.url ?? insight.source;
  const pubDate = insight.date.split('T')[0];

  return `---
title: "${title}"
pubDate: ${pubDate}
summary: "${summary}"
category: ${insight.category}
source: "${source}"
delta: ${insight.delta}
---

${insight.content}

---

*Information provided is for educational purposes and based on public data. Not financial advice.*
`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

async function getFileSha(
  owner: string,
  repo: string,
  filePath: string,
  token: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'HisaabKar.pk' } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub getFileSha failed: ${res.status}`);
  const data = await res.json() as { sha: string };
  return data.sha;
}

async function createGitHubCommit(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  token: string,
  humanReviewMode: boolean
): Promise<string> {
  // base64 encode content (Workers-compatible)
  const base64Content = btoa(unescape(encodeURIComponent(content)));

  if (humanReviewMode) {
    // Create branch + PR instead of direct commit
    const branch = `drafts/blog-${new Date().toISOString().split('T')[0]}`;
    const fileName = filePath.split('/').pop() ?? 'insight.mdx';

    // Get main branch SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'HisaabKar.pk' } }
    );
    if (!refRes.ok) throw new Error(`Failed to get main ref: ${refRes.status}`);
    const refData = await refRes.json() as { object: { sha: string } };

    // Create branch
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: refData.object.sha }),
      }
    );

    // Commit file to branch
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
        body: JSON.stringify({ message, content: base64Content, branch, author: { name: 'HisaabKar Agent', email: 'agent@hisaabkar.pk' } }),
      }
    );

    // Create PR
    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
        body: JSON.stringify({ title: message, body: `Auto-generated insight draft.\n\nReview before merging to publish.`, head: branch, base: 'main' }),
      }
    );
    if (!prRes.ok) throw new Error(`Failed to create PR: ${prRes.status}`);
    const pr = await prRes.json() as { html_url: string };
    return pr.html_url;
  }

  // Direct commit to main
  let sha: string | null = null;
  try {
    sha = await getFileSha(owner, repo, filePath, token);
  } catch {
    // file doesn't exist yet, proceed without sha
  }

  const body: Record<string, unknown> = {
    message,
    content: base64Content,
    branch: 'main',
    author: { name: 'HisaabKar Agent', email: 'agent@hisaabkar.pk' },
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 401) throw new Error('GITHUB_TOKEN_EXPIRED');
  if (res.status === 422 && !sha) {
    // File exists but we didn't have sha — retry with fetched sha
    const existingSha = await getFileSha(owner, repo, filePath, token);
    if (existingSha) {
      body.sha = existingSha;
      const retry = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
          body: JSON.stringify(body),
        }
      );
      if (!retry.ok) throw new Error(`GitHub commit retry failed: ${retry.status}`);
    }
  } else if (res.status === 429) {
    await new Promise(r => setTimeout(r, 30000));
    const retry = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'HisaabKar.pk' },
        body: JSON.stringify(body),
      }
    );
    if (!retry.ok) throw new Error(`GitHub commit 429 retry failed: ${retry.status}`);
  } else if (!res.ok) {
    throw new Error(`GitHub commit failed: ${res.status}`);
  }

  return filePath;
}

// ─── Google Indexing API — JWT signing via Web Crypto API ────────────────────

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN[^-]+-----/, '')
    .replace(/-----END[^-]+-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '')  // strip ALL whitespace including \r, spaces, tabs
    .trim();
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buf;
}

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGoogleAccessToken(privateKeyPem: string, serviceAccount: string): Promise<string> {
  const keyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const payload = b64url({
    iss: serviceAccount,
    sub: serviceAccount,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

async function notifyGoogleIndexing(slug: string, env: Env): Promise<void> {
  if (!env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SERVICE_ACCOUNT) return;
  const url = `https://hisaabkar.pk/blog/${slug}`;
  try {
    const accessToken = await getGoogleAccessToken(env.GOOGLE_PRIVATE_KEY, env.GOOGLE_SERVICE_ACCOUNT);
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
    if (!res.ok) console.warn(`[Publisher] Google Indexing API non-200: ${res.status}`);
  } catch (e) {
    console.warn(`[Publisher] Google Indexing API error (non-blocking): ${e}`);
  }
}

// ─── D1 helpers ───────────────────────────────────────────────────────────────

async function insertAgentLog(
  db: D1Database,
  workflowId: string,
  stage: string,
  status: string,
  message?: string,
  duration_ms?: number
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO agent_logs (workflow_id, stage, status, message, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `).bind(workflowId, stage, status, message ?? null, duration_ms ?? null).run();
  } catch (e) {
    console.error('[Publisher] Failed to write agent_log:', e);
  }
}

// ─── Publisher Agent ──────────────────────────────────────────────────────────

export async function publisherAgent(state: {
  insights: MarketInsight[];
  agentLog: AgentLog[];
  env: Env;
  workflowId: string;
}): Promise<Partial<{ stage: string; publishedCount: number; agentLog: AgentLog[] }>> {
  const agentLog: AgentLog[] = [];
  const startTime = Date.now();

  const { env, workflowId } = state;
  const humanReviewMode = env.HUMAN_REVIEW_MODE === 'true';

  await insertAgentLog(env.DB, workflowId, 'publisher', 'running');

  if (!state.insights || state.insights.length === 0) {
    await insertAgentLog(env.DB, workflowId, 'publisher', 'skipped', 'No insights to publish', Date.now() - startTime);
    return { stage: 'social', publishedCount: 0, agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  let publishedCount = 0;

  for (const insight of state.insights) {
    const insightStart = Date.now();
    try {
      const slug = insight.slug || generateSlug(insight.title);
      const filename = `${slug}.mdx`;
      const filePath = `src/content/blog/${filename}`;
      const mdxContent = generateMDX({ ...insight, slug });

      await createGitHubCommit(
        env.GITHUB_OWNER,
        env.GITHUB_REPO,
        filePath,
        mdxContent,
        `feat(insight): ${insight.title}`,
        env.GITHUB_TOKEN,
        humanReviewMode
      );

      // Mark as published in D1 if insight has an id
      if (insight.id) {
        await env.DB.prepare(`
          UPDATE market_insights SET published = 1 WHERE id = ?
        `).bind(insight.id).run();
      }

      // Non-blocking Google Indexing notification
      await notifyGoogleIndexing(slug, env);

      publishedCount++;
      insight.slug = slug; // ensure slug is set for social stage

      agentLog.push({
        agent: 'publisher',
        action: `published: ${insight.title}`,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg === 'GITHUB_TOKEN_EXPIRED') {
        await env.KV.put('publisher_disabled', 'true', { expirationTtl: 86400 });
        await insertAgentLog(env.DB, workflowId, 'publisher', 'error', 'GITHUB_TOKEN_EXPIRED', Date.now() - insightStart);
        agentLog.push({ agent: 'publisher', action: 'error', timestamp: new Date().toISOString(), error: errMsg });
        break; // stop publishing
      }

      agentLog.push({ agent: 'publisher', action: `failed: ${insight.title}`, timestamp: new Date().toISOString(), error: errMsg });
      await insertAgentLog(env.DB, workflowId, 'publisher', 'error', errMsg, Date.now() - insightStart);
    }
  }

  await insertAgentLog(env.DB, workflowId, 'publisher', 'completed', `Published ${publishedCount} insights`, Date.now() - startTime);

  return {
    stage: 'social',
    publishedCount,
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

// Re-export for backward compat
export { generateSlug };

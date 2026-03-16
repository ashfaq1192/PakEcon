# Quickstart: PakEcon.ai Platform Enhancement

**Feature**: 002-platform-enhancement | **Date**: 2026-03-17

Prerequisites: Node.js v22+, Wrangler v4+, GitHub account, Cloudflare account (existing from v1.0 deployment).

---

## Step 1: Install New Dependencies

```bash
cd /mnt/d/projects/PakEc
npm install -D @vite-pwa/astro pagefind
```

## Step 2: Run D1 Migration

```bash
# Apply migration 002 to local D1
wrangler d1 execute pakecon_db --local --file=db/migrations/002_enhancements.sql

# Apply to production D1
wrangler d1 execute pakecon_db --file=db/migrations/002_enhancements.sql
```

## Step 3: Set New Secrets

```bash
# LLM providers
wrangler secret put GROQ_API_KEY
wrangler secret put OPENAI_API_KEY

# GitHub Publisher Agent
wrangler secret put GITHUB_TOKEN         # Fine-grained PAT with repo:contents write
wrangler secret put GITHUB_OWNER         # Your GitHub username
wrangler secret put GITHUB_REPO          # Repository name (e.g., pakecon-ai)

# Social posting
wrangler secret put TWITTER_API_KEY
wrangler secret put TWITTER_API_SECRET
wrangler secret put TWITTER_ACCESS_TOKEN
wrangler secret put TWITTER_ACCESS_SECRET
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHANNEL_ID  # e.g., @pakeconai or -100123456789

# Newsletter
wrangler secret put NEWSLETTER_SECRET    # Random 32-char hex string
```

## Step 4: Generate GitHub Token

1. GitHub → Settings → Developer Settings → Fine-grained personal access tokens
2. Create token with access to your repo
3. Permissions: **Contents** (Read and Write), **Pull requests** (Read and Write)
4. Store as `GITHUB_TOKEN` secret (Step 3)

## Step 5: Set Up Twitter OAuth (One-Time)

Twitter requires a one-time manual OAuth authorization flow:

1. Go to [developer.twitter.com](https://developer.twitter.com) → Create Project → Create App
2. Set App permissions to **Read and Write**
3. Generate Access Token and Secret from the App dashboard
4. Store all 4 values as secrets (Step 3)

## Step 6: Create Telegram Bot

1. Message `@BotFather` on Telegram → `/newbot`
2. Follow prompts → get Bot Token
3. Add bot as **admin** to your channel
4. Get channel ID: forward a message from channel to `@username_to_id_bot`
5. Store token and channel ID (Step 6 format: `-100{numeric_id}`) as secrets

## Step 7: Update wrangler.toml

Add new environment variables:
```toml
[vars]
ENVIRONMENT = "production"
HUMAN_REVIEW_MODE = "false"    # Set "true" during initial 30-day review period
TWITTER_ENABLED = "true"
TELEGRAM_ENABLED = "true"
```

## Step 8: Add PWA Icons

Add to `public/` directory:
- `public/pwa-192x192.png` — App icon (192×192px)
- `public/pwa-512x512.png` — App icon (512×512px)
- `public/pwa-maskable-512x512.png` — Maskable icon (512×512px with safe zone)

## Step 9: Create Astro Content Collection

Create `src/content/config.ts` with the insight collection schema. Create `src/content/insights/` directory (add a `.gitkeep` to track it).

## Step 10: Local Development

```bash
npm run dev           # Astro dev server
wrangler dev          # Test Workers locally with D1 bindings
npm run build         # Full build (includes Pagefind index generation)
npm run preview       # Test built site with search working
```

## Step 11: Deploy

Deployment is automatic via Cloudflare Pages GitHub integration. Push to `main` triggers rebuild.

To manually trigger the agent workflow after deployment:
```bash
curl -X POST https://pakecon.ai/api/agents/trigger \
  -H "Authorization: Bearer ${AGENT_SECRET}"
```

---

## Environment Variables Reference

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GROQ_API_KEY` | Secret | Yes | Groq API key for LLaMA 3.3 |
| `OPENAI_API_KEY` | Secret | Yes | OpenAI fallback (GPT-4o-mini) |
| `GITHUB_TOKEN` | Secret | Yes | Fine-grained PAT for publisher |
| `GITHUB_OWNER` | Secret | Yes | GitHub username |
| `GITHUB_REPO` | Secret | Yes | Repository name |
| `TWITTER_API_KEY` | Secret | Yes* | Twitter OAuth 1.0a consumer key |
| `TWITTER_API_SECRET` | Secret | Yes* | Twitter OAuth 1.0a consumer secret |
| `TWITTER_ACCESS_TOKEN` | Secret | Yes* | Twitter OAuth 1.0a access token |
| `TWITTER_ACCESS_SECRET` | Secret | Yes* | Twitter OAuth 1.0a access secret |
| `TELEGRAM_BOT_TOKEN` | Secret | Yes | Telegram bot token |
| `TELEGRAM_CHANNEL_ID` | Secret | Yes | Channel ID (format: `-100{id}`) |
| `NEWSLETTER_SECRET` | Secret | Yes | HMAC-SHA256 signing secret |
| `AGENT_SECRET` | Secret | Existing | Agent trigger auth token |
| `HUMAN_REVIEW_MODE` | Var | Yes | `"true"` or `"false"` |
| `TWITTER_ENABLED` | Var | Yes | `"true"` or `"false"` |
| `TELEGRAM_ENABLED` | Var | Yes | `"true"` or `"false"` |

*Required only if `TWITTER_ENABLED=true`

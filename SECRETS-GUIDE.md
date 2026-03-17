# API Keys & Secrets Configuration Guide

**Project**: PakEcon.ai
**Purpose**: All required environment variables, API keys, and where to obtain and configure them
**Last Updated**: 2026-03-15

---

## Required Secrets (All Free)

### 1. AGENT_SECRET (REQUIRED)

**Purpose**: Authenticates requests to the agent trigger endpoint (`/api/agents/trigger`). This prevents unauthorized access to your agent swarm.

**Where to get**: Generate this yourself using a secure random string.

**How to generate**:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Where to set**:

```bash
# Set for Cloudflare Workers (production)
wrangler secret put AGENT_SECRET
# Enter your generated secret when prompted
```

**Used in**:
- `functions/api/agents/trigger.ts:37` - Bearer token validation
- `.github/workflows/agents.yml:40` - GitHub Actions authentication

**Security Notes**:
- Use a cryptographically secure random string (32+ bytes recommended)
- Never commit this secret to git or share publicly
- Rotate this secret if you suspect it has been compromised

---

### 2. SITE_URL (REQUIRED)

**Purpose**: Your live PakEcon.ai website URL for health checks and deployment verification.

**Where to get**: This is your own domain after Cloudflare Pages deployment.

**Example values**:
- `https://pakecon.ai`
- `https://your-project.pages.dev` (Cloudflare Pages default)

**Where to set**:

**Option A: GitHub Secrets (Recommended)**
1. Go to: https://github.com/[username]/[repo]/settings/secrets/actions
2. Click: "New repository secret"
3. Name: `SITE_URL`
4. Value: `https://your-domain.com`
5. Click: "Add secret"

**Option B: Cloudflare Environment Variable (Alternative)**
```bash
# Add to wrangler.toml or set via Cloudflare dashboard
# For production deployments only
```

**Used in**:
- `.github/workflows/agents.yml:39, 101` - Health check verification
- `.github/workflows/agents.yml:55-56` - Summary generation context

---

### 3. AGENT_URL (REQUIRED)

**Purpose**: The URL of your agent trigger endpoint for GitHub Actions to call.

**Where to get**: This is your deployed Cloudflare Function URL.

**Format**: `https://[your-domain]/api/agents/trigger`

**Examples**:
- `https://pakecon.ai/api/agents/trigger`
- `https://pakecon-ai.pages.dev/api/agents/trigger`

**Where to set**:

**GitHub Secrets** (Required for GitHub Actions):
1. Go to: https://github.com/[username]/[repo]/settings/secrets/actions
2. Click: "New repository secret"
3. Name: `AGENT_URL`
4. Value: Your deployed agent URL
5. Click: "Add secret"

**Used in**:
- `.github/workflows/agents.yml:39` - Curl request to trigger agents

**Note**: This URL will be available after you deploy to Cloudflare Pages.

---

## Optional Secrets (Enhanced Features)

### 4. GOOGLE_PRIVATE_KEY (OPTIONAL - Google Indexing API)

**Purpose**: Authenticates with Google Indexing API to notify Google of new content immediately after agent publishes insights.

**Where to get**: Google Search Console API credentials (Free with Google account).

**How to obtain**:

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/apis/credentials
   - Create new project or select existing

2. **Enable Indexing API**:
   - Navigate to: APIs & Services > Library
   - Search for: "Indexing API"
   - Click: "Enable"

3. **Create Service Account**:
   - Navigate to: APIs & Services > Credentials
   - Click: "Create Credentials" > "Service Account"
   - Name: "pakecon-indexing" (or your choice)
   - Click: "Create and Continue"

4. **Create JSON Key**:
   - Click on the created service account email
   - Navigate to: "Keys" tab
   - Click: "Add Key" > "Create New Key"
   - Key type: "JSON" (recommended)
   - Download the JSON file
   - Copy the entire `private_key` field (including `-----BEGIN PRIVATE KEY-----`)

**Security Notes**:
- Never commit the JSON file to git
- Only store the private key in Cloudflare Secrets
- The JSON file also contains `client_email` (see GOOGLE_SERVICE_ACCOUNT below)

**Where to set**:

```bash
# Set for Cloudflare Workers
wrangler secret put GOOGLE_PRIVATE_KEY
# Paste the entire private_key field from the JSON file
```

**Used in**:
- `src/lib/agents/publisher.ts:179` - OAuth2 token generation
- `src/lib/agents/publisher.ts:188` - API authentication

**Free Tier Limits**:
- 200 requests per day
- Unlimited for critical pages
- Google Search Console account required

---

### 5. GOOGLE_SERVICE_ACCOUNT (OPTIONAL - Google Indexing API)

**Purpose**: The service account email address for Google Indexing API authentication (used with PRIVATE_KEY).

**Where to get**: Same JSON file downloaded when creating GOOGLE_PRIVATE_KEY.

**Format**: Something like `pakecon-indexing@project-id.iam.gserviceaccount.com`

**How to obtain**:
1. Open the JSON file downloaded during GOOGLE_PRIVATE_KEY setup
2. Copy the `client_email` field value
3. This is your service account email

**Where to set**:

```bash
# Set for Cloudflare Workers
wrangler secret put GOOGLE_SERVICE_ACCOUNT
# Paste the client_email from the JSON file
```

**Used in**:
- `src/lib/agents/publisher.ts:178` - OAuth2 token generation

**Important**:
- This email must be added to your Google Search Console property
- Search Console: https://search.google.com/search-console
- Add owner via "Settings" > "Users and permissions"

---

## Configuration by Deployment Type

### For Local Development (Wrangler)

```bash
# 1. Install dependencies
npm install

# 2. Set secrets locally (creates .dev.vars)
wrangler secret put AGENT_SECRET
wrangler secret put GOOGLE_PRIVATE_KEY    # Optional
wrangler secret put GOOGLE_SERVICE_ACCOUNT  # Optional

# 3. Run locally
wrangler dev
```

### For Cloudflare Pages Production

**Step 1: Configure GitHub Repository Secrets**
1. Go to: https://github.com/[your-username]/[your-repo]/settings/secrets/actions
2. Add the following secrets:

| Secret Name | Value | Required | Source |
|-------------|-------|-----------|--------|
| `AGENT_SECRET` | Your generated secret (32+ bytes) | Generate yourself |
| `AGENT_URL` | Your deployed agent URL | After deployment |
| `SITE_URL` | Your production domain | After deployment |
| `GOOGLE_PRIVATE_KEY` | Google service account private key | Optional - Google Cloud Console |
| `GOOGLE_SERVICE_ACCOUNT` | Google service account email | Optional - From JSON file |

**Step 2: Connect GitHub to Cloudflare Pages**
1. Log in to: https://dash.cloudflare.com
2. Go to: Workers & Pages > Create application
3. Select: "Pages" tab > "Connect to Git"
4. Select: GitHub and authorize
5. Select your `PakEcon.ai` repository
6. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (use `/` if package.json is at root)

**Step 3: Set Wrangler Secrets for Production**
```bash
# After connecting to Cloudflare Pages, set secrets
wrangler secret put AGENT_SECRET
wrangler secret put GOOGLE_PRIVATE_KEY    # Optional
wrangler secret put GOOGLE_SERVICE_ACCOUNT  # Optional
```

**Step 4: Deploy**
```bash
# Push to GitHub (this triggers automatic deployment)
git add .
git commit -m "Initial deployment"
git push origin master
```

---

## Secrets Summary Table

| Secret Name | Purpose | Required | Free/Paid | Where to Get | Where to Set |
|-------------|---------|-----------|------------|--------------|--------------|
| `AGENT_SECRET` | Agent trigger authentication | ✅ YES | Generate yourself | Wrangler Secret |
| `SITE_URL` | Production domain URL | ✅ YES | Your domain | GitHub Secrets |
| `AGENT_URL` | Agent endpoint URL | ✅ YES | After deployment | GitHub Secrets |
| `GOOGLE_PRIVATE_KEY` | Google Indexing API auth | ⏸️ OPTIONAL | Google Cloud Console | Wrangler Secret |
| `GOOGLE_SERVICE_ACCOUNT` | Google Indexing email | ⏸️ OPTIONAL | From Google JSON | Wrangler Secret |

---

## Setup Commands (All Free)

### Complete Setup Sequence

```bash
# 1. Install dependencies
npm install

# 2. Create D1 database
wrangler d1 create pakecon_db
# Copy the returned database_id to wrangler.toml line 7

# 3. Run database migrations
wrangler d1 execute pakecon_db --file=db/migrations/001_init.sql --remote

# 4. Generate and set AGENT_SECRET
SECRET=$(openssl rand -base64 32)
wrangler secret put AGENT_SECRET
# Paste the $SECRET value when prompted

# 5. (Optional) Set up Google Indexing
# Skip if you don't want immediate Google indexing
# wrangler secret put GOOGLE_PRIVATE_KEY
# wrangler secret put GOOGLE_SERVICE_ACCOUNT

# 6. Build and verify
npm run build
npm run preview
```

### GitHub Secrets Setup (Required for CI/CD)

After deployment, set these GitHub repository secrets:

```bash
# These are set in GitHub dashboard, not command line
# https://github.com/[username]/[repo]/settings/secrets/actions

# Required secrets:
# - AGENT_SECRET: Same value as in Wrangler
# - AGENT_URL: https://[your-domain]/api/agents/trigger
# - SITE_URL: https://[your-domain]
```

---

## Verification Commands

After setting up secrets, verify everything works:

```bash
# 1. Verify Wrangler secrets
wrangler secret list

# 2. Test agent trigger locally
wrangler dev
# In another terminal:
curl -X POST http://localhost:8787/api/agents/trigger \
  -H "Authorization: Bearer [YOUR_AGENT_SECRET]" \
  -H "Content-Type: application/json"

# 3. After deployment, test production
curl -X POST https://[your-domain]/api/agents/trigger \
  -H "Authorization: Bearer [YOUR_AGENT_SECRET]" \
  -H "Content-Type: application/json"
```

---

## Security Best Practices

1. **Never commit secrets to git**:
   - Add `.dev.vars` to `.gitignore`
   - Never include secrets in `wrangler.toml`
   - Use environment variables only

2. **Use strong secrets**:
   - Minimum 32 bytes for `AGENT_SECRET`
   - Use proper private keys for Google (don't use simplified keys)

3. **Rotate secrets periodically**:
   - `AGENT_SECRET`: Every 6 months
   - Google keys: Every year or if compromised

4. **Limit secret access**:
   - Only use secrets where necessary
   - Don't log secrets to console
   - Use secret references (`env.SECRET_NAME`) properly

5. **Monitor usage**:
   - Check Cloudflare dashboard for secret usage
   - Monitor GitHub Actions logs for secret exposure
   - Review Google Cloud Console for API quota

---

## Troubleshooting

### Issue: "Unauthorized" errors in agent trigger

**Solution**:
1. Verify `AGENT_SECRET` is set in both GitHub Secrets and Wrangler
2. Ensure secrets match exactly (same value, no extra spaces)
3. Check GitHub Actions logs for authentication failures

### Issue: Google Indexing not working

**Solution**:
1. Verify `GOOGLE_PRIVATE_KEY` and `GOOGLE_SERVICE_ACCOUNT` are set
2. Add service account email to Google Search Console
3. Check Google Cloud Console quota: https://console.cloud.google.com/apis/api/dashboard
4. Verify Indexing API is enabled

### Issue: "Agent URL not found"

**Solution**:
1. Deploy to Cloudflare Pages first
2. Check the deployed URL structure: `https://[domain]/api/agents/trigger`
3. Update `AGENT_URL` in GitHub Secrets to match deployed URL
4. Verify D1 database is created and bound correctly

---

## Free Tier Cost Summary

| Service | Monthly Cost | Free Tier Limit |
|----------|---------------|-----------------|
| Cloudflare Pages | $0 | Unlimited deployments |
| Cloudflare Workers | $0 | 100,000 requests/day |
| Cloudflare D1 | $0 | 5GB storage |
| Cloudflare KV | $0 | 1GB storage |
| GitHub Actions | $0 | 2,000 minutes/month |
| Google Indexing API | $0 | 200 requests/day |

**Total Monthly Cost**: $0.00 ✅

All required services are on Cloudflare's and GitHub's generous free tiers, making PakEcon.ai truly zero-cost to operate.

---

## Next Steps After Configuration

1. **Deploy to Cloudflare Pages**: Connect GitHub repo and deploy
2. **Verify agent swarm runs**: Check Cloudflare logs for agent execution
3. **Test interactive tools**: Visit `/utilities` and verify tools work
4. **Monitor GitHub Actions**: Check workflow runs every 6 hours
5. **Enable Google Indexing** (Optional): Add secrets and test API calls

---

**For questions or issues**:
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Google Indexing API Docs: https://developers.google.com/search/apis/indexing-api/v3/reference
- GitHub Actions Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

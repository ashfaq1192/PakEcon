<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0
Modified principles: V (Agent Swarm — extended), VI (SEO — extended)
Added sections: IX (LLM Integration), X (Content Automation & Social), XI (AdSense Strategy), XII (Tool Expansion Policy)
Removed sections: (none)
Templates requiring updates:
  ✅ plan-template.md - No changes needed
  ✅ spec-template.md - No changes needed
  ✅ tasks-template.md - No changes needed
  ✅ All command files - No changes needed
Follow-up TODOs:
  - Implement real GitHub API commits in Publisher Agent
  - Wire Groq/LLaMA 3 in Analyst Agent
  - Build Tier 1 tools per spec 002-platform-enhancement

Version: 1.1.0 | Ratified: 2026-03-15 | Last Amended: 2026-03-17
-->

# PakEcon.ai Constitution

## Core Principles

### I. Zero-Cost Architecture (NON-NEGOTIABLE)

All infrastructure MUST use Cloudflare's free tier exclusively. No paid services may be introduced without explicit amendment to this constitution.

**Infrastructure Stack**:
- Frontend: Astro 6 with hybrid output (static for SEO, React Islands for interactivity)
- Hosting: Cloudflare Pages (500 builds/month free)
- Database: Cloudflare D1 (5GB SQLite storage free)
- Functions: Cloudflare Workers/Functions (100k requests/day free)
- KV Storage: Cloudflare KV (1GB free for agent state persistence)

**Rationale**: The platform's value proposition is democratizing Pakistani economic data accessibility. Charging users would contradict this mission.

### II. E-E-A-T Compliance (NON-NEGOTIABLE)

All content MUST demonstrate Experience, Expertise, Authoritativeness, and Trustworthiness per Google's Search Quality Rater Guidelines.

**Requirements**:
- **Footer Disclaimer**: Every page MUST include the text: "Information provided is for educational purposes and based on public data. Not financial advice."
- **Author Credentials**: About page MUST display author qualifications (currently: M.Phil Economics, B.Com)
- **Source Attribution**: All insights MUST cite official sources (SBP, PBS, FBR, PMEX)
- **Human Review**: For the first 30 days post-launch, Agent C MUST create GitHub Pull Requests for draft content instead of auto-publishing.

**Rationale**: E-E-A-T is essential for Google Search ranking and AdSense approval. Violating this principle jeopardizes the entire project's traffic strategy.

### III. Client-Side Privacy for Utilities (NON-NEGOTIABLE)

All utility tools (Age Calculator, PDF Converter, Image Resizer) MUST run 100% in the browser with no server uploads.

**Requirements**:
- Age Calculator: Pure JavaScript date arithmetic
- PDF Converter: Uses pdf-lib.js loaded via CDN
- Image Resizer: Uses HTML5 Canvas API
- No file data may be sent to any server endpoint

**Rationale**: User trust is critical. Processing files server-side would require privacy policies, data retention policies, and security compliance—unnecessary complexity and user hesitation.

### IV. Official Data Sources Only (NON-NEGOTIABLE)

All economic data MUST come from authoritative Pakistani government sources or recognized exchanges.

**Approved Sources**:
- State Bank of Pakistan (sbp.org.pk) — Exchange rates, monetary policy
- Pakistan Bureau of Statistics (pbs.gov.pk) — CPI, inflation data, Weekly SPI
- Federal Board of Revenue (fbr.gov.pk) — Tax slabs, SROs, policy updates
- Pakistan Mercantile Exchange (pmex.com.pk) — Gold, silver, commodity futures
- OGRA (ogra.org.pk) — Notified petroleum prices (petrol, diesel, kerosene) — official regulatory source
- NEPRA (nepra.org.pk) — Electricity tariff orders — official regulatory source
- Business Recorder (brecorder.com) — Gold/silver market rates aggregated from PMEX and bullion dealer prices; acceptable **only** for commodity prices where no direct PMEX API exists; must be labelled "Market rates via Business Recorder/PMEX dealers"

**Prohibited Sources**:
- Unverified blogs or news sites
- Social media claims without official source links
- Price comparison websites lacking transparency
- Any source that cannot be traced to official documentation
- goldpricez.com and similar aggregators — use only as emergency fallback when both Business Recorder and PMEX are unreachable; label as "Estimated rate — source temporarily unavailable"

**Rationale**: The project's competitive advantage is "Authoritative Data." Using unofficial sources would dilute this USP and risk spreading misinformation.

### V. Agent Swarm Automation

The agent workflow (Scraper → Analyst → Publisher) MUST run automatically every 6 hours via Cloudflare Cron.

**Workflow Requirements**:
- State persistence via Cloudflare KV (1-hour TTL)
- Sequential execution: Scraper completes before Analyst starts
- Error handling: Single agent failure must not stop entire workflow
- Rate limiting: 10-second delays between scraper requests to respect robots.txt
- D1 fallback: If source sites are down, serve cached data

**Rationale**: Economic data changes frequently. Manual updates would be insufficient for a "real-time" value proposition.

### VI. SEO & Schema.org Optimization

All content MUST include proper Schema.org JSON-LD markup for search engine understanding.

**Requirements**:
- Article schema for market insights (headline, author, datePublished, publisher)
- Organization schema for brand entity (founder, credentials, sameAs social links)
- WebPage schema for utility and guide pages
- Sitemap generation via @astrojs/sitemap integration
- Meta tags: title, description, Open Graph, Twitter Card

**Rationale**: Organic search traffic is primary acquisition channel. Schema markup enables rich results in Google Search, improving CTR.

### VII. Type Safety & Code Quality

All TypeScript code MUST have no `any` types except where explicitly justified (e.g., API response interfaces).

**Requirements**:
- Strict mode enabled in tsconfig.json
- All exported functions have explicit parameter/return types
- Interfaces defined for all external data structures
- `tsc --noEmit` must pass before commits

**Rationale**: Runtime type errors in production would directly affect user experience and damage trust.

### VIII. Simplicity & YAGNI

Features MUST only be built if they serve the stated mission: democratizing Pakistani economic data.

**Anti-Patterns Prohibited**:
- Adding social features (comments, likes) - not core mission
- User authentication (unless needed for personalization) - adds friction
- Multi-language support - focus on English first, expand only after content maturity
- Third-party analytics beyond Cloudflare's built-in - privacy concern

**Rationale**: Each feature adds maintenance burden. Complexity without clear user value reduces velocity on core improvements.

## Additional Constraints

### Technology Requirements

- **Node.js**: v22+ recommended (v20 has known issues with Astro 6)
- **Wrangler**: v4.0+ for Cloudflare Workers compatibility
- **Git**: Conventional Commits format preferred

### Performance Standards

- Lighthouse Performance score target: 90+
- First Contentful Paint (FCP) target: < 1.8s
- Time to Interactive (TTI) target: < 3.5s

**Rationale**: Economic data users expect instant access. Slow performance reduces trust and SEO rankings.

### Deployment Requirements

- Preview deployments MUST NOT affect production database writes
- All D1 migrations MUST be reversible or additive
- Rollback procedure documented before production deployment

**Rationale**: Production data integrity is non-negotiable. Accidental data loss would require full historical data restoration.

## Development Workflow

### Development

1. Feature development happens in feature branches (format: `feature/description`)
2. TypeScript compilation must pass: `npx tsc --noEmit`
3. Build must succeed: `npm run build`
4. Create Pull Request with description of changes

### Review Process

1. PR must pass all automated checks
2. Manual review focuses on E-E-A-T compliance and data accuracy
3. Changes affecting economic calculations require at least one reviewer's verification
4. Merge to master only after approval

### Testing Requirements

1. Interactive tools must be manually tested in browser
2. Agent workflows tested with mock D1 data before deployment
3. Schema.org markup validated with Google Rich Results Test
4. Performance tested with Lighthouse CI (target: 90+)

### Quality Gates

- TypeScript compilation: BLOCKING
- Build success: BLOCKING
- E-E-A-T compliance: BLOCKING
- Schema validation: WARNING (allow merge with documented issue)

## Governance

### Amendment Procedure

1. Proposer creates GitHub Issue with "Constitution Amendment" label
2. Issue must include: rationale, proposed change text, and impact assessment
3. Minimum 48-hour discussion period
4. If consensus (no objections within discussion period), update constitution
5. Increment version according to semantic versioning rules

### Versioning Policy

- **MAJOR**: Backward-incompatible governance/principle removals or redefinitions
- **MINOR**: New principle/section added or material expansion of guidance
- **PATCH**: Clarifications, wording improvements, typo fixes, or non-semantic refinements

### Compliance Review

All Pull Requests must verify compliance with this constitution. Reviewers must explicitly call out any violations or questionable interpretations.

**Reference Documents**:
- This constitution is authoritative guidance
- README.md provides operational procedures
- Blueprint.md provides project context and roadmap

### IX. LLM Integration Strategy

All AI-generated content MUST use cost-efficient LLM providers. Paid LLMs are only permitted when free alternatives cannot meet quality requirements.

**Approved LLM Stack**:
- **Primary**: Groq API with LLaMA 3 (llama3-70b-8192) — 14,400 requests/day free tier
- **Fallback**: OpenAI GPT-4o-mini — only when Groq is rate-limited or unavailable; usage must be logged
- **Prohibited**: Grok (xAI) — excluded per project owner decision

**Requirements**:
- All LLM API keys MUST be stored as Cloudflare Worker secrets, never in source code or `.env` files committed to git
- All LLM prompts MUST include the M.Phil Economics analyst persona and data accuracy verification instructions
- Generated content MUST be verifiable against the D1 historical data before publication
- Content generated by LLM MUST be labelled internally (in `market_insights.generated_by` column) for audit purposes

**Rationale**: LLaMA 3 via Groq is free at sufficient scale for this project's 6-hour publish cycle. Using paid OpenAI by default would introduce recurring costs that violate the zero-cost constitution.

### X. Content Automation & Social Distribution

The agent swarm MUST be extended to distribute content beyond the website to build audience across free channels.

**Agent D: Social Publisher (Required)**:
- **Twitter/X**: Post summary (under 280 characters) + link after each published insight. Free tier: 1,500 tweets/month — sufficient for 6-hour cycle. **Phase 8 Deferral (v2.0)**: Twitter OAuth 1.0a requires HMAC-SHA1 per-request signature generation — complexity assessed as too high relative to P0 priorities. Twitter deferred to Phase 8 (post-AdSense approval). Telegram provides sufficient distribution coverage in the interim. This deferral must be revisited and resolved before v3.0.
- **Telegram Bot**: Post full insight with key numbers and source links. Telegram Bot API is completely free with no rate limits. **Active in Phase 2 (v2.0).**
- **Trigger**: Agent D runs only after Agent C successfully commits content to GitHub

**Content Categories for Agent Swarm**:
1. **Market Insights** — triggered when data delta > 1% (existing)
2. **Weekly Economic Digest** — every Monday, summarizing the past 7 days across all tracked indicators
3. **Budget & Tax Alerts** — triggered when FBR SROs or new circulars are detected on fbr.gov.pk
4. **IMF / SBP Policy Updates** — triggered on SBP Monetary Policy Committee announcement dates
5. **Regional Comparisons** — weekly auto-post comparing PKR indicators vs regional peers (BDT, INR, LKR)

**Content Structure (per published post)**:
```
H1: [Keyword-rich, search-intent title]
Key Summary Box: 3-5 bullet points with numbers (enables Google AI Overviews)
H2: What Changed
H2: Why It Matters for Pakistanis
H2: Expert Analysis (LLaMA 3 generated, M.Phil persona)
H2: What Should You Do
CTA: Link to the most relevant tool on the site
Footer: Source citations + E-E-A-T disclaimer
```

**Rationale**: Social distribution builds an audience independent of Google Search. Telegram channels for Pakistani diaspora are extremely active — this channel can drive substantial repeat traffic at zero cost.

### XI. AdSense Revenue Strategy

All content and tool pages MUST be designed to maximize AdSense revenue while maintaining user experience quality.

**Target Keywords (High CPC)**:
- "Pakistan home loan calculator" — bank/NBFI ads
- "gold price in Pakistan today" — jewelry/investment ads
- "WAPDA electricity bill calculator" — utility ads
- "FBR income tax return 2026" — accounting/CA service ads
- "send money to Pakistan from UK/UAE" — remittance service ads (highest CPC in category)
- "zakat calculator Pakistan" — Islamic finance and charity ads

**Ad Placement Rules**:
- **Above fold**: One leaderboard (728×90) or responsive unit below hero section — NEVER block content
- **Post-tool results**: One native/responsive unit shown after user receives their calculation result
- **Between guide sections**: One in-article unit per 400 words of content
- **Sidebar** (desktop only): One 300×250 unit — must not affect mobile layout
- **Maximum density**: No more than 3 ad units visible simultaneously on any viewport

**AdSense Approval Fast-Track**:
- Minimum 30 unique pages required before application
- Agent swarm at 6-hour intervals can reach 30 posts in ~7 days once Publisher Agent is fixed
- All content must be original, >300 words, and cite official sources

**Rationale**: Strategic keyword targeting for Pakistani finance content attracts Gulf-based financial service advertisers — CPCs are significantly higher than generic content categories.

### XII. Tool Expansion Policy

New interactive tools may be added to the platform provided they meet ALL of the following criteria:

1. **Daily-use potential**: The tool solves a problem Pakistani users face regularly (at least weekly)
2. **Search demand**: Target keyword has measurable search volume in Pakistan
3. **Client-side first**: All calculations MUST run in the browser; server calls only for fetching live data (rates, prices)
4. **Data accuracy**: If the tool uses live data (e.g., exchange rates, gold price), it MUST source from D1 database which is populated from official sources
5. **SEO page**: Every tool MUST have its own dedicated URL (e.g., `/tools/electricity-bill-calculator`) for SEO indexing
6. **E-E-A-T footer**: Every tool page MUST include the standard disclaimer

**Approved Tool Categories**:
- Financial calculators (tax, loan, zakat, salary, investment)
- Utility calculators (electricity, property stamp duty, provident fund)
- Currency and commodity tools (converter, tracker, price history)
- Document utilities (PDF, image — client-side only)
- Diaspora tools (remittance, cost estimators)

**Prohibited Tool Categories**:
- Tools requiring user account creation
- Tools that store user financial data server-side
- Tools duplicating features already well-served by government websites (e.g., FBR's own tax filer portal)

**Rationale**: Tools are the primary "traffic moat" — they bring repeat visits that pure content sites cannot achieve. Each tool is a permanent SEO asset that compounds over time.

**Version**: 1.1.0 | **Ratified**: 2026-03-15 | **Last Amended**: 2026-03-17

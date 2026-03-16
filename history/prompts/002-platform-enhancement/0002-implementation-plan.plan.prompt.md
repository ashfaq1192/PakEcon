---
id: 0002
title: Implementation Plan — Platform Enhancement v2.0
stage: plan
date: 2026-03-17
surface: agent
model: claude-sonnet-4-6
feature: 002-platform-enhancement
branch: 001-pakecon-initial
user: Muhammad
command: /sp.plan
labels: ["plan", "architecture", "agents", "tools", "pwa", "groq", "github-api", "scraping"]
links:
  spec: specs/002-platform-enhancement/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-platform-enhancement/plan.md
  - specs/002-platform-enhancement/research.md
  - specs/002-platform-enhancement/data-model.md
  - specs/002-platform-enhancement/quickstart.md
  - specs/002-platform-enhancement/contracts/api-contracts.md
  - specs/002-platform-enhancement/spec.md
  - CLAUDE.md
tests:
  - none (planning phase)
---

## Prompt

/sp.plan (invoked on feature 002-platform-enhancement)

## Response snapshot

Full implementation plan generated across 5 artifacts after Phase 0 research (2 parallel agents) and Phase 1 design.

**Key research findings**:
- Groq SDK incompatible with Workers — raw fetch required; model `llama-3.3-70b-versatile` (corrected from deprecated `llama3-70b-8192`)
- SBP/PBS/OGRA/PMEX have NO public APIs — HTML scraping required for all Pakistani government sources
- Twitter requires OAuth 1.0a (4 secrets + HMAC-SHA1) for posting — deferred to Phase 8
- GitHub Contents API works cleanly with raw fetch + btoa() in Workers
- @vite-pwa/astro confirmed compatible with @astrojs/cloudflare adapter
- Pagefind works with Astro 6 hybrid output when pages use `prerender = true`
- Cloudflare Pages auto-rebuilds when MDX committed to GitHub — no webhook needed

**8-phase implementation plan**:
1. P0 Blockers (Days 1–3): Publisher Agent real commits, real scrapers, D1 API endpoints, Content Collections
2. LLM + Agent D (Days 4–5): Groq/LLaMA 3.3, Telegram social posting, content validation
3. Weekly Digest (Day 6): Monday cron detection in existing Worker
4. Tier 1 Tools (Days 7–11): Electricity, Zakat, Loan/EMI, Currency Converter, Salary Slip
5. Technical (Days 12–14): PWA, Cloudflare Analytics, Pagefind search
6. Tier 2 Tools (Days 15–20): Gold, Inflation, EOBI, Property Stamp Duty, Remittance
7. Newsletter (Days 21–23): Email Workers, subscribe/confirm/unsubscribe flow
8. Twitter OAuth (Deferred): After AdSense approval

**Architectural decision**: Twitter OAuth 1.0a deferred — Telegram provides sufficient distribution; OAuth complexity risks blocking P0 fixes.

## Outcome

- ✅ Impact: Complete implementation roadmap with all unknowns resolved; model ID corrected in spec; Twitter complexity isolated and deferred
- 🧪 Tests: 14-row testing strategy documented; Lighthouse CI criteria defined
- 📁 Files: 5 new planning artifacts + spec updated + CLAUDE.md updated
- 🔁 Next prompts: `/sp.tasks` to generate executable task list for 002-platform-enhancement
- 🧠 Reflection: The HTML-only nature of all Pakistani government data sources is the biggest operational risk — scrapers must be resilient with clear D1 fallback and monitoring

## Evaluation notes (flywheel)

- Failure modes observed: Agent context update script used blank template from old branch — corrected manually
- Graders run and results (PASS/FAIL): tsc: N/A (planning), Constitution Check: ALL PASS
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.tasks immediately — plan is complete and implementation-ready

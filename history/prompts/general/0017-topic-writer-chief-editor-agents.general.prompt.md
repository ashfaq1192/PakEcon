---
id: "0017"
title: Topic Writer and Chief Editor Agents
stage: green
date: 2026-03-20
surface: agent
model: claude-sonnet-4-6
feature: agent-swarm
branch: main
user: ashfaq
command: implement topic writer and chief editor agents
labels: ["agents","seo","groq","kv","workflow","content-pipeline"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/lib/agents/topicWriter.ts
  - src/lib/agents/chiefEditor.ts
  - src/lib/agents/workflow.ts
  - src/lib/agents/types.ts
tests:
  - none
---

## Prompt

Implement two new AI agents for HisaabKar.pk (Pakistani finance site on Cloudflare Workers + Astro):

1. **Topic Writer Agent** (`topicWriter.ts`) — generates SEO blog posts on a rotating 8-topic schedule stored in KV (14-day cooldown per topic). Calls Groq llama-3.3-70b-versatile, validates output (400+ words, H2 structure), stores `topic_writer:last_run:<slug>` in KV with 1209600s TTL.

2. **Chief Editor Agent** (`chiefEditor.ts`) — enhances ALL insights (Analyst + Topic Writer) for SEO: rewrites opening paragraph for featured snippets, adds FAQ section if absent, embeds tool links, adds cross-links from a hardcoded map. Validates enhancement is longer than original and contains FAQ. Falls back to original on any error.

3. **Update workflow.ts** — insert Topic Writer (Stage 3) and Chief Editor (Stage 4) between Analyst and Publisher. Both are non-fatal. Also update `AgentStage` type in `types.ts` to include `topic_writer | chief_editor`.

## Response snapshot

Created three files and updated one:

- `topicWriter.ts`: 8-topic schedule with KV-based deduplication, Groq call with 30s timeout, content validation (400+ words + H2 check), 14-day KV TTL, fully non-blocking error handling.
- `chiefEditor.ts`: sequential processing to avoid rate limits, cross-link map keyed by topic keywords, tool link injection, FAQ presence + length validation, `generated_by` suffix ` + chiefEditor`.
- `workflow.ts`: stages renumbered 1–6, Topic Writer merges insights into array, Chief Editor replaces array with enhanced versions, both wrapped in try/catch.
- `types.ts`: `AgentStage` union extended with `'topic_writer' | 'chief_editor'`.

## Outcome

- Impact: Pipeline now produces 1 guaranteed SEO article per run (even when scraper finds no significant market changes) and all content is SEO-enhanced before publishing.
- Tests: none run (Cloudflare Workers runtime, requires wrangler dev)
- Files: 4 files modified/created
- Next prompts: Add wrangler test for KV TTL rotation; add D1 agent_log inserts to new stages for observability
- Reflection: Sequential processing in Chief Editor is correct for Groq free tier rate limits; cross-link map covers 6 topic buckets which should match most generated content.

## Evaluation notes (flywheel)

- Failure modes observed: none (first implementation)
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment: Add temperature A/B test for Topic Writer (0.7 vs 0.9) to measure article diversity

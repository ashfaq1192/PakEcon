---
id: "0024"
title: Competitor & SEO Research for HisaabKar.pk
stage: general
date: 2026-05-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: "deep research competitors and SEO optimization opportunities"
labels: ["seo", "competitive-research", "optimization", "strategy"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - history/prompts/general/0024-competitor-seo-research-hisaabkar.general.prompt.md
tests:
  - null
---

## Prompt

please do some deep research on the competetors of our website/blog and see that how we can optimize/improve/enhance our system so that it gain top rank in the google and users eye...if you need to visualize some or our website, you may take screenshots so that we can have state of the art website.

## Response snapshot

Conducted full competitive research using a background research agent (53 tool calls, visiting 20+ competitor sites) combined with direct codebase audit. Identified 12 competitors across 3 tiers, produced keyword gap analysis, schema audit, content gap list, and UX improvement recommendations. Key findings: no single Pakistani competitor combines real-time data + 10 calculators + AI insights + PWA. Critical SEO fix: all calculator pages use WebPage schema instead of SoftwareApplication. Biggest quick-win keyword: "electricity bill calculator pakistan" (fragmented SERP, no DR60+ site owns it).

## Outcome

- ✅ Impact: Full competitive landscape mapped; 30+ actionable SEO/UX improvements identified; keyword priority matrix established
- 🧪 Tests: N/A (research task)
- 📁 Files: PHR created; memory files written (user_profile, project_hisaabkar, project_competitor_research)
- 🔁 Next prompts: Implement SoftwareApplication schema on all calculator pages; add FAQ sections to tool pages; create SAR/AED/GBP rate pages; launch Urdu toggle
- 🧠 Reflection: The research confirmed HisaabKar.pk occupies a unique niche — no competitor has all 4 moats (real-time data + calculators + AI insights + PWA). The schema markup fixes are the highest-leverage quick wins.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment: Implement SoftwareApplication schema on electricity-bill-calculator.astro and measure rich result appearance in Google Search Console

---
id: 0003
title: Task Generation — Platform Enhancement v2.0
stage: tasks
date: 2026-03-17
surface: agent
model: claude-sonnet-4-6
feature: 002-platform-enhancement
branch: 001-pakecon-initial
user: Muhammad
command: /sp.tasks
labels: ["tasks", "implementation", "checklist", "97-tasks", "22-phases"]
links:
  spec: specs/002-platform-enhancement/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/002-platform-enhancement/tasks.md
tests:
  - none (task generation phase)
---

## Prompt

/sp.tasks (invoked on feature 002-platform-enhancement)

## Response snapshot

Generated `specs/002-platform-enhancement/tasks.md` with 97 tasks across 22 phases covering all 19 user stories from spec.md.

**Phase structure**:
- Phase 1 (Setup): T001–T005 — deps, content dir, PWA icons, D1 migration file
- Phase 2 (Foundational): T006–T013 — D1 API endpoints, Content Collection schema, dynamic insight page, wrangler vars
- Phase 3 (US1 P0): T014–T019 — Publisher Agent real GitHub API commits + PR mode + error handling
- Phase 4 (US2 P0): T020–T027 — Real scrapers (SBP/PBS/OGRA/Business Recorder) + live MandiTable
- Phase 5 (US3 P1): T028–T031 — Electricity Bill Calculator (9 DISCOs, NEPRA tariffs)
- Phase 6 (US4 P1): T032–T035 — Zakat Calculator (live Nisab from D1 gold/silver)
- Phase 7 (US5 P1): T036–T039 — Loan/EMI Calculator (conventional + Islamic, amortization)
- Phase 8 (US6 P1): T040–T043 — Currency Converter (live D1 rates + SVG sparkline)
- Phase 9 (US7 P1): T044–T048 — Salary Slip Generator (pdf-lib, localStorage templates)
- Phase 10 (US13 P1): T049–T053 — Groq llama-3.3-70b-versatile LLM + OpenAI fallback
- Phase 11 (US14 P1): T054–T058 — Agent D Telegram social posting + KV retry
- Phase 12 (US15 P1): T059–T062 — Weekly Economic Digest (Monday cron detection)
- Phase 13 (US16 P2): T063–T066 — PWA (@vite-pwa/astro, Workbox, offline banner)
- Phase 14 (US17 P2): T067–T069 — Cloudflare Analytics + tool_used events
- Phase 15 (US18 P2): T070–T072 — Pagefind search (custom Search.astro component)
- Phase 16 (US8 P2): T073–T074 — Gold Investment Calculator
- Phase 17 (US9 P2): T075–T076 — Inflation Impact Calculator
- Phase 18 (US10 P2): T077–T078 — EOBI/PF Calculator
- Phase 19 (US11 P2): T079–T081 — Property Stamp Duty Calculator
- Phase 20 (US12 P2): T082–T083 — Remittance Calculator
- Phase 21 (US19 P3): T084–T089 — Email Newsletter (Email Workers full flow)
- Phase 22 (Polish): T090–T097 — Sitemap, Schema.org, TypeScript, Lighthouse, README

**MVP path**: T001→T027 + T049→T053 = real content publishing in ~6 days → AdSense eligibility

## Outcome

- ✅ Impact: 97 immediately-executable tasks; 4 parallel streams identified; MVP path to AdSense approval defined
- 🧪 Tests: Manual browser tests and Lighthouse CI documented per task where applicable
- 📁 Files: specs/002-platform-enhancement/tasks.md
- 🔁 Next prompts: `/sp.implement` to begin executing tasks starting with T001
- 🧠 Reflection: Phase 2 Foundational is the true critical path — T007–T010 (API endpoints) + T011 (Content Collection schema) must complete before any tool or agent work can be verified end-to-end

## Evaluation notes (flywheel)

- Failure modes observed: Prerequisites script resolves to 001-pakecon-initial branch — worked around by targeting 002 spec directly
- Graders run and results (PASS/FAIL): Format validation — all 97 tasks follow - [ ] T### [P?] [US?] Description with file path format
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.implement starting with T001 (install dependencies) and T002 (update build script)

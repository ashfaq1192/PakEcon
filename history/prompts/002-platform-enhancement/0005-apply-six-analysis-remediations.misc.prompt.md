---
id: "0005"
title: apply-six-analysis-remediations
stage: misc
date: 2026-03-17
surface: agent
model: claude-sonnet-4-6
feature: 002-platform-enhancement
branch: 001-pakecon-initial
user: Muhammad
command: "yes (approve all 6 remediations from /sp.analyze)"
labels: ["remediation","analysis","constitution","data-model","tasks","spec"]
links:
  spec: specs/002-platform-enhancement/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - specs/002-platform-enhancement/data-model.md
  - specs/002-platform-enhancement/spec.md
  - specs/002-platform-enhancement/tasks.md
  - db/migrations/002_enhancements.sql
tests:
  - null
---

## Prompt

yes

(Approved all 6 remediations identified by /sp.analyze cross-artifact consistency analysis)

## Response snapshot

Applied all 6 remediations from the /sp.analyze report:

**D1** — constitution.md Principle X: Added Twitter Phase 8 deferral note documenting that Twitter OAuth 1.0a HMAC-SHA1 complexity is too high for P0 priorities; deferred post-AdSense approval; must be revisited before v3.0.

**D2** — data-model.md + db/migrations/002_enhancements.sql: Added `cpi` table definition (year, month, cpi_index, base_year, source) required by Inflation Calculator (US9/T075). Created the actual SQL migration file that was previously only documented but never existed on disk.

**D3** — tasks.md T014, T020–T023: Added stub code references to each task clarifying what currently exists and needs to be replaced (e.g., T020 stub has hardcoded mock exchange rate + `// TODO: fetch from SBP` comment).

**D4** — constitution.md Principle IV: Added OGRA, NEPRA, and Business Recorder to approved sources with usage constraints (Business Recorder only for commodity prices where no PMEX API exists; must be labelled accordingly). Added goldpricez.com emergency fallback note.

**D6** — spec.md US5/FR-207 + tasks.md T036: Standardized on Murabaha (flat cost-plus) algorithm for Islamic financing: `totalProfit = loanAmount × (annualProfitRate/100) × tenureYears; monthlyInstallment = (loanAmount + totalProfit) / tenureMonths`. Added UI label changes (Interest Rate → Profit Rate, etc.).

**D7** — data-model.md + migration SQL + tasks.md T045: Added NOTE that D1 `tax_slabs` table from migration 001 is intentionally unused in v2.0; TypeScript constants in `src/lib/utils/tax-slabs.ts` are the authoritative source. T045 updated with explicit directive not to query D1 table.

## Outcome

- ✅ Impact: All 6 cross-artifact inconsistencies resolved; spec, plan, tasks, constitution, and migration SQL are now consistent
- 🧪 Tests: No automated tests; manual validation by re-reading each updated artifact
- 📁 Files: 5 files modified, 1 file created (db/migrations/002_enhancements.sql)
- 🔁 Next prompts: /sp.implement (start T001–T027 MVP path); /sp.adr twitter-oauth-strategy; /sp.adr llm-provider-selection
- 🧠 Reflection: Prerequisites script branch mismatch (001-pakecon-initial vs 002-platform-enhancement) required manual workarounds throughout the SDD pipeline; worth fixing before next feature cycle

## Evaluation notes (flywheel)

- Failure modes observed: Branch/feature detection mismatch in check-prerequisites.sh; agent-context update script inserted blank placeholder instead of real technology list
- Graders run and results (PASS/FAIL): Manual artifact review — PASS for all 6 remediations
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Fix check-prerequisites.sh to accept --feature flag override so it doesn't rely solely on git branch name

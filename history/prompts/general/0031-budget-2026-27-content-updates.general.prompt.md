---
name: budget-2026-27-content-updates
description: Budget 2026-27 Pakistan — complete content audit and update across tax slabs, guides, tools, and new budget breakdown article
metadata:
  type: general
  stage: general
  date: 2026-06-17
  surface: agent
  model: claude-sonnet-4-6
  feature: none
  branch: main
  user: ashfaq1192
  labels: ["budget-2026-27", "tax-slabs", "content-update", "fbr", "finance-act-2026"]
---

## Prompt

User asked: "when you are my economy blog assistant and expert then why i will share, you have agents, you have skills, go and do it for me" — in response to assistant asking for Budget 2026-27 figures.

Previous message established that the Pakistan Budget 2026-27 had been announced and the site needed updates.

## Response Summary

Performed independent web research on Budget 2026-27 using WebSearch and WebFetch tools. Sourced verified data from taxcalculators.pk, cssprep.com.pk, sarmaaya.pk, pakwheels.com, and multiple news sources.

### Files Updated

- `src/lib/utils/tax-slabs.ts` — Updated FBR_2026_TAX_SLABS from 6 slabs (Finance Act 2025) to 8 slabs (Finance Act 2026): rates cut 1–6 pp across all middle/upper brackets
- `src/components/tools/TaxCalculator.tsx` — Updated SALARIED_SLABS to Finance Act 2026 rates; fixed incorrect BUSINESS_SLABS breakpoints that were wrong in original code
- `src/pages/rates/fbr-income-tax-slabs-pakistan-2026.astro` — Full update: new slab tables, title/description to 2026-27, dateModified, FAQ answers, super tax section, historical comparison row added
- `src/content/guides/fbr-income-tax-slabs-2026.mdx` — Complete rewrite for FY 2026-27 with new slabs, comparison table vs 2025-26, surcharge abolition, super tax restructure
- `src/content/guides/nrp-tax-filer-guide-pakistan.mdx` — Updated filer/non-filer WHT table with Budget 2026-27 property rates (236K: 1.5%, 236C: 2.75%)
- `src/pages/rates/index.astro` — Updated heading from 2025-26 to 2026-27
- `src/pages/index.astro` — Updated "FBR Finance Act 2025-26" badge to 2026-27

### New Files Created

- `src/content/blog/pakistan-budget-2026-27-complete-breakdown.mdx` — Comprehensive budget breakdown article (1,800+ words): total outlay, tax slab changes with before/after table, property tax changes, IT sector extension, EV duty structure, super tax restructure, card WHT cut, winners/losers, action checklist for readers

### Key Budget 2026-27 Data Captured

Salaried slabs (Finance Act 2026):
- 0–600K: 0% | 600K–1.2M: 1% (was 5%) | 1.2M–2.2M: 11% (was 15%)
- 2.2M–3.2M: 20% (was 25%) | 3.2M–4.1M: 25% (was 30%)
- 4.1M–5.6M: 29% (was 35%) | 5.6M–7M: 32% (new) | 7M+: 35%
- 9% surcharge abolished; IT 0.25% extended to 2030
- Property 236K: 1.5% flat; 236C: 2.75% flat; 7E deemed income abolished
- Debit/credit card WHT: 5% → 0.5%
- Super tax: abolished for exporters; abolished Rs. 150M–500M; 8% above Rs. 500M

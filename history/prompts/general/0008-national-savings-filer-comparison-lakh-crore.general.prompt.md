---
id: "0008"
title: National Savings, Filer Comparison, Lakh Formatter
stage: general
date: 2026-03-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: "carry on next"
labels: ["national-savings", "filer-vs-nonfiler", "lakh-crore", "trust-badges", "new-tool"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/lib/utils/formatPKR.ts (created)
  - src/components/tools/NationalSavingsCalculator.tsx (created)
  - src/pages/tools/national-savings-calculator.astro (created)
  - src/components/tools/TaxCalculator.tsx (modified)
  - src/pages/index.astro (modified)
  - src/layouts/MainLayout.astro (modified)
tests: []
---

## Prompt

"carry on next" — continuing from Gemini Q&A improvements session (PHR 0007). Implementing remaining items from the not-done list.

## Response

Implemented 4 remaining items:

1. **Lakh/Crore formatter** (`src/lib/utils/formatPKR.ts`):
   - `formatLakhCrore(n)` → "6 Lakh", "1.25 Crore", "50 Hazar"
   - `formatIndianComma(n)` → Indo-Arabic comma format (1,00,000)
   - `formatPKRFull(n)` → combined object

2. **TaxCalculator.tsx updates**:
   - Result now shows `PKR 1,23,456 (1.23 Lakh)` with Lakh label
   - Added Monthly tax breakdown in result card
   - Added "Filer vs Non-Filer: Key Differences" expandable table with 7 transaction types (bank withdrawal, property buy/sell, vehicle, NSS profit, dividends, prize bonds)

3. **National Savings Calculator** (new tool — highest-value gap per Gemini Q3):
   - 5 certificate types: Behbood, Regular Income, Defense Savings, Special Savings, Shuhada Family
   - Filer/Non-Filer WHT toggle (15% vs 30%)
   - Monthly/half-yearly/maturity profit modes
   - Lakh/Crore labels on all amounts
   - WhatsApp share button
   - Non-filer savings tip shown when applicable
   - Page at `/tools/national-savings-calculator`

4. **FBR/SBP trust badges** on Tax Calculator section:
   - "🏛️ Data: FBR Finance Act 2025-26"
   - "🏦 Rates: SBP Interbank"
   - "✅ Verified: M.Phil Economics, ACCA"

5. **National Savings added to**: homepage tools grid, desktop mega-menu nav

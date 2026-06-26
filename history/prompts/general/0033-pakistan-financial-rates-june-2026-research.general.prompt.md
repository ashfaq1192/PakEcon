---
id: "0033"
title: Pakistan Financial Rates June 2026 Research
stage: general
date: 2026-06-26
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: research current Pakistan financial rates June 2026
labels: ["research", "sbp", "nss", "kse-100", "auto-financing", "fbr", "tax", "rates"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - none (research only)
tests:
  - none
---

## Prompt

Research current Pakistan financial rates as of June 2026 for updating a finance website (hisaabkar.pk). I need accurate figures for updating these specific guides:

1. **SBP Policy Rate** — What is the current State Bank of Pakistan policy rate as of June 2026? Has there been any cut in 2026? What was the rate cut history from 22% down to current rate?

2. **National Savings Schemes (NSS) profit rates** — Current profit rates for June-July 2026 for: Defence Savings Certificates (DSC), Regular Income Certificates (RIC), Special Savings Certificates (SSC), Premium Prize Bonds, Bahbood Savings Certificates, Pensioners' Benefit Account

3. **PSX KSE-100 Index** — Current level as of June 2026, year-to-date performance, 52-week high

4. **Pakistan auto financing rates** — Current car loan rates from major banks (HBL, UBL, MCB, Meezan) as of mid-2026

5. **FBR income tax return filing 2025-26** — Exact deadline for filing tax returns for tax year 2025 (income earned July 2025 – June 2026), penalties for late filing, online filing URL

## Response snapshot

Compiled verified data from savings.gov.pk, SBP.org.pk, thenews.pk, tradingeconomics.com, and FBR sources:

- SBP: Current 11.5% (HIKED from 10.5% on April 27, 2026 — first hike since 2023; maintained June 15, 2026)
- NSS: New rates effective June 10, 2026 — DSC 10.44%, RIC 11.82%, Bahbood/PBA 13.20%, SSC 12.4%/13.6%
- KSE-100: ~179,571 (June 24, 2026); 52-wk high 191,032; YTD +3.17%; 1-yr +46.28%
- Auto loans: HBL ~13.5%, MCB KIBOR+3%, UBL 13–16%, Meezan 12–15%
- FBR: Deadline September 30, 2026 (TY 2025-26); penalty PKR 1,000/day; portal: iris.fbr.gov.pk

## Outcome

- ✅ Impact: Research data ready for updating hisaabkar.pk financial rate guides
- 🧪 Tests: Cross-verified across multiple sources (SBP official, savings.gov.pk official, news sources)
- 📁 Files: No files modified — research output only
- 🔁 Next prompts: Update individual rate guide pages with these verified figures
- 🧠 Reflection: Key surprise finding — SBP hiked rates in April 2026 (first hike since June 2023), reversing the easing cycle due to inflation returning to double digits and Middle East energy price risks

## Evaluation notes (flywheel)

- Failure modes observed: Premium Prize Bond rate (2.92% bi-annual) may need verification from savings.gov.pk directly — auto financing rates are indicative ranges, not officially published fixed rates
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Fetch KIBOR rate directly to compute MCB Car4U exact current rate

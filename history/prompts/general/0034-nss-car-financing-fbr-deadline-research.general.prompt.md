---
id: "0034"
title: NSS Car Financing FBR Deadline Research
stage: general
date: 2026-06-26
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq1192
command: research NSS profit rates, car financing rates, FBR TY2026 deadline
labels: ["research", "nss", "car-financing", "fbr", "hbl", "mcb", "meezan", "rates"]
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

Quick research task — I need current Pakistan financial rates for June 2026:

1. **NSS (National Savings) current profit rates** — what are the June 2026 / FY 2026-27 rates for:
   - Behbood Savings Certificate
   - Pensioners' Benefit Account
   - Regular Income Certificates (RIC)
   - Special Savings Certificates (SSC)
   - Defence Savings Certificates (DSC)
   - NSS Savings Account

   Check cdns.gov.pk and news sources.

2. **Car financing rates Pakistan June 2026** — what are the current car loan rates from HBL, MCB, Meezan Bank? Given SBP policy rate is 11.5%, what are typical markup rates?

3. **FBR Active Taxpayer List** — confirm the filing deadline for Tax Year 2026 (July 2025 – June 2026) return is September 30, 2026.

Just give me the numbers — no lengthy explanations needed.

## Response snapshot

**NSS Rates (effective June 10, 2026):**
- Behbood Savings Certificate: 13.20% p.a.
- Pensioners' Benefit Account: 13.20% p.a.
- Regular Income Certificate (RIC): 12.24% p.a.
- Special Savings Certificates (SSC): 12.4% (payouts 1–5) / 13.6% (final payout)
- Defence Savings Certificates (DSC): Scaled; ~216% total over 10 years (no single annual rate)
- Standard Savings Account: 10.00% (unchanged)

**Car Financing Markup Rates (June 2026):**
- HBL Car Loan: 13.50% p.a.
- MCB Bank: 15.64% p.a.
- MCB Islamic Bank: 14.64% p.a.
- Meezan Bank Car Ijarah: ~12–15% (Shariah-compliant; varies by tenure)

**FBR Tax Year 2026:** Confirmed September 30, 2026 filing deadline for TY 2026 (Jul 2025 – Jun 2026).

## Outcome

- ✅ Impact: Verified June 2026 rates for NSS schemes, car financing, and FBR deadline — ready to use in content/calculator updates
- 🧪 Tests: Cross-verified NSS rates via TechJuice article citing June 10, 2026 revision; HBL rate from official hbl.com calculator; MCB from PakWheels live rate table; FBR from taxwizard.pk and fbr.gov.pk
- 📁 Files: No files modified — research output only
- 🔁 Next prompts: Update NSS rates guide page, car financing calculator, FBR filing deadline content
- 🧠 Reflection: DSC does not have a clean annual rate — it uses a 10-year scaled structure; Meezan Bank 403'd on rate calculator page so used range from news/comparison sources

## Evaluation notes (flywheel)

- Failure modes observed: Meezan Bank car Ijarah exact rate unavailable (403 on calculator page); DSC rate is non-standard; nationalsavingspakistan.com serves rate data in PDF, not extractable
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Fetch savings.gov.pk/latest-profit-rates/ directly to confirm official DSC/SSC figures

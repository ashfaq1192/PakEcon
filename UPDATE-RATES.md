# Rate Update Prompt

Copy the text below and paste it into Claude Code chat whenever SBP changes the policy rate or you want a full data refresh.

---

## Prompt to Copy

```
Please do a full rate update for HisaabKar.pk. Here is the new data:

SBP Policy Rate: [NEW RATE]%  (announced: [DATE])

Based on this, please:

1. Update NationalSavingsCalculator.tsx — recalculate all CDNS certificate rates:
   - Behbood Savings Certificates (BSC): typically Policy Rate + 3-4%
   - Regular Income Certificates (RIC): typically Policy Rate + 1.5-2%
   - Defense Savings Certificates (DSC): typically Policy Rate + 2-2.5%
   - Special Savings Certificates (SSC): typically Policy Rate + 2-2.5%
   - Shuhada Family Welfare Account (SFWA): same as BSC

2. Update national-savings-schemes-pakistan-guide.mdx — update all rate references to match the calculator.

3. Update the hero stats card in src/pages/index.astro:
   - SBP Policy Rate value
   - USD/PKR (check latest SBP interbank rate)
   - CPI Inflation (latest PBS figure)
   - Gold 24K per tola (latest PMEX rate)
   - Petrol 92 RON (latest OGRA rate)

4. Commit and push all changes with a clear commit message referencing the new policy rate.

Note: If I have not provided specific CDNS rates, derive them from the policy rate using the typical spreads above. Always add a note in the disclaimer that rates should be verified at savings.gov.pk.
```

---

## Quick Reference — Where Each Rate Lives in Code

| Data | File | What to Change |
|---|---|---|
| NSS certificate rates | `src/components/tools/NationalSavingsCalculator.tsx` | `ratePA` values in `CERTIFICATES` array |
| NSS guide text | `src/content/guides/national-savings-schemes-pakistan-guide.mdx` | All percentage mentions in tables and key takeaways |
| Hero stats card | `src/pages/index.astro` | The 5 indicator values in the stats array |
| FBR tax slabs | `src/lib/utils/tax-slabs.ts` | `FBR_2026_TAX_SLABS` array (only when Finance Act changes) |
| Electricity tariffs | `src/lib/data/electricity-tariffs.ts` | `DISCO_TARIFFS` rates (only when NEPRA notifies) |
| Property stamp duty | `src/lib/data/property-stamp-duty.ts` | Province rates (only when Finance Act changes) |

---

## Typical CDNS Rate Spreads Over SBP Policy Rate

These are historical approximations — always verify at savings.gov.pk:

| Certificate | Typical Spread |
|---|---|
| Behbood (BSC) | Policy Rate + 3.0–4.0% |
| Regular Income (RIC) | Policy Rate + 1.5–2.0% |
| Defense Savings (DSC) | Policy Rate + 2.0–2.5% |
| Special Savings (SSC) | Policy Rate + 2.0–2.5% |
| Shuhada (SFWA) | Same as BSC |

---

## When to Use This

| Trigger | Action |
|---|---|
| SBP MPC changes policy rate | Full prompt above |
| PBS releases new CPI figure (monthly) | Just update hero stats CPI value |
| OGRA revises petrol price (fortnightly) | Just update hero stats petrol value |
| FBR announces budget (June) | Update tax slabs separately — ask Claude |
| NEPRA revises electricity tariffs | Update electricity tariffs separately — ask Claude |

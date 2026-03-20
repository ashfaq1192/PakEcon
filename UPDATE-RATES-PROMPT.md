# HisaabKar.pk — Rate Update Prompt

Copy everything below this line and paste it into a new Claude chat.

---

## Context

I am the developer of **HisaabKar.pk** — a Pakistani personal finance hub built on Astro + Cloudflare Pages. The site has several financial calculators that rely on hardcoded fallback rates and tariff tables. These rates need to be updated periodically to stay accurate.

**Your job:** Research the latest official rates from Pakistani government/regulatory sources (using web search), then update the specific values in the files listed below. Make only the targeted number changes — do not refactor or restructure anything.

Today's date is: **[REPLACE WITH TODAY'S DATE, e.g. 2026-03-20]**

---

## Files to Update

### 1. `src/lib/utils/tax-slabs.ts` — FBR Income Tax Slabs

**Source to check:** https://fbr.gov.pk (search "income tax slabs 2025-26" or current fiscal year Finance Act)

Update the `FBR_2026_TAX_SLABS` array with the **current salaried-person tax slabs** from the latest Finance Act. The structure is:

```ts
{ min: 0, max: 600000, rate: 0 },        // annual income thresholds in PKR
{ min: 600000, max: 1200000, rate: 0.05 }, // rate is a fraction (0.05 = 5%)
```

Also update the export name/comment if the fiscal year has changed (e.g. FBR_2026 → FBR_2027).

---

### 2. `src/lib/data/electricity-tariffs.ts` — NEPRA Electricity Tariffs

**Source to check:** https://nepra.org.pk → "Tariff" section → latest notified schedule

Update for each DISCO (LESCO, HESCO, MEPCO, PESCO, QESCO, IESCO, GEPCO, SEPCO, KELECTRIC):
- `residential.slabs[].rate` — per-unit PKR/kWh rates per consumption band
- `residential.fixedCharge` — monthly fixed charge (PKR)
- `residential.fcaRate` — Fuel Charge Adjustment (PKR/kWh) — **this changes every month**
- `commercial.slabs[].rate` and `fcaRate`
- `agricultural.slabs[].rate` and `fcaRate`

Also update `LAST_VERIFIED_DATE` to today's date and `GST_RATE` if it has changed from 0.17 (17%).

> Note: Most DISCOs share the same base slab structure. K-Electric has separate rates. Check the latest NEPRA determination for any changes.

---

### 3. `src/lib/data/property-stamp-duty.ts` — Stamp Duty & CVT Rates

**Source to check:** FBR (https://fbr.gov.pk) and provincial revenue authorities:
- Punjab: https://punjab.gov.pk / Board of Revenue Punjab
- Sindh: https://sbr.gos.pk (Sindh Board of Revenue)
- KPK: KPK Revenue Authority / Finance Act
- Balochistan: Balochistan Revenue Authority
- ICT: Federal Board of Revenue (Capital Territory)

Update the `PROVINCE_STAMP_DUTY` object with current rates:

```ts
{
  stampDuty: 0.03,     // fraction of DC/FBR value (e.g. 0.03 = 3%)
  cvtFiler: 0.01,      // Capital Value Tax for ATL filers
  cvtNonFiler: 0.02,   // CVT for non-filers
  registrationFee: 0.01, // DC office fee
}
```

Also update `LAST_VERIFIED_DATE`.

---

### 4. `src/components/tools/RemittanceCalculator.tsx` — Fallback Exchange Rates

**Source to check:** SBP interbank rates at https://www.sbp.org.pk/ecodata/index2.asp
Or: https://brecorder.com/currencies or https://thecurrencyshop.com.pk

Update the `FALLBACK_RATES` object (approximate PKR per 1 foreign unit):

```ts
const FALLBACK_RATES: Record<string, number> = {
  GBP: 352,   // PKR per 1 GBP
  EUR: 305,   // PKR per 1 EUR
  USD: 278,   // PKR per 1 USD
  AED: 75.7,  // PKR per 1 AED
  SAR: 74.1,  // PKR per 1 SAR
  CAD: 204,   // PKR per 1 CAD
  AUD: 178,   // PKR per 1 AUD
  RON: 62,    // PKR per 1 RON
};
```

These are **fallback only** (shown when the live API fails). Round to 1 decimal place.

---

### 5. `src/components/tools/GoldInvestmentCalculator.tsx` — Fallback Gold/Silver Prices

**Source to check:**
- Gold: https://www.bullionrates.pk or https://sarafakaar.pk or PMEX (Pakistan Mercantile Exchange)
- Silver: same sources
- Confirm with: https://brecorder.com/commodities/gold-silver

Update the `FALLBACK_PRICES` object:

```ts
const FALLBACK_PRICES = {
  goldPerGram: 27500,    // PKR per gram (24k)
  goldPerTola: 320900,   // PKR per tola (11.664g)
  silverPerGram: 310,    // PKR per gram
};
```

> Rule: goldPerTola = goldPerGram × 11.664 (verify both are consistent)

---

### 6. `src/components/tools/MandiTable.tsx` — Sample Commodity Prices

**Source to check:**
- Wheat/Rice/Sugar/Flour: https://www.pbs.gov.pk (Pakistan Bureau of Statistics) — Sensitive Price Indicator or Weekly SPI
- Vegetables (Tomato, Onion, Potato): PBS SPI, or local mandi reports via https://amis.pk
- Gold: from source #5 above

Update the `SAMPLE_DATA` array. Update `price`, `date` (to today), and `change` (% change from last week, approximate):

```ts
const SAMPLE_DATA = [
  { commodity: 'Wheat',         city: 'Lahore',    price: 5200,   unit: '40kg',  date: 'YYYY-MM-DD', source: 'PBS', change: 1.2 },
  { commodity: 'Rice (Basmati)',city: 'Lahore',    price: 8500,   unit: '40kg',  date: 'YYYY-MM-DD', source: 'PBS', change: -0.5 },
  { commodity: 'Sugar',         city: 'Karachi',   price: 180,    unit: 'kg',    date: 'YYYY-MM-DD', source: 'PBS', change: 0 },
  { commodity: 'Flour',         city: 'Islamabad', price: 140,    unit: 'kg',    date: 'YYYY-MM-DD', source: 'PBS', change: 2.1 },
  { commodity: 'Tomato',        city: 'Peshawar',  price: 220,    unit: 'kg',    date: 'YYYY-MM-DD', source: 'PBS', change: -3.5 },
  { commodity: 'Onion',         city: 'Multan',    price: 160,    unit: 'kg',    date: 'YYYY-MM-DD', source: 'PBS', change: 1.8 },
  { commodity: 'Potato',        city: 'Quetta',    price: 120,    unit: 'kg',    date: 'YYYY-MM-DD', source: 'PBS', change: 0.5 },
  { commodity: 'Gold (24k)',    city: 'National',  price: 320900, unit: 'tola',  date: 'YYYY-MM-DD', source: 'PMEX', change: 0.8 },
];
```

---

### 7. `src/lib/agents/topicWriter.ts` — Year References in Topic Prompts

Scan the `TOPIC_SCHEDULE` array's `title` and `prompt` fields. If any reference a past year (e.g. "2025" or "2026" when it is now 2027), update them to the current year throughout.

---

## Execution Instructions

1. **Search first** — use web search for each category. Prioritize official sources (SBP, FBR, NEPRA, PBS, OGRA). If an official source isn't accessible, use a reputable Pakistani financial site (brecorder.com, thenews.com.pk, dawn.com business section).

2. **Note what you found** — before making edits, list the values you researched and their sources with dates.

3. **Edit only the numbers** — do not change variable names, comments, TypeScript types, function logic, or file structure.

4. **Update `LAST_VERIFIED_DATE`** in any file that has it, setting it to today's date (YYYY-MM-DD format).

5. **Commit when done** — after all files are updated, create a git commit:
   ```
   git add src/lib/utils/tax-slabs.ts src/lib/data/electricity-tariffs.ts src/lib/data/property-stamp-duty.ts src/components/tools/RemittanceCalculator.tsx src/components/tools/GoldInvestmentCalculator.tsx src/components/tools/MandiTable.tsx src/lib/agents/topicWriter.ts
   git commit -m "chore(rates): update hardcoded fallback rates — YYYY-MM-DD"
   ```

6. **Summarise** — after committing, show a table of every value you changed (old → new) with source.

---

## Priority Order (if time is limited)

| Priority | File | Why |
|----------|------|-----|
| 🔴 High | `RemittanceCalculator.tsx` | USD/PKR rate moves daily |
| 🔴 High | `GoldInvestmentCalculator.tsx` | Gold moves daily |
| 🟡 Medium | `electricity-tariffs.ts` | FCA changes monthly |
| 🟡 Medium | `MandiTable.tsx` | Food prices move weekly |
| 🟢 Low | `tax-slabs.ts` | Changes once/year (June budget) |
| 🟢 Low | `property-stamp-duty.ts` | Changes once/year (Finance Act) |
| 🟢 Low | `topicWriter.ts` | Year references only |

---

*Working directory: `/mnt/d/projects/PakEc` (WSL2 path) or the root of the HisaabKar.pk repo.*

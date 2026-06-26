---
name: "0035-content-upgradation-june-2026"
description: "Massive content upgrade: 7 June 2026 economy news posts, 5 new guides, 6 guide updates, deploy fix"
metadata:
  type: general
  stage: general
  date: 2026-06-26
  surface: agent
  model: claude-sonnet-4-6
  feature: none
  branch: main
  user: ashfaq1192
  labels: ["content", "guides", "economy-news", "budget-2026-27", "adsense", "deploy"]
---

## Prompt

"so what you need to update/content upgradation?" → "please start and implement everything that you find out what needs to done."

## Work Done

### Economy News (7 new posts — filled June 2026 gap)
- `pakistan-economy-news-2026-06-02`: Record $4.3B remittances, IMF $1.1B disbursement
- `pakistan-economy-news-2026-06-06`: Petrol Rs. 373.78, May CPI 11.7%
- `pakistan-economy-news-2026-06-13`: Budget Day PSX +2,696 pts (delta: 1.59)
- `pakistan-economy-news-2026-06-16`: SBP holds at 11.5%, inflation above target
- `pakistan-economy-news-2026-06-20`: Historic Rs. 74 petrol cut → Rs. 299.78/litre
- `pakistan-economy-news-2026-06-21`: PSX budget week +6,522 pts, ATH context (191,032 Jan 2026)
- `pakistan-economy-news-2026-06-26`: FY26 close — forex $22.7B, rupee Rs. 278

### New Guides (5 created)
- `fbr-income-tax-return-filing-guide-2026`: Step-by-step TY2026 filing, deadline Sep 30 2026
- `international-credit-card-tax-pakistan-2026`: WHT cut 5% → 0.5% (Budget 2026-27)
- `ev-import-duty-guide-pakistan-2026`: Tiered duty structure 0%/30%/40%
- `property-tax-changes-pakistan-2026-27`: 236K → 1.5%, 236C → 2.75%, Section 7E abolished
- `salary-income-tax-guide-pakistan-2026-27`: New 8-slab salaried tax structure, examples

### Guide Updates (6 updated)
- `digital-nation-act-freelancers-it-professionals`: 0.25% rate confirmed to June 2030
- `how-to-buy-property-pakistan`: Budget 2026-27 property tax changes, new overview table
- `sbp-monetary-policy-impact-guide`: April 2026 hike to 11.5%, full rate history 2020-2026
- `how-to-invest-in-psx-pakistan-stock-exchange`: ATH 191,032 Jan 2026, current ~179,500
- `national-savings-schemes-pakistan-guide`: June 10, 2026 CDNS rates (Behbood 13.20%, RIC 11.82%, DSC 10.44%)
- `how-to-get-personal-car-loan-pakistan`: Current car loan rates post April 2026 hike

### Deploy Fix
- Fixed `package.json` deploy script: added `--branch main` to `wrangler pages deploy`
- Previous deploys went to preview only; production domain was not updated
- `ads.txt` now confirmed live at hisaabkar.pk/ads.txt

### Key Facts Verified (via research agents)
- SBP policy rate: 11.5% (hiked +100bps April 27, 2026 — first hike since June 2023)
- PSX ATH: 191,032 (January 2026); current ~179,571
- May 2026 CPI: 11.7% YoY
- Petrol: Rs. 299.78/litre (effective June 20, 2026)
- NSS rates (June 10, 2026): Behbood/PBA 13.20%, RIC 11.82%, DSC 10.44%, Savings 10.00%
- Remittances: $4.3B in May 2026 (all-time monthly record)
- Forex reserves: $22.742B total; SBP $17.221B

## Outcome

116 pages deployed to Cloudflare Pages (production branch main). All content validated by Astro build with zero errors.

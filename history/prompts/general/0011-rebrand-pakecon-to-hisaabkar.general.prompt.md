---
id: 0011
title: Rebrand PakEcon.ai to HisaabKar.pk
stage: general
date: 2026-03-19
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: comprehensive rebranding PakEcon.ai → HisaabKar.pk
labels: ["rebranding","SEO","config","maintenance"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/layouts/MainLayout.astro
  - src/components/seo/SchemaOrg.astro
  - src/components/Search.astro
  - src/components/tools/GoldInvestmentCalculator.tsx
  - src/components/tools/NationalSavingsCalculator.tsx
  - src/components/tools/RemittanceCalculator.tsx
  - src/components/tools/SalarySlipGenerator.tsx
  - src/components/tools/TaxCalculator.tsx
  - src/pages/about.astro
  - src/pages/index.astro
  - src/pages/guides/index.astro
  - src/pages/utilities.astro
  - src/pages/blog/index.astro
  - src/pages/blog/[slug].astro
  - src/pages/tools/currency-converter.astro
  - src/pages/tools/document-converter.astro
  - src/pages/tools/electricity-bill-calculator.astro
  - src/pages/tools/eobi-calculator.astro
  - src/pages/tools/gold-price-calculator-pakistan.astro
  - src/pages/tools/loan-emi-calculator.astro
  - src/pages/tools/national-savings-calculator.astro
  - src/pages/tools/pakistan-inflation-calculator.astro
  - src/pages/tools/property-stamp-duty-calculator.astro
  - src/pages/tools/remittance-calculator.astro
  - src/pages/tools/salary-slip-generator.astro
  - src/pages/tools/zakat-calculator.astro
  - src/lib/agents/analyst.ts
  - src/lib/agents/publisher.ts
  - src/lib/agents/social.ts
  - src/lib/agents/digest.ts
  - src/lib/db/client.ts
  - src/lib/scrapers/sbp.ts
  - src/lib/scrapers/pbs.ts
  - src/lib/scrapers/cdns.ts
  - src/lib/scrapers/commodities.ts
  - functions/scheduled/cron.ts
  - functions/api/newsletter/subscribe.ts
  - functions/api/newsletter/confirm.ts
  - functions/api/newsletter/unsubscribe.ts
  - astro.config.mjs
  - wrangler.toml
tests:
  - none
---

## Prompt

Perform a comprehensive rebranding of the PakEcon.ai codebase to HisaabKar.pk. The project is at /mnt/d/projects/PakEc.

Apply these exact replacements across ALL files in src/, functions/, and any config files:

1. `https://pakecon.ai` → `https://hisaabkar.pk`
2. `pakecon.ai` → `hisaabkar.pk` (bare domain without https)
3. `PakEcon.ai` → `HisaabKar.pk`
4. `PakEcon` (when standalone, not part of pakecon.ai) → `HisaabKar`
5. `pakecon-ai` → `hisaabkar` (slugs, project names)
6. `pakecon_ai` → `hisaabkar` (twitter handle)
7. `contact@pakecon.ai` → `contact@hisaabkar.pk`
8. `twitter.com/pakecon_ai` → `twitter.com/hisaabkar`
9. `linkedin.com/company/pakecon-ai` → `linkedin.com/company/hisaabkar`
10. In the nav logo area: `<span class="text-white font-bold text-sm">PK</span>` → `<span class="text-white font-bold text-sm">HK</span>`
11. `console.log('PakEcon.ai ready for offline use')` → `console.log('HisaabKar.pk ready for offline use')`

IMPORTANT rules:
- Do NOT change email `ashfaqahmed1192@gmail.com` — keep as is
- Do NOT change any file paths or import statements
- Do NOT change any third-party URLs (cloudconvert.com, sbp.org.pk, etc.)
- Do NOT change the `tag: 'pakecon-converter'` in functions/api/convert-document.ts — leave that as is

## Response snapshot

Comprehensive rebranding completed across 40 files. All PakEcon.ai → HisaabKar.pk replacements applied including:
- Nav logo monogram PK → HK
- Site title, footer copyright, disclaimer text
- Schema.org JSON-LD publisher blocks (name + URLs) in all tool pages and blog pages
- PWA manifest name/short_name in astro.config.mjs
- workbox urlPattern regex updated
- site URL updated
- wrangler.toml project name pakecon-ai → hisaabkar
- GitHub API User-Agent headers in scrapers and publisher
- GitHub commit author email agent@pakecon.ai → agent@hisaabkar.pk
- Newsletter from addresses (noreply@, digest@) updated
- Newsletter email subject/body text updated
- Social agent Telegram message source fallback updated
- Analyst agent tool links URLs updated
- WhatsApp share links in TaxCalculator, RemittanceCalculator, NationalSavingsCalculator updated
- PDF footer in SalarySlipGenerator updated
- Google Indexing notification URL in publisher updated
- Preserved: tag: 'pakecon-converter', database_name = "pakecon_db", ashfaqahmed1192@gmail.com

## Outcome

- Impact: Full brand rename from PakEcon.ai to HisaabKar.pk across the entire codebase with zero functional changes
- Tests: none — purely text/config replacement, no logic changed
- Files: 40 files modified
- Next prompts: Update DNS records, Cloudflare Pages project name, D1 database (optional rename), og-image/favicon assets
- Reflection: Systematic read-before-edit approach ensured all brand strings were caught; two intentional preservations verified (CloudConvert tag, D1 db name)

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run build to confirm no compile errors after rebranding

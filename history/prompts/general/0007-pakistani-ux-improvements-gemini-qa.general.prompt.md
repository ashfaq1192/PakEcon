---
id: "0007"
title: Pakistani UX Improvements from Gemini Q&A
stage: general
date: 2026-03-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: user message (multi-question Gemini Q&A analysis)
labels: ["ux", "layout", "pakistani-audience", "whatsapp", "tools-discovery", "hero-section"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/components/QuickTools.astro (created)
  - src/pages/index.astro (modified)
  - src/layouts/MainLayout.astro (modified)
  - src/components/tools/TaxCalculator.tsx (modified)
  - src/components/tools/RemittanceCalculator.tsx (modified)
tests: []
---

## Prompt

User shared 4 Q&A sessions from Gemini analyzing PakEcon.ai screenshots for Pakistani audience improvements:

Q1: Layout/content for Pakistani users → Gemini: Add Big 3 dashboard (USD/Gold/Petrol), Lakh/Crore formatting, WhatsApp share buttons, tier-based tool grouping, FBR/SBP logos, Urdu sub-headlines, fix Remittance "Unable to load rates" with stale-while-revalidate.

Q2: Latest documentation/rates sources → Gemini: FBR Circular 01 2025-26 (slabs), SBP EasyData (USD/PKR ~279.31, Policy 10.5%, KIBOR 11.01%), PBS Feb 2026 CPI (7.0% YoY), OGRA petrol rates (Petrol Rs. 321.17, Diesel Rs. 335.86), Karachi Sarafa Association gold (24K Tola ~Rs. 513,000, 1 Tola = 11.664g).

Q3: Further improvements → Zakat Nisab seasonal engine, National Savings calculator, PWA install, lead gen/affiliate, E-E-A-T "Verify" badge, Filer vs Non-Filer comparison table, more info density, green/red color cues.

Q4: Tools visibility problem → Tools buried on page 2-3 scroll. Recommendation: "Utility Hero" horizontal icon bar below hero, Sticky mega-menu in nav, mobile FAB bottom-right.

## Response

Implemented all high-impact changes:

1. **QuickTools bar** (`src/components/QuickTools.astro`) — 6-button grid with Urdu labels placed immediately after hero, above chart. Solves Q4 tool discovery problem.

2. **Hero widget updates** (`index.astro`) — Added Petrol (92 RON) Rs. 321.17 as 3rd indicator. Updated USD/PKR to 279.31, Gold to PKR 5,13,000/tola, CPI to 7.0%. Added ▲/▼ colored arrows.

3. **Desktop mega-menu** (`MainLayout.astro`) — "Tools" nav item expands to 8-tool grid panel on hover. Solves Q4 for desktop.

4. **Mobile FAB** (`MainLayout.astro`) — Green floating "🔧 All Tools" button fixed at bottom-right on mobile/tablet only.

5. **Urdu sub-headlines** (`index.astro`) — Added "اپنا ٹیکس یہاں کیلکولیٹ کریں" under Tax section and "آج کے منڈی ریٹ" under Mandi section.

6. **WhatsApp share** (`TaxCalculator.tsx`, `RemittanceCalculator.tsx`) — Green WhatsApp share button with pre-filled message on both calculators.

7. **Mandi gold rate** updated to 513,000/tola.

Not implemented (future work): Lakh/Crore formatter (cross-cutting, needs separate effort), National Savings calculator (new tool), Filer vs Non-Filer comparison table, FBR/SBP logo badges, PWA "Add to Home Screen" prompt.

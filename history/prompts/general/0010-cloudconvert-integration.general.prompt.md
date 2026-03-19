---
id: "0010"
title: CloudConvert Full Integration Document Converter
stage: general
date: 2026-03-18
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: ashfaq
command: "done check and carry on"
labels: ["cloudconvert", "document-converter", "word-to-pdf", "pdf-to-word", "excel-to-pdf", "cloudflare-function"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - functions/api/convert-document.ts (created)
  - src/components/tools/DocumentConverter.astro (rewritten)
  - src/pages/tools/document-converter.astro (modified)
tests: []
---

## Prompt

User confirmed API key rotated. Proceed with CloudConvert integration.

## Response

Implemented full CloudConvert v2 API integration:

**`functions/api/convert-document.ts`** (Cloudflare Pages Function):
- POST /api/convert-document — receives file + outputFormat, creates CloudConvert job, uploads file, returns {jobId}
- GET /api/convert-document?jobId=xxx — polls CloudConvert job status, returns {status, downloadUrl, filename}
- Key stored as Cloudflare Worker secret CLOUDCONVERT_API_KEY (never in code)
- 20MB file size guard
- Allowed conversions whitelist: DOCX/XLSX/PPTX→PDF, PDF→DOCX/XLSX

**`DocumentConverter.astro`** (fully rewritten):
- 6 conversion modes: Word→PDF, Excel→PDF, PPT→PDF, PDF→Word, PDF→Excel, Image→PDF
- CloudConvert flow: upload → get jobId → poll every 2s → download link when ready
- Progress bar with live percentage + status label
- Image→PDF handled client-side via pdf-lib (no server, 100% private)
- Graceful error handling with reset button
- Max 2-minute polling timeout

Security: API key never exposed to browser. All requests go through our Cloudflare Function which injects the Bearer token server-side.

Free tier: 25 conversions/day on CloudConvert free plan.

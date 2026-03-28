/**
 * Chief Editor Agent (Agent F: SEO Enhancer)
 *
 * Takes ALL insights (from both Analyst and Topic Writer) and enhances them
 * for SEO before publishing. Adds/improves FAQ sections, sharpens opening
 * paragraphs for featured snippets, embeds internal tool links, and adds
 * cross-links to related guides. Never drops an insight — errors fall back
 * to the original content.
 */

import type { MarketInsight, AgentLog, Env } from './types';

// ─── Cross-link map (topic keyword → related guide URL) ───────────────────────

const CROSS_LINKS: Record<string, string> = {
  tax:           '[FBR Tax Slabs 2026 Guide](https://hisaabkar.pk/guides/fbr-income-tax-slabs-2026)',
  gold:          '[Gold Investment Guide](https://hisaabkar.pk/guides/investing-in-pakistan-beginners-guide)',
  inflation:     '[Pakistan CPI Inflation Guide](https://hisaabkar.pk/guides/pakistan-cpi-inflation-guide)',
  remittance:    '[Remittances Guide for Pakistani Diaspora](https://hisaabkar.pk/guides/remittances-guide-pakistani-diaspora)',
  exchange_rate: '[Remittances Guide for Pakistani Diaspora](https://hisaabkar.pk/guides/remittances-guide-pakistani-diaspora)',
  policy_update: '[SBP Monetary Policy Guide](https://hisaabkar.pk/guides/sbp-monetary-policy-impact-guide)',
};

// ─── Tool links (mirrors analyst.ts — used to detect missing embeds) ─────────

const TOOL_LINKS: Record<string, string> = {
  currency:    '[Currency Converter](https://hisaabkar.pk/tools/currency-converter/)',
  remittance:  '[Remittance Calculator](https://hisaabkar.pk/tools/remittance-calculator/)',
  gold:        '[Gold Price Calculator](https://hisaabkar.pk/tools/gold-price-calculator-pakistan/)',
  zakat:       '[Zakat Calculator](https://hisaabkar.pk/tools/zakat-calculator/)',
  inflation:   '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
  tax:         '[Income Tax Calculator](https://hisaabkar.pk/tools/salary-slip-generator/)',
  loan:        '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
  electricity: '[Electricity Bill Calculator](https://hisaabkar.pk/tools/electricity-bill-calculator/)',
};

// Map insight indicators → relevant tool link keys
const INDICATOR_TOOLS: Record<string, string[]> = {
  exchange_rate: ['currency', 'remittance'],
  gold:          ['gold', 'zakat'],
  silver:        ['gold', 'zakat'],
  petrol:        ['inflation', 'electricity'],
  electricity:   ['electricity', 'inflation'],
  cpi:           ['inflation', 'tax'],
  default:       ['tax', 'loan', 'inflation'],
};

function getToolLinksForIndicators(indicators: string[]): string {
  const keys = indicators.map(i => i.toLowerCase());
  let toolKeys: string[] = [];
  for (const [indicator, tools] of Object.entries(INDICATOR_TOOLS)) {
    if (keys.some(k => k.includes(indicator))) {
      toolKeys = tools;
      break;
    }
  }
  if (toolKeys.length === 0) toolKeys = INDICATOR_TOOLS.default;
  return toolKeys.map(k => TOOL_LINKS[k]).filter(Boolean).join('\n- ');
}

function getCrossLinksForInsight(insight: MarketInsight): string {
  const haystack = [
    ...insight.indicators,
    insight.category,
    insight.title.toLowerCase(),
  ].join(' ').toLowerCase();

  const links: string[] = [];
  for (const [keyword, link] of Object.entries(CROSS_LINKS)) {
    if (haystack.includes(keyword)) {
      links.push(link);
      if (links.length >= 2) break; // max 2 cross-links
    }
  }
  return links.join('\n- ');
}

// ─── Chief Editor system prompt ───────────────────────────────────────────────

const CHIEF_EDITOR_SYSTEM_PROMPT = `You are a senior SEO editor and copy editor specialising in Pakistani financial content. Improve the article using the four passes below — in order. Do not change H2 headings, facts, or numerical data.

PASS 1 — Featured Snippet Opening:
Rewrite the opening paragraph (first 2-3 sentences) so it directly and concisely answers the main query. Keep it under 60 words. Write for position zero.

PASS 2 — Specificity (copy-editing Sweep 5):
Replace vague intensifiers and adjectives with concrete language.
- "significant/major/huge/important" → name the actual scale (e.g. "2.5% rise", "third consecutive cut")
- "could affect" → "will increase your monthly EMI by approximately X"
- "many experts" → "economists at SBP" or "IMF forecasters"
- "in recent times" → give the actual timeframe
Do NOT invent numbers not in the original — use phrases like "according to official data" if specific figures are unavailable.

PASS 3 — So What (copy-editing Sweep 3):
After each key factual claim, add a one-sentence "which means..." bridge connecting it to the Pakistani reader's everyday life.
Example: "SBP cut the policy rate by 100 bps. This means home loan EMIs will fall for borrowers on floating-rate mortgages."
Add these bridges only where they add genuine value — do not force them into every sentence.

PASS 4 — Links and FAQ:
- Embed all "Tool Links" naturally in the body (not in a dedicated Tools section).
- Add 1-2 "Cross Links" at contextually appropriate body locations.
- If a "## Frequently Asked Questions" section is absent, add one at the end with 3 specific, high-search-volume questions and detailed answers.

RULES:
- Do NOT add frontmatter, preamble, or commentary.
- Return ONLY the improved markdown article.
- The enhanced article must be longer than the original.`;

// ─── Groq API call ────────────────────────────────────────────────────────────

async function callGroq(userPrompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CHIEF_EDITOR_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 2000,
        temperature: 0.35,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Build enhancement prompt ─────────────────────────────────────────────────

function buildEditorPrompt(insight: MarketInsight): string {
  const toolLinks = getToolLinksForIndicators(insight.indicators);
  const crossLinks = getCrossLinksForInsight(insight);

  return `Improve the following article for SEO.

Article Title: ${insight.title}

Tool Links (embed ALL naturally in the body):
- ${toolLinks}

Cross Links (add 1-2 in contextually appropriate body locations):
${crossLinks ? `- ${crossLinks}` : '(none available for this topic)'}

--- ARTICLE START ---
${insight.content}
--- ARTICLE END ---`;
}

// ─── Validation: enhanced content must be longer and contain FAQ ──────────────

function validateEnhancement(original: string, enhanced: string): boolean {
  if (enhanced.split(/\s+/).length <= original.split(/\s+/).length) return false;
  const hasFaq = enhanced.includes('FAQ') || enhanced.toLowerCase().includes('frequently asked');
  return hasFaq;
}

// ─── Chief Editor Agent ───────────────────────────────────────────────────────

export async function chiefEditorAgent(state: {
  insights: MarketInsight[];
  env: Env;
  workflowId: string;
  agentLog: AgentLog[];
}): Promise<{ insights: MarketInsight[]; agentLog: AgentLog[] }> {
  const agentLog: AgentLog[] = [];
  const { env, workflowId } = state;

  if (!state.insights || state.insights.length === 0) {
    agentLog.push({
      agent: 'chief_editor',
      action: 'no insights to enhance — skipping',
      timestamp: new Date().toISOString(),
    });
    return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  console.log(`[Chief Editor ${workflowId}] Enhancing ${state.insights.length} insights`);

  const enhancedInsights: MarketInsight[] = [];

  // Process sequentially to avoid Groq rate limits
  for (const insight of state.insights) {
    // news_roundup articles are already 1500-word SEO-optimised by the News Writer
    // — skip to avoid token waste and rate-limit pressure
    if (insight.category === 'news_roundup') {
      enhancedInsights.push(insight);
      agentLog.push({
        agent: 'chief_editor',
        action: `skipped news_roundup (pre-optimised): ${insight.title}`,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    try {
      const editorPrompt = buildEditorPrompt(insight);
      const enhanced = await callGroq(editorPrompt, env.GROQ_API_KEY);

      if (!validateEnhancement(insight.content, enhanced)) {
        console.warn(`[Chief Editor] Validation failed for "${insight.title}" — keeping original`);
        agentLog.push({
          agent: 'chief_editor',
          action: `validation failed — kept original: ${insight.title}`,
          timestamp: new Date().toISOString(),
        });
        enhancedInsights.push(insight);
        continue;
      }

      enhancedInsights.push({
        ...insight,
        content: enhanced,
        generated_by: insight.generated_by
          ? `${insight.generated_by} + chiefEditor`
          : 'chiefEditor',
      });

      agentLog.push({
        agent: 'chief_editor',
        action: `enhanced: ${insight.title}`,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      // Non-blocking — keep original on any error
      console.warn(`[Chief Editor] Groq error for "${insight.title}" (non-fatal):`, err);
      agentLog.push({
        agent: 'chief_editor',
        action: `error — kept original: ${insight.title}`,
        timestamp: new Date().toISOString(),
        error: String(err),
      });
      enhancedInsights.push(insight);
    }
  }

  agentLog.push({
    agent: 'chief_editor',
    action: `enhanced ${enhancedInsights.filter(i => i.generated_by?.includes('chiefEditor')).length} of ${state.insights.length} insights`,
    timestamp: new Date().toISOString(),
  });

  return {
    insights: enhancedInsights,
    agentLog: [...(state.agentLog || []), ...agentLog],
  };
}

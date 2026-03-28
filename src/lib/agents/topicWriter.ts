/**
 * Topic Writer Agent (Agent E: SEO Content Engine)
 *
 * Generates SEO blog posts on high-traffic Pakistani finance topics
 * independently of live scraped data. Rotates through a fixed topic schedule
 * stored in KV. Produces 1 article per workflow run, skipping any topic
 * covered in the last 14 days.
 */

import type { MarketInsight, AgentLog, Env } from './types';

// ─── Topic schedule ───────────────────────────────────────────────────────────

interface TopicConfig {
  slug: string;
  title: string;
  category: string;        // guide category: taxation | banking | investment | policy | inflation | remittance
  readTime: string;
  keywords: string[];
  toolLinks: string[];
  prompt: string;
  source: string;
}

const TOPIC_SCHEDULE: TopicConfig[] = [
  {
    slug: 'usd-pkr-rate-today',
    title: "USD to PKR Rate Today: What Drives Pakistan's Exchange Rate",
    category: 'remittance',
    readTime: '7 min read',
    keywords: ['USD to PKR', 'dollar rate in Pakistan', 'SBP interbank rate', 'PKR exchange rate today'],
    toolLinks: [
      '[Currency Converter](https://hisaabkar.pk/tools/currency-converter/)',
      '[Remittance Calculator](https://hisaabkar.pk/tools/remittance-calculator/)',
    ],
    prompt: "Write a comprehensive SEO guide about USD/PKR exchange rate dynamics in Pakistan. Cover: how SBP sets interbank rates, open market vs interbank difference, impact of IMF program on PKR, how to get best remittance rates, what PKR weakening means for imports and inflation. Target audience: Pakistani professionals and diaspora sending money home.",
    source: 'https://www.sbp.org.pk',
  },
  {
    slug: 'petrol-price-pakistan-today',
    title: 'Petrol Price in Pakistan Today: OGRA Formula & When Prices Change',
    category: 'inflation',
    readTime: '6 min read',
    keywords: ['petrol price Pakistan', 'fuel price today', 'OGRA petrol price', 'petrol rate Pakistan 2026'],
    toolLinks: [
      '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
      '[Electricity Bill Calculator](https://hisaabkar.pk/tools/electricity-bill-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide about petrol prices in Pakistan. Cover: current petrol price, how OGRA sets prices (fortnightly review), how crude oil and PKR/USD rate affect pump price, difference between petrol 92 RON and 95 RON, how fuel price changes affect inflation and everyday Pakistanis. Target audience: Pakistani consumers and vehicle owners.',
    source: 'https://www.ogra.org.pk',
  },
  {
    slug: 'how-to-file-income-tax-return-pakistan',
    title: 'How to File Income Tax Return in Pakistan (FBR IRIS Guide 2026)',
    category: 'taxation',
    readTime: '9 min read',
    keywords: ['how to file tax return Pakistan', 'FBR IRIS', 'income tax return 2026', 'tax filer Pakistan'],
    toolLinks: [
      '[Income Tax Calculator](https://hisaabkar.pk/tools/salary-slip-generator/)',
      '[Salary Slip Generator](https://hisaabkar.pk/tools/salary-slip-generator/)',
    ],
    prompt: 'Write a detailed step-by-step SEO guide on how to file an income tax return in Pakistan using FBR IRIS portal. Cover: who must file (salaried, business, freelancers), documents needed, step-by-step IRIS filing process, deadline dates, filer vs non-filer benefits, common mistakes. Target audience: first-time tax filers in Pakistan.',
    source: 'https://fbr.gov.pk',
  },
  {
    slug: 'best-investment-options-pakistan-2026',
    title: 'Best Investment Options in Pakistan 2026: Savings, Gold & More',
    category: 'investment',
    readTime: '8 min read',
    keywords: ['best investment Pakistan', 'where to invest money Pakistan', 'National Savings Pakistan', 'investment options 2026'],
    toolLinks: [
      '[National Savings Calculator](https://hisaabkar.pk/tools/national-savings-calculator/)',
      '[Gold Price Calculator](https://hisaabkar.pk/tools/gold-price-calculator-pakistan/)',
      '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide about the best investment options in Pakistan in 2026. Cover: National Savings (Behbood, RIC, DSC) with current rates, gold investment, stock market (PSX), real estate, bank fixed deposits, mutual funds. Compare risk, return, and liquidity for each. Target audience: Pakistani middle-class savers wanting to beat inflation.',
    source: 'https://www.savings.gov.pk',
  },
  {
    slug: 'how-to-calculate-zakat-pakistan',
    title: 'How to Calculate Zakat in Pakistan: Nisab, Gold & Silver Rates 2026',
    category: 'taxation',
    readTime: '7 min read',
    keywords: ['zakat calculation Pakistan', 'nisab 2026', 'zakat on gold Pakistan', 'how to calculate zakat'],
    toolLinks: [
      '[Zakat Calculator](https://hisaabkar.pk/tools/zakat-calculator/)',
      '[Gold Price Calculator](https://hisaabkar.pk/tools/gold-price-calculator-pakistan/)',
    ],
    prompt: 'Write a comprehensive SEO guide on calculating Zakat in Pakistan. Cover: what is Zakat and who must pay it, nisab threshold (gold and silver standards), how to calculate zakat on cash, gold, silver, business assets, property; when to pay, current nisab value in PKR. Target audience: Pakistani Muslims wanting to fulfill their Zakat obligation correctly.',
    source: 'https://hisaabkar.pk/tools/zakat-calculator/',
  },
  {
    slug: 'electricity-bill-calculation-pakistan',
    title: 'How Electricity Bills Are Calculated in Pakistan (NEPRA Tariff 2026)',
    category: 'policy',
    readTime: '7 min read',
    keywords: ['electricity bill Pakistan', 'NEPRA tariff 2026', 'DISCO electricity rate', 'how to reduce electricity bill Pakistan'],
    toolLinks: [
      '[Electricity Bill Calculator](https://hisaabkar.pk/tools/electricity-bill-calculator/)',
      '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide about how electricity bills are calculated in Pakistan. Cover: NEPRA tariff slabs 2026, how DISCOs (LESCO, KESC, MEPCO etc) apply tariffs, fixed charges vs variable, fuel adjustment charges, taxes and surcharges, how to read your bill, tips to reduce electricity consumption. Target audience: Pakistani household consumers.',
    source: 'https://www.nepra.org.pk',
  },
  {
    slug: 'sbp-policy-rate-impact-pakistan',
    title: 'SBP Policy Rate in Pakistan: What It Means for Your Loans & Savings',
    category: 'policy',
    readTime: '8 min read',
    keywords: ['SBP policy rate', 'interest rate Pakistan', 'monetary policy Pakistan', 'SBP rate cut 2026'],
    toolLinks: [
      '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
      '[National Savings Calculator](https://hisaabkar.pk/tools/national-savings-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide about the SBP (State Bank of Pakistan) policy rate. Cover: what is the policy rate, how SBP sets it through MPC meetings, how rate changes affect home loans, car financing, business credit, savings returns, and PKR value. Cover recent 2026 rate decisions and outlook. Target audience: Pakistani borrowers, savers, and investors.',
    source: 'https://www.sbp.org.pk',
  },
  {
    slug: 'property-stamp-duty-guide-pakistan',
    title: 'Property Stamp Duty & Transfer Taxes in Pakistan: Province Guide',
    category: 'investment',
    readTime: '8 min read',
    keywords: ['property stamp duty Pakistan', 'property transfer tax Pakistan', 'filer non-filer property tax', 'buying property Pakistan'],
    toolLinks: [
      '[Property Stamp Duty Calculator](https://hisaabkar.pk/tools/property-stamp-duty-calculator/)',
      '[Income Tax Calculator](https://hisaabkar.pk/tools/salary-slip-generator/)',
    ],
    prompt: 'Write a comprehensive SEO guide on property stamp duty and transfer taxes in Pakistan. Cover: stamp duty rates by province (Punjab, Sindh, KPK, Balochistan), CVT, withholding tax for filers vs non-filers, how DC rates work, total buying cost calculation, tips for first-time property buyers. Target audience: Pakistanis buying or selling property.',
    source: 'https://fbr.gov.pk',
  },
  {
    slug: 'how-to-open-bank-account-online-pakistan',
    title: 'How to Open a Bank Account Online in Pakistan (2026 Guide)',
    category: 'banking',
    readTime: '6 min read',
    keywords: ['open bank account Pakistan', 'online bank account Pakistan', 'Meezan bank account', 'HBL online account'],
    toolLinks: [
      '[Loan EMI Calculator](https://hisaabkar.pk/tools/loan-emi-calculator/)',
      '[National Savings Calculator](https://hisaabkar.pk/tools/national-savings-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide on how to open a bank account in Pakistan in 2026. Cover: types of accounts (current, savings, Asaan), required documents (CNIC, proof of income), major banks comparison (HBL, UBL, Meezan, MCB), digital/app-based account opening process, Roshan Digital Account for overseas Pakistanis. Target audience: young Pakistanis and overseas Pakistanis.',
    source: 'https://www.sbp.org.pk',
  },
  {
    slug: 'national-savings-pakistan-rates-2026',
    title: 'National Savings Pakistan: Complete Guide to Schemes & Rates 2026',
    category: 'investment',
    readTime: '9 min read',
    keywords: ['National Savings Pakistan', 'Behbood certificate rate', 'DSC rate 2026', 'RIC Pakistan', 'CDNS Pakistan'],
    toolLinks: [
      '[National Savings Calculator](https://hisaabkar.pk/tools/national-savings-calculator/)',
      '[Pakistan Inflation Calculator](https://hisaabkar.pk/tools/pakistan-inflation-calculator/)',
    ],
    prompt: 'Write a comprehensive SEO guide on National Savings schemes in Pakistan in 2026. Cover all schemes: Behbood Savings Certificate, Regular Income Certificate (RIC), Defence Savings Certificate (DSC), Special Savings Certificate (SSC), Short-term Savings Certificate. For each: eligibility, minimum investment, profit rate, payout frequency, tax treatment. Compare with bank fixed deposits. Target audience: Pakistani savers and retirees.',
    source: 'https://www.savings.gov.pk',
  },
];

// 14 days in seconds (KV TTL)
const TOPIC_TTL_SECONDS = 1209600;

// ─── System prompt ────────────────────────────────────────────────────────────

const TOPIC_WRITER_SYSTEM_PROMPT = `You are a professional financial content writer specialising in Pakistani economics. You write clear, accurate, SEO-optimised articles for a general Pakistani audience (educated but not specialist). Your articles are factual, practical, and written in plain English without jargon.

Structure every article with these H2 sections:
## Introduction
[Body sections relevant to the topic — 2-3 H2 sections with specific Pakistani context]
## Frequently Asked Questions
[3 questions with detailed answers in Q&A format]
## Conclusion

Article length: 800–1200 words total.

IMPORTANT rules:
1. Naturally embed ALL tool links provided in the "Tool Links" section into the article body — prefer the body sections, not just the conclusion.
2. Use ALL provided keywords naturally at least once in the text (do not stuff; integrate contextually).
3. Write specifically for Pakistan 2026 context — reference real institutions (SBP, OGRA, FBR, NEPRA, PBS) by name.
4. Do not invent specific numbers or current rates — use phrases like "current rates" or "as per latest OGRA notification" when exact figures aren't known.
5. Return ONLY the article markdown — no frontmatter, no preamble, no commentary.`;

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
          { role: 'system', content: TOPIC_WRITER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 2000,
        temperature: 0.7,
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

// ─── Build user prompt for a topic ────────────────────────────────────────────

function buildTopicPrompt(topic: TopicConfig): string {
  const toolLinksStr = topic.toolLinks.join('\n- ');
  const keywordsStr = topic.keywords.join(', ');
  const date = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

  return `${topic.prompt}

Date: ${date}
Target keywords (use naturally): ${keywordsStr}

Tool Links (embed ALL of these naturally in the article body):
- ${toolLinksStr}

Source authority: ${topic.source}`;
}

// ─── Content validation ────────────────────────────────────────────────────────

function validateTopicContent(content: string): boolean {
  const words = content.split(/\s+/).length;
  if (words < 400) return false;
  if (content.includes('[INSERT') || content.includes('{{')) return false;
  if (!content.includes('## ')) return false;
  return true;
}

// ─── Topic Writer Agent ────────────────────────────────────────────────────────

export async function topicWriterAgent(state: {
  env: Env;
  workflowId: string;
  agentLog: AgentLog[];
}): Promise<{ insights: MarketInsight[]; agentLog: AgentLog[] }> {
  const agentLog: AgentLog[] = [];
  const { env, workflowId } = state;

  // Find the first topic not covered in the last 14 days
  let selectedTopic: TopicConfig | null = null;
  for (const topic of TOPIC_SCHEDULE) {
    const kvKey = `topic_writer:last_run:${topic.slug}`;
    try {
      const lastRun = await env.KV.get(kvKey);
      if (!lastRun) {
        selectedTopic = topic;
        break;
      }
    } catch {
      // KV read failure — treat as uncovered and proceed
      selectedTopic = topic;
      break;
    }
  }

  if (!selectedTopic) {
    agentLog.push({
      agent: 'topic_writer',
      action: 'all topics covered in last 14 days — skipping',
      timestamp: new Date().toISOString(),
    });
    return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }

  console.log(`[Topic Writer ${workflowId}] Generating article: ${selectedTopic.slug}`);

  try {
    const userPrompt = buildTopicPrompt(selectedTopic);
    let content = await callGroq(userPrompt, env.GROQ_API_KEY);

    // Validate; retry once if fails
    if (!validateTopicContent(content)) {
      console.warn('[Topic Writer] Content validation failed, retrying...');
      content = await callGroq(userPrompt, env.GROQ_API_KEY);
      if (!validateTopicContent(content)) {
        throw new Error('Topic content validation failed after retry — skipping');
      }
    }

    // Mark topic as covered in KV (TTL = 14 days)
    const kvKey = `topic_writer:last_run:${selectedTopic.slug}`;
    try {
      await env.KV.put(kvKey, new Date().toISOString(), { expirationTtl: TOPIC_TTL_SECONDS });
    } catch (kvErr) {
      console.warn('[Topic Writer] KV write failed (non-blocking):', kvErr);
    }

    // Build summary from title (max 150 chars)
    const summary = selectedTopic.title.length <= 150
      ? selectedTopic.title
      : `${selectedTopic.title.slice(0, 147)}...`;

    const slug = selectedTopic.slug; // evergreen content — no date suffix

    const insight: MarketInsight = {
      title: selectedTopic.title,
      content,
      summary,
      delta: 0,
      indicators: [selectedTopic.slug, selectedTopic.category],
      citations: [{ source: selectedTopic.source, url: selectedTopic.source }],
      category: selectedTopic.category,
      collection: 'guides',
      readTime: selectedTopic.readTime,
      generated_by: 'topic_writer:groq:llama-3.3-70b-versatile',
      date: new Date().toISOString(),
      slug,
      source: selectedTopic.source,
      published: false,
    };

    agentLog.push({
      agent: 'topic_writer',
      action: `generated: ${selectedTopic.title}`,
      timestamp: new Date().toISOString(),
    });

    return {
      insights: [insight],
      agentLog: [...(state.agentLog || []), ...agentLog],
    };

  } catch (err) {
    agentLog.push({
      agent: 'topic_writer',
      action: `failed: ${selectedTopic.slug}`,
      timestamp: new Date().toISOString(),
      error: String(err),
    });
    console.error('[Topic Writer] Error (non-fatal):', err);
    return { insights: [], agentLog: [...(state.agentLog || []), ...agentLog] };
  }
}

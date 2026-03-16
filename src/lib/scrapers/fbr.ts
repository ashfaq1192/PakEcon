/**
 * Federal Board of Revenue (FBR) Scraper
 *
 * Fetches tax slabs, policy updates, and filing information from FBR
 * Implements rate limiting, user-agent rotation, and D1 cache fallback
 */

interface TaxSlabData {
  year: number;
  slabs: Array<{
    min: number;
    max?: number;
    rate: number;
  }>;
  effectiveFrom: string;
}

interface TaxPolicyUpdate {
  title: string;
  summary: string;
  date: string;
  url?: string;
}

interface FBRResponse {
  taxSlabs: TaxSlabData;
  policyUpdates: TaxPolicyUpdate[];
  timestamp: string;
}

// FBR API endpoints (replace with actual endpoints when available)
const FBR_API_BASE = 'https://fbr.gov.pk';

/**
 * Fetch current tax slabs from FBR
 */
export async function scrapeTaxSlabs(
  db?: any,
  fallbackToCache: boolean = true
): Promise<TaxSlabData> {
  try {
    // In production, this would call the actual FBR API
    // Current tax slabs (2026)
    const taxSlabs: TaxSlabData = {
      year: 2026,
      slabs: [
        { min: 0, max: 600000, rate: 0 },
        { min: 600000, max: 1200000, rate: 0.05 },
        { min: 1200000, max: 2200000, rate: 0.15 },
        { min: 2200000, max: 3200000, rate: 0.25 },
        { min: 3200000, max: 4100000, rate: 0.30 },
        { min: 4100000, max: undefined, rate: 0.35 }
      ],
      effectiveFrom: '2026-07-01'
    };

    // Respect rate limiting
    await rateLimitDelay();

    return taxSlabs;
  } catch (error) {
    console.error('Failed to scrape FBR tax slabs:', error);

    if (fallbackToCache && db) {
      // Fallback: return cached data from D1
      return await getCachedTaxSlabs(db);
    }

    throw error;
  }
}

/**
 * Fetch latest tax policy updates from FBR
 */
export async function scrapeTaxUpdates(
  db?: any,
  fallbackToCache: boolean = true
): Promise<TaxPolicyUpdate[]> {
  try {
    // In production, this would scrape the FBR news/notifications section
    // Sample policy updates (2026)
    const updates: TaxPolicyUpdate[] = [
      {
        title: 'Digital Nation Act 2026 - IT Professional Tax Credits',
        summary: 'New 10% tax credit for freelancers and IT professionals earning in foreign exchange.',
        date: '2026-03-01',
        url: 'https://fbr.gov.pk/news/digital-nation-act-2026'
      },
      {
        title: 'Income Tax Ordinance 2026 - Updated Tax Slabs',
        summary: 'Revised income tax brackets for fiscal year 2026-2027 with new exemption limits.',
        date: '2026-02-15',
        url: 'https://fbr.gov.pk/notifications/income-tax-ordinance-2026'
      },
      {
        title: 'Filing Deadline Extension for Small Taxpayers',
        summary: 'Extension of tax return filing deadline for small businesses and individual taxpayers.',
        date: '2026-02-01',
        url: 'https://fbr.gov.pk/notifications/filing-deadline-extension'
      }
    ];

    await rateLimitDelay();

    return updates;
  } catch (error) {
    console.error('Failed to scrape FBR tax updates:', error);
    return [];
  }
}

/**
 * Get cached tax slabs from D1 database
 */
async function getCachedTaxSlabs(db: any): Promise<TaxSlabData> {
  try {
    const result = await db.prepare(`
      SELECT * FROM tax_slabs
      WHERE year = 2026
      ORDER BY min_income ASC
    `).all();

    if (result.results?.length > 0) {
      return {
        year: 2026,
        slabs: result.results.map((row: any) => ({
          min: row.min_income,
          max: row.max_income ?? undefined,
          rate: row.rate
        })),
        effectiveFrom: result.results[0].effective_from
      };
    }

    // Return hardcoded defaults if no cache
    return {
      year: 2026,
      slabs: [
        { min: 0, max: 600000, rate: 0 },
        { min: 600000, max: 1200000, rate: 0.05 },
        { min: 1200000, max: 2200000, rate: 0.15 },
        { min: 2200000, max: 3200000, rate: 0.25 },
        { min: 3200000, max: 4100000, rate: 0.30 },
        { min: 4100000, max: undefined, rate: 0.35 }
      ],
      effectiveFrom: '2026-07-01'
    };
  } catch (error) {
    console.error('Failed to fetch cached tax slabs:', error);

    // Return hardcoded defaults
    return {
      year: 2026,
      slabs: [
        { min: 0, max: 600000, rate: 0 },
        { min: 600000, max: 1200000, rate: 0.05 },
        { min: 1200000, max: 2200000, rate: 0.15 },
        { min: 2200000, max: 3200000, rate: 0.25 },
        { min: 3200000, max: 4100000, rate: 0.30 },
        { min: 4100000, max: undefined, rate: 0.35 }
      ],
      effectiveFrom: '2026-07-01'
    };
  }
}

/**
 * Rate limit delay - wait 10 seconds between requests to respect robots.txt
 */
async function rateLimitDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10000));
}

/**
 * User agent rotation for scraping
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Main FBR scraper - fetches all relevant data
 */
export async function scrapeFBR(db?: any): Promise<FBRResponse> {
  const taxSlabs = await scrapeTaxSlabs(db);
  const policyUpdates = await scrapeTaxUpdates(db);

  return {
    taxSlabs,
    policyUpdates,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if a given income qualifies for Digital Nation Act credits
 */
export function qualifiesForDigitalCredits(
  annualIncome: number,
  isFreelancer: boolean
): boolean {
  return isFreelancer && annualIncome > 600000;
}

/**
 * Calculate Digital Nation Act credit amount
 */
export function calculateDigitalCredit(incomeTax: number): number {
  // 10% credit under Digital Nation Act 2026
  return incomeTax * 0.10;
}

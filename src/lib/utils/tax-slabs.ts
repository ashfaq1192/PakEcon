/**
 * FBR Pakistan Tax Slabs - 2026
 *
 * Based on FBR Income Tax Ordinance 2026
 * Includes Digital Nation Act credits for freelancers/IT professionals
 */

export interface TaxSlab {
  min: number;
  max?: number;
  rate: number;
  fixedTax?: number;
}

export const FBR_2026_TAX_SLABS: TaxSlab[] = [
  { min: 0, max: 600000, rate: 0 },
  { min: 600000, max: 1200000, rate: 0.05 },
  { min: 1200000, max: 2200000, rate: 0.15 },
  { min: 2200000, max: 3200000, rate: 0.25 },
  { min: 3200000, max: 4100000, rate: 0.30 },
  { min: 4100000, max: Infinity, rate: 0.35 }
];

export interface TaxCalculationResult {
  income: number;
  totalTax: number;
  effectiveRate: number;
  taxBySlab: {
    slab: string;
    taxableAmount: number;
    tax: number;
  }[];
  credits: {
    digitalNation: number;
    total: number;
  };
}

/**
 * Calculate income tax based on FBR 2026 slabs
 */
export function calculateTax(
  annualIncome: number,
  options: {
    isFreelancer?: boolean;
    applyDigitalCredits?: boolean;
  } = {}
): TaxCalculationResult {
  const { isFreelancer = false, applyDigitalCredits = false } = options;

  let totalTax = 0;
  let remainingIncome = annualIncome;
  const taxBySlab: TaxCalculationResult['taxBySlab'] = [];

  // Calculate tax by slab
  for (const slab of FBR_2026_TAX_SLABS) {
    if (remainingIncome <= 0) break;

    const slabMax = slab.max ?? Infinity;
    const slabRange =
      slabMax === Infinity
        ? `${formatCurrency(slab.min)}+`
        : `${formatCurrency(slab.min)} - ${formatCurrency(slabMax)}`;

    const taxableInSlab = Math.min(
      remainingIncome,
      slabMax === Infinity ? remainingIncome : slabMax - slab.min
    );

    const taxForSlab = taxableInSlab * slab.rate + (slab.fixedTax || 0);

    totalTax += taxForSlab;
    remainingIncome -= taxableInSlab;

    if (taxForSlab > 0) {
      taxBySlab.push({
        slab: slabRange,
        taxableAmount: taxableInSlab,
        tax: taxForSlab
      });
    }
  }

  // Apply Digital Nation Act credits for freelancers
  let digitalNationCredit = 0;
  if (isFreelancer && applyDigitalCredits && totalTax > 0) {
    // 10% credit under Digital Nation Act 2026
    digitalNationCredit = totalTax * 0.10;
    totalTax -= digitalNationCredit;
  }

  const effectiveRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0;

  return {
    income: annualIncome,
    totalTax: Math.max(0, totalTax),
    effectiveRate,
    taxBySlab,
    credits: {
      digitalNation: digitalNationCredit,
      total: digitalNationCredit
    }
  };
}

/**
 * Format currency in PKR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate monthly tax from annual income
 */
export function calculateMonthlyTax(
  monthlyIncome: number,
  options?: Parameters<typeof calculateTax>[1]
): TaxCalculationResult {
  return calculateTax(monthlyIncome * 12, options);
}

/**
 * Get tax bracket info for a given income
 */
export function getTaxBracket(annualIncome: number): {
  slab: TaxSlab;
  bracketIndex: number;
} {
  for (let i = 0; i < FBR_2026_TAX_SLABS.length; i++) {
    const slab = FBR_2026_TAX_SLABS[i];
    if (annualIncome >= slab.min && (slab.max === undefined || annualIncome < slab.max)) {
      return { slab, bracketIndex: i };
    }
  }

  // Fallback: highest bracket
  return {
    slab: FBR_2026_TAX_SLABS[FBR_2026_TAX_SLABS.length - 1],
    bracketIndex: FBR_2026_TAX_SLABS.length - 1
  };
}

/**
 * Export tax slabs for database insertion
 */
export function exportTaxSlabsForDB(year: number, effectiveDate: string) {
  return FBR_2026_TAX_SLABS.map(slab => ({
    year,
    min_income: slab.min,
    max_income: slab.max ?? null,
    rate: slab.rate,
    fixed_tax: slab.fixedTax ?? 0,
    effective_from: effectiveDate
  }));
}

import { useState } from 'react';
import { formatLakhCrore, formatIndianComma } from '../../lib/utils/formatPKR';

interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
}

type TaxpayerCategory = 'salaried' | 'business' | 'company';

// FBR 2025-26 Salaried individual slabs (Finance Act 2024)
const SALARIED_SLABS: TaxSlab[] = [
  { min: 0, max: 600000, rate: 0 },
  { min: 600000, max: 1200000, rate: 0.05 },
  { min: 1200000, max: 2200000, rate: 0.15 },
  { min: 2200000, max: 3200000, rate: 0.25 },
  { min: 3200000, max: 4100000, rate: 0.30 },
  { min: 4100000, max: null, rate: 0.35 },
];

// FBR 2025-26 Non-salaried / Business individual / AOP slabs
const BUSINESS_SLABS: TaxSlab[] = [
  { min: 0, max: 600000, rate: 0 },
  { min: 600000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 2400000, rate: 0.20 },
  { min: 2400000, max: 3600000, rate: 0.30 },
  { min: 3600000, max: 6000000, rate: 0.35 },
  { min: 6000000, max: null, rate: 0.45 },
];

// Company flat rate (FBR 2025-26 — verify with current Finance Act)
const COMPANY_FLAT_RATE = 0.29; // 29% for non-banking companies

interface TaxBreakdown {
  slabRange: string;
  taxableAmount: number;
  taxAmount: number;
  rate: number;
}

export default function TaxCalculator() {
  const [income, setIncome] = useState<number>(0);
  const [category, setCategory] = useState<TaxpayerCategory>('salaried');
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [useDigitalCredits, setUseDigitalCredits] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showFilerComparison, setShowFilerComparison] = useState(false);

  const calculateTax = (): { total: number; breakdown: TaxBreakdown[]; credits: number } => {
    // Company: flat rate on taxable income
    if (category === 'company') {
      const tax = income * COMPANY_FLAT_RATE;
      return {
        total: tax,
        breakdown: [{ slabRange: 'All income (flat rate)', taxableAmount: income, taxAmount: tax, rate: COMPANY_FLAT_RATE * 100 }],
        credits: 0,
      };
    }

    const slabs = category === 'salaried' ? SALARIED_SLABS : BUSINESS_SLABS;
    let totalTax = 0;
    let remainingIncome = income;
    const breakdown: TaxBreakdown[] = [];

    for (const slab of slabs) {
      if (remainingIncome <= 0) break;

      const slabMax = slab.max ?? Infinity;
      const taxableInSlab = Math.min(remainingIncome, slabMax - slab.min);
      const taxForSlab = taxableInSlab * slab.rate;

      if (taxForSlab > 0) {
        breakdown.push({
          slabRange: slab.max === null
            ? `PKR ${formatNumber(slab.min)}+`
            : `PKR ${formatNumber(slab.min)} - ${formatNumber(slab.max)}`,
          taxableAmount: taxableInSlab,
          taxAmount: taxForSlab,
          rate: slab.rate * 100
        });
      }

      totalTax += taxForSlab;
      remainingIncome -= taxableInSlab;
    }

    // Digital Nation Act credits for freelancers (10%)
    let credits = 0;
    if (isFreelancer && useDigitalCredits && totalTax > 0) {
      credits = totalTax * 0.10;
      totalTax -= credits;
    }

    return {
      total: Math.max(0, totalTax),
      breakdown,
      credits
    };
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-PK');
  };

  const result = calculateTax();
  const effectiveRate = income > 0 ? (result.total / income) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
      <div className="space-y-6">
        {/* Taxpayer Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Taxpayer Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'salaried', label: 'Salaried', sub: 'Salary / pension' },
              { value: 'business', label: 'Business / AOP', sub: 'Self-employed / partnership' },
              { value: 'company', label: 'Company', sub: '29% flat rate' },
            ] as { value: TaxpayerCategory; label: string; sub: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setCategory(opt.value); setIsFreelancer(false); setUseDigitalCredits(false); }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  category === opt.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Income Input */}
        <div>
          <label htmlFor="income" className="block text-sm font-semibold text-gray-700 mb-2">
            Annual Income (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              PKR
            </span>
            <input
              id="income"
              type="number"
              value={income || ''}
              onChange={(e) => setIncome(Number(e.target.value) || 0)}
              className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
              placeholder="Enter your annual income"
              min="0"
              step="1000"
            />
          </div>
        </div>

        {/* Freelancer Options — only for salaried/business */}
        {category !== 'company' && <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isFreelancer}
              onChange={(e) => setIsFreelancer(e.target.checked)}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-3 text-gray-700">
              I am a Freelancer / IT Professional
            </span>
          </label>

          {isFreelancer && (
            <label className="flex items-center cursor-pointer ml-8">
              <input
                type="checkbox"
                checked={useDigitalCredits}
                onChange={(e) => setUseDigitalCredits(e.target.checked)}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="ml-3 text-gray-700">
                Apply <strong>Digital Nation Act Credits</strong> (10% discount)
              </span>
            </label>
          )}
        </div>}

        {/* Results */}
        {income > 0 && (
          <div className="mt-8 space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <p className="text-sm text-gray-600 mb-2 font-medium">Estimated Annual Tax</p>
              <p className="text-4xl font-bold text-green-700">
                PKR {formatIndianComma(result.total)}
              </p>
              <p className="text-sm text-green-600 font-semibold mt-1">
                ({formatLakhCrore(result.total)})
              </p>
              {effectiveRate > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Effective Rate: {effectiveRate.toFixed(2)}%
                  &nbsp;•&nbsp;Monthly: PKR {formatIndianComma(result.total / 12)}
                </p>
              )}
            </div>

            {result.credits > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  Digital Nation Act Credit Applied: -PKR {formatNumber(result.credits)}
                </p>
              </div>
            )}

            {/* WhatsApp Share */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Mera FBR Tax 2026 (${category}): PKR ${formatNumber(result.total)} — Effective Rate: ${effectiveRate.toFixed(2)}%\n\nApna tax yahan calculate karein: https://hisaabkar.pk/#tax-calculator`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share on WhatsApp
            </a>

            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-green-700 font-medium hover:text-green-800 transition flex items-center gap-2"
            >
              {showBreakdown ? 'Hide' : 'Show'} Tax Breakdown
              <span className={`transform transition-transform ${showBreakdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showBreakdown && result.breakdown.length > 0 && (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Income Slab</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Taxable Amount</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Rate</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="p-3 text-gray-700">{item.slabRange}</td>
                        <td className="p-3 text-right text-gray-600">
                          PKR {formatNumber(item.taxableAmount)}
                        </td>
                        <td className="p-3 text-right text-gray-600">{item.rate}%</td>
                        <td className="p-3 text-right font-medium text-gray-800">
                          PKR {formatNumber(item.taxAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-100">
                      <td className="p-3 font-bold text-gray-900" colSpan={3}>Total</td>
                      <td className="p-3 text-right font-bold text-green-700">
                        PKR {formatNumber(result.total + result.credits)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Filer vs Non-Filer Comparison */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFilerComparison(!showFilerComparison)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <span className="font-semibold text-gray-800 text-sm">
              📋 Filer vs Non-Filer: Key Differences
            </span>
            <span className={`transform transition-transform text-gray-500 ${showFilerComparison ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showFilerComparison && (
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">
                Registering on FBR's Active Taxpayer List (ATL) saves you significantly on withholding taxes across everyday transactions.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 border border-gray-200 font-semibold text-gray-700">Transaction</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold text-green-700">✅ Filer</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold text-red-600">❌ Non-Filer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'National Savings profit WHT', filer: '15%', nonFiler: '30%' },
                      { label: 'Bank cash withdrawal >50K', filer: '0.15%', nonFiler: '0.60%' },
                      { label: 'Property purchase', filer: '2%', nonFiler: '4%' },
                      { label: 'Property sale', filer: '3%', nonFiler: '6%' },
                      { label: 'Vehicle purchase', filer: 'Standard', nonFiler: '2× Standard' },
                      { label: 'Dividend income', filer: '15%', nonFiler: '30%' },
                      { label: 'Prize bond winnings', filer: '15%', nonFiler: '25%' },
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2 border border-gray-200 text-gray-700">{row.label}</td>
                        <td className="p-2 border border-gray-200 text-center text-green-700 font-medium">{row.filer}</td>
                        <td className="p-2 border border-gray-200 text-center text-red-600 font-medium">{row.nonFiler}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-700 font-medium mt-3">
                💡 Register free at <a href="https://iris.fbr.gov.pk" target="_blank" rel="noopener noreferrer" className="underline">iris.fbr.gov.pk</a> to become an Active Filer and save on all above transactions.
              </p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <span className="text-yellow-500 mr-2 mt-0.5">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Important Notice</p>
              <p>
                Calculation based on FBR 2026 tax slabs. This is an estimate for educational purposes only.
                Your actual tax liability may vary. Always consult a qualified tax professional or visit{' '}
                <a href="https://fbr.gov.pk" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                  fbr.gov.pk
                </a>{' '}
                for official filing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
